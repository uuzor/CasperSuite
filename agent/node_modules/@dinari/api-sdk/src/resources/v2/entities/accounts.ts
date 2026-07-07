// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../core/resource';
import { APIPromise } from '../../../core/api-promise';
import { RequestOptions } from '../../../internal/request-options';
import { path } from '../../../internal/utils/path';

/**
 * **`Accounts` represent the financial accounts of an `Entity`.**
 *
 * `Orders`, dividends, and other transactions are associated with an `Account`.
 */
export class Accounts extends APIResource {
  /**
   * Create a new `Account` for a specific `Entity`. This `Entity` represents your
   * organization itself, or an individual customer of your organization.
   *
   * @example
   * ```ts
   * const account = await client.v2.entities.accounts.create(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  create(
    entityID: string,
    body: AccountCreateParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<AccountCreateResponse> {
    return this._client.post(path`/api/v2/entities/${entityID}/accounts`, { body, ...options });
  }

  /**
   * Get a list of all `Accounts` that belong to a specific `Entity`. This `Entity`
   * represents your organization itself, or an individual customer of your
   * organization.
   *
   * @example
   * ```ts
   * const accounts = await client.v2.entities.accounts.list(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  list(
    entityID: string,
    query: AccountListParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<AccountListResponse> {
    return this._client.get(path`/api/v2/entities/${entityID}/accounts`, { query, ...options });
  }
}

/**
 * Information about an `Account` owned by an `Entity`.
 */
export interface Account {
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
  jurisdiction: 'BASELINE' | 'US';

  /**
   * ID of the brokerage account associated with the `Account`.
   */
  brokerage_account_id?: string | null;
}

export type Jurisdiction = 'BASELINE' | 'US';

/**
 * Information about an `Account` owned by an `Entity`.
 */
export interface AccountCreateResponse {
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
  jurisdiction: Jurisdiction;

  /**
   * ID of the brokerage account associated with the `Account`.
   */
  brokerage_account_id?: string | null;
}

export interface AccountListResponse {
  /**
   * List of Account
   */
  data: Array<Account>;

  /**
   * Pagination metadata
   */
  pagination_metadata: AccountListResponse.PaginationMetadata;

  /**
   * Version
   */
  _sv?: 'PaginatedAccountResponse:v1';
}

export namespace AccountListResponse {
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

export interface AccountCreateParams {
  /**
   * Jurisdiction of the `Account`.
   */
  jurisdiction?: Jurisdiction;
}

export interface AccountListParams {
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

export declare namespace Accounts {
  export {
    type Account as Account,
    type Jurisdiction as Jurisdiction,
    type AccountCreateResponse as AccountCreateResponse,
    type AccountListResponse as AccountListResponse,
    type AccountCreateParams as AccountCreateParams,
    type AccountListParams as AccountListParams,
  };
}
