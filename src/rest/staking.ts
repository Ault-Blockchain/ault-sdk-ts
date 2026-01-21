import { fetchRest, type RestContext } from "./context";
import type {
  Validator,
  DelegationResponse,
  UnbondingDelegation,
  DelegationReward,
  DecCoin,
  StakingParams,
  StakingPool,
  ValidatorStatus,
} from "./types";
import {
  ValidatorsResponseSchema,
  ValidatorResponseSchema,
  DelegationsResponseSchema,
  UnbondingDelegationsResponseSchema,
  StakingRewardsResponseSchema,
  StakingParamsResponseSchema,
  StakingPoolResponseSchema,
} from "./types";
import { buildQuery } from "../core/query";

export interface StakingApi {
  getValidators: (params?: {
    status?: ValidatorStatus;
    pagination_key?: string;
    pagination_limit?: number;
    "pagination.key"?: string;
    "pagination.limit"?: number;
  }) => Promise<{ validators: Validator[]; pagination?: { next_key?: string; total?: string } }>;

  getValidator: (validatorAddress: string) => Promise<{ validator: Validator }>;

  getDelegations: (
    delegatorAddress: string,
    params?: {
      pagination_key?: string;
      pagination_limit?: number;
      "pagination.key"?: string;
      "pagination.limit"?: number;
    },
  ) => Promise<{
    delegation_responses: DelegationResponse[];
    pagination?: { next_key?: string; total?: string };
  }>;

  getUnbondingDelegations: (
    delegatorAddress: string,
    params?: {
      pagination_key?: string;
      pagination_limit?: number;
      "pagination.key"?: string;
      "pagination.limit"?: number;
    },
  ) => Promise<{
    unbonding_responses: UnbondingDelegation[];
    pagination?: { next_key?: string; total?: string };
  }>;

  getStakingRewards: (delegatorAddress: string) => Promise<{
    rewards: DelegationReward[];
    total: DecCoin[];
  }>;

  getStakingParams: () => Promise<{ params: StakingParams }>;

  getStakingPool: () => Promise<{ pool: StakingPool }>;
}

export function createStakingApi(context: RestContext): StakingApi {
  return {
    async getValidators(params = {}) {
      const paginationKey = params.pagination_key ?? params["pagination.key"];
      const paginationLimit = params.pagination_limit ?? params["pagination.limit"];
      const query = buildQuery({
        status: params.status,
        "pagination.key": paginationKey,
        "pagination.limit": paginationLimit,
      });
      return fetchRest(
        context,
        `/cosmos/staking/v1beta1/validators${query}`,
        undefined,
        ValidatorsResponseSchema,
      );
    },

    async getValidator(validatorAddress) {
      return fetchRest(
        context,
        `/cosmos/staking/v1beta1/validators/${validatorAddress}`,
        undefined,
        ValidatorResponseSchema,
      );
    },

    async getDelegations(delegatorAddress, params = {}) {
      const paginationKey = params.pagination_key ?? params["pagination.key"];
      const paginationLimit = params.pagination_limit ?? params["pagination.limit"];
      const query = buildQuery({
        "pagination.key": paginationKey,
        "pagination.limit": paginationLimit,
      });
      return fetchRest(
        context,
        `/cosmos/staking/v1beta1/delegations/${delegatorAddress}${query}`,
        undefined,
        DelegationsResponseSchema,
      );
    },

    async getUnbondingDelegations(delegatorAddress, params = {}) {
      const paginationKey = params.pagination_key ?? params["pagination.key"];
      const paginationLimit = params.pagination_limit ?? params["pagination.limit"];
      const query = buildQuery({
        "pagination.key": paginationKey,
        "pagination.limit": paginationLimit,
      });
      return fetchRest(
        context,
        `/cosmos/staking/v1beta1/delegators/${delegatorAddress}/unbonding_delegations${query}`,
        undefined,
        UnbondingDelegationsResponseSchema,
      );
    },

    async getStakingRewards(delegatorAddress) {
      return fetchRest(
        context,
        `/cosmos/distribution/v1beta1/delegators/${delegatorAddress}/rewards`,
        undefined,
        StakingRewardsResponseSchema,
      );
    },

    async getStakingParams() {
      return fetchRest(
        context,
        "/cosmos/staking/v1beta1/params",
        undefined,
        StakingParamsResponseSchema,
      );
    },

    async getStakingPool() {
      return fetchRest(
        context,
        "/cosmos/staking/v1beta1/pool",
        undefined,
        StakingPoolResponseSchema,
      );
    },
  };
}
