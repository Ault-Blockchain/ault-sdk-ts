import { z } from "zod";

export const LicenseStatusSchema = z.enum([
  "LICENSE_STATUS_UNSPECIFIED",
  "LICENSE_STATUS_ACTIVE",
  "LICENSE_STATUS_REVOKED",
  "LICENSE_STATUS_BURNED",
]);
export type LicenseStatus = z.infer<typeof LicenseStatusSchema>;

export const LicenseSchema = z
  .object({
    id: z.string(),
    owner: z.string(),
    status: LicenseStatusSchema,
    class_name: z.string(),
    uri: z.string(),
    created_at: z.string(),
    revoked_at: z.string().nullable().optional(),
    burned_at: z.string().nullable().optional(),
  })
  .loose();
export type License = z.infer<typeof LicenseSchema>;

export const LicenseModuleParamsSchema = z
  .object({
    class_name: z.string(),
    class_symbol: z.string(),
    base_token_uri: z.string(),
    minting_paused: z.boolean(),
    supply_cap: z.string(),
    allow_metadata_update: z.boolean(),
    admin_can_revoke: z.boolean(),
    admin_can_burn: z.boolean(),
    max_batch_size: z.number(),
    transfer_unlock_days: z.number(),
    enable_transfers: z.boolean(),
    minter_allowed_msgs: z.array(z.string()).default([]),
    kyc_approver_allowed_msgs: z.array(z.string()).default([]),
    free_max_gas_limit: z.string(),
    max_voting_power_per_address: z.string(),
  })
  .loose();
export type LicenseModuleParams = z.infer<typeof LicenseModuleParamsSchema>;

export const MiningDelegationSchema = z
  .object({
    license_id: z.string(),
    operator: z.string(),
  })
  .loose();
export type MiningDelegation = z.infer<typeof MiningDelegationSchema>;

export const OperatorSchema = z
  .object({
    operator: z.string(),
    commission_rate: z.number(),
    commission_recipient: z.string(),
    last_update_epoch: z.string().optional(),
  })
  .loose();
export type Operator = z.infer<typeof OperatorSchema>;

export const LicenseMinerInfoSchema = z
  .object({
    vrf_pubkey: z.string(),
    last_submit_epoch: z.string(),
    eligible_now: z.boolean(),
    quarantined_local: z.boolean(),
    quarantined_source: z.boolean(),
    all_time_credits: z.string(),
    all_time_payouts: z.string(),
  })
  .loose();
export type LicenseMinerInfo = z.infer<typeof LicenseMinerInfoSchema>;

export const OwnerKeyInfoSchema = z
  .object({
    vrf_pubkey: z.string().optional(),
    nonce: z.string().optional(),
    last_rotation_time: z.string().optional(),
    registration_epoch: z.string().optional(),
    valid_from_epoch: z.string().optional(),
    registration_chain_id: z.string().optional(),
  })
  .loose();
export type OwnerKeyInfo = z.infer<typeof OwnerKeyInfoSchema>;

export const EmissionInfoSchema = z
  .object({
    current_year: z.number(),
    annual_emission: z.string(),
    monthly_emission: z.string(),
    daily_emission: z.string(),
    cumulative_emitted: z.string(),
    epochs_until_next_year: z.string(),
    current_epoch: z.string(),
    epochs_per_year: z.string(),
  })
  .loose();
export type EmissionInfo = z.infer<typeof EmissionInfoSchema>;

export const YearEmissionSchema = z
  .object({
    year: z.number(),
    annual_emission: z.string(),
    monthly_emission: z.string(),
    daily_emission: z.string(),
  })
  .loose();
export type YearEmission = z.infer<typeof YearEmissionSchema>;

export const LicensePayoutsSchema = z
  .object({
    total_payout: z.string(),
    total_credits: z.string(),
  })
  .loose();
export type LicensePayouts = z.infer<typeof LicensePayoutsSchema>;

export const MinerModuleParamsSchema = z
  .object({
    epoch_length_seconds: z.string(),
    target_winners_per_epoch: z.number(),
    max_winners_per_epoch: z.number(),
    submission_window_seconds: z.number(),
    controller_alpha_q16: z.number(),
    controller_window: z.number(),
    threshold_min: z.string(),
    threshold_max: z.string(),
    beacon_window_epochs: z.number(),
    key_rotation_cooldown_seconds: z.string(),
    vrf_verify_gas: z.number(),
    min_key_age_epochs: z.number(),
    initial_emission_per_epoch: z.string(),
    emission_decay_rate: z.string(),
    max_emission_years: z.number(),
    max_payouts_per_block: z.number(),
    max_epochs_per_block: z.string(),
    staking_reward_percentage: z.number(),
    max_commission_rate: z.number(),
    max_commission_rate_increase_per_epoch: z.number(),
    free_mining_until_epoch: z.string(),
    free_mining_max_gas_limit: z.string(),
    miner_allowed_msgs: z.array(z.string()).default([]),
    max_free_tx_per_epoch: z.number(),
  })
  .loose();
export type MinerModuleParams = z.infer<typeof MinerModuleParamsSchema>;

export const EpochInfoSchema = z
  .object({
    epoch: z.string(),
    seed: z.string(),
    threshold: z.string(),
    beacon_r: z.string(),
    finalized: z.boolean(),
  })
  .loose();
export type EpochInfo = z.infer<typeof EpochInfoSchema>;

export const ExchangeMarketSchema = z
  .object({
    id: z.string(),
    base_denom: z.string(),
    quote_denom: z.string(),
    escrow_address: z.string(),
    maker_fee_rate: z.string(),
    taker_fee_rate: z.string(),
    last_price: z.string().optional(),
    last_matching_height: z.string().optional(),
  })
  .loose();
export type ExchangeMarket = z.infer<typeof ExchangeMarketSchema>;

export const ExchangeOrderSchema = z
  .object({
    id: z.string(),
    orderer: z.string(),
    market_id: z.string(),
    is_buy: z.boolean(),
    price: z.string(),
    quantity: z.string(),
    msg_height: z.string(),
    open_quantity: z.string(),
    remaining_deposit: z.string(),
    deadline: z.string(),
  })
  .loose();
export type ExchangeOrder = z.infer<typeof ExchangeOrderSchema>;

export const OrderBookPriceLevelSchema = z
  .object({
    p: z.string(),
    q: z.string(),
  })
  .loose();
export type OrderBookPriceLevel = z.infer<typeof OrderBookPriceLevelSchema>;

export const OrderBookSchema = z
  .object({
    price_interval: z.string(),
    sells: z.array(OrderBookPriceLevelSchema),
    buys: z.array(OrderBookPriceLevelSchema),
  })
  .loose();
export type OrderBook = z.infer<typeof OrderBookSchema>;

export const CoinSchema = z
  .object({
    denom: z.string(),
    amount: z.string(),
  })
  .loose();
export type Coin = z.infer<typeof CoinSchema>;

export const ExchangeFeesSchema = z
  .object({
    default_maker_fee_rate: z.string(),
    default_taker_fee_rate: z.string(),
  })
  .loose();
export type ExchangeFees = z.infer<typeof ExchangeFeesSchema>;

export const ExchangeParamsSchema = z
  .object({
    market_creation_fee: z.array(CoinSchema).default([]),
    fees: ExchangeFeesSchema,
    max_order_lifespan: z.string(),
    max_order_price_ratio: z.string(),
    max_swap_routes_len: z.number(),
  })
  .loose();
export type ExchangeParams = z.infer<typeof ExchangeParamsSchema>;

export const PageResponseSchema = z
  .object({
    next_key: z.preprocess((value) => value ?? undefined, z.string().optional()),
    total: z.preprocess((value) => value ?? undefined, z.string().optional()),
  })
  .loose();
export type PageResponse = z.infer<typeof PageResponseSchema>;

export interface PaginationParams {
  "pagination.key"?: string;
  "pagination.offset"?: string | number;
  "pagination.limit"?: string | number;
  "pagination.count_total"?: boolean;
  "pagination.reverse"?: boolean;
}

export const LicenseResponseSchema = z.object({ license: LicenseSchema }).loose();
export type LicenseResponse = z.infer<typeof LicenseResponseSchema>;

export const LicensesResponseSchema = z
  .object({
    licenses: z.array(LicenseSchema).default([]),
    pagination: PageResponseSchema.optional(),
  })
  .loose();
export type LicensesResponse = z.infer<typeof LicensesResponseSchema>;

export const LicensesByOwnerResponseSchema = z
  .object({
    licenses: z.array(LicenseSchema).default([]),
    pagination: PageResponseSchema.optional(),
  })
  .loose();
export type LicensesByOwnerResponse = z.infer<typeof LicensesByOwnerResponseSchema>;

export const BalanceResponseSchema = z.object({ balance: z.string() }).loose();
export type BalanceResponse = z.infer<typeof BalanceResponseSchema>;

export const OwnerResponseSchema = z.object({ owner: z.string() }).loose();
export type OwnerResponse = z.infer<typeof OwnerResponseSchema>;

export const TokenOfOwnerByIndexResponseSchema = z.object({ id: z.string() }).loose();
export type TokenOfOwnerByIndexResponse = z.infer<typeof TokenOfOwnerByIndexResponseSchema>;

export const OwnedByResponseSchema = z
  .object({
    license_ids: z.array(z.string()).default([]),
    pagination: PageResponseSchema.optional(),
  })
  .loose();
export type OwnedByResponse = z.infer<typeof OwnedByResponseSchema>;

export const TotalSupplyResponseSchema = z.object({ total_supply: z.string() }).loose();
export type TotalSupplyResponse = z.infer<typeof TotalSupplyResponseSchema>;

export const IsActiveResponseSchema = z.object({ is_active: z.boolean() }).loose();
export type IsActiveResponse = z.infer<typeof IsActiveResponseSchema>;

export const LicenseParamsResponseSchema = z
  .object({ params: LicenseModuleParamsSchema })
  .loose();
export type LicenseParamsResponse = z.infer<typeof LicenseParamsResponseSchema>;

export const MintersResponseSchema = z
  .object({
    minters: z.array(z.string()).default([]),
    pagination: PageResponseSchema.optional(),
  })
  .loose();
export type MintersResponse = z.infer<typeof MintersResponseSchema>;

export const TransferUnlockTimeResponseSchema = z
  .object({ unlock_time: z.string() })
  .loose();
export type TransferUnlockTimeResponse = z.infer<typeof TransferUnlockTimeResponseSchema>;

export const KycApproversResponseSchema = z
  .object({
    approvers: z.array(z.string()).default([]),
    pagination: PageResponseSchema.optional(),
  })
  .loose();
export type KycApproversResponse = z.infer<typeof KycApproversResponseSchema>;

export const ApprovedMembersResponseSchema = z
  .object({
    members: z.array(z.string()).default([]),
    pagination: PageResponseSchema.optional(),
  })
  .loose();
export type ApprovedMembersResponse = z.infer<typeof ApprovedMembersResponseSchema>;

export const IsApprovedMemberResponseSchema = z
  .object({ is_approved: z.boolean() })
  .loose();
export type IsApprovedMemberResponse = z.infer<typeof IsApprovedMemberResponseSchema>;

export const IsKycApproverResponseSchema = z.object({ is_approver: z.boolean() }).loose();
export type IsKycApproverResponse = z.infer<typeof IsKycApproverResponseSchema>;

export const ActiveLicenseCountAtResponseSchema = z.object({ count: z.string() }).loose();
export type ActiveLicenseCountAtResponse = z.infer<typeof ActiveLicenseCountAtResponseSchema>;

export const CurrentEpochResponseSchema = z
  .object({
    epoch: z.string(),
    seed: z.string(),
    threshold: z.string(),
  })
  .loose();
export type CurrentEpochResponse = z.infer<typeof CurrentEpochResponseSchema>;

export const BeaconResponseSchema = z
  .object({
    r: z.string(),
    finalized: z.boolean(),
  })
  .loose();
export type BeaconResponse = z.infer<typeof BeaconResponseSchema>;

export const MinerParamsResponseSchema = z
  .object({ params: MinerModuleParamsSchema })
  .loose();
export type MinerParamsResponse = z.infer<typeof MinerParamsResponseSchema>;

export const EmissionScheduleResponseSchema = z
  .object({
    schedule: z.array(YearEmissionSchema).default([]),
  })
  .loose();
export type EmissionScheduleResponse = z.infer<typeof EmissionScheduleResponseSchema>;

export const EpochInfoResponseSchema = z
  .object({
    info: EpochInfoSchema,
  })
  .loose();
export type EpochInfoResponse = z.infer<typeof EpochInfoResponseSchema>;

export const EpochsResponseSchema = z
  .object({
    epochs: z.array(EpochInfoSchema).default([]),
    pagination: PageResponseSchema.optional(),
  })
  .loose();
export type EpochsResponse = z.infer<typeof EpochsResponseSchema>;

export const OperatorInfoResponseSchema = z
  .object({
    info: OperatorSchema.optional(),
    operator: OperatorSchema.optional(),
  })
  .loose();
export type OperatorInfoResponse = z.infer<typeof OperatorInfoResponseSchema>;

export const OperatorsResponseSchema = z
  .object({
    operators: z.array(OperatorSchema).default([]),
    pagination: PageResponseSchema.optional(),
  })
  .loose();
export type OperatorsResponse = z.infer<typeof OperatorsResponseSchema>;

export const LicenseDelegationResponseSchema = z
  .object({
    delegation: MiningDelegationSchema.nullable().optional(),
    is_delegated: z.boolean(),
  })
  .loose();
export type LicenseDelegationResponse = z.infer<typeof LicenseDelegationResponseSchema>;

export const DelegatedLicensesResponseSchema = z
  .object({
    license_ids: z.array(z.string()).default([]),
    pagination: PageResponseSchema.optional(),
  })
  .loose();
export type DelegatedLicensesResponse = z.infer<typeof DelegatedLicensesResponseSchema>;

export const ExchangeParamsResponseSchema = z
  .object({ params: ExchangeParamsSchema })
  .loose();
export type ExchangeParamsResponse = z.infer<typeof ExchangeParamsResponseSchema>;

export const MarketsResponseSchema = z
  .object({
    markets: z.array(ExchangeMarketSchema).default([]),
    pagination: PageResponseSchema.optional(),
  })
  .loose();
export type MarketsResponse = z.infer<typeof MarketsResponseSchema>;

export const MarketResponseSchema = z
  .object({
    market: ExchangeMarketSchema,
  })
  .loose();
export type MarketResponse = z.infer<typeof MarketResponseSchema>;

export const OrdersResponseSchema = z
  .object({
    orders: z.array(ExchangeOrderSchema).default([]),
    pagination: PageResponseSchema.optional(),
  })
  .loose();
export type OrdersResponse = z.infer<typeof OrdersResponseSchema>;

export const OrderResponseSchema = z
  .object({
    order: ExchangeOrderSchema,
  })
  .loose();
export type OrderResponse = z.infer<typeof OrderResponseSchema>;

export const OrderBookResponseSchema = z
  .object({
    order_books: z.array(OrderBookSchema).default([]),
  })
  .loose();
export type OrderBookResponse = z.infer<typeof OrderBookResponseSchema>;

// ============================================================================
// Staking Types
// ============================================================================

export const ValidatorDescriptionSchema = z.object({
  moniker: z.string().default(""),
  identity: z.string().default(""),
  website: z.string().default(""),
  security_contact: z.string().default(""),
  details: z.string().default(""),
});
export type ValidatorDescription = z.infer<typeof ValidatorDescriptionSchema>;

export const ValidatorCommissionRatesSchema = z.object({
  rate: z.string(),
  max_rate: z.string(),
  max_change_rate: z.string(),
});
export type ValidatorCommissionRates = z.infer<typeof ValidatorCommissionRatesSchema>;

export const ValidatorCommissionSchema = z.object({
  commission_rates: ValidatorCommissionRatesSchema,
  update_time: z.string(),
});
export type ValidatorCommission = z.infer<typeof ValidatorCommissionSchema>;

export const ValidatorStatusSchema = z.enum([
  "BOND_STATUS_UNSPECIFIED",
  "BOND_STATUS_UNBONDED",
  "BOND_STATUS_UNBONDING",
  "BOND_STATUS_BONDED",
]);
export type ValidatorStatus = z.infer<typeof ValidatorStatusSchema>;

export const ConsensusPubkeySchema = z
  .object({
    "@type": z.string(),
    key: z.string().optional(),
    value: z.string().optional(),
  })
  .loose();
export type ConsensusPubkey = z.infer<typeof ConsensusPubkeySchema>;

export const ValidatorSchema = z.object({
  operator_address: z.string(),
  consensus_pubkey: ConsensusPubkeySchema.optional(),
  jailed: z.boolean(),
  status: ValidatorStatusSchema,
  tokens: z.string(),
  delegator_shares: z.string(),
  description: ValidatorDescriptionSchema,
  unbonding_height: z.string(),
  unbonding_time: z.string(),
  commission: ValidatorCommissionSchema,
  min_self_delegation: z.string(),
});
export type Validator = z.infer<typeof ValidatorSchema>;

export const DelegationSchema = z.object({
  delegator_address: z.string(),
  validator_address: z.string(),
  shares: z.string(),
});
export type Delegation = z.infer<typeof DelegationSchema>;

export const DelegationResponseSchema = z.object({
  delegation: DelegationSchema,
  balance: CoinSchema,
});
export type DelegationResponse = z.infer<typeof DelegationResponseSchema>;

export const UnbondingDelegationEntrySchema = z.object({
  creation_height: z.string(),
  completion_time: z.string(),
  initial_balance: z.string(),
  balance: z.string(),
  unbonding_id: z.string().optional(),
  unbonding_on_hold_ref_count: z.string().optional(),
});
export type UnbondingDelegationEntry = z.infer<typeof UnbondingDelegationEntrySchema>;

export const UnbondingDelegationSchema = z.object({
  delegator_address: z.string(),
  validator_address: z.string(),
  entries: z.array(UnbondingDelegationEntrySchema).default([]),
});
export type UnbondingDelegation = z.infer<typeof UnbondingDelegationSchema>;

export const DecCoinSchema = z.object({
  denom: z.string(),
  amount: z.string(),
});
export type DecCoin = z.infer<typeof DecCoinSchema>;

export const DelegationRewardSchema = z.object({
  validator_address: z.string(),
  reward: z.array(DecCoinSchema).default([]),
});
export type DelegationReward = z.infer<typeof DelegationRewardSchema>;

export const StakingParamsSchema = z.object({
  unbonding_time: z.string(),
  max_validators: z.coerce.number(),
  max_entries: z.coerce.number(),
  historical_entries: z.coerce.number(),
  bond_denom: z.string(),
  min_commission_rate: z.string().optional(),
});
export type StakingParams = z.infer<typeof StakingParamsSchema>;

export const StakingPoolSchema = z.object({
  not_bonded_tokens: z.string(),
  bonded_tokens: z.string(),
});
export type StakingPool = z.infer<typeof StakingPoolSchema>;

// Staking Response Schemas
export const ValidatorsResponseSchema = z.object({
  validators: z.array(ValidatorSchema).default([]),
  pagination: PageResponseSchema.optional(),
});
export type ValidatorsResponse = z.infer<typeof ValidatorsResponseSchema>;

export const ValidatorResponseSchema = z.object({
  validator: ValidatorSchema,
});
export type ValidatorResponse = z.infer<typeof ValidatorResponseSchema>;

export const DelegationsResponseSchema = z.object({
  delegation_responses: z.array(DelegationResponseSchema).default([]),
  pagination: PageResponseSchema.optional(),
});
export type DelegationsResponse = z.infer<typeof DelegationsResponseSchema>;

export const UnbondingDelegationsResponseSchema = z.object({
  unbonding_responses: z.array(UnbondingDelegationSchema).default([]),
  pagination: PageResponseSchema.optional(),
});
export type UnbondingDelegationsResponse = z.infer<typeof UnbondingDelegationsResponseSchema>;

export const StakingRewardsResponseSchema = z.object({
  rewards: z.array(DelegationRewardSchema).default([]),
  total: z.array(DecCoinSchema).default([]),
});
export type StakingRewardsResponse = z.infer<typeof StakingRewardsResponseSchema>;

export const StakingParamsResponseSchema = z.object({
  params: StakingParamsSchema,
});
export type StakingParamsResponse = z.infer<typeof StakingParamsResponseSchema>;

export const StakingPoolResponseSchema = z.object({
  pool: StakingPoolSchema,
});
export type StakingPoolResponse = z.infer<typeof StakingPoolResponseSchema>;
