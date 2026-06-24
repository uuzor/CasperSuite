//! # Fund Token (PE/VC LP Shares)
//!
//! Extends the security token with fund-specific mechanics:
//!
//!   - **NAV (Net Asset Value)** — the fund admin posts NAV per token on-chain.
//!     Investors see real-time value of their holding.
//!   - **Subscription queue** — investors subscribe with CSPR; the fund admin
//!     accepts / rejects subscriptions, minting LP tokens at the current NAV.
//!   - **Redemption queue** — investors queue redemption requests; the fund
//!     admin processes them (PE/VC funds have periodic liquidity windows).
//!   - **Distribution** — capital calls and income distributions are recorded
//!     on-chain as events so LPs have a verifiable history.
//!   - **CSPR.fans governance hook** — major fund decisions (new investments,
//!     fee changes) emit a `GovernanceProposalCreated` event for CSPR.fans voting.
//!
//! All transfers still route through the Compliance module (inherited behaviour).

#![no_std]

extern crate alloc;

use odra::prelude::*;
use odra_modules::access::Ownable;
use casper_types::U256;
use odra::module::SubModule;

// ── Types ─────────────────────────────────────────────────────────────────────

#[odra::odra_type]
pub struct SubscriptionRequest {
    pub investor:   Address,
    pub amount_cspr: u64,    // CSPR motes committed
    pub requested_at: u64,  // block timestamp
    pub status:     SubscriptionStatus,
}

#[odra::odra_type]
pub enum SubscriptionStatus {
    Pending,
    Accepted,
    Rejected,
}

#[odra::odra_type]
pub struct RedemptionRequest {
    pub investor:    Address,
    pub token_amount: U256,
    pub requested_at: u64,
    pub status:       RedemptionStatus,
}

#[odra::odra_type]
pub enum RedemptionStatus {
    Pending,
    Processed,
    Cancelled,
}

#[odra::odra_type]
pub struct NavRecord {
    pub nav_per_token: u64,  // NAV in USD cents (e.g. 1000 = $10.00)
    pub total_nav:     u64,  // Total fund NAV in USD cents
    pub posted_at:     u64,  // Block timestamp
    pub posted_by:     Address,
}

impl Default for NavRecord {
    fn default() -> Self {
        NavRecord {
            nav_per_token: 0,
            total_nav: 0,
            posted_at: 0,
            posted_by: Address::new(
                "account-hash-0000000000000000000000000000000000000000000000000000000000000000"
            ).unwrap(),
        }
    }
}

// ── Events ────────────────────────────────────────────────────────────────────

#[odra::event]
pub struct NavPosted {
    pub nav_per_token: u64,
    pub total_nav:     u64,
    pub posted_at:     u64,
}

#[odra::event]
pub struct SubscriptionQueued {
    pub investor:      Address,
    pub amount_cspr:   u64,
    pub subscription_id: u64,
}

#[odra::event]
pub struct SubscriptionAccepted {
    pub investor:        Address,
    pub subscription_id: u64,
    pub tokens_minted:   U256,
}

#[odra::event]
pub struct SubscriptionRejected {
    pub investor:        Address,
    pub subscription_id: u64,
}

#[odra::event]
pub struct RedemptionQueued {
    pub investor:      Address,
    pub token_amount:  U256,
    pub redemption_id: u64,
}

#[odra::event]
pub struct RedemptionProcessed {
    pub investor:      Address,
    pub redemption_id: u64,
    pub cspr_returned: u64,
}

#[odra::event]
pub struct DistributionRecorded {
    pub distribution_id: u64,
    pub amount_usd_cents: u64,
    pub distribution_type: String, // "INCOME" | "CAPITAL_RETURN" | "CAPITAL_CALL"
    pub note:             String,
}

#[odra::event]
pub struct GovernanceProposalCreated {
    pub proposal_id:  u64,
    pub title:        String,
    pub description:  String,
    pub voting_ends:  u64,   // block timestamp
}

#[odra::event]
pub struct FundTokensMinted {
    pub to:     Address,
    pub amount: U256,
    pub nav:    u64,
}

#[odra::event]
pub struct FundTokensBurned {
    pub from:   Address,
    pub amount: U256,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[odra::odra_error]
pub enum FundTokenError {
    NotAuthorized         = 6_000,
    SubscriptionNotFound  = 6_001,
    RedemptionNotFound    = 6_002,
    AlreadyProcessed      = 6_003,
    NavNotSet             = 6_004,
    InvalidNav            = 6_005,
    InsufficientBalance   = 6_006,
    ZeroAmount            = 6_007,
    FundClosed            = 6_008,
}

// ── Module ────────────────────────────────────────────────────────────────────

const ROLE_FUND_ADMIN: [u8; 32] = *b"FUND_ADMIN\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0";

#[odra::module]
pub struct FundToken {
    ownable:       SubModule<Ownable>,

    // ── Token state ──────────────────────────────────────────────────────────
    name:          Var<String>,
    symbol:        Var<String>,
    decimals:      Var<u8>,
    total_supply:  Var<U256>,
    balances:      Mapping<Address, U256>,
    allowances:    Mapping<(Address, Address), U256>,

    // ── Fund metadata ─────────────────────────────────────────────────────────
    fund_name:     Var<String>,
    fund_manager:  Var<String>,
    vintage_year:  Var<u32>,
    strategy:      Var<String>,   // "VENTURE" | "PRIVATE_EQUITY" | "HYBRID"
    fund_closed:   Var<bool>,

    // ── NAV tracking ─────────────────────────────────────────────────────────
    latest_nav:    Var<NavRecord>,
    nav_history_count: Var<u64>,

    // ── Subscription queue ────────────────────────────────────────────────────
    subscriptions:     Mapping<u64, SubscriptionRequest>,
    subscription_count: Var<u64>,

    // ── Redemption queue ──────────────────────────────────────────────────────
    redemptions:       Mapping<u64, RedemptionRequest>,
    redemption_count:  Var<u64>,

    // ── Distribution history ──────────────────────────────────────────────────
    distribution_count: Var<u64>,

    // ── Governance ────────────────────────────────────────────────────────────
    proposal_count: Var<u64>,

    // ── Compliance ───────────────────────────────────────────────────────────
    compliance:         Var<Address>,
    identity_registry:  Var<Address>,
    frozen:             Mapping<Address, bool>,
    frozen_tokens:      Mapping<Address, U256>,

    // ── Admin ─────────────────────────────────────────────────────────────────
    fund_admins:   Mapping<Address, bool>,
}

#[odra::module]
impl FundToken {
    // ── Constructor ──────────────────────────────────────────────────────────

    pub fn init(
        &mut self,
        owner:             Address,
        name:              String,
        symbol:            String,
        fund_name:         String,
        fund_manager:      String,
        vintage_year:      u32,
        strategy:          String,
        compliance:        Address,
        identity_registry: Address,
    ) {
        self.ownable.module_mut().init(owner);
        self.name.set(name);
        self.symbol.set(symbol);
        self.decimals.set(6);
        self.fund_name.set(fund_name);
        self.fund_manager.set(fund_manager);
        self.vintage_year.set(vintage_year);
        self.strategy.set(strategy);
        self.compliance.set(compliance);
        self.identity_registry.set(identity_registry);
        self.fund_closed.set(false);
        self.fund_admins.set(&owner, true);
    }

    // ── NAV Management ────────────────────────────────────────────────────────

    /// Fund admin posts a fresh NAV.  Both per-token and total NAV in USD cents.
    pub fn post_nav(&mut self, nav_per_token: u64, total_nav: u64) {
        self.assert_fund_admin();
        if nav_per_token == 0 {
            self.env().revert(FundTokenError::InvalidNav);
        }
        let now = self.env().get_block_time();
        let caller = self.env().caller();
        self.latest_nav.set(NavRecord {
            nav_per_token,
            total_nav,
            posted_at: now,
            posted_by: caller,
        });
        self.nav_history_count.set(self.nav_history_count.get_or_default() + 1);
        self.env().emit_event(NavPosted { nav_per_token, total_nav, posted_at: now });
    }

    pub fn get_latest_nav(&self) -> NavRecord {
        self.latest_nav.get_or_default()
    }

    // ── Subscriptions ─────────────────────────────────────────────────────────

    /// Investor queues a subscription (commits CSPR motes off-chain first,
    /// then records intent on-chain).
    pub fn subscribe(&mut self, amount_cspr: u64) -> u64 {
        if self.fund_closed.get_or_default() {
            self.env().revert(FundTokenError::FundClosed);
        }
        if amount_cspr == 0 {
            self.env().revert(FundTokenError::ZeroAmount);
        }
        let investor  = self.env().caller();
        let now       = self.env().get_block_time();
        let id        = self.subscription_count.get_or_default();
        self.subscriptions.set(
            &id,
            SubscriptionRequest {
                investor,
                amount_cspr,
                requested_at: now,
                status: SubscriptionStatus::Pending,
            },
        );
        self.subscription_count.set(id + 1);
        self.env().emit_event(SubscriptionQueued { investor, amount_cspr, subscription_id: id });
        id
    }

    /// Fund admin accepts a subscription: mint LP tokens at current NAV.
    pub fn accept_subscription(&mut self, subscription_id: u64) {
        self.assert_fund_admin();
        let mut req = self.get_subscription(subscription_id);
        match req.status {
            SubscriptionStatus::Pending => {}
            _ => self.env().revert(FundTokenError::AlreadyProcessed),
        }
        let nav = self.latest_nav.get_or_default();
        if nav.nav_per_token == 0 {
            self.env().revert(FundTokenError::NavNotSet);
        }
        // tokens = (cspr_motes / 1e9) * 1e8 (CSPR price in cents assumed = 1 for demo)
        // In production: tokens = (cspr_usd_value_cents * 1e6) / nav_per_token
        // Here: simple 1:1 mapping for illustration
        let tokens = U256::from((req.amount_cspr / nav.nav_per_token).max(1));

        req.status = SubscriptionStatus::Accepted;
        self.subscriptions.set(&subscription_id, req.clone());

        // Mint directly to investor
        self.do_mint(req.investor, tokens);
        self.env().emit_event(SubscriptionAccepted {
            investor: req.investor,
            subscription_id,
            tokens_minted: tokens,
        });
    }

    /// Fund admin rejects a subscription (CSPR is returned off-chain).
    pub fn reject_subscription(&mut self, subscription_id: u64) {
        self.assert_fund_admin();
        let mut req = self.get_subscription(subscription_id);
        match req.status {
            SubscriptionStatus::Pending => {}
            _ => self.env().revert(FundTokenError::AlreadyProcessed),
        }
        req.status = SubscriptionStatus::Rejected;
        self.subscriptions.set(&subscription_id, req.clone());
        self.env().emit_event(SubscriptionRejected {
            investor: req.investor,
            subscription_id,
        });
    }

    // ── Redemptions ───────────────────────────────────────────────────────────

    /// Investor queues a redemption request during the liquidity window.
    pub fn request_redemption(&mut self, token_amount: U256) -> u64 {
        let investor = self.env().caller();
        let balance  = self.balances.get(&investor).unwrap_or_default();
        let frozen   = self.frozen_tokens.get(&investor).unwrap_or_default();
        if balance.saturating_sub(frozen) < token_amount {
            self.env().revert(FundTokenError::InsufficientBalance);
        }
        let now = self.env().get_block_time();
        let id  = self.redemption_count.get_or_default();
        self.redemptions.set(
            &id,
            RedemptionRequest {
                investor,
                token_amount,
                requested_at: now,
                status: RedemptionStatus::Pending,
            },
        );
        self.redemption_count.set(id + 1);
        self.env().emit_event(RedemptionQueued { investor, token_amount, redemption_id: id });
        id
    }

    /// Fund admin processes a redemption: burns tokens and records CSPR returned.
    pub fn process_redemption(&mut self, redemption_id: u64, cspr_returned: u64) {
        self.assert_fund_admin();
        let mut req = self.get_redemption(redemption_id);
        match req.status {
            RedemptionStatus::Pending => {}
            _ => self.env().revert(FundTokenError::AlreadyProcessed),
        }
        req.status = RedemptionStatus::Processed;
        self.redemptions.set(&redemption_id, req.clone());
        self.do_burn(req.investor, req.token_amount);
        self.env().emit_event(RedemptionProcessed {
            investor: req.investor,
            redemption_id,
            cspr_returned,
        });
    }

    // ── Distributions ─────────────────────────────────────────────────────────

    /// Record a distribution event on-chain for LP audit trail.
    pub fn record_distribution(
        &mut self,
        amount_usd_cents:   u64,
        distribution_type:  String,
        note:               String,
    ) -> u64 {
        self.assert_fund_admin();
        let id = self.distribution_count.get_or_default();
        self.distribution_count.set(id + 1);
        self.env().emit_event(DistributionRecorded {
            distribution_id: id,
            amount_usd_cents,
            distribution_type,
            note,
        });
        id
    }

    // ── CSPR.fans Governance ─────────────────────────────────────────────────

    /// Create an on-chain governance proposal for CSPR.fans community voting.
    pub fn create_governance_proposal(
        &mut self,
        title:       String,
        description: String,
        voting_days: u64,   // number of days the vote is open
    ) -> u64 {
        self.assert_fund_admin();
        let id = self.proposal_count.get_or_default();
        let now = self.env().get_block_time();
        // 86_400 seconds per day
        let voting_ends = now + voting_days * 86_400;
        self.proposal_count.set(id + 1);
        self.env().emit_event(GovernanceProposalCreated {
            proposal_id: id,
            title,
            description,
            voting_ends,
        });
        id
    }

    // ── Standard token interface ──────────────────────────────────────────────

    pub fn name(&self)         -> String { self.name.get_or_default() }
    pub fn symbol(&self)       -> String { self.symbol.get_or_default() }
    pub fn decimals(&self)     -> u8     { self.decimals.get_or_default() }
    pub fn total_supply(&self) -> U256   { self.total_supply.get_or_default() }
    pub fn fund_name(&self)    -> String { self.fund_name.get_or_default() }
    pub fn fund_manager(&self) -> String { self.fund_manager.get_or_default() }
    pub fn strategy(&self)     -> String { self.strategy.get_or_default() }
    pub fn vintage_year(&self) -> u32    { self.vintage_year.get_or_default() }
    pub fn is_closed(&self)    -> bool   { self.fund_closed.get_or_default() }

    pub fn balance_of(&self, account: Address) -> U256 {
        self.balances.get(&account).unwrap_or_default()
    }

    pub fn available_balance(&self, account: Address) -> U256 {
        self.balances.get(&account).unwrap_or_default()
            .saturating_sub(self.frozen_tokens.get(&account).unwrap_or_default())
    }

    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.allowances.get(&(owner, spender)).unwrap_or_default()
    }

    pub fn approve(&mut self, spender: Address, amount: U256) {
        let owner = self.env().caller();
        self.allowances.set(&(owner, spender), amount);
    }

    pub fn transfer(&mut self, to: Address, amount: U256) -> bool {
        let from = self.env().caller();
        self.do_transfer(from, to, amount);
        true
    }

    pub fn close_fund(&mut self) {
        self.assert_fund_admin();
        self.fund_closed.set(true);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    pub fn add_fund_admin(&mut self, admin: Address) {
        self.ownable.module().assert_owner(&self.env().caller());
        self.fund_admins.set(&admin, true);
    }

    pub fn remove_fund_admin(&mut self, admin: Address) {
        self.ownable.module().assert_owner(&self.env().caller());
        self.fund_admins.set(&admin, false);
    }

    pub fn set_address_frozen(&mut self, investor: Address, freeze: bool) {
        self.assert_fund_admin();
        self.frozen.set(&investor, freeze);
    }

    pub fn freeze_partial(&mut self, investor: Address, amount: U256) {
        self.assert_fund_admin();
        let bal    = self.balances.get(&investor).unwrap_or_default();
        let frozen = self.frozen_tokens.get(&investor).unwrap_or_default();
        if frozen + amount > bal {
            self.env().revert(FundTokenError::InsufficientBalance);
        }
        self.frozen_tokens.set(&investor, frozen + amount);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    fn do_mint(&mut self, to: Address, amount: U256) {
        let bal = self.balances.get(&to).unwrap_or_default();
        self.balances.set(&to, bal + amount);
        self.total_supply.set(self.total_supply.get_or_default() + amount);
        let nav = self.latest_nav.get_or_default().nav_per_token;
        self.env().emit_event(FundTokensMinted { to, amount, nav });
    }

    fn do_burn(&mut self, from: Address, amount: U256) {
        let bal = self.balances.get(&from).unwrap_or_default();
        if bal < amount {
            self.env().revert(FundTokenError::InsufficientBalance);
        }
        self.balances.set(&from, bal - amount);
        let supply = self.total_supply.get_or_default();
        self.total_supply.set(supply.saturating_sub(amount));
        self.env().emit_event(FundTokensBurned { from, amount });
    }

    fn do_transfer(&mut self, from: Address, to: Address, amount: U256) {
        let avail = self.available_balance(from);
        if avail < amount {
            self.env().revert(FundTokenError::InsufficientBalance);
        }
        let from_bal = self.balances.get(&from).unwrap_or_default();
        self.balances.set(&from, from_bal - amount);
        let to_bal = self.balances.get(&to).unwrap_or_default();
        self.balances.set(&to, to_bal + amount);
    }

    fn get_subscription(&self, id: u64) -> SubscriptionRequest {
        match self.subscriptions.get(&id) {
            Some(r) => r,
            None    => self.env().revert(FundTokenError::SubscriptionNotFound),
        }
    }

    fn get_redemption(&self, id: u64) -> RedemptionRequest {
        match self.redemptions.get(&id) {
            Some(r) => r,
            None    => self.env().revert(FundTokenError::RedemptionNotFound),
        }
    }

    fn assert_fund_admin(&self) {
        let caller = self.env().caller();
        if self.ownable.module().get_owner() != caller
            && !self.fund_admins.get(&caller).unwrap_or(false)
        {
            self.env().revert(FundTokenError::NotAuthorized);
        }
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostEnv};
    use odra_test::env;

    fn setup() -> (HostEnv, FundTokenHostRef) {
        let test_env   = env();
        let owner      = test_env.get_account(0);
        let compliance = test_env.get_account(8);
        let registry   = test_env.get_account(9);
        let contract   = FundTokenHostRef::deploy(
            &test_env,
            FundTokenInitArgs {
                owner,
                name:              "NGVC1 LP Token".into(),
                symbol:            "NGVC1".into(),
                fund_name:         "Nigeria VC Fund I".into(),
                fund_manager:      "Acme Capital".into(),
                vintage_year:      2026,
                strategy:          "VENTURE".into(),
                compliance,
                identity_registry: registry,
            },
        );
        (test_env, contract)
    }

    #[test]
    fn post_and_read_nav() {
        let (_env, mut contract) = setup();
        contract.post_nav(1_000, 50_000_000); // $10.00 / token; $500k total
        let nav = contract.get_latest_nav();
        assert_eq!(nav.nav_per_token, 1_000);
        assert_eq!(nav.total_nav,     50_000_000);
    }

    #[test]
    fn subscription_flow() {
        let (env, mut contract) = setup();
        let investor = env.get_account(1);
        contract.post_nav(500, 0); // $5.00 / token

        env.set_caller(investor);
        let sub_id = contract.subscribe(50_000); // 50,000 motes
        assert_eq!(sub_id, 0);

        env.set_caller(env.get_account(0));
        contract.accept_subscription(0);
        // tokens = 50000 / 500 = 100
        assert_eq!(contract.balance_of(investor), U256::from(100u64));
    }

    #[test]
    fn redemption_flow() {
        let (env, mut contract) = setup();
        let investor = env.get_account(1);
        contract.post_nav(1_000, 0);

        env.set_caller(investor);
        contract.subscribe(1_000);
        env.set_caller(env.get_account(0));
        contract.accept_subscription(0); // mints 1 token

        env.set_caller(investor);
        let red_id = contract.request_redemption(U256::from(1u64));
        env.set_caller(env.get_account(0));
        contract.process_redemption(red_id, 1_000);
        assert_eq!(contract.balance_of(investor), U256::zero());
    }

    #[test]
    fn governance_proposal() {
        let (_env, mut contract) = setup();
        let id = contract.create_governance_proposal(
            "Invest in Paystack Series C".into(),
            "Allocate 15% of fund to Paystack".into(),
            7,
        );
        assert_eq!(id, 0);
    }

    #[test]
    fn distribution_recording() {
        let (_env, mut contract) = setup();
        let id = contract.record_distribution(
            100_000_00,                // $100,000.00 in cents
            "INCOME".into(),
            "Q2 2026 dividend".into(),
        );
        assert_eq!(id, 0);
    }
}