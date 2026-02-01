import { fetchRest, type RestContext, parseRestResponse } from "./context";
import type {
  MiningDelegation,
  Operator,
  EpochInfo,
  EpochsResponse,
  LicenseMinerInfo,
  OwnerKeyInfo,
  EmissionInfo,
  YearEmission,
  LicensePayouts,
  MinerModuleParams,
  PageResponse,
  PaginationParams,
} from "./types";
import {
  CurrentEpochResponseSchema,
  LicenseMinerInfoSchema,
  BeaconResponseSchema,
  MinerParamsResponseSchema,
  OwnerKeyInfoSchema,
  EmissionInfoSchema,
  EmissionScheduleResponseSchema,
  EpochInfoResponseSchema,
  EpochsResponseSchema,
  OperatorInfoResponseSchema,
  OperatorsResponseSchema,
  LicenseDelegationResponseSchema,
  DelegatedLicensesResponseSchema,
  LicensePayoutsSchema,
} from "./types";
import { ApiError } from "../core/errors";
import { buildQuery } from "../core/query";
import { paginateAll } from "../core/pagination";

export interface MinerApi {
  getCurrentEpoch: () => Promise<{ epoch: string; seed: string; threshold: string }>;
  getLicenseMinerInfo: (licenseId: string | number) => Promise<LicenseMinerInfo>;
  getBeacon: (epoch: string | number) => Promise<{ r: string; finalized: boolean }>;
  getParams: () => Promise<{ params: MinerModuleParams }>;
  getOwnerKey: (owner: string) => Promise<OwnerKeyInfo>;
  getEmissionInfo: () => Promise<EmissionInfo>;
  getEmissionSchedule: () => Promise<{ schedule: YearEmission[] }>;
  getEpochInfo: (epoch: string | number) => Promise<{ info: EpochInfo }>;
  getEpochs: (params?: {
    pagination?: PaginationParams;
  }) => Promise<{ epochs: EpochInfo[]; pagination?: PageResponse }>;
  getEpochsAll: () => Promise<{ epochs: EpochInfo[]; total: number }>;
  getOperator: (operator: string) => Promise<{ operator: Operator | null }>;
  getOperators: (params?: {
    pagination?: PaginationParams;
  }) => Promise<{ operators: Operator[]; pagination?: PageResponse }>;
  getLicenseDelegation: (
    licenseId: string | number,
  ) => Promise<{ delegation: MiningDelegation | null; is_delegated: boolean }>;
  getDelegatedLicenses: (
    operator: string,
    params?: { pagination?: PaginationParams },
  ) => Promise<{ license_ids: string[]; pagination?: PageResponse }>;
  getLicensePayouts: (
    licenseId: string | number,
    params?: { fromEpoch?: string | number; toEpoch?: string | number },
  ) => Promise<LicensePayouts>;
}

export function createMinerApi(context: RestContext): MinerApi {
  return {
    async getCurrentEpoch() {
      return fetchRest(context, "/ault/miner/v1/epoch", undefined, CurrentEpochResponseSchema);
    },
    async getLicenseMinerInfo(licenseId) {
      return fetchRest(
        context,
        `/ault/miner/v1/license/${licenseId}/info`,
        undefined,
        LicenseMinerInfoSchema,
      );
    },
    async getBeacon(epoch) {
      return fetchRest(
        context,
        `/ault/miner/v1/beacon/${epoch}`,
        undefined,
        BeaconResponseSchema,
      );
    },
    async getParams() {
      return fetchRest(context, "/ault/miner/v1/params", undefined, MinerParamsResponseSchema);
    },
    async getOwnerKey(owner) {
      return fetchRest(
        context,
        `/ault/miner/v1/owner/${owner}/key`,
        undefined,
        OwnerKeyInfoSchema,
      );
    },
    async getEmissionInfo() {
      return fetchRest(context, "/ault/miner/v1/emission/info", undefined, EmissionInfoSchema);
    },
    async getEmissionSchedule() {
      return fetchRest(
        context,
        "/ault/miner/v1/emission/schedule",
        undefined,
        EmissionScheduleResponseSchema,
      );
    },
    async getEpochInfo(epoch) {
      return fetchRest(
        context,
        `/ault/miner/v1/epoch/${epoch}`,
        undefined,
        EpochInfoResponseSchema,
      );
    },
    async getEpochs(params = {}) {
      const query = buildQuery({
        ...params.pagination,
      });
      return fetchRest(
        context,
        `/ault/miner/v1/epochs${query}`,
        undefined,
        EpochsResponseSchema,
      );
    },
    async getEpochsAll() {
      const baseUrl = context.restUrl.endsWith("/")
        ? context.restUrl.slice(0, -1)
        : context.restUrl;
      const limit = 1000;
      const { items, total } = await paginateAll<EpochsResponse, EpochInfo, string>({
        buildUrl: (cursor) => {
          const query = buildQuery({
            "pagination.limit": limit,
            "pagination.key": cursor ?? undefined,
          });
          return `${baseUrl}/ault/miner/v1/epochs${query}`;
        },
        parseResponse: (data, url) => parseRestResponse(EpochsResponseSchema, data, url),
        getItems: (res) => res.epochs,
        getNextCursor: (res) => {
          const next = res.pagination?.next_key;
          return next && next !== "" ? next : null;
        },
        fetchOptions: context.fetchOptions,
        fetchFn: context.fetchFn,
      });
      return { epochs: items, total };
    },
    async getOperator(operator) {
      try {
        const result = await fetchRest(
          context,
          `/cosmos/miner/v1/operator/${operator}`,
          undefined,
          OperatorInfoResponseSchema,
        );
        return { operator: result.operator ?? result.info ?? null };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return { operator: null };
        }
        throw error;
      }
    },
    async getOperators(params = {}) {
      const query = buildQuery({
        ...params.pagination,
      });
      return fetchRest(
        context,
        `/cosmos/miner/v1/operators${query}`,
        undefined,
        OperatorsResponseSchema,
      );
    },
    async getLicenseDelegation(licenseId) {
      try {
        const result = await fetchRest(
          context,
          `/cosmos/miner/v1/license/${licenseId}/delegation`,
          undefined,
          LicenseDelegationResponseSchema,
        );
        if (!result.is_delegated) {
          return { delegation: null, is_delegated: false };
        }
        return { delegation: result.delegation ?? null, is_delegated: result.is_delegated };
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          return { delegation: null, is_delegated: false };
        }
        throw error;
      }
    },
    async getDelegatedLicenses(operator, params = {}) {
      const query = buildQuery({
        ...params.pagination,
      });
      return fetchRest(
        context,
        `/cosmos/miner/v1/operator/${operator}/licenses${query}`,
        undefined,
        DelegatedLicensesResponseSchema,
      );
    },
    async getLicensePayouts(licenseId, params = {}) {
      const query = buildQuery({
        from_epoch: params.fromEpoch,
        to_epoch: params.toEpoch,
      });
      return fetchRest(
        context,
        `/ault/miner/v1/license/${licenseId}/payouts${query}`,
        undefined,
        LicensePayoutsSchema,
      );
    },
  };
}
