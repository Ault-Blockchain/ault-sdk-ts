import { fetchRest, type RestContext, parseRestResponse } from "./context";
import type { License, LicenseStatus, LicenseModuleParams, PageResponse, PaginationParams } from "./types";
import {
  LicenseResponseSchema,
  LicensesResponseSchema,
  LicensesByOwnerResponseSchema,
  BalanceResponseSchema,
  OwnerResponseSchema,
  TokenOfOwnerByIndexResponseSchema,
  OwnedByResponseSchema,
  TotalSupplyResponseSchema,
  IsActiveResponseSchema,
  LicenseParamsResponseSchema,
  MintersResponseSchema,
  TransferUnlockTimeResponseSchema,
  KycApproversResponseSchema,
  ApprovedMembersResponseSchema,
  IsApprovedMemberResponseSchema,
  IsKycApproverResponseSchema,
  ActiveLicenseCountAtResponseSchema,
} from "./types";
import { paginateAll } from "../core/pagination";
import { buildQuery } from "../core/query";

export interface LicenseApi {
  getLicense: (id: string | number) => Promise<{ license: License }>;
  getLicenses: (params?: {
    status?: LicenseStatus;
    pagination?: PaginationParams;
  }) => Promise<{ licenses: License[]; pagination?: PageResponse }>;
  getLicensesByOwner: (
    owner: string,
    params?: { pagination?: PaginationParams },
  ) => Promise<{ licenses: License[]; pagination?: PageResponse }>;
  getBalance: (owner: string) => Promise<{ balance: string }>;
  getOwner: (id: string | number) => Promise<{ owner: string }>;
  getTokenOfOwnerByIndex: (owner: string, index: number) => Promise<{ id: string }>;
  getOwnedBy: (
    owner: string,
    params?: { pagination?: PaginationParams },
  ) => Promise<{
    license_ids: string[];
    pagination?: PageResponse;
  }>;
  getLicensesByOwnerAll: (owner: string) => Promise<{ license_ids: string[]; total: number }>;
  getTotalSupply: () => Promise<{ total_supply: string }>;
  isActive: (id: string | number) => Promise<{ is_active: boolean }>;
  getParams: () => Promise<{ params: LicenseModuleParams }>;
  getMinters: (params?: {
    pagination?: PaginationParams;
  }) => Promise<{ minters: string[]; pagination?: PageResponse }>;
  getTransferUnlockTime: () => Promise<{ unlock_time: string }>;
  getKycApprovers: (params?: {
    pagination?: PaginationParams;
  }) => Promise<{ approvers: string[]; pagination?: PageResponse }>;
  getApprovedMembers: (params?: {
    pagination?: PaginationParams;
  }) => Promise<{ members: string[]; pagination?: PageResponse }>;
  isApprovedMember: (address: string) => Promise<{ is_approved: boolean }>;
  isKycApprover: (address: string) => Promise<{ is_approver: boolean }>;
  getActiveLicenseCountAt: (owner: string, snapshotTime: string) => Promise<{ count: string }>;
}

export function createLicenseApi(context: RestContext): LicenseApi {
  return {
    async getLicense(id) {
      return fetchRest(context, `/ault/license/v1/license/${id}`, undefined, LicenseResponseSchema);
    },
    async getLicenses(params = {}) {
      const query = buildQuery({
        status: params.status,
        ...params.pagination,
      });
      return fetchRest(
        context,
        `/ault/license/v1/licenses${query}`,
        undefined,
        LicensesResponseSchema,
      );
    },
    async getLicensesByOwner(owner, params = {}) {
      const query = buildQuery({
        ...params.pagination,
      });
      return fetchRest(
        context,
        `/ault/license/v1/licenses_by_owner/${owner}${query}`,
        undefined,
        LicensesByOwnerResponseSchema,
      );
    },
    async getBalance(owner) {
      return fetchRest(
        context,
        `/ault/license/v1/balance/${owner}`,
        undefined,
        BalanceResponseSchema,
      );
    },
    async getOwner(id) {
      return fetchRest(context, `/ault/license/v1/owner/${id}`, undefined, OwnerResponseSchema);
    },
    async getTokenOfOwnerByIndex(owner, index) {
      return fetchRest(
        context,
        `/ault/license/v1/token/${owner}/${index}`,
        undefined,
        TokenOfOwnerByIndexResponseSchema,
      );
    },
    async getOwnedBy(owner, params = {}) {
      const query = buildQuery({
        ...params.pagination,
      });
      return fetchRest(
        context,
        `/ault/license/v1/owned_by/${owner}${query}`,
        undefined,
        OwnedByResponseSchema,
      );
    },
    async getLicensesByOwnerAll(owner) {
      const baseUrl = context.restUrl.endsWith("/")
        ? context.restUrl.slice(0, -1)
        : context.restUrl;
      const limit = 1000;
      const { items, total } = await paginateAll<
        { license_ids: string[]; pagination?: PageResponse },
        string,
        string
      >({
        buildUrl: (cursor) => {
          const query = buildQuery({
            "pagination.limit": limit,
            "pagination.key": cursor ?? undefined,
          });
          return `${baseUrl}/ault/license/v1/owned_by/${owner}${query}`;
        },
        parseResponse: (data, url) => parseRestResponse(OwnedByResponseSchema, data, url),
        getItems: (res) => res.license_ids,
        getNextCursor: (res) => {
          const next = res.pagination?.next_key;
          return next && next !== "" ? next : null;
        },
        fetchOptions: context.fetchOptions,
        fetchFn: context.fetchFn,
      });
      return { license_ids: items, total };
    },
    async getTotalSupply() {
      return fetchRest(
        context,
        "/ault/license/v1/total_supply",
        undefined,
        TotalSupplyResponseSchema,
      );
    },
    async isActive(id) {
      return fetchRest(
        context,
        `/ault/license/v1/is_active/${id}`,
        undefined,
        IsActiveResponseSchema,
      );
    },
    async getParams() {
      return fetchRest(
        context,
        "/ault/license/v1/params",
        undefined,
        LicenseParamsResponseSchema,
      );
    },
    async getMinters(params = {}) {
      const query = buildQuery({
        ...params.pagination,
      });
      return fetchRest(
        context,
        `/ault/license/v1/minters${query}`,
        undefined,
        MintersResponseSchema,
      );
    },
    async getTransferUnlockTime() {
      return fetchRest(
        context,
        "/ault/license/v1/transfer_unlock_time",
        undefined,
        TransferUnlockTimeResponseSchema,
      );
    },
    async getKycApprovers(params = {}) {
      const query = buildQuery({
        ...params.pagination,
      });
      return fetchRest(
        context,
        `/ault/license/v1/kyc_approvers${query}`,
        undefined,
        KycApproversResponseSchema,
      );
    },
    async getApprovedMembers(params = {}) {
      const query = buildQuery({
        ...params.pagination,
      });
      return fetchRest(
        context,
        `/ault/license/v1/approved_members${query}`,
        undefined,
        ApprovedMembersResponseSchema,
      );
    },
    async isApprovedMember(address) {
      return fetchRest(
        context,
        `/ault/license/v1/is_approved_member/${address}`,
        undefined,
        IsApprovedMemberResponseSchema,
      );
    },
    async isKycApprover(address) {
      return fetchRest(
        context,
        `/ault/license/v1/is_kyc_approver/${address}`,
        undefined,
        IsKycApproverResponseSchema,
      );
    },
    async getActiveLicenseCountAt(owner, snapshotTime) {
      const query = buildQuery({ snapshot_time: snapshotTime });
      return fetchRest(
        context,
        `/ault/license/v1/active_license_count_at/${owner}${query}`,
        undefined,
        ActiveLicenseCountAtResponseSchema,
      );
    },
  };
}
