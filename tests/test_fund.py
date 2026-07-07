"""
Tests for Fund Contract Logic
=============================

These tests verify the core Fund contract logic for NAV calculation,
share minting, and redemption.

Run with: python tests/test_fund.py
"""

import unittest
from dataclasses import dataclass
from typing import List, Optional
from enum import Enum

# NAV scale: 1 = $0.000001, 1_000_000 = $1.00
NAV_SCALE = 1_000_000

class FundError(Enum):
    NOT_OWNER = 5000
    NOT_ORACLE = 5001
    ZERO_AMOUNT = 5002
    INSUFFICIENT_SHARES = 5003
    NAV_NOT_SET = 5004
    TICKET_NOT_FOUND = 5005
    ALREADY_FULFILLED = 5006
    INSUFFICIENT_TREASURY = 5007
    DIVISION_BY_ZERO = 5008
    LENGTH_MISMATCH = 5009


@dataclass
class AssetSnapshot:
    symbol: str
    quantity: int
    price: int
    value: int


class FundTestHarness:
    """Test harness for Fund contract"""
    
    def __init__(self):
        self.nav_per_share = 0
        self.total_value = 0
        self.nav_is_set = False
        self.total_shares = 0
        self.shares: dict = {}
        self.assets: dict = {}
        self.asset_symbols: List[str] = []
        self.redemptions: dict = {}
        self.next_ticket = 0
        
    def init(self):
        """Initialize contract"""
        self.nav_per_share = 0
        self.total_value = 0
        self.nav_is_set = False
        self.total_shares = 0
        self.shares = {}
        self.assets = {}
        self.asset_symbols = []
        
    def set_nav(self, nav_per_share: int, total_value: int):
        """Set NAV directly"""
        self.nav_per_share = nav_per_share
        self.total_value = total_value
        self.nav_is_set = True
        
    def report_nav(
        self,
        symbols: List[str],
        quantities: List[int],
        prices: List[int],
        usdc_balance: int
    ):
        """Report NAV with asset breakdown"""
        if len(symbols) != len(quantities) or len(symbols) != len(prices):
            raise ValueError("Length mismatch")
            
        # Calculate total value
        total = 0
        new_symbols = []
        
        for i in range(len(symbols)):
            symbol = symbols[i]
            quantity = quantities[i]
            price = prices[i]
            
            # value = quantity * price / 1e8 (price has 1e8 scale)
            value = (quantity * price) // 100_000_000
            total += value
            
            # Store asset
            if symbol not in self.assets:
                self.asset_symbols.append(symbol)
            self.assets[symbol] = AssetSnapshot(
                symbol=symbol,
                quantity=quantity,
                price=price,
                value=value
            )
            new_symbols.append(symbol)
            
        # Add USDC balance (6 decimals -> 8 decimals)
        usdc_value = (usdc_balance * 100) // 1_000_000
        total += usdc_value
        
        # Store USDC asset
        if "USDC" not in self.assets:
            self.asset_symbols.append("USDC")
        self.assets["USDC"] = AssetSnapshot(
            symbol="USDC",
            quantity=usdc_balance,
            price=100_000_000,  # $1
            value=usdc_value
        )
        
        self.total_value = total
        
        # Calculate NAV per share
        if self.total_shares > 0:
            self.nav_per_share = (total * NAV_SCALE) // self.total_shares
        else:
            self.nav_per_share = NAV_SCALE
            
        self.nav_is_set = True
        
    def deposit(self, amount: int) -> int:
        """Deposit and mint shares"""
        if amount == 0:
            raise ValueError("Zero amount")
        if not self.nav_is_set:
            raise ValueError("NAV not set")
            
        # Calculate shares: amount / nav * NAV_SCALE
        shares = (amount * NAV_SCALE) // self.nav_per_share
        
        self.shares["Alice"] = self.shares.get("Alice", 0) + shares
        self.total_shares += shares
        
        return shares
        
    def request_redeem(self, shares: int, receiver: str) -> int:
        """Request redemption of shares"""
        if shares == 0:
            raise ValueError("Zero amount")
        if not self.nav_is_set:
            raise ValueError("NAV not set")
            
        balance = self.shares.get("Alice", 0)
        if balance < shares:
            raise ValueError("Insufficient shares")
            
        # Burn shares
        self.shares["Alice"] = balance - shares
        self.total_shares -= shares
        
        # Calculate payout
        payout = (shares * self.nav_per_share) // NAV_SCALE
        
        ticket = self.next_ticket
        self.next_ticket += 1
        
        self.redemptions[ticket] = {
            "owner": "Alice",
            "receiver": receiver,
            "shares": shares,
            "payout": payout,
            "fulfilled": False
        }
        
        return ticket
        
    def fulfill_redeem(self, ticket: int):
        """Fulfill a redemption request"""
        if ticket not in self.redemptions:
            raise ValueError("Ticket not found")
            
        request = self.redemptions[ticket]
        if request["fulfilled"]:
            raise ValueError("Already fulfilled")
            
        request["fulfilled"] = True
        
    def get_nav(self) -> int:
        return self.nav_per_share
        
    def get_total_value(self) -> int:
        return self.total_value
        
    def get_shares(self, owner: str) -> int:
        return self.shares.get(owner, 0)
        
    def get_total_shares(self) -> int:
        return self.total_shares
        
    def is_nav_set(self) -> bool:
        return self.nav_is_set
        
    def get_all_assets(self) -> List[AssetSnapshot]:
        return [self.assets[s] for s in self.asset_symbols if s in self.assets]


class TestInitialization(unittest.TestCase):
    
    def test_init_defaults(self):
        fund = FundTestHarness()
        fund.init()
        self.assertEqual(fund.nav_per_share, 0)
        self.assertFalse(fund.nav_is_set)
        self.assertEqual(fund.total_shares, 0)


class TestNAVReporting(unittest.TestCase):
    
    def test_set_nav(self):
        fund = FundTestHarness()
        fund.init()
        fund.set_nav(1_000_000, 1_000_000)  # $1 NAV
        
        self.assertTrue(fund.nav_is_set)
        self.assertEqual(fund.nav_per_share, 1_000_000)
        self.assertEqual(fund.total_value, 1_000_000)
        
    def test_report_nav_single_asset(self):
        fund = FundTestHarness()
        fund.init()
        
        # 1 dTSLA at $250 = $250
        fund.report_nav(
            symbols=["dTSLA"],
            quantities=[100_000_000],  # 1 dTSLA (8 decimals)
            prices=[250_000_000_000],  # $250 (1e8 scale)
            usdc_balance=0
        )
        
        self.assertTrue(fund.nav_is_set)
        self.assertEqual(len(fund.assets), 2)  # dTSLA + USDC
        self.assertEqual(fund.assets["dTSLA"].value, 250_000_000_000_000)
        
    def test_report_nav_multiple_assets(self):
        fund = FundTestHarness()
        fund.init()
        
        # 1 dTSLA at $250 = $250
        # 1 dNVDA at $500 = $500
        # Total = $750
        fund.report_nav(
            symbols=["dTSLA", "dNVDA"],
            quantities=[100_000_000, 100_000_000],
            prices=[250_000_000_000, 500_000_000_000],
            usdc_balance=0
        )
        
        self.assertTrue(fund.nav_is_set)
        self.assertGreater(fund.total_value, 0)
        
    def test_report_nav_with_usdc(self):
        fund = FundTestHarness()
        fund.init()
        
        # 1 dTSLA at $250 = $250
        # 500 USDC = $500
        # Total = $750
        fund.report_nav(
            symbols=["dTSLA"],
            quantities=[100_000_000],
            prices=[250_000_000_000],
            usdc_balance=500_000_000  # 500 USDC (6 decimals)
        )
        
        self.assertTrue(fund.nav_is_set)
        self.assertGreater(fund.total_value, 250_000_000_000_000)
        
    def test_report_nav_empty(self):
        fund = FundTestHarness()
        fund.init()
        
        fund.report_nav([], [], [], 0)
        
        self.assertTrue(fund.nav_is_set)
        self.assertEqual(fund.total_value, 0)
        
    def test_report_nav_length_mismatch(self):
        fund = FundTestHarness()
        fund.init()
        
        with self.assertRaises(ValueError):
            fund.report_nav(
                symbols=["dTSLA", "dNVDA"],
                quantities=[100_000_000],
                prices=[250_000_000_000, 500_000_000_000],
                usdc_balance=0
            )


class TestDeposits(unittest.TestCase):
    
    def test_deposit_requires_nav(self):
        fund = FundTestHarness()
        fund.init()
        
        with self.assertRaises(ValueError):
            fund.deposit(100_000_000)
            
    def test_deposit_zero_amount(self):
        fund = FundTestHarness()
        fund.init()
        fund.set_nav(1_000_000, 1_000_000)
        
        with self.assertRaises(ValueError):
            fund.deposit(0)
            
    def test_deposit_mints_shares(self):
        fund = FundTestHarness()
        fund.init()
        
        # Set NAV: $1 per share
        fund.set_nav(1_000_000, 1_000_000)
        
        # Deposit $100 = 100 * 1e6 NAV units
        shares = fund.deposit(100_000_000)
        
        # Should get 100 shares
        self.assertEqual(shares, 100)
        self.assertEqual(fund.get_shares("Alice"), 100)
        self.assertEqual(fund.get_total_shares(), 100)
        
    def test_deposit_high_nav(self):
        fund = FundTestHarness()
        fund.init()
        
        # Set NAV: $2 per share
        fund.set_nav(2_000_000, 2_000_000)
        
        # Deposit $100 at $2 NAV = 50 shares
        shares = fund.deposit(100_000_000)
        self.assertEqual(shares, 50)
        
    def test_deposit_low_nav(self):
        fund = FundTestHarness()
        fund.init()
        
        # Set NAV: $0.50 per share
        fund.set_nav(500_000, 500_000)
        
        # Deposit $100 at $0.50 NAV = 200 shares
        shares = fund.deposit(100_000_000)
        self.assertEqual(shares, 200)


class TestRedemptions(unittest.TestCase):
    
    def test_request_redeem_insufficient_shares(self):
        fund = FundTestHarness()
        fund.init()
        fund.set_nav(1_000_000, 1_000_000)
        
        with self.assertRaises(ValueError):
            fund.request_redeem(100, "Alice")
            
    def test_request_redeem_zero_shares(self):
        fund = FundTestHarness()
        fund.init()
        fund.set_nav(1_000_000, 1_000_000)
        
        with self.assertRaises(ValueError):
            fund.request_redeem(0, "Alice")
            
    def test_request_redeem_success(self):
        fund = FundTestHarness()
        fund.init()
        
        # Set NAV: $1 per share
        fund.set_nav(1_000_000, 1_000_000)
        
        # Deposit first
        fund.deposit(100_000_000)  # 100 shares
        
        # Redeem 50 shares
        ticket = fund.request_redeem(50, "Alice")
        
        self.assertEqual(ticket, 0)
        self.assertEqual(fund.get_shares("Alice"), 50)
        self.assertEqual(fund.get_total_shares(), 50)
        
    def test_fulfill_redeem(self):
        fund = FundTestHarness()
        fund.init()
        fund.set_nav(1_000_000, 1_000_000)
        
        fund.deposit(100_000_000)  # 100 shares
        ticket = fund.request_redeem(50, "Alice")
        
        fund.fulfill_redeem(ticket)
        
        self.assertTrue(fund.redemptions[ticket]["fulfilled"])
        
    def test_fulfill_redeem_already_fulfilled(self):
        fund = FundTestHarness()
        fund.init()
        fund.set_nav(1_000_000, 1_000_000)
        
        fund.deposit(100_000_000)
        ticket = fund.request_redeem(50, "Alice")
        fund.fulfill_redeem(ticket)
        
        with self.assertRaises(ValueError):
            fund.fulfill_redeem(ticket)


class TestQueries(unittest.TestCase):
    
    def test_get_all_assets(self):
        fund = FundTestHarness()
        fund.init()
        
        fund.report_nav(
            symbols=["dTSLA", "dNVDA"],
            quantities=[100_000_000, 50_000_000],
            prices=[250_000_000_000, 500_000_000_000],
            usdc_balance=100_000_000
        )
        
        assets = fund.get_all_assets()
        self.assertGreaterEqual(len(assets), 2)


class TestEdgeCases(unittest.TestCase):
    
    def test_large_numbers(self):
        fund = FundTestHarness()
        fund.init()
        fund.total_shares = 1_000_000
        
        fund.report_nav(
            symbols=["dTSLA"],
            quantities=[10_000_000_000],
            prices=[250_000_000_000],
            usdc_balance=1_000_000_000_000
        )
        
        self.assertTrue(fund.nav_is_set)
        self.assertGreater(fund.nav_per_share, 0)
        
    def test_nav_scale_constant(self):
        self.assertEqual(NAV_SCALE, 1_000_000)


if __name__ == "__main__":
    unittest.main(verbosity=2)
