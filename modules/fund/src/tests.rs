//! # Fund Contract Tests
//!
//! Tests for the RWA Fund contract on Casper.
//!
//! Run with: cargo test -p fund

use crate::{Fund, NAV_SCALE};
use odra::prelude::casper_types::U256;
use odra::test_env::{init_chain, set_caller, block_time, Account};
use odra::test_env::contracts::fund;

fn deploy_fund(
    owner: Account,
    payment_token: Account,
    oracle: Account,
) -> Fund {
    fund::instantiate(owner, payment_token, oracle)
}

#[odra_test]
mod tests {
    use super::*;

    #[test]
    fn test_init() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);
        
        assert!(!fund.is_nav_set());
        assert_eq!(fund.get_nav(), 0);
        assert_eq!(fund.get_total_shares(), 0);
    }

    #[test]
    fn test_nav_requires_oracle() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Bob);
        let result = fund.set_nav(1_000_000, 1_000_000);
        assert!(result.is_err());
    }

    #[test]
    fn test_set_nav() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Charlie);
        fund.set_nav(1_000_000, 1_000_000);

        assert!(fund.is_nav_set());
        assert_eq!(fund.get_nav(), 1_000_000);
        assert_eq!(fund.get_total_value(), 1_000_000);
    }

    #[test]
    fn test_report_nav() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Charlie);
        fund.report_nav(
            vec!["dTSLA".to_string(), "USDC".to_string()],
            vec![100_000_000, 0],
            vec![250_000_000_000, 100_000_000],
            500_000_000,
        );

        assert!(fund.is_nav_set());
        let assets = fund.get_all_assets();
        assert_eq!(assets.len(), 2);
    }

    #[test]
    fn test_report_nav_empty() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Charlie);
        fund.report_nav(vec![], vec![], vec![], 0);

        assert!(fund.is_nav_set());
        assert_eq!(fund.get_total_value(), 0);
    }

    #[test]
    fn test_report_nav_length_mismatch() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Charlie);
        let result = fund.report_nav(
            vec!["dTSLA".to_string(), "dNVDA".to_string()],
            vec![100_000_000],
            vec![250_000_000_000, 500_000_000_000],
            0,
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_deposit_requires_nav() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        let result = fund.deposit(U256::from(1000));
        assert!(result.is_err());
    }

    #[test]
    fn test_deposit_zero_amount() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Charlie);
        fund.set_nav(1_000_000, 1_000_000);

        set_caller(Account::Alice);
        let result = fund.deposit(U256::from(0));
        assert!(result.is_err());
    }

    #[test]
    fn test_request_redeem_insufficient_shares() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Charlie);
        fund.set_nav(1_000_000, 1_000_000);

        set_caller(Account::Alice);
        let result = fund.request_redeem(100, Account::Alice);
        assert!(result.is_err());
    }

    #[test]
    fn test_request_redeem_zero_shares() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Charlie);
        fund.set_nav(1_000_000, 1_000_000);

        set_caller(Account::Alice);
        let result = fund.request_redeem(0, Account::Alice);
        assert!(result.is_err());
    }

    #[test]
    fn test_set_oracle() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Alice);
        fund.set_oracle(Account::Eve);

        set_caller(Account::Eve);
        fund.set_nav(1_000_000, 1_000_000);
        assert!(fund.is_nav_set());
    }

    #[test]
    fn test_non_owner_cannot_set_oracle() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Bob);
        let result = fund.set_oracle(Account::Eve);
        assert!(result.is_err());
    }

    #[test]
    fn test_get_asset() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Charlie);
        fund.report_nav(
            vec!["dTSLA".to_string()],
            vec![100_000_000],
            vec![250_000_000_000],
            0,
        );

        let asset = fund.get_asset("dTSLA".to_string());
        assert!(asset.is_some());
        assert_eq!(asset.unwrap().symbol, "dTSLA");
    }

    #[test]
    fn test_get_asset_symbols() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Charlie);
        fund.report_nav(
            vec!["dTSLA".to_string(), "dNVDA".to_string(), "USDC".to_string()],
            vec![100_000_000, 50_000_000, 1000_000_000],
            vec![250_000_000_000, 500_000_000_000, 100_000_000],
            0,
        );

        let symbols = fund.get_asset_symbols();
        assert_eq!(symbols.len(), 3);
    }

    #[test]
    fn test_get_nav_report() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        set_caller(Account::Charlie);
        fund.report_nav(
            vec!["dTSLA".to_string()],
            vec![100_000_000],
            vec![250_000_000_000],
            500_000_000,
        );

        let report = fund.get_nav_report();
        assert!(report.nav_per_share > 0);
        assert_eq!(report.assets.len(), 1);
    }

    #[test]
    fn test_last_nav_update() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        assert_eq!(fund.last_nav_update(), 0);

        set_caller(Account::Charlie);
        fund.set_nav(1_000_000, 1_000_000);

        assert!(fund.last_nav_update() > 0);
    }

    #[test]
    fn test_get_nonexistent_asset() {
        init_chain();
        let fund = deploy_fund(Account::Alice, Account::Bob, Account::Charlie);

        let asset = fund.get_asset("NONEXISTENT".to_string());
        assert!(asset.is_none());
    }
}
