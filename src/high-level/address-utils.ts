import { evmToAult, isValidAultAddress, isValidEvmAddress } from "../utils/address";
import type { BigIntLike } from "./types";

/**
 * Normalize any address to Ault bech32 format.
 * Accepts: 0x... EVM address or ault1... bech32 address
 */
export function normalizeAddress(address: string): string {
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
export function normalizeAddresses(addresses: string[]): string[] {
  return addresses.map(normalizeAddress);
}

/**
 * Convert any bigint-like value to bigint.
 */
export function toBigInt(value: BigIntLike): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  return BigInt(value);
}
