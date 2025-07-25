/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';

import type { PackageSpecIcon } from '../models/package_spec';
import type {
  AssetReference,
  CategorySummaryList,
  PackageList,
  PackageInfo,
  PackageUsageStats,
  InstallType,
  InstallSource,
  EpmPackageInstallStatus,
  SimpleSOAssetType,
  AssetSOObject,
  InstallResultStatus,
  PackageMetadata,
  InstallationInfo,
} from '../models/epm';

export interface GetCategoriesRequest {
  query: {
    prerelease?: boolean;
    include_policy_templates?: boolean;
  };
}

export interface GetCategoriesResponse {
  items: CategorySummaryList;
}

export interface GetPackagesRequest {
  query: {
    category?: string;
    prerelease?: boolean;
    excludeInstallStatus?: boolean;
    withPackagePoliciesCount?: boolean;
    type?: string;
  };
}

export interface GetPackagesResponse {
  items: PackageList;
}

export interface InstalledPackage {
  name: string;
  version: string;
  status: EpmPackageInstallStatus;
  dataStreams: Array<{
    name: string;
    title: string;
  }>;
  title?: string;
  description?: string;
  icons?: PackageSpecIcon[];
}
export interface GetInstalledPackagesResponse {
  items: InstalledPackage[];
  total: number;
  searchAfter?: SortResults;
}

export interface GetEpmDataStreamsResponse {
  items: Array<{
    name: string;
  }>;
}
export interface GetLimitedPackagesResponse {
  items: string[];
}

export interface GetFileRequest {
  params: {
    pkgName: string;
    pkgVersion: string;
    filePath: string;
  };
}

export interface GetInfoRequest {
  params: {
    pkgName: string;
    pkgVersion: string;
  };
}

export interface GetInfoResponse {
  item: PackageInfo & { installationInfo?: InstallationInfo };
  metadata?: PackageMetadata;
}

export interface UpdatePackageRequest {
  params: {
    pkgName: string;
    pkgVersion: string;
  };
  body: {
    keepPoliciesUpToDate?: boolean;
  };
}

export interface UpdatePackageResponse {
  item: PackageInfo;
}

export interface GetStatsRequest {
  params: {
    pkgname: string;
  };
}

export interface GetStatsResponse {
  response: PackageUsageStats;
}

export interface InstallPackageRequest {
  params: {
    pkgName: string;
    pkgVersion: string;
  };
}

export interface InstallPackageResponse {
  items: AssetReference[];
  _meta: {
    install_source: InstallSource;
    name: string;
  };
}

export interface IBulkInstallPackageHTTPError {
  name: string;
  statusCode: number;
  error: string | Error;
}

export interface InstallResult {
  assets?: AssetReference[];
  status?: InstallResultStatus;
  error?: Error;
  installType: InstallType;
  installSource?: InstallSource;
  pkgName: string;
}

export interface BulkInstallPackageInfo {
  name: string;
  version: string;
  result: Omit<InstallResult, 'pkgName'>;
}

export interface BulkInstallPackagesResponse {
  items: Array<BulkInstallPackageInfo | IBulkInstallPackageHTTPError>;
}

export interface BulkUpgradePackagesRequest {
  packages: Array<{ name: string; version?: string }>;
  upgrade_package_policies?: boolean;
  force?: boolean;
  prerelease?: boolean;
}

export interface BulkUninstallPackagesRequest {
  packages: Array<{ name: string; version: string }>;
  force?: boolean;
}

export interface BulkOperationPackagesResponse {
  taskId: string;
}

export interface GetOneBulkOperationPackagesResponse {
  status: string;
  error?: { message: string };
  results?: Array<{ name: string; success?: boolean; error?: { message: string } }>;
}

export interface BulkInstallPackagesRequest {
  body: {
    packages: string[];
  };
}

export interface MessageResponse {
  response: string;
}

export interface DeletePackageRequest {
  params: {
    pkgName: string;
    pkgVersion: string;
  };
  query: {
    force?: boolean;
  };
}

export interface DeletePackageResponse {
  items: AssetReference[];
}
export interface GetVerificationKeyIdResponse {
  id: string | null;
}

export interface GetBulkAssetsRequest {
  body: {
    assetIds: AssetSOObject[];
  };
}

export interface GetBulkAssetsResponse {
  items: Array<SimpleSOAssetType & { appLink?: string }>;
}

export interface GetInputsTemplatesRequest {
  params: {
    pkgName: string;
    pkgVersion: string;
  };
  query: {
    format: 'json' | 'yml' | 'yaml';
    prerelease?: boolean;
  };
}

export type GetInputsTemplatesResponse =
  | string
  | {
      inputs: any;
    };

export interface DeletePackageDatastreamAssetsRequest {
  params: {
    pkgName: string;
    pkgVersion: string;
  };
  query: {
    packagePolicyId: string;
  };
}

export interface DeletePackageDatastreamAssetsResponse {
  success: boolean;
}

export interface RollbackPackageRequest {
  params: {
    pkgname: string;
  };
}

export interface RollbackPackageResponse {
  success: boolean;
  version: string;
}
