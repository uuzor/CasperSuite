#!/usr/bin/env rust-script
//! # Deployment Script — Casper RWA Suite
//!
//! Deploys the full ERC-3643 security token stack to Casper Network in order:
//!
//!   1. ClaimTopicsRegistry   — define required KYC/AML/jurisdiction claim topics
//!   2. TrustedIssuersRegistry — register KYC providers (Sumsub, Jumio, etc.)
//!   3. IdentityRegistry      — cross-references 1 & 2
//!   4. Compliance            — references 3; sets jurisdictional rules
//!   5. SecurityToken         — references 3 & 4; the tradeable token
//!   6. FundToken             — references 3 & 4; the PE/VC LP share token
//!   7. Governance            — references 6; CSPR.fans-compatible voting
//!
//! Run with:
//!   cargo odra run --network testnet --script scripts/deploy.rs
//!
//! Set CASPER_SECRET_KEY env var to your operator key path.

use claim_topics_registry::{ClaimTopicsRegistryHostRef, TOPIC_KYC, TOPIC_AML,
                             TOPIC_ACCREDITATION, TOPIC_JURISDICTION};
use trusted_issuers_registry::TrustedIssuersRegistryHostRef;
use identity_registry::IdentityRegistryHostRef;
use compliance::ComplianceHostRef;
use security_token::SecurityTokenHostRef;
use fund_token::FundTokenHostRef;
use governance::GovernanceHostRef;

use odra::host::{Deployer, HostEnv};
use odra_casper_livenet_env::env;

fn main() {
    let env: HostEnv = env();
    let operator = env.get_account(0);

    println!("=== Casper RWA Suite Deployment ===");
    println!("Operator: {:?}", operator);
    println!("Network:  Casper Testnet");
    println!();

    // ── 1. Claim Topics Registry ─────────────────────────────────────────────
    println!("[1/7] Deploying ClaimTopicsRegistry...");
    env.set_gas(10_000_000_000u64);
    let mut claim_topics = ClaimTopicsRegistryHostRef::deploy(
        &env,
        claim_topics_registry::ClaimTopicsRegistryInitArgs { owner: operator },
    );
    env.set_gas(2_000_000_000u64);
    claim_topics.add_claim_topic(TOPIC_KYC);           // 1
    claim_topics.add_claim_topic(TOPIC_AML);           // 2
    claim_topics.add_claim_topic(TOPIC_ACCREDITATION); // 3
    claim_topics.add_claim_topic(TOPIC_JURISDICTION);  // 4
    println!("    ✓ ClaimTopicsRegistry: {:?}", claim_topics.address());

    // ── 2. Trusted Issuers Registry ──────────────────────────────────────────
    println!("[2/7] Deploying TrustedIssuersRegistry...");
    env.set_gas(10_000_000_000u64);
    let mut trusted_issuers = TrustedIssuersRegistryHostRef::deploy(
        &env,
        trusted_issuers_registry::TrustedIssuersRegistryInitArgs { owner: operator },
    );
    // TODO: Register your KYC provider(s) here:
    //   env.set_gas(2_000_000_000u64);
    //   trusted_issuers.add_trusted_issuer(SUMSUB_ADDRESS, vec![1, 2, 3, 4]);
    println!("    ✓ TrustedIssuersRegistry: {:?}", trusted_issuers.address());

    // ── 3. Identity Registry ─────────────────────────────────────────────────
    println!("[3/7] Deploying IdentityRegistry...");
    env.set_gas(20_000_000_000u64);
    let mut identity_registry = IdentityRegistryHostRef::deploy(
        &env,
        identity_registry::IdentityRegistryInitArgs {
            owner:             operator,
            issuers_registry:  *trusted_issuers.address(),
            topics_registry:   *claim_topics.address(),
        },
    );
    println!("    ✓ IdentityRegistry: {:?}", identity_registry.address());

    // ── 4. Compliance ─────────────────────────────────────────────────────────
    println!("[4/7] Deploying Compliance...");
    env.set_gas(20_000_000_000u64);
    let mut compliance = ComplianceHostRef::deploy(
        &env,
        compliance::ComplianceInitArgs {
            owner:             operator,
            identity_registry: *identity_registry.address(),
            min_holding_period: 0,        // no lock-up for testnet; set 180*86400 for production
            max_investors:     2_000,     // SEC Reg D 506(b) limit
            required_topics:   "1,2".into(), // KYC + AML required for all transfers
        },
    );
    // Block high-risk jurisdictions (FATF grey/black list examples)
    env.set_gas(1_000_000_000u64);
    compliance.block_country("KP".into()); // North Korea
    compliance.block_country("IR".into()); // Iran
    compliance.block_country("MM".into()); // Myanmar
    compliance.block_country("RU".into()); // Russia (OFAC)

    // Allow EMEA + key markets
    let allowed = ["NG", "GH", "KE", "ZA", "GB", "AE", "US", "SG", "DE", "FR"];
    for country in allowed.iter() {
        env.set_gas(1_000_000_000u64);
        compliance.allow_country(country.to_string());
    }
    println!("    ✓ Compliance: {:?}", compliance.address());

    // ── 5. Security Token ─────────────────────────────────────────────────────
    println!("[5/7] Deploying SecurityToken...");
    env.set_gas(30_000_000_000u64);
    let security_token = SecurityTokenHostRef::deploy(
        &env,
        security_token::SecurityTokenInitArgs {
            owner:             operator,
            name:              "Nigeria VC Fund I Security Token".into(),
            symbol:            "NGVC1-SEC".into(),
            decimals:          6,
            compliance:        *compliance.address(),
            identity_registry: *identity_registry.address(),
        },
    );
    println!("    ✓ SecurityToken: {:?}", security_token.address());

    // ── 6. Fund Token ─────────────────────────────────────────────────────────
    println!("[6/7] Deploying FundToken (LP shares)...");
    env.set_gas(40_000_000_000u64);
    let fund_token = FundTokenHostRef::deploy(
        &env,
        fund_token::FundTokenInitArgs {
            owner:             operator,
            name:              "Nigeria VC Fund I LP Token".into(),
            symbol:            "NGVC1".into(),
            fund_name:         "Nigeria VC Fund I".into(),
            fund_manager:      "Acme Capital Partners".into(),
            vintage_year:      2026,
            strategy:          "VENTURE".into(),
            compliance:        *compliance.address(),
            identity_registry: *identity_registry.address(),
        },
    );
    println!("    ✓ FundToken: {:?}", fund_token.address());

    // ── 7. Governance ─────────────────────────────────────────────────────────
    println!("[7/7] Deploying Governance (CSPR.fans compatible)...");
    env.set_gas(30_000_000_000u64);
    let governance = GovernanceHostRef::deploy(
        &env,
        governance::GovernanceInitArgs {
            owner:              operator,
            fund_token:         *fund_token.address(),
            quorum_bps:         1000,                    // 10% of token supply
            proposal_threshold: odra::U256::from(100u64), // need 100 LP tokens to propose
        },
    );
    println!("    ✓ Governance: {:?}", governance.address());

    // ── Summary ───────────────────────────────────────────────────────────────
    println!();
    println!("════════════════════════════════════════════════");
    println!("  Casper RWA Suite — Deployment Complete");
    println!("════════════════════════════════════════════════");
    println!("  ClaimTopicsRegistry:     {:?}", claim_topics.address());
    println!("  TrustedIssuersRegistry:  {:?}", trusted_issuers.address());
    println!("  IdentityRegistry:        {:?}", identity_registry.address());
    println!("  Compliance:              {:?}", compliance.address());
    println!("  SecurityToken:           {:?}", security_token.address());
    println!("  FundToken (LP):          {:?}", fund_token.address());
    println!("  Governance:              {:?}", governance.address());
    println!("════════════════════════════════════════════════");
    println!();
    println!("Next steps:");
    println!("  1. Register your KYC provider in TrustedIssuersRegistry");
    println!("  2. Add identity agents to IdentityRegistry");
    println!("  3. Onboard investors: register_identity + add_claim");
    println!("  4. Post initial NAV via FundToken.post_nav()");
    println!("  5. Open subscriptions — investors call FundToken.subscribe()");
    println!("  6. Point CSPR.fans to Governance contract for community voting");
}