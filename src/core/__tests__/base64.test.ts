import { describe, it, expect } from "vitest";
import {
  bytesToBase64,
  base64ToBytes,
  isBase64String,
  asBase64String,
} from "../base64";

describe("isBase64String", () => {
  it("accepts valid base64 strings", () => {
    expect(isBase64String("SGVsbG8=")).toBe(true); // "Hello"
    expect(isBase64String("eQ==")).toBe(true); // "y"
    expect(isBase64String("YWJj")).toBe(true); // "abc" (no padding needed)
    expect(isBase64String("YWI=")).toBe(true); // "ab"
  });

  it("accepts empty string by default", () => {
    expect(isBase64String("")).toBe(true);
  });

  it("rejects empty string when allowEmpty=false", () => {
    expect(isBase64String("", false)).toBe(false);
  });

  it("rejects invalid characters", () => {
    expect(isBase64String("SGVs!G8=")).toBe(false);
    expect(isBase64String("SGVs@G8=")).toBe(false);
    expect(isBase64String("SGVs G8=")).toBe(false); // space
  });

  it("rejects incorrect padding", () => {
    expect(isBase64String("SGVsbG8")).toBe(false); // missing =
    expect(isBase64String("SGVsbG8===")).toBe(false); // too many =
    expect(isBase64String("S===")).toBe(false); // invalid padding position
  });
});

describe("bytesToBase64 / base64ToBytes", () => {
  it("round-trips Uint8Array correctly", () => {
    const original = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const base64 = bytesToBase64(original);
    const decoded = base64ToBytes(base64);

    expect(base64).toBe("SGVsbG8=");
    expect(decoded).toEqual(original);
  });

  it("handles empty array", () => {
    const empty = new Uint8Array([]);
    const base64 = bytesToBase64(empty);
    const decoded = base64ToBytes(base64);

    expect(base64).toBe("");
    expect(decoded).toEqual(empty);
  });

  it("handles binary data with all byte values", () => {
    const bytes = new Uint8Array([0, 127, 128, 255]);
    const base64 = bytesToBase64(bytes);
    const decoded = base64ToBytes(base64);

    expect(decoded).toEqual(bytes);
  });
});

describe("asBase64String", () => {
  it("returns branded string for valid input", () => {
    const result = asBase64String("SGVsbG8=");
    expect(result).toBe("SGVsbG8=");
  });

  it("accepts empty string by default", () => {
    const result = asBase64String("");
    expect(result).toBe("");
  });

  it("rejects empty string when allowEmpty=false", () => {
    expect(() => asBase64String("", false)).toThrow("Expected base64 string");
  });

  it("throws for invalid input", () => {
    expect(() => asBase64String("not!valid")).toThrow("Expected base64 string");
  });
});
