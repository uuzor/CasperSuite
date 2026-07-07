// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../../core/resource';
import * as OrdersAPI from '../orders';
import * as Eip155API from './eip155';
import {
  Eip155,
  Eip155CreatePermitParams,
  Eip155CreatePermitResponse,
  Eip155CreatePermitTransactionParams,
  Eip155CreatePermitTransactionResponse,
  Eip155OrderRequestPermitTransaction,
  Eip155SubmitParams,
  Eip155SubmitResponse,
} from './eip155';
import { APIPromise } from '../../../../core/api-promise';
import { RequestOptions } from '../../../../internal/request-options';
import { path } from '../../../../internal/utils/path';

export class OrderRequests extends APIResource {
  eip155: Eip155API.Eip155 = new Eip155API.Eip155(this._client);

  /**
   * Get a specific `OrderRequest` by its ID.
   *
   * @example
   * ```ts
   * const orderRequest =
   *   await client.v2.accounts.orderRequests.retrieve(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     { account_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
   *   );
   * ```
   */
  retrieve(
    orderRequestID: string,
    params: OrderRequestRetrieveParams,
    options?: RequestOptions,
  ): APIPromise<OrderRequest> {
    const { account_id } = params;
    return this._client.get(path`/api/v2/accounts/${account_id}/order_requests/${orderRequestID}`, options);
  }

  /**
   * Lists `OrderRequests`. Optionally `OrderRequests` can be filtered by certain
   * parameters.
   *
   * @example
   * ```ts
   * const orderRequests =
   *   await client.v2.accounts.orderRequests.list(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *   );
   * ```
   */
  list(
    accountID: string,
    query: OrderRequestListParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<OrderRequestListResponse> {
    return this._client.get(path`/api/v2/accounts/${accountID}/order_requests`, { query, ...options });
  }

  /**
   * Create a managed `OrderRequest` to place a limit buy `Order`.
   *
   * Fees for the `Order` can optionally be specified in the `OrderRequest` for DFN
   * orders in USD, supporting up to 6 decimal places
   *
   * If an `OrderRequest` with the same `client_order_id` already exists for the
   * given account, the creation call will fail.
   *
   * @example
   * ```ts
   * const orderRequest =
   *   await client.v2.accounts.orderRequests.createLimitBuy(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     { asset_quantity: 0, limit_price: 0 },
   *   );
   * ```
   */
  createLimitBuy(
    accountID: string,
    body: OrderRequestCreateLimitBuyParams,
    options?: RequestOptions,
  ): APIPromise<OrderRequest> {
    return this._client.post(path`/api/v2/accounts/${accountID}/order_requests/limit_buy`, {
      body,
      ...options,
    });
  }

  /**
   * Create a managed `OrderRequest` to place a limit sell `Order`.
   *
   * Fees for the `Order` can optionally be specified in the `OrderRequest` for DFN
   * orders in USD, supporting up to 6 decimal places
   *
   * If an `OrderRequest` with the same `client_order_id` already exists for the
   * given account, the creation call will fail.
   *
   * @example
   * ```ts
   * const orderRequest =
   *   await client.v2.accounts.orderRequests.createLimitSell(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     { asset_quantity: 0, limit_price: 0 },
   *   );
   * ```
   */
  createLimitSell(
    accountID: string,
    body: OrderRequestCreateLimitSellParams,
    options?: RequestOptions,
  ): APIPromise<OrderRequest> {
    return this._client.post(path`/api/v2/accounts/${accountID}/order_requests/limit_sell`, {
      body,
      ...options,
    });
  }

  /**
   * Create a managed `OrderRequest` to place a market buy `Order`.
   *
   * Fees for the `Order` can optionally be specified in the `OrderRequest` for DFN
   * orders in USD, supporting up to 6 decimal places
   *
   * If an `OrderRequest` with the same `client_order_id` already exists for the
   * given account, the creation call will fail.
   *
   * @example
   * ```ts
   * const orderRequest =
   *   await client.v2.accounts.orderRequests.createMarketBuy(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     { payment_amount: 0 },
   *   );
   * ```
   */
  createMarketBuy(
    accountID: string,
    body: OrderRequestCreateMarketBuyParams,
    options?: RequestOptions,
  ): APIPromise<OrderRequest> {
    return this._client.post(path`/api/v2/accounts/${accountID}/order_requests/market_buy`, {
      body,
      ...options,
    });
  }

  /**
   * Create a managed `OrderRequest` to place a market sell `Order`.
   *
   * Fees for the `Order` can optionally be specified in the `OrderRequest` for DFN
   * orders in USD, supporting up to 6 decimal places
   *
   * If an `OrderRequest` with the same `client_order_id` already exists for the
   * given account, the creation call will fail.
   *
   * @example
   * ```ts
   * const orderRequest =
   *   await client.v2.accounts.orderRequests.createMarketSell(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     { asset_quantity: 0 },
   *   );
   * ```
   */
  createMarketSell(
    accountID: string,
    body: OrderRequestCreateMarketSellParams,
    options?: RequestOptions,
  ): APIPromise<OrderRequest> {
    return this._client.post(path`/api/v2/accounts/${accountID}/order_requests/market_sell`, {
      body,
      ...options,
    });
  }
}

/**
 * Input parameters for creating a limit buy `OrderRequest`.
 */
export interface CreateLimitBuyOrderInput {
  /**
   * Amount of dShare asset involved. Required for limit `Order Requests` and market
   * sell `Order Requests`. Must be a positive number with a precision of up to 4
   * decimal places.
   */
  asset_quantity: number;

  /**
   * Price at which to execute the order. Must be a positive number with a precision
   * of up to 2 decimal places.
   */
  limit_price: number;

  /**
   * ID of `Alloy`.
   */
  alloy_id?: string | null;

  /**
   * Customer-supplied ID to map this order to an order in their own systems. Must be
   * unique within the entity.
   */
  client_order_id?: string | null;

  /**
   * Optional fee amount associated with `Order` in USD for DFN orders. Must be a
   * positive number with a precision of up to 6 decimal places.
   */
  fee?: number | null;

  /**
   * Address of the payment token to be used for the payment of the order. If not
   * provided, the default payment token (USD+) will be used.
   */
  payment_token_address?: string | null;

  /**
   * ID of `Account` to receive the `Order`.
   */
  recipient_account_id?: string | null;

  /**
   * ID of `Stock`.
   */
  stock_id?: string | null;
}

/**
 * Input parameters for creating a limit sell `OrderRequest`.
 */
export interface CreateLimitSellOrderInput {
  /**
   * Amount of dShare asset involved. Required for limit `Order Requests` and market
   * sell `Order Requests`. Must be a positive number with a precision of up to 4
   * decimal places.
   */
  asset_quantity: number;

  /**
   * Price at which to execute the order. Must be a positive number with a precision
   * of up to 2 decimal places.
   */
  limit_price: number;

  /**
   * ID of `Alloy`.
   */
  alloy_id?: string | null;

  /**
   * Customer-supplied ID to map this order to an order in their own systems. Must be
   * unique within the entity.
   */
  client_order_id?: string | null;

  /**
   * Optional fee amount associated with `Order` in USD for DFN orders. Must be a
   * positive number with a precision of up to 6 decimal places.
   */
  fee?: number | null;

  /**
   * Address of the payment token to be used for the sell order. If not provided, the
   * default payment token (USD+) will be used. Should only be specified if
   * `recipient_account_id` for a non-managed wallet account is also provided.
   */
  payment_token_address?: string | null;

  /**
   * ID of `Account` to receive the `Order`.
   */
  recipient_account_id?: string | null;

  /**
   * ID of `Stock`.
   */
  stock_id?: string | null;
}

/**
 * Input parameters for creating a market buy `OrderRequest`.
 */
export interface CreateMarketBuyOrderInput {
  /**
   * Amount of currency (USD for US equities and ETFs) to pay for the order. Must be
   * a positive number with a precision of up to 2 decimal places.
   */
  payment_amount: number;

  /**
   * ID of `Alloy`.
   */
  alloy_id?: string | null;

  /**
   * Customer-supplied ID to map this order to an order in their own systems. Must be
   * unique within the entity.
   */
  client_order_id?: string | null;

  /**
   * Optional fee amount associated with `Order` in USD for DFN orders. Must be a
   * positive number with a precision of up to 6 decimal places.
   */
  fee?: number | null;

  /**
   * Address of the payment token to be used for the payment of the order. If not
   * provided, the default payment token (USD+) will be used.
   */
  payment_token_address?: string | null;

  /**
   * ID of `Account` to receive the `Order`.
   */
  recipient_account_id?: string | null;

  /**
   * ID of `Stock`.
   */
  stock_id?: string | null;
}

/**
 * Input parameters for creating a market sell `OrderRequest`.
 */
export interface CreateMarketSellOrderInput {
  /**
   * Quantity of shares to trade. Must be a positive number with a precision of up to
   * 6 decimal places.
   */
  asset_quantity: number;

  /**
   * ID of `Alloy`.
   */
  alloy_id?: string | null;

  /**
   * Customer-supplied ID to map this order to an order in their own systems. Must be
   * unique within the entity.
   */
  client_order_id?: string | null;

  /**
   * Optional fee amount associated with `Order` in USD for DFN orders. Must be a
   * positive number with a precision of up to 6 decimal places.
   */
  fee?: number | null;

  /**
   * Address of the payment token to be used for the sell order. If not provided, the
   * default payment token (USD+) will be used. Should only be specified if
   * `recipient_account_id` for a non-managed wallet account is also provided.
   */
  payment_token_address?: string | null;

  /**
   * ID of `Account` to receive the `Order`.
   */
  recipient_account_id?: string | null;

  /**
   * ID of `Stock`.
   */
  stock_id?: string | null;
}

/**
 * A request to create an `Order`.
 *
 * An `OrderRequest` is created when a user places an order through the Dinari API.
 * The `OrderRequest` is then fulfilled by creating an `Order` on-chain.
 *
 * The `OrderRequest` is a record of the user's intent to place an order, while the
 * `Order` is the actual transaction that occurs on the blockchain.
 */
export interface OrderRequest {
  /**
   * ID of `OrderRequest`. This is the primary identifier for the `/order_requests`
   * routes.
   */
  id: string;

  /**
   * ID of `Account` placing the `OrderRequest`.
   */
  account_id: string;

  /**
   * Datetime at which the `OrderRequest` was created. ISO 8601 timestamp.
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
   * Status of `OrderRequest`. Possible values:
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
  status: OrderRequestStatus;

  /**
   * Reason for the order cancellation if the order status is CANCELLED
   */
  cancel_message?: string | null;

  /**
   * Customer-supplied ID to map this `OrderRequest` to an order in their own
   * systems.
   */
  client_order_id?: string | null;

  /**
   * ID of `Order` created from the `OrderRequest`. This is the primary identifier
   * for the `/orders` routes.
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

export type OrderRequestStatus =
  | 'QUOTED'
  | 'PENDING'
  | 'PENDING_BRIDGE'
  | 'SUBMITTED'
  | 'ERROR'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REJECTED';

export interface OrderRequestListResponse {
  /**
   * List of AccountOrder
   */
  data: Array<OrderRequestListResponse.Data>;

  /**
   * Pagination metadata
   */
  pagination_metadata: OrderRequestListResponse.PaginationMetadata;

  /**
   * Version
   */
  _sv?: 'PaginatedAccountOrderRequestResponse:v1';
}

export namespace OrderRequestListResponse {
  /**
   * A request to create an `Order`.
   *
   * An `OrderRequest` is created when a user places an order through the Dinari API.
   * The `OrderRequest` is then fulfilled by creating an `Order` on-chain.
   *
   * The `OrderRequest` is a record of the user's intent to place an order, while the
   * `Order` is the actual transaction that occurs on the blockchain.
   */
  export interface Data {
    /**
     * ID of `OrderRequest`. This is the primary identifier for the `/order_requests`
     * routes.
     */
    id: string;

    /**
     * ID of `Account` placing the `OrderRequest`.
     */
    account_id: string;

    /**
     * Datetime at which the `OrderRequest` was created. ISO 8601 timestamp.
     */
    created_dt: string;

    /**
     * Indicates whether `Order` is a buy or sell.
     */
    order_side: 'BUY' | 'SELL';

    /**
     * Indicates how long `Order` is valid for.
     */
    order_tif: 'DAY' | 'GTC' | 'IOC' | 'FOK';

    /**
     * Type of `Order`.
     */
    order_type: 'MARKET' | 'LIMIT';

    /**
     * Status of `OrderRequest`. Possible values:
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
    status:
      | 'QUOTED'
      | 'PENDING'
      | 'PENDING_BRIDGE'
      | 'SUBMITTED'
      | 'ERROR'
      | 'CANCELLED'
      | 'EXPIRED'
      | 'REJECTED';

    /**
     * Reason for the order cancellation if the order status is CANCELLED
     */
    cancel_message?: string | null;

    /**
     * Customer-supplied ID to map this `OrderRequest` to an order in their own
     * systems.
     */
    client_order_id?: string | null;

    /**
     * ID of `Order` created from the `OrderRequest`. This is the primary identifier
     * for the `/orders` routes.
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

export interface OrderRequestRetrieveParams {
  account_id: string;
}

export interface OrderRequestListParams {
  /**
   * Customer-supplied ID to map this `OrderRequest` to an order in their own
   * systems.
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
   * Order ID for the `OrderRequest`
   */
  order_id?: string | null;

  /**
   * Order Request ID for the `OrderRequest`
   */
  order_request_id?: string | null;

  /**
   * Cursor for previous page
   */
  previous?: string | null;
}

export interface OrderRequestCreateLimitBuyParams {
  /**
   * Amount of dShare asset involved. Required for limit `Order Requests` and market
   * sell `Order Requests`. Must be a positive number with a precision of up to 4
   * decimal places.
   */
  asset_quantity: number;

  /**
   * Price at which to execute the order. Must be a positive number with a precision
   * of up to 2 decimal places.
   */
  limit_price: number;

  /**
   * ID of `Alloy`.
   */
  alloy_id?: string | null;

  /**
   * Customer-supplied ID to map this order to an order in their own systems. Must be
   * unique within the entity.
   */
  client_order_id?: string | null;

  /**
   * Optional fee amount associated with `Order` in USD for DFN orders. Must be a
   * positive number with a precision of up to 6 decimal places.
   */
  fee?: number | null;

  /**
   * Address of the payment token to be used for the payment of the order. If not
   * provided, the default payment token (USD+) will be used.
   */
  payment_token_address?: string | null;

  /**
   * ID of `Account` to receive the `Order`.
   */
  recipient_account_id?: string | null;

  /**
   * ID of `Stock`.
   */
  stock_id?: string | null;
}

export interface OrderRequestCreateLimitSellParams {
  /**
   * Amount of dShare asset involved. Required for limit `Order Requests` and market
   * sell `Order Requests`. Must be a positive number with a precision of up to 4
   * decimal places.
   */
  asset_quantity: number;

  /**
   * Price at which to execute the order. Must be a positive number with a precision
   * of up to 2 decimal places.
   */
  limit_price: number;

  /**
   * ID of `Alloy`.
   */
  alloy_id?: string | null;

  /**
   * Customer-supplied ID to map this order to an order in their own systems. Must be
   * unique within the entity.
   */
  client_order_id?: string | null;

  /**
   * Optional fee amount associated with `Order` in USD for DFN orders. Must be a
   * positive number with a precision of up to 6 decimal places.
   */
  fee?: number | null;

  /**
   * Address of the payment token to be used for the sell order. If not provided, the
   * default payment token (USD+) will be used. Should only be specified if
   * `recipient_account_id` for a non-managed wallet account is also provided.
   */
  payment_token_address?: string | null;

  /**
   * ID of `Account` to receive the `Order`.
   */
  recipient_account_id?: string | null;

  /**
   * ID of `Stock`.
   */
  stock_id?: string | null;
}

export interface OrderRequestCreateMarketBuyParams {
  /**
   * Amount of currency (USD for US equities and ETFs) to pay for the order. Must be
   * a positive number with a precision of up to 2 decimal places.
   */
  payment_amount: number;

  /**
   * ID of `Alloy`.
   */
  alloy_id?: string | null;

  /**
   * Customer-supplied ID to map this order to an order in their own systems. Must be
   * unique within the entity.
   */
  client_order_id?: string | null;

  /**
   * Optional fee amount associated with `Order` in USD for DFN orders. Must be a
   * positive number with a precision of up to 6 decimal places.
   */
  fee?: number | null;

  /**
   * Address of the payment token to be used for the payment of the order. If not
   * provided, the default payment token (USD+) will be used.
   */
  payment_token_address?: string | null;

  /**
   * ID of `Account` to receive the `Order`.
   */
  recipient_account_id?: string | null;

  /**
   * ID of `Stock`.
   */
  stock_id?: string | null;
}

export interface OrderRequestCreateMarketSellParams {
  /**
   * Quantity of shares to trade. Must be a positive number with a precision of up to
   * 6 decimal places.
   */
  asset_quantity: number;

  /**
   * ID of `Alloy`.
   */
  alloy_id?: string | null;

  /**
   * Customer-supplied ID to map this order to an order in their own systems. Must be
   * unique within the entity.
   */
  client_order_id?: string | null;

  /**
   * Optional fee amount associated with `Order` in USD for DFN orders. Must be a
   * positive number with a precision of up to 6 decimal places.
   */
  fee?: number | null;

  /**
   * Address of the payment token to be used for the sell order. If not provided, the
   * default payment token (USD+) will be used. Should only be specified if
   * `recipient_account_id` for a non-managed wallet account is also provided.
   */
  payment_token_address?: string | null;

  /**
   * ID of `Account` to receive the `Order`.
   */
  recipient_account_id?: string | null;

  /**
   * ID of `Stock`.
   */
  stock_id?: string | null;
}

OrderRequests.Eip155 = Eip155;

export declare namespace OrderRequests {
  export {
    type CreateLimitBuyOrderInput as CreateLimitBuyOrderInput,
    type CreateLimitSellOrderInput as CreateLimitSellOrderInput,
    type CreateMarketBuyOrderInput as CreateMarketBuyOrderInput,
    type CreateMarketSellOrderInput as CreateMarketSellOrderInput,
    type OrderRequest as OrderRequest,
    type OrderRequestStatus as OrderRequestStatus,
    type OrderRequestListResponse as OrderRequestListResponse,
    type OrderRequestRetrieveParams as OrderRequestRetrieveParams,
    type OrderRequestListParams as OrderRequestListParams,
    type OrderRequestCreateLimitBuyParams as OrderRequestCreateLimitBuyParams,
    type OrderRequestCreateLimitSellParams as OrderRequestCreateLimitSellParams,
    type OrderRequestCreateMarketBuyParams as OrderRequestCreateMarketBuyParams,
    type OrderRequestCreateMarketSellParams as OrderRequestCreateMarketSellParams,
  };

  export {
    Eip155 as Eip155,
    type Eip155OrderRequestPermitTransaction as Eip155OrderRequestPermitTransaction,
    type Eip155CreatePermitResponse as Eip155CreatePermitResponse,
    type Eip155CreatePermitTransactionResponse as Eip155CreatePermitTransactionResponse,
    type Eip155SubmitResponse as Eip155SubmitResponse,
    type Eip155CreatePermitParams as Eip155CreatePermitParams,
    type Eip155CreatePermitTransactionParams as Eip155CreatePermitTransactionParams,
    type Eip155SubmitParams as Eip155SubmitParams,
  };
}
