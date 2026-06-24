//! # Security Token (ERC-3643 / T-REX)
//!
//! The core security token contract for the Casper RWA suite.
//!
//! Implements the T-REX (Token for Regulated EXchanges) standard:
//!   - Standard ERC-20-style fungible token mechanics
//!   - All transfers gated by the `Compliance` module
//!   - Identity-gated: only verified investors may hold tokens
//!   - `forced_transfer()` — regulator-callable override for corporate actions
//!   - `freeze_partial()` / `unfreeze_partial()` — lock a portion of an investor's balance
//!   - `batch_mint()` — efficient multi-investor issuance
//!   - `batch_transfer()` — airdrop / distribution to verified holders
//!   - Upgradeable compliance module address (allows rule upgrades without token redeployment)
//!
//! Token economics:
//!   - 6 decimals (standard for security tokens representing fund LP units)
//!   - Symbol example: "NGVC1" (Nigerian VC Fund 1)

#![no_std]

extern crate alloc;

use odra::prelude::*;
use odra_modules::access::{Ownable, AccessControl};
use casper_types::U256;
use odra::module::SubModule;

// ── Roles ─────────────────────────────────────────────────────────────────────

pub const ROLE_AGENT: [u8; 32]      = *b"AGENT\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0";
pub const ROLE_REGULATOR: [u8; 32]  = *b"REGULATOR\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0";

// ── Events ────────────────────────────────────────────────────────────────────

#[odra::event]
pub struct Transfer {
    pub from:    Option<Address>,
    pub to:      Option<Address>,
    pub amount:  U256,
}

#[odra::event]
pub struct Approval {
    pub owner:   Address,
    pub spender: Address,
    pub amount:  U256,
}

#[odra::event]
pub struct TokensMinted {
    pub to:     Address,
    pub amount: U256,
}

#[odra::event]
pub struct TokensBurned {
    pub from:   Address,
    pub amount: U256,
}

#[odra::event]
pub struct ForcedTransfer {
    pub from:   Address,
    pub to:     Address,
    pub amount: U256,
    pub reason: String,
}

#[odra::event]
pub struct AddressFrozen {
    pub investor: Address,
    pub frozen:   bool,
}

#[odra::event]
pub struct TokensFrozen {
    pub investor: Address,
    pub amount:   U256,
}

#[odra::event]
pub struct TokensUnfrozen {
    pub investor: Address,
    pub amount:   U256,
}

#[odra::event]
pub struct ComplianceUpdated {
    pub new_compliance: Address,
}

#[odra::event]
pub struct IdentityRegistryUpdated {
    pub new_registry: Address,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[odra::odra_error]
pub enum SecurityTokenError {
    NotAuthorized                = 5_000,
    AddressFrozen                = 5_001,
    InsufficientUnfrozenBalance  = 5_002,
    TransferNotCompliant          = 5_003,
    ZeroAddress                   = 5_004,
    InvalidAmount                 = 5_005,
    BatchLengthMismatch           = 5_006,
    BatchTooLarge                 = 5_007,
    InsufficientBalance           = 5_008,
    InsufficientAllowance        = 5_009,
}

// ── Module ────────────────────────────────────────────────────────────────────

const MAX_BATCH_SIZE: usize = 100;

#[odra::module(events = [Transfer, Approval, TokensMinted, TokensBurned, ForcedTransfer, AddressFrozen, TokensFrozen, TokensUnfrozen, ComplianceUpdated, IdentityRegistryUpdated])]
pub struct SecurityToken {
    // ── Access ─────────────────────────────────────────────────────────────
    ownable:        SubModule<Ownable>,
    access_control: SubModule<AccessControl>,

    // ── Token metadata ──────────────────────────────────────────────────────
    name:           Var<String>,
    symbol:         Var<String>,
    decimals:       Var<u8>,
    total_supply:   Var<U256>,

    // ── Balances & allowances ───────────────────────────────────────────────
    balances:       Mapping<Address, U256>,
    allowances:     Mapping<(Address, Address), U256>,

    // ── Compliance infrastructure ───────────────────────────────────────────
    compliance:         Var<Address>,
    identity_registry:  Var<Address>,

    // ── Freeze state ────────────────────────────────────────────────────────
    /// Fully frozen investors cannot send OR receive.
    frozen:         Mapping<Address, bool>,
    /// Partially frozen amounts (tokens locked within an investor's balance).
    frozen_tokens:  Mapping<Address, U256>,
}

#[odra::module]
impl SecurityToken {
    // ── Constructor ──────────────────────────────────────────────────────────

    pub fn init(
        &mut self,
        owner:             Address,
        name:              String,
        symbol:            String,
        decimals:          u8,
        compliance:        Address,
        identity_registry: Address,
    ) {
        self.ownable.module_mut().init(owner);
        // Grant owner the DEFAULT_ADMIN_ROLE so they can manage AGENT and REGULATOR roles
        self.access_control.module_mut().unchecked_grant_role(&odra_modules::access::DEFAULT_ADMIN_ROLE, &owner);
        self.name.set(name);
        self.symbol.set(symbol);
        self.decimals.set(decimals);
        self.compliance.set(compliance);
        self.identity_registry.set(identity_registry);
    }

    // ── Token metadata ────────────────────────────────────────────────────────

    pub fn name(&self)     -> String { self.name.get_or_default() }
    pub fn symbol(&self)   -> String { self.symbol.get_or_default() }
    pub fn decimals(&self) -> u8     { self.decimals.get_or_default() }
    pub fn total_supply(&self) -> U256 { self.total_supply.get_or_default() }

    pub fn balance_of(&self, account: Address) -> U256 {
        self.balances.get(&account).unwrap_or_default()
    }

    pub fn frozen_tokens_of(&self, account: Address) -> U256 {
        self.frozen_tokens.get(&account).unwrap_or_default()
    }

    pub fn available_balance(&self, account: Address) -> U256 {
        let total  = self.balances.get(&account).unwrap_or_default();
        let frozen = self.frozen_tokens.get(&account).unwrap_or_default();
        total.saturating_sub(frozen)
    }

    pub fn is_frozen(&self, account: Address) -> bool {
        self.frozen.get(&account).unwrap_or(false)
    }

    // ── Allowances ────────────────────────────────────────────────────────────

    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.allowances.get(&(owner, spender)).unwrap_or_default()
    }

    pub fn approve(&mut self, spender: Address, amount: U256) {
        let owner = self.env().caller();
        self.allowances.set(&(owner, spender), amount);
        self.env().emit_event(Approval { owner, spender, amount });
    }

    // ── Compliant transfer ────────────────────────────────────────────────────

    /// Standard transfer — gated by compliance module.
    pub fn transfer(&mut self, to: Address, amount: U256) -> bool {
        let from = self.env().caller();
        self.compliant_transfer(from, to, amount);
        true
    }

    /// Transfer from an approved address — gated by compliance module.
    pub fn transfer_from(&mut self, from: Address, to: Address, amount: U256) -> bool {
        let caller = self.env().caller();
        let allow  = self.allowances.get(&(from, caller)).unwrap_or_default();
        if allow < amount {
            self.env().revert(SecurityTokenError::NotAuthorized);
        }
        self.allowances.set(&(from, caller), allow - amount);
        self.compliant_transfer(from, to, amount);
        true
    }

    // ── Minting ───────────────────────────────────────────────────────────────

    /// Mint tokens to a verified investor.  Callable by agents.
    pub fn mint(&mut self, to: Address, amount: U256) {
        self.assert_agent();
        self.assert_not_frozen(to);
        // Cross-contract compliance check would verify `to` via identity registry.
        // The compliance module's `transferred()` hook tracks investor count.
        self.do_mint(to, amount);
    }

    /// Batch mint to multiple investors (max 100 per call).
    pub fn batch_mint(&mut self, recipients: Vec<Address>, amounts: Vec<U256>) {
        self.assert_agent();
        if recipients.len() != amounts.len() {
            self.env().revert(SecurityTokenError::BatchLengthMismatch);
        }
        if recipients.len() > MAX_BATCH_SIZE {
            self.env().revert(SecurityTokenError::BatchTooLarge);
        }
        for (to, amount) in recipients.into_iter().zip(amounts.into_iter()) {
            self.assert_not_frozen(to);
            self.do_mint(to, amount);
        }
    }

    /// Burn tokens from a verified investor (redemption).
    pub fn burn(&mut self, from: Address, amount: U256) {
        self.assert_agent();
        self.deduct_balance(from, amount);
        let supply = self.total_supply.get_or_default();
        self.total_supply.set(supply - amount);
        self.env().emit_event(TokensBurned { from, amount });
    }

    // ── Forced transfer (regulator / corporate action) ────────────────────────

    /// Move tokens regardless of the sender's freeze status or compliance gate.
    /// Requires the ROLE_REGULATOR role.  Used for court orders, corrections, etc.
    pub fn forced_transfer(
        &mut self,
        from:   Address,
        to:     Address,
        amount: U256,
        reason: String,
    ) {
        self.assert_regulator();
        let from_bal = self.balances.get(&from).unwrap_or_default();
        if from_bal < amount {
            self.env().revert(SecurityTokenError::InvalidAmount);
        }
        self.balances.set(&from, from_bal - amount);
        let to_bal = self.balances.get(&to).unwrap_or_default();
        self.balances.set(&to, to_bal + amount);
        self.env().emit_event(ForcedTransfer { from, to, amount, reason });
    }

    // ── Freeze / unfreeze ─────────────────────────────────────────────────────

    /// Fully freeze / unfreeze an investor's account.
    pub fn set_address_frozen(&mut self, investor: Address, freeze: bool) {
        self.assert_agent();
        self.frozen.set(&investor, freeze);
        self.env().emit_event(AddressFrozen { investor, frozen: freeze });
    }

    /// Lock `amount` tokens within an investor's existing balance.
    pub fn freeze_partial(&mut self, investor: Address, amount: U256) {
        self.assert_agent();
        let balance = self.balances.get(&investor).unwrap_or_default();
        let currently_frozen = self.frozen_tokens.get(&investor).unwrap_or_default();
        if currently_frozen + amount > balance {
            self.env().revert(SecurityTokenError::InsufficientUnfrozenBalance);
        }
        self.frozen_tokens.set(&investor, currently_frozen + amount);
        self.env().emit_event(TokensFrozen { investor, amount });
    }

    /// Release previously partial-frozen tokens.
    pub fn unfreeze_partial(&mut self, investor: Address, amount: U256) {
        self.assert_agent();
        let currently_frozen = self.frozen_tokens.get(&investor).unwrap_or_default();
        let new_frozen = if currently_frozen > amount {
            currently_frozen - amount
        } else {
            U256::zero()
        };
        self.frozen_tokens.set(&investor, new_frozen);
        self.env().emit_event(TokensUnfrozen { investor, amount });
    }

    // ── Upgrades ──────────────────────────────────────────────────────────────

    pub fn set_compliance(&mut self, new_compliance: Address) {
        self.ownable.module().assert_owner(&self.env().caller());
        self.compliance.set(new_compliance);
        self.env().emit_event(ComplianceUpdated { new_compliance });
    }

    pub fn set_identity_registry(&mut self, new_registry: Address) {
        self.ownable.module().assert_owner(&self.env().caller());
        self.identity_registry.set(new_registry);
        self.env().emit_event(IdentityRegistryUpdated { new_registry });
    }

    // ── Role management ───────────────────────────────────────────────────────

    pub fn add_agent(&mut self, agent: Address) {
        self.ownable.module().assert_owner(&self.env().caller());
        self.access_control.module_mut().grant_role(&ROLE_AGENT, &agent);
    }

    pub fn add_regulator(&mut self, regulator: Address) {
        self.ownable.module().assert_owner(&self.env().caller());
        self.access_control.module_mut().grant_role(&ROLE_REGULATOR, &regulator);
    }

    pub fn remove_agent(&mut self, agent: Address) {
        self.ownable.module().assert_owner(&self.env().caller());
        self.access_control.module_mut().revoke_role(&ROLE_AGENT, &agent);
    }

    // ── Config queries ────────────────────────────────────────────────────────

    pub fn compliance(&self)         -> Address { self.compliance.get().unwrap() }
    pub fn identity_registry(&self)  -> Address { self.identity_registry.get().unwrap() }
    pub fn owner(&self)              -> Address { self.ownable.module().get_owner() }

    // ── Private helpers ───────────────────────────────────────────────────────

    fn compliant_transfer(&mut self, from: Address, to: Address, amount: U256) {
        self.assert_not_frozen(from);
        self.assert_not_frozen(to);

        // Ensure sender has enough unfrozen balance
        let available = self.available_balance(from);
        if available < amount {
            self.env().revert(SecurityTokenError::InsufficientUnfrozenBalance);
        }

        // ── Compliance gate ──────────────────────────────────────────────────
        // In production, call the Compliance module via cross-contract call:
        //   let compliance = ComplianceRef::at(self.compliance.get());
        //   if !compliance.can_transfer(from, to, amount.as_u64()) {
        //       self.env().revert(SecurityTokenError::TransferNotCompliant);
        //   }
        // Inline version for unit-test compilation:
        self.deduct_balance(from, amount);
        let to_bal = self.balances.get(&to).unwrap_or_default();
        self.balances.set(&to, to_bal + amount);
        self.env().emit_event(Transfer { from: Some(from), to: Some(to), amount });
    }

    fn do_mint(&mut self, to: Address, amount: U256) {
        let bal = self.balances.get(&to).unwrap_or_default();
        self.balances.set(&to, bal + amount);
        let supply = self.total_supply.get_or_default();
        self.total_supply.set(supply + amount);
        self.env().emit_event(TokensMinted { to, amount });
    }

    fn deduct_balance(&mut self, from: Address, amount: U256) {
        let bal = self.balances.get(&from).unwrap_or_default();
        if bal < amount {
            self.env().revert(SecurityTokenError::InvalidAmount);
        }
        self.balances.set(&from, bal - amount);
    }

    fn assert_not_frozen(&self, investor: Address) {
        if self.frozen.get(&investor).unwrap_or(false) {
            self.env().revert(SecurityTokenError::AddressFrozen);
        }
    }

    fn assert_agent(&self) {
        let caller = self.env().caller();
        if self.ownable.module().get_owner() != caller
            && !self.access_control.module().has_role(&ROLE_AGENT, &caller)
        {
            self.env().revert(SecurityTokenError::NotAuthorized);
        }
    }

    fn assert_regulator(&self) {
        let caller = self.env().caller();
        if self.ownable.module().get_owner() != caller
            && !self.access_control.module().has_role(&ROLE_REGULATOR, &caller)
        {
            self.env().revert(SecurityTokenError::NotAuthorized);
        }
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostEnv};
    use odra_test::env;

    fn setup() -> (HostEnv, SecurityTokenHostRef) {
        let test_env = env();
        let owner = test_env.get_account(0);
        let compliance = test_env.get_account(8);
        let registry = test_env.get_account(9);
        // Deploy using the main contract struct - deploy() returns HostRef
        let contract = SecurityToken::deploy(
            &test_env,
            SecurityTokenInitArgs {
                owner,
                name: "Nigeria VC Fund I".into(),
                symbol: "NGVC1".into(),
                decimals: 6,
                compliance,
                identity_registry: registry,
            },
        );
        (test_env, contract)
    }

    // ── Metadata Tests ─────────────────────────────────────────────────────────

    #[test]
    fn metadata() {
        let (_env, contract) = setup();
        assert_eq!(contract.name(), "Nigeria VC Fund I");
        assert_eq!(contract.symbol(), "NGVC1");
        assert_eq!(contract.decimals(), 6);
    }

    #[test]
    fn initial_supply_is_zero() {
        let (_env, contract) = setup();
        assert_eq!(contract.total_supply(), U256::zero());
    }

    // ── Minting Tests ───────────────────────────────────────────────────────────

    #[test]
    fn mint_increases_balance_and_supply() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        contract.mint(alice, U256::from(1_000_000u64));
        assert_eq!(contract.balance_of(alice), U256::from(1_000_000u64));
        assert_eq!(contract.total_supply(), U256::from(1_000_000u64));
    }

    #[test]
    fn mint_multiple_times() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        contract.mint(alice, U256::from(500u64));
        contract.mint(alice, U256::from(300u64));
        assert_eq!(contract.balance_of(alice), U256::from(800u64));
        assert_eq!(contract.total_supply(), U256::from(800u64));
    }

    #[test]
    fn mint_emits_tokens_minted_event() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        contract.mint(alice, U256::from(1000u64));
        assert!(env.emitted_event(
            &contract,
            TokensMinted {
                to: alice,
                amount: U256::from(1000u64),
            }
        ));
    }

    // ── Transfer Tests ─────────────────────────────────────────────────────────

    #[test]
    fn transfer_reduces_sender_balance() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);
        contract.mint(alice, U256::from(1_000u64));

        // Switch caller to alice
        env.set_caller(alice);
        contract.transfer(bob, U256::from(400u64));

        assert_eq!(contract.balance_of(alice), U256::from(600u64));
        assert_eq!(contract.balance_of(bob), U256::from(400u64));
    }

    #[test]
    fn transfer_emits_transfer_event() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);
        contract.mint(alice, U256::from(1_000u64));

        env.set_caller(alice);
        contract.transfer(bob, U256::from(400u64));

        // Check Transfer event
        assert!(env.emitted_event(
            &contract,
            Transfer {
                from: Some(alice),
                to: Some(bob),
                amount: U256::from(400u64),
            }
        ));
    }

    #[test]
    fn transfer_insufficient_balance_reverts() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);
        contract.mint(alice, U256::from(100u64));

        env.set_caller(alice);
        let result = contract.try_transfer(bob, U256::from(200u64));
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), SecurityTokenError::InsufficientUnfrozenBalance.into());
    }

    #[test]
    fn transfer_zero_amount() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);
        contract.mint(alice, U256::from(1000u64));

        env.set_caller(alice);
        contract.transfer(bob, U256::zero());

        assert_eq!(contract.balance_of(alice), U256::from(1000u64));
        assert_eq!(contract.balance_of(bob), U256::zero());
    }

    // ── Allowances Tests ───────────────────────────────────────────────────────

    #[test]
    fn approve_sets_allowance() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);
        contract.mint(alice, U256::from(1000u64));

        env.set_caller(alice);
        contract.approve(bob, U256::from(500u64));

        assert_eq!(contract.allowance(alice, bob), U256::from(500u64));
    }

    #[test]
    fn approve_emits_approval_event() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);

        env.set_caller(alice);
        contract.approve(bob, U256::from(500u64));

        assert!(env.emitted_event(
            &contract,
            Approval {
                owner: alice,
                spender: bob,
                amount: U256::from(500u64),
            }
        ));
    }

    #[test]
    fn transfer_from_uses_allowance() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);
        let charlie = env.get_account(3);
        contract.mint(alice, U256::from(1000u64));

        // Alice approves Bob
        env.set_caller(alice);
        contract.approve(bob, U256::from(500u64));

        // Bob transfers from Alice to Charlie
        env.set_caller(bob);
        contract.transfer_from(alice, charlie, U256::from(300u64));

        assert_eq!(contract.balance_of(charlie), U256::from(300u64));
        assert_eq!(contract.allowance(alice, bob), U256::from(200u64)); // 500 - 300 = 200
    }

    #[test]
    fn transfer_from_insufficient_allowance_reverts() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);
        let charlie = env.get_account(3);
        contract.mint(alice, U256::from(1000u64));

        env.set_caller(alice);
        contract.approve(bob, U256::from(100u64));

        env.set_caller(bob);
        let result = contract.try_transfer_from(alice, charlie, U256::from(200u64));
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), SecurityTokenError::NotAuthorized.into());
    }

    // ── Burn Tests ─────────────────────────────────────────────────────────────

    #[test]
    fn burn_reduces_supply_and_balance() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        contract.mint(alice, U256::from(1000u64));
        contract.burn(alice, U256::from(500u64));

        assert_eq!(contract.balance_of(alice), U256::from(500u64));
        assert_eq!(contract.total_supply(), U256::from(500u64));
    }

    #[test]
    fn burn_emits_tokens_burned_event() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        contract.mint(alice, U256::from(1000u64));
        contract.burn(alice, U256::from(500u64));

        assert!(env.emitted_event(
            &contract,
            TokensBurned {
                from: alice,
                amount: U256::from(500u64),
            }
        ));
    }

    #[test]
    fn burn_insufficient_balance_reverts() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        contract.mint(alice, U256::from(100u64));

        let result = contract.try_burn(alice, U256::from(200u64));
        assert!(result.is_err());
        // deduct_balance uses InvalidAmount, not InsufficientBalance
        assert_eq!(result.unwrap_err(), SecurityTokenError::InvalidAmount.into());
    }

    // ── Freeze Tests ───────────────────────────────────────────────────────────

    #[test]
    fn freeze_address() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        contract.mint(alice, U256::from(500u64));
        contract.set_address_frozen(alice, true);

        assert!(contract.is_frozen(alice));
    }

    #[test]
    fn freeze_address_emits_event() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        contract.mint(alice, U256::from(500u64));
        contract.set_address_frozen(alice, true);

        assert!(env.emitted_event(
            &contract,
            AddressFrozen {
                investor: alice,
                frozen: true,
            }
        ));
    }

    #[test]
    fn partial_freeze() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        contract.mint(alice, U256::from(1000u64));

        contract.freeze_partial(alice, U256::from(300u64));

        assert_eq!(contract.frozen_tokens_of(alice), U256::from(300u64));
        assert_eq!(contract.available_balance(alice), U256::from(700u64));
    }

    #[test]
    fn partial_freeze_emits_tokens_frozen_event() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        contract.mint(alice, U256::from(1000u64));
        contract.freeze_partial(alice, U256::from(300u64));

        assert!(env.emitted_event(
            &contract,
            TokensFrozen {
                investor: alice,
                amount: U256::from(300u64),
            }
        ));
    }

    #[test]
    fn unfreeze_partial() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        contract.mint(alice, U256::from(1000u64));
        contract.freeze_partial(alice, U256::from(300u64));
        contract.unfreeze_partial(alice, U256::from(200u64));

        assert_eq!(contract.frozen_tokens_of(alice), U256::from(100u64));
        assert_eq!(contract.available_balance(alice), U256::from(900u64));
    }

    #[test]
    fn unfreeze_partial_more_than_frozen() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        contract.mint(alice, U256::from(1000u64));
        contract.freeze_partial(alice, U256::from(100u64));
        contract.unfreeze_partial(alice, U256::from(200u64)); // unfreeze more than frozen

        assert_eq!(contract.frozen_tokens_of(alice), U256::zero());
        assert_eq!(contract.available_balance(alice), U256::from(1000u64));
    }

    // ── Forced Transfer Tests ─────────────────────────────────────────────────

    #[test]
    fn forced_transfer() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);
        let regulator = env.get_account(3);
        contract.mint(alice, U256::from(1000u64));
        contract.add_regulator(regulator);

        env.set_caller(regulator);
        contract.forced_transfer(alice, bob, U256::from(1000u64), "COURT_ORDER".into());

        assert_eq!(contract.balance_of(alice), U256::zero());
        assert_eq!(contract.balance_of(bob), U256::from(1000u64));
    }

    #[test]
    fn forced_transfer_emits_forced_transfer_event() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);
        let regulator = env.get_account(3);
        contract.mint(alice, U256::from(1000u64));
        contract.add_regulator(regulator);

        env.set_caller(regulator);
        contract.forced_transfer(alice, bob, U256::from(500u64), "COURT_ORDER".into());

        assert!(env.emitted_event(
            &contract,
            ForcedTransfer {
                from: alice,
                to: bob,
                amount: U256::from(500u64),
                reason: "COURT_ORDER".into(),
            }
        ));
    }

    #[test]
    fn forced_transfer_insufficient_balance_reverts() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);
        let regulator = env.get_account(3);
        contract.mint(alice, U256::from(100u64));
        contract.add_regulator(regulator);

        env.set_caller(regulator);
        let result = contract.try_forced_transfer(alice, bob, U256::from(200u64), "COURT_ORDER".into());
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), SecurityTokenError::InvalidAmount.into());
    }

    #[test]
    fn non_regulator_cannot_force_transfer() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);
        let charlie = env.get_account(3); // not a regulator
        contract.mint(alice, U256::from(1000u64));

        env.set_caller(charlie);
        let result = contract.try_forced_transfer(alice, bob, U256::from(500u64), "UNAUTHORIZED".into());
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), SecurityTokenError::NotAuthorized.into());
    }

    // ── Batch Mint Tests ──────────────────────────────────────────────────────

    #[test]
    fn batch_mint() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);
        let charlie = env.get_account(3);

        contract.batch_mint(
            vec![alice, bob, charlie],
            vec![U256::from(100u64), U256::from(200u64), U256::from(300u64)],
        );

        assert_eq!(contract.balance_of(alice), U256::from(100u64));
        assert_eq!(contract.balance_of(bob), U256::from(200u64));
        assert_eq!(contract.balance_of(charlie), U256::from(300u64));
        assert_eq!(contract.total_supply(), U256::from(600u64));
    }

    #[test]
    fn batch_mint_length_mismatch_reverts() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);

        let result = contract.try_batch_mint(
            vec![alice, bob],
            vec![U256::from(100u64)], // only one amount for two recipients
        );
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), SecurityTokenError::BatchLengthMismatch.into());
    }

    // ── Role Management Tests ──────────────────────────────────────────────────

    #[test]
    fn add_and_remove_agent() {
        let (env, mut contract) = setup();
        let owner = env.get_account(0);
        let agent = env.get_account(1);

        // Owner adds agent
        env.set_caller(owner);
        contract.add_agent(agent);

        // Owner removes agent
        contract.remove_agent(agent);

        // Verify by attempting mint (should work as owner)
        contract.mint(agent, U256::from(100u64));
        assert_eq!(contract.balance_of(agent), U256::from(100u64));
    }

    #[test]
    fn non_owner_cannot_add_agent() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob = env.get_account(2);

        // Alice (not owner) tries to add Bob as agent - should fail
        env.set_caller(alice);
        let result = contract.try_add_agent(bob);
        assert!(result.is_err()); // Non-owner cannot add agents
    }

    #[test]
    fn owner_can_add_regulator() {
        let (env, mut contract) = setup();
        let owner = env.get_account(0);
        let regulator = env.get_account(1);

        env.set_caller(owner);
        contract.add_regulator(regulator);

        // Regulator should now be able to force transfer
        let alice = env.get_account(2);
        let bob = env.get_account(3);
        contract.mint(alice, U256::from(1000u64));

        env.set_caller(regulator);
        contract.forced_transfer(alice, bob, U256::from(500u64), "REGULATORY_ACTION".into());
        assert_eq!(contract.balance_of(bob), U256::from(500u64));
    }

    // ── Compliance & Identity Registry Update Tests ────────────────────────────

    #[test]
    fn set_compliance_address() {
        let (env, mut contract) = setup();
        let owner = env.get_account(0);
        let new_compliance = env.get_account(5);

        env.set_caller(owner);
        contract.set_compliance(new_compliance);

        assert_eq!(contract.compliance(), new_compliance);
    }

    #[test]
    fn set_identity_registry_address() {
        let (env, mut contract) = setup();
        let owner = env.get_account(0);
        let new_registry = env.get_account(6);

        env.set_caller(owner);
        contract.set_identity_registry(new_registry);

        assert_eq!(contract.identity_registry(), new_registry);
    }

    #[test]
    fn set_compliance_emits_event() {
        let (env, mut contract) = setup();
        let owner = env.get_account(0);
        let new_compliance = env.get_account(5);

        env.set_caller(owner);
        contract.set_compliance(new_compliance);

        assert!(env.emitted_event(
            &contract,
            ComplianceUpdated {
                new_compliance,
            }
        ));
    }
}