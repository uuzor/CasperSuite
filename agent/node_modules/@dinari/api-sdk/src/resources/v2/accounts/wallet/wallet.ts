// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../../core/resource';
import * as ExternalAPI from './external';
import {
  External,
  ExternalConnectParams,
  ExternalGetNonceParams,
  ExternalGetNonceResponse,
  WalletChainID,
} from './external';
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
export class WalletResource extends APIResource {
  external: ExternalAPI.External = new ExternalAPI.External(this._client);

  /**
   * Connect an internal `Wallet` to the `Account`.
   *
   * @example
   * ```ts
   * const wallet =
   *   await client.v2.accounts.wallet.connectInternal(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     {
   *       chain_id: 'eip155:0',
   *       wallet_address: 'wallet_address',
   *     },
   *   );
   * ```
   */
  connectInternal(
    accountID: string,
    body: WalletConnectInternalParams,
    options?: RequestOptions,
  ): APIPromise<Wallet> {
    return this._client.post(path`/api/v2/accounts/${accountID}/wallet/internal`, { body, ...options });
  }

  /**
   * Get the wallet connected to the `Account`.
   *
   * @example
   * ```ts
   * const wallet = await client.v2.accounts.wallet.get(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  get(accountID: string, options?: RequestOptions): APIPromise<Wallet> {
    return this._client.get(path`/api/v2/accounts/${accountID}/wallet`, options);
  }
}

/**
 * Information about a blockchain `Wallet`.
 */
export interface Wallet {
  /**
   * Address of the `Wallet`.
   */
  address: string;

  /**
   * CAIP-2 formatted chain ID of the blockchain the `Wallet` is on. eip155:0 is used
   * for EOA wallets
   */
  chain_id: ExternalAPI.WalletChainID;

  /**
   * Indicates whether the `Wallet` is flagged for AML violation.
   */
  is_aml_flagged: boolean;

  /**
   * Indicates whether the `Wallet` is a Dinari-managed wallet.
   */
  is_managed_wallet: boolean;
}

export interface WalletConnectInternalParams {
  /**
   * CAIP-2 formatted chain ID of the blockchain the `Wallet` to link is on. eip155:0
   * is used for EOA wallets
   */
  chain_id: ExternalAPI.WalletChainID;

  /**
   * Address of the `Wallet`.
   */
  wallet_address: string;

  /**
   * Is the linked Wallet shared or not
   */
  is_shared?: boolean | null;
}

WalletResource.External = External;

export declare namespace WalletResource {
  export { type Wallet as Wallet, type WalletConnectInternalParams as WalletConnectInternalParams };

  export {
    External as External,
    type WalletChainID as WalletChainID,
    type ExternalGetNonceResponse as ExternalGetNonceResponse,
    type ExternalConnectParams as ExternalConnectParams,
    type ExternalGetNonceParams as ExternalGetNonceParams,
  };
}
