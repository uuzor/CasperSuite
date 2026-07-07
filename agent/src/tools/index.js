/**
 * LangChain Tools for RWA Fund Agent
 * 
 * Note: API keys should be set via environment variables, not passed as parameters.
 * These tools read from process.env for security.
 */
import 'dotenv/config';
import { tool } from '@langchain/core/tools';
import { DinariClient } from '../dinari.js';
import { BaseClient } from '../base.js';
import { CasperClient } from '../casper.js';

/**
 * Tool: Get Portfolio Holdings
 * Get current holdings from Dinari API
 */
export const getPortfolioHoldingsTool = tool(
  async ({ symbols }) => {
    const dinariApiKey = process.env.DINARI_API_KEY;
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
    
    if (!dinariApiKey || !agentPrivateKey) {
      throw new Error('DINARI_API_KEY and AGENT_PRIVATE_KEY must be set in environment');
    }
    
    const dinari = new DinariClient(dinariApiKey);
    const holdings = {};
    
    for (const symbol of symbols) {
      try {
        const balance = await dinari.getBalances(agentPrivateKey);
        const tokenBalance = balance?.find(b => b.symbol === symbol);
        if (tokenBalance) {
          holdings[symbol] = tokenBalance.available;
        }
      } catch (error) {
        console.error(`Error getting balance for ${symbol}:`, error.message);
      }
    }
    
    return JSON.stringify({ holdings, timestamp: new Date().toISOString() });
  },
  {
    name: 'get_portfolio_holdings',
    description: 'Get current holdings of dShares from Dinari for specified symbols. Reads API keys from environment variables.',
    schema: {
      type: 'object',
      properties: {
        symbols: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Array of stock symbols: TSLA, NVDA, AAPL' 
        }
      },
      required: ['symbols']
    }
  }
);

/**
 * Tool: Get Stock Prices
 * Get current prices from Dinari
 */
export const getStockPricesTool = tool(
  async ({ symbols }) => {
    const dinariApiKey = process.env.DINARI_API_KEY;
    
    if (!dinariApiKey) {
      throw new Error('DINARI_API_KEY must be set in environment');
    }
    
    const dinari = new DinariClient(dinariApiKey);
    const prices = await dinari.getPrices(symbols);
    
    return JSON.stringify({ prices, timestamp: new Date().toISOString() });
  },
  {
    name: 'get_stock_prices',
    description: 'Get current market prices for stocks from Dinari. Reads API key from environment.',
    schema: {
      type: 'object',
      properties: {
        symbols: { 
          type: 'array', 
          items: { type: 'string' }, 
          description: 'Array of stock symbols' 
        }
      },
      required: ['symbols']
    }
  }
);

/**
 * Tool: Report Portfolio to Base
 * Report holdings and prices to AgentPortfolioReporter on Base
 */
export const reportPortfolioTool = tool(
  async ({ holdings, prices, usdcBalance }) => {
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
    const baseRpcUrl = process.env.BASE_RPC_URL;
    const reporterAddress = process.env.AGENT_PORTFOLIO_REPORTER_ADDRESS;
    
    if (!agentPrivateKey || !baseRpcUrl || !reporterAddress) {
      throw new Error('AGENT_PRIVATE_KEY, BASE_RPC_URL, and AGENT_PORTFOLIO_REPORTER_ADDRESS must be set');
    }
    
    const base = new BaseClient(baseRpcUrl, agentPrivateKey, reporterAddress);
    
    // Report holdings
    if (holdings) {
      const stockIds = [];
      const shareAmounts = [];
      for (const [symbol, amount] of Object.entries(holdings)) {
        const { ethers } = await import('ethers');
        stockIds.push(ethers.keccak256(ethers.toUtf8Bytes(symbol)));
        shareAmounts.push(BigInt(amount));
      }
      await base.reportBatchHoldings(stockIds, shareAmounts);
    }
    
    // Report prices
    if (prices) {
      await base.setBatchPrices(prices);
    }
    
    // Report USDC balance
    if (usdcBalance) {
      await base.reportUsdcBalance(BigInt(usdcBalance));
    }
    
    const totalValue = await base.getTotalValue();
    return JSON.stringify({ 
      success: true, 
      totalValue: totalValue.toString(),
      timestamp: new Date().toISOString()
    });
  },
  {
    name: 'report_portfolio_to_base',
    description: 'Report portfolio data to the AgentPortfolioReporter contract on Base. Reads config from environment.',
    schema: {
      type: 'object',
      properties: {
        holdings: { type: 'object', description: 'Holdings object { symbol: amount }' },
        prices: { type: 'object', description: 'Prices object { symbol: priceScaled }' },
        usdcBalance: { type: 'number', description: 'USDC balance (6 decimals)' }
      }
    }
  }
);

/**
 * Tool: Push NAV to Casper
 * Calculate and prepare NAV for Casper Fund contract
 */
export const pushNavToCasperTool = tool(
  async ({ symbols, quantities, prices, usdcBalance }) => {
    const casperRpcUrl = process.env.CASPER_RPC_URL;
    const fundContractHash = process.env.FUND_CONTRACT_HASH;
    
    if (!casperRpcUrl || !fundContractHash) {
      throw new Error('CASPER_RPC_URL and FUND_CONTRACT_HASH must be set');
    }
    
    const casper = new CasperClient(casperRpcUrl);
    
    // Get total shares
    const totalShares = await casper.getTotalShares(fundContractHash);
    
    // Calculate total value (in 1e8 scale)
    let totalValue = 0;
    for (let i = 0; i < symbols.length; i++) {
      const value = (quantities[i] * prices[i]) / 1e8;
      totalValue += value;
    }
    totalValue += usdcBalance * 100;
    
    // Calculate NAV per share
    const navPerShare = totalShares > 0 
      ? (totalValue * 1e6) / totalShares 
      : 1e6;
    
    return JSON.stringify({
      symbols,
      quantities,
      prices,
      usdcBalance,
      totalValue,
      navPerShare,
      totalShares,
      timestamp: new Date().toISOString(),
      note: 'Deploy signing requires ORACLE_PRIVATE_KEY - implement with casper-js-sdk'
    });
  },
  {
    name: 'push_nav_to_casper',
    description: 'Calculate NAV from portfolio data. Reads config from environment.',
    schema: {
      type: 'object',
      properties: {
        symbols: { type: 'array', items: { type: 'string' }, description: 'Asset symbols' },
        quantities: { type: 'array', items: { type: 'number' }, description: 'Asset quantities' },
        prices: { type: 'array', items: { type: 'number' }, description: 'Asset prices (1e8)' },
        usdcBalance: { type: 'number', description: 'USDC balance (6 decimals)' }
      },
      required: ['symbols', 'quantities', 'prices', 'usdcBalance']
    }
  }
);

/**
 * Tool: Get Fund Status
 * Get current status from Casper Fund contract
 */
export const getFundStatusTool = tool(
  async ({}) => {
    const casperRpcUrl = process.env.CASPER_RPC_URL;
    const fundContractHash = process.env.FUND_CONTRACT_HASH;
    
    if (!casperRpcUrl || !fundContractHash) {
      throw new Error('CASPER_RPC_URL and FUND_CONTRACT_HASH must be set');
    }
    
    const casper = new CasperClient(casperRpcUrl);
    
    const nav = await casper.getNav(fundContractHash);
    const totalShares = await casper.getTotalShares(fundContractHash);
    const assets = await casper.getAssets(fundContractHash);
    
    return JSON.stringify({
      nav,
      navFormatted: `$${(nav / 1e6).toFixed(4)}`,
      totalShares,
      assets,
      timestamp: new Date().toISOString()
    });
  },
  {
    name: 'get_fund_status',
    description: 'Get current status of the Fund contract on Casper. Reads config from environment.',
    schema: {
      type: 'object',
      properties: {}
    }
  }
);

/**
 * Tool: Reconcile Dinari Orders
 * Check for filled orders
 */
export const reconcileOrdersTool = tool(
  async ({ since }) => {
    const dinariApiKey = process.env.DINARI_API_KEY;
    const agentWalletAddress = process.env.AGENT_ADDRESS;
    
    if (!dinariApiKey || !agentWalletAddress) {
      throw new Error('DINARI_API_KEY and AGENT_ADDRESS must be set');
    }
    
    const dinari = new DinariClient(dinariApiKey);
    
    const filledOrders = await dinari.getFilledOrders(agentWalletAddress, since);
    const pendingOrders = await dinari.getPendingOrders(agentWalletAddress);
    
    return JSON.stringify({
      filled: filledOrders,
      pending: pendingOrders,
      timestamp: new Date().toISOString()
    });
  },
  {
    name: 'reconcile_dinari_orders',
    description: 'Reconcile Dinari orders - check for filled orders.',
    schema: {
      type: 'object',
      properties: {
        since: { type: 'number', description: 'Unix timestamp to check from (optional)' }
      }
    }
  }
);

export const allTools = [
  getPortfolioHoldingsTool,
  getStockPricesTool,
  reportPortfolioTool,
  pushNavToCasperTool,
  getFundStatusTool,
  reconcileOrdersTool,
];
