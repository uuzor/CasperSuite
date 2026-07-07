/**
 * Base Client
 * Handles interaction with AgentPortfolioReporter on Base
 */
import { ethers } from 'ethers';
import { AgentPortfolioReporter } from './abi/AgentPortfolioReporter.js';

// Dinari dShare addresses on Base
export const DINARI_TOKENS = {
  dTSLA: '0x...' , // Would need actual Dinari token address
  dNVDA: '0x...',
  dAAPL: '0x...',
};

// USDC on Base
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export class BaseClient {
  constructor(rpcUrl, privateKey, reporterAddress) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.reporterAddress = reporterAddress;
  }

  /**
   * Get contract instance
   */
  getContract() {
    return new ethers.Contract(
      this.reporterAddress,
      AgentPortfolioReporter.abi,
      this.wallet
    );
  }

  /**
   * Report holdings to the reporter
   * @param {object} holdings - { symbol: bytes32, shares: bigint }
   */
  async reportHoldings(holdings) {
    const contract = this.getContract();
    
    // Build the report
    const stockIds = [];
    const shares = [];
    
    for (const [symbol, amount] of Object.entries(holdings)) {
      stockIds.push(ethers.keccak256(ethers.toUtf8Bytes(symbol)));
      shares.push(amount);
    }
    
    const tx = await contract.reportBatchHoldings(stockIds, shares);
    await tx.wait();
    console.log('Holdings reported:', holdings);
    return tx;
  }

  /**
   * Report USDC balance
   * @param {bigint} balance - USDC balance (6 decimals)
   */
  async reportUsdcBalance(balance) {
    const contract = this.getContract();
    const tx = await contract.reportUsdcBalance(balance);
    await tx.wait();
    console.log('USDC balance reported:', ethers.formatUnits(balance, 6));
    return tx;
  }

  /**
   * Set price for a stock
   * @param {string} symbol - Stock symbol
   * @param {bigint} priceScaled - Price scaled by 1e8
   */
  async setPrice(symbol, priceScaled) {
    const contract = this.getContract();
    const stockId = ethers.keccak256(ethers.toUtf8Bytes(symbol));
    const tx = await contract.setPrice(stockId, priceScaled);
    await tx.wait();
    console.log(`Price set for ${symbol}:`, ethers.formatUnits(priceScaled, 8));
    return tx;
  }

  /**
   * Set batch prices
   * @param {object} prices - { symbol: priceScaled }
   */
  async setBatchPrices(prices) {
    const contract = this.getContract();
    
    const stockIds = [];
    const priceScaleds = [];
    
    for (const [symbol, price] of Object.entries(prices)) {
      stockIds.push(ethers.keccak256(ethers.toUtf8Bytes(symbol)));
      priceScaleds.push(price);
    }
    
    const tx = await contract.setBatchPrices(stockIds, priceScaleds);
    await tx.wait();
    console.log('Batch prices set:', prices);
    return tx;
  }

  /**
   * Get total portfolio value
   */
  async getTotalValue() {
    const contract = this.getContract();
    return contract.totalValueUsdScaled();
  }

  /**
   * Get all stocks
   */
  async getAllStocks() {
    const contract = this.getContract();
    return contract.getAllStocks();
  }

  /**
   * Get all holdings
   */
  async getAllHoldings() {
    const contract = this.getContract();
    return contract.getAllHoldings();
  }

  /**
   * Get price for a stock
   * @param {string} symbol - Stock symbol
   */
  async getPrice(symbol) {
    const contract = this.getContract();
    const stockId = ethers.keccak256(ethers.toUtf8Bytes(symbol));
    const [price, updatedAt, stale] = await contract.latestPrice(stockId);
    return { price, updatedAt, stale };
  }

  /**
   * Get USDC balance from agent wallet
   */
  async getWalletUsdcBalance() {
    const usdc = new ethers.Contract(USDC_ADDRESS, [
      'function balanceOf(address) view returns (uint256)',
    ], this.provider);
    return usdc.balanceOf(this.wallet.address);
  }

  /**
   * Get dShare balance from agent wallet
   * @param {string} symbol - Stock symbol
   */
  async getWalletDShareBalance(symbol) {
    const tokenAddress = DINARI_TOKENS[symbol];
    if (!tokenAddress) throw new Error(`Unknown token: ${symbol}`);
    
    const token = new ethers.Contract(tokenAddress, [
      'function balanceOf(address) view returns (uint256)',
    ], this.provider);
    return token.balanceOf(this.wallet.address);
  }
}
