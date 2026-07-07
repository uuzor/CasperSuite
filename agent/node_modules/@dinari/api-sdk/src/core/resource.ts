// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import type { Dinari } from '../client';

export abstract class APIResource {
  protected _client: Dinari;

  constructor(client: Dinari) {
    this._client = client;
  }
}
