# MVP Backend Plan — CasperSuite Tokenized Equity & Venture Capital

## 1. OBJECTIVE

Design and plan the MVP backend services required to operate the CasperSuite ERC-3643 tokenized PE/VC fund on-chain. The plan covers: (a) what the smart contracts still need before they're production-ready, (b) the full stack of backend services needed to run the platform, and (c) a prioritized implementation sequence for the MVP.

---

## 2. CONTEXT SUMMARY

### Smart Contract Suite (7 modules, Odra/Casper)

| Module | File | Purpose |
|---|---|---|
| `ClaimTopicsRegistry` | `modules/claim-topics-registry/src/lib.rs` | Defines required claim IDs: KYC=1, AML=2, Accreditation=3, Jurisdiction=4 |
| `TrustedIssuersRegistry` | `modules/trusted-issuers-registry/src/lib.rs` | Stores authorized KYC/AML provider addresses |
| `IdentityRegistry` | `modules/identity-registry/src/lib.rs` | Maps investor address → DID, country, active claims |
| `Compliance` | `modules/compliance/src/lib.rs` | Transfer gate: pause, country rules, holding period, max investors |
| `SecurityToken` | `modules/security-token/src/lib.rs` | ERC-3643 security token (mint, burn, transfer, freeze) |
| `FundToken` | `modules/fund-token/src/lib.rs` | PE/VC LP share token: NAV, subscriptions, redemptions, distributions, governance |
| `Governance` | `modules/governance/src/lib.rs` | On-chain voting: proposals, quorum, delegation, timelock, CSPR.fans-compatible events |

**Deployment stack** (`scripts/deploy.rs`): ClaimTopics → TrustedIssuers → Identity → Compliance → SecurityToken → FundToken → Governance, all wired together.

### What the Contracts Do Well
- Full ERC-3643 identity & claim model (DIDs, country codes, claim topics, trusted issuers)
- Compliance rule engine with pause, country allow/block lists, holding period, investor cap
- Security token with agent-role minting, regulator forced transfers, partial freezing
- Fund token with NAV posting, subscription queue, redemption queue, distribution recording
- Governance with proposal creation, weighted voting, quorum, delegation, 48h timelock
- All modules emit structured events for off-chain indexing

---

## 3. APPROACH OVERVIEW

The backend is organized into 5 focused services, implemented in order of dependency:

1. **KYC Oracle** (highest priority) — Translates off-chain KYC provider webhooks into on-chain claims. Without this, no investor can be verified → no subscriptions.
2. **Subscription Processor** — Bridges off-chain CSPR payment collection with on-chain LP token minting.
3. **NAV Oracle** — Posts periodic fund valuations to `FundToken`. Implemented as an OpenHands cron automation.
4. **Event Indexer** — Indexes all on-chain events into a queryable database for the frontend. Uses CSPR.cloud as the primary indexing layer.
5. **Fund Admin Dashboard API** — Authenticated REST API for the fund manager to operate the fund (accept/reject subscriptions, process redemptions, manage compliance).

In parallel, 4 smart contract fixes must be implemented so the backend doesn't build against stubbed/out-of-order compliance logic.

---

## 4. IMPLEMENTATION STEPS

### Critical Smart Contract Fixes (Parallel with all phases)

**Fix 1: Trusted Issuer Check is a Placeholder in IdentityRegistry**
- **File:** `modules/identity-registry/src/lib.rs`, `is_verified()`, lines 286–288
- **Problem:** The issuer trust check is commented out — any address can issue claims, bypassing KYC entirely.
- **Fix:** Implement real cross-contract call: `TrustedIssuersRegistryRef::at(self.issuers_registry.get()).issuer_trusted_for_topic(claim.issuer, *topic)`

**Fix 2: Identity & KYC Verification is Stubbed in Compliance**
- **File:** `modules/compliance/src/lib.rs`, `can_transfer()`, lines 171–186
- **Problem:** The compliance gate passes all transfers through — it doesn't actually call `IdentityRegistry.is_verified()`.
- **Fix:** Implement cross-contract calls to `IdentityRegistry.is_verified()` for both `from` and `to`, and add country block/allow checks via `IdentityRegistry.get_identity().country`.

**Fix 3: NAV History Has No Query Function**
- **File:** `modules/fund-token/src/lib.rs`
- **Problem:** `nav_history_count` is incremented but no `get_nav_record(index)` function exists. Frontend cannot display NAV history chart.
- **Fix:** Add `nav_history: Mapping<u64, NavRecord>` storage backing, update `post_nav()` to store entries, add `get_nav_record(&self, index: u64) -> Option<NavRecord>` query.

**Fix 4: Subscription Token Calculation Uses Demo Formula**
- **File:** `modules/fund-token/src/lib.rs`, `accept_subscription()`, lines 298–301
- **Problem:** Token minting assumes CSPR price = $1 and doesn't accept a real USD valuation.
- **Fix:** Add `accept_subscription_with_usd(cspr_usd_cents: u64)` entrypoint that computes `tokens = (cspr_usd_cents * 1e6) / nav_per_token`.

---

### Phase 1 — KYC Oracle (Weeks 1–2) [HIGHEST PRIORITY]

**Goal:** Enable investor onboarding. All other work is blocked on this.

**Stack:** Node.js + Express + TypeScript + CSPR.js + PostgreSQL + Redis

**Directory:** `backend/kyc-oracle/`

**Step 1.1: Project scaffolding**
- Initialize Node.js/TypeScript project: `package.json`, `tsconfig.json`, ESLint, Jest
- Install: `cspr-sdk`, `@sumsub/sdk`, `pg`, `ioredis`, `jsonwebtoken`, `uuid`, `axios`
- Environment variables: `IDENTITY_REGISTRY_ADDRESS`, `TRUSTED_ISSUERS_REGISTRY_ADDRESS`, `SUMSUB_APP_TOKEN`, `SUMSUB_SECRET_KEY`, `SUMSUB_WEBHOOK_SECRET`, `CLAIM_AGENT_KEY`, `NETWORK`, `DATABASE_URL`

**Step 1.2: Sumsub webhook handler**
- Endpoint: `POST /api/kyc/webhook`
- Validate HMAC-SHA256 signature from Sumsub `X-Sumsub-Signature` header
- Parse payload: `applicantId`, `reviewStatus`, `rejectionReasons`
- Store raw webhook in PostgreSQL `kyc_webhook_events` table (idempotency key: `applicantId + reviewStatus + createdAt`)
- **On `completed`:** call `identity_registry.register_identity()` then `add_claim()` twice (KYC topic + AML topic)
- **On `rejected`:** log to `kyc_rejections` table, emit internal notification event
- **Idempotency:** skip if this `applicantId + status` was already processed (use DB unique constraint)
- Handle errors: revert on unexpected chain errors, return 200 to Sumsub (always acknowledge webhooks)

**Step 1.3: CSPR.js integration**
- Load IdentityRegistry WASM + ABI
- Wrap `register_identity()` and `add_claim()` into typed TypeScript functions
- Sign deploys with CLAIM_AGENT key (securely loaded from env or KMS)
- Implement retry logic (3 attempts with exponential backoff on network errors)
- Log all deploy hashes to `on_chain_transactions` table for audit

**Step 1.4: KYC initiation endpoint**
- Endpoint: `POST /api/kyc/init`
- Input: `{ investorAddress: string, email: string, country: string }`
- Creates Sumsub applicant, returns `accessToken` for embedded flow
- Stores `investor_address → applicant_id` mapping in DB

**Step 1.5: KYC status API**
- Endpoint: `GET /api/kyc/status/:address`
- Queries on-chain: `identity_registry.get_identity()` + `get_claim()` for each required topic
- Returns: `{ verified: boolean, country: string, did: string, claims: [{topic, issuer, expiry, valid}] }`

**Step 1.6: Security & operations**
- Rate limiting: max 10 webhook calls per minute per IP (Redis sliding window)
- IP allowlist for Sumsub webhook IPs
- Health check: `GET /health` returns DB connectivity, chain connectivity, webhook delivery status
- Monitoring: log all deploys with tx hash, monitor for failed deploys

---

### Phase 2 — Subscription Processor (Weeks 2–3)

**Goal:** Convert subscription intent (on-chain) + CSPR payment (off-chain) into LP token minting.

**Stack:** Node.js worker + PostgreSQL + CSPR.js

**Directory:** `backend/subscription-processor/`

**Step 2.1: Database schema**
```sql
CREATE TABLE subscriptions (
  id              SERIAL PRIMARY KEY,
  investor        TEXT NOT NULL,
  amount_cspr     BIGINT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  payment_tx_hash TEXT,
  on_chain_id     BIGINT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

CREATE TABLE kyc_status (
  investor        TEXT PRIMARY KEY,
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at     TIMESTAMPTZ,
  expiry          BIGINT,
  country         TEXT
);

CREATE TABLE investor_profiles (
  investor        TEXT PRIMARY KEY,
  did             TEXT,
  country         TEXT,
  kyc_applicant_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Step 2.2: Subscription creation endpoint**
- Endpoint: `POST /api/subscriptions/create`
- Input: `{ investorAddress: string, amountCspr: number }`
- Verify investor is KYC'd via `identity_registry.get_identity()`
- Call `fund_token.subscribe(amountCspr)` on-chain
- Store subscription record with `status=pending`, return `{ subscriptionId, onChainId, treasuryAddress }`

**Step 2.3: Payment detection worker**
- Poll treasury wallet using CSPR.js `query_global_state()` for balance changes
- Parse `Transfer` deploys to treasury address
- Match by `payment_memo` field (format: `sub-{subscriptionId}`)
- Validate: amount matches, investor is KYC'd, subscription is pending
- **On success:** call `fund_token.accept_subscription(on_chain_id)`, update DB `status=accepted`, send email
- **On failure:** call `fund_token.reject_subscription(on_chain_id)`, update DB `status=rejected`, send email with reason
- Run as a background worker (poll every 30 seconds)

**Step 2.4: Manual confirmation fallback**
- Endpoint: `POST /api/subscriptions/confirm-payment`
- Auth: admin JWT required
- Input: `{ subscriptionId: number, paymentTxHash: string, paymentAmount: number }`
- Used for wire transfers or when auto-detection misses a payment

**Step 2.5: Investor notifications**
- Trigger email via SendGrid/Resend/SES on: subscription accepted, subscription rejected, LP tokens minted
- Email templates: HTML transactional emails with fund branding

---

### Phase 3 — NAV Oracle (Week 3)

**Goal:** Enable periodic NAV updates with minimal infrastructure.

**Stack:** Node.js REST API + OpenHands cron automation

**Directory:** `backend/nav-oracle/`

**Step 3.1: NAV posting API**
- Endpoint: `POST /api/nav/post`
- Auth: admin JWT (fund admin role)
- Input: `{ navPerToken: number, totalNav: number, navDate: string }`
- Validations: navPerToken > 0, totalNav >= navPerToken × totalSupply
- Call `fund_token.post_nav(navPerToken, totalNav)` on-chain
- Store in `nav_history` table: `{ nav_per_token, total_nav, posted_at, posted_by, tx_hash }`
- Return: `{ navId, navPerToken, totalNav, txHash, postedAt }`

**Step 3.2: NAV query endpoints**
- Endpoint: `GET /api/nav/latest` — most recent NAV (cache: 60s Redis TTL)
- Endpoint: `GET /api/nav/history?page=1&limit=52` — paginated history
- Response: `[{ navPerToken, totalNav, postedAt }]`

**Step 3.3: Automated NAV via OpenHands cron automation**
- Create OpenHands prompt preset automation
- Prompt: "Post the latest NAV to the fund token contract at address `{FUND_TOKEN_ADDRESS}`. Fetch the latest fund valuation, compute navPerToken and totalNav, then call the `post_nav(navPerToken, totalNav)` entrypoint using the admin signing key stored in environment. Report the deploy hash."
- Schedule: `0 9 * * 1` (Mondays 9 AM UTC) — or `0 9 1 * *` for monthly
- Env vars: `FUND_TOKEN_ADDRESS`, `ADMIN_SIGNING_KEY`

---

### Phase 4 — Event Indexer (Weeks 3–4)

**Goal:** Efficient event history for the frontend without hitting the chain for every query.

**Stack:** Thin REST API over CSPR.cloud + Redis cache

**Directory:** `backend/event-indexer/`

**Step 4.1: Indexing approach**
- **Primary:** CSPR.cloud SQL interface — register contract addresses in CSPR.cloud dashboard, query events with SQL
- **Fallback:** Custom Node.js worker using CSPR.js `get_block()` RPC + event parsing
- Build thin REST API layer that proxies CSPR.cloud queries with application-level caching

**Step 4.2: Events to index**

| Event | Contract | Stored Fields |
|---|---|---|
| `IdentityRegistered` | IdentityRegistry | investor, did, country, block_time |
| `ClaimAdded` | IdentityRegistry | investor, topic, issuer, expiry |
| `SubscriptionQueued` | FundToken | investor, amount_cspr, subscription_id |
| `SubscriptionAccepted` | FundToken | investor, subscription_id, tokens_minted |
| `SubscriptionRejected` | FundToken | investor, subscription_id |
| `RedemptionQueued` | FundToken | investor, token_amount, redemption_id |
| `RedemptionProcessed` | FundToken | investor, redemption_id, cspr_returned |
| `NavPosted` | FundToken | nav_per_token, total_nav, posted_at |
| `DistributionRecorded` | FundToken | amount_usd_cents, distribution_type |
| `GovernanceProposalCreated` | Governance | proposal_id, title, voting_ends, quorum |
| `VoteCast` | Governance | proposal_id, voter, choice, weight |

**Step 4.3: REST API for frontend**
- `GET /api/events/investor/:address` — all events for investor (paginated)
- `GET /api/events/subscriptions` — all subscription events (paginated, filterable by status)
- `GET /api/events/redemptions` — all redemption events (paginated)
- `GET /api/events/nav` — NAV history
- `GET /api/events/governance` — all governance events
- All responses cached in Redis: 60s TTL for hot data, 5min TTL for historical

**Step 4.4: Real-time updates (optional MVP)**
- Endpoint: `GET /api/events/stream?fromBlock=N` — Server-Sent Events (SSE)
- Frontend subscribes to receive live block-by-block updates
- Worker polls CSPR.cloud for new blocks, pushes matching events to SSE clients

---

### Phase 5 — Fund Admin Dashboard API (Weeks 4–5)

**Goal:** Enable the fund manager to operate the fund without direct blockchain interaction or CLI commands.

**Stack:** Node.js REST API + JWT authentication + CSPR.js

**Directory:** `backend/admin-api/`

**Step 5.1: Authentication**
- Endpoint: `POST /api/admin/auth/login`
- Input: `{ walletAddress: string, signature: string }` (sign a challenge nonce)
- Issue JWT: `{ sub: walletAddress, role: "fund_admin", iat, exp: +8h }`
- All `/api/admin/*` routes validate JWT + check wallet address is in fund admin list
- Refresh token flow for long admin sessions

**Step 5.2: Subscription management**
- `GET /api/admin/subscriptions/pending` — pending subscriptions with investor info + KYC status
- `POST /api/admin/subscriptions/:id/accept` — accept (calls `fund_token.accept_subscription()`)
- `POST /api/admin/subscriptions/:id/reject` — reject with reason (calls `fund_token.reject_subscription()`)

**Step 5.3: Redemption management**
- `GET /api/admin/redemptions/pending` — pending redemptions with NAV value estimate (`token_amount × current_nav`)
- `POST /api/admin/redemptions/:id/process` — process with CSPR return amount (calls `fund_token.process_redemption()`)
- `POST /api/admin/redemptions/batch-process` — process multiple at once

**Step 5.4: Compliance controls**
- `GET /api/admin/compliance/status` — pause state, blocked countries, investor count, required claim topics
- `POST /api/admin/compliance/pause` — call `compliance.pause()`
- `POST /api/admin/compliance/unpause` — call `compliance.unpause()`
- `POST /api/admin/compliance/block-country` — block a country
- `POST /api/admin/compliance/allow-country` — allow a country
- `POST /api/admin/compliance/set-holding-period` — set minimum holding period in seconds

**Step 5.5: Governance**
- `POST /api/admin/governance/proposals` — create proposal (calls `fund_token.create_governance_proposal()` + `governance.create_proposal()`)
- `GET /api/admin/governance/proposals` — all proposals with current state and vote counts
- `POST /api/admin/governance/proposals/:id/queue` — queue succeeded proposal
- `POST /api/admin/governance/proposals/:id/execute` — execute queued proposal

**Step 5.6: Investor management**
- `GET /api/admin/investors` — paginated list with KYC status, country, token balance
- `POST /api/admin/investors/:address/freeze` — freeze investor address
- `POST /api/admin/investors/:address/unfreeze` — unfreeze investor
- `POST /api/admin/investors/:address/remove` — soft-delete identity (`identity_registry.remove_identity()`)
- `POST /api/admin/investors/:address/freeze-partial` — freeze a specific token amount

**Step 5.7: Distribution recording**
- `POST /api/admin/distributions/record` — call `fund_token.record_distribution()` on-chain
- Input: `{ amountUsdCents: number, type: "INCOME" | "CAPITAL_RETURN" | "CAPITAL_CALL", note: string }`

---

## 5. TESTING AND VALIDATION

### Backend Testing Strategy

| Layer | Test Type | Tool |
|---|---|---|
| Unit tests | Webhook parsing, token calculation, validation logic | Jest / Vitest |
| Integration tests | Full webhook → on-chain flow on testnet | Jest + CSPR.js test runner |
| Contract tests | Smart contract fixes (cross-contract calls) | `cargo odra test` + new integration tests |
| E2E tests | Investor onboarding: KYC → subscription → LP tokens | Playwright + test accounts |
| Load tests | Webhook endpoint under concurrent Sumsub callbacks | k6 or Artillery |
| Admin API tests | All authenticated endpoints | Jest + Supertest |

### Validation Checklist

- [ ] KYC webhook successfully calls `register_identity()` + `add_claim()` (KYC + AML) on testnet
- [ ] Investor without on-chain KYC cannot subscribe (backend rejects before calling contract)
- [ ] Subscription payment detection correctly matches CSPR transfers by memo field
- [ ] LP tokens are minted at the correct NAV-derived amount
- [ ] NAV oracle posts correct values (verified against manual off-chain calculation)
- [ ] `is_verified()` correctly queries `TrustedIssuersRegistry` and returns false for untrusted issuers
- [ ] `can_transfer()` blocks transfers when sender lacks required claims
- [ ] Country block list prevents transfers from blocked jurisdictions
- [ ] Compliance pause blocks all transfers when activated
- [ ] CSPR.fans can read `GovernanceProposalCreated` events from the Governance contract
- [ ] Event indexer captures all event types with correct, complete data
- [ ] Admin dashboard endpoints reject requests without valid JWT authentication
- [ ] NAV history query returns records in reverse chronological order
- [ ] Redemption CSPR return amount is recorded correctly in `RedemptionProcessed` event

### MVP Definition of Done

1. An investor can complete KYC via embedded Sumsub flow and receive on-chain KYC + AML claims
2. A KYC'd investor can create a subscription and receive LP tokens after CSPR payment
3. Fund manager can view pending subscriptions and accept/reject them via the admin API
4. NAV is posted weekly (automated via cron) and queryable via API
5. Redemption requests can be processed by the fund manager with correct CSPR return recorded
6. Governance proposals are emitted in CSPR.fans-compatible format and queryable
7. All on-chain events are indexed and accessible via the event API for the frontend
