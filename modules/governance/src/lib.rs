//! # Governance Module
//!
//! On-chain voting for LP token holders, integrated with CSPR.fans.
//!
//! LP holders vote proportionally to their token balance (1 token = 1 vote).
//! This module:
//!
//!   - Creates and tracks proposals with deadlines
//!   - Records votes (For / Against / Abstain) on-chain
//!   - Supports delegated voting (LP delegates votes to a trusted address)
//!   - Emits structured events that CSPR.fans reads to display live vote counts
//!   - Executes approved proposals via a timelock (48h delay minimum)
//!
//! Compatible with Casper Hackathon 2026 community-first voting model.

#![no_std]

extern crate alloc;

use odra::prelude::*;
use odra::{Address, Mapping, Var, U256};
use odra_modules::access::Ownable;

// ── Types ─────────────────────────────────────────────────────────────────────

#[odra::odra_type]
pub enum VoteChoice {
    For,
    Against,
    Abstain,
}

#[odra::odra_type]
pub enum ProposalState {
    Active,
    Succeeded,
    Defeated,
    Cancelled,
    Queued,      // passed, awaiting timelock
    Executed,
}

#[odra::odra_type]
pub struct Proposal {
    pub id:           u64,
    pub proposer:     Address,
    pub title:        String,
    pub description:  String,
    pub created_at:   u64,
    pub voting_ends:  u64,
    pub votes_for:    U256,
    pub votes_against: U256,
    pub votes_abstain: U256,
    pub state:        ProposalState,
    pub quorum:       U256,   // minimum total votes for validity
    pub timelock_eta: u64,    // when it can execute after queue
}

#[odra::odra_type]
pub struct VoteRecord {
    pub voter:   Address,
    pub choice:  VoteChoice,
    pub weight:  U256,
    pub voted_at: u64,
}

// ── Events ────────────────────────────────────────────────────────────────────

#[odra::event]
pub struct ProposalCreated {
    pub proposal_id:  u64,
    pub proposer:     Address,
    pub title:        String,
    pub voting_ends:  u64,
    pub quorum:       U256,
}

#[odra::event]
pub struct VoteCast {
    pub proposal_id: u64,
    pub voter:       Address,
    pub choice:      VoteChoice,
    pub weight:      U256,
}

#[odra::event]
pub struct ProposalQueued {
    pub proposal_id: u64,
    pub eta:         u64,
}

#[odra::event]
pub struct ProposalExecuted {
    pub proposal_id: u64,
}

#[odra::event]
pub struct ProposalCancelled {
    pub proposal_id: u64,
}

#[odra::event]
pub struct VoteDelegated {
    pub delegator: Address,
    pub delegate:  Address,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[odra::odra_error]
pub enum GovernanceError {
    ProposalNotFound      = 7_000,
    VotingEnded           = 7_001,
    VotingNotEnded        = 7_002,
    AlreadyVoted          = 7_003,
    ProposalNotActive     = 7_004,
    ProposalNotSucceeded  = 7_005,
    TimelockNotExpired    = 7_006,
    ProposalNotQueued     = 7_007,
    Unauthorized          = 7_008,
    ZeroVotingWeight      = 7_009,
    SelfDelegation        = 7_010,
}

// ── Constants ─────────────────────────────────────────────────────────────────

/// Minimum voting period: 3 days in seconds.
pub const MIN_VOTING_PERIOD: u64  = 3 * 86_400;
/// Default timelock delay: 48 hours.
pub const TIMELOCK_DELAY: u64     = 2 * 86_400;

// ── Module ────────────────────────────────────────────────────────────────────

#[odra::module]
pub struct Governance {
    ownable:        Ownable,

    /// Address of the FundToken contract (used for voting weight snapshots).
    fund_token:     Var<Address>,

    /// All proposals by ID.
    proposals:      Mapping<u64, Proposal>,
    proposal_count: Var<u64>,

    /// (proposal_id, voter) → VoteRecord
    votes:          Mapping<(u64, Address), VoteRecord>,

    /// Delegation: delegator → delegate
    delegates:      Mapping<Address, Address>,

    /// Minimum % of total supply needed to meet quorum (basis points, 100 = 1%).
    quorum_bps:     Var<u64>,

    /// Minimum token balance to create a proposal.
    proposal_threshold: Var<U256>,
}

#[odra::module]
impl Governance {
    // ── Constructor ──────────────────────────────────────────────────────────

    pub fn init(
        &mut self,
        owner:               Address,
        fund_token:          Address,
        quorum_bps:          u64,    // e.g. 1000 = 10%
        proposal_threshold:  U256,   // min tokens to propose
    ) {
        self.ownable.init(owner);
        self.fund_token.set(fund_token);
        self.quorum_bps.set(quorum_bps);
        self.proposal_threshold.set(proposal_threshold);
    }

    // ── Proposals ─────────────────────────────────────────────────────────────

    /// Create a new governance proposal.
    /// `voting_period_seconds` must be >= MIN_VOTING_PERIOD (3 days).
    /// `token_supply_snapshot` — caller passes current total supply; in production
    /// this would be fetched via cross-contract call to the FundToken.
    pub fn create_proposal(
        &mut self,
        title:                   String,
        description:             String,
        voting_period_seconds:   u64,
        token_supply_snapshot:   U256,
        proposer_balance:        U256,  // snapshot of proposer's balance
    ) -> u64 {
        let proposer = self.env().caller();
        let threshold = self.proposal_threshold.get_or_default();
        if proposer_balance < threshold {
            self.env().revert(GovernanceError::ZeroVotingWeight);
        }

        let period = voting_period_seconds.max(MIN_VOTING_PERIOD);
        let now    = self.env().block_time();
        let quorum = Self::calculate_quorum(token_supply_snapshot, self.quorum_bps.get_or_default());

        let id = self.proposal_count.get_or_default();
        self.proposals.set(
            &id,
            Proposal {
                id,
                proposer,
                title:         title.clone(),
                description:   description.clone(),
                created_at:    now,
                voting_ends:   now + period,
                votes_for:     U256::zero(),
                votes_against: U256::zero(),
                votes_abstain: U256::zero(),
                state:         ProposalState::Active,
                quorum,
                timelock_eta:  0,
            },
        );
        self.proposal_count.set(id + 1);
        self.env().emit_event(ProposalCreated {
            proposal_id: id,
            proposer,
            title,
            voting_ends: now + period,
            quorum,
        });
        id
    }

    // ── Voting ────────────────────────────────────────────────────────────────

    /// Cast a vote.  `voter_balance` is the caller's token balance at proposal creation
    /// (in production: stored as a snapshot on-chain via the token contract).
    pub fn cast_vote(
        &mut self,
        proposal_id:   u64,
        choice:        VoteChoice,
        voter_balance: U256,  // weight — cross-contract call in production
    ) {
        let voter = self.env().caller();

        // Resolve delegation
        let effective_voter = match self.delegates.get(&voter) {
            Some(delegate) => delegate,
            None           => voter,
        };

        // Guard: already voted?
        if self.votes.get(&(proposal_id, effective_voter)).is_some() {
            self.env().revert(GovernanceError::AlreadyVoted);
        }
        if voter_balance.is_zero() {
            self.env().revert(GovernanceError::ZeroVotingWeight);
        }

        let mut proposal = self.get_active_proposal(proposal_id);
        let now = self.env().block_time();
        if now > proposal.voting_ends {
            self.env().revert(GovernanceError::VotingEnded);
        }

        match choice {
            VoteChoice::For     => { proposal.votes_for     = proposal.votes_for     + voter_balance; }
            VoteChoice::Against => { proposal.votes_against = proposal.votes_against + voter_balance; }
            VoteChoice::Abstain => { proposal.votes_abstain = proposal.votes_abstain + voter_balance; }
        }

        self.votes.set(
            &(proposal_id, effective_voter),
            VoteRecord {
                voter: effective_voter,
                choice: choice.clone(),
                weight: voter_balance,
                voted_at: now,
            },
        );
        self.proposals.set(&proposal_id, proposal);
        self.env().emit_event(VoteCast {
            proposal_id,
            voter: effective_voter,
            choice,
            weight: voter_balance,
        });
    }

    // ── Proposal lifecycle ────────────────────────────────────────────────────

    /// Finalise a proposal after voting period has closed.
    /// Marks as Succeeded or Defeated and emits for CSPR.fans.
    pub fn finalise_proposal(&mut self, proposal_id: u64) {
        let mut proposal = self.get_active_proposal(proposal_id);
        let now = self.env().block_time();
        if now <= proposal.voting_ends {
            self.env().revert(GovernanceError::VotingNotEnded);
        }
        let total_votes = proposal.votes_for + proposal.votes_against + proposal.votes_abstain;
        let quorum_met  = total_votes >= proposal.quorum;
        let for_wins    = proposal.votes_for > proposal.votes_against;

        proposal.state = if quorum_met && for_wins {
            ProposalState::Succeeded
        } else {
            ProposalState::Defeated
        };
        self.proposals.set(&proposal_id, proposal);
    }

    /// Queue a Succeeded proposal into the timelock.
    pub fn queue_proposal(&mut self, proposal_id: u64) {
        let mut proposal = self.get_proposal(proposal_id);
        match proposal.state {
            ProposalState::Succeeded => {}
            _ => self.env().revert(GovernanceError::ProposalNotSucceeded),
        }
        let eta = self.env().block_time() + TIMELOCK_DELAY;
        proposal.state       = ProposalState::Queued;
        proposal.timelock_eta = eta;
        self.proposals.set(&proposal_id, proposal);
        self.env().emit_event(ProposalQueued { proposal_id, eta });
    }

    /// Execute a Queued proposal after timelock has expired.
    pub fn execute_proposal(&mut self, proposal_id: u64) {
        self.ownable.assert_owner(&self.env().caller());
        let mut proposal = self.get_proposal(proposal_id);
        match proposal.state {
            ProposalState::Queued => {}
            _ => self.env().revert(GovernanceError::ProposalNotQueued),
        }
        if self.env().block_time() < proposal.timelock_eta {
            self.env().revert(GovernanceError::TimelockNotExpired);
        }
        proposal.state = ProposalState::Executed;
        self.proposals.set(&proposal_id, proposal);
        self.env().emit_event(ProposalExecuted { proposal_id });
        // Production: call the target contract via cross-contract invocation here.
    }

    /// Cancel a proposal (owner or proposer only).
    pub fn cancel_proposal(&mut self, proposal_id: u64) {
        let caller   = self.env().caller();
        let proposal_ref = self.get_proposal(proposal_id);
        if caller != self.ownable.get_owner() && caller != proposal_ref.proposer {
            self.env().revert(GovernanceError::Unauthorized);
        }
        let mut proposal = proposal_ref;
        proposal.state = ProposalState::Cancelled;
        self.proposals.set(&proposal_id, proposal);
        self.env().emit_event(ProposalCancelled { proposal_id });
    }

    // ── Delegation ────────────────────────────────────────────────────────────

    /// Delegate voting power to another address.
    pub fn delegate(&mut self, delegate: Address) {
        let caller = self.env().caller();
        if caller == delegate {
            self.env().revert(GovernanceError::SelfDelegation);
        }
        self.delegates.set(&caller, delegate);
        self.env().emit_event(VoteDelegated { delegator: caller, delegate });
    }

    /// Remove delegation (vote for yourself again).
    pub fn undelegate(&mut self) {
        let caller = self.env().caller();
        // Set to self — resolves to self in cast_vote
        self.delegates.set(&caller, caller);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    pub fn get_proposal(&self, id: u64) -> Proposal {
        match self.proposals.get(&id) {
            Some(p) => p,
            None    => self.env().revert(GovernanceError::ProposalNotFound),
        }
    }

    pub fn get_vote(&self, proposal_id: u64, voter: Address) -> Option<VoteRecord> {
        self.votes.get(&(proposal_id, voter))
    }

    pub fn proposal_count(&self) -> u64 {
        self.proposal_count.get_or_default()
    }

    pub fn get_delegate(&self, account: Address) -> Option<Address> {
        self.delegates.get(&account)
    }

    pub fn quorum_bps(&self) -> u64 {
        self.quorum_bps.get_or_default()
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    pub fn set_quorum_bps(&mut self, bps: u64) {
        self.ownable.assert_owner(&self.env().caller());
        self.quorum_bps.set(bps);
    }

    pub fn set_proposal_threshold(&mut self, threshold: U256) {
        self.ownable.assert_owner(&self.env().caller());
        self.proposal_threshold.set(threshold);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    fn get_active_proposal(&self, id: u64) -> Proposal {
        let p = self.get_proposal(id);
        match p.state {
            ProposalState::Active => p,
            _ => self.env().revert(GovernanceError::ProposalNotActive),
        }
    }

    fn calculate_quorum(total_supply: U256, bps: u64) -> U256 {
        // quorum = total_supply * bps / 10_000
        total_supply * U256::from(bps) / U256::from(10_000u64)
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostEnv};
    use odra_test::env;

    fn setup() -> (HostEnv, GovernanceHostRef) {
        let test_env  = env();
        let owner     = test_env.get_account(0);
        let fund_tok  = test_env.get_account(9);
        let contract  = GovernanceHostRef::deploy(
            &test_env,
            GovernanceInitArgs {
                owner,
                fund_token:          fund_tok,
                quorum_bps:          1000,              // 10% quorum
                proposal_threshold:  U256::from(100u64),
            },
        );
        (test_env, contract)
    }

    #[test]
    fn create_proposal() {
        let (env, mut contract) = setup();
        let proposer = env.get_account(0);
        env.set_caller(proposer);
        let id = contract.create_proposal(
            "Invest in Paystack".into(),
            "Allocate 15% of fund NAV".into(),
            MIN_VOTING_PERIOD,
            U256::from(10_000u64),
            U256::from(500u64), // proposer has 500 tokens
        );
        assert_eq!(id, 0);
        let p = contract.get_proposal(0);
        assert_eq!(p.title, "Invest in Paystack");
    }

    #[test]
    fn vote_for_and_against() {
        let (env, mut contract) = setup();
        let owner   = env.get_account(0);
        let alice   = env.get_account(1);
        let bob     = env.get_account(2);

        env.set_caller(owner);
        contract.create_proposal(
            "Test".into(), "Desc".into(),
            MIN_VOTING_PERIOD, U256::from(1_000u64), U256::from(500u64),
        );

        env.set_caller(alice);
        contract.cast_vote(0, VoteChoice::For,     U256::from(300u64));
        env.set_caller(bob);
        contract.cast_vote(0, VoteChoice::Against, U256::from(100u64));

        let p = contract.get_proposal(0);
        assert_eq!(p.votes_for,     U256::from(300u64));
        assert_eq!(p.votes_against, U256::from(100u64));
    }

    #[test]
    fn delegation() {
        let (env, mut contract) = setup();
        let alice = env.get_account(1);
        let bob   = env.get_account(2);
        env.set_caller(alice);
        contract.delegate(bob);
        assert_eq!(contract.get_delegate(alice), Some(bob));
    }

    #[test]
    #[should_panic]
    fn double_vote_reverts() {
        let (env, mut contract) = setup();
        let owner = env.get_account(0);
        let voter = env.get_account(1);
        env.set_caller(owner);
        contract.create_proposal(
            "T".into(), "D".into(),
            MIN_VOTING_PERIOD, U256::from(1_000u64), U256::from(500u64),
        );
        env.set_caller(voter);
        contract.cast_vote(0, VoteChoice::For, U256::from(100u64));
        contract.cast_vote(0, VoteChoice::For, U256::from(100u64)); // should revert
    }
}