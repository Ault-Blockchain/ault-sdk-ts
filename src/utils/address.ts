import { fromBech32, toBech32, fromHex, toHex } from "@cosmjs/encoding";
import { getAddress } from "viem";

export function evmToAult(evmAddress: string): string {
  const hex = evmAddress.toLowerCase().replace("0x", "");
  const bytes = fromHex(hex);
  return toBech32("ault", bytes);
}

export function aultToEvm(aultAddress: string): string {
  const { data } = fromBech32(aultAddress);
  return getAddress(`0x${toHex(data)}`);
}

export function isValidAultAddress(address: string): boolean {
  try {
    const { prefix, data } = fromBech32(address);
    return prefix === "ault" && data.length === 20;
  } catch {
    return false;
  }
}

export function isValidEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function isValidValidatorAddress(address: string): boolean {
  try {
    const { prefix, data } = fromBech32(address);
    return prefix === "aultvaloper" && data.length === 20;
  } catch {
    return false;
  }
}

export function normalizeValidatorAddress(address: string): string {
  if (isValidValidatorAddress(address)) {
    return address;
  }
  throw new Error(`Invalid validator address format: ${address}`);
}
