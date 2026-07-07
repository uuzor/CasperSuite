// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../../core/resource';
import { APIPromise } from '../../../../core/api-promise';
import { type Uploadable } from '../../../../core/uploads';
import { RequestOptions } from '../../../../internal/request-options';
import { multipartFormRequestOptions } from '../../../../internal/uploads';
import { path } from '../../../../internal/utils/path';

/**
 * **KYC (Know Your Customer) is a process of verifying the identity of customer `Entities`.**
 *
 * KYC is required for all customer `Entities` that transact on Dinari's platform.
 *
 * Dinari provides a managed KYC process for its Partners, which provides a convenient KYC flow URL to present to the end customer.
 *
 * For Dinari Partners that supply their own KYC data, the API provides a way to record a customer's KYC information using the Partner's KYC data. This requires an existing KYC agreement between Dinari and the Partner.
 */
export class Document extends APIResource {
  /**
   * Get uploaded documents for a KYC check
   *
   * @example
   * ```ts
   * const kycDocuments =
   *   await client.v2.entities.kyc.document.retrieve(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     { entity_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e' },
   *   );
   * ```
   */
  retrieve(
    kycID: string,
    params: DocumentRetrieveParams,
    options?: RequestOptions,
  ): APIPromise<DocumentRetrieveResponse> {
    const { entity_id } = params;
    return this._client.get(path`/api/v2/entities/${entity_id}/kyc/${kycID}/document`, options);
  }

  /**
   * Upload KYC-related documentation for partners that are provisioned to provide
   * their own KYC data.
   *
   * @example
   * ```ts
   * const kycDocument =
   *   await client.v2.entities.kyc.document.upload(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *     {
   *       entity_id: '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *       document_type: 'GOVERNMENT_ID',
   *       file: fs.createReadStream('path/to/file'),
   *     },
   *   );
   * ```
   */
  upload(kycID: string, params: DocumentUploadParams, options?: RequestOptions): APIPromise<KYCDocument> {
    const { entity_id, document_type, ...body } = params;
    return this._client.post(
      path`/api/v2/entities/${entity_id}/kyc/${kycID}/document`,
      multipartFormRequestOptions({ query: { document_type }, body, ...options }, this._client),
    );
  }
}

/**
 * A document associated with KYC for an `Entity`.
 */
export interface KYCDocument {
  /**
   * ID of the document.
   */
  id: string;

  /**
   * Type of document.
   */
  document_type: KYCDocumentType;

  /**
   * Filename of document.
   */
  filename: string;

  /**
   * Temporary URL to access the document. Expires in 1 hour.
   */
  url: string;
}

export type KYCDocumentType = 'GOVERNMENT_ID' | 'SELFIE' | 'RESIDENCY' | 'UNKNOWN';

export type DocumentRetrieveResponse = Array<KYCDocument>;

export interface DocumentRetrieveParams {
  entity_id: string;
}

export interface DocumentUploadParams {
  /**
   * Path param
   */
  entity_id: string;

  /**
   * Query param: Type of `KYCDocument` to be uploaded.
   */
  document_type: KYCDocumentType;

  /**
   * Body param: File to be uploaded. Must be a valid image or PDF file (jpg, jpeg,
   * png, pdf) less than 10MB in size.
   */
  file: Uploadable;
}

export declare namespace Document {
  export {
    type KYCDocument as KYCDocument,
    type KYCDocumentType as KYCDocumentType,
    type DocumentRetrieveResponse as DocumentRetrieveResponse,
    type DocumentRetrieveParams as DocumentRetrieveParams,
    type DocumentUploadParams as DocumentUploadParams,
  };
}
