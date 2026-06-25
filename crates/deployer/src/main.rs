//! # Deployment Script — Casper RWA Suite (Livenet)
//!
//! Deploys the full ERC-3643 security token stack to Casper Testnet in order:
//!
//!   1. ClaimTopicsRegistry   — define required KYC/AML claim topics
//!   2. TrustedIssuersRegistry — register KYC providers
//!   3. IdentityRegistry      — cross-references 1 & 2
//!   4. Compliance            — references 3; sets jurisdictional rules
//!   5. SecurityToken        — references 3 & 4; the tradeable token
//!
//! Run with:
//!   cargo run --package deployer --features livenet
//!
//! Set environment variables:
//!   ODRA_CASPER_LIVENET_SECRET_KEY_PATH=./keys/secret_key.pem
//!   ODRA_CASPER_LIVENET_NODE_ADDRESS=https://node.testnet.cspr.cloud
//!   ODRA_CASPER_LIVENET_CHAIN_NAME=casper-test
//!   ODRA_CASPER_LIVENET_EVENTS_URL=https://node.testnet.cspr.cloud/events

use claim_topics_registry::{ClaimTopicsRegistry, ClaimTopicsRegistryInitArgs, TOPIC_KYC, TOPIC_AML};
use trusted_issuers_registry::{TrustedIssuersRegistry, TrustedIssuersRegistryInitArgs};
use identity_registry::{IdentityRegistry, IdentityRegistryInitArgs};
use compliance::{Compliance, ComplianceInitArgs};
use security_token::{SecurityToken, SecurityTokenInitArgs};

use odra::host::Deployer;
use odra::prelude::Addressable;

fn main() {
    let env = odra_casper_livenet_env::env();
    let operator = env.caller();

    println!("=== Casper RWA Suite Deployment ===");
    println!("Operator: {:?}", operator);
    println!("Network:  Casper Testnet");
    println!();

    // ── 1. Claim Topics Registry ─────────────────────────────────────────────
    println!("[1/5] Deploying ClaimTopicsRegistry...");
    env.set_gas(10_000_000_000u64);
    let mut claim_topics = ClaimTopicsRegistry::deploy(
        &env,
        ClaimTopicsRegistryInitArgs { owner: operator },
    );
    env.set_gas(2_000_000_000u64);
    claim_topics.add_claim_topic(TOPIC_KYC);  // 1
    claim_topics.add_claim_topic(TOPIC_AML);   // 2
    println!("    ✓ ClaimTopicsRegistry: {:?}", claim_topics.address());

    // ── 2. Trusted Issuers Registry ──────────────────────────────────────────
    println!("[2/5] Deploying TrustedIssuersRegistry...");
    env.set_gas(10_000_000_000u64);
    let trusted_issuers = TrustedIssuersRegistry::deploy(
        &env,
        TrustedIssuersRegistryInitArgs { owner: operator },
    );
    println!("    ✓ TrustedIssuersRegistry: {:?}", trusted_issuers.address());

    // ── 3. Identity Registry ─────────────────────────────────────────────────
    println!("[3/5] Deploying IdentityRegistry...");
    env.set_gas(20_000_000_000u64);
    let identity_registry = IdentityRegistry::deploy(
        &env,
        IdentityRegistryInitArgs {
            owner:             operator,
            issuers_registry:  trusted_issuers.address().clone(),
            topics_registry:   claim_topics.address().clone(),
        },
    );
    println!("    ✓ IdentityRegistry: {:?}", identity_registry.address());

    // ── 4. Compliance ─────────────────────────────────────────────────────────
    println!("[4/5] Deploying Compliance...");
    env.set_gas(20_000_000_000u64);
    let mut compliance = Compliance::deploy(
        &env,
        ComplianceInitArgs {
            owner:             operator,
            identity_registry: identity_registry.address().clone(),
            min_holding_period: 0,
            max_investors:     2_000,
            required_topics:   "1,2".into(),
        },
    );
    // Block high-risk jurisdictions
    env.set_gas(1_000_000_000u64);
    compliance.block_country("KP".into());
    compliance.block_country("IR".into());
    compliance.block_country("MM".into());

    // Allow key markets
    let allowed = ["NG", "GH", "KE", "ZA", "GB", "AE", "US", "SG", "DE", "FR"];
    for country in allowed.iter() {
        env.set_gas(1_000_000_000u64);
        compliance.allow_country(country.to_string());
    }
    println!("    ✓ Compliance: {:?}", compliance.address());

    // ── 5. Security Token ─────────────────────────────────────────────────────
    println!("[5/5] Deploying SecurityToken...");
    env.set_gas(30_000_000_000u64);
    let security_token = SecurityToken::deploy(
        &env,
        SecurityTokenInitArgs {
            owner:             operator,
            name:              "Nigeria VC Fund I Security Token".into(),
            symbol:            "NGVC1-SEC".into(),
            decimals:          6,
            compliance:        compliance.address().clone(),
            identity_registry: identity_registry.address().clone(),
        },
    );
    println!("    ✓ SecurityToken: {:?}", security_token.address());

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
    println!("════════════════════════════════════════════════");
    println!();
    println!("Next steps:");
    println!("  1. Register your KYC provider in TrustedIssuersRegistry");
    println!("  2. Add identity agents to IdentityRegistry");
    println!("  3. Onboard investors: register_identity + add_claim");
    println!("  4. Mint tokens via SecurityToken.mint()");
}
