/// A spending mandate for an AI agent: weekly budget, per-call cap, per-service
/// caps, expiry, revocation and a dead man's switch (the grant freezes if the
/// owner stops sending heartbeats).
///
/// Enforcement level B (custody): USDC sits inside the grant. The agent can only
/// move it with `pay`, which checks every limit in the same transaction, and the
/// owner can take it back with `withdraw` at any time. A leaked agent key can
/// therefore lose at most what the limits allow.
///
/// `record_spend` remains from level A, for grants that paid from the agent's wallet.
module mandate::grant;

use std::ascii;
use std::type_name;
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::dynamic_field as df;
use sui::event;
use sui::vec_map::{Self, VecMap};

const WEEK_MS: u64 = 7 * 24 * 60 * 60 * 1000;
const VERSION: u64 = 1;

const ENotOwner: u64 = 0;
const ENotAgent: u64 = 1;
const ERevoked: u64 = 2;
const EExpired: u64 = 3;
const EDormant: u64 = 4;
const EOverCap: u64 = 5;
const EOverBudget: u64 = 6;
const EInvalidLimits: u64 = 7;
const EWrongVersion: u64 = 8;
const EZeroAmount: u64 = 9;
const ENotUsdc: u64 = 10;
const EInsufficientFunds: u64 = 11;
const EWrongTicket: u64 = 12;

/// Limits are denominated in USDC, so nothing else may enter the vault.
const USDC_TYPE: vector<u8> = b"dba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

public struct Grant has key {
    id: UID,
    version: u64,
    owner: address,
    agent: address,
    /// USDC base units (6 decimals).
    weekly_budget: u64,
    per_call_cap: u64,
    spent_this_week: u64,
    week_start_ms: u64,
    expires_ms: u64,
    revoked: bool,
    last_heartbeat_ms: u64,
    dormancy_ms: u64,
    /// payee -> cap; 0 blocks the payee. Unlisted payees use per_call_cap.
    service_caps: VecMap<address, u64>,
    total_spent: u64,
    payments: u64,
}

/// Dynamic field on the Grant holding its Balance<USDC>.
public struct VaultKey has copy, drop, store {}

/// Proof that a swap took money out of this grant. It has no abilities, so the transaction that
/// opened the swap must close it with `finish_swap`, which hands the output to the owner.
public struct SwapTicket { grant: ID, amount_in: u64 }

public struct Swapped has copy, drop { grant: ID, amount_in: u64, coin_out: ascii::String, amount_out: u64 }

public struct Deposited has copy, drop { grant: ID, from: address, amount: u64 }

public struct Withdrawn has copy, drop { grant: ID, to: address, amount: u64 }

public struct GrantCreated has copy, drop {
    grant: ID,
    owner: address,
    agent: address,
    weekly_budget: u64,
    per_call_cap: u64,
    expires_ms: u64,
    dormancy_ms: u64,
}

public struct SpendRecorded has copy, drop {
    grant: ID,
    payee: address,
    amount: u64,
    digest: vector<u8>,
    spent_this_week: u64,
}

public struct CapChanged has copy, drop { grant: ID, payee: address, cap: u64 }

public struct Heartbeat has copy, drop { grant: ID, at_ms: u64 }

public struct Revoked has copy, drop { grant: ID }

entry fun create(
    agent: address,
    weekly_budget: u64,
    per_call_cap: u64,
    expires_ms: u64,
    dormancy_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let now = clock.timestamp_ms();
    assert!(per_call_cap > 0 && per_call_cap <= weekly_budget, EInvalidLimits);
    assert!(expires_ms > now && dormancy_ms > 0, EInvalidLimits);
    let grant = Grant {
        id: object::new(ctx),
        version: VERSION,
        owner: ctx.sender(),
        agent,
        weekly_budget,
        per_call_cap,
        spent_this_week: 0,
        week_start_ms: now,
        expires_ms,
        revoked: false,
        last_heartbeat_ms: now,
        dormancy_ms,
        service_caps: vec_map::empty(),
        total_spent: 0,
        payments: 0,
    };
    event::emit(GrantCreated {
        grant: object::id(&grant),
        owner: grant.owner,
        agent,
        weekly_budget,
        per_call_cap,
        expires_ms,
        dormancy_ms,
    });
    transfer::share_object(grant);
}

/// Owner proves they are still around. Also revives a dormant grant.
entry fun heartbeat(g: &mut Grant, clock: &Clock, ctx: &TxContext) {
    assert_owner(g, ctx);
    g.last_heartbeat_ms = clock.timestamp_ms();
    event::emit(Heartbeat { grant: object::id(g), at_ms: g.last_heartbeat_ms });
}

/// Owner ratifies a per-service cap (e.g. one the agent proposed). Cannot exceed per_call_cap.
entry fun set_service_cap(g: &mut Grant, payee: address, cap: u64, ctx: &TxContext) {
    assert_owner(g, ctx);
    assert!(cap <= g.per_call_cap, EInvalidLimits);
    if (g.service_caps.contains(&payee)) {
        *g.service_caps.get_mut(&payee) = cap;
    } else {
        g.service_caps.insert(payee, cap);
    };
    event::emit(CapChanged { grant: object::id(g), payee, cap });
}

entry fun revoke(g: &mut Grant, ctx: &TxContext) {
    assert_owner(g, ctx);
    g.revoked = true;
    event::emit(Revoked { grant: object::id(g) });
}

/// Agent records a payment it made. Aborts if the payment broke any limit,
/// so the onchain counters can never show an over-limit spend.
entry fun record_spend(
    g: &mut Grant,
    payee: address,
    amount: u64,
    digest: vector<u8>,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(g.version == VERSION, EWrongVersion);
    assert!(ctx.sender() == g.agent, ENotAgent);
    apply_spend(g, payee, amount, digest, clock);
}

/// Anyone may fund a grant; only `pay` and `withdraw` can take funds out.
entry fun deposit<T>(g: &mut Grant, funds: Coin<T>, ctx: &TxContext) {
    assert!(g.version == VERSION, EWrongVersion);
    assert_usdc<T>();
    let amount = funds.value();
    assert!(amount > 0, EZeroAmount);
    let incoming = funds.into_balance();
    if (df::exists(&g.id, VaultKey {})) {
        df::borrow_mut<VaultKey, Balance<T>>(&mut g.id, VaultKey {}).join(incoming);
    } else {
        df::add(&mut g.id, VaultKey {}, incoming);
    };
    event::emit(Deposited { grant: object::id(g), from: ctx.sender(), amount });
}

/// Agent pays from the vault. Limits and the transfer are one transaction: if any
/// limit fails, nothing moves.
entry fun pay<T>(
    g: &mut Grant,
    payee: address,
    amount: u64,
    memo: vector<u8>,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    assert!(g.version == VERSION, EWrongVersion);
    assert_usdc<T>();
    assert!(ctx.sender() == g.agent, ENotAgent);
    apply_spend(g, payee, amount, memo, clock);
    let paid = take<T>(g, amount, ctx);
    transfer::public_transfer(paid, payee);
}

/// Owner takes funds back. Deliberately not gated on revoke, expiry or dormancy:
/// the owner must always be able to reach their money.
entry fun withdraw<T>(g: &mut Grant, amount: u64, ctx: &mut TxContext) {
    assert_owner(g, ctx);
    assert_usdc<T>();
    assert!(amount > 0, EZeroAmount);
    let out = take<T>(g, amount, ctx);
    let to = g.owner;
    transfer::public_transfer(out, to);
    event::emit(Withdrawn { grant: object::id(g), to, amount });
}

/// Agent starts a swap: the amount counts against every limit like a payment (with the owner as
/// payee, so the owner can cap swaps with set_service_cap on their own address), and the USDC comes
/// out of the vault for an exchange route in the same transaction.
public fun begin_swap<T>(
    g: &mut Grant,
    amount: u64,
    clock: &Clock,
    ctx: &mut TxContext,
): (Coin<T>, SwapTicket) {
    assert!(g.version == VERSION, EWrongVersion);
    assert_usdc<T>();
    assert!(ctx.sender() == g.agent, ENotAgent);
    let owner = g.owner;
    apply_spend(g, owner, amount, b"swap", clock);
    let funds = take<T>(g, amount, ctx);
    (funds, SwapTicket { grant: object::id(g), amount_in: amount })
}

/// Agent finishes the swap: whatever the route produced goes to the owner, never to the agent.
public fun finish_swap<O>(g: &Grant, ticket: SwapTicket, out: Coin<O>) {
    let SwapTicket { grant, amount_in } = ticket;
    assert!(grant == object::id(g), EWrongTicket);
    let amount_out = out.value();
    assert!(amount_out > 0, EZeroAmount);
    transfer::public_transfer(out, g.owner);
    event::emit(Swapped {
        grant,
        amount_in,
        coin_out: type_name::with_defining_ids<O>().into_string(),
        amount_out,
    });
}

fun take<T>(g: &mut Grant, amount: u64, ctx: &mut TxContext): Coin<T> {
    assert!(df::exists(&g.id, VaultKey {}), EInsufficientFunds);
    let vault = df::borrow_mut<VaultKey, Balance<T>>(&mut g.id, VaultKey {});
    assert!(vault.value() >= amount, EInsufficientFunds);
    coin::from_balance(balance::split(vault, amount), ctx)
}

fun assert_usdc<T>() {
    let name = type_name::with_defining_ids<T>();
    assert!(*name.as_string() == ascii::string(USDC_TYPE), ENotUsdc);
}

fun apply_spend(g: &mut Grant, payee: address, amount: u64, digest: vector<u8>, clock: &Clock) {
    assert!(amount > 0, EZeroAmount);
    let now = clock.timestamp_ms();
    assert!(!g.revoked, ERevoked);
    assert!(now < g.expires_ms, EExpired);
    assert!(now < g.last_heartbeat_ms + g.dormancy_ms, EDormant);
    assert!(amount <= cap_for(g, payee), EOverCap);

    if (now >= g.week_start_ms + WEEK_MS) {
        let weeks = (now - g.week_start_ms) / WEEK_MS;
        g.week_start_ms = g.week_start_ms + weeks * WEEK_MS;
        g.spent_this_week = 0;
    };
    assert!(g.spent_this_week + amount <= g.weekly_budget, EOverBudget);

    g.spent_this_week = g.spent_this_week + amount;
    g.total_spent = g.total_spent + amount;
    g.payments = g.payments + 1;
    event::emit(SpendRecorded {
        grant: object::id(g),
        payee,
        amount,
        digest,
        spent_this_week: g.spent_this_week,
    });
}

public fun active(g: &Grant, now_ms: u64): bool {
    !g.revoked && now_ms < g.expires_ms && now_ms < g.last_heartbeat_ms + g.dormancy_ms
}

public fun cap_for(g: &Grant, payee: address): u64 {
    if (g.service_caps.contains(&payee)) {
        let c = *g.service_caps.get(&payee);
        if (c < g.per_call_cap) c else g.per_call_cap
    } else g.per_call_cap
}

public fun owner(g: &Grant): address { g.owner }
public fun agent(g: &Grant): address { g.agent }
public fun spent_this_week(g: &Grant): u64 { g.spent_this_week }
public fun total_spent(g: &Grant): u64 { g.total_spent }
public fun payments(g: &Grant): u64 { g.payments }
public fun revoked(g: &Grant): bool { g.revoked }

public fun vault_balance<T>(g: &Grant): u64 {
    if (df::exists(&g.id, VaultKey {})) {
        df::borrow<VaultKey, Balance<T>>(&g.id, VaultKey {}).value()
    } else 0
}

fun assert_owner(g: &Grant, ctx: &TxContext) {
    assert!(g.version == VERSION, EWrongVersion);
    assert!(ctx.sender() == g.owner, ENotOwner);
}
