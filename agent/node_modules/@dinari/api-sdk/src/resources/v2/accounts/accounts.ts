// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../core/resource';
import * as AccountsAPI from './accounts';
import * as ActivitiesAPI from './activities';
import { Activities, ActivityRetrieveBrokerageParams } from './activities';
import * as OrderFulfillmentsAPI from './order-fulfillments';
import {
  Fulfillment,
  OrderFulfillmentQueryParams,
  OrderFulfillmentQueryResponse,
  OrderFulfillmentRetrieveParams,
  OrderFulfillments,
} from './order-fulfillments';
import * as OrdersAPI from './orders';
import {
  BrokerageOrderStatus,
  Order,
  OrderBatchCancelParams,
  OrderBatchCancelResponse,
  OrderCancelParams,
  OrderGetFulfillmentsParams,
  OrderGetFulfillmentsResponse,
  OrderListParams,
  OrderListResponse,
  OrderRetrieveParams,
  OrderSide,
  OrderTif,
  OrderType,
  Orders,
} from './orders';
import * as TokenTransfersAPI from './token-transfers';
import {
  TokenTransfer,
  TokenTransferCreateParams,
  TokenTransferListParams,
  TokenTransferListResponse,
  TokenTransferRetrieveParams,
  TokenTransfers,
} from './token-transfers';
import * as WithdrawalRequestsAPI from './withdrawal-requests';
import {
  WithdrawalRequest,
  WithdrawalRequestCreateParams,
  WithdrawalRequestCreateResponse,
  WithdrawalRequestListParams,
  WithdrawalRequestListResponse,
  WithdrawalRequestRetrieveParams,
  WithdrawalRequestRetrieveResponse,
  WithdrawalRequests,
} from './withdrawal-requests';
import * as WithdrawalsAPI from './withdrawals';
import {
  Withdrawal,
  WithdrawalListParams,
  WithdrawalListResponse,
  WithdrawalRetrieveParams,
  WithdrawalRetrieveResponse,
  Withdrawals,
} from './withdrawals';
import * as EntitiesAccountsAPI from '../entities/accounts';
import * as OrderRequestsAPI from './order-requests/order-requests';
import {
  CreateLimitBuyOrderInput,
  CreateLimitSellOrderInput,
  CreateMarketBuyOrderInput,
  CreateMarketSellOrderInput,
  OrderRequest,
  OrderRequestCreateLimitBuyParams,
  OrderRequestCreateLimitSellParams,
  OrderRequestCreateMarketBuyParams,
  OrderRequestCreateMarketSellParams,
  OrderRequestListParams,
  OrderRequestListResponse,
  OrderRequestRetrieveParams,
  OrderRequestStatus,
  OrderRequests,
} from './order-requests/order-requests';
import * as WalletAPI from './wallet/wallet';
import { Wallet, WalletConnectInternalParams, WalletResource } from './wallet/wallet';
import { APIPromise } from '../../../core/api-promise';
import { buildHeaders } from '../../../internal/headers';
import { RequestOptions } from '../../../internal/request-options';
import { path } from '../../../internal/utils/path';

/**
 * **`Accounts` represent the financial accounts of an `Entity`.**
 *
 * `Orders`, dividends, and other transactions are associated with an `Account`.
 */
export class Accounts extends APIResource {
  wallet: WalletAPI.WalletResource = new WalletAPI.WalletResource(this._client);
  orders: OrdersAPI.Orders = new OrdersAPI.Orders(this._client);
  orderFulfillments: OrderFulfillmentsAPI.OrderFulfillments = new OrderFulfillmentsAPI.OrderFulfillments(
    this._client,
  );
  orderRequests: OrderRequestsAPI.OrderRequests = new OrderRequestsAPI.OrderRequests(this._client);
  withdrawalRequests: WithdrawalRequestsAPI.WithdrawalRequests = new WithdrawalRequestsAPI.WithdrawalRequests(
    this._client,
  );
  withdrawals: WithdrawalsAPI.Withdrawals = new WithdrawalsAPI.Withdrawals(this._client);
  tokenTransfers: TokenTransfersAPI.TokenTransfers = new TokenTransfersAPI.TokenTransfers(this._client);
  activities: ActivitiesAPI.Activities = new ActivitiesAPI.Activities(this._client);

  /**
   * Get a specific `Account` by its ID.
   *
   * @example
   * ```ts
   * const account = await client.v2.accounts.retrieve(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  retrieve(accountID: string, options?: RequestOptions): APIPromise<AccountRetrieveResponse> {
    return this._client.get(path`/api/v2/accounts/${accountID}`, options);
  }

  /**
   * Set the `Account` to be inactive. Inactive accounts cannot be used for trading.
   *
   * @example
   * ```ts
   * const response = await client.v2.accounts.deactivate(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  deactivate(accountID: string, options?: RequestOptions): APIPromise<AccountDeactivateResponse> {
    return this._client.post(path`/api/v2/accounts/${accountID}/deactivate`, options);
  }

  /**
   * Get the cash balances of the `Account`, including stablecoins and other cash
   * equivalents.
   *
   * @example
   * ```ts
   * const response = await client.v2.accounts.getCashBalances(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  getCashBalances(accountID: string, options?: RequestOptions): APIPromise<AccountGetCashBalancesResponse> {
    return this._client.get(path`/api/v2/accounts/${accountID}/cash`, options);
  }

  /**
   * Get dividend payments made to the `Account` from dividend-bearing stock
   * holdings.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.accounts.getDividendPayments(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     { end_date: '2019-12-27', start_date: '2019-12-27' },
   *   );
   * ```
   */
  getDividendPayments(
    accountID: string,
    query: AccountGetDividendPaymentsParams,
    options?: RequestOptions,
  ): APIPromise<AccountGetDividendPaymentsResponse> {
    return this._client.get(path`/api/v2/accounts/${accountID}/dividend_payments`, { query, ...options });
  }

  /**
   * Get interest payments made to the `Account` from yield-bearing cash holdings.
   *
   * Currently, the only yield-bearing stablecoin accepted by Dinari is
   * [USD+](https://usd.dinari.com/).
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.accounts.getInterestPayments(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     { end_date: '2019-12-27', start_date: '2019-12-27' },
   *   );
   * ```
   */
  getInterestPayments(
    accountID: string,
    query: AccountGetInterestPaymentsParams,
    options?: RequestOptions,
  ): APIPromise<AccountGetInterestPaymentsResponse> {
    return this._client.get(path`/api/v2/accounts/${accountID}/interest_payments`, { query, ...options });
  }

  /**
   * Get the portfolio of the `Account`, excluding cash equivalents such as
   * stablecoins.
   *
   * @example
   * ```ts
   * const response = await client.v2.accounts.getPortfolio(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  getPortfolio(
    accountID: string,
    query: AccountGetPortfolioParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<AccountGetPortfolioResponse> {
    return this._client.get(path`/api/v2/accounts/${accountID}/portfolio`, { query, ...options });
  }

  /**
   * Mints 1,000 mockUSD sandbox payment tokens to the `Wallet` connected to the
   * `Account`.
   *
   * This feature is only supported in sandbox mode.
   *
   * @example
   * ```ts
   * await client.v2.accounts.mintSandboxTokens(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  mintSandboxTokens(
    accountID: string,
    body: AccountMintSandboxTokensParams,
    options?: RequestOptions,
  ): APIPromise<void> {
    return this._client.post(path`/api/v2/accounts/${accountID}/faucet`, {
      body,
      ...options,
      headers: buildHeaders([{ Accept: '*/*' }, options?.headers]),
    });
  }
}

export type Chain =
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
 * Information about an `Account` owned by an `Entity`.
 */
export interface AccountRetrieveResponse {
  /**
   * Unique ID for the `Account`.
   */
  id: string;

  /**
   * Datetime when the `Account` was created. ISO 8601 timestamp.
   */
  created_dt: string;

  /**
   * ID for the `Entity` that owns the `Account`.
   */
  entity_id: string;

  /**
   * Indicates whether the `Account` is active.
   */
  is_active: boolean;

  /**
   * Jurisdiction of the `Account`.
   */
  jurisdiction: EntitiesAccountsAPI.Jurisdiction;

  /**
   * ID of the brokerage account associated with the `Account`.
   */
  brokerage_account_id?: string | null;
}

/**
 * Information about an `Account` owned by an `Entity`.
 */
export interface AccountDeactivateResponse {
  /**
   * Unique ID for the `Account`.
   */
  id: string;

  /**
   * Datetime when the `Account` was created. ISO 8601 timestamp.
   */
  created_dt: string;

  /**
   * ID for the `Entity` that owns the `Account`.
   */
  entity_id: string;

  /**
   * Indicates whether the `Account` is active.
   */
  is_active: boolean;

  /**
   * Jurisdiction of the `Account`.
   */
  jurisdiction: EntitiesAccountsAPI.Jurisdiction;

  /**
   * ID of the brokerage account associated with the `Account`.
   */
  brokerage_account_id?: string | null;
}

export type AccountGetCashBalancesResponse =
  Array<AccountGetCashBalancesResponse.AccountGetCashBalancesResponseItem>;

export namespace AccountGetCashBalancesResponse {
  /**
   * Balance of a payment token in an `Account`.
   */
  export interface AccountGetCashBalancesResponseItem {
    /**
     * Total amount of the payment token in the `Account`.
     */
    amount: number;

    /**
     * CAIP-2 chain ID of the payment token.
     */
    chain_id: AccountsAPI.Chain;

    /**
     * Symbol of the payment token.
     */
    symbol: string;

    /**
     * Address of the payment token.
     */
    token_address: string;
  }
}

export interface AccountGetDividendPaymentsResponse {
  /**
   * List of DividendPayment
   */
  data: Array<AccountGetDividendPaymentsResponse.Data>;

  /**
   * Pagination metadata
   */
  pagination_metadata: AccountGetDividendPaymentsResponse.PaginationMetadata;

  /**
   * Version
   */
  _sv?: 'PaginatedDividendPaymentResponse:v1';
}

export namespace AccountGetDividendPaymentsResponse {
  /**
   * Represents a dividend payment event for an `Account`.
   */
  export interface Data {
    /**
     * Amount of the dividend paid.
     */
    amount: number;

    /**
     * Currency in which the dividend was paid. (e.g. USD)
     */
    currency: string;

    /**
     * Date the dividend was distributed to the account. ISO 8601 format, YYYY-MM-DD.
     */
    payment_date: string;

    /**
     * ID of the `Stock` for which the dividend was paid.
     */
    stock_id: string;
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

export interface AccountGetInterestPaymentsResponse {
  /**
   * List of InterestPayment
   */
  data: Array<AccountGetInterestPaymentsResponse.Data>;

  /**
   * Pagination metadata
   */
  pagination_metadata: AccountGetInterestPaymentsResponse.PaginationMetadata;

  /**
   * Version
   */
  _sv?: 'PaginatedInterestPaymentResponse:v1';
}

export namespace AccountGetInterestPaymentsResponse {
  /**
   * An object representing an interest payment from stablecoin holdings.
   */
  export interface Data {
    /**
     * Amount of interest paid.
     */
    amount: number;

    /**
     * Currency in which the interest was paid (e.g. USD).
     */
    currency: string;

    /**
     * Date of interest payment in US Eastern time zone. ISO 8601 format, YYYY-MM-DD.
     */
    payment_date: string;
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

/**
 * Balance information of `Stock` assets in your `Account`.
 */
export interface AccountGetPortfolioResponse {
  /**
   * Balance details for all owned `Stocks`.
   */
  assets: Array<AccountGetPortfolioResponse.Asset>;
}

export namespace AccountGetPortfolioResponse {
  /**
   * Balance of a dShare in an `Account`.
   */
  export interface Asset {
    /**
     * Total amount of the dShare asset token in the `Account`.
     */
    amount: number;

    /**
     * CAIP-2 chain ID of the blockchain where the dShare asset token exists.
     */
    chain_id: AccountsAPI.Chain;

    /**
     * ID of the underlying `Stock` represented by the dShare asset token.
     */
    stock_id: string;

    /**
     * Token symbol of the dShare asset token.
     */
    symbol: string;

    /**
     * Address of the dShare asset token.
     */
    token_address: string;
  }
}

export interface AccountGetDividendPaymentsParams {
  /**
   * End date, exclusive, in US Eastern time zone. ISO 8601 format, YYYY-MM-DD.
   */
  end_date: string;

  /**
   * Start date, inclusive, in US Eastern time zone. ISO 8601 format, YYYY-MM-DD.
   */
  start_date: string;

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
   * Cursor for previous page
   */
  previous?: string | null;

  /**
   * Optional ID of the `Stock` to filter by
   */
  stock_id?: string | null;
}

export interface AccountGetInterestPaymentsParams {
  /**
   * End date, exclusive, in US Eastern time zone. ISO 8601 format, YYYY-MM-DD.
   */
  end_date: string;

  /**
   * Start date, inclusive, in US Eastern time zone. ISO 8601 format, YYYY-MM-DD.
   */
  start_date: string;

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
   * Cursor for previous page
   */
  previous?: string | null;
}

export interface AccountGetPortfolioParams {
  /**
   * The page number.
   */
  page?: number | null;

  /**
   * The number of stocks to return per page, maximum number is 200.
   */
  page_size?: number | null;
}

export interface AccountMintSandboxTokensParams {
  /**
   * CAIP-2 chain ID of blockchain in which to mint the sandbox payment tokens. If
   * none specified, defaults to eip155:421614. If the `Account` is linked to a
   * Dinari-managed `Wallet`, only eip155:42161 is allowed.
   */
  chain_id?: Chain;
}

Accounts.WalletResource = WalletResource;
Accounts.Orders = Orders;
Accounts.OrderFulfillments = OrderFulfillments;
Accounts.OrderRequests = OrderRequests;
Accounts.WithdrawalRequests = WithdrawalRequests;
Accounts.Withdrawals = Withdrawals;
Accounts.TokenTransfers = TokenTransfers;
Accounts.Activities = Activities;

export declare namespace Accounts {
  export {
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

  export {
    WalletResource as WalletResource,
    type Wallet as Wallet,
    type WalletConnectInternalParams as WalletConnectInternalParams,
  };

  export {
    Orders as Orders,
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

  export {
    OrderFulfillments as OrderFulfillments,
    type Fulfillment as Fulfillment,
    type OrderFulfillmentQueryResponse as OrderFulfillmentQueryResponse,
    type OrderFulfillmentRetrieveParams as OrderFulfillmentRetrieveParams,
    type OrderFulfillmentQueryParams as OrderFulfillmentQueryParams,
  };

  export {
    OrderRequests as OrderRequests,
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
    WithdrawalRequests as WithdrawalRequests,
    type WithdrawalRequest as WithdrawalRequest,
    type WithdrawalRequestCreateResponse as WithdrawalRequestCreateResponse,
    type WithdrawalRequestRetrieveResponse as WithdrawalRequestRetrieveResponse,
    type WithdrawalRequestListResponse as WithdrawalRequestListResponse,
    type WithdrawalRequestCreateParams as WithdrawalRequestCreateParams,
    type WithdrawalRequestRetrieveParams as WithdrawalRequestRetrieveParams,
    type WithdrawalRequestListParams as WithdrawalRequestListParams,
  };

  export {
    Withdrawals as Withdrawals,
    type Withdrawal as Withdrawal,
    type WithdrawalRetrieveResponse as WithdrawalRetrieveResponse,
    type WithdrawalListResponse as WithdrawalListResponse,
    type WithdrawalRetrieveParams as WithdrawalRetrieveParams,
    type WithdrawalListParams as WithdrawalListParams,
  };

  export {
    TokenTransfers as TokenTransfers,
    type TokenTransfer as TokenTransfer,
    type TokenTransferListResponse as TokenTransferListResponse,
    type TokenTransferCreateParams as TokenTransferCreateParams,
    type TokenTransferRetrieveParams as TokenTransferRetrieveParams,
    type TokenTransferListParams as TokenTransferListParams,
  };

  export {
    Activities as Activities,
    type ActivityRetrieveBrokerageParams as ActivityRetrieveBrokerageParams,
  };
}
