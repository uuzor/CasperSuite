// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../core/resource';
import * as AccountsAPI from './accounts';
import {
  Account,
  AccountCreateParams,
  AccountCreateResponse,
  AccountListParams,
  AccountListResponse,
  Accounts,
  Jurisdiction,
} from './accounts';
import * as KYCAPI from './kyc/kyc';
import {
  BaselineKYCCheckData,
  KYC,
  KYCCreateManagedCheckResponse,
  KYCInfo,
  KYCStatus,
  KYCSubmitParams,
  UsKYCCheckData,
} from './kyc/kyc';
import { APIPromise } from '../../../core/api-promise';
import { RequestOptions } from '../../../internal/request-options';
import { path } from '../../../internal/utils/path';

/**
 * **`Entities` represent a business or organization that uses the API, and their customers.**
 *
 * Dinari Partners are represented as an organization `Entity` in the API, with their own accounts.
 * Individual customers of Partner `Entities` are also represented as `Entities` in the API, which are managed by the Partner `Entity`.
 */
export class Entities extends APIResource {
  accounts: AccountsAPI.Accounts = new AccountsAPI.Accounts(this._client);
  kyc: KYCAPI.KYC = new KYCAPI.KYC(this._client);

  /**
   * Create a new `Entity` to be managed by your organization. This `Entity`
   * represents an individual customer of your organization.
   *
   * @example
   * ```ts
   * const entity = await client.v2.entities.create({
   *   name: 'x',
   * });
   * ```
   */
  create(body: EntityCreateParams, options?: RequestOptions): APIPromise<EntityCreateResponse> {
    return this._client.post('/api/v2/entities/', { body, ...options });
  }

  /**
   * Update a specific customer `Entity` of your organization.
   *
   * @example
   * ```ts
   * const entity = await client.v2.entities.update(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  update(
    entityID: string,
    body: EntityUpdateParams,
    options?: RequestOptions,
  ): APIPromise<EntityUpdateResponse> {
    return this._client.patch(path`/api/v2/entities/${entityID}`, { body, ...options });
  }

  /**
   * Get a list of direct `Entities` your organization manages. These `Entities`
   * represent individual customers of your organization.
   *
   * @example
   * ```ts
   * const entities = await client.v2.entities.list();
   * ```
   */
  list(
    query: EntityListParams | null | undefined = {},
    options?: RequestOptions,
  ): APIPromise<EntityListResponse> {
    return this._client.get('/api/v2/entities/', { query, ...options });
  }

  /**
   * Get a specific customer `Entity` of your organization by their ID.
   *
   * @example
   * ```ts
   * const response = await client.v2.entities.retrieveByID(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  retrieveByID(entityID: string, options?: RequestOptions): APIPromise<EntityRetrieveByIDResponse> {
    return this._client.get(path`/api/v2/entities/${entityID}`, options);
  }

  /**
   * Get the current authenticated `Entity`, which represents your organization.
   *
   * @example
   * ```ts
   * const response = await client.v2.entities.retrieveCurrent();
   * ```
   */
  retrieveCurrent(options?: RequestOptions): APIPromise<EntityRetrieveCurrentResponse> {
    return this._client.get('/api/v2/entities/me', options);
  }
}

/**
 * Information about an `Entity`, which can be either an individual or an
 * organization.
 */
export interface Entity {
  /**
   * Unique ID of the `Entity`.
   */
  id: string;

  /**
   * Type of `Entity`. `ORGANIZATION` for Dinari Partners and `INDIVIDUAL` for their
   * individual customers.
   */
  entity_type: 'INDIVIDUAL' | 'ORGANIZATION';

  /**
   * Indicates if `Entity` completed KYC.
   */
  is_kyc_complete: boolean;

  /**
   * Name of `Entity`.
   */
  name?: string | null;

  /**
   * Nationality or home country of the `Entity`.
   */
  nationality?: string | null;

  /**
   * Case sensitive unique reference ID that you can set for the `Entity`. We
   * recommend setting this to the unique ID of the `Entity` in your system.
   */
  reference_id?: string | null;
}

/**
 * Information about an `Entity`, which can be either an individual or an
 * organization.
 */
export interface EntityCreateResponse {
  /**
   * Unique ID of the `Entity`.
   */
  id: string;

  /**
   * Type of `Entity`. `ORGANIZATION` for Dinari Partners and `INDIVIDUAL` for their
   * individual customers.
   */
  entity_type: 'INDIVIDUAL' | 'ORGANIZATION';

  /**
   * Indicates if `Entity` completed KYC.
   */
  is_kyc_complete: boolean;

  /**
   * Name of `Entity`.
   */
  name?: string | null;

  /**
   * Nationality or home country of the `Entity`.
   */
  nationality?: string | null;

  /**
   * Case sensitive unique reference ID that you can set for the `Entity`. We
   * recommend setting this to the unique ID of the `Entity` in your system.
   */
  reference_id?: string | null;
}

/**
 * Information about an `Entity`, which can be either an individual or an
 * organization.
 */
export interface EntityUpdateResponse {
  /**
   * Unique ID of the `Entity`.
   */
  id: string;

  /**
   * Type of `Entity`. `ORGANIZATION` for Dinari Partners and `INDIVIDUAL` for their
   * individual customers.
   */
  entity_type: 'INDIVIDUAL' | 'ORGANIZATION';

  /**
   * Indicates if `Entity` completed KYC.
   */
  is_kyc_complete: boolean;

  /**
   * Name of `Entity`.
   */
  name?: string | null;

  /**
   * Nationality or home country of the `Entity`.
   */
  nationality?: string | null;

  /**
   * Case sensitive unique reference ID that you can set for the `Entity`. We
   * recommend setting this to the unique ID of the `Entity` in your system.
   */
  reference_id?: string | null;
}

export interface EntityListResponse {
  /**
   * List of Entity
   */
  data: Array<Entity>;

  /**
   * Pagination metadata
   */
  pagination_metadata: EntityListResponse.PaginationMetadata;

  /**
   * Version
   */
  _sv?: 'PaginatedEntityResponse:v1';
}

export namespace EntityListResponse {
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
 * Information about an `Entity`, which can be either an individual or an
 * organization.
 */
export interface EntityRetrieveByIDResponse {
  /**
   * Unique ID of the `Entity`.
   */
  id: string;

  /**
   * Type of `Entity`. `ORGANIZATION` for Dinari Partners and `INDIVIDUAL` for their
   * individual customers.
   */
  entity_type: 'INDIVIDUAL' | 'ORGANIZATION';

  /**
   * Indicates if `Entity` completed KYC.
   */
  is_kyc_complete: boolean;

  /**
   * Name of `Entity`.
   */
  name?: string | null;

  /**
   * Nationality or home country of the `Entity`.
   */
  nationality?: string | null;

  /**
   * Case sensitive unique reference ID that you can set for the `Entity`. We
   * recommend setting this to the unique ID of the `Entity` in your system.
   */
  reference_id?: string | null;
}

/**
 * Information about an `Entity`, which can be either an individual or an
 * organization.
 */
export interface EntityRetrieveCurrentResponse {
  /**
   * Unique ID of the `Entity`.
   */
  id: string;

  /**
   * Type of `Entity`. `ORGANIZATION` for Dinari Partners and `INDIVIDUAL` for their
   * individual customers.
   */
  entity_type: 'INDIVIDUAL' | 'ORGANIZATION';

  /**
   * Indicates if `Entity` completed KYC.
   */
  is_kyc_complete: boolean;

  /**
   * Name of `Entity`.
   */
  name?: string | null;

  /**
   * Nationality or home country of the `Entity`.
   */
  nationality?: string | null;

  /**
   * Case sensitive unique reference ID that you can set for the `Entity`. We
   * recommend setting this to the unique ID of the `Entity` in your system.
   */
  reference_id?: string | null;
}

export interface EntityCreateParams {
  /**
   * Name of the `Entity`.
   */
  name: string;

  /**
   * Case sensitive unique reference ID for the `Entity`. We recommend setting this
   * to the unique ID of the `Entity` in your system.
   */
  reference_id?: string | null;
}

export interface EntityUpdateParams {
  /**
   * Case sensitive unique reference ID for the `Entity`. We recommend setting this
   * to the unique ID of the `Entity` in your system.
   */
  reference_id?: string | null;
}

export interface EntityListParams {
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
   * Case sensitive unique reference ID for the `Entity`.
   */
  reference_id?: string | null;
}

Entities.Accounts = Accounts;
Entities.KYC = KYC;

export declare namespace Entities {
  export {
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
    type Account as Account,
    type Jurisdiction as Jurisdiction,
    type AccountCreateResponse as AccountCreateResponse,
    type AccountListResponse as AccountListResponse,
    type AccountCreateParams as AccountCreateParams,
    type AccountListParams as AccountListParams,
  };

  export {
    KYC as KYC,
    type BaselineKYCCheckData as BaselineKYCCheckData,
    type KYCInfo as KYCInfo,
    type KYCStatus as KYCStatus,
    type UsKYCCheckData as UsKYCCheckData,
    type KYCCreateManagedCheckResponse as KYCCreateManagedCheckResponse,
    type KYCSubmitParams as KYCSubmitParams,
  };
}
