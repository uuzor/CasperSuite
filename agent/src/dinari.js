/**
 * Dinari API Client
 * Handles interaction with Dinari for dShares
 */
import { Dinari } from '@dinari/api-sdk';

export class DinariClient {
  constructor(apiKey) {
    this.client = new Dinari({ apiKey });
  }

  /**
   * Get current price for a stock
   * @param {string} symbol - Stock symbol (e.g., 'TSLA')
   */
  async getPrice(symbol) {
    try {
      const response = await this.client.orderbook.getOrderbook(symbol);
      // Dinari returns best bid/ask, we use mid price
      if (response.data?.bestBid && response.data?.bestAsk) {
        const midPrice = (response.data.bestBid + response.data.bestAsk) / 2;
        return { symbol, price: midPrice * 1e8, timestamp: Date.now() };
      }
      throw new Error('No price data available');
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get prices for multiple stocks
   * @param {string[]} symbols - Stock symbols
   */
  async getPrices(symbols) {
    const prices = {};
    await Promise.all(
      symbols.map(async (symbol) => {
        try {
          prices[symbol] = await this.getPrice(symbol);
        } catch (error) {
          console.error(`Failed to get price for ${symbol}`);
        }
      })
    );
    return prices;
  }

  /**
   * Create a buy order permit
   * @param {object} params - Order parameters
   */
  async createBuyPermit({ symbol, amount, walletAddress }) {
    try {
      const response = await this.client.order.createOrder({
        symbol,
        side: 'buy',
        type: 'market',
        quantity: amount,
        paymentToken: 'USDC',
        receiver: walletAddress,
        requester: walletAddress,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating buy permit:', error);
      throw error;
    }
  }

  /**
   * Create a sell order permit
   * @param {object} params - Order parameters
   */
  async createSellPermit({ symbol, amount, walletAddress }) {
    try {
      const response = await this.client.order.createOrder({
        symbol,
        side: 'sell',
        type: 'market',
        quantity: amount,
        paymentToken: 'USDC',
        receiver: walletAddress,
        requester: walletAddress,
      });
      return response.data;
    } catch (error) {
      console.error('Error creating sell permit:', error);
      throw error;
    }
  }

  /**
   * Get account balances
   */
  async getBalances(walletAddress) {
    try {
      const response = await this.client.account.getBalances(walletAddress);
      return response.data;
    } catch (error) {
      console.error('Error fetching balances:', error);
      throw error;
    }
  }

  /**
   * Get pending orders
   */
  async getPendingOrders(walletAddress) {
    try {
      const response = await this.client.order.getOrders(walletAddress, { status: 'pending' });
      return response.data;
    } catch (error) {
      console.error('Error fetching pending orders:', error);
      throw error;
    }
  }

  /**
   * Get filled orders (for reconciliation)
   */
  async getFilledOrders(walletAddress, since) {
    try {
      const response = await this.client.order.getOrders(walletAddress, { 
        status: 'filled',
        since 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching filled orders:', error);
      throw error;
    }
  }
}
