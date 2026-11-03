/// A spending mandate for an AI agent: weekly budget, per-call cap, per-service
/// caps, expiry, revocation and a dead man's switch (the grant freezes if the
/// owner stops sending heartbeats).
///
/// Enforcement level A: the grant stores limits and counters; the agent checks
/// them before paying and must call `record_spend` after, which aborts if the
/// spend would break any limit. Funds stay in the agent's wallet (no custody).
module mandate::grant;

use sui::clock::Clock;
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

fun assert_owner(g: &Grant, ctx: &TxContext) {
    assert!(g.version == VERSION, EWrongVersion);
    assert!(ctx.sender() == g.owner, ENotOwner);
}
