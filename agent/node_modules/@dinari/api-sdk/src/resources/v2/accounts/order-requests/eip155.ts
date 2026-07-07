// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../../core/resource';
import * as AccountsAPI from '../accounts';
import * as OrdersAPI from '../orders';
import * as OrderRequestsAPI from './order-requests';
import { APIPromise } from '../../../../core/api-promise';
import { RequestOptions } from '../../../../internal/request-options';
import { path } from '../../../../internal/utils/path';

/**
 * **`Order Requests` represent requests for Dinari to create `Orders` on behalf of an `Account`.**
 *
 * `Order Requests` are created when placing **proxied orders** or **managed orders**. See their respective descriptions for more details.
 */
export class Eip155 extends APIResource {
  /**
   * Generates a permit that can be signed and used to create an `OrderRequest` using
   * Dinari's EVM smart contracts.
   *
   * This is a convenience method to prepare the transactions needed to create an
   * `OrderRequest` using Dinari's EVM smart contracts. Once signed, the transactions
   * can be sent to the EVM network to create the order. Note that the fee quote is
   * already included in the transactions, so no additional fee quote lookup is
   * needed.
   *
   * Fees for the `Order` can optionally be specified in the `OrderRequest` for DFN
   * orders in USD, supporting up to 6 decimal places.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.accounts.orderRequests.eip155.createPermit(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     {
   *       chain_id: 'eip155:1',
   *       order_side: 'BUY',
   *       order_tif: 'DAY',
   *       order_type: 'MARKET',
   *       payment_token: 'payment_token',
   *     },
   *   );
   * ```
   */
  createPermit(
    accountID: string,
    body: Eip155CreatePermitParams,
    options?: RequestOptions,
  ): APIPromise<Eip155CreatePermitResponse> {
    return this._client.post(path`/api/v2/accounts/${accountID}/order_requests/eip155/permit`, {
      body,
      ...options,
    });
  }

  /**
   * Prepare a transaction to be placed on EVM. The returned structure contains the
   * necessary data to create an `EIP155Transaction` object.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.accounts.orderRequests.eip155.createPermitTransaction(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     {
   *       order_request_id:
   *         '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *       permit_signature: '0xeaF12bD1DfFd',
   *     },
   *   );
   * ```
   */
  createPermitTransaction(
    accountID: string,
    body: Eip155CreatePermitTransactionParams,
    options?: RequestOptions,
  ): APIPromise<Eip155CreatePermitTransactionResponse> {
    return this._client.post(path`/api/v2/accounts/${accountID}/order_requests/eip155/permit_transaction`, {
      body,
      ...options,
    });
  }

  /**
   * Submits a transaction for an EIP155 Order Request given the EIP155OrderRequest
   * ID and Permit Signature.
   *
   * An `EIP155OrderRequest` representing the proxied order is returned.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.accounts.orderRequests.eip155.submit(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     {
   *       order_request_id:
   *         '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *       permit_signature: '0xeaF12bD1DfFd',
   *     },
   *   );
   * ```
   */
  submit(
    accountID: string,
    body: Eip155SubmitParams,
    options?: RequestOptions,
  ): APIPromise<Eip155SubmitResponse> {
    return this._client.post(path`/api/v2/accounts/${accountID}/order_requests/eip155`, { body, ...options });
  }
}

/**
 * Input parameters for creating a proxied `EIP155OrderRequestPermitTransaction`.
 */
export interface Eip155OrderRequestPermitTransaction {
  /**
   * ID of the prepared proxied order to be submitted as a proxied order.
   */
  order_request_id: string;

  /**
   * Signature of the permit typed data, allowing Dinari to spend the payment token
   * or dShare asset token on behalf of the owner.
   */
  permit_signature: string;
}

/**
 * Token permit to be signed by the smart contract submitter.
 */
export interface Eip155CreatePermitResponse {
  /**
   * ID representing the EIP155 `OrderRequest`
   */
  order_request_id: string;

  /**
   * Token permit that is to be signed by smart contract submitter for authorizing
   * token transfer for the `OrderRequest`
   */
  permit: { [key: string]: unknown };
}

export interface Eip155CreatePermitTransactionResponse {
  /**
   * [JSON ABI](https://docs.soliditylang.org/en/v0.8.30/abi-spec.html#json) of the
   * smart contract function encoded in the transaction. Provided for informational
   * purposes.
   */
  abi: unknown;

  /**
   * Arguments to the smart contract function encoded in the transaction. Provided
   * for informational purposes.
   */
  args: unknown;

  /**
   * Smart contract address that the transaction should call.
   */
  contract_address: string;

  /**
   * Hex-encoded function call.
   */
  data: string;

  /**
   * Transaction value estimate in Wei.
   */
  value: string;
}

/**
 * A request to create an `Order`.
 *
 * An `EIP155OrderRequest` is created when a user places an order through the
 * Dinari API. The `EIP155OrderRequest` is then fulfilled by creating an `Order`
 * on-chain.
 *
 * The `EIP155OrderRequest` is a record of the user's intent to place an order,
 * while the `Order` is the actual transaction that occurs on the blockchain.
 */
export interface Eip155SubmitResponse {
  /**
   * ID of `EIP155OrderRequest`. This is the primary identifier for the
   * `/order_requests` routes.
   */
  id: string;

  /**
   * ID of `Account` placing the `EIP155OrderRequest`.
   */
  account_id: string;

  /**
   * Datetime at which the `EIP155OrderRequest` was created. ISO 8601 timestamp.
   */
  created_dt: string;

  /**
   * Indicates whether `Order` is a buy or sell.
   */
  order_side: OrdersAPI.OrderSide;

  /**
   * Indicates how long `Order` is valid for.
   */
  order_tif: OrdersAPI.OrderTif;

  /**
   * Type of `Order`.
   */
  order_type: OrdersAPI.OrderType;

  /**
   * Status of `EIP155OrderRequest`. Possible values:
   *
   * - `QUOTED`: Order request created with fee quote provided, ready for processing
   * - `PENDING`: Order request is being prepared for submission
   * - `PENDING_BRIDGE`: Order is waiting for bridge transaction to complete
   * - `SUBMITTED`: Order has been successfully submitted to the order book
   * - `ERROR`: An error occurred during order processing
   * - `CANCELLED`: Order request was cancelled
   * - `EXPIRED`: Order request expired due to deadline passing
   * - `REJECTED`: Order request was rejected
   */
  status: OrderRequestsAPI.OrderRequestStatus;

  /**
   * Reason for the order cancellation if the order status is CANCELLED
   */
  cancel_message?: string | null;

  /**
   * ID of `Order` created from the `EIP155OrderRequest`. This is the primary
   * identifier for the `/orders` routes.
   */
  order_id?: string | null;

  /**
   * ID of recipient `Account`.
   */
  recipient_account_id?: string | null;

  /**
   * Reason for the order rejection if the order status is REJECTED
   */
  reject_message?: string | null;
}

export interface Eip155CreatePermitParams {
  /**
   * CAIP-2 chain ID of the blockchain where the `Order` will be placed.
   */
  chain_id: AccountsAPI.Chain;

  /**
   * Indicates whether `Order` is a buy or sell.
   */
  order_side: OrdersAPI.OrderSide;

  /**
   * Time in force. Indicates how long `Order` is valid for.
   */
  order_tif: OrdersAPI.OrderTif;

  /**
   * Type of `Order`.
   */
  order_type: OrdersAPI.OrderType;

  /**
   * Address of payment token. Required for Accounts outside of US jurisdiction.
   * Accounts inside US jurisdiction must use USDC.
   */
  payment_token: string;

  /**
   * The ID of the `Alloy` for which the `Order` is being placed.
   */
  alloy_id?: string | null;

  /**
   * Amount of dShare asset tokens involved. Required for limit `Order Requests` and
   * market sell `Order Requests`. Must be a positive number with a precision of up
   * to 4 decimal places for limit `Order Requests` or up to 6 decimal places for
   * market sell `Order Requests`.
   */
  asset_token_quantity?: number | null;

  /**
   * Customer-supplied unique identifier to map this `Order` to an order in the
   * customer's systems.
   */
  client_order_id?: string | null;

  /**
   * Optional fee amount associated with `Order` in USD for DFN orders. Must be a
   * positive number with a precision of up to 6 decimal places.
   */
  fee?: number | null;

  /**
   * Price per asset in the asset's native currency. USD for US equities and ETFs.
   * Required for limit `Orders`.
   */
  limit_price?: number | null;

  /**
   * Amount of payment tokens involved. Required for market buy `Orders`.
   */
  payment_token_quantity?: number | null;

  /**
   * The ID of the `Stock` for which the `Order` is being placed.
   */
  stock_id?: string | null;

  /**
   * The ID of the `Token` for which the `Order` is being placed.
   */
  token_id?: string | null;
}

export interface Eip155CreatePermitTransactionParams {
  /**
   * ID of the prepared proxied order to be submitted as a proxied order.
   */
  order_request_id: string;

  /**
   * Signature of the permit typed data, allowing Dinari to spend the payment token
   * or dShare asset token on behalf of the owner.
   */
  permit_signature: string;
}

export interface Eip155SubmitParams {
  /**
   * ID of the prepared proxied order to be submitted as a proxied order.
   */
  order_request_id: string;

  /**
   * Signature of the permit typed data, allowing Dinari to spend the payment token
   * or dShare asset token on behalf of the owner.
   */
  permit_signature: string;
}

export declare namespace Eip155 {
  export {
    type Eip155OrderRequestPermitTransaction as Eip155OrderRequestPermitTransaction,
    type Eip155CreatePermitResponse as Eip155CreatePermitResponse,
    type Eip155CreatePermitTransactionResponse as Eip155CreatePermitTransactionResponse,
    type Eip155SubmitResponse as Eip155SubmitResponse,
    type Eip155CreatePermitParams as Eip155CreatePermitParams,
    type Eip155CreatePermitTransactionParams as Eip155CreatePermitTransactionParams,
    type Eip155SubmitParams as Eip155SubmitParams,
  };
}
