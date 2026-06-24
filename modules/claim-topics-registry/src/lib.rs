//! # Claim Topics Registry
//!
//! Maintains the set of required on-chain claim topics for ERC-3643 compliance.
//! Each topic is a u64 identifier (e.g. 1=KYC, 2=AML, 3=Accreditation, 4=Jurisdiction).
//!
//! Only the contract owner may add or remove topics.
//! Downstream compliance checks query this registry to know which claims
//! an investor's identity must carry before a transfer is permitted.

#![no_std]

extern crate alloc;

use odra::prelude::*;
use odra::{Address, Mapping, Var};
use odra_modules::access::Ownable;

// ── Events ────────────────────────────────────────────────────────────────────

#[odra::event]
pub struct ClaimTopicAdded {
    pub topic: u64,
}

#[odra::event]
pub struct ClaimTopicRemoved {
    pub topic: u64,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[odra::odra_error]
pub enum ClaimTopicsError {
    TopicAlreadyExists  = 1_000,
    TopicDoesNotExist   = 1_001,
    NotOwner            = 1_002,
}

// ── Module ────────────────────────────────────────────────────────────────────

/// Stores the set of required claim topic IDs.
/// A Mapping<u64, bool> acts as an efficient on-chain set.
#[odra::module]
pub struct ClaimTopicsRegistry {
    ownable:      Ownable,
    topics:       Mapping<u64, bool>,
    topic_count:  Var<u64>,
}

#[odra::module]
impl ClaimTopicsRegistry {
    // ── Constructor ──────────────────────────────────────────────────────────

    /// Deploy with an initial owner (typically the fund operator).
    pub fn init(&mut self, owner: Address) {
        self.ownable.init(owner);
    }

    // ── Admin: add / remove topics ───────────────────────────────────────────

    /// Add a required claim topic. Emits [`ClaimTopicAdded`].
    pub fn add_claim_topic(&mut self, topic: u64) {
        self.ownable.assert_owner(&self.env().caller());
        if self.topics.get(&topic).unwrap_or(false) {
            self.env().revert(ClaimTopicsError::TopicAlreadyExists);
        }
        self.topics.set(&topic, true);
        self.topic_count.set(self.topic_count.get_or_default() + 1);
        self.env().emit_event(ClaimTopicAdded { topic });
    }

    /// Remove a required claim topic. Emits [`ClaimTopicRemoved`].
    pub fn remove_claim_topic(&mut self, topic: u64) {
        self.ownable.assert_owner(&self.env().caller());
        if !self.topics.get(&topic).unwrap_or(false) {
            self.env().revert(ClaimTopicsError::TopicDoesNotExist);
        }
        self.topics.set(&topic, false);
        let count = self.topic_count.get_or_default();
        if count > 0 {
            self.topic_count.set(count - 1);
        }
        self.env().emit_event(ClaimTopicRemoved { topic });
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    /// Returns true when `topic` is a registered required topic.
    pub fn is_claim_topic_required(&self, topic: u64) -> bool {
        self.topics.get(&topic).unwrap_or(false)
    }

    /// Total number of active required topics.
    pub fn topic_count(&self) -> u64 {
        self.topic_count.get_or_default()
    }

    /// Convenience: owner address.
    pub fn owner(&self) -> Address {
        self.ownable.get_owner()
    }
}

// ── Standard Claim Topic IDs (conventionally used by this suite) ──────────────
/// Investor has completed KYC verification.
pub const TOPIC_KYC: u64             = 1;
/// Investor has passed AML screening.
pub const TOPIC_AML: u64             = 2;
/// Investor is an accredited / qualified investor.
pub const TOPIC_ACCREDITATION: u64   = 3;
/// Investor's home jurisdiction code (NG, GB, AE, etc.).
pub const TOPIC_JURISDICTION: u64    = 4;
/// Tax residency confirmed.
pub const TOPIC_TAX_RESIDENCY: u64   = 5;
/// Investor has signed the subscription agreement on-chain.
pub const TOPIC_SUBSCRIPTION: u64    = 6;

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostEnv};
    use odra_test::env;

    fn setup() -> (HostEnv, ClaimTopicsRegistryHostRef) {
        let test_env = env();
        let owner = test_env.get_account(0);
        let contract = ClaimTopicsRegistryHostRef::deploy(
            &test_env,
            ClaimTopicsRegistryInitArgs { owner },
        );
        (test_env, contract)
    }

    #[test]
    fn add_and_query_topic() {
        let (_env, mut contract) = setup();
        contract.add_claim_topic(TOPIC_KYC);
        assert!(contract.is_claim_topic_required(TOPIC_KYC));
        assert_eq!(contract.topic_count(), 1);
    }

    #[test]
    fn remove_topic() {
        let (_env, mut contract) = setup();
        contract.add_claim_topic(TOPIC_KYC);
        contract.remove_claim_topic(TOPIC_KYC);
        assert!(!contract.is_claim_topic_required(TOPIC_KYC));
        assert_eq!(contract.topic_count(), 0);
    }

    #[test]
    #[should_panic]
    fn duplicate_topic_reverts() {
        let (_env, mut contract) = setup();
        contract.add_claim_topic(TOPIC_KYC);
        contract.add_claim_topic(TOPIC_KYC); // should revert
    }
}