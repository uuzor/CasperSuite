# Agentic RWA Fund — Casper + Base + Dinari

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           User (Casper)                                  │
│                    deposit CEP-18 stablecoin                            │
│                    request/redeem fund shares                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      Fund.rs (Casper / Odra)                           │
│  - Mints/burns "fund shares" at NAV                                    │
│  - request/fulfill redemption (T+0-3d settlement)                      │
│  - Stores NAV reported by agent via report_nav()                        │
│  - Tracks asset composition snapshots                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    ▲
                                    │ set_nav() / report_nav()
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                    LangChain Agent (off-chain)                          │
│  - KYC'd wallet holds real dShares + USDC on Base                      │
│  - Fetches Dinari API for prices + balances                             │
│  - Calculates NAV: Σ(holdings × prices)                                │
│  - Pushes NAV to Casper Fund                                            │
│  - Reports to Base AgentPortfolioReporter                               │
│  - Executes Dinari buy/sell orders via API                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              AgentPortfolioReporter.sol (Base)                          │
│  - NO token custody (contracts can't hold dShares due to KYC)          │
│  - Agent reports: holdings[], usdcBalance, prices[]                    │
│  - totalValueUsdScaled() = reported portfolio value                     │
│  - Price oracle for off-chain consumption                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          Dinari API                                     │
│  - dTSLA, dNVDA, dAAPL pricing                                         │
│  - Buy/sell order execution                                             │
│  - Account balance queries                                              │
└─────────────────────────────────────────────────────────────────────────┘
```

## Why the agent holds assets

Dinari dShares (dTSLA, dNVDA, dAAPL) have **KYC transfer restrictions**.
A contract cannot be KYC'd, so it **cannot receive these tokens directly**.

The agent's KYC'd wallet is the only compliant holder:
1. Agent holds USDC + dShares in its own wallet
2. Agent fetches prices from Dinari API
3. Agent reports holdings + prices to on-chain contracts
4. Agent pushes NAV to Casper Fund

## Components

### 1. Casper Fund (`modules/fund/`)
- Odra/Rust smart contract compiled to WASM
- Deposit/redeem flow with NAV-gated minting
- `report_nav()` entrypoint for agent

### 2. Base AgentPortfolioReporter (`treasury/contracts/Treasury.sol`)
- Solidity contract (for reference, deploy separately)
- Tracks agent-reported holdings and prices
- Computes portfolio value on-chain

### 3. LangChain Agent (`agent/`)
- Node.js application
- Tools for Dinari API, Base, Casper interaction
- NAV calculation and reporting workflow
- Interactive agent mode with OpenAI LLM

## Setup

```bash
# 1. Deploy contracts
# - Deploy AgentPortfolioReporter to Base
# - Deploy Fund to Casper

# 2. Configure agent
cd agent
cp .env.example .env
# Edit .env with your keys

# 3. Run agent
npm install
npm run nav-update   # Run NAV update cycle
npm run agent        # Interactive agent mode
```

## Environment Variables

```env
OPENAI_API_KEY=sk-...           # OpenAI for agent
DINARI_API_KEY=...               # Dinari API key
AGENT_PRIVATE_KEY=0x...          # KYC'd wallet key
BASE_RPC_URL=https://mainnet.base.org
AGENT_PORTFOLIO_REPORTER_ADDRESS=0x...  # On Base
CASPER_RPC_URL=https://rpc.mainnet.casperlabs.io
FUND_CONTRACT_HASH=...           # On Casper
```

## What's real vs. what's still a gap

**Real in this v1:**
- Casper `Fund` contract: full deposit → mint shares → request/fulfill
  redeem flow, oracle-gated NAV, no mocked functions.
- Base `AgentPortfolioReporter` contract: agent reports holdings, price
  oracle, NAV calculation.
- LangChain Agent: Dinari API integration, NAV calculation, reporting.

**Explicit v1 gaps (documented, not hidden):**
- **Casper ⇄ Base cash movement** (getting the deposited stablecoin from
  Casper into Base USDC, and payouts back) isn't built — that's a real
  operational bridge/off-ramp problem in its own right, and out of scope
  for what was asked here. For the qualification round, this can plausibly
  be simulated/manual.
- **Payment token on Casper is a placeholder CEP-18**, not real USDC —
  confirm Casper's actual native USDC (if/when one exists) before using
  this beyond a demo.
- **Agent key custody**: the agent's private key is a genuine, meaningful
  trust assumption (it holds the actual dShares). Fine for a hackathon
  demo; needs a real answer (multisig, threshold signing) before any
  real money touches this.
