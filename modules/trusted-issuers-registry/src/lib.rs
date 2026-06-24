//! # Trusted Issuers Registry
//!
//! Stores the set of identity claim issuers (KYC/AML providers) that this
//! platform trusts.  Each issuer is recorded with:
//!   - their on-chain `Address`
//!   - the set of claim topics they are authorised to issue
//!
//! ERC-3643 §4.3 — Only claims signed by a trusted issuer for the relevant
//! topic are valid during a transfer compliance check.
//!
//! Typical issuers: Jumio, Sumsub, ComplyCube, Stobox, in-house KYC portal.

#![no_std]

extern crate alloc;

use odra::prelude::*;
use odra::{Address, Mapping, Var};
use odra_modules::access::Ownable;

// ── Data types ────────────────────────────────────────────────────────────────

/// Maximum topics a single issuer can be trusted for.
const MAX_TOPICS_PER_ISSUER: usize = 16;

/// On-chain record for each trusted issuer.
#[odra::odra_type]
pub struct TrustedIssuer {
    pub issuer_address: Address,
    /// Compact list of claim topic IDs this issuer may sign.
    pub claim_topics:   Vec<u64>,
    pub active:         bool,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[odra::event]
pub struct IssuerAdded {
    pub issuer:       Address,
    pub claim_topics: Vec<u64>,
}

#[odra::event]
pub struct IssuerRemoved {
    pub issuer: Address,
}

#[odra::event]
pub struct IssuerTopicsUpdated {
    pub issuer:       Address,
    pub claim_topics: Vec<u64>,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[odra::odra_error]
pub enum TrustedIssuersError {
    IssuerAlreadyExists    = 2_000,
    IssuerNotFound         = 2_001,
    TooManyTopics          = 2_002,
    EmptyTopicList         = 2_003,
    NotOwner               = 2_004,
}

// ── Module ────────────────────────────────────────────────────────────────────

#[odra::module]
pub struct TrustedIssuersRegistry {
    ownable:      Ownable,
    /// issuer_address → TrustedIssuer record
    issuers:      Mapping<Address, TrustedIssuer>,
    issuer_count: Var<u64>,
}

#[odra::module]
impl TrustedIssuersRegistry {
    // ── Constructor ──────────────────────────────────────────────────────────

    pub fn init(&mut self, owner: Address) {
        self.ownable.init(owner);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    /// Register a new trusted issuer with an initial set of claim topics.
    pub fn add_trusted_issuer(&mut self, issuer: Address, claim_topics: Vec<u64>) {
        self.ownable.assert_owner(&self.env().caller());
        self.validate_topics(&claim_topics);

        if let Some(existing) = self.issuers.get(&issuer) {
            if existing.active {
                self.env().revert(TrustedIssuersError::IssuerAlreadyExists);
            }
        }

        self.issuers.set(
            &issuer,
            TrustedIssuer {
                issuer_address: issuer,
                claim_topics:   claim_topics.clone(),
                active:         true,
            },
        );
        self.issuer_count.set(self.issuer_count.get_or_default() + 1);
        self.env().emit_event(IssuerAdded { issuer, claim_topics });
    }

    /// Deactivate an issuer (soft-delete preserves history).
    pub fn remove_trusted_issuer(&mut self, issuer: Address) {
        self.ownable.assert_owner(&self.env().caller());
        let mut record = self.get_active_issuer(issuer);
        record.active = false;
        self.issuers.set(&issuer, record);
        let count = self.issuer_count.get_or_default();
        if count > 0 {
            self.issuer_count.set(count - 1);
        }
        self.env().emit_event(IssuerRemoved { issuer });
    }

    /// Update the claim topics an existing issuer is trusted for.
    pub fn update_issuer_claim_topics(&mut self, issuer: Address, claim_topics: Vec<u64>) {
        self.ownable.assert_owner(&self.env().caller());
        self.validate_topics(&claim_topics);
        let mut record = self.get_active_issuer(issuer);
        record.claim_topics = claim_topics.clone();
        self.issuers.set(&issuer, record);
        self.env().emit_event(IssuerTopicsUpdated { issuer, claim_topics });
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /// True if the issuer is active.
    pub fn is_trusted_issuer(&self, issuer: Address) -> bool {
        self.issuers
            .get(&issuer)
            .map(|r| r.active)
            .unwrap_or(false)
    }

    /// True if `issuer` is trusted AND authorised to issue `topic`.
    pub fn issuer_trusted_for_topic(&self, issuer: Address, topic: u64) -> bool {
        self.issuers
            .get(&issuer)
            .filter(|r| r.active)
            .map(|r| r.claim_topics.contains(&topic))
            .unwrap_or(false)
    }

    /// Retrieve full issuer record.
    pub fn get_issuer(&self, issuer: Address) -> Option<TrustedIssuer> {
        self.issuers.get(&issuer).filter(|r| r.active)
    }

    pub fn issuer_count(&self) -> u64 {
        self.issuer_count.get_or_default()
    }

    pub fn owner(&self) -> Address {
        self.ownable.get_owner()
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    fn validate_topics(&self, topics: &Vec<u64>) {
        if topics.is_empty() {
            self.env().revert(TrustedIssuersError::EmptyTopicList);
        }
        if topics.len() > MAX_TOPICS_PER_ISSUER {
            self.env().revert(TrustedIssuersError::TooManyTopics);
        }
    }

    fn get_active_issuer(&self, issuer: Address) -> TrustedIssuer {
        match self.issuers.get(&issuer) {
            Some(r) if r.active => r,
            _ => self.env().revert(TrustedIssuersError::IssuerNotFound),
        }
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostEnv};
    use odra_test::env;

    fn setup() -> (HostEnv, TrustedIssuersRegistryHostRef) {
        let test_env = env();
        let owner = test_env.get_account(0);
        let contract = TrustedIssuersRegistryHostRef::deploy(
            &test_env,
            TrustedIssuersRegistryInitArgs { owner },
        );
        (test_env, contract)
    }

    #[test]
    fn add_and_query_issuer() {
        let (test_env, mut contract) = setup();
        let issuer = test_env.get_account(1);
        contract.add_trusted_issuer(issuer, vec![1, 2]);
        assert!(contract.is_trusted_issuer(issuer));
        assert!(contract.issuer_trusted_for_topic(issuer, 1));
        assert!(!contract.issuer_trusted_for_topic(issuer, 99));
    }

    #[test]
    fn remove_issuer() {
        let (test_env, mut contract) = setup();
        let issuer = test_env.get_account(1);
        contract.add_trusted_issuer(issuer, vec![1]);
        contract.remove_trusted_issuer(issuer);
        assert!(!contract.is_trusted_issuer(issuer));
    }
}