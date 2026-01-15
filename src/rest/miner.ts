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
    epoch_key?: string | number;
    limit?: number;
    ascending?: boolean;
  }) => Promise<{ epochs: EpochInfo[]; next_epoch_key?: string }>;
  getEpochsAll: () => Promise<{ epochs: EpochInfo[]; total: number }>;
  getOperator: (operator: string) => Promise<{ operator: Operator | null }>;
  getOperators: () => Promise<{ operators: Operator[] }>;
  getLicenseDelegation: (
    licenseId: string | number,
  ) => Promise<{ delegation: MiningDelegation | null; is_delegated: boolean }>;
  getDelegatedLicenses: (operator: string) => Promise<{ license_ids: string[] }>;
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
        epoch_key: params.epoch_key,
        limit: params.limit,
        ascending: params.ascending,
      });
      const response = await fetchRest(
        context,
        `/ault/miner/v1/epochs${query}`,
        undefined,
        EpochsResponseSchema,
      );
      return {
        epochs: response.epochs ?? [],
        next_epoch_key: response.next_epoch_key ?? response.nextEpochKey,
      };
    },
    async getEpochsAll() {
      const baseUrl = context.restUrl.endsWith("/")
        ? context.restUrl.slice(0, -1)
        : context.restUrl;
      const limit = 1000;
      const { items, total } = await paginateAll<EpochsResponse, EpochInfo, string>({
        buildUrl: (cursor) => {
          const query = buildQuery({ limit, epoch_key: cursor });
          return `${baseUrl}/ault/miner/v1/epochs${query}`;
        },
        parseResponse: (data, url) => parseRestResponse(EpochsResponseSchema, data, url),
        getItems: (res) => res.epochs,
        getNextCursor: (res) => {
          const next = res.next_epoch_key ?? res.nextEpochKey ?? res.next_epoch;
          return next && next !== "0" ? next : null;
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
    async getOperators() {
      return fetchRest(context, "/cosmos/miner/v1/operators", undefined, OperatorsResponseSchema);
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
    async getDelegatedLicenses(operator) {
      return fetchRest(
        context,
        `/cosmos/miner/v1/operator/${operator}/licenses`,
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
