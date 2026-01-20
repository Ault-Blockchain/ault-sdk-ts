import type { Eip712Field } from "./types";

export interface Eip712MsgTypeConfig {
  aminoType: string;
  eip712TypeName: string;
  valueFields: readonly Eip712Field[];
  nestedTypes?: Record<string, readonly Eip712Field[]>;
  durationFields?: readonly string[];
  legacyAminoRegistered?: boolean;
}

export { EIP712_MSG_TYPES } from "./registry.generated";

// ============================================================================
// Message Value Types - re-exported from generated protos
// ============================================================================

export type { Params as LicenseParams } from "../proto/gen/ault/license/v1/license";
export type { Params as MinerParams } from "../proto/gen/ault/miner/v1/miner";
export type { WorkSubmission } from "../proto/gen/ault/miner/v1/tx";
export type { MarketParamUpdate } from "../proto/gen/ault/exchange/v1beta1/tx";
