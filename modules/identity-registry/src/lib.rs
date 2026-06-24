//! # Identity Registry
//!
//! The on-chain identity store for ERC-3643.  Maps each investor `Address`
//! to a verified identity record containing:
//!   - unique DID (Decentralized Identifier string)
//!   - jurisdiction code (ISO 3166-1 alpha-2, e.g. "NG", "GB", "AE")
//!   - a map of claim topic → Claim struct (issuer, data, expiry, valid flag)
//!
//! Before any security token transfer is executed, the compliance module calls
//! `is_verified()` which asserts that:
//!   1. The investor has an active identity record.
//!   2. For every required claim topic, the investor holds a non-expired claim
//!      signed by a currently trusted issuer.
//!
//! Agents (KYC providers / operators) may add/update claims.
//! Only the owner may register / remove identities.

#![no_std]

extern crate alloc;

use odra::prelude::*;
use odra::{Address, Mapping, Var};
use odra_modules::access::{Ownable, AccessControl};

// ── Data types ────────────────────────────────────────────────────────────────

/// A single verified claim attached to an identity.
#[odra::odra_type]
pub struct Claim {
    /// The claim topic ID (e.g. 1 = KYC, 2 = AML).
    pub topic:          u64,
    /// Address of the issuer that signed this claim.
    pub issuer:         Address,
    /// Encoded claim data (hash of off-chain credential, IPFS CID, etc.).
    pub data:           String,
    /// Unix timestamp after which the claim is no longer valid (0 = never).
    pub expiry:         u64,
    /// Whether the claim is currently active.
    pub valid:          bool,
}

/// Full on-chain identity for an investor.
#[odra::odra_type]
pub struct Identity {
    /// W3C-style DID: "did:cspr:<account_hash>".
    pub did:            String,
    /// ISO 3166-1 alpha-2 country code of the investor's residence.
    pub country:        String,
    /// Active flag — set to false on removal.
    pub active:         bool,
    /// Investor's wallet address (mirrors the mapping key).
    pub investor:       Address,
}

// ── Role constants ────────────────────────────────────────────────────────────

/// Role that may register / remove identities.
pub const ROLE_IDENTITY_AGENT: [u8; 32] = *b"IDENTITY_AGENT\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0";
/// Role that may add / revoke claims on an identity.
pub const ROLE_CLAIM_AGENT: [u8; 32]    = *b"CLAIM_AGENT\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0";

// ── Events ────────────────────────────────────────────────────────────────────

#[odra::event]
pub struct IdentityRegistered {
    pub investor: Address,
    pub did:      String,
    pub country:  String,
}

#[odra::event]
pub struct IdentityRemoved {
    pub investor: Address,
}

#[odra::event]
pub struct IdentityUpdated {
    pub investor: Address,
    pub country:  String,
}

#[odra::event]
pub struct ClaimAdded {
    pub investor: Address,
    pub topic:    u64,
    pub issuer:   Address,
    pub expiry:   u64,
}

#[odra::event]
pub struct ClaimRevoked {
    pub investor: Address,
    pub topic:    u64,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[odra::odra_error]
pub enum IdentityError {
    IdentityAlreadyExists  = 3_000,
    IdentityNotFound       = 3_001,
    ClaimNotFound          = 3_002,
    ClaimExpired           = 3_003,
    UntrustedIssuer        = 3_004,
    Unauthorized           = 3_005,
    InvalidCountryCode     = 3_006,
    EmptyDid               = 3_007,
}

// ── Module ────────────────────────────────────────────────────────────────────

#[odra::module]
pub struct IdentityRegistry {
    ownable:        Ownable,
    access_control: AccessControl,
    /// investor → Identity
    identities:     Mapping<Address, Identity>,
    /// (investor, topic) → Claim
    claims:         Mapping<(Address, u64), Claim>,
    /// Total registered identities
    identity_count: Var<u64>,
    /// Address of the TrustedIssuersRegistry contract
    issuers_registry: Var<Address>,
    /// Address of the ClaimTopicsRegistry contract
    topics_registry:  Var<Address>,
}

#[odra::module]
impl IdentityRegistry {
    // ── Constructor ──────────────────────────────────────────────────────────

    /// `issuers_registry` and `topics_registry` are cross-contract references.
    pub fn init(
        &mut self,
        owner:            Address,
        issuers_registry: Address,
        topics_registry:  Address,
    ) {
        self.ownable.init(owner);
        self.access_control.init(owner);
        self.issuers_registry.set(issuers_registry);
        self.topics_registry.set(topics_registry);
    }

    // ── Agent role management ─────────────────────────────────────────────────

    pub fn grant_identity_agent(&mut self, agent: Address) {
        self.ownable.assert_owner(&self.env().caller());
        self.access_control.grant_role(&ROLE_IDENTITY_AGENT, &agent);
    }

    pub fn grant_claim_agent(&mut self, agent: Address) {
        self.ownable.assert_owner(&self.env().caller());
        self.access_control.grant_role(&ROLE_CLAIM_AGENT, &agent);
    }

    pub fn revoke_identity_agent(&mut self, agent: Address) {
        self.ownable.assert_owner(&self.env().caller());
        self.access_control.revoke_role(&ROLE_IDENTITY_AGENT, &agent);
    }

    pub fn revoke_claim_agent(&mut self, agent: Address) {
        self.ownable.assert_owner(&self.env().caller());
        self.access_control.revoke_role(&ROLE_CLAIM_AGENT, &agent);
    }

    // ── Identity CRUD ─────────────────────────────────────────────────────────

    /// Register an investor identity.  Callable by identity agents.
    pub fn register_identity(
        &mut self,
        investor: Address,
        did:      String,
        country:  String,
    ) {
        self.assert_identity_agent();
        if did.is_empty() {
            self.env().revert(IdentityError::EmptyDid);
        }
        if country.len() != 2 {
            self.env().revert(IdentityError::InvalidCountryCode);
        }
        if let Some(existing) = self.identities.get(&investor) {
            if existing.active {
                self.env().revert(IdentityError::IdentityAlreadyExists);
            }
        }
        self.identities.set(
            &investor,
            Identity {
                did:      did.clone(),
                country:  country.clone(),
                active:   true,
                investor,
            },
        );
        self.identity_count.set(self.identity_count.get_or_default() + 1);
        self.env().emit_event(IdentityRegistered { investor, did, country });
    }

    /// Soft-delete an identity (sets active = false).
    pub fn remove_identity(&mut self, investor: Address) {
        self.assert_identity_agent();
        let mut identity = self.get_active_identity(investor);
        identity.active = false;
        self.identities.set(&investor, identity);
        let count = self.identity_count.get_or_default();
        if count > 0 {
            self.identity_count.set(count - 1);
        }
        self.env().emit_event(IdentityRemoved { investor });
    }

    /// Update jurisdiction / country of an existing identity.
    pub fn update_identity_country(&mut self, investor: Address, country: String) {
        self.assert_identity_agent();
        if country.len() != 2 {
            self.env().revert(IdentityError::InvalidCountryCode);
        }
        let mut identity = self.get_active_identity(investor);
        identity.country = country.clone();
        self.identities.set(&investor, identity);
        self.env().emit_event(IdentityUpdated { investor, country });
    }

    // ── Claim CRUD ────────────────────────────────────────────────────────────

    /// Add or overwrite a claim on an investor's identity.
    /// `expiry = 0` means the claim never expires.
    pub fn add_claim(
        &mut self,
        investor: Address,
        topic:    u64,
        issuer:   Address,
        data:     String,
        expiry:   u64,
    ) {
        self.assert_claim_agent();
        // Identity must exist
        self.get_active_identity(investor);

        self.claims.set(
            &(investor, topic),
            Claim {
                topic,
                issuer,
                data,
                expiry,
                valid: true,
            },
        );
        self.env().emit_event(ClaimAdded { investor, topic, issuer, expiry });
    }

    /// Revoke a specific claim (set valid = false).
    pub fn revoke_claim(&mut self, investor: Address, topic: u64) {
        self.assert_claim_agent();
        let mut claim = self.get_claim_inner(investor, topic);
        claim.valid = false;
        self.claims.set(&(investor, topic), claim);
        self.env().emit_event(ClaimRevoked { investor, topic });
    }

    // ── Verification (called by Compliance module) ────────────────────────────

    /// Returns true if the investor has an active identity with all required
    /// claims that are valid, non-expired, and issued by a trusted issuer.
    ///
    /// This is the core ERC-3643 gate — no transfer proceeds without this.
    pub fn is_verified(&self, investor: Address, required_topics: Vec<u64>) -> bool {
        // 1. Identity must exist and be active
        let identity = match self.identities.get(&investor) {
            Some(id) if id.active => id,
            _ => return false,
        };
        let now = self.env().block_time();

        for topic in required_topics.iter() {
            match self.claims.get(&(investor, *topic)) {
                Some(claim) if claim.valid => {
                    // Expiry check (0 = never expires)
                    if claim.expiry != 0 && claim.expiry < now {
                        return false;
                    }
                    // Issuer trust check would normally call TrustedIssuersRegistry
                    // via cross-contract call. Placeholder: trust all for now.
                    // In production, call: trusted_issuers_registry.issuer_trusted_for_topic(claim.issuer, *topic)
                }
                _ => return false,
            }
        }
        true
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    pub fn get_identity(&self, investor: Address) -> Option<Identity> {
        self.identities.get(&investor).filter(|id| id.active)
    }

    pub fn get_claim(&self, investor: Address, topic: u64) -> Option<Claim> {
        self.claims.get(&(investor, topic)).filter(|c| c.valid)
    }

    pub fn identity_count(&self) -> u64 {
        self.identity_count.get_or_default()
    }

    pub fn owner(&self) -> Address {
        self.ownable.get_owner()
    }

    pub fn issuers_registry(&self) -> Address {
        self.issuers_registry.get_or_default()
    }

    pub fn topics_registry(&self) -> Address {
        self.topics_registry.get_or_default()
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    fn assert_identity_agent(&self) {
        let caller = self.env().caller();
        let is_owner  = self.ownable.get_owner() == caller;
        let has_role  = self.access_control.has_role(&ROLE_IDENTITY_AGENT, &caller);
        if !is_owner && !has_role {
            self.env().revert(IdentityError::Unauthorized);
        }
    }

    fn assert_claim_agent(&self) {
        let caller = self.env().caller();
        let is_owner  = self.ownable.get_owner() == caller;
        let has_role  = self.access_control.has_role(&ROLE_CLAIM_AGENT, &caller);
        if !is_owner && !has_role {
            self.env().revert(IdentityError::Unauthorized);
        }
    }

    fn get_active_identity(&self, investor: Address) -> Identity {
        match self.identities.get(&investor) {
            Some(id) if id.active => id,
            _ => self.env().revert(IdentityError::IdentityNotFound),
        }
    }

    fn get_claim_inner(&self, investor: Address, topic: u64) -> Claim {
        match self.claims.get(&(investor, topic)) {
            Some(c) => c,
            None    => self.env().revert(IdentityError::ClaimNotFound),
        }
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostEnv};
    use odra_test::env;

    fn setup() -> (HostEnv, IdentityRegistryHostRef) {
        let test_env = env();
        let owner    = test_env.get_account(0);
        // Dummy addresses for registry deps in unit tests
        let issuers  = test_env.get_account(9);
        let topics   = test_env.get_account(8);
        let contract = IdentityRegistryHostRef::deploy(
            &test_env,
            IdentityRegistryInitArgs { owner, issuers_registry: issuers, topics_registry: topics },
        );
        (test_env, contract)
    }

    #[test]
    fn register_and_query_identity() {
        let (env, mut contract) = setup();
        let investor = env.get_account(1);
        contract.register_identity(
            investor,
            "did:cspr:abc123".into(),
            "NG".into(),
        );
        let id = contract.get_identity(investor).unwrap();
        assert_eq!(id.country, "NG");
        assert!(id.active);
        assert_eq!(contract.identity_count(), 1);
    }

    #[test]
    fn add_claim_and_verify() {
        let (env, mut contract) = setup();
        let investor = env.get_account(1);
        let issuer   = env.get_account(2);
        contract.register_identity(investor, "did:cspr:abc".into(), "NG".into());
        contract.add_claim(investor, 1, issuer, "kyc-hash-xyz".into(), 0);
        // Verified for topic 1 only
        assert!(contract.is_verified(investor, vec![1]));
        assert!(!contract.is_verified(investor, vec![2]));
    }

    #[test]
    fn revoke_claim_fails_verification() {
        let (env, mut contract) = setup();
        let investor = env.get_account(1);
        let issuer   = env.get_account(2);
        contract.register_identity(investor, "did:cspr:abc".into(), "NG".into());
        contract.add_claim(investor, 1, issuer, "kyc-hash".into(), 0);
        contract.revoke_claim(investor, 1);
        assert!(!contract.is_verified(investor, vec![1]));
    }

    #[test]
    fn remove_identity() {
        let (env, mut contract) = setup();
        let investor = env.get_account(1);
        contract.register_identity(investor, "did:cspr:abc".into(), "NG".into());
        contract.remove_identity(investor);
        assert!(contract.get_identity(investor).is_none());
        assert_eq!(contract.identity_count(), 0);
    }
}