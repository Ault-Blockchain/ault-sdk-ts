import { hexToBytes, hashTypedData, recoverPublicKey } from "viem";
import { buildEip712TypedData, type Eip712Msg, type Eip712TxContext } from "./builder";
import { GAS_CONSTANTS, TIMING_CONSTANTS, type NetworkConfig } from "../core/network";
import { fetchJson, postJson, type FetchFn } from "../core/http";
import { bytesToBase64, base64ToBytes, isBase64String, type Base64String } from "../core/base64";
import { parseEvmChainIdFromCosmosChainId } from "../utils/chain-id";
import {
  normalizeSigner,
  normalizeSignature,
  resolveSignerAddress,
  type SignerInput,
} from "./signers";
import {
  encodeAuthInfo,
  encodeEthSecp256k1PubKey,
  encodeTxBody,
  encodeTxRaw,
  SIGN_MODE_LEGACY_AMINO_JSON,
} from "../proto/tx-encode";
import {
  MsgMintLicense,
  MsgBatchMintLicense,
  MsgApproveMember,
  MsgRevokeMember,
  MsgBatchApproveMember,
  MsgBatchRevokeMember,
  MsgRevokeLicense,
  MsgBurnLicense,
  MsgSetTokenURI,
  MsgSetMinters,
  MsgSetParams,
  MsgUpdateParams,
  MsgSetKYCApprovers,
  MsgTransferLicense,
  type LicenseParams,
} from "../proto/messages/license";
import {
  MsgDelegateMining,
  MsgCancelMiningDelegation,
  MsgSetOwnerVrfKey,
  MsgSubmitWork,
  MsgBatchSubmitWork,
  MsgUpdateParams as MsgUpdateMinerParams,
  MsgRegisterOperator,
  MsgUnregisterOperator,
  MsgUpdateOperatorInfo,
  MsgRedelegateMining,
  type MinerParams,
} from "../proto/messages/miner";
import {
  MsgCreateMarket,
  MsgPlaceLimitOrder,
  MsgPlaceMarketOrder,
  MsgCancelOrder,
  MsgCancelAllOrders,
  MsgUpdateMarketParams,
} from "../proto/messages/exchange";

interface NodeInfoResponse {
  default_node_info?: { network?: string };
  node_info?: { network?: string };
}

export interface AccountInfo {
  accountNumber: number;
  sequence: number;
  pubkeyBase64: string | null;
}

interface AccountQueryResponse {
  account: {
    base_account?: {
      account_number?: string;
      accountNumber?: string;
      sequence?: string;
      pub_key?: { key?: string };
      pubKey?: { key?: string };
    };
    baseAccount?: {
      account_number?: string;
      accountNumber?: string;
      sequence?: string;
      pub_key?: { key?: string };
      pubKey?: { key?: string };
    };
    account?: {
      base_account?: {
        account_number?: string;
        accountNumber?: string;
        sequence?: string;
        pub_key?: { key?: string };
        pubKey?: { key?: string };
      };
    };
    account_number?: string;
    accountNumber?: string;
    sequence?: string;
    pub_key?: { key?: string };
    pubKey?: { key?: string };
  };
}

let cachedChainId: string | null = null;
const EMPTY_RECORD: Record<string, unknown> = {};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object") {
    return value as Record<string, unknown>;
  }
  return EMPTY_RECORD;
}

function assertSnakeCaseKeysDeep(label: string, value: unknown, path = ""): void {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      assertSnakeCaseKeysDeep(label, item, `${path}[${index}]`);
    });
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/[A-Z]/.test(key)) {
      const pointer = path ? `${path}.${key}` : key;
      throw new Error(`${label} expects snake_case keys; received "${pointer}".`);
    }
    const childPath = path ? `${path}.${key}` : key;
    assertSnakeCaseKeysDeep(label, child, childPath);
  }
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }
  return value;
}

function requireBase64(value: unknown, label: string): Base64String {
  const str = requireString(value, label);
  if (!isBase64String(str)) {
    throw new Error(`${label} must be a base64 string.`);
  }
  return str as Base64String;
}

function requireStringOrDefault(value: unknown, label: string, defaultValue = ""): string {
  if (value === undefined) {
    return defaultValue;
  }
  return requireString(value, label);
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be a string[].`);
  }
  for (const item of value) {
    if (typeof item !== "string") {
      throw new Error(`${label} must be a string[].`);
    }
  }
  return value;
}

function requireRecordArray(value: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array of objects.`);
  }
  const records: Record<string, unknown>[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`${label} must be an array of objects.`);
    }
    records.push(item as Record<string, unknown>);
  }
  return records;
}

function requireStringArrayOrDefault(
  value: unknown,
  label: string,
  defaultValue: string[] = [],
): string[] {
  if (value === undefined) {
    return defaultValue;
  }
  return requireStringArray(value, label);
}

function requireBool(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean.`);
  }
  return value;
}

function requireBoolOrDefault(value: unknown, label: string, defaultValue = false): boolean {
  if (value === undefined) {
    return defaultValue;
  }
  return requireBool(value, label);
}

function requireBigIntLike(value: unknown, label: string): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return BigInt(value);
  }
  throw new Error(`${label} must be a bigint or decimal string.`);
}

function requireBigIntArray(value: unknown, label: string): bigint[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array of bigints or decimal strings.`);
  }
  return value.map((item, index) => requireBigIntLike(item, `${label}[${index}]`));
}

function requireBigIntOrDefault(value: unknown, label: string, defaultValue = 0n): bigint {
  if (value === undefined) {
    return defaultValue;
  }
  return requireBigIntLike(value, label);
}

function mapLicenseParams(input?: Record<string, unknown>): LicenseParams {
  const params = asRecord(input);
  assertSnakeCaseKeysDeep("license params", params);
  return {
    class_name: requireStringOrDefault(params.class_name, "params.class_name"),
    class_symbol: requireStringOrDefault(params.class_symbol, "params.class_symbol"),
    base_token_uri: requireStringOrDefault(params.base_token_uri, "params.base_token_uri"),
    minting_paused: requireBoolOrDefault(params.minting_paused, "params.minting_paused"),
    supply_cap: requireBigIntOrDefault(params.supply_cap, "params.supply_cap"),
    allow_metadata_update: requireBoolOrDefault(
      params.allow_metadata_update,
      "params.allow_metadata_update",
    ),
    admin_can_revoke: requireBoolOrDefault(params.admin_can_revoke, "params.admin_can_revoke"),
    admin_can_burn: requireBoolOrDefault(params.admin_can_burn, "params.admin_can_burn"),
    max_batch_mint_size: requireBigIntOrDefault(
      params.max_batch_mint_size,
      "params.max_batch_mint_size",
    ),
    transfer_unlock_days: requireBigIntOrDefault(
      params.transfer_unlock_days,
      "params.transfer_unlock_days",
    ),
    enable_transfers: requireBoolOrDefault(params.enable_transfers, "params.enable_transfers"),
    minter_allowed_msgs: requireStringArrayOrDefault(
      params.minter_allowed_msgs,
      "params.minter_allowed_msgs",
    ),
    kyc_approver_allowed_msgs: requireStringArrayOrDefault(
      params.kyc_approver_allowed_msgs,
      "params.kyc_approver_allowed_msgs",
    ),
    free_max_gas_limit: requireBigIntOrDefault(
      params.free_max_gas_limit,
      "params.free_max_gas_limit",
    ),
    max_voting_power_per_address: requireBigIntOrDefault(
      params.max_voting_power_per_address,
      "params.max_voting_power_per_address",
    ),
  };
}

function mapMinerParams(input?: Record<string, unknown>): MinerParams {
  const params = asRecord(input);
  assertSnakeCaseKeysDeep("miner params", params);
  return {
    epoch_length_seconds: requireBigIntOrDefault(
      params.epoch_length_seconds,
      "params.epoch_length_seconds",
    ),
    target_winners_per_epoch: requireBigIntOrDefault(
      params.target_winners_per_epoch,
      "params.target_winners_per_epoch",
    ),
    max_winners_per_epoch: requireBigIntOrDefault(
      params.max_winners_per_epoch,
      "params.max_winners_per_epoch",
    ),
    submission_window_seconds: requireBigIntOrDefault(
      params.submission_window_seconds,
      "params.submission_window_seconds",
    ),
    controller_alpha_q16: requireBigIntOrDefault(
      params.controller_alpha_q16,
      "params.controller_alpha_q16",
    ),
    controller_window: requireBigIntOrDefault(params.controller_window, "params.controller_window"),
    threshold_min: requireStringOrDefault(params.threshold_min, "params.threshold_min"),
    threshold_max: requireStringOrDefault(params.threshold_max, "params.threshold_max"),
    beacon_window_epochs: requireBigIntOrDefault(
      params.beacon_window_epochs,
      "params.beacon_window_epochs",
    ),
    key_rotation_cooldown_seconds: requireBigIntOrDefault(
      params.key_rotation_cooldown_seconds,
      "params.key_rotation_cooldown_seconds",
    ),
    vrf_verify_gas: requireBigIntOrDefault(params.vrf_verify_gas, "params.vrf_verify_gas"),
    min_key_age_epochs: requireBigIntOrDefault(
      params.min_key_age_epochs,
      "params.min_key_age_epochs",
    ),
    initial_emission_per_epoch: requireStringOrDefault(
      params.initial_emission_per_epoch,
      "params.initial_emission_per_epoch",
    ),
    emission_decay_rate: requireStringOrDefault(
      params.emission_decay_rate,
      "params.emission_decay_rate",
    ),
    max_emission_years: requireBigIntOrDefault(
      params.max_emission_years,
      "params.max_emission_years",
    ),
    max_payouts_per_block: requireBigIntOrDefault(
      params.max_payouts_per_block,
      "params.max_payouts_per_block",
    ),
    max_epochs_per_block: requireBigIntOrDefault(
      params.max_epochs_per_block,
      "params.max_epochs_per_block",
    ),
    staking_reward_percentage: requireBigIntOrDefault(
      params.staking_reward_percentage,
      "params.staking_reward_percentage",
    ),
    max_commission_rate: requireBigIntOrDefault(
      params.max_commission_rate,
      "params.max_commission_rate",
    ),
    max_commission_rate_increase_per_epoch: requireBigIntOrDefault(
      params.max_commission_rate_increase_per_epoch,
      "params.max_commission_rate_increase_per_epoch",
    ),
    free_mining_until_epoch: requireBigIntOrDefault(
      params.free_mining_until_epoch,
      "params.free_mining_until_epoch",
    ),
    free_mining_max_gas_limit: requireBigIntOrDefault(
      params.free_mining_max_gas_limit,
      "params.free_mining_max_gas_limit",
    ),
    miner_allowed_msgs: requireStringArrayOrDefault(
      params.miner_allowed_msgs,
      "params.miner_allowed_msgs",
    ),
    max_free_tx_per_epoch: requireBigIntOrDefault(
      params.max_free_tx_per_epoch,
      "params.max_free_tx_per_epoch",
    ),
  };
}

export async function queryChainId(
  network: NetworkConfig,
  fetchFn?: FetchFn,
  fetchOptions?: import("../core/http").FetchWithRetryOptions,
): Promise<string> {
  if (cachedChainId) {
    return cachedChainId;
  }

  try {
    const data = await fetchJson<NodeInfoResponse>(
      `${network.restUrl}/cosmos/base/tendermint/v1beta1/node_info`,
      {},
      { timeout: TIMING_CONSTANTS.API_TIMEOUT_MS, retries: 2, ...fetchOptions },
      fetchFn,
    );
    const chainId = data.default_node_info?.network ?? data.node_info?.network;
    if (chainId) {
      cachedChainId = chainId;
      return chainId;
    }
  } catch {
    // fall back to configured chain ID
  }

  return network.chainId;
}

export async function queryAccount(
  network: NetworkConfig,
  address: string,
  fetchFn?: FetchFn,
  fetchOptions?: import("../core/http").FetchWithRetryOptions,
): Promise<AccountInfo> {
  const data = await fetchJson<AccountQueryResponse>(
    `${network.restUrl}/cosmos/auth/v1beta1/accounts/${address}`,
    {},
    { timeout: TIMING_CONSTANTS.API_TIMEOUT_MS, retries: 3, ...fetchOptions },
    fetchFn,
  );

  const account = data.account;
  const base =
    account?.base_account ?? account?.baseAccount ?? account?.account?.base_account ?? account;
  const accountNumber = Number(base.account_number ?? base.accountNumber ?? 0);
  const sequence = Number(base.sequence ?? 0);
  const pubkey = base.pub_key?.key ?? base.pubKey?.key ?? null;

  return { accountNumber, sequence, pubkeyBase64: pubkey };
}

async function recoverPubkeyFromTypedDataSignature(
  typedData: ReturnType<typeof buildEip712TypedData>,
  signature: `0x${string}`,
): Promise<string> {
  const hash = hashTypedData({
    domain: typedData.domain as Parameters<typeof hashTypedData>[0]["domain"],
    types: typedData.types as Parameters<typeof hashTypedData>[0]["types"],
    primaryType: typedData.primaryType,
    message: typedData.message as Parameters<typeof hashTypedData>[0]["message"],
  });

  const publicKey = await recoverPublicKey({ hash, signature });
  const uncompressedBytes = hexToBytes(publicKey);
  const x = uncompressedBytes.slice(1, 33);
  const y = uncompressedBytes.slice(33, 65);
  const prefix = y[31] % 2 === 0 ? 0x02 : 0x03;
  const compressed = new Uint8Array(33);
  compressed[0] = prefix;
  compressed.set(x, 1);
  return bytesToBase64(compressed);
}

const MSG_ENCODERS: Record<string, (value: Record<string, unknown>) => Uint8Array> = {
  "/ault.license.v1.MsgMintLicense": (value) =>
    MsgMintLicense.encode(
      MsgMintLicense.fromPartial({
        minter: requireString(value.minter, "minter"),
        to: requireString(value.to, "to"),
        uri: requireString(value.uri, "uri"),
        reason: requireString(value.reason, "reason"),
      }),
    ).finish(),
  "/ault.license.v1.MsgBatchMintLicense": (value) =>
    MsgBatchMintLicense.encode(
      MsgBatchMintLicense.fromPartial({
        minter: requireString(value.minter, "minter"),
        to: requireStringArray(value.to, "to"),
        uri: requireStringArray(value.uri, "uri"),
        reason: requireString(value.reason, "reason"),
      }),
    ).finish(),
  "/ault.license.v1.MsgApproveMember": (value) =>
    MsgApproveMember.encode(
      MsgApproveMember.fromPartial({
        authority: requireString(value.authority, "authority"),
        member: requireString(value.member, "member"),
      }),
    ).finish(),
  "/ault.license.v1.MsgRevokeMember": (value) =>
    MsgRevokeMember.encode(
      MsgRevokeMember.fromPartial({
        authority: requireString(value.authority, "authority"),
        member: requireString(value.member, "member"),
      }),
    ).finish(),
  "/ault.license.v1.MsgBatchApproveMember": (value) =>
    MsgBatchApproveMember.encode(
      MsgBatchApproveMember.fromPartial({
        authority: requireString(value.authority, "authority"),
        members: requireStringArray(value.members, "members"),
      }),
    ).finish(),
  "/ault.license.v1.MsgBatchRevokeMember": (value) =>
    MsgBatchRevokeMember.encode(
      MsgBatchRevokeMember.fromPartial({
        authority: requireString(value.authority, "authority"),
        members: requireStringArray(value.members, "members"),
      }),
    ).finish(),
  "/ault.license.v1.MsgRevokeLicense": (value) =>
    MsgRevokeLicense.encode(
      MsgRevokeLicense.fromPartial({
        authority: requireString(value.authority, "authority"),
        id: requireBigIntLike(value.id, "id"),
        reason: requireString(value.reason, "reason"),
      }),
    ).finish(),
  "/ault.license.v1.MsgBurnLicense": (value) =>
    MsgBurnLicense.encode(
      MsgBurnLicense.fromPartial({
        authority: requireString(value.authority, "authority"),
        id: requireBigIntLike(value.id, "id"),
        reason: requireString(value.reason, "reason"),
      }),
    ).finish(),
  "/ault.license.v1.MsgSetTokenURI": (value) =>
    MsgSetTokenURI.encode(
      MsgSetTokenURI.fromPartial({
        minter: requireString(value.minter, "minter"),
        id: requireBigIntLike(value.id, "id"),
        uri: requireString(value.uri, "uri"),
      }),
    ).finish(),
  "/ault.license.v1.MsgSetMinters": (value) =>
    MsgSetMinters.encode(
      MsgSetMinters.fromPartial({
        authority: requireString(value.authority, "authority"),
        add: requireStringArray(value.add, "add"),
        remove: requireStringArray(value.remove, "remove"),
      }),
    ).finish(),
  "/ault.license.v1.MsgSetParams": (value) =>
    MsgSetParams.encode(
      MsgSetParams.fromPartial({
        authority: requireString(value.authority, "authority"),
        params: mapLicenseParams(asRecord(value.params)),
      }),
    ).finish(),
  "/ault.license.v1.MsgUpdateParams": (value) =>
    MsgUpdateParams.encode(
      MsgUpdateParams.fromPartial({
        authority: requireString(value.authority, "authority"),
        params: mapLicenseParams(asRecord(value.params)),
      }),
    ).finish(),
  "/ault.license.v1.MsgSetKYCApprovers": (value) =>
    MsgSetKYCApprovers.encode(
      MsgSetKYCApprovers.fromPartial({
        authority: requireString(value.authority, "authority"),
        add: requireStringArray(value.add, "add"),
        remove: requireStringArray(value.remove, "remove"),
      }),
    ).finish(),
  "/ault.license.v1.MsgTransferLicense": (value) =>
    MsgTransferLicense.encode(
      MsgTransferLicense.fromPartial({
        from: requireString(value.from, "from"),
        to: requireString(value.to, "to"),
        license_id: requireBigIntLike(value.license_id, "license_id"),
        reason: requireString(value.reason, "reason"),
      }),
    ).finish(),
  "/ault.miner.v1.MsgDelegateMining": (value) => {
    const licenseIds = requireBigIntArray(value.license_ids, "license_ids");
    return MsgDelegateMining.encode({
      owner: requireString(value.owner, "owner"),
      license_ids: licenseIds,
      operator: requireString(value.operator, "operator"),
    }).finish();
  },
  "/ault.miner.v1.MsgCancelMiningDelegation": (value) => {
    const licenseIds = requireBigIntArray(value.license_ids, "license_ids");
    return MsgCancelMiningDelegation.encode({
      owner: requireString(value.owner, "owner"),
      license_ids: licenseIds,
    }).finish();
  },
  "/ault.miner.v1.MsgSetOwnerVrfKey": (value) =>
    MsgSetOwnerVrfKey.encode(
      MsgSetOwnerVrfKey.fromPartial({
        vrf_pubkey: requireBase64(value.vrf_pubkey, "vrf_pubkey"),
        possession_proof: requireBase64(value.possession_proof, "possession_proof"),
        nonce: requireBigIntLike(value.nonce, "nonce"),
        owner: requireString(value.owner, "owner"),
      }),
    ).finish(),
  "/ault.miner.v1.MsgSubmitWork": (value) =>
    MsgSubmitWork.encode(
      MsgSubmitWork.fromPartial({
        license_id: requireBigIntLike(value.license_id, "license_id"),
        epoch: requireBigIntLike(value.epoch, "epoch"),
        y: requireBase64(value.y, "y"),
        proof: requireBase64(value.proof, "proof"),
        nonce: requireBase64(value.nonce, "nonce"),
        submitter: requireString(value.submitter, "submitter"),
      }),
    ).finish(),
  "/ault.miner.v1.MsgBatchSubmitWork": (value) =>
    MsgBatchSubmitWork.encode(
      MsgBatchSubmitWork.fromPartial({
        submitter: requireString(value.submitter, "submitter"),
        submissions: requireRecordArray(value.submissions, "submissions").map((submission) => ({
          license_id: requireBigIntLike(submission.license_id, "submissions[].license_id"),
          epoch: requireBigIntLike(submission.epoch, "submissions[].epoch"),
          y: requireBase64(submission.y, "submissions[].y"),
          proof: requireBase64(submission.proof, "submissions[].proof"),
          nonce: requireBase64(submission.nonce, "submissions[].nonce"),
        })),
      }),
    ).finish(),
  "/ault.miner.v1.MsgUpdateParams": (value) =>
    MsgUpdateMinerParams.encode(
      MsgUpdateMinerParams.fromPartial({
        authority: requireString(value.authority, "authority"),
        params: mapMinerParams(asRecord(value.params)),
      }),
    ).finish(),
  "/ault.miner.v1.MsgRegisterOperator": (value) =>
    MsgRegisterOperator.encode(
      MsgRegisterOperator.fromPartial({
        operator: requireString(value.operator, "operator"),
        commission_rate: requireBigIntLike(value.commission_rate, "commission_rate"),
        commission_recipient: requireString(value.commission_recipient, "commission_recipient"),
      }),
    ).finish(),
  "/ault.miner.v1.MsgUnregisterOperator": (value) =>
    MsgUnregisterOperator.encode(
      MsgUnregisterOperator.fromPartial({
        operator: requireString(value.operator, "operator"),
      }),
    ).finish(),
  "/ault.miner.v1.MsgUpdateOperatorInfo": (value) =>
    MsgUpdateOperatorInfo.encode(
      MsgUpdateOperatorInfo.fromPartial({
        operator: requireString(value.operator, "operator"),
        new_commission_rate: requireBigIntLike(value.new_commission_rate, "new_commission_rate"),
        new_commission_recipient: requireString(
          value.new_commission_recipient,
          "new_commission_recipient",
        ),
      }),
    ).finish(),
  "/ault.miner.v1.MsgRedelegateMining": (value) => {
    const licenseIds = requireBigIntArray(value.license_ids, "license_ids");
    return MsgRedelegateMining.encode({
      owner: requireString(value.owner, "owner"),
      license_ids: licenseIds,
      new_operator: requireString(value.new_operator, "new_operator"),
    }).finish();
  },
  "/ault.exchange.v1beta1.MsgCreateMarket": (value) =>
    MsgCreateMarket.encode(
      MsgCreateMarket.fromPartial({
        sender: requireString(value.sender, "sender"),
        base_denom: requireString(value.base_denom, "base_denom"),
        quote_denom: requireString(value.quote_denom, "quote_denom"),
      }),
    ).finish(),
  "/ault.exchange.v1beta1.MsgPlaceLimitOrder": (value) =>
    MsgPlaceLimitOrder.encode(
      MsgPlaceLimitOrder.fromPartial({
        sender: requireString(value.sender, "sender"),
        market_id: requireBigIntLike(value.market_id, "market_id"),
        is_buy: requireBool(value.is_buy, "is_buy"),
        price: requireString(value.price, "price"),
        quantity: requireString(value.quantity, "quantity"),
        lifespan: requireBigIntLike(value.lifespan, "lifespan"),
      }),
    ).finish(),
  "/ault.exchange.v1beta1.MsgPlaceMarketOrder": (value) =>
    MsgPlaceMarketOrder.encode(
      MsgPlaceMarketOrder.fromPartial({
        sender: requireString(value.sender, "sender"),
        market_id: requireBigIntLike(value.market_id, "market_id"),
        is_buy: requireBool(value.is_buy, "is_buy"),
        quantity: requireString(value.quantity, "quantity"),
      }),
    ).finish(),
  "/ault.exchange.v1beta1.MsgCancelOrder": (value) =>
    MsgCancelOrder.encode(
      MsgCancelOrder.fromPartial({
        sender: requireString(value.sender, "sender"),
        order_id: requireBase64(value.order_id, "order_id"),
      }),
    ).finish(),
  "/ault.exchange.v1beta1.MsgCancelAllOrders": (value) =>
    MsgCancelAllOrders.encode(
      MsgCancelAllOrders.fromPartial({
        sender: requireString(value.sender, "sender"),
        market_id: requireBigIntLike(value.market_id, "market_id"),
      }),
    ).finish(),
  "/ault.exchange.v1beta1.MsgUpdateMarketParams": (value) =>
    MsgUpdateMarketParams.encode(
      MsgUpdateMarketParams.fromPartial({
        authority: requireString(value.authority, "authority"),
        updates: requireRecordArray(value.updates, "updates").map((update) => ({
          market_id: requireBigIntLike(update.market_id, "updates[].market_id"),
          maker_fee_rate: requireString(update.maker_fee_rate, "updates[].maker_fee_rate"),
          taker_fee_rate: requireString(update.taker_fee_rate, "updates[].taker_fee_rate"),
        })),
      }),
    ).finish(),
};

export interface SignAndBroadcastParams {
  network: NetworkConfig;
  signer?: SignerInput;
  signerAddress?: string;
  msgs: Eip712Msg[];
  memo?: string;
  gasLimit?: string;
  fetchFn?: FetchFn;
  fetchOptions?: import("../core/http").FetchWithRetryOptions;
}

export async function signAndBroadcastEip712({
  network,
  signerAddress,
  signer,
  msgs,
  memo = "",
  gasLimit,
  fetchFn,
  fetchOptions,
}: SignAndBroadcastParams): Promise<{ txHash: string; code: number; rawLog?: string }> {
  const resolvedSigner = normalizeSigner(signer);
  if (!resolvedSigner) {
    throw new Error("signer is required to sign EIP-712 typed data.");
  }
  const resolvedSignerAddress = await resolveSignerAddress(resolvedSigner, signerAddress);

  for (const msg of msgs) {
    assertSnakeCaseKeysDeep(`message value for ${msg.typeUrl}`, msg.value);
  }
  const actualChainId = await queryChainId(network, fetchFn, fetchOptions);
  const accountInfo = await queryAccount(network, resolvedSignerAddress, fetchFn, fetchOptions);

  const context: Eip712TxContext = {
    chainId: actualChainId,
    accountNumber: accountInfo.accountNumber,
    sequence: accountInfo.sequence,
    fee: {
      amount: GAS_CONSTANTS.EIP712_FEE_AMOUNT,
      denom: GAS_CONSTANTS.DENOM,
      gas: gasLimit || GAS_CONSTANTS.EIP712_GAS_LIMIT,
    },
    memo,
  };

  const evmChainId = parseEvmChainIdFromCosmosChainId(actualChainId) ?? network.evmChainId;
  const typedData = buildEip712TypedData(context, msgs, evmChainId);
  const signature = normalizeSignature(await resolvedSigner.signTypedData(typedData));

  const pubkey =
    accountInfo.pubkeyBase64 ||
    (await recoverPubkeyFromTypedDataSignature(typedData, signature as `0x${string}`));

  const sigBytes = hexToBytes(signature as `0x${string}`);
  const sigWithoutRecovery = sigBytes.slice(0, 64);

  const encodedMessages = msgs.map((msg) => {
    const encoder = MSG_ENCODERS[msg.typeUrl];
    if (!encoder) {
      throw new Error(`No encoder found for message type: ${msg.typeUrl}`);
    }
    return { typeUrl: msg.typeUrl, value: encoder(msg.value) };
  });

  const bodyBytes = encodeTxBody({ messages: encodedMessages, memo });
  const pubkeyBytes = base64ToBytes(pubkey);
  const pubkeyProto = encodeEthSecp256k1PubKey(pubkeyBytes);

  const authInfoBytes = encodeAuthInfo({
    signerInfos: [
      {
        publicKey: { typeUrl: "/cosmos.evm.crypto.v1.ethsecp256k1.PubKey", value: pubkeyProto },
        mode: SIGN_MODE_LEGACY_AMINO_JSON,
        sequence: accountInfo.sequence,
      },
    ],
    fee: {
      amount: [{ denom: GAS_CONSTANTS.DENOM, amount: context.fee.amount }],
      gasLimit: BigInt(context.fee.gas),
    },
  });

  const txRawBytes = encodeTxRaw({
    bodyBytes,
    authInfoBytes,
    signatures: [sigWithoutRecovery],
  });

  const txBytesBase64 = bytesToBase64(txRawBytes);

  const result = await postJson<
    { tx_bytes: string; mode: string },
    { tx_response: { txhash: string; code: number; raw_log?: string } }
  >(
    `${network.restUrl}/cosmos/tx/v1beta1/txs`,
    { tx_bytes: txBytesBase64, mode: "BROADCAST_MODE_SYNC" },
    { timeout: TIMING_CONSTANTS.API_TIMEOUT_MS, retries: 2, ...fetchOptions },
    fetchFn,
  );

  return {
    txHash: result.tx_response.txhash,
    code: result.tx_response.code,
    rawLog: result.tx_response.raw_log,
  };
}
