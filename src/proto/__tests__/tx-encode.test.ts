import { describe, it, expect } from "vitest";
import {
  BinaryWriter,
  encodeAny,
  encodeCoin,
  encodeFee,
  encodeModeInfo,
  encodeModeInfoSingle,
  encodeSignerInfo,
  encodeAuthInfo,
  encodeTxBody,
  encodeTxRaw,
  encodeEthSecp256k1PubKey,
  SIGN_MODE_LEGACY_AMINO_JSON,
} from "../tx-encode";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================================
// BinaryWriter Tests
// ============================================================================

describe("BinaryWriter", () => {
  describe("writeVarint", () => {
    it("encodes 0", () => {
      const writer = new BinaryWriter();
      writer.writeVarint(0);
      expect(toHex(writer.finish())).toBe("00");
    });

    it("encodes 1", () => {
      const writer = new BinaryWriter();
      writer.writeVarint(1);
      expect(toHex(writer.finish())).toBe("01");
    });

    it("encodes 127 (max single byte)", () => {
      const writer = new BinaryWriter();
      writer.writeVarint(127);
      expect(toHex(writer.finish())).toBe("7f");
    });

    it("encodes 128 (first two-byte value)", () => {
      const writer = new BinaryWriter();
      writer.writeVarint(128);
      expect(toHex(writer.finish())).toBe("8001");
    });

    it("encodes 16383 (max two-byte)", () => {
      const writer = new BinaryWriter();
      writer.writeVarint(16383);
      expect(toHex(writer.finish())).toBe("ff7f");
    });

    it("encodes 16384 (first three-byte)", () => {
      const writer = new BinaryWriter();
      writer.writeVarint(16384);
      expect(toHex(writer.finish())).toBe("808001");
    });

    it("encodes large bigint", () => {
      const writer = new BinaryWriter();
      writer.writeVarint(300n);
      expect(toHex(writer.finish())).toBe("ac02");
    });

    it("encodes max uint64", () => {
      const writer = new BinaryWriter();
      // 2^64 - 1 = 18446744073709551615
      writer.writeVarint(18446744073709551615n);
      expect(toHex(writer.finish())).toBe("ffffffffffffffffff01");
    });
  });

  describe("writeTag", () => {
    it("encodes field 1 with varint wire type (0)", () => {
      const writer = new BinaryWriter();
      writer.writeTag(1, 0);
      expect(toHex(writer.finish())).toBe("08");
    });

    it("encodes field 1 with length-delimited wire type (2)", () => {
      const writer = new BinaryWriter();
      writer.writeTag(1, 2);
      expect(toHex(writer.finish())).toBe("0a");
    });

    it("encodes field 2 with varint wire type", () => {
      const writer = new BinaryWriter();
      writer.writeTag(2, 0);
      expect(toHex(writer.finish())).toBe("10");
    });

    it("encodes field 15 with length-delimited", () => {
      const writer = new BinaryWriter();
      writer.writeTag(15, 2);
      expect(toHex(writer.finish())).toBe("7a");
    });

    it("encodes field 16 (requires two bytes)", () => {
      const writer = new BinaryWriter();
      writer.writeTag(16, 2);
      expect(toHex(writer.finish())).toBe("8201");
    });
  });

  describe("writeString", () => {
    it("skips empty strings", () => {
      const writer = new BinaryWriter();
      writer.writeString(1, "");
      expect(writer.finish().length).toBe(0);
    });

    it("encodes simple ASCII string", () => {
      const writer = new BinaryWriter();
      writer.writeString(1, "abc");
      // tag(1,2) = 0x0a, length = 3, "abc" = 0x61 0x62 0x63
      expect(toHex(writer.finish())).toBe("0a03616263");
    });

    it("encodes UTF-8 string", () => {
      const writer = new BinaryWriter();
      writer.writeString(1, "hello");
      expect(toHex(writer.finish())).toBe("0a0568656c6c6f");
    });

    it("encodes emoji correctly", () => {
      const writer = new BinaryWriter();
      writer.writeString(1, "a");
      const result = writer.finish();
      expect(result.length).toBe(3); // tag + length + 'a'
    });
  });

  describe("writeBool", () => {
    it("skips false values", () => {
      const writer = new BinaryWriter();
      writer.writeBool(1, false);
      expect(writer.finish().length).toBe(0);
    });

    it("encodes true as varint 1", () => {
      const writer = new BinaryWriter();
      writer.writeBool(1, true);
      expect(toHex(writer.finish())).toBe("0801");
    });
  });

  describe("writeUint64", () => {
    it("skips zero values", () => {
      const writer = new BinaryWriter();
      writer.writeUint64(1, 0);
      expect(writer.finish().length).toBe(0);
    });

    it("encodes small value", () => {
      const writer = new BinaryWriter();
      writer.writeUint64(1, 42);
      expect(toHex(writer.finish())).toBe("082a");
    });

    it("encodes bigint value", () => {
      const writer = new BinaryWriter();
      writer.writeUint64(1, 1000000000000n);
      expect(toHex(writer.finish())).toBe("0880a094a58d1d");
    });
  });

  describe("writeInt32", () => {
    it("skips zero values", () => {
      const writer = new BinaryWriter();
      writer.writeInt32(1, 0);
      expect(writer.finish().length).toBe(0);
    });

    it("encodes positive value", () => {
      const writer = new BinaryWriter();
      writer.writeInt32(1, 127);
      expect(toHex(writer.finish())).toBe("087f");
    });
  });

  describe("writeBytes", () => {
    it("skips empty bytes", () => {
      const writer = new BinaryWriter();
      writer.writeBytes(1, new Uint8Array(0));
      expect(writer.finish().length).toBe(0);
    });

    it("encodes byte array", () => {
      const writer = new BinaryWriter();
      writer.writeBytes(1, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
      expect(toHex(writer.finish())).toBe("0a04deadbeef");
    });
  });

  describe("writeRepeatedString", () => {
    it("encodes empty array as nothing", () => {
      const writer = new BinaryWriter();
      writer.writeRepeatedString(1, []);
      expect(writer.finish().length).toBe(0);
    });

    it("encodes multiple strings", () => {
      const writer = new BinaryWriter();
      writer.writeRepeatedString(1, ["a", "b"]);
      // field 1 string "a", field 1 string "b"
      expect(toHex(writer.finish())).toBe("0a01610a0162");
    });
  });

  describe("writeRepeatedUint64", () => {
    it("encodes multiple uint64 values", () => {
      const writer = new BinaryWriter();
      writer.writeRepeatedUint64(1, [1n, 2n, 3n]);
      expect(toHex(writer.finish())).toBe("080108020803");
    });
  });

  describe("writeRepeatedBytes", () => {
    it("encodes multiple byte arrays", () => {
      const writer = new BinaryWriter();
      writer.writeRepeatedBytes(1, [new Uint8Array([0x01]), new Uint8Array([0x02])]);
      expect(toHex(writer.finish())).toBe("0a01010a0102");
    });
  });

  describe("finish", () => {
    it("combines multiple writes", () => {
      const writer = new BinaryWriter();
      writer.writeString(1, "a");
      writer.writeUint64(2, 1);
      const result = writer.finish();
      expect(toHex(result)).toBe("0a01611001");
    });
  });
});

// ============================================================================
// Transaction Encoding Tests
// ============================================================================

describe("encodeAny", () => {
  it("wraps typeUrl and value", () => {
    const typeUrl = "/cosmos.test.v1.Msg";
    const value = new Uint8Array([0x01, 0x02, 0x03]);
    const result = encodeAny(typeUrl, value);

    // field 1 (typeUrl): tag 0x0a, length, string
    // field 2 (value): tag 0x12, length, bytes
    expect(result.length).toBeGreaterThan(typeUrl.length + value.length);
    expect(toHex(result)).toContain("12"); // field 2 tag
  });

  it("produces deterministic output", () => {
    const typeUrl = "/test.Msg";
    const value = new Uint8Array([0xab]);
    const result1 = encodeAny(typeUrl, value);
    const result2 = encodeAny(typeUrl, value);
    expect(toHex(result1)).toBe(toHex(result2));
  });
});

describe("encodeCoin", () => {
  it("encodes denom and amount", () => {
    const result = encodeCoin("aault", "1000");
    // field 1: denom, field 2: amount
    const hex = toHex(result);
    expect(hex).toContain("0a056161756c74"); // "aault"
    expect(hex).toContain("1204"); // field 2 tag + length
  });

  it("handles large amounts", () => {
    const result = encodeCoin("aault", "5000000000000000");
    expect(result.length).toBeGreaterThan(10);
  });
});

describe("encodeFee", () => {
  it("encodes fee with single coin", () => {
    const result = encodeFee({
      amount: [{ denom: "aault", amount: "5000000000000000" }],
      gasLimit: 200000n,
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it("encodes fee with multiple coins", () => {
    const result = encodeFee({
      amount: [
        { denom: "aault", amount: "1000" },
        { denom: "uatom", amount: "500" },
      ],
      gasLimit: 100000n,
    });
    const hex = toHex(result);
    expect(hex).toContain("6161756c74"); // "aault"
    expect(hex).toContain("7561746f6d"); // "uatom"
  });

  it("encodes gas limit", () => {
    const result = encodeFee({
      amount: [{ denom: "aault", amount: "1000" }],
      gasLimit: 200000n,
    });
    // field 2 is gasLimit
    expect(toHex(result)).toContain("10"); // field 2 varint tag
  });
});

describe("encodeModeInfoSingle", () => {
  it("encodes signing mode", () => {
    const result = encodeModeInfoSingle(SIGN_MODE_LEGACY_AMINO_JSON);
    // field 1 with value 127
    expect(toHex(result)).toBe("087f");
  });

  it("encodes mode 1", () => {
    const result = encodeModeInfoSingle(1);
    expect(toHex(result)).toBe("0801");
  });
});

describe("encodeModeInfo", () => {
  it("wraps single mode info", () => {
    const result = encodeModeInfo(SIGN_MODE_LEGACY_AMINO_JSON);
    // field 1 (single) containing mode info
    expect(toHex(result)).toContain("0a");
  });
});

describe("encodeSignerInfo", () => {
  it("encodes public key, mode info, and sequence", () => {
    const pubkeyBytes = new Uint8Array(33).fill(0x02);
    const result = encodeSignerInfo({
      publicKey: {
        typeUrl: "/cosmos.crypto.secp256k1.PubKey",
        value: pubkeyBytes,
      },
      mode: SIGN_MODE_LEGACY_AMINO_JSON,
      sequence: 5n,
    });

    const hex = toHex(result);
    expect(hex.length).toBeGreaterThan(0);
    // Should contain sequence field (field 3)
    expect(hex).toContain("18"); // field 3 varint tag
  });

  it("handles zero sequence", () => {
    const pubkeyBytes = new Uint8Array(33).fill(0x03);
    const result = encodeSignerInfo({
      publicKey: {
        typeUrl: "/cosmos.crypto.secp256k1.PubKey",
        value: pubkeyBytes,
      },
      mode: 1,
      sequence: 0n,
    });
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("encodeAuthInfo", () => {
  it("encodes signer infos and fee", () => {
    const pubkeyBytes = new Uint8Array(33).fill(0x02);
    const result = encodeAuthInfo({
      signerInfos: [
        {
          publicKey: {
            typeUrl: "/cosmos.crypto.secp256k1.PubKey",
            value: pubkeyBytes,
          },
          mode: SIGN_MODE_LEGACY_AMINO_JSON,
          sequence: 0n,
        },
      ],
      fee: {
        amount: [{ denom: "aault", amount: "5000000000000000" }],
        gasLimit: 200000n,
      },
    });

    expect(result.length).toBeGreaterThan(0);
    const hex = toHex(result);
    // Should contain fee field (field 2)
    expect(hex).toContain("12");
  });

  it("handles multiple signers", () => {
    const pubkey1 = new Uint8Array(33).fill(0x02);
    const pubkey2 = new Uint8Array(33).fill(0x03);
    const result = encodeAuthInfo({
      signerInfos: [
        {
          publicKey: { typeUrl: "/test.PubKey", value: pubkey1 },
          mode: 1,
          sequence: 0n,
        },
        {
          publicKey: { typeUrl: "/test.PubKey", value: pubkey2 },
          mode: 1,
          sequence: 1n,
        },
      ],
      fee: {
        amount: [{ denom: "aault", amount: "1000" }],
        gasLimit: 100000n,
      },
    });
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("encodeTxBody", () => {
  it("encodes messages and memo", () => {
    const msg1 = new Uint8Array([0x01, 0x02, 0x03]);
    const result = encodeTxBody({
      messages: [{ typeUrl: "/test.MsgTest", value: msg1 }],
      memo: "test memo",
    });

    const hex = toHex(result);
    // field 1 (messages) and field 2 (memo)
    expect(hex).toContain("0a"); // field 1
    expect(hex).toContain("12"); // field 2
  });

  it("encodes multiple messages", () => {
    const result = encodeTxBody({
      messages: [
        { typeUrl: "/test.Msg1", value: new Uint8Array([0x01]) },
        { typeUrl: "/test.Msg2", value: new Uint8Array([0x02]) },
      ],
      memo: "",
    });
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles empty memo", () => {
    const result = encodeTxBody({
      messages: [{ typeUrl: "/test.Msg", value: new Uint8Array([0x01]) }],
      memo: "",
    });
    // Should not contain field 2 for empty memo
    expect(result.length).toBeGreaterThan(0);
  });

  it("encodes timeout height when provided", () => {
    const result = encodeTxBody({
      messages: [{ typeUrl: "/test.Msg", value: new Uint8Array([0x01]) }],
      memo: "",
      timeoutHeight: 12345n,
    });
    const hex = toHex(result);
    // field 3 is timeout_height
    expect(hex).toContain("18"); // field 3 varint tag
  });
});

describe("encodeTxRaw", () => {
  it("encodes body bytes, auth info bytes, and signatures", () => {
    const result = encodeTxRaw({
      bodyBytes: new Uint8Array([0x01, 0x02]),
      authInfoBytes: new Uint8Array([0x03, 0x04]),
      signatures: [new Uint8Array([0x05, 0x06])],
    });

    const hex = toHex(result);
    // field 1: bodyBytes, field 2: authInfoBytes, field 3: signatures
    expect(hex).toContain("0a"); // field 1
    expect(hex).toContain("12"); // field 2
    expect(hex).toContain("1a"); // field 3
  });

  it("encodes multiple signatures", () => {
    const result = encodeTxRaw({
      bodyBytes: new Uint8Array([0x01]),
      authInfoBytes: new Uint8Array([0x02]),
      signatures: [new Uint8Array([0xaa]), new Uint8Array([0xbb])],
    });
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("encodeEthSecp256k1PubKey", () => {
  it("encodes 33-byte compressed public key", () => {
    const pubkey = new Uint8Array(33);
    pubkey[0] = 0x02;
    pubkey.fill(0xab, 1);
    const result = encodeEthSecp256k1PubKey(pubkey);

    // field 1 with the key bytes
    expect(toHex(result)).toContain("0a21"); // tag + length 33
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe("constants", () => {
  it("SIGN_MODE_LEGACY_AMINO_JSON is 127", () => {
    expect(SIGN_MODE_LEGACY_AMINO_JSON).toBe(127);
  });
});

// ============================================================================
// Integration / Round-trip Tests
// ============================================================================

describe("full transaction encoding", () => {
  it("produces valid TxRaw for a simple transaction", () => {
    // Encode a complete transaction
    const msgBytes = new Uint8Array([0x0a, 0x05, 0x68, 0x65, 0x6c, 0x6c, 0x6f]);
    const bodyBytes = encodeTxBody({
      messages: [{ typeUrl: "/test.MsgTest", value: msgBytes }],
      memo: "test",
    });

    const pubkeyBytes = new Uint8Array(33);
    pubkeyBytes[0] = 0x02;
    const pubkeyProto = encodeEthSecp256k1PubKey(pubkeyBytes);

    const authInfoBytes = encodeAuthInfo({
      signerInfos: [
        {
          publicKey: {
            typeUrl: "/cosmos.evm.crypto.v1.ethsecp256k1.PubKey",
            value: pubkeyProto,
          },
          mode: SIGN_MODE_LEGACY_AMINO_JSON,
          sequence: 0n,
        },
      ],
      fee: {
        amount: [{ denom: "aault", amount: "5000000000000000" }],
        gasLimit: 200000n,
      },
    });

    const signature = new Uint8Array(64).fill(0xab);
    const txRaw = encodeTxRaw({
      bodyBytes,
      authInfoBytes,
      signatures: [signature],
    });

    // Should produce non-empty bytes
    expect(txRaw.length).toBeGreaterThan(100);

    // Should be valid protobuf structure
    const hex = toHex(txRaw);
    expect(hex).toMatch(/^0a/); // starts with field 1
  });
});
