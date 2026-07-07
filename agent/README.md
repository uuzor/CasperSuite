# RWA Fund Agent

LangChain-powered agent for managing an RWA Fund that tokenizes real-world assets (dShares from Dinari).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Dinari API                               │
│  - Prices for dTSLA, dNVDA, dAAPL                        │
│  - Order execution (buy/sell)                               │
│  - Account balances                                        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    RWA Fund Agent                           │
│  - Reads Dinari API (prices, balances)                      │
│  - Reports to Base AgentPortfolioReporter                    │
│  - Pushes NAV to Casper Fund contract                      │
│  - Reconciles orders                                       │
└─────────────────────────────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────────┐  ┌─────────────────────────────┐
│    Base L2              │  │    Casper L1               │
│  AgentPortfolioReporter │  │  Fund contract             │
│  - Holdings reported   │  │  - NAV updated            │
│  - Prices reported    │  │  - Shares minted/burned  │
│  - Total value        │  │                          │
└─────────────────────────┘  └─────────────────────────────┘
```

## Supported Assets

| Symbol | Token | Source | Decimals |
|--------|-------|--------|----------|
| TSLA   | dTesla | Dinari | 18 |
| NVDA   | dNvidia | Dinari | 18 |
| AAPL   | dApple | Dinari | 18 |
| USDC   | USD Coin | Base | 6 |

## Quick Start

```bash
# 1. Install dependencies
cd agent
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your API keys and contract addresses

# 3. Run NAV update (Base only)
npm run nav-update

# 4. Run full sync (Base + Casper)
npm run push-casper

# 5. Interactive agent mode
npm run agent
```

## Usage

### NAV Update Cycle

```bash
npm run nav-update
```

Fetches:
1. Holdings from Dinari API
2. Prices from Dinari API
3. USDC balance from agent wallet
4. Reports all to Base AgentPortfolioReporter

### Push to Casper

```bash
npm run push-casper
```

Does the NAV update cycle AND prepares the Casper transaction (for signing).

### Interactive Agent

```bash
npm run agent
```

Starts a LangChain agent that can:
- Answer questions about the fund
- Execute NAV updates
- Reconcile Dinari orders

## Commands

| Command | Description |
|---------|-------------|
| `nav-update` | Update Base contract only |
| `push-casper` | Update Base + prepare Casper tx |
| `agent` | Interactive LangChain agent |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for agent |
| `DINARI_API_KEY` | Yes | Dinari API key |
| `AGENT_PRIVATE_KEY` | Yes | Agent wallet (Base) |
| `ORACLE_PRIVATE_KEY` | Yes | Oracle wallet (Casper) |
| `BASE_RPC_URL` | Yes | Base RPC URL |
| `CASPER_RPC_URL` | Yes | Casper RPC URL |
| `AGENT_PORTFOLIO_REPORTER_ADDRESS` | Yes | Base contract address |
| `FUND_CONTRACT_HASH` | Yes | Casper contract hash |

## Token Decimals

- **dShares (dTSLA, dNVDA, dAAPL)**: 18 decimals
- **USDC**: 6 decimals
- **Prices**: 8 decimals (`$1 = 100_000_000`)
- **NAV**: 6 decimals (`$1 = 1_000_000`)

## TODO

- [ ] Implement Casper deploy signing
- [ ] Add subscription/cron mode
- [ ] Event-driven updates
- [ ] Error handling and retries
- [ ] Price staleness alerts
- [ ] Order reconciliation automation

## Casper Click Cloud Integration

For production, consider using [Casper Click Cloud](https://click.casperlabs.io/) for:
- REST API for contract calls (no SDK needed)
- Webhook subscriptions for events
- Managed RPC endpoints
- Dashboard for monitoring

```javascript
// Example: Use Casper Click Cloud REST API
const CASPER_CLICK_API = "https://api.casper.click";
const response = await fetch(`${CASPER_CLICK_API}/contract/call`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${CASPER_CLICK_TOKEN}` },
  body: JSON.stringify({
    hash: process.env.FUND_CONTRACT_HASH,
    entry_point: 'report_nav',
    runtime_args: { ... }
  })
});
```
