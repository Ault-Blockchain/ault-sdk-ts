import type { NetworkConfig } from "./core/network";
import { GAS_CONSTANTS } from "./core/network";
import type { FetchWithRetryOptions, FetchFn } from "./core/http";
import type { Base64String } from "./core/base64";
import { createAultClient, type AultClient } from "./client";
import type { LicenseApi } from "./rest/license";
import type { MinerApi } from "./rest/miner";
import type { ExchangeApi } from "./rest/exchange";
import { signAndBroadcastEip712 } from "./eip712/sign-and-broadcast";
import { msg, type Eip712Msg, type WorkSubmission } from "./eip712/builder";
import {
  type AultSigner,
  type SignerInput,
  type ViemWalletLike,
  type EthersSignerLike,
  type PrivySignTypedDataLike,
  type Eip1193ProviderLike,
  createViemSigner,
  createEthersSigner,
  createPrivySigner,
  createPrivateKeySigner,
  createEip1193Signer,
  resolveSignerAddress,
  isAultSigner,
} from "./eip712/signers";
import { evmToAult, isValidAultAddress, isValidEvmAddress } from "./utils/address";

// ============================================================================
// Types
// ============================================================================

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

/** Common transaction options available on all methods */
interface TxOptions {
  gasLimit?: string;
  memo?: string;
}

/**
 * High-level client interface for the Ault SDK.
 * Provides simplified methods for common operations.
 */
export interface Client {
  /** Network configuration */
  readonly network: NetworkConfig;

  /** Signer address in Ault bech32 format */
  readonly address: string;

  // ============================================================================
  // Query APIs (pass-through from REST)
  // ============================================================================

  /** License module queries */
  readonly license: LicenseApi;

  /** Miner module queries */
  readonly miner: MinerApi;

  /** Exchange module queries */
  readonly exchange: ExchangeApi;

  // ============================================================================
  // License Transaction Methods
  // ============================================================================

  /**
   * Mint a new license to an address.
   * @param to - Recipient address (Ault or EVM format, auto-converted)
   * @param uri - Token URI for metadata
   * @param reason - Reason for minting (default: "")
   */
  mintLicense(
    params: { to: string; uri: string; reason?: string } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Batch mint multiple licenses.
   */
  batchMintLicenses(
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
      licenseId: bigint | number | string;
      to: string;
      reason?: string;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Burn a license (admin only).
   */
  burnLicense(
    params: { licenseId: bigint | number | string; reason?: string } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Revoke a license (admin only).
   */
  revokeLicense(
    params: { licenseId: bigint | number | string; reason?: string } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Set token URI for a license (minter only).
   */
  setTokenUri(
    params: { licenseId: bigint | number | string; uri: string } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Approve a member for KYC.
   */
  approveMember(params: { member: string } & TxOptions): Promise<TxResult>;

  /**
   * Batch approve multiple members for KYC.
   */
  batchApproveMembers(params: { members: string[] } & TxOptions): Promise<TxResult>;

  /**
   * Revoke a member's KYC approval.
   */
  revokeMember(params: { member: string } & TxOptions): Promise<TxResult>;

  /**
   * Batch revoke multiple members' KYC approval.
   */
  batchRevokeMembers(params: { members: string[] } & TxOptions): Promise<TxResult>;

  /**
   * Set KYC approvers (admin only).
   */
  setKycApprovers(
    params: { add?: string[]; remove?: string[] } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Set minters (admin only).
   */
  setMinters(
    params: { add?: string[]; remove?: string[] } & TxOptions,
  ): Promise<TxResult>;

  // ============================================================================
  // Miner Transaction Methods
  // ============================================================================

  /**
   * Delegate licenses to a mining operator.
   */
  delegateLicenses(
    params: {
      licenseIds: Array<bigint | number | string>;
      operator: string;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Cancel mining delegation for licenses.
   */
  undelegateLicenses(
    params: { licenseIds: Array<bigint | number | string> } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Redelegate licenses to a new operator.
   */
  redelegateLicenses(
    params: {
      licenseIds: Array<bigint | number | string>;
      newOperator: string;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Set VRF key for the owner.
   */
  setVrfKey(
    params: {
      vrfPubkey: Base64String;
      possessionProof: Base64String;
      nonce: bigint | number;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Submit mining work.
   */
  submitWork(
    params: {
      licenseId: bigint | number | string;
      epoch: bigint | number | string;
      y: Base64String;
      proof: Base64String;
      nonce: Base64String;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Batch submit mining work.
   */
  batchSubmitWork(
    params: {
      submissions: Array<{
        licenseId: bigint | number | string;
        epoch: bigint | number | string;
        y: Base64String;
        proof: Base64String;
        nonce: Base64String;
      }>;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Register as a mining operator.
   */
  registerOperator(
    params: {
      commissionRate: bigint | number;
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
      newCommissionRate: bigint | number;
      newCommissionRecipient?: string;
    } & TxOptions,
  ): Promise<TxResult>;

  // ============================================================================
  // Exchange Transaction Methods
  // ============================================================================

  /**
   * Place a limit order.
   * @param lifespanSeconds - Order lifespan in SECONDS (auto-converted to nanoseconds)
   */
  placeLimitOrder(
    params: {
      marketId: bigint | number | string;
      isBuy: boolean;
      price: string;
      quantity: string;
      lifespanSeconds: number;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Place a market order.
   */
  placeMarketOrder(
    params: {
      marketId: bigint | number | string;
      isBuy: boolean;
      quantity: string;
    } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Cancel a specific order.
   */
  cancelOrder(params: { orderId: Base64String } & TxOptions): Promise<TxResult>;

  /**
   * Cancel all orders in a market.
   */
  cancelAllOrders(
    params: { marketId: bigint | number | string } & TxOptions,
  ): Promise<TxResult>;

  /**
   * Create a new market (requires fee).
   */
  createMarket(
    params: { baseDenom: string; quoteDenom: string } & TxOptions,
  ): Promise<TxResult>;

  // ============================================================================
  // Low-level access
  // ============================================================================

  /**
   * Access to the underlying low-level client for advanced use cases.
   */
  readonly _lowLevel: AultClient;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Auto-detect and normalize signer input to AultSigner.
 */
function autoDetectSigner(input: FlexibleSignerInput): AultSigner {
  // Handle explicitly typed signers
  if (typeof input === "object" && input !== null && "type" in input) {
    const typed = input as { type: string };
    switch (typed.type) {
      case "viem": {
        const v = input as { type: "viem"; wallet: ViemWalletLike; preferRpc?: boolean };
        return createViemSigner(v.wallet, { preferRpc: v.preferRpc });
      }
      case "ethers": {
        const e = input as { type: "ethers"; signer: EthersSignerLike };
        return createEthersSigner(e.signer);
      }
      case "privy": {
        const p = input as {
          type: "privy";
          signTypedData: PrivySignTypedDataLike;
          address?: string;
        };
        return createPrivySigner({ signTypedData: p.signTypedData, address: p.address });
      }
      case "privateKey": {
        const pk = input as { type: "privateKey"; key: string };
        return createPrivateKeySigner(pk.key);
      }
      case "eip1193": {
        const eip = input as { type: "eip1193"; provider: Eip1193ProviderLike; address: string };
        return createEip1193Signer({ provider: eip.provider, address: eip.address });
      }
    }
  }

  // Handle raw signTypedData function
  if (typeof input === "function") {
    return { signTypedData: input };
  }

  // Check if it's already an AultSigner created by this SDK (has our marker)
  // This MUST come before duck-typing to avoid mis-detecting SDK signers as ethers signers
  if (isAultSigner(input)) {
    return input;
  }

  // Try duck-typing detection for common wallet types
  const obj = input as Record<string, unknown>;

  // Check for ethers signer - it has getAddress as a FUNCTION and either signTypedData or _signTypedData
  // Ethers' signTypedData(domain, types, message) is incompatible with AultSigner's signTypedData(typedData)
  // Note: We check for ethers BEFORE generic signTypedData because the signatures are incompatible
  if (typeof obj.getAddress === "function" && (obj._signTypedData || obj.signTypedData)) {
    // Additional check: ethers signers typically have `provider` property
    // This helps distinguish from other objects that might have getAddress + signTypedData
    if (obj.provider !== undefined || obj._signTypedData) {
      return createEthersSigner(input as unknown as EthersSignerLike);
    }
  }

  // Check for viem WalletClient (has request method for RPC)
  // Must also have address or getAddresses to be usable as a viem wallet
  if (typeof obj.request === "function") {
    const hasAddress = typeof obj.address === "string";
    const hasGetAddresses = typeof obj.getAddresses === "function";

    if (hasAddress || hasGetAddresses) {
      return createViemSigner(input as unknown as ViemWalletLike);
    }

    // Has request but no address info - likely an EIP-1193 provider without account access
    throw new Error(
      'Object has "request" method but no "address" or "getAddresses". ' +
        'If this is an EIP-1193 provider, use { type: "eip1193", provider, address } format ' +
        "to explicitly provide the signer address.",
    );
  }

  // Accept objects with signTypedData - compatible with:
  // - viem LocalAccount (signTypedData takes { domain, types, primaryType, message })
  // - Raw AultSigner objects
  if (
    typeof input === "object" &&
    input !== null &&
    "signTypedData" in input &&
    typeof input.signTypedData === "function"
  ) {
    return input as AultSigner;
  }

  throw new Error(
    'Could not auto-detect signer type. Please use explicit { type: "viem" | "ethers" | "privy" | "privateKey" | "eip1193", ... } format.',
  );
}

/**
 * Normalize any address to Ault bech32 format.
 * Accepts: 0x... EVM address or ault1... bech32 address
 */
function normalizeAddress(address: string): string {
  if (isValidAultAddress(address)) {
    return address;
  }
  if (isValidEvmAddress(address)) {
    return evmToAult(address);
  }
  throw new Error(`Invalid address format: ${address}`);
}

/**
 * Normalize an array of addresses.
 */
function normalizeAddresses(addresses: string[]): string[] {
  return addresses.map(normalizeAddress);
}

/**
 * Convert any bigint-like value to bigint.
 */
function toBigInt(value: bigint | number | string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  throw new Error(`Cannot convert ${typeof value} to bigint`);
}

/**
 * Convert seconds to nanoseconds for exchange lifespan.
 * Uses BigInt math to avoid floating-point precision loss for large values.
 * Maximum safe input is ~292 years (Number.MAX_SAFE_INTEGER nanoseconds).
 */
function secondsToNanoseconds(seconds: number): bigint {
  // Separate integer and fractional parts to avoid floating-point precision loss
  const integerPart = Math.trunc(seconds);
  const fractionalPart = seconds - integerPart;

  // Convert integer part directly to BigInt, multiply by 1e9
  const integerNanos = BigInt(integerPart) * 1_000_000_000n;

  // For the fractional part, we can safely use floating-point since it's < 1
  // and the result will be < 1e9 which is well within safe integer range
  const fractionalNanos = BigInt(Math.round(fractionalPart * 1_000_000_000));

  return integerNanos + fractionalNanos;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a high-level client for the Ault SDK.
 *
 * @example
 * ```typescript
 * import { createClient, getNetworkConfig } from 'ault-sdk-ts';
 * import { privateKeyToAccount } from 'viem/accounts';
 *
 * const account = privateKeyToAccount('0x...');
 * const client = await createClient({
 *   network: getNetworkConfig('ault_10904-1'),
 *   signer: account,
 * });
 *
 * // Query
 * const licenses = await client.license.getOwnedBy(client.address);
 *
 * // Transactions
 * const result = await client.delegateLicenses({
 *   licenseIds: [1, 2, 3],
 *   operator: '0xOperator...',
 * });
 * ```
 */
export async function createClient(options: ClientOptions): Promise<Client> {
  // Create underlying low-level client
  const lowLevel = createAultClient({
    network: options.network,
    fetchFn: options.fetchFn,
    fetchOptions: options.fetchOptions,
  });

  // Auto-detect and normalize signer
  const signer = autoDetectSigner(options.signer);

  // Resolve signer address
  const signerAddress = await resolveSignerAddress(signer, options.signerAddress);

  // Default options
  const defaultGasLimit = options.defaultGasLimit ?? GAS_CONSTANTS.EIP712_GAS_LIMIT;
  const defaultMemo = options.defaultMemo ?? "";

  // Helper to execute a transaction
  async function exec(
    msgs: Eip712Msg[],
    txOptions?: TxOptions,
  ): Promise<TxResult> {
    const result = await signAndBroadcastEip712({
      network: options.network,
      signer,
      signerAddress,
      msgs,
      gasLimit: txOptions?.gasLimit ?? defaultGasLimit,
      memo: txOptions?.memo ?? defaultMemo,
      fetchFn: options.fetchFn,
      fetchOptions: options.fetchOptions,
    });

    return {
      txHash: result.txHash,
      code: result.code,
      rawLog: result.rawLog,
      success: result.code === 0,
    };
  }

  return {
    network: options.network,
    address: signerAddress,

    // Query APIs (pass-through)
    license: lowLevel.rest.license,
    miner: lowLevel.rest.miner,
    exchange: lowLevel.rest.exchange,

    // ============================================================================
    // License Transactions
    // ============================================================================

    async mintLicense({ to, uri, reason = "", gasLimit, memo }) {
      return exec(
        [
          msg.license.mint({
            minter: signerAddress,
            to: normalizeAddress(to),
            uri,
            reason,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async batchMintLicenses({ recipients, reason = "", gasLimit, memo }) {
      return exec(
        [
          msg.license.batchMint({
            minter: signerAddress,
            to: recipients.map((r) => normalizeAddress(r.to)),
            uri: recipients.map((r) => r.uri),
            reason,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async transferLicense({ licenseId, to, reason = "", gasLimit, memo }) {
      return exec(
        [
          msg.license.transfer({
            from: signerAddress,
            to: normalizeAddress(to),
            license_id: toBigInt(licenseId),
            reason,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async burnLicense({ licenseId, reason = "", gasLimit, memo }) {
      return exec(
        [
          msg.license.burn({
            authority: signerAddress,
            id: toBigInt(licenseId),
            reason,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async revokeLicense({ licenseId, reason = "", gasLimit, memo }) {
      return exec(
        [
          msg.license.revoke({
            authority: signerAddress,
            id: toBigInt(licenseId),
            reason,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async setTokenUri({ licenseId, uri, gasLimit, memo }) {
      return exec(
        [
          msg.license.setTokenUri({
            minter: signerAddress,
            id: toBigInt(licenseId),
            uri,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async approveMember({ member, gasLimit, memo }) {
      return exec(
        [
          msg.license.approveMember({
            authority: signerAddress,
            member: normalizeAddress(member),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async batchApproveMembers({ members, gasLimit, memo }) {
      return exec(
        [
          msg.license.batchApproveMember({
            authority: signerAddress,
            members: normalizeAddresses(members),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async revokeMember({ member, gasLimit, memo }) {
      return exec(
        [
          msg.license.revokeMember({
            authority: signerAddress,
            member: normalizeAddress(member),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async batchRevokeMembers({ members, gasLimit, memo }) {
      return exec(
        [
          msg.license.batchRevokeMember({
            authority: signerAddress,
            members: normalizeAddresses(members),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async setKycApprovers({ add = [], remove = [], gasLimit, memo }) {
      return exec(
        [
          msg.license.setKycApprovers({
            authority: signerAddress,
            add: normalizeAddresses(add),
            remove: normalizeAddresses(remove),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async setMinters({ add = [], remove = [], gasLimit, memo }) {
      return exec(
        [
          msg.license.setMinters({
            authority: signerAddress,
            add: normalizeAddresses(add),
            remove: normalizeAddresses(remove),
          }),
        ],
        { gasLimit, memo },
      );
    },

    // ============================================================================
    // Miner Transactions
    // ============================================================================

    async delegateLicenses({ licenseIds, operator, gasLimit, memo }) {
      return exec(
        [
          msg.miner.delegate({
            owner: signerAddress,
            license_ids: licenseIds.map(toBigInt),
            operator: normalizeAddress(operator),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async undelegateLicenses({ licenseIds, gasLimit, memo }) {
      return exec(
        [
          msg.miner.cancelDelegation({
            owner: signerAddress,
            license_ids: licenseIds.map(toBigInt),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async redelegateLicenses({ licenseIds, newOperator, gasLimit, memo }) {
      return exec(
        [
          msg.miner.redelegate({
            owner: signerAddress,
            license_ids: licenseIds.map(toBigInt),
            new_operator: normalizeAddress(newOperator),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async setVrfKey({ vrfPubkey, possessionProof, nonce, gasLimit, memo }) {
      return exec(
        [
          msg.miner.setOwnerVrfKey({
            owner: signerAddress,
            vrf_pubkey: vrfPubkey,
            possession_proof: possessionProof,
            nonce: toBigInt(nonce),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async submitWork({ licenseId, epoch, y, proof, nonce, gasLimit, memo }) {
      return exec(
        [
          msg.miner.submitWork({
            submitter: signerAddress,
            license_id: toBigInt(licenseId),
            epoch: toBigInt(epoch),
            y,
            proof,
            nonce,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async batchSubmitWork({ submissions, gasLimit, memo }) {
      const mappedSubmissions: WorkSubmission[] = submissions.map((s) => ({
        license_id: toBigInt(s.licenseId),
        epoch: toBigInt(s.epoch),
        y: s.y,
        proof: s.proof,
        nonce: s.nonce,
      }));

      return exec(
        [
          msg.miner.batchSubmitWork({
            submitter: signerAddress,
            submissions: mappedSubmissions,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async registerOperator({ commissionRate, commissionRecipient, gasLimit, memo }) {
      return exec(
        [
          msg.miner.registerOperator({
            operator: signerAddress,
            commission_rate: toBigInt(commissionRate),
            commission_recipient: normalizeAddress(commissionRecipient ?? signerAddress),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async unregisterOperator(params = {}) {
      return exec(
        [
          msg.miner.unregisterOperator({
            operator: signerAddress,
          }),
        ],
        { gasLimit: params.gasLimit, memo: params.memo },
      );
    },

    async updateOperatorInfo({ newCommissionRate, newCommissionRecipient, gasLimit, memo }) {
      return exec(
        [
          msg.miner.updateOperatorInfo({
            operator: signerAddress,
            new_commission_rate: toBigInt(newCommissionRate),
            new_commission_recipient: normalizeAddress(newCommissionRecipient ?? signerAddress),
          }),
        ],
        { gasLimit, memo },
      );
    },

    // ============================================================================
    // Exchange Transactions
    // ============================================================================

    async placeLimitOrder({ marketId, isBuy, price, quantity, lifespanSeconds, gasLimit, memo }) {
      return exec(
        [
          msg.exchange.placeLimitOrder({
            sender: signerAddress,
            market_id: toBigInt(marketId),
            is_buy: isBuy,
            price,
            quantity,
            lifespan: secondsToNanoseconds(lifespanSeconds),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async placeMarketOrder({ marketId, isBuy, quantity, gasLimit, memo }) {
      return exec(
        [
          msg.exchange.placeMarketOrder({
            sender: signerAddress,
            market_id: toBigInt(marketId),
            is_buy: isBuy,
            quantity,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async cancelOrder({ orderId, gasLimit, memo }) {
      return exec(
        [
          msg.exchange.cancelOrder({
            sender: signerAddress,
            order_id: orderId,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async cancelAllOrders({ marketId, gasLimit, memo }) {
      return exec(
        [
          msg.exchange.cancelAllOrders({
            sender: signerAddress,
            market_id: toBigInt(marketId),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async createMarket({ baseDenom, quoteDenom, gasLimit, memo }) {
      return exec(
        [
          msg.exchange.createMarket({
            sender: signerAddress,
            base_denom: baseDenom,
            quote_denom: quoteDenom,
          }),
        ],
        { gasLimit, memo },
      );
    },

    // Low-level access
    _lowLevel: lowLevel,
  };
}
