/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';

import type { PackageClient, PackageService } from './package_service';

const createClientMock = (): jest.Mocked<PackageClient> => ({
  getInstallation: jest.fn(),
  ensureInstalledPackage: jest.fn(),
  installPackage: jest.fn(),
  installCustomIntegration: jest.fn(),
  fetchFindLatestPackage: jest.fn(),
  readBundledPackage: jest.fn(),
  getAgentPolicyConfigYAML: jest.fn(),
  getLatestPackageInfo: jest.fn(),
  getPackage: jest.fn(),
  getPackageFieldsMetadata: jest.fn(),
  getPackages: jest.fn(),
  reinstallEsAssets: jest.fn(),
  getInstalledPackages: jest.fn().mockReturnValue(Promise.resolve({ items: [], total: 0 })),
});

const createServiceMock = (): DeeplyMockedKeys<PackageService> => ({
  asScoped: jest.fn((_) => createClientMock()),
  asInternalUser: createClientMock(),
});

export const packageServiceMock = {
  createClient: createClientMock,
  create: createServiceMock,
};
