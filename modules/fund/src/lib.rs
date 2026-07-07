//! # RWA Fund Contract (Casper / Odra)
//!
//! Holds no assets itself beyond the deposit stablecoin float needed to pay
//! out redemptions. Mints/burns "fund shares" against a NAV that is pushed in
//! by an authorized oracle/agent role. The agent aggregates the real portfolio
//! value from the AgentPortfolioReporter on Base and reports it here via
//! the `report_nav` entrypoint.

#![cfg_attr(feature = "contract", no_std)]
#![cfg_attr(feature = "contract", allow(unused))]

extern crate alloc;

#[cfg(feature = "contract")]
mod tests;

use odra::prelude::*;
use odra::ContractRef;
use odra_modules::access::Ownable;
use casper_types::U256;
use odra::module::SubModule;

/// NAV scale: 1 = $0.000001, 1_000_000 = $1.00
pub const NAV_SCALE: u64 = 1_000_000;

// ── Types ─────────────────────────────────────────────────────────────────

#[odra::odra_type]
pub struct AssetSnapshot {
    pub symbol: String,
    pub quantity: u64,
    pub price: u64,
    pub value: u64
}

#[odra::odra_type]
pub struct RedemptionRequest {
    pub owner: Address,
    pub receiver: Address,
    pub shares: u64,
    pub payout: U256,
    pub fulfilled: bool,
    pub requested_at: u64
}

#[odra::odra_type]
pub struct NavReport {
    pub total_value: u64,
    pub nav_per_share: u64,
    pub usdc_balance: u64,
    pub assets: Vec<AssetSnapshot>
}

// ── Events ────────────────────────────────────────────────────────────────

#[odra::event]
pub struct Deposited {
    pub depositor: Address,
    pub amount: U256,
    pub shares: u64,
    pub nav: u64
}

#[odra::event]
pub struct RedeemRequested {
    pub ticket: u64,
    pub owner: Address,
    pub shares: u64,
    pub payout: U256
}

#[odra::event]
pub struct RedeemFulfilled {
    pub ticket: u64,
    pub receiver: Address,
    pub payout: U256
}

#[odra::event]
pub struct NavUpdated {
    pub total_value: u64,
    pub nav_per_share: u64,
    pub updated_at: u64
}

#[odra::event]
pub struct NavReportReceived {
    pub total_value: u64,
    pub asset_count: u32,
    pub reporter: Address
}

#[odra::event]
pub struct OracleSet {
    pub oracle: Address
}

#[odra::event]
pub struct TreasurySwept {
    pub operator: Address,
    pub amount: U256
}

// ── Errors ────────────────────────────────────────────────────────────────

#[odra::odra_error]
pub enum FundError {
    NotOwner = 5_000,
    NotOracle = 5_001,
    ZeroAmount = 5_002,
    InsufficientShares = 5_003,
    NavNotSet = 5_004,
    TicketNotFound = 5_005,
    AlreadyFulfilled = 5_006,
    InsufficientTreasury = 5_007,
    DivisionByZero = 5_008,
    LengthMismatch = 5_009
}

// ── Module ────────────────────────────────────────────────────────────────

#[odra::module]
pub struct Fund {
    ownable: SubModule<Ownable>,
    payment_token: Var<Address>,
    oracle: Var<Address>,
    treasury_operator: Var<Address>,

    total_shares: Var<u64>,
    shares: Mapping<Address, u64>,

    nav_per_share: Var<u64>,
    total_value: Var<u64>,
    nav_is_set: Var<bool>,
    last_nav_update: Var<u64>,

    asset_symbols: Var<Vec<String>>,
    assets: Mapping<String, AssetSnapshot>,

    redemptions: Mapping<u64, RedemptionRequest>,
    next_ticket: Var<u64>
}

#[odra::module]
impl Fund {
    // ── Constructor ──────────────────────────────────────────────────────

    pub fn init(&mut self, owner: Address, payment_token: Address, oracle: Address) {
        self.ownable.module_mut().init(owner);
        self.payment_token.set(payment_token);
        self.oracle.set(oracle);
        self.treasury_operator.set(owner);
        self.total_shares.set(0);
        self.nav_per_share.set(0);
        self.total_value.set(0);
        self.nav_is_set.set(false);
        self.next_ticket.set(0);
        self.asset_symbols.set(Vec::new());
    }

    // ── Deposits ─────────────────────────────────────────────────────────

    /// Deposit payment tokens and mint fund shares at current NAV.
    pub fn deposit(&mut self, amount: U256) -> u64 {
        if amount.is_zero() {
            self.env().revert(FundError::ZeroAmount);
        }
        if !self.nav_is_set.get_or_default() {
            self.env().revert(FundError::NavNotSet);
        }

        let caller = self.env().caller();
        let this = self.env().self_address();

        // Transfer tokens from caller to this contract
        let token_addr = self.payment_token.get_or_revert_with(FundError::NotOwner);
        let mut token = odra_modules::cep18_token::Cep18ContractRef::new(self.env(), token_addr);
        token.transfer_from(&caller, &this, &amount);

        // Calculate shares: amount / nav * NAV_SCALE
        let nav = self.nav_per_share.get_or_default();
        let amount_u64 = self.u256_to_u64(amount);
        let shares = amount_u64
            .checked_mul(NAV_SCALE as u64)
            .and_then(|v| v.checked_div(nav))
            .unwrap_or_else(|| self.env().revert(FundError::DivisionByZero));

        let current = self.shares.get(&caller).unwrap_or_default();
        self.shares.set(&caller, current + shares);
        self.total_shares.set(self.total_shares.get_or_default() + shares);

        self.env().emit_event(Deposited {
            depositor: caller,
            amount,
            shares,
            nav
        });

        shares
    }

    // ── Redemption ───────────────────────────────────────────────────────

    /// Request redemption of shares. Burns shares immediately, locks payout.
    pub fn request_redeem(&mut self, shares: u64, receiver: Address) -> u64 {
        if shares == 0 {
            self.env().revert(FundError::ZeroAmount);
        }
        if !self.nav_is_set.get_or_default() {
            self.env().revert(FundError::NavNotSet);
        }

        let caller = self.env().caller();
        let balance = self.shares.get(&caller).unwrap_or_default();
        if balance < shares {
            self.env().revert(FundError::InsufficientShares);
        }

        // Burn shares
        self.shares.set(&caller, balance - shares);
        self.total_shares.set(self.total_shares.get_or_default() - shares);

        // Calculate payout: shares * nav / NAV_SCALE
        let nav = self.nav_per_share.get_or_default();
        let payout_u64 = shares
            .checked_mul(nav)
            .and_then(|v| v.checked_div(NAV_SCALE as u64))
            .unwrap_or_else(|| self.env().revert(FundError::DivisionByZero));
        let payout = U256::from(payout_u64);

        let ticket = self.next_ticket.get_or_default();
        self.next_ticket.set(ticket + 1);

        self.redemptions.set(&ticket, RedemptionRequest {
            owner: caller,
            receiver,
            shares,
            payout,
            fulfilled: false,
            requested_at: self.env().get_block_time()
        });

        self.env().emit_event(RedeemRequested {
            ticket,
            owner: caller,
            shares,
            payout
        });

        ticket
    }

    /// Fulfill a redemption request.
    pub fn fulfill_redeem(&mut self, ticket: u64) {
        self.assert_treasury_operator();

        let mut request = self.redemptions.get(&ticket)
            .unwrap_or_else(|| self.env().revert(FundError::TicketNotFound));

        if request.fulfilled {
            self.env().revert(FundError::AlreadyFulfilled);
        }

        let token_addr = self.payment_token.get_or_revert_with(FundError::NotOwner);
        let mut token = odra_modules::cep18_token::Cep18ContractRef::new(self.env(), token_addr);
        let available = token.balance_of(&self.env().self_address());
        if available < request.payout {
            self.env().revert(FundError::InsufficientTreasury);
        }

        token.transfer(&request.receiver, &request.payout);

        request.fulfilled = true;
        self.redemptions.set(&ticket, request.clone());

        self.env().emit_event(RedeemFulfilled {
            ticket,
            receiver: request.receiver,
            payout: request.payout
        });
    }

    // ── Oracle / Agent Reporting ─────────────────────────────────────────

    /// Report NAV from agent (comprehensive update)
    /// @param symbols Asset symbols (e.g., "dTSLA", "dNVDA", "USDC")
    /// @param quantities Amount of each asset held (in token decimals)
    /// @param prices Price of each asset in USD * 1e8 ($1 = 100_000_000)
    /// @param usdc_balance USDC balance (6 decimals)
    /// @dev dShares have 18 decimals, USDC has 6 decimals
    /// @dev Values normalized to 1e6 (NAV_SCALE) for internal use
    pub fn report_nav(
        &mut self,
        symbols: Vec<String>,
        quantities: Vec<u64>,
        prices: Vec<u64>,
        usdc_balance: u64
    ) {
        self.assert_oracle();
        
        if symbols.len() != quantities.len() || symbols.len() != prices.len() {
            self.env().revert(FundError::LengthMismatch);
        }

        // Clear old assets and rebuild
        let mut new_symbols = Vec::new();
        // total_value in 1e6 scale (same as NAV_SCALE)
        let mut total_value: u64 = 0;
        
        for i in 0..symbols.len() {
            let symbol = symbols.get(i).cloned().unwrap_or_default();
            let quantity = *quantities.get(i).unwrap_or(&0);
            let price = *prices.get(i).unwrap_or(&0);
            
            // dShares have 18 decimals, prices are in 1e8 ($1 = 100_000_000)
            // value = quantity * price / 10^18 (convert to $ in 1e6 scale)
            // Safe: quantity is in 1e18, price is in 1e8
            // result is in 1e6 = NAV_SCALE
            let value = quantity
                .checked_mul(price / 100_000_000) // price in dollars
                .and_then(|v| v.checked_div(1_000_000_000)) // 10^18 -> 10^6
                .unwrap_or(0);
            
            total_value = total_value.saturating_add(value);
            new_symbols.push(symbol.clone());
            
            self.assets.set(&symbol, AssetSnapshot {
                symbol: symbol.clone(),
                quantity,
                price,
                value
            });
        }
        
        // Add USDC balance (6 decimals, already same scale as NAV_SCALE)
        total_value = total_value.saturating_add(usdc_balance);
        
        // Update NAV per share (stored in NAV_SCALE = 1e6)
        let total_shares = self.total_shares.get_or_default();
        let nav_per_share = if total_shares > 0 {
            total_value
                .checked_div(total_shares)
                .unwrap_or(0)
        } else {
            // First NAV set, initialize at $1 per share
            NAV_SCALE as u64
        };

        // Store state
        self.nav_per_share.set(nav_per_share);
        self.total_value.set(total_value);
        self.nav_is_set.set(true);
        self.asset_symbols.set(new_symbols);
        
        let now = self.env().get_block_time();
        self.last_nav_update.set(now);

        self.env().emit_event(NavUpdated {
            total_value,
            nav_per_share,
            updated_at: now
        });

        self.env().emit_event(NavReportReceived {
            total_value,
            asset_count: symbols.len() as u32,
            reporter: self.env().caller()
        });
    }

    /// Simple NAV update (legacy, for backwards compatibility)
    pub fn set_nav(&mut self, nav_per_share: u64, total_value: u64) {
        self.assert_oracle();
        self.nav_per_share.set(nav_per_share);
        self.total_value.set(total_value);
        self.nav_is_set.set(true);
        let now = self.env().get_block_time();
        self.last_nav_update.set(now);

        self.env().emit_event(NavUpdated {
            total_value,
            nav_per_share,
            updated_at: now
        });
    }

    // ── Admin ─────────────────────────────────────────────────────────────

    pub fn set_oracle(&mut self, new_oracle: Address) {
        self.ownable.module().assert_owner(&self.env().caller());
        self.oracle.set(new_oracle);
        self.env().emit_event(OracleSet { oracle: new_oracle });
    }

    pub fn set_treasury_operator(&mut self, new_operator: Address) {
        self.ownable.module().assert_owner(&self.env().caller());
        self.treasury_operator.set(new_operator);
    }

    pub fn sweep(&mut self, amount: U256) {
        self.assert_treasury_operator();
        let operator = self.treasury_operator.get_or_revert_with(FundError::NotOracle);
        let token_addr = self.payment_token.get_or_revert_with(FundError::NotOwner);
        let mut token = odra_modules::cep18_token::Cep18ContractRef::new(self.env(), token_addr);
        token.transfer(&operator, &amount);
        self.env().emit_event(TreasurySwept { operator, amount });
    }

    // ── Queries ───────────────────────────────────────────────────────────

    pub fn get_nav(&self) -> u64 {
        self.nav_per_share.get_or_default()
    }

    pub fn get_total_value(&self) -> u64 {
        self.total_value.get_or_default()
    }

    pub fn get_shares(&self, owner: Address) -> u64 {
        self.shares.get(&owner).unwrap_or_default()
    }

    pub fn get_total_shares(&self) -> u64 {
        self.total_shares.get_or_default()
    }

    pub fn get_redemption(&self, ticket: u64) -> Option<RedemptionRequest> {
        self.redemptions.get(&ticket)
    }

    pub fn get_asset_symbols(&self) -> Vec<String> {
        self.asset_symbols.get_or_default()
    }

    pub fn get_asset(&self, symbol: String) -> Option<AssetSnapshot> {
        self.assets.get(&symbol)
    }

    pub fn get_all_assets(&self) -> Vec<AssetSnapshot> {
        let symbols = self.asset_symbols.get_or_default();
        let mut assets = Vec::new();
        for symbol in symbols {
            if let Some(asset) = self.assets.get(&symbol) {
                assets.push(asset);
            }
        }
        assets
    }

    pub fn get_nav_report(&self) -> NavReport {
        NavReport {
            total_value: self.total_value.get_or_default(),
            nav_per_share: self.nav_per_share.get_or_default(),
            usdc_balance: self.assets.get(&String::from("USDC"))
                .map(|a| a.quantity)
                .unwrap_or(0),
            assets: self.get_all_assets()
        }
    }

    pub fn last_nav_update(&self) -> u64 {
        self.last_nav_update.get_or_default()
    }

    pub fn is_nav_set(&self) -> bool {
        self.nav_is_set.get_or_default()
    }

    // ── Private ───────────────────────────────────────────────────────────

    fn assert_oracle(&self) {
        if let Some(oracle) = self.oracle.get() {
            if self.env().caller() != oracle {
                self.env().revert(FundError::NotOracle);
            }
        } else {
            self.env().revert(FundError::NotOracle);
        }
    }

    fn assert_treasury_operator(&self) {
        if let Some(operator) = self.treasury_operator.get() {
            if self.env().caller() != operator {
                self.env().revert(FundError::NotOracle);
            }
        } else {
            self.env().revert(FundError::NotOracle);
        }
    }

    fn u256_to_u64(&self, value: U256) -> u64 {
        let low = value.low_u64();
        if value > U256::from(u64::MAX) {
            u64::MAX
        } else {
            low
        }
    }
}
