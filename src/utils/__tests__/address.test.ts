import { describe, it, expect } from "vitest";
import { toBech32 } from "@cosmjs/encoding";
import { normalizeValidatorAddress } from "../address";

describe("normalizeValidatorAddress", () => {
  const bytes = new Uint8Array(20);
  bytes[19] = 1;
  const valoper = toBech32("aultvaloper", bytes);
  const account = toBech32("ault", bytes);

  it("accepts a valid validator address", () => {
    expect(normalizeValidatorAddress(valoper)).toBe(valoper);
  });

  it("rejects ault account addresses", () => {
    expect(() => normalizeValidatorAddress(account)).toThrow(/Invalid validator address format/);
  });

  it("rejects EVM addresses", () => {
    expect(() => normalizeValidatorAddress(`0x${"11".repeat(20)}`)).toThrow(/Invalid validator address format/);
  });
});
