import type { NetworkConfig } from "../core/network";
import type { FetchWithRetryOptions, FetchFn } from "../core/http";
import type { AultClient } from "../client";
import type { LicenseApi } from "../rest/license";
import type { MinerApi } from "../rest/miner";
import type { ExchangeApi } from "../rest/exchange";
import type { StakingApi } from "../rest/staking";
import type { License } from "../rest/types";
import type { Duration } from "../proto/gen/google/protobuf/duration";
import type {
  Eip1193ProviderLike,
  EthersSignerLike,
  PrivySignTypedDataLike,
  SignerInput,
  ViemWalletLike,
} from "../eip712/signers";

export type BigIntLike = bigint | number | string;

/** Common transaction options available on all methods */
export interface TxOptions {
  gasLimit?: string;
  memo?: string;
}

/**
 * Flexible signer input that supports multiple wallet types.
 * Can be explicitly typed or auto-detected via duck-typing.
 */
export type FlexibleSignerInput =
  | { type: "viem"; wallet: ViemWalletLike; preferRpc?: boolean }
  | { type: "ethers"; signer: EthersSignerLike }
  | { type: "privy"; signTypedData: PrivySignTypedDataLike; address?: string }
  | { type: "privateKey"; key: string }
  | { type: "eip1193"; provider: Eip1193ProviderLike; address: string }
  | SignerInput;

/**
 * Options for creating a high-level client.
 */
export interface ClientOptions {
  /** Network configuration (required) */
  network: NetworkConfig;

  /** Signer - can be viem wallet, ethers signer, privy, private key, or EIP-1193 */
  signer: FlexibleSignerInput;

  /** Optional: explicitly provide signer address (auto-detected if possible) */
  signerAddress?: string;

  /** Optional: custom fetch function */
  fetchFn?: FetchFn;

  /** Optional: fetch retry options */
  fetchOptions?: FetchWithRetryOptions;

  /** Optional: default gas limit for transactions */
  defaultGasLimit?: string;

  /** Optional: default memo for transactions */
  defaultMemo?: string;
}

/**
 * Result of a transaction.
 */
export interface TxResult {
  /** Transaction hash */
  txHash: string;
  /** Result code (0 = success) */
  code: number;
  /** Raw log from the transaction */
  rawLog?: string;
  /** Whether the transaction was successful */
  success: boolean;
}

export interface LicenseTxApi {
  /**
   * Mint a new license to an address.
   * @param to - Recipient address (Ault or EVM format, auto-converted)
   * @param uri - Token URI for metadata
   * @param reason - Reason for minting (default: "")
   */
  mintLicense(params: { to: string; uri: string; reason?: string } & TxOptions): Promise<TxResult>;

  /**
   * Batch mint multiple licenses.
   */
  batchMintLicense(
    params: {
      recipients: Array<{ to: string; uri: string }>;
      reason?: string;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Transfer a license to another address.
   */
  transferLicense(
    params: {
      licenseId: BigIntLike;
      to: string;
      reason?: string;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Burn a license (admin only).
   */
  burnLicense(params: { licenseId: BigIntLike; reason?: string } & TxOptions): Promise<TxResult>;

  /**
   * Revoke a license (admin only).
   */
  revokeLicense(params: { licenseId: BigIntLike; reason?: string } & TxOptions): Promise<TxResult>;

  /**
   * Set token URI for a license (minter only).
   */
  setTokenURI(params: { licenseId: BigIntLike; uri: string } & TxOptions): Promise<TxResult>;

  /**
   * Approve a member for KYC.
   */
  approveMember(params: { member: string } & TxOptions): Promise<TxResult>;

  /**
   * Batch approve multiple members for KYC.
   */
  batchApproveMember(params: { members: string[] } & TxOptions): Promise<TxResult>;

  /**
   * Revoke a member's KYC approval.
   */
  revokeMember(params: { member: string } & TxOptions): Promise<TxResult>;

  /**
   * Batch revoke multiple members' KYC approval.
   */
  batchRevokeMember(params: { members: string[] } & TxOptions): Promise<TxResult>;

  /**
   * Set KYC approvers (admin only).
   */
  setKYCApprovers(params: { add?: string[]; remove?: string[] } & TxOptions): Promise<TxResult>;

  /**
   * Set minters (admin only).
   */
  setMinters(params: { add?: string[]; remove?: string[] } & TxOptions): Promise<TxResult>;
}

export interface MinerTxApi {
  /**
   * Delegate licenses to a mining operator.
   */
  delegateMining(
    params: {
      licenseIds: BigIntLike[];
      operator: string;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Cancel mining delegation for licenses.
   */
  cancelMiningDelegation(params: { licenseIds: BigIntLike[] } & TxOptions): Promise<TxResult>;

  /**
   * Redelegate licenses to a new operator.
   */
  redelegateMining(
    params: {
      licenseIds: BigIntLike[];
      newOperator: string;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Set VRF key for the owner.
   */
  setOwnerVrfKey(
    params: {
      vrfPubkey: Uint8Array;
      possessionProof: Uint8Array;
      nonce: bigint | number;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Submit mining work.
   */
  submitWork(
    params: {
      licenseId: BigIntLike;
      epoch: BigIntLike;
      y: Uint8Array;
      proof: Uint8Array;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Batch submit mining work.
   */
  batchSubmitWork(
    params: {
      submissions: Array<{
        licenseId: BigIntLike;
        epoch: BigIntLike;
        y: Uint8Array;
        proof: Uint8Array;
      }>;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Register as a mining operator.
   */
  registerOperator(
    params: {
      commissionRate: number;
      commissionRecipient?: string;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Unregister as a mining operator.
   */
  unregisterOperator(params?: TxOptions): Promise<TxResult>;

  /**
   * Update operator info.
   */
  updateOperatorInfo(
    params: {
      newCommissionRate: number;
      newCommissionRecipient?: string;
    } & TxOptions,
  ): Promise<TxResult>;
}

export interface ExchangeTxApi {
  /**
   * Place a limit order.
   * @param lifespan - Order lifespan as a protobuf Duration
   */
  placeLimitOrder(
    params: {
      marketId: BigIntLike;
      isBuy: boolean;
      price: string;
      quantity: string;
      lifespan: Duration;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Place a market order.
   */
  placeMarketOrder(
    params: {
      marketId: BigIntLike;
      isBuy: boolean;
      quantity: string;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Cancel a specific order.
   */
  cancelOrder(params: { orderId: Uint8Array } & TxOptions): Promise<TxResult>;

  /**
   * Cancel all orders in a market.
   */
  cancelAllOrders(params: { marketId: BigIntLike } & TxOptions): Promise<TxResult>;

  /**
   * Create a new market (requires fee).
   */
  createMarket(params: { baseDenom: string; quoteDenom: string } & TxOptions): Promise<TxResult>;
}

export interface StakingTxApi {
  /**
   * Delegate tokens to a validator.
   */
  delegate(
    params: {
      validatorAddress: string;
      amount: { denom: string; amount: string };
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Undelegate tokens from a validator.
   */
  undelegate(
    params: {
      validatorAddress: string;
      amount: { denom: string; amount: string };
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Redelegate tokens from one validator to another.
   */
  redelegate(
    params: {
      validatorAddressSrc: string;
      validatorAddressDst: string;
      amount: { denom: string; amount: string };
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Withdraw staking rewards from one or more validators.
   * Creates one message per validator address.
   */
  withdrawRewards(params: { validatorAddresses: string[] } & TxOptions): Promise<TxResult>;
}

export interface LicenseDelegationStatus {
  licenseId: string;
  isDelegated: boolean;
  operator: string | null;
}

export interface LicenseAnalysis {
  total: number;
  active: number;
  delegated: number;
  licenses: License[];
  delegations: Array<{ licenseId: string; operator: string }>;
}

export interface ParallelQueryApi {
  /**
   * Get all license IDs owned by an address in parallel.
   * Much faster than sequential fetching for large numbers of licenses.
   */
  getAllLicenseIds(owner: string): Promise<string[]>;

  /**
   * Get license details for multiple license IDs in parallel.
   */
  getLicenseDetailsParallel(licenseIds: string[]): Promise<Array<License | null>>;

  /**
   * Get delegation status for multiple license IDs in parallel.
   */
  getLicenseDelegationsParallel(licenseIds: string[]): Promise<LicenseDelegationStatus[]>;

  /**
   * Get full license analysis for an owner: total owned, active count, delegated count.
   * Fetches all data in parallel for best performance.
   */
  analyzeLicenses(owner: string): Promise<LicenseAnalysis>;
}

/**
 * High-level client interface for the Ault SDK.
 * Provides simplified methods for common operations.
 */
export interface Client extends LicenseTxApi, MinerTxApi, ExchangeTxApi, StakingTxApi, ParallelQueryApi {
  /** Network configuration */
  readonly network: NetworkConfig;

  /** Signer address in Ault bech32 format */
  readonly address: string;

  /** License module queries */
  readonly license: LicenseApi;

  /** Miner module queries */
  readonly miner: MinerApi;

  /** Exchange module queries */
  readonly exchange: ExchangeApi;

  /** Staking module queries */
  readonly staking: StakingApi;

  /**
   * Access to the underlying low-level client for advanced use cases.
   */
  readonly _lowLevel: AultClient;
}
