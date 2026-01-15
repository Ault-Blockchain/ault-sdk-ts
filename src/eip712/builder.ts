import { getEip712Domain } from "./domain";
import {
  EIP712_MSG_TYPES,
  type Eip712MsgTypeConfig,
  type LicenseParams,
  type MinerParams,
  type WorkSubmission,
  type MarketParamUpdate,
} from "./registry";
import type { Base64String } from "../core/base64";
import {
  EIP712_DOMAIN_TYPE,
  TX_BASE_FIELDS,
  FEE_TYPE,
  COIN_TYPE,
  type Eip712Field,
  type Eip712TypedData,
} from "./types";
import { parseEvmChainIdFromCosmosChainId } from "../utils/chain-id";
import { validateEip712FieldOrderInDev } from "./field-order";

validateEip712FieldOrderInDev();

export interface Eip712TxContext {
  chainId: string;
  accountNumber: number;
  sequence: number;
  fee: {
    amount: string;
    denom: string;
    gas: string;
  };
  memo: string;
}

export interface Eip712Msg<T = Record<string, unknown>> {
  typeUrl: string;
  value: T;
}

// Re-export types for convenience
export type { Base64String } from "../core/base64";
export { asBase64String } from "../core/base64";
export type { LicenseParams, MinerParams, WorkSubmission, MarketParamUpdate };

// ============================================================================
// Core EIP-712 typed data builder
// ============================================================================

function typesAreEqual(types1: Eip712Field[], types2: Eip712Field[]): boolean {
  if (types1.length !== types2.length) return false;
  for (let i = 0; i < types1.length; i++) {
    if (types1[i].name !== types2[i].name || types1[i].type !== types2[i].type) {
      return false;
    }
  }
  return true;
}

function addTypeWithDedup(
  types: Record<string, Eip712Field[]>,
  baseName: string,
  typeFields: Eip712Field[],
): string {
  for (let index = 0; index < 1000; index++) {
    const indexedName = `${baseName}${index}`;
    const existing = types[indexedName];

    if (!existing) {
      types[indexedName] = typeFields;
      return indexedName;
    }

    if (typesAreEqual(existing, typeFields)) {
      return indexedName;
    }
  }

  throw new Error(`Exceeded maximum duplicate types for ${baseName}`);
}

function toTypeNameFromField(fieldName: string): string {
  const parts = fieldName.split("_").filter(Boolean);
  const title = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
  return `TypeValue${title}`;
}

function resolveValueFields(
  types: Record<string, Eip712Field[]>,
  msgConfig: Eip712MsgTypeConfig,
  msgValue: Record<string, unknown>,
): Eip712Field[] {
  return msgConfig.valueFields.map((field) => {
    if (!field.type.startsWith("NESTED")) {
      return { ...field };
    }

    const isArray = field.type.endsWith("[]");
    if (
      isArray &&
      Array.isArray(msgValue[field.name]) &&
      (msgValue[field.name] as unknown[]).length === 0
    ) {
      return { name: field.name, type: "string[]" };
    }
    const nestedFields = msgConfig.nestedTypes?.[field.name];
    if (!nestedFields) {
      throw new Error(`Missing nested type definition for field: ${field.name}`);
    }

    const baseTypeName = toTypeNameFromField(field.name);
    const nestedTypeName = addTypeWithDedup(types, baseTypeName, [...nestedFields]);
    const resolvedType = isArray ? `${nestedTypeName}[]` : nestedTypeName;
    return { name: field.name, type: resolvedType };
  });
}

function normalizeStringValue(value: unknown): unknown {
  if (typeof value === "bigint" || typeof value === "number") {
    return value.toString();
  }
  return value;
}

function normalizeStringArray(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }
  return value.map((item) => normalizeStringValue(item));
}

function normalizeTypedDataValue(
  value: unknown,
  fields: readonly Eip712Field[],
  nestedTypes?: Record<string, readonly Eip712Field[]>,
): Record<string, unknown> {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const normalized: Record<string, unknown> = {};

  for (const field of fields) {
    const raw = record[field.name];
    if (raw === undefined) {
      continue;
    }
    if (field.type.startsWith("NESTED")) {
      const nestedFields = nestedTypes?.[field.name];
      if (!nestedFields) {
        throw new Error(`Missing nested type definition for field: ${field.name}`);
      }
      if (field.type.endsWith("[]")) {
        if (Array.isArray(raw)) {
          normalized[field.name] = raw.map((item) =>
            normalizeTypedDataValue(item, nestedFields, nestedTypes),
          );
        } else {
          normalized[field.name] = raw;
        }
      } else {
        normalized[field.name] = normalizeTypedDataValue(raw, nestedFields, nestedTypes);
      }
      continue;
    }

    if (field.type === "string") {
      normalized[field.name] = normalizeStringValue(raw);
      continue;
    }
    if (field.type === "string[]") {
      normalized[field.name] = normalizeStringArray(raw);
      continue;
    }

    normalized[field.name] = raw;
  }

  return normalized;
}

export function buildEip712TypedData(
  context: Eip712TxContext,
  msgs: Eip712Msg[],
  evmChainId?: number,
): Eip712TypedData {
  if (msgs.length === 0) {
    throw new Error("At least one message is required");
  }

  const types: Record<string, Eip712Field[]> = {
    EIP712Domain: [...EIP712_DOMAIN_TYPE],
    Tx: [...TX_BASE_FIELDS],
    Fee: [...FEE_TYPE],
    Coin: [...COIN_TYPE],
  };

  const message: Record<string, unknown> = {
    account_number: context.accountNumber.toString(),
    chain_id: context.chainId,
    fee: {
      amount: [{ denom: context.fee.denom, amount: context.fee.amount }],
      gas: context.fee.gas,
    },
    memo: context.memo,
    sequence: context.sequence.toString(),
  };

  msgs.forEach((msg, index) => {
    const msgConfig = EIP712_MSG_TYPES[msg.typeUrl];
    if (!msgConfig) {
      throw new Error(`Unknown message type: ${msg.typeUrl}`);
    }
    if (msgConfig.legacyAminoRegistered === false) {
      throw new Error(
        `Message type ${msg.typeUrl} is not registered in the chain's legacy amino codec; EIP-712 signing is not supported yet.`,
      );
    }

    const msgField = `msg${index}`;
    const valueTypeFields = resolveValueFields(types, msgConfig, msg.value);
    const valueTypeName = addTypeWithDedup(types, "TypeValue", valueTypeFields);

    const msgTypeFields: Eip712Field[] = [
      { name: "value", type: valueTypeName },
      { name: "type", type: "string" },
    ];
    const msgTypeName = addTypeWithDedup(types, msgConfig.eip712TypeName, msgTypeFields);

    types.Tx.push({ name: msgField, type: msgTypeName });

    message[msgField] = {
      type: msgConfig.aminoType,
      value: normalizeTypedDataValue(msg.value, msgConfig.valueFields, msgConfig.nestedTypes),
    };
  });

  const resolvedEvmChainId =
    evmChainId ?? parseEvmChainIdFromCosmosChainId(context.chainId) ?? undefined;
  if (!resolvedEvmChainId) {
    throw new Error(`Unable to resolve EVM chain ID from chainId: ${context.chainId}`);
  }

  return {
    types,
    primaryType: "Tx" as const,
    domain: getEip712Domain(resolvedEvmChainId),
    message,
  };
}

// ============================================================================
// Generic msg builder - use this for any message type
// ============================================================================

function buildMsg<T extends Record<string, unknown>>(typeUrl: string, value: T): Eip712Msg<T> {
  return { typeUrl, value };
}

// ============================================================================
// Type-safe message builders organized by module
// ============================================================================

export const msg = {
  // License module
  license: {
    mint: (v: { minter: string; to: string; uri: string; reason: string }) =>
      buildMsg("/ault.license.v1.MsgMintLicense", v),

    batchMint: (v: { minter: string; to: string[]; uri: string[]; reason: string }) =>
      buildMsg("/ault.license.v1.MsgBatchMintLicense", v),

    approveMember: (v: { authority: string; member: string }) =>
      buildMsg("/ault.license.v1.MsgApproveMember", v),

    revokeMember: (v: { authority: string; member: string }) =>
      buildMsg("/ault.license.v1.MsgRevokeMember", v),

    batchApproveMember: (v: { authority: string; members: string[] }) =>
      buildMsg("/ault.license.v1.MsgBatchApproveMember", v),

    batchRevokeMember: (v: { authority: string; members: string[] }) =>
      buildMsg("/ault.license.v1.MsgBatchRevokeMember", v),

    revoke: (v: { authority: string; id: bigint; reason: string }) =>
      buildMsg("/ault.license.v1.MsgRevokeLicense", v),

    burn: (v: { authority: string; id: bigint; reason: string }) =>
      buildMsg("/ault.license.v1.MsgBurnLicense", v),

    setTokenUri: (v: { minter: string; id: bigint; uri: string }) =>
      buildMsg("/ault.license.v1.MsgSetTokenURI", v),

    setMinters: (v: { authority: string; add: string[]; remove: string[] }) =>
      buildMsg("/ault.license.v1.MsgSetMinters", v),

    setKycApprovers: (v: { authority: string; add: string[]; remove: string[] }) =>
      buildMsg("/ault.license.v1.MsgSetKYCApprovers", v),

    transfer: (v: { from: string; to: string; license_id: bigint; reason: string }) =>
      buildMsg("/ault.license.v1.MsgTransferLicense", v),

    setParams: (v: { authority: string; params: LicenseParams }) =>
      buildMsg("/ault.license.v1.MsgSetParams", v),

    updateParams: (v: { authority: string; params: LicenseParams }) =>
      buildMsg("/ault.license.v1.MsgUpdateParams", v),
  },

  // Miner module
  miner: {
    setOwnerVrfKey: (v: {
      owner: string;
      vrf_pubkey: Base64String;
      possession_proof: Base64String;
      nonce: bigint;
    }) => buildMsg("/ault.miner.v1.MsgSetOwnerVrfKey", v),

    submitWork: (v: {
      submitter: string;
      license_id: bigint;
      epoch: bigint;
      y: Base64String;
      proof: Base64String;
      nonce: Base64String;
    }) => buildMsg("/ault.miner.v1.MsgSubmitWork", v),

    batchSubmitWork: (v: { submitter: string; submissions: WorkSubmission[] }) =>
      buildMsg("/ault.miner.v1.MsgBatchSubmitWork", v),

    updateParams: (v: { authority: string; params: MinerParams }) =>
      buildMsg("/ault.miner.v1.MsgUpdateParams", v),

    registerOperator: (v: {
      operator: string;
      commission_rate: bigint;
      commission_recipient: string;
    }) => buildMsg("/ault.miner.v1.MsgRegisterOperator", v),

    unregisterOperator: (v: { operator: string }) =>
      buildMsg("/ault.miner.v1.MsgUnregisterOperator", v),

    updateOperatorInfo: (v: {
      operator: string;
      new_commission_rate: bigint;
      new_commission_recipient: string;
    }) => buildMsg("/ault.miner.v1.MsgUpdateOperatorInfo", v),

    delegate: (v: { owner: string; license_ids: bigint[]; operator: string }) =>
      buildMsg("/ault.miner.v1.MsgDelegateMining", v),

    redelegate: (v: { owner: string; license_ids: bigint[]; new_operator: string }) =>
      buildMsg("/ault.miner.v1.MsgRedelegateMining", v),

    cancelDelegation: (v: { owner: string; license_ids: bigint[] }) =>
      buildMsg("/ault.miner.v1.MsgCancelMiningDelegation", v),
  },

  // Exchange module
  exchange: {
    createMarket: (v: { sender: string; base_denom: string; quote_denom: string }) =>
      buildMsg("/ault.exchange.v1beta1.MsgCreateMarket", v),

    placeLimitOrder: (v: {
      sender: string;
      market_id: bigint;
      is_buy: boolean;
      price: string;
      quantity: string;
      lifespan: bigint;
    }) => buildMsg("/ault.exchange.v1beta1.MsgPlaceLimitOrder", v),

    placeMarketOrder: (v: {
      sender: string;
      market_id: bigint;
      is_buy: boolean;
      quantity: string;
    }) => buildMsg("/ault.exchange.v1beta1.MsgPlaceMarketOrder", v),

    cancelOrder: (v: { sender: string; order_id: Base64String }) =>
      buildMsg("/ault.exchange.v1beta1.MsgCancelOrder", v),

    cancelAllOrders: (v: { sender: string; market_id: bigint }) =>
      buildMsg("/ault.exchange.v1beta1.MsgCancelAllOrders", v),

    updateMarketParams: (v: { authority: string; updates: MarketParamUpdate[] }) =>
      buildMsg("/ault.exchange.v1beta1.MsgUpdateMarketParams", v),
  },
};
