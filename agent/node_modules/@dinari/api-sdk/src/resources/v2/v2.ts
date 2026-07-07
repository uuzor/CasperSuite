// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../core/resource';
import * as AccountsAPI from './accounts/accounts';
import {
  AccountDeactivateResponse,
  AccountGetCashBalancesResponse,
  AccountGetDividendPaymentsParams,
  AccountGetDividendPaymentsResponse,
  AccountGetInterestPaymentsParams,
  AccountGetInterestPaymentsResponse,
  AccountGetPortfolioParams,
  AccountGetPortfolioResponse,
  AccountMintSandboxTokensParams,
  AccountRetrieveResponse,
  Accounts,
  Chain,
} from './accounts/accounts';
import * as EntitiesAPI from './entities/entities';
import {
  Entities,
  Entity,
  EntityCreateParams,
  EntityCreateResponse,
  EntityListParams,
  EntityListResponse,
  EntityRetrieveByIDResponse,
  EntityRetrieveCurrentResponse,
  EntityUpdateParams,
  EntityUpdateResponse,
} from './entities/entities';
import * as MarketDataAPI from './market-data/market-data';
import { MarketData, MarketDataRetrieveMarketHoursResponse } from './market-data/market-data';
import { APIPromise } from '../../core/api-promise';
import { RequestOptions } from '../../internal/request-options';

/**
 * **`Orders` represent the buying and selling of assets under an `Account`.**
 *
 * For `Accounts` using self-custodied `Wallets`, `Orders` are created and fulfilled by making calls to Dinari's smart contracts, or using the *Proxied Orders* methods.
 *
 * For `Accounts` using managed `Wallets`, `Orders` are created and fulfilled by using the `Managed Orders` methods, which then create the corresponding transactions on the blockchain.
 */
export class V2 extends APIResource {
  marketData: MarketDataAPI.MarketData = new MarketDataAPI.MarketData(this._client);
  entities: EntitiesAPI.Entities = new EntitiesAPI.Entities(this._client);
  accounts: AccountsAPI.Accounts = new AccountsAPI.Accounts(this._client);

  /**
   * Get a list of all `Orders` under the `Entity`. Optionally `Orders` can be
   * transaction hash or fulfillment transaction hash.
   *
   * @example
   * ```ts
   * const response = await client.v2.listOrders();
   * ```
   */
  listOrders(
    query: V2ListOrdersParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<V2ListOrdersResponse> {
    return this._client.get('/api/v2/orders/', { query, ...options });
  }
}

export interface V2ListOrdersResponse {
  /**
   * List of EntityOrder
   */
  data: Array<V2ListOrdersResponse.Data>;

  /**
   * Pagination metadata
   */
  pagination_metadata: V2ListOrdersResponse.PaginationMetadata;

  /**
   * Version
   */
  _sv?: 'PaginatedEntityOrderResponse:v1';
}

export namespace V2ListOrdersResponse {
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
     * Account ID the order was made for.
     */
    account_id?: string | null;

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
     * Entity ID of the Order
     */
    entity_id?: string | null;

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

export interface V2ListOrdersParams {
  /**
   * CAIP-2 formatted chain ID of the blockchain the `Order` was made on.
   */
  chain_id?: string | null;

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
   * Fulfillment transaction hash of the `Order`.
   */
  order_fulfillment_transaction_hash?: string | null;

  /**
   * Order Request ID for the `Order`
   */
  order_request_id?: string | null;

  /**
   * Transaction hash of the `Order`.
   */
  order_transaction_hash?: string | null;

  /**
   * Cursor for previous page
   */
  previous?: string | null;
}

V2.MarketData = MarketData;
V2.Entities = Entities;
V2.Accounts = Accounts;

export declare namespace V2 {
  export { type V2ListOrdersResponse as V2ListOrdersResponse, type V2ListOrdersParams as V2ListOrdersParams };

  export {
    MarketData as MarketData,
    type MarketDataRetrieveMarketHoursResponse as MarketDataRetrieveMarketHoursResponse,
  };

  export {
    Entities as Entities,
    type Entity as Entity,
    type EntityCreateResponse as EntityCreateResponse,
    type EntityUpdateResponse as EntityUpdateResponse,
    type EntityListResponse as EntityListResponse,
    type EntityRetrieveByIDResponse as EntityRetrieveByIDResponse,
    type EntityRetrieveCurrentResponse as EntityRetrieveCurrentResponse,
    type EntityCreateParams as EntityCreateParams,
    type EntityUpdateParams as EntityUpdateParams,
    type EntityListParams as EntityListParams,
  };

  export {
    Accounts as Accounts,
    type Chain as Chain,
    type AccountRetrieveResponse as AccountRetrieveResponse,
    type AccountDeactivateResponse as AccountDeactivateResponse,
    type AccountGetCashBalancesResponse as AccountGetCashBalancesResponse,
    type AccountGetDividendPaymentsResponse as AccountGetDividendPaymentsResponse,
    type AccountGetInterestPaymentsResponse as AccountGetInterestPaymentsResponse,
    type AccountGetPortfolioResponse as AccountGetPortfolioResponse,
    type AccountGetDividendPaymentsParams as AccountGetDividendPaymentsParams,
    type AccountGetInterestPaymentsParams as AccountGetInterestPaymentsParams,
    type AccountGetPortfolioParams as AccountGetPortfolioParams,
    type AccountMintSandboxTokensParams as AccountMintSandboxTokensParams,
  };
}
