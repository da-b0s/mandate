#[test_only]
module mandate::swap_tests;

use 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC;
use mandate::grant::{Self, Grant};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario::{Self as ts, Scenario};

const OWNER: address = @0xA11CE;
const AGENT: address = @0xB0B;
const OTHER: address = @0xBAD;
const DAY: u64 = 24 * 60 * 60 * 1000;
const START: u64 = 1_000 * DAY;
const BUDGET: u64 = 200_000;
const CAP: u64 = 100_000;

fun setup(): (Scenario, Clock) {
    let mut s = ts::begin(OWNER);
    let mut c = clock::create_for_testing(s.ctx());
    c.set_for_testing(START);
    grant::create(AGENT, BUDGET, CAP, START + 30 * DAY, 7 * DAY, &c, s.ctx());
    s.next_tx(OWNER);
    let mut g = s.take_shared<Grant>();
    let money = coin::mint_for_testing<USDC>(300_000, s.ctx());
    grant::deposit(&mut g, money, s.ctx());
    ts::return_shared(g);
    (s, c)
}

/// Stands in for an exchange route: burns the USDC and returns SUI.
fun swap_as(s: &mut Scenario, c: &Clock, who: address, amount: u64, out: u64) {
    s.next_tx(who);
    let mut g = s.take_shared<Grant>();
    let (usdc, ticket) = grant::begin_swap<USDC>(&mut g, amount, c, s.ctx());
    assert!(usdc.value() == amount);
    coin::burn_for_testing(usdc);
    let sui = coin::mint_for_testing<SUI>(out, s.ctx());
    grant::finish_swap(&g, ticket, sui);
    ts::return_shared(g);
}

fun finish(s: Scenario, c: Clock) {
    c.destroy_for_testing();
    s.end();
}

#[test]
fun swap_counts_against_limits_and_pays_the_owner() {
    let (mut s, c) = setup();
    swap_as(&mut s, &c, AGENT, CAP, 42);
    s.next_tx(OWNER);
    let got = s.take_from_address<Coin<SUI>>(OWNER);
    assert!(got.value() == 42);
    ts::return_to_address(OWNER, got);
    let g = s.take_shared<Grant>();
    assert!(g.spent_this_week() == CAP && g.payments() == 1);
    assert!(grant::vault_balance<USDC>(&g) == 200_000);
    ts::return_shared(g);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::ENotAgent, location = mandate::grant)]
fun only_the_agent_can_swap() {
    let (mut s, c) = setup();
    swap_as(&mut s, &c, OTHER, 1, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EOverCap, location = mandate::grant)]
fun swap_over_cap_aborts() {
    let (mut s, c) = setup();
    swap_as(&mut s, &c, AGENT, CAP + 1, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EOverBudget, location = mandate::grant)]
fun swaps_share_the_weekly_budget() {
    let (mut s, c) = setup();
    swap_as(&mut s, &c, AGENT, CAP, 1);
    swap_as(&mut s, &c, AGENT, CAP, 1);
    swap_as(&mut s, &c, AGENT, 1, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EZeroAmount, location = mandate::grant)]
fun empty_output_aborts() {
    let (mut s, c) = setup();
    swap_as(&mut s, &c, AGENT, 1_000, 0);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::ERevoked, location = mandate::grant)]
fun revoked_grant_cannot_swap() {
    let (mut s, c) = setup();
    s.next_tx(OWNER);
    let mut g = s.take_shared<Grant>();
    grant::revoke(&mut g, s.ctx());
    ts::return_shared(g);
    swap_as(&mut s, &c, AGENT, 1, 1);
    finish(s, c);
}
