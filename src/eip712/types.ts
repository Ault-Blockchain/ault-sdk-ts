export const EIP712_DOMAIN_TYPE = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "string" },
  { name: "salt", type: "string" },
] as const;

export const TX_BASE_FIELDS = [
  { name: "account_number", type: "string" },
  { name: "chain_id", type: "string" },
  { name: "fee", type: "Fee" },
  { name: "memo", type: "string" },
  { name: "sequence", type: "string" },
] as const;

export const FEE_TYPE = [
  { name: "amount", type: "Coin[]" },
  { name: "gas", type: "string" },
] as const;

export const COIN_TYPE = [
  { name: "denom", type: "string" },
  { name: "amount", type: "string" },
] as const;

export type Eip712Field = { name: string; type: string };

export interface Eip712TypedData<TPrimary extends string = "Tx"> {
  types: Record<string, Eip712Field[]>;
  primaryType: TPrimary;
  domain: Record<string, unknown>;
  message: Record<string, unknown>;
}
