// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../../core/resource';
import * as SplitsAPI from './splits';
import {
  SplitListForStockParams,
  SplitListForStockResponse,
  SplitListParams,
  SplitListResponse,
  Splits,
  StockSplit,
} from './splits';
import { APIPromise } from '../../../../core/api-promise';
import { RequestOptions } from '../../../../internal/request-options';
import { path } from '../../../../internal/utils/path';

export class Stocks extends APIResource {
  splits: SplitsAPI.Splits = new SplitsAPI.Splits(this._client);

  /**
   * Get a list of `Stocks`.
   *
   * @example
   * ```ts
   * const stocks = await client.v2.marketData.stocks.list();
   * ```
   */
  list(
    query: StockListParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<StockListResponse> {
    return this._client.get('/api/v2/market_data/stocks/', { query, ...options });
  }

  /**
   * Get current price for a specified `Stock`.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.marketData.stocks.retrieveCurrentPrice(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *   );
   * ```
   */
  retrieveCurrentPrice(
    stockID: string,
    options?: RequestOptions,
  ): APIPromise<StockRetrieveCurrentPriceResponse> {
    return this._client.get(path`/api/v2/market_data/stocks/${stockID}/current_price`, options);
  }

  /**
   * Get quote for a specified `Stock`.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.marketData.stocks.retrieveCurrentQuote(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *   );
   * ```
   */
  retrieveCurrentQuote(
    stockID: string,
    options?: RequestOptions,
  ): APIPromise<StockRetrieveCurrentQuoteResponse> {
    return this._client.get(path`/api/v2/market_data/stocks/${stockID}/current_quote`, options);
  }

  /**
   * Get a list of announced stock dividend details for a specified `Stock`.
   *
   * Note that this data applies only to actual stocks. Yield received for holding
   * tokenized shares may differ from this.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.marketData.stocks.retrieveDividends(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *   );
   * ```
   */
  retrieveDividends(stockID: string, options?: RequestOptions): APIPromise<StockRetrieveDividendsResponse> {
    return this._client.get(path`/api/v2/market_data/stocks/${stockID}/dividends`, options);
  }

  /**
   * Get historical price data for a specified `Stock`. Each index in the array
   * represents a single tick in a price chart.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.marketData.stocks.retrieveHistoricalPrices(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     { timespan: 'DAY' },
   *   );
   * ```
   */
  retrieveHistoricalPrices(
    stockID: string,
    query: StockRetrieveHistoricalPricesParams,
    options?: RequestOptions,
  ): APIPromise<StockRetrieveHistoricalPricesResponse> {
    return this._client.get(path`/api/v2/market_data/stocks/${stockID}/historical_prices/`, {
      query,
      ...options,
    });
  }

  /**
   * Get the most recent news articles relating to a `Stock`, including a summary of
   * the article and a link to the original source.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.marketData.stocks.retrieveNews(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *   );
   * ```
   */
  retrieveNews(
    stockID: string,
    query: StockRetrieveNewsParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<StockRetrieveNewsResponse> {
    return this._client.get(path`/api/v2/market_data/stocks/${stockID}/news`, { query, ...options });
  }
}

export interface StockListResponse {
  /**
   * List of Stock
   */
  data: Array<StockListResponse.Data>;

  /**
   * Pagination metadata
   */
  pagination_metadata: StockListResponse.PaginationMetadata;

  /**
   * Version
   */
  _sv?: 'PaginatedStockResponse:v1';
}

export namespace StockListResponse {
  /**
   * Information about stock available for trading.
   */
  export interface Data {
    /**
     * ID of the `Stock`
     */
    id: string;

    /**
     * Whether the `Stock` allows for fractional trading. If it is not fractionable,
     * Dinari only supports limit orders for the `Stock`.
     */
    is_fractionable: boolean;

    /**
     * Whether the `Stock` is available for trading.
     */
    is_tradable: boolean;

    /**
     * Company name
     */
    name: string;

    /**
     * Ticker symbol
     */
    symbol: string;

    /**
     * List of CAIP-10 formatted token addresses.
     */
    tokens: Array<string>;

    /**
     * SEC Central Index Key. Refer to
     * [this link](https://www.sec.gov/submit-filings/filer-support-resources/how-do-i-guides/understand-utilize-edgar-ciks-passphrases-access-codes)
     * for more information.
     */
    cik?: string | null;

    /**
     * Composite FIGI ID. Refer to [this link](https://www.openfigi.com/about/figi) for
     * more information.
     */
    composite_figi?: string | null;

    /**
     * CUSIP ID. Refer to [this link](https://www.cusip.com/identifiers.html) for more
     * information. A license agreement with CUSIP Global Services is required to
     * receive this value.
     */
    cusip?: string | null;

    /**
     * Description of the company and their services.
     */
    description?: string | null;

    /**
     * Name of `Stock` for application display. If defined, this supercedes the `name`
     * field for displaying the name.
     */
    display_name?: string | null;

    /**
     * URL of the company's logo. Supported formats are SVG and PNG.
     */
    logo_url?: string | null;
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

export interface StockRetrieveCurrentPriceResponse {
  /**
   * The price (fair market value) of the asset at the given time period.
   */
  price: number;

  /**
   * ID of the `Stock`
   */
  stock_id: string;

  /**
   * When the `StockPrice` was generated.
   */
  timestamp: string;

  /**
   * The change in price from the previous close.
   */
  change?: number | null;

  /**
   * The percentage change in price from the previous close.
   */
  change_percent?: number | null;

  /**
   * The close price from the given time period.
   */
  close?: number | null;

  /**
   * The highest price from the given time period
   */
  high?: number | null;

  /**
   * The lowest price from the given time period.
   */
  low?: number | null;

  /**
   * The market capitalization of the `Stock` calculated at the most recent close
   * price.
   */
  market_cap?: number | null;

  /**
   * The open price from the given time period.
   */
  open?: number | null;

  /**
   * The close price for the `Stock` from the previous trading session.
   */
  previous_close?: number | null;

  /**
   * The trading volume in shares from the given time period.
   */
  volume?: number | null;

  /**
   * The number of shares outstanding in the given time period.
   */
  weighted_shares_outstanding?: number | null;
}

/**
 * Stock Quote
 */
export interface StockRetrieveCurrentQuoteResponse {
  /**
   * The ask price. 0 if there is no active ask.
   */
  ask_price: number;

  /**
   * The ask size in shares.
   */
  ask_size: number;

  /**
   * The bid price. 0 if there is no active bid.
   */
  bid_price: number;

  /**
   * The bid size in shares.
   */
  bid_size: number;

  /**
   * ID of the `Stock`
   */
  stock_id: string;

  /**
   * When the `StockQuote` was generated.
   */
  timestamp: string;

  /**
   * Schema version
   */
  _sv?: 'StockQuote:v1';
}

export type StockRetrieveDividendsResponse =
  Array<StockRetrieveDividendsResponse.StockRetrieveDividendsResponseItem>;

export namespace StockRetrieveDividendsResponse {
  /**
   * Information about a dividend announcement for a `Stock`.
   */
  export interface StockRetrieveDividendsResponseItem {
    /**
     * Cash amount of the dividend per share owned.
     */
    cash_amount?: number | null;

    /**
     * Currency in which the dividend is paid.
     */
    currency?: string | null;

    /**
     * Type of dividend. Dividends that have been paid and/or are expected to be paid
     * on consistent schedules are denoted as `CD`. Special Cash dividends that have
     * been paid that are infrequent or unusual, and/or can not be expected to occur in
     * the future are denoted as `SC`.
     */
    dividend_type?: string | null;

    /**
     * Date on or after which a `Stock` is traded without the right to receive the next
     * dividend payment. If you purchase a `Stock` on or after the ex-dividend date,
     * you will not receive the upcoming dividend. In ISO 8601 format, YYYY-MM-DD.
     */
    ex_dividend_date?: string | null;

    /**
     * Date on which the dividend is paid out. In ISO 8601 format, YYYY-MM-DD.
     */
    pay_date?: string | null;

    /**
     * Date that the shares must be held to receive the dividend; set by the company.
     * In ISO 8601 format, YYYY-MM-DD.
     */
    record_date?: string | null;

    /**
     * Ticker symbol of the `Stock`.
     */
    ticker?: string | null;
  }
}

export type StockRetrieveHistoricalPricesResponse =
  Array<StockRetrieveHistoricalPricesResponse.StockRetrieveHistoricalPricesResponseItem>;

export namespace StockRetrieveHistoricalPricesResponse {
  /**
   * Datapoint of historical price data for a `Stock`.
   */
  export interface StockRetrieveHistoricalPricesResponseItem {
    /**
     * Close price from the given time period.
     */
    close: number;

    /**
     * Highest price from the given time period.
     */
    high: number;

    /**
     * Lowest price from the given time period.
     */
    low: number;

    /**
     * Open price from the given time period.
     */
    open: number;

    /**
     * The UNIX timestamp in seconds for the start of the aggregate window.
     */
    timestamp: number;
  }
}

export type StockRetrieveNewsResponse = Array<StockRetrieveNewsResponse.StockRetrieveNewsResponseItem>;

export namespace StockRetrieveNewsResponse {
  /**
   * A news article relating to a `Stock` which includes a summary of the article and
   * a link to the original source.
   */
  export interface StockRetrieveNewsResponseItem {
    /**
     * URL of the news article
     */
    article_url: string;

    /**
     * Description of the news article
     */
    description: string;

    /**
     * URL of the image for the news article
     */
    image_url: string;

    /**
     * Datetime when the article was published. ISO 8601 timestamp.
     */
    published_dt: string;

    /**
     * The publisher of the news article
     */
    publisher: string;

    /**
     * Mobile-friendly Accelerated Mobile Page (AMP) URL of the news article, if
     * available
     */
    amp_url?: string | null;
  }
}

export interface StockListParams {
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
   * List of `Stock` symbols to query. If not provided, all `Stocks` are returned.
   */
  symbols?: Array<string>;
}

export interface StockRetrieveHistoricalPricesParams {
  /**
   * The timespan of the historical prices to query.
   */
  timespan: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
}

export interface StockRetrieveNewsParams {
  /**
   * The number of articles to return.
   */
  limit?: number;
}

Stocks.Splits = Splits;

export declare namespace Stocks {
  export {
    type StockListResponse as StockListResponse,
    type StockRetrieveCurrentPriceResponse as StockRetrieveCurrentPriceResponse,
    type StockRetrieveCurrentQuoteResponse as StockRetrieveCurrentQuoteResponse,
    type StockRetrieveDividendsResponse as StockRetrieveDividendsResponse,
    type StockRetrieveHistoricalPricesResponse as StockRetrieveHistoricalPricesResponse,
    type StockRetrieveNewsResponse as StockRetrieveNewsResponse,
    type StockListParams as StockListParams,
    type StockRetrieveHistoricalPricesParams as StockRetrieveHistoricalPricesParams,
    type StockRetrieveNewsParams as StockRetrieveNewsParams,
  };

  export {
    Splits as Splits,
    type StockSplit as StockSplit,
    type SplitListResponse as SplitListResponse,
    type SplitListForStockResponse as SplitListForStockResponse,
    type SplitListParams as SplitListParams,
    type SplitListForStockParams as SplitListForStockParams,
  };
}
