// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../core/resource';
import { APIPromise } from '../../../core/api-promise';
import { RequestOptions } from '../../../internal/request-options';
import { path } from '../../../internal/utils/path';

/**
 * **Dinari provides basic market data for `Stocks` and `Alloys` that are available to transact on.**
 *
 * This data is provided on a best-effort basis and we recommend using a dedicated provider for more intensive market data needs.
 */
export class Alloys extends APIResource {
  /**
   * Returns available `Alloys` with cursor-based pagination.
   *
   * @example
   * ```ts
   * const alloys = await client.v2.marketData.alloys.list();
   * ```
   */
  list(
    query: AlloyListParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<AlloyListResponse> {
    return this._client.get('/api/v2/market_data/alloys/', { query, ...options });
  }

  /**
   * Get the current price for a specified `Alloy`.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.marketData.alloys.retrieveCurrentPrice(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *   );
   * ```
   */
  retrieveCurrentPrice(
    alloyID: string,
    options?: RequestOptions,
  ): APIPromise<AlloyRetrieveCurrentPriceResponse> {
    return this._client.get(path`/api/v2/market_data/alloys/${alloyID}/current_price`, options);
  }

  /**
   * Get historical price data for a specified `Alloy`. Each index in the array
   * represents a single tick in a price chart.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.marketData.alloys.retrieveHistoricalPrices(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     { timespan: 'DAY' },
   *   );
   * ```
   */
  retrieveHistoricalPrices(
    alloyID: string,
    query: AlloyRetrieveHistoricalPricesParams,
    options?: RequestOptions,
  ): APIPromise<AlloyRetrieveHistoricalPricesResponse> {
    return this._client.get(path`/api/v2/market_data/alloys/${alloyID}/historical_prices/`, {
      query,
      ...options,
    });
  }
}

/**
 * Paginated response containing a list of Alloys.
 */
export interface AlloyListResponse {
  /**
   * List of Alloys
   */
  data: Array<AlloyListResponse.Data>;

  /**
   * Pagination metadata
   */
  pagination_metadata: AlloyListResponse.PaginationMetadata;

  /**
   * Schema version
   */
  _sv?: 'PaginatedAlloyResponse:v1';
}

export namespace AlloyListResponse {
  /**
   * Alloy details.
   */
  export interface Data {
    /**
     * Unique identifier of the Alloy asset
     */
    id: string | null;

    /**
     * Indicates if tradable on Dinari platform
     */
    is_tradable: boolean;

    /**
     * Name of the Alloy
     */
    name: string;

    /**
     * Symbol of the Alloy
     */
    symbol: string;

    /**
     * Schema version
     */
    _sv?: 'Alloy:v1';
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

export interface AlloyRetrieveCurrentPriceResponse {
  /**
   * ID of the `Alloy` asset.
   */
  id: string;

  /**
   * Current trade price.
   */
  price: number;

  /**
   * When the price was generated.
   */
  timestamp: string;

  /**
   * Schema version
   */
  _sv?: 'AlloyPrice:v1';
}

export type AlloyRetrieveHistoricalPricesResponse =
  Array<AlloyRetrieveHistoricalPricesResponse.AlloyRetrieveHistoricalPricesResponseItem>;

export namespace AlloyRetrieveHistoricalPricesResponse {
  /**
   * Datapoint of historical price data for an `Alloy`.
   */
  export interface AlloyRetrieveHistoricalPricesResponseItem {
    /**
     * Close price from the given time period.
     */
    close: number;

    /**
     * High price from the given time period.
     */
    high: number;

    /**
     * Low price from the given time period.
     */
    low: number;

    /**
     * Open price from the given time period.
     */
    open: number;

    /**
     * UNIX timestamp in seconds for the start of the aggregate window.
     */
    timestamp: number;

    /**
     * Schema version
     */
    _sv?: 'AlloyHistoricalPriceDataPointV1:v1';
  }
}

export interface AlloyListParams {
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
   * If set, this endpoint will return Alloys that match the symbols specified
   */
  symbols?: Array<string>;
}

export interface AlloyRetrieveHistoricalPricesParams {
  /**
   * The timespan of the historical prices to query.
   */
  timespan: 'DAY' | 'WEEK';
}

export declare namespace Alloys {
  export {
    type AlloyListResponse as AlloyListResponse,
    type AlloyRetrieveCurrentPriceResponse as AlloyRetrieveCurrentPriceResponse,
    type AlloyRetrieveHistoricalPricesResponse as AlloyRetrieveHistoricalPricesResponse,
    type AlloyListParams as AlloyListParams,
    type AlloyRetrieveHistoricalPricesParams as AlloyRetrieveHistoricalPricesParams,
  };
}
