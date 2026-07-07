/**
 * Casper Client
 * Handles interaction with the Fund contract on Casper
 */
import { CasperServiceByJsonRPC } from 'casper-js-sdk';

export class CasperClient {
  constructor(rpcUrl) {
    this.rpcClient = new CasperServiceByJsonRPC(rpcUrl);
  }

  /**
   * Get account info from public key
   * @param {string} publicKeyHex - Public key in hex format
   */
  async getAccountInfo(publicKeyHex) {
    return this.rpcClient.getAccountInfo(publicKeyHex);
  }

  /**
   * Get contract state
   * @param {string} contractHash - Contract hash
   * @param {string} key - State key
   */
  async getContractState(contractHash, key) {
    const stateRootHash = await this.rpcClient.getStateRootHash();
    return this.rpcClient.getDictionaryValue(stateRootHash, contractHash, key);
  }

  /**
   * Call a contract entrypoint
   * @param {object} params - Transaction parameters
   */
  async callEntryPoint(params) {
    const {
      chainName,
      entryPoint,
      runtimeArgs,
      paymentAmount,
      senderPublicKey,
      contractHash,
      signingKey,
    } = params;

    // Build deploy
    const deployParams = {
      chainName,
      session: {
        StoredContractByHash: {
          hash: contractHash.replace('hash-', ''),
          entry_point: entryPoint,
          args: runtimeArgs,
        },
      },
      payment: {
        ModuleBytes: {
          module_bytes: '',
          args: { amount: { bytes: paymentAmount, cl_type: 'U64' } },
        },
      },
      authorizationKeys: [senderPublicKey],
    };

    return deployParams;
  }

  /**
   * Query contract state
   * @param {string} contractHash - Contract hash
   * @param {string} key - Key to query
   */
  async queryContract(contractHash, key) {
    const stateRootHash = await this.rpcClient.getStateRootHash();
    const result = await this.rpcClient.query(
      stateRootHash,
      'hash-' + contractHash.replace('hash-', ''),
      [key]
    );
    return result;
  }

  /**
   * Get NAV from Fund contract
   * @param {string} contractHash - Fund contract hash
   */
  async getNav(contractHash) {
    try {
      const result = await this.queryContract(contractHash, 'nav_per_share');
      return result.CLValue?.data?.Parsed || 0;
    } catch (error) {
      console.error('Error getting NAV:', error);
      return 0;
    }
  }

  /**
   * Get total shares from Fund contract
   * @param {string} contractHash - Fund contract hash
   */
  async getTotalShares(contractHash) {
    try {
      const result = await this.queryContract(contractHash, 'total_shares');
      return result.CLValue?.data?.Parsed || 0;
    } catch (error) {
      console.error('Error getting total shares:', error);
      return 0;
    }
  }

  /**
   * Get asset list from Fund contract
   * @param {string} contractHash - Fund contract hash
   */
  async getAssets(contractHash) {
    try {
      const result = await this.queryContract(contractHash, 'asset_symbols');
      return result.CLValue?.data?.Parsed || [];
    } catch (error) {
      console.error('Error getting assets:', error);
      return [];
    }
  }

  /**
   * Get redemption requests
   * @param {string} contractHash - Fund contract hash
   * @param {number} ticketId - Ticket ID
   */
  async getRedemption(contractHash, ticketId) {
    try {
      const key = `redemption_${ticketId}`;
      const result = await this.queryContract(contractHash, key);
      return result.CLValue?.data?.Parsed || null;
    } catch (error) {
      console.error('Error getting redemption:', error);
      return null;
    }
  }
}
