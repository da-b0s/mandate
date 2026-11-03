#[test_only]
module mandate::grant_tests;

use mandate::grant::{Self, Grant};
use sui::clock::{Self, Clock};
use sui::test_scenario::{Self as ts, Scenario};

const OWNER: address = @0xA11CE;
const AGENT: address = @0xB0B;
const VENDOR: address = @0xF00D;
const OTHER: address = @0xBAD;

const DAY: u64 = 24 * 60 * 60 * 1000;
const START: u64 = 1_000 * DAY;
const BUDGET: u64 = 2_000_000; // 2 USDC
const CAP: u64 = 100_000; // 0.10 USDC

fun setup(): (Scenario, Clock) {
    let mut s = ts::begin(OWNER);
    let mut c = clock::create_for_testing(s.ctx());
    c.set_for_testing(START);
    grant::create(AGENT, BUDGET, CAP, START + 30 * DAY, 7 * DAY, &c, s.ctx());
    (s, c)
}

fun spend(s: &mut Scenario, c: &Clock, amount: u64) {
    s.next_tx(AGENT);
    let mut g = s.take_shared<Grant>();
    grant::record_spend(&mut g, VENDOR, amount, b"digest", c, s.ctx());
    ts::return_shared(g);
}

fun finish(s: Scenario, c: Clock) {
    c.destroy_for_testing();
    s.end();
}

#[test]
fun records_spend_within_limits() {
    let (mut s, c) = setup();
    spend(&mut s, &c, 20_000);
    spend(&mut s, &c, CAP);
    s.next_tx(OWNER);
    let g = s.take_shared<Grant>();
    assert!(g.spent_this_week() == 120_000);
    assert!(g.total_spent() == 120_000);
    assert!(g.payments() == 2);
    assert!(g.owner() == OWNER && g.agent() == AGENT);
    ts::return_shared(g);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EOverCap)]
fun over_per_call_cap_aborts() {
    let (mut s, c) = setup();
    spend(&mut s, &c, CAP + 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EOverBudget)]
fun over_weekly_budget_aborts() {
    let (mut s, c) = setup();
    let mut i = 0u64;
    while (i < 20) { spend(&mut s, &c, CAP); i = i + 1; };
    spend(&mut s, &c, 1);
    finish(s, c);
}

#[test]
fun budget_resets_next_week() {
    let (mut s, mut c) = setup();
    let mut i = 0u64;
    while (i < 20) { spend(&mut s, &c, CAP); i = i + 1; };
    // keep the owner alive across the week boundary
    c.set_for_testing(START + 6 * DAY);
    s.next_tx(OWNER);
    let mut g = s.take_shared<Grant>();
    grant::heartbeat(&mut g, &c, s.ctx());
    ts::return_shared(g);
    c.set_for_testing(START + 7 * DAY);
    spend(&mut s, &c, CAP);
    s.next_tx(OWNER);
    let g = s.take_shared<Grant>();
    assert!(g.spent_this_week() == CAP);
    assert!(g.total_spent() == 21 * CAP);
    ts::return_shared(g);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::ENotAgent)]
fun only_agent_can_record() {
    let (mut s, c) = setup();
    s.next_tx(OTHER);
    let mut g = s.take_shared<Grant>();
    grant::record_spend(&mut g, VENDOR, 1, b"d", &c, s.ctx());
    ts::return_shared(g);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EZeroAmount)]
fun zero_amount_aborts() {
    let (mut s, c) = setup();
    spend(&mut s, &c, 0);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EDormant)]
fun dormant_grant_freezes() {
    let (mut s, mut c) = setup();
    c.set_for_testing(START + 7 * DAY);
    spend(&mut s, &c, 1);
    finish(s, c);
}

#[test]
fun heartbeat_revives_dormant_grant() {
    let (mut s, mut c) = setup();
    c.set_for_testing(START + 8 * DAY);
    s.next_tx(OWNER);
    let mut g = s.take_shared<Grant>();
    assert!(!grant::active(&g, START + 8 * DAY));
    grant::heartbeat(&mut g, &c, s.ctx());
    assert!(grant::active(&g, START + 8 * DAY));
    ts::return_shared(g);
    spend(&mut s, &c, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::ENotOwner)]
fun only_owner_heartbeats() {
    let (mut s, c) = setup();
    s.next_tx(AGENT);
    let mut g = s.take_shared<Grant>();
    grant::heartbeat(&mut g, &c, s.ctx());
    ts::return_shared(g);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EExpired)]
fun expired_grant_aborts() {
    let (mut s, mut c) = setup();
    c.set_for_testing(START + 30 * DAY);
    spend(&mut s, &c, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::ERevoked)]
fun revoked_grant_aborts() {
    let (mut s, c) = setup();
    s.next_tx(OWNER);
    let mut g = s.take_shared<Grant>();
    grant::revoke(&mut g, s.ctx());
    assert!(g.revoked());
    ts::return_shared(g);
    spend(&mut s, &c, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::ENotOwner)]
fun agent_cannot_revoke_or_change_caps() {
    let (mut s, c) = setup();
    s.next_tx(AGENT);
    let mut g = s.take_shared<Grant>();
    grant::set_service_cap(&mut g, VENDOR, CAP, s.ctx());
    ts::return_shared(g);
    finish(s, c);
}

#[test]
fun service_cap_tightens_and_blocks() {
    let (mut s, c) = setup();
    s.next_tx(OWNER);
    let mut g = s.take_shared<Grant>();
    grant::set_service_cap(&mut g, VENDOR, 10_000, s.ctx());
    assert!(grant::cap_for(&g, VENDOR) == 10_000);
    assert!(grant::cap_for(&g, OTHER) == CAP);
    grant::set_service_cap(&mut g, VENDOR, 0, s.ctx());
    assert!(grant::cap_for(&g, VENDOR) == 0);
    ts::return_shared(g);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EOverCap)]
fun blocked_service_aborts() {
    let (mut s, c) = setup();
    s.next_tx(OWNER);
    let mut g = s.take_shared<Grant>();
    grant::set_service_cap(&mut g, VENDOR, 0, s.ctx());
    ts::return_shared(g);
    spend(&mut s, &c, 1);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EInvalidLimits)]
fun service_cap_cannot_exceed_grant_cap() {
    let (mut s, c) = setup();
    s.next_tx(OWNER);
    let mut g = s.take_shared<Grant>();
    grant::set_service_cap(&mut g, VENDOR, CAP + 1, s.ctx());
    ts::return_shared(g);
    finish(s, c);
}

#[test, expected_failure(abort_code = grant::EInvalidLimits)]
fun create_rejects_cap_above_budget() {
    let mut s = ts::begin(OWNER);
    let c = clock::create_for_testing(s.ctx());
    grant::create(AGENT, 100, 101, 10, 1, &c, s.ctx());
    finish(s, c);
}
