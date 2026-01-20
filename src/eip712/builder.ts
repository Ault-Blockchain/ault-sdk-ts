import { getEip712Domain } from "./domain";
import {
  EIP712_MSG_TYPES,
  type Eip712MsgTypeConfig,
  type LicenseParams,
  type MinerParams,
  type WorkSubmission,
  type MarketParamUpdate,
} from "./registry";
import { bytesToBase64 } from "../core/base64";
import {
  EIP712_DOMAIN_TYPE,
  TX_BASE_FIELDS,
  FEE_TYPE,
  COIN_TYPE,
  type Eip712Field,
  type Eip712TypedData,
} from "./types";
import type { AnyEip712Msg } from "./msg.generated";
import { parseEvmChainIdFromCosmosChainId } from "../utils/chain-id";
import { validateEip712FieldOrderInDev } from "./field-order";

validateEip712FieldOrderInDev();

export interface Eip712TxContext {
  chainId: string;
  accountNumber: string;
  sequence: string;
  fee: {
    amount: string;
    denom: string;
    gas: string;
  };
  memo: string;
}

export interface Eip712Msg<TValue = unknown, TTypeUrl extends string = string> {
  typeUrl: TTypeUrl;
  value: TValue;
}

// Re-export types for convenience
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

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z0-9])/g, (_, next) => String(next).toUpperCase());
}

function normalizeBinaryValue(value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return bytesToBase64(value);
  }
  return value;
}

function toBigIntLike(value: unknown, label: string): bigint {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (!Number.isInteger(value)) {
      throw new Error(`${label} must be an integer.`);
    }
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${label} exceeds safe integer range; use bigint or string.`);
    }
    return BigInt(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    return BigInt(value);
  }
  throw new Error(`${label} must be a bigint, number, or decimal string.`);
}

function durationToNanosecondsString(value: unknown, fieldName: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Duration field "${fieldName}" must be a protobuf Duration object.`);
  }
  const record = value as { seconds?: unknown; nanos?: unknown };
  if (record.seconds === undefined && record.nanos === undefined) {
    throw new Error(`Duration field "${fieldName}" must include seconds or nanos.`);
  }
  const seconds = toBigIntLike(record.seconds ?? 0n, `${fieldName}.seconds`);
  const nanos = toBigIntLike(record.nanos ?? 0, `${fieldName}.nanos`);
  if (nanos < -999_999_999n || nanos > 999_999_999n) {
    throw new Error(`Duration field "${fieldName}.nanos" must be between -999999999 and 999999999.`);
  }
  if (seconds > 0n && nanos < 0n) {
    throw new Error(`Duration field "${fieldName}.nanos" must be >= 0 when seconds is positive.`);
  }
  if (seconds < 0n && nanos > 0n) {
    throw new Error(`Duration field "${fieldName}.nanos" must be <= 0 when seconds is negative.`);
  }
  return (seconds * 1_000_000_000n + nanos).toString();
}

function mapValueToAmino(
  value: unknown,
  fields: readonly Eip712Field[],
  nestedTypes?: Record<string, readonly Eip712Field[]>,
  durationFields?: readonly string[],
): Record<string, unknown> {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const normalized: Record<string, unknown> = {};
  const durationSet = durationFields ? new Set(durationFields) : undefined;

  for (const field of fields) {
    const camelKey = snakeToCamel(field.name);
    const raw = record[camelKey] ?? record[field.name];
    if (field.type.startsWith("NESTED")) {
      const nestedFields = nestedTypes?.[field.name];
      if (!nestedFields) {
        throw new Error(`Missing nested type definition for field: ${field.name}`);
      }
      if (field.type.endsWith("[]")) {
        if (Array.isArray(raw)) {
          normalized[field.name] = raw.map((item) =>
            mapValueToAmino(item, nestedFields, nestedTypes, durationFields),
          );
        } else {
          normalized[field.name] = raw;
        }
      } else {
        normalized[field.name] = mapValueToAmino(raw, nestedFields, nestedTypes, durationFields);
      }
      continue;
    }

    if (durationSet?.has(field.name)) {
      if (raw === undefined) {
        throw new Error(`Duration field "${field.name}" is required.`);
      }
      normalized[field.name] = durationToNanosecondsString(raw, field.name);
      continue;
    }

    if (raw === undefined) {
      continue;
    }

    if (field.type === "string[]") {
      if (Array.isArray(raw)) {
        normalized[field.name] = raw.map((item) => normalizeBinaryValue(item));
      } else {
        normalized[field.name] = raw;
      }
      continue;
    }

    if (field.type === "string") {
      normalized[field.name] = normalizeBinaryValue(raw);
      continue;
    }

    normalized[field.name] = raw;
  }

  return normalized;
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
  msgs: AnyEip712Msg[],
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
    const aminoValue = mapValueToAmino(
      msg.value,
      msgConfig.valueFields,
      msgConfig.nestedTypes,
      msgConfig.durationFields,
    );
    const valueTypeFields = resolveValueFields(types, msgConfig, aminoValue);
    const valueTypeName = addTypeWithDedup(types, "TypeValue", valueTypeFields);

    const msgTypeFields: Eip712Field[] = [
      { name: "value", type: valueTypeName },
      { name: "type", type: "string" },
    ];
    const msgTypeName = addTypeWithDedup(types, msgConfig.eip712TypeName, msgTypeFields);

    types.Tx.push({ name: msgField, type: msgTypeName });

    message[msgField] = {
      type: msgConfig.aminoType,
      value: normalizeTypedDataValue(aminoValue, msgConfig.valueFields, msgConfig.nestedTypes),
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
// Generated message builders
// ============================================================================

export { msg } from "./msg.generated";
export type { AnyEip712Msg } from "./msg.generated";
