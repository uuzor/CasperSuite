# Casper RWA Suite - Deployment Guide

## Prerequisites

1. **CSPR tokens** on Casper Testnet for gas fees
2. **Secret key** at `./keys/secret_key.pem`
3. **WASM files** already built (in `wasm/` directory)

## Environment Setup

```bash
export ODRA_CASPER_LIVENET_SECRET_KEY_PATH=./keys/secret_key.pem
export ODRA_CASPER_LIVENET_NODE_ADDRESS=https://node.testnet.cspr.cloud
export ODRA_CASPER_LIVENET_CHAIN_NAME=casper-test
export ODRA_CASPER_LIVENET_EVENTS_URL=https://node.testnet.cspr.cloud/events
```

## Build & Deploy

```bash
cd /workspace/project/CasperSuite

# Build deployer
cargo build --release --package deployer --features livenet

# Run deployment
cargo run --release --package deployer --features livenet
```

## Deployed Contracts

| Order | Contract | Purpose |
|-------|----------|---------|
| 1 | ClaimTopicsRegistry | KYC/AML claim topics |
| 2 | TrustedIssuersRegistry | KYC providers |
| 3 | IdentityRegistry | Investor identity |
| 4 | Compliance | Jurisdiction rules |
| 5 | SecurityToken | Tradeable security token |

## Post-Deployment

After deployment, the contract addresses will be logged. Configure your frontend/application to use these addresses for cross-contract interactions.
