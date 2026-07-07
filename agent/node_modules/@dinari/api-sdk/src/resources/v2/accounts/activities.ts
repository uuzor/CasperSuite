// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../core/resource';
import { APIPromise } from '../../../core/api-promise';
import { buildHeaders } from '../../../internal/headers';
import { RequestOptions } from '../../../internal/request-options';
import { path } from '../../../internal/utils/path';

/**
 * **`Accounts` represent the financial accounts of an `Entity`.**
 *
 * `Orders`, dividends, and other transactions are associated with an `Account`.
 */
export class Activities extends APIResource {
  /**
   * Get a list of brokerage activities tied to the specified `Account`.
   *
   * **⚠️ ALPHA: This endpoint is in early development and subject to breaking
   * changes.**
   *
   * @example
   * ```ts
   * await client.v2.accounts.activities.retrieveBrokerage(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  retrieveBrokerage(
    accountID: string,
    query: ActivityRetrieveBrokerageParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<void> {
    return this._client.get(path`/api/v2/accounts/${accountID}/activities/brokerage`, {
      query,
      ...options,
      headers: buildHeaders([{ Accept: '*/*' }, options?.headers]),
    });
  }
}

export interface ActivityRetrieveBrokerageParams {
  /**
   * The maximum number of entries to return in the response. Defaults to 100.
   */
  page_size?: number | null;

  /**
   * Pagination token. Set to the `id` field of the last Activity returned in the
   * previous page to get the next page of results.
   */
  page_token?: string | null;
}

export declare namespace Activities {
  export { type ActivityRetrieveBrokerageParams as ActivityRetrieveBrokerageParams };
}
