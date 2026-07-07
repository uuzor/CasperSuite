// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../core/resource';
import * as AccountsAPI from './accounts';
import { APIPromise } from '../../../core/api-promise';
import { RequestOptions } from '../../../internal/request-options';
import { path } from '../../../internal/utils/path';

/**
 * **`Orders` represent the buying and selling of assets under an `Account`.**
 *
 * For `Accounts` using self-custodied `Wallets`, `Orders` are created and fulfilled by making calls to Dinari's smart contracts, or using the *Proxied Orders* methods.
 *
 * For `Accounts` using managed `Wallets`, `Orders` are created and fulfilled by using the `Managed Orders` methods, which then create the corresponding transactions on the blockchain.
 */
export class Orders extends APIResource {
  /**
   * Get a specific `Order` by its ID.
   *
   * @example
   * ```ts
   * const order = await client.v2.accounts.orders.retrieve(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *   { account_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
   * );
   * ```
   */
  retrieve(orderID: string, params: OrderRetrieveParams, options?: RequestOptions): APIPromise<Order> {
    const { account_id } = params;
    return this._client.get(path`/api/v2/accounts/${account_id}/orders/${orderID}`, options);
  }

  /**
   * Get a list of all `Orders` under the `Account`. Optionally `Orders` can be
   * filtered by chain ID, transaction hash, or client order ID.
   *
   * @example
   * ```ts
   * const orders = await client.v2.accounts.orders.list(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  list(
    accountID: string,
    query: OrderListParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<OrderListResponse> {
    return this._client.get(path`/api/v2/accounts/${accountID}/orders`, { query, ...options });
  }

  /**
   * Cancel multiple `Orders` by their IDs in a single request. Note that this
   * requires the `Order` IDs, not the `OrderRequest` IDs. Once you submit a
   * cancellation request, it cannot be undone. Be advised that orders with a status
   * of PENDING_FILL, PENDING_ESCROW, FILLED, REJECTED, or CANCELLED cannot be
   * cancelled.
   *
   * `Order` cancellation is not guaranteed nor is it immediate. The `Orders` may
   * still be executed if the cancellation request is not received in time.
   *
   * The response will indicate which orders were successfully queued to cancel and
   * which failed to queue. Check the status using the "Get Order by ID" endpoint to
   * confirm whether individual `Orders` have been cancelled.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.accounts.orders.batchCancel(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     { order_ids: ['182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e'] },
   *   );
   * ```
   */
  batchCancel(
    accountID: string,
    body: OrderBatchCancelParams,
    options?: RequestOptions,
  ): APIPromise<OrderBatchCancelResponse> {
    return this._client.post(path`/api/v2/accounts/${accountID}/orders/cancel`, { body, ...options });
  }

  /**
   * Cancel an `Order` by its ID. Note that this requires the `Order` ID, not the
   * `OrderRequest` ID. Once you submit a cancellation request, it cannot be undone.
   * Be advised that orders with a status of PENDING_FILL, PENDING_ESCROW, FILLED,
   * REJECTED, or CANCELLED cannot be cancelled.
   *
   * `Order` cancellation is not guaranteed nor is it immediate. The `Order` may
   * still be executed if the cancellation request is not received in time.
   *
   * Check the status using the "Get Order by ID" endpoint to confirm whether the
   * `Order` has been cancelled.
   *
   * @example
   * ```ts
   * const order = await client.v2.accounts.orders.cancel(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *   { account_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
   * );
   * ```
   */
  cancel(orderID: string, params: OrderCancelParams, options?: RequestOptions): APIPromise<Order> {
    const { account_id } = params;
    return this._client.post(path`/api/v2/accounts/${account_id}/orders/${orderID}/cancel`, options);
  }

  /**
   * Get `OrderFulfillments` for a specific `Order`.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.accounts.orders.getFulfillments(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     { account_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
   *   );
   * ```
   */
  getFulfillments(
    orderID: string,
    params: OrderGetFulfillmentsParams,
    options?: RequestOptions,
  ): APIPromise<OrderGetFulfillmentsResponse> {
    const { account_id, ...query } = params;
    return this._client.get(path`/api/v2/accounts/${account_id}/orders/${orderID}/fulfillments`, {
      query,
      ...options,
    });
  }
}

export type BrokerageOrderStatus =
  | 'PENDING_SUBMIT'
  | 'PENDING_CANCEL'
  | 'PENDING_ESCROW'
  | 'PENDING_FILL'
  | 'ESCROWED'
  | 'SUBMITTED'
  | 'CANCELLED'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'REJECTED'
  | 'REQUIRING_CONTACT'
  | 'ERROR';

export interface Order {
  /**
   * ID of the `Order`.
   */
  id: string;

  /**
   * CAIP-2 formatted chain ID of the blockchain that the `Order` transaction was run
   * on.
   */
  chain_id: AccountsAPI.Chain;

  /**
   * Datetime at which the `Order` was created. ISO 8601 timestamp.
   */
  created_dt: string;

  /**
   * Smart contract address that `Order` was created from.
   */
  order_contract_address: string;

  /**
   * Indicates whether `Order` is a buy or sell.
   */
  order_side: OrderSide;

  /**
   * Time in force. Indicates how long `Order` is valid for.
   */
  order_tif: OrderTif;

  /**
   * Transaction hash for the `Order` creation.
   */
  order_transaction_hash: string;

  /**
   * Type of `Order`.
   */
  order_type: OrderType;

  /**
   * The payment token (stablecoin) address.
   */
  payment_token: string;

  /**
   * Status of the `Order`.
   */
  status: BrokerageOrderStatus;

  /**
   * The `Alloy` ID associated with the `Order`
   */
  alloy_id?: string | null;

  /**
   * The dShare asset token address.
   */
  asset_token?: string | null;

  /**
   * Total amount of assets involved.
   */
  asset_token_quantity?: number | null;

  /**
   * Transaction hash for cancellation of `Order`, if the `Order` was cancelled.
   */
  cancel_transaction_hash?: string | null;

  /**
   * Customer-supplied unique identifier to map this `Order` to an order in the
   * customer's systems.
   */
  client_order_id?: string | null;

  /**
   * Fee amount associated with `Order`.
   */
  fee?: number | null;

  /**
   * For limit `Orders`, the price per asset, specified in the `Stock`'s native
   * currency (USD for US equities and ETFs).
   */
  limit_price?: number | null;

  /**
   * Order Request ID for the `Order`
   */
  order_request_id?: string | null;

  /**
   * Total amount of payment involved.
   */
  payment_token_quantity?: number | null;

  /**
   * The `Stock` ID associated with the `Order`
   */
  stock_id?: string | null;
}

export type OrderSide = 'BUY' | 'SELL';

export type OrderTif = 'DAY' | 'GTC' | 'IOC' | 'FOK';

export type OrderType = 'MARKET' | 'LIMIT';

export interface OrderListResponse {
  /**
   * List of AccountOrder
   */
  data: Array<OrderListResponse.Data>;

  /**
   * Pagination metadata
   */
  pagination_metadata: OrderListResponse.PaginationMetadata;

  /**
   * Version
   */
  _sv?: 'PaginatedAccountOrderResponse:v1';
}

export namespace OrderListResponse {
  export interface Data {
    /**
     * ID of the `Order`.
     */
    id: string;

    /**
     * CAIP-2 formatted chain ID of the blockchain that the `Order` transaction was run
     * on.
     */
    chain_id: string;

    /**
     * Datetime at which the `Order` was created. ISO 8601 timestamp.
     */
    created_dt: string;

    /**
     * Smart contract address that `Order` was created from.
     */
    order_contract_address: string;

    /**
     * Indicates whether `Order` is a buy or sell.
     */
    order_side: 'BUY' | 'SELL';

    /**
     * Time in force. Indicates how long `Order` is valid for.
     */
    order_tif: 'DAY' | 'GTC' | 'IOC' | 'FOK';

    /**
     * Transaction hash for the `Order` creation.
     */
    order_transaction_hash: string;

    /**
     * Type of `Order`.
     */
    order_type: 'MARKET' | 'LIMIT';

    /**
     * The payment token (stablecoin) address.
     */
    payment_token: string;

    /**
     * Status of the `Order`.
     */
    status:
      | 'PENDING_SUBMIT'
      | 'PENDING_CANCEL'
      | 'PENDING_ESCROW'
      | 'PENDING_FILL'
      | 'ESCROWED'
      | 'SUBMITTED'
      | 'CANCELLED'
      | 'PARTIALLY_FILLED'
      | 'FILLED'
      | 'REJECTED'
      | 'REQUIRING_CONTACT'
      | 'ERROR';

    /**
     * The `Stock` ID associated with the `Order`
     */
    stock_id: string;

    /**
     * The dShare asset token address.
     */
    asset_token?: string | null;

    /**
     * Total amount of assets involved.
     */
    asset_token_quantity?: number | null;

    /**
     * Transaction hash for cancellation of `Order`, if the `Order` was cancelled.
     */
    cancel_transaction_hash?: string | null;

    /**
     * Customer-supplied unique identifier to map this `Order` to an order in the
     * customer's systems.
     */
    client_order_id?: string | null;

    /**
     * Fee amount associated with `Order`.
     */
    fee?: number | null;

    /**
     * For limit `Orders`, the price per asset, specified in the `Stock`'s native
     * currency (USD for US equities and ETFs).
     */
    limit_price?: number | null;

    /**
     * Order Request ID for the `Order`
     */
    order_request_id?: string | null;

    /**
     * Total amount of payment involved.
     */
    payment_token_quantity?: number | null;
  }

  /**
   * Pagination metadata
   */
  export interface PaginationMetadata {
    /**
     * Cursor for next page
     */
    next?: string;

    /**
     * Cursor for previous page
     */
    previous?: string;
  }
}

export interface OrderBatchCancelResponse {
  /**
   * Orders that were queued to cancel.
   */
  cancel_queued_orders: Array<Order>;

  /**
   * Orders that could not be queued to cancel.
   */
  failed_to_cancel_orders: Array<Order>;
}

export interface OrderGetFulfillmentsResponse {
  /**
   * List of AccountOrderFulfillment
   */
  data: Array<OrderGetFulfillmentsResponse.Data>;

  /**
   * Pagination metadata
   */
  pagination_metadata: OrderGetFulfillmentsResponse.PaginationMetadata;

  /**
   * Version
   */
  _sv?: 'PaginatedAccountOrderFulfillmentResponse:v1';
}

export namespace OrderGetFulfillmentsResponse {
  /**
   * Information about a fulfillment of an `Order`. An order may be fulfilled in
   * multiple transactions.
   */
  export interface Data {
    /**
     * ID of the `OrderFulfillment`.
     */
    id: string;

    /**
     * Amount of dShare asset token filled for `BUY` orders.
     */
    asset_token_filled: number;

    /**
     * Amount of dShare asset token spent for `SELL` orders.
     */
    asset_token_spent: number;

    /**
     * Blockchain that the transaction was run on.
     */
    chain_id: string;

    /**
     * ID of the `Order` this `OrderFulfillment` is for.
     */
    order_id: string;

    /**
     * Amount of payment token filled for `SELL` orders.
     */
    payment_token_filled: number;

    /**
     * Amount of payment token spent for `BUY` orders.
     */
    payment_token_spent: number;

    /**
     * Time when transaction occurred.
     */
    transaction_dt: string;

    /**
     * Transaction hash for this fulfillment.
     */
    transaction_hash: string;

    /**
     * The `Alloy` ID associated with the `Order`
     */
    alloy_id?: string | null;

    /**
     * Fee amount, in payment tokens.
     */
    payment_token_fee?: number | null;

    /**
     * The `Stock` ID associated with the `Order`
     */
    stock_id?: string | null;
  }

  /**
   * Pagination metadata
   */
  export interface PaginationMetadata {
    /**
     * Cursor for next page
     */
    next?: string;

    /**
     * Cursor for previous page
     */
    previous?: string;
  }
}

export interface OrderRetrieveParams {
  account_id: string;
}

export interface OrderListParams {
  /**
   * CAIP-2 formatted chain ID of the blockchain the `Order` was made on.
   */
  chain_id?: string | null;

  /**
   * Customer-supplied identifier to search for `Order`s.
   */
  client_order_id?: string | null;

  /**
   * Number of results to return
   */
  limit?: number;

  /**
   * Cursor for next page
   */
  next?: string | null;

  /**
   * Sort order
   */
  order?: 'asc' | 'desc';

  /**
   * Transaction hash of the `Order`.
   */
  order_transaction_hash?: string | null;

  /**
   * Cursor for previous page
   */
  previous?: string | null;
}

export interface OrderBatchCancelParams {
  /**
   * List of `Order` IDs to cancel
   */
  order_ids: Array<string>;
}

export interface OrderCancelParams {
  account_id: string;
}

export interface OrderGetFulfillmentsParams {
  /**
   * Path param
   */
  account_id: string;

  /**
   * Query param: Number of results to return
   */
  limit?: number;

  /**
   * Query param: Cursor for next page
   */
  next?: string | null;

  /**
   * Query param: Sort order
   */
  order?: 'asc' | 'desc';

  /**
   * Query param: Cursor for previous page
   */
  previous?: string | null;
}

export declare namespace Orders {
  export {
    type BrokerageOrderStatus as BrokerageOrderStatus,
    type Order as Order,
    type OrderSide as OrderSide,
    type OrderTif as OrderTif,
    type OrderType as OrderType,
    type OrderListResponse as OrderListResponse,
    type OrderBatchCancelResponse as OrderBatchCancelResponse,
    type OrderGetFulfillmentsResponse as OrderGetFulfillmentsResponse,
    type OrderRetrieveParams as OrderRetrieveParams,
    type OrderListParams as OrderListParams,
    type OrderBatchCancelParams as OrderBatchCancelParams,
    type OrderCancelParams as OrderCancelParams,
    type OrderGetFulfillmentsParams as OrderGetFulfillmentsParams,
  };
}
