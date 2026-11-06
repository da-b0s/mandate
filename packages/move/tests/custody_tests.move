#[test_only]
module mandate::custody_tests;

use 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC;
use mandate::grant::{Self, Grant};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario::{Self as ts, Scenario};

const OWNER: address = @0xA11CE;
const AGENT: address = @0xB0B;
const VENDOR: address = @0xF00D;
const OTHER: address = @0xBAD;

const DAY: u64 = 24 * 60 * 60 * 1000;
const START: u64 = 1_000 * DAY;
const BUDGET: u64 = 200_000;
const CAP: u64 = 100_000;

fun setup(funded: u64): (Scenario, Clock) {
    let mut s = ts::begin(OWNER);
    let mut c = clock::create_for_testing(s.ctx());
    c.set_for_testing(START);
    grant::create(AGENT, BUDGET, CAP, START + 30 * DAY, 7 * DAY, &c, s.ctx());
    if (funded > 0) fund(&mut s, OWNER, funded);
    (s, c)
}

fun fund(s: &mut Scenario, from: address, amount: u64) {
    s.next_tx(from);
    let mut g = s.take_shared<Grant>();
    let money = coin::mint_for_testing<USDC>(amount, s.ctx());
    grant::deposit(&mut g, money, s.ctx());
    ts::return_shared(g);
}

fun pay_as(s: &mut Scenario, c: &Clock, who: address, payee: address, amount: u64) {
    s.next_tx(who);
    let mut g = s.take_shared<Grant>();
    grant::pay<USDC>(&mut g, payee, amount, b"memo", c, s.ctx());
    ts::return_shared(g);
}

fun withdraw_as(s: &mut Scenario, who: address, amount: u64) {
    s.next_tx(who);
    let mut g = s.take_shared<Grant>();
    grant::withdraw<USDC>(&mut g, amount, s.ctx());
    ts::return_shared(g);
}

fun held(s: &mut Scenario): u64 {
    s.next_tx(OWNER);
    let g = s.take_shared<Grant>();
    let v = grant::vault_balance<USDC>(&g);
    ts::return_shared(g);
    v
}

fun received(s: &mut Scenario, who: address): u64 {
    s.next_tx(who);
    let money = s.take_from_address<Coin<USDC>>(who);
    let v = money.value();
    ts::return_to_address(who, money);
    v
}

fun finish(s: Scenario, c: Clock) {
    c.destroy_for_testing();
    s.end();
}

#[test]
fun deposits_add_up_and_anyone_may_fund() {
    let (mut s, c) = setup(300_000);
    fund(&mut s, OTHER, 50_000);
    assert!(held(&mut s) == 350_000);
    finish(s, c);
}

#[test]
fun pay_moves_money_and_counts_it() {
    let (mut s, c) = setup(300_000);
    pay_as(&mut s, &c, AGENT, VENDOR, CAP);
    assert!(received(&mut s, VENDOR) == CAP);
    assert!(held(&mut s) == 200_000);
    s.next_tx(OWNER);
    let g = s.take_shared<Grant>();
    assert!(g.spent_this_week() == CAP && g.payments() == 1);
    ts::return_shared(g);
    finish(s, c);
}

#[test]
fun owner_withdraws_all_even_after_revoke_and_expiry() {
    let (mut s, mut c) = setup(300_000);
    s.next_tx(OWNER);
    let mut g = s.take_shared<Grant>();
    grant::revoke(&mut g, s.ctx());
    ts::return_shared(g);
    c.set_for_testing(START + 365 * DAY);
    withdraw_as(&mut s, OWNER, 300_000);
    assert!(received(&mut s, OWNER) == 300_000);
    assert!(held(&mut s) == 0);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::ENotAgent, location = mandate::grant)]
fun stranger_cannot_pay() {
    let (mut s, c) = setup(300_000);
    pay_as(&mut s, &c, OTHER, OTHER, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::ENotAgent, location = mandate::grant)]
fun owner_cannot_use_pay() {
    let (mut s, c) = setup(300_000);
    pay_as(&mut s, &c, OWNER, OWNER, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::ENotOwner, location = mandate::grant)]
fun agent_cannot_withdraw() {
    let (mut s, c) = setup(300_000);
    withdraw_as(&mut s, AGENT, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::ENotOwner, location = mandate::grant)]
fun stranger_cannot_withdraw() {
    let (mut s, c) = setup(300_000);
    withdraw_as(&mut s, OTHER, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EOverCap, location = mandate::grant)]
fun pay_over_cap_aborts() {
    let (mut s, c) = setup(300_000);
    pay_as(&mut s, &c, AGENT, VENDOR, CAP + 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EOverBudget, location = mandate::grant)]
fun pay_over_weekly_budget_aborts() {
    let (mut s, c) = setup(300_000);
    pay_as(&mut s, &c, AGENT, VENDOR, CAP);
    pay_as(&mut s, &c, AGENT, VENDOR, CAP);
    pay_as(&mut s, &c, AGENT, VENDOR, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::ERevoked, location = mandate::grant)]
fun pay_after_revoke_aborts() {
    let (mut s, c) = setup(300_000);
    s.next_tx(OWNER);
    let mut g = s.take_shared<Grant>();
    grant::revoke(&mut g, s.ctx());
    ts::return_shared(g);
    pay_as(&mut s, &c, AGENT, VENDOR, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EDormant, location = mandate::grant)]
fun pay_when_dormant_aborts() {
    let (mut s, mut c) = setup(300_000);
    c.set_for_testing(START + 8 * DAY);
    pay_as(&mut s, &c, AGENT, VENDOR, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EInsufficientFunds, location = mandate::grant)]
fun pay_more_than_held_aborts() {
    let (mut s, c) = setup(5);
    pay_as(&mut s, &c, AGENT, VENDOR, 6);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EInsufficientFunds, location = mandate::grant)]
fun unfunded_grant_cannot_pay() {
    let (mut s, c) = setup(0);
    pay_as(&mut s, &c, AGENT, VENDOR, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::ENotUsdc, location = mandate::grant)]
fun only_usdc_may_be_deposited() {
    let (mut s, c) = setup(0);
    s.next_tx(OWNER);
    let mut g = s.take_shared<Grant>();
    let money = coin::mint_for_testing<SUI>(100, s.ctx());
    grant::deposit(&mut g, money, s.ctx());
    ts::return_shared(g);
    finish(s, c);
}
