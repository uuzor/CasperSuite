// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../../core/resource';
import * as WalletAPI from './wallet';
import { APIPromise } from '../../../../core/api-promise';
import { RequestOptions } from '../../../../internal/request-options';
import { path } from '../../../../internal/utils/path';

/**
 * **`Wallets` represent the blockchain wallet that holds the assets of an `Account`.**
 *
 * An `Account` may be connected to a single `Wallet`.
 *
 * Individual `Entities` can connect their self-custodied `Wallets` by proving ownership of the `Wallet` address.
 * For Dinari Partners, a Dinari-managed `Wallet` can be created for the Partner `Entity` in the [Dinari Partners Portal](https://Partners.dinari.com/). This may be used in omnibus accounting for self-managing customers' assets.
 */
export class External extends APIResource {
  /**
   * Connect a `Wallet` to the `Account` after verifying the signature.
   *
   * @example
   * ```ts
   * const wallet =
   *   await client.v2.accounts.wallet.external.connect(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     {
   *       chain_id: 'eip155:0',
   *       nonce: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *       signature: '0xeaF12bD1DfFd',
   *       wallet_address: 'wallet_address',
   *     },
   *   );
   * ```
   */
  connect(
    accountID: string,
    body: ExternalConnectParams,
    options?: RequestOptions,
  ): APIPromise<WalletAPI.Wallet> {
    return this._client.post(path`/api/v2/accounts/${accountID}/wallet/external`, { body, ...options });
  }

  /**
   * Get a nonce and message to be signed in order to verify `Wallet` ownership.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.accounts.wallet.external.getNonce(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     {
   *       chain_id: 'eip155:0',
   *       wallet_address: 'wallet_address',
   *     },
   *   );
   * ```
   */
  getNonce(
    accountID: string,
    query: ExternalGetNonceParams,
    options?: RequestOptions,
  ): APIPromise<ExternalGetNonceResponse> {
    return this._client.get(path`/api/v2/accounts/${accountID}/wallet/external/nonce`, { query, ...options });
  }
}

export type WalletChainID =
  | 'eip155:0'
  | 'eip155:1'
  | 'eip155:42161'
  | 'eip155:8453'
  | 'eip155:81457'
  | 'eip155:98866'
  | 'eip155:999'
  | 'eip155:43114'
  | 'eip155:11155111'
  | 'eip155:421614'
  | 'eip155:84532'
  | 'eip155:168587773'
  | 'eip155:98867'
  | 'eip155:998'
  | 'eip155:43113'
  | 'eip155:202110'
  | 'eip155:179205'
  | 'eip155:179202'
  | 'eip155:98865'
  | 'eip155:7887';

/**
 * Connection message to sign to prove ownership of the `Wallet`.
 */
export interface ExternalGetNonceResponse {
  /**
   * Message to be signed by the `Wallet`
   */
  message: string;

  /**
   * Single-use identifier
   */
  nonce: string;
}

export interface ExternalConnectParams {
  /**
   * CAIP-2 formatted chain ID of the blockchain the `Wallet` to link is on. eip155:0
   * is used for EOA wallets
   */
  chain_id: WalletChainID;

  /**
   * Nonce contained within the connection message.
   */
  nonce: string;

  /**
   * Signature payload from signing the connection message with the `Wallet`.
   */
  signature: string;

  /**
   * Address of the `Wallet`.
   */
  wallet_address: string;
}

export interface ExternalGetNonceParams {
  /**
   * CAIP-2 formatted chain ID of the blockchain the `Wallet` is on. eip155:0 is used
   * for EOA wallets
   */
  chain_id: WalletChainID;

  /**
   * Address of the `Wallet` to connect.
   */
  wallet_address: string;
}

export declare namespace External {
  export {
    type WalletChainID as WalletChainID,
    type ExternalGetNonceResponse as ExternalGetNonceResponse,
    type ExternalConnectParams as ExternalConnectParams,
    type ExternalGetNonceParams as ExternalGetNonceParams,
  };
}
