// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../../../core/resource';
import * as KYCAPI from './kyc';
import * as DocumentAPI from './document';
import {
  Document,
  DocumentRetrieveParams,
  DocumentRetrieveResponse,
  DocumentUploadParams,
  KYCDocument,
  KYCDocumentType,
} from './document';
import { APIPromise } from '../../../../core/api-promise';
import { RequestOptions } from '../../../../internal/request-options';
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
export class KYC extends APIResource {
  document: DocumentAPI.Document = new DocumentAPI.Document(this._client);

  /**
   * Get most recent KYC data of the `Entity`.
   *
   * If there are any completed KYC checks, data from the most recent one will be
   * returned. If there are no completed KYC checks, the most recent KYC check
   * information, regardless of status, will be returned.
   *
   * @example
   * ```ts
   * const kycInfo = await client.v2.entities.kyc.retrieve(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   * );
   * ```
   */
  retrieve(entityID: string, options?: RequestOptions): APIPromise<KYCInfo> {
    return this._client.get(path`/api/v2/entities/${entityID}/kyc`, options);
  }

  /**
   * Create a Dinari-managed KYC Check and get a URL for your end customer to
   * interact with.
   *
   * The URL points to a web-based KYC interface that can be presented to the end
   * customer for KYC verification. Once the customer completes this KYC flow, the
   * KYC check will be created and available in the KYC API.
   *
   * @example
   * ```ts
   * const response =
   *   await client.v2.entities.kyc.createManagedCheck(
   *     '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *   );
   * ```
   */
  createManagedCheck(entityID: string, options?: RequestOptions): APIPromise<KYCCreateManagedCheckResponse> {
    return this._client.post(path`/api/v2/entities/${entityID}/kyc/url`, options);
  }

  /**
   * Submit KYC data directly, for partners that are provisioned to provide their own
   * KYC data.
   *
   * This feature is available for everyone in sandbox mode, and for specifically
   * provisioned partners in production.
   *
   * @example
   * ```ts
   * const kycInfo = await client.v2.entities.kyc.submit(
   *   '182bd5e5-6e1a-4fe4-a799-aa6d9a6ab26e',
   *   {
   *     data: {
   *       address_country_code: 'SG',
   *       country_code: 'SG',
   *       last_name: 'Doe',
   *     },
   *     provider_name: 'x',
   *   },
   * );
   * ```
   */
  submit(entityID: string, body: KYCSubmitParams, options?: RequestOptions): APIPromise<KYCInfo> {
    return this._client.post(path`/api/v2/entities/${entityID}/kyc`, { body, ...options });
  }
}

/**
 * KYC data for an `Entity` in the BASELINE jurisdiction.
 */
export interface BaselineKYCCheckData {
  /**
   * Country of residence. ISO 3166-1 alpha 2 country code.
   */
  address_country_code: string;

  /**
   * Country of citizenship or home country of the organization. ISO 3166-1 alpha 2
   * country code.
   */
  country_code: string;

  /**
   * Last name of the person.
   */
  last_name: string;

  /**
   * City of address. Not all international addresses use this attribute.
   */
  address_city?: string | null;

  /**
   * Postal code of residence address. Not all international addresses use this
   * attribute.
   */
  address_postal_code?: string | null;

  /**
   * Street address of address.
   */
  address_street_1?: string | null;

  /**
   * Extension of address, usually apartment or suite number.
   */
  address_street_2?: string | null;

  /**
   * State or subdivision of address. In the US, this should be the unabbreviated
   * name of the state. Not all international addresses use this attribute.
   */
  address_subdivision?: string | null;

  /**
   * Birth date of the individual. In ISO 8601 format, YYYY-MM-DD.
   */
  birth_date?: string | null;

  /**
   * Email address.
   */
  email?: string | null;

  /**
   * First name of the person.
   */
  first_name?: string | null;

  /**
   * Middle name of the user
   */
  middle_name?: string | null;

  /**
   * ID number of the official tax document of the country the entity belongs to.
   */
  tax_id_number?: string | null;
}

/**
 * KYC information for an `Entity` in the baseline jurisdiction.
 */
export type KYCInfo = KYCInfo.BaselineKYC | KYCInfo.UsKYC;

export namespace KYCInfo {
  /**
   * KYC information for an `Entity` in the baseline jurisdiction.
   */
  export interface BaselineKYC {
    /**
     * ID of the KYC check.
     */
    id: string;

    /**
     * KYC check status.
     */
    status: KYCAPI.KYCStatus;

    /**
     * Datetime when the KYC was last checked. ISO 8601 timestamp.
     */
    checked_dt?: string | null;

    /**
     * KYC data for an `Entity` in the BASELINE jurisdiction.
     */
    data?: KYCAPI.BaselineKYCCheckData | null;

    /**
     * Jurisdiction of the KYC check.
     */
    jurisdiction?: 'BASELINE';
  }

  /**
   * KYC information for an `Entity` in the US jurisdiction.
   */
  export interface UsKYC {
    /**
     * ID of the KYC check.
     */
    id: string;

    /**
     * KYC check status.
     */
    status: KYCAPI.KYCStatus;

    /**
     * Datetime when the KYC was last checked. ISO 8601 timestamp.
     */
    checked_dt?: string | null;

    /**
     * KYC data for an `Entity` in the US jurisdiction.
     */
    data?: KYCAPI.UsKYCCheckData | null;

    /**
     * Jurisdiction of the KYC check.
     */
    jurisdiction?: 'US';
  }
}

export type KYCStatus = 'PASS' | 'FAIL' | 'PENDING' | 'INCOMPLETE' | 'NEEDS_REVIEW';

/**
 * KYC data for an `Entity` in the US jurisdiction.
 */
export interface UsKYCCheckData {
  /**
   * Information to affirm that the individual has read, agreed to, and signed
   * Alpaca's customer agreement, found here:
   * https://files.alpaca.markets/disclosures/library/AcctAppMarginAndCustAgmt.pdf
   */
  alpaca_customer_agreement: UsKYCCheckData.AlpacaCustomerAgreement;

  /**
   * AML check information for this individual. If any of the checks have a match,
   * provide details about the matches or hits found. The individual will be marked
   * as high risk and be subject to manual review.
   */
  aml_check: UsKYCCheckData.AmlCheck;

  /**
   * Data source citations for a KYC check.
   */
  data_citation: UsKYCCheckData.DataCitation;

  /**
   * Employment information for the individual
   */
  employment: UsKYCCheckData.Employment;

  /**
   * Financial profile information for the individual <br/><br/> Examples of liquid
   * net worth ranges: <br/> - $0 - $20,000 <br/> - $20,000 - $50,000 <br/> -
   * $50,000 - $100,000 <br/> - $100,000 - $500,000 <br/> - $500,000 - $1,000,000
   */
  financial_profile: UsKYCCheckData.FinancialProfile;

  /**
   * Identity information for the individual
   */
  identity: UsKYCCheckData.Identity;

  /**
   * Metadata about the KYC check.
   */
  kyc_metadata: UsKYCCheckData.KYCMetadata;

  /**
   * The non-professional trader property is a self-attestation for US customers that
   * can affect the metered realtime data fees. This field must be updated when if
   * there is a change in the user's attestation. This field may also be modified by
   * Dinari compliance team. For more information, please see the US Customers
   * Integration Guide.
   */
  non_professional_trader_attestation: UsKYCCheckData.NonProfessionalTraderAttestation;

  /**
   * Risk information about the individual <br/><br/> Fields denote if the account
   * owner falls under each category defined by FINRA rules. If any of the answers is
   * true (yes), additional verifications may be required before US account approval.
   */
  risk_disclosure: UsKYCCheckData.RiskDisclosure;

  /**
   * Information for a trusted contact person for the individual. More information:
   * <br/> -
   * <a href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-trusted-contact" target="_blank" rel="noopener noreferrer">Investor.gov -
   * Trusted Contact</a> <br/> -
   * <a href="https://www.finra.org/investors/insights/trusted-contact" target="_blank" rel="noopener noreferrer">FINRA -
   * Trusted Contact</a>
   */
  trusted_contact: UsKYCCheckData.TrustedContact;

  /**
   * US immigration information for this individual. Required if the individual is
   * not a US citizen.
   */
  us_immigration_info?: UsKYCCheckData.UsImmigrationInfo | null;
}

export namespace UsKYCCheckData {
  /**
   * Information to affirm that the individual has read, agreed to, and signed
   * Alpaca's customer agreement, found here:
   * https://files.alpaca.markets/disclosures/library/AcctAppMarginAndCustAgmt.pdf
   */
  export interface AlpacaCustomerAgreement {
    /**
     * The IP address from where the individual signed the agreement.
     */
    ip_address: string;

    /**
     * The timestamp the agreement was signed.
     */
    signed_at: string;
  }

  /**
   * AML check information for this individual. If any of the checks have a match,
   * provide details about the matches or hits found. The individual will be marked
   * as high risk and be subject to manual review.
   */
  export interface AmlCheck {
    /**
     * Datetime that this AML check was created.
     */
    check_created_at: string;

    /**
     * Whether there was a match in the adverse media check.
     */
    is_adverse_media_match: boolean;

    /**
     * Whether there was a match in the monitored lists check.
     */
    is_monitored_lists_match: boolean;

    /**
     * Whether there was a match in the politically exposed person (PEP) check.
     */
    is_politically_exposed_person_match: boolean;

    /**
     * Whether there was a match in the sanctions check.
     */
    is_sanctions_match: boolean;

    /**
     * If any of the checks have a match, provide details about the matches or hits
     * found.
     */
    records: Array<string>;

    /**
     * Your unique identifier for the AML check.
     */
    ref_id: string;
  }

  /**
   * Data source citations for a KYC check.
   */
  export interface DataCitation {
    /**
     * List of sources for address verification
     */
    address_sources: Array<string>;

    /**
     * List of sources for date of birth verification
     */
    date_of_birth_sources: Array<string>;

    /**
     * List of sources for tax ID verification
     */
    tax_id_sources: Array<string>;
  }

  /**
   * Employment information for the individual
   */
  export interface Employment {
    /**
     * One of the following: employed, unemployed, retired, or student.
     */
    employment_status: 'UNEMPLOYED' | 'EMPLOYED' | 'STUDENT' | 'RETIRED';

    /**
     * The employer's address if the user is employed.
     */
    employer_address?: string | null;

    /**
     * The name of the employer if the user is employed.
     */
    employer_name?: string | null;

    /**
     * The user's position if they are employed.
     */
    employment_position?: string | null;
  }

  /**
   * Financial profile information for the individual <br/><br/> Examples of liquid
   * net worth ranges: <br/> - $0 - $20,000 <br/> - $20,000 - $50,000 <br/> -
   * $50,000 - $100,000 <br/> - $100,000 - $500,000 <br/> - $500,000 - $1,000,000
   */
  export interface FinancialProfile {
    /**
     * One or more of the following: employment_income, investments, inheritance,
     * business_income, savings, family.
     */
    funding_sources: Array<
      'EMPLOYMENT_INCOME' | 'INVESTMENTS' | 'INHERITANCE' | 'BUSINESS_INCOME' | 'SAVINGS' | 'FAMILY'
    >;

    /**
     * The upper bound of the user's liquid net worth (USD).
     */
    liquid_net_worth_max: number;

    /**
     * The lower bound of the user's liquid net worth (USD). Can be 0 if max is
     * <=$20,000, but otherwise must be within an order of magnitude of the max value.
     */
    liquid_net_worth_min: number;
  }

  /**
   * Identity information for the individual
   */
  export interface Identity {
    /**
     * City of the applicant.
     */
    city: string;

    /**
     * Nationality of the applicant.
     */
    country_of_citizenship: string;

    /**
     * Country of residency of the applicant. Must be 'US'.
     */
    country_of_tax_residence: 'US';

    /**
     * Date of birth of the applicant.
     */
    date_of_birth: string;

    /**
     * Email address of the applicant.
     */
    email_address: string;

    /**
     * The last name (surname) of the user.
     */
    family_name: string;

    /**
     * The first/given name of the user.
     */
    given_name: string;

    /**
     * Phone number should include the country code, format: “+15555555555”
     */
    phone_number: string;

    /**
     * Postal code of the applicant.
     */
    postal_code: string;

    /**
     * Street address of the applicant.
     */
    street_address: string;

    /**
     * Social Security Number (SSN) or Tax Identification Number (TIN) of the
     * applicant.
     */
    tax_id: string;

    /**
     * The middle name of the user.
     */
    middle_name?: string | null;

    /**
     * State of the applicant. Required if the applicant resides in the US as a
     * 2-letter abbreviation.
     */
    state?: string | null;

    /**
     * The specific apartment number if applicable
     */
    unit?: string | null;
  }

  /**
   * Metadata about the KYC check.
   */
  export interface KYCMetadata {
    /**
     * Completion datetime of KYC check.
     */
    check_completed_at: string;

    /**
     * Start datetime of KYC check.
     */
    check_initiated_at: string;

    /**
     * IP address of applicant at time of KYC check.
     */
    ip_address: string;

    /**
     * Your unique identifier for the KYC check.
     */
    ref_id: string;
  }

  /**
   * The non-professional trader property is a self-attestation for US customers that
   * can affect the metered realtime data fees. This field must be updated when if
   * there is a change in the user's attestation. This field may also be modified by
   * Dinari compliance team. For more information, please see the US Customers
   * Integration Guide.
   */
  export interface NonProfessionalTraderAttestation {
    /**
     * Datetime when the attestation was made.
     */
    attestation_dt: string;

    /**
     * Whether the individual attests to being a non-professional trader.
     */
    is_non_professional_trader: boolean;
  }

  /**
   * Risk information about the individual <br/><br/> Fields denote if the account
   * owner falls under each category defined by FINRA rules. If any of the answers is
   * true (yes), additional verifications may be required before US account approval.
   */
  export interface RiskDisclosure {
    /**
     * If the individual's immediate family member (sibling, husband/wife, child,
     * parent) is either politically exposed or holds a control position.
     */
    immediate_family_exposed: boolean;

    /**
     * Whether the individual is affiliated with any exchanges or FINRA.
     */
    is_affiliated_exchange_or_finra: boolean;

    /**
     * Whether the individual holds a controlling position in a publicly traded
     * company, is a member of the board of directors, or has policy making abilities
     * in a publicly traded company.
     */
    is_control_person: boolean;

    /**
     * Whether the individual is politically exposed.
     */
    is_politically_exposed: boolean;
  }

  /**
   * Information for a trusted contact person for the individual. More information:
   * <br/> -
   * <a href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins-trusted-contact" target="_blank" rel="noopener noreferrer">Investor.gov -
   * Trusted Contact</a> <br/> -
   * <a href="https://www.finra.org/investors/insights/trusted-contact" target="_blank" rel="noopener noreferrer">FINRA -
   * Trusted Contact</a>
   */
  export interface TrustedContact {
    /**
     * The family name of the trusted contact
     */
    family_name: string;

    /**
     * The given name of the trusted contact
     */
    given_name: string;

    /**
     * The email address of the trusted contact. At least one of email_address or
     * phone_number is required.
     */
    email_address?: string | null;

    /**
     * The phone number of the trusted contact. At least one of email_address or
     * phone_number is required.
     */
    phone_number?: string | null;
  }

  /**
   * US immigration information for this individual. Required if the individual is
   * not a US citizen.
   */
  export interface UsImmigrationInfo {
    /**
     * Country where the individual was born.
     */
    country_of_birth: string;

    /**
     * Whether the individual is a US permanent resident (green card holder).
     */
    is_permanent_resident: boolean;

    /**
     * Date the individual is scheduled to leave the US. Required for B1 and B2 visas.
     */
    departure_from_us_date?: string | null;

    /**
     * Expiration date of the visa. Required if visa_type is provided.
     */
    visa_expiration_date?: string | null;

    /**
     * Type of visa the individual holds. Required if not a permanent resident.
     */
    visa_type?:
      | 'B1'
      | 'B2'
      | 'DACA'
      | 'E1'
      | 'E2'
      | 'E3'
      | 'F1'
      | 'G4'
      | 'H1B'
      | 'J1'
      | 'L1'
      | 'Other'
      | 'O1'
      | 'TN1';
  }
}

/**
 * URL for a managed KYC flow for an `Entity`.
 */
export interface KYCCreateManagedCheckResponse {
  /**
   * URL of a managed KYC flow interface for the `Entity`.
   */
  embed_url: string;

  /**
   * Datetime at which the KYC request will expired. ISO 8601 timestamp.
   */
  expiration_dt: string;
}

export type KYCSubmitParams = KYCSubmitParams.CreateBaselineKYCInput | KYCSubmitParams.CreateUsKYCInput;

export declare namespace KYCSubmitParams {
  export interface CreateBaselineKYCInput {
    /**
     * KYC data of the `Entity`.
     */
    data: BaselineKYCCheckData;

    /**
     * Name of the KYC provider that provided the KYC information.
     */
    provider_name: string;

    /**
     * Jurisdiction of the KYC check.
     */
    jurisdiction?: 'BASELINE';
  }

  export interface CreateUsKYCInput {
    /**
     * KYC data of the `Entity`.
     */
    data: UsKYCCheckData;

    /**
     * Name of the KYC provider that provided the KYC information.
     */
    provider_name: string;

    /**
     * Jurisdiction of the KYC check.
     */
    jurisdiction?: 'US';
  }
}

KYC.Document = Document;

export declare namespace KYC {
  export {
    type BaselineKYCCheckData as BaselineKYCCheckData,
    type KYCInfo as KYCInfo,
    type KYCStatus as KYCStatus,
    type UsKYCCheckData as UsKYCCheckData,
    type KYCCreateManagedCheckResponse as KYCCreateManagedCheckResponse,
    type KYCSubmitParams as KYCSubmitParams,
  };

  export {
    Document as Document,
    type KYCDocument as KYCDocument,
    type KYCDocumentType as KYCDocumentType,
    type DocumentRetrieveResponse as DocumentRetrieveResponse,
    type DocumentRetrieveParams as DocumentRetrieveParams,
    type DocumentUploadParams as DocumentUploadParams,
  };
}
