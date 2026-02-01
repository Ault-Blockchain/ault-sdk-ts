import { describe, it, expect } from "vitest";
import { EIP712_MSG_TYPES } from "../registry";
import { validateEip712FieldOrder } from "../field-order";
import { msg, buildEip712TypedData, type AnyEip712Msg, type Eip712TxContext } from "../builder";
import { base64ToBytes } from "../../core/base64";
import { MSG_ENCODERS } from "../msg-encoders.generated";

// ============================================================================
// Field Ordering Tests - Critical for Cosmos EVM signing
// ============================================================================

describe("EIP-712 Field Ordering", () => {
  it("all message types have fields in descending alphabetical order", () => {
    // This should not throw
    expect(() => validateEip712FieldOrder()).not.toThrow();
  });

  it("validates descending alphabetical order requirement", () => {
    for (const [typeUrl, config] of Object.entries(EIP712_MSG_TYPES)) {
      const names = config.valueFields.map((f) => f.name);
      const sorted = [...names].sort((a, b) => b.localeCompare(a));

      expect(names, `${typeUrl} fields should be in descending order`).toEqual(sorted);
    }
  });

  it("validates nested types are also in descending order", () => {
    for (const [typeUrl, config] of Object.entries(EIP712_MSG_TYPES)) {
      if (!config.nestedTypes) continue;

      for (const [nestedName, nestedFields] of Object.entries(config.nestedTypes)) {
        const names = nestedFields.map((f) => f.name);
        const sorted = [...names].sort((a, b) => b.localeCompare(a));

        expect(names, `${typeUrl} nested type '${nestedName}' should be in descending order`).toEqual(sorted);
      }
    }
  });

  it("detects incorrectly ordered fields", () => {
    // Manually verify the sorting logic works
    const correctOrder = ["z", "y", "x", "a"];
    const incorrectOrder = ["a", "x", "y", "z"];

    const sortedCorrect = [...correctOrder].sort((a, b) => b.localeCompare(a));
    const sortedIncorrect = [...incorrectOrder].sort((a, b) => b.localeCompare(a));

    expect(correctOrder).toEqual(sortedCorrect);
    expect(incorrectOrder).not.toEqual(sortedIncorrect);
  });
});

// ============================================================================
// Message Builder Tests
// ============================================================================

describe("msg builders", () => {
  describe("msg.license", () => {
    it("mint creates correct message", () => {
      const result = msg.license.mintLicense({
        minter: "ault1minter",
        to: "ault1recipient",
        uri: "ipfs://hash",
        reason: "test mint",
      });

      expect(result.typeUrl).toBe("/ault.license.v1.MsgMintLicense");
      expect(result.value).toEqual({
        minter: "ault1minter",
        to: "ault1recipient",
        uri: "ipfs://hash",
        reason: "test mint",
      });
    });

    it("batchMint creates correct message with arrays", () => {
      const result = msg.license.batchMintLicense({
        minter: "ault1minter",
        to: ["ault1a", "ault1b"],
        uri: ["ipfs://1", "ipfs://2"],
        reason: "batch test",
      });

      expect(result.typeUrl).toBe("/ault.license.v1.MsgBatchMintLicense");
      expect(result.value.to).toHaveLength(2);
      expect(result.value.uri).toHaveLength(2);
    });

    it("transfer creates correct message", () => {
      const result = msg.license.transferLicense({
        from: "ault1from",
        to: "ault1to",
        licenseId: 123n,
        reason: "transfer reason",
      });

      expect(result.typeUrl).toBe("/ault.license.v1.MsgTransferLicense");
      expect(result.value.licenseId).toBe(123n);
    });

    it("updateParams creates correct message with nested params", () => {
      const params = {
        className: "Ault License",
        classSymbol: "AULT",
        baseTokenUri: "ipfs://",
        mintingPaused: false,
        supplyCap: 1000000n,
        allowMetadataUpdate: true,
        adminCanRevoke: true,
        adminCanBurn: false,
        maxBatchSize: 100,
        transferUnlockDays: 30,
        enableTransfers: true,
        minterAllowedMsgs: [],
        kycApproverAllowedMsgs: [],
        freeMaxGasLimit: 200000n,
        maxVotingPowerPerAddress: 100n,
      };

      const result = msg.license.updateParams({ authority: "ault1gov", params });

      expect(result.typeUrl).toBe("/ault.license.v1.MsgUpdateParams");
      expect(result.value.params).toEqual(params);
    });
  });

  describe("msg.miner", () => {
    it("delegate creates correct message", () => {
      const result = msg.miner.delegateMining({
        owner: "ault1owner",
        licenseIds: [1n, 2n, 3n],
        operator: "ault1operator",
      });

      expect(result.typeUrl).toBe("/ault.miner.v1.MsgDelegateMining");
      expect(result.value.licenseIds).toEqual([1n, 2n, 3n]);
    });

    it("submitWork creates correct message", () => {
      const result = msg.miner.submitWork({
        submitter: "ault1submitter",
        licenseId: 42n,
        epoch: 100n,
        y: base64ToBytes("eQ=="),
        proof: base64ToBytes("cHJvb2Y="),
      });

      expect(result.typeUrl).toBe("/ault.miner.v1.MsgSubmitWork");
      expect(result.value).toMatchObject({
        submitter: "ault1submitter",
        licenseId: 42n,
        epoch: 100n,
      });
    });

    it("batchSubmitWork creates correct message with submissions array", () => {
      const result = msg.miner.batchSubmitWork({
        submitter: "ault1submitter",
        submissions: [
          {
            licenseId: 1n,
            epoch: 100n,
            y: base64ToBytes("eQ=="),
            proof: base64ToBytes("cA=="),
          },
          {
            licenseId: 2n,
            epoch: 100n,
            y: base64ToBytes("eQ=="),
            proof: base64ToBytes("cA=="),
          },
        ],
      });

      expect(result.typeUrl).toBe("/ault.miner.v1.MsgBatchSubmitWork");
      expect(result.value.submissions).toHaveLength(2);
    });

    it("registerOperator creates correct message", () => {
      const result = msg.miner.registerOperator({
        operator: "ault1op",
        commissionRate: 10,
        commissionRecipient: "ault1recipient",
      });

      expect(result.typeUrl).toBe("/ault.miner.v1.MsgRegisterOperator");
    });
  });

  describe("msg.exchange", () => {
    it("placeLimitOrder creates correct message", () => {
      const result = msg.exchange.placeLimitOrder({
        sender: "ault1trader",
        marketId: 1n,
        isBuy: true,
        price: "100.50",
        quantity: "10",
        lifespan: { seconds: 3600n, nanos: 0 },
      });

      expect(result.typeUrl).toBe("/ault.exchange.v1beta1.MsgPlaceLimitOrder");
      expect(result.value.isBuy).toBe(true);
    });

    it("placeMarketOrder creates correct message", () => {
      const result = msg.exchange.placeMarketOrder({
        sender: "ault1trader",
        marketId: 1n,
        isBuy: false,
        quantity: "5",
      });

      expect(result.typeUrl).toBe("/ault.exchange.v1beta1.MsgPlaceMarketOrder");
      expect(result.value.isBuy).toBe(false);
    });

    it("cancelAllOrders creates correct message", () => {
      const result = msg.exchange.cancelAllOrders({
        sender: "ault1trader",
        marketId: 1n,
      });

      expect(result.typeUrl).toBe("/ault.exchange.v1beta1.MsgCancelAllOrders");
    });
  });
});

// ============================================================================
// buildEip712TypedData Tests
// ============================================================================

describe("buildEip712TypedData", () => {
  const baseContext: Eip712TxContext = {
    chainId: "ault_10904-1",
    accountNumber: "42",
    sequence: "5",
    fee: {
      amount: "5000000000000000",
      denom: "aault",
      gas: "200000",
    },
    memo: "test memo",
  };

  it("builds valid typed data for single message", () => {
    const message = msg.license.mintLicense({
      minter: "ault1minter",
      to: "ault1to",
      uri: "ipfs://test",
      reason: "test",
    });

    const typedData = buildEip712TypedData(baseContext, [message]);

    expect(typedData.primaryType).toBe("Tx");
    expect(typedData.domain.chainId).toBe(10904);
    expect(typedData.types.EIP712Domain).toBeDefined();
    expect(typedData.types.Tx).toBeDefined();
    expect(typedData.types.Fee).toBeDefined();
    expect(typedData.types.Coin).toBeDefined();
  });

  it("includes message data in the typed data message", () => {
    const message = msg.miner.delegateMining({
      owner: "ault1owner",
      licenseIds: [1n, 2n],
      operator: "ault1op",
    });

    const typedData = buildEip712TypedData(baseContext, [message]);

    expect(typedData.message.account_number).toBe("42");
    expect(typedData.message.sequence).toBe("5");
    expect(typedData.message.chain_id).toBe("ault_10904-1");
    expect(typedData.message.memo).toBe("test memo");
    expect(typedData.message.msg0).toBeDefined();
  });

  it("handles multiple messages", () => {
    const messages = [
      msg.license.mintLicense({ minter: "m", to: "t", uri: "u", reason: "r" }),
      msg.license.mintLicense({ minter: "m2", to: "t2", uri: "u2", reason: "r2" }),
    ];

    const typedData = buildEip712TypedData(baseContext, messages);

    expect(typedData.message.msg0).toBeDefined();
    expect(typedData.message.msg1).toBeDefined();
  });

  it("throws for empty messages array", () => {
    expect(() => buildEip712TypedData(baseContext, [])).toThrow("At least one message is required");
  });

  it("throws for unknown message type", () => {
    const badMessage = { typeUrl: "/unknown.msg.Type", value: {} } as unknown as AnyEip712Msg;

    expect(() => buildEip712TypedData(baseContext, [badMessage])).toThrow("Unknown message type: /unknown.msg.Type");
  });

  it("extracts EVM chain ID from Cosmos chain ID", () => {
    const message = msg.license.mintLicense({ minter: "m", to: "t", uri: "u", reason: "r" });

    const typedData = buildEip712TypedData({ ...baseContext, chainId: "ault_12345-1" }, [message]);

    expect(typedData.domain.chainId).toBe(12345);
  });

  it("uses provided EVM chain ID override", () => {
    const message = msg.license.mintLicense({ minter: "m", to: "t", uri: "u", reason: "r" });

    const typedData = buildEip712TypedData(baseContext, [message], 99999);

    expect(typedData.domain.chainId).toBe(99999);
  });

  it("handles messages with nested types", () => {
    const message = msg.miner.batchSubmitWork({
      submitter: "ault1submitter",
      submissions: [
        {
          licenseId: 1n,
          epoch: 100n,
          y: base64ToBytes("eQ=="),
          proof: base64ToBytes("cA=="),
        },
      ],
    });

    const typedData = buildEip712TypedData(baseContext, [message]);

    // Should have created a type for the nested submissions
    const typeNames = Object.keys(typedData.types);
    const hasNestedType = typeNames.some((name) => name.startsWith("TypeValue"));
    expect(hasNestedType).toBe(true);
  });

  it("handles empty nested arrays gracefully", () => {
    const message = msg.miner.batchSubmitWork({
      submitter: "ault1submitter",
      submissions: [],
    });

    const typedData = buildEip712TypedData(baseContext, [message]);
    expect(typedData).toBeDefined();
  });

  it("includes proper fee structure", () => {
    const message = msg.license.mintLicense({ minter: "m", to: "t", uri: "u", reason: "r" });
    const typedData = buildEip712TypedData(baseContext, [message]);

    expect(typedData.message.fee).toEqual({
      amount: [{ denom: "aault", amount: "5000000000000000" }],
      gas: "200000",
    });
  });
});

// ============================================================================
// Registry Completeness Tests
// ============================================================================

describe("EIP712_MSG_TYPES registry", () => {
  it("has all required fields for each message type", () => {
    for (const [typeUrl, config] of Object.entries(EIP712_MSG_TYPES)) {
      expect(config.aminoType, `${typeUrl} missing aminoType`).toBeDefined();
      expect(config.eip712TypeName, `${typeUrl} missing eip712TypeName`).toBeDefined();
      expect(config.valueFields, `${typeUrl} missing valueFields`).toBeDefined();
      expect(config.valueFields.length, `${typeUrl} has no valueFields`).toBeGreaterThan(0);
    }
  });

  it("aminoType follows naming convention", () => {
    for (const [typeUrl, config] of Object.entries(EIP712_MSG_TYPES)) {
      // Allow hyphens in prefix (e.g., "cosmos-sdk/MsgDelegate")
      expect(config.aminoType, `${typeUrl} aminoType should contain /`).toMatch(/^[\w-]+\/\w+$/);
    }
  });

  it("all value fields have name and type", () => {
    for (const [typeUrl, config] of Object.entries(EIP712_MSG_TYPES)) {
      for (const field of config.valueFields) {
        expect(field.name, `${typeUrl} field missing name`).toBeDefined();
        expect(field.type, `${typeUrl} field missing type`).toBeDefined();
      }
    }
  });

  it("nested types are defined when NESTED fields exist", () => {
    for (const [typeUrl, config] of Object.entries(EIP712_MSG_TYPES)) {
      const nestedFields = config.valueFields.filter((f) => f.type.startsWith("NESTED"));

      if (nestedFields.length > 0) {
        expect(config.nestedTypes, `${typeUrl} has NESTED fields but no nestedTypes`).toBeDefined();

        for (const field of nestedFields) {
          expect(config.nestedTypes![field.name], `${typeUrl} missing nested type for ${field.name}`).toBeDefined();
        }
      }
    }
  });
});

// ============================================================================
// BigInt Field Validation Tests - Safe integer boundary enforcement
// ============================================================================

describe("bigint field validation", () => {
  const txContext: Eip712TxContext = {
    chainId: "ault_10904-1",
    accountNumber: "1",
    sequence: "0",
    fee: { amount: "1000", denom: "aault", gas: "200000" },
    memo: "",
  };

  describe("Duration fields (builder.ts toBigIntLike)", () => {
    // Tests the toBigIntLike function in builder.ts via Duration field validation

    it("accepts bigint seconds in Duration", () => {
      const message = msg.exchange.placeLimitOrder({
        sender: "ault1trader",
        marketId: 1n,
        isBuy: true,
        price: "100",
        quantity: "10",
        lifespan: { seconds: 3600n, nanos: 0 },
      });
      const typedData = buildEip712TypedData(txContext, [message]);
      expect(typedData).toBeDefined();
    });

    it("accepts safe integer seconds in Duration", () => {
      const message = msg.exchange.placeLimitOrder({
        sender: "ault1trader",
        marketId: 1n,
        isBuy: true,
        price: "100",
        quantity: "10",
        lifespan: { seconds: 3600 as unknown as bigint, nanos: 0 },
      });
      const typedData = buildEip712TypedData(txContext, [message]);
      expect(typedData).toBeDefined();
    });

    it("accepts string seconds in Duration", () => {
      const message = msg.exchange.placeLimitOrder({
        sender: "ault1trader",
        marketId: 1n,
        isBuy: true,
        price: "100",
        quantity: "10",
        lifespan: { seconds: "9007199254740993" as unknown as bigint, nanos: 0 },
      });
      const typedData = buildEip712TypedData(txContext, [message]);
      expect(typedData).toBeDefined();
    });

    it("throws for unsafe integer seconds in Duration", () => {
      expect(() => {
        const message = msg.exchange.placeLimitOrder({
          sender: "ault1trader",
          marketId: 1n,
          isBuy: true,
          price: "100",
          quantity: "10",
          lifespan: { seconds: (Number.MAX_SAFE_INTEGER + 2) as unknown as bigint, nanos: 0 },
        });
        buildEip712TypedData(txContext, [message]);
      }).toThrow(/exceeds safe integer range/);
    });

    it("throws for non-integer seconds in Duration", () => {
      expect(() => {
        const message = msg.exchange.placeLimitOrder({
          sender: "ault1trader",
          marketId: 1n,
          isBuy: true,
          price: "100",
          quantity: "10",
          lifespan: { seconds: 1.5 as unknown as bigint, nanos: 0 },
        });
        buildEip712TypedData(txContext, [message]);
      }).toThrow(/must be an integer/);
    });
  });

  describe("Protobuf encoding (msg-encoders requireBigIntLike)", () => {
    // Tests the requireBigIntLike function in msg-encoders.generated.ts

    const encode = MSG_ENCODERS["/ault.license.v1.MsgTransferLicense"];

    it("accepts bigint values", () => {
      const result = encode({
        from: "ault1from",
        to: "ault1to",
        licenseId: 9007199254740993n,
        reason: "test",
      });
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("accepts safe integer numbers", () => {
      const result = encode({
        from: "ault1from",
        to: "ault1to",
        licenseId: 123,
        reason: "test",
      });
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("accepts numeric strings for large values", () => {
      const result = encode({
        from: "ault1from",
        to: "ault1to",
        licenseId: "9007199254740993",
        reason: "test",
      });
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("throws for numbers above MAX_SAFE_INTEGER", () => {
      expect(() =>
        encode({
          from: "ault1from",
          to: "ault1to",
          licenseId: Number.MAX_SAFE_INTEGER + 2,
          reason: "test",
        })
      ).toThrow(/exceeds safe integer range/);
    });

    it("throws for non-integer numbers", () => {
      expect(() =>
        encode({
          from: "ault1from",
          to: "ault1to",
          licenseId: 1.5,
          reason: "test",
        })
      ).toThrow(/must be an integer/);
    });

    it("throws for empty strings", () => {
      expect(() =>
        encode({
          from: "ault1from",
          to: "ault1to",
          licenseId: "   ",
          reason: "test",
        })
      ).toThrow(/must be a bigint/);
    });
  });

  describe("Bytes fields (msg-encoders requireBytes)", () => {
    // Tests the requireBytes function in msg-encoders.generated.ts
    // Using MsgSubmitWork which has bytes fields: y, proof

    const encode = MSG_ENCODERS["/ault.miner.v1.MsgSubmitWork"];

    it("accepts Uint8Array values", () => {
      const result = encode({
        submitter: "ault1submitter",
        licenseId: 1n,
        epoch: 1n,
        y: new Uint8Array([1, 2, 3]),
        proof: new Uint8Array([4, 5, 6]),
      });
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("accepts valid base64 strings", () => {
      const result = encode({
        submitter: "ault1submitter",
        licenseId: 1n,
        epoch: 1n,
        y: "AQID", // [1, 2, 3]
        proof: "BAUG", // [4, 5, 6]
      });
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("accepts empty base64 string as empty bytes", () => {
      const result = encode({
        submitter: "ault1submitter",
        licenseId: 1n,
        epoch: 1n,
        y: "",
        proof: "BAUG",
      });
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("throws for invalid base64 strings", () => {
      expect(() =>
        encode({
          submitter: "ault1submitter",
          licenseId: 1n,
          epoch: 1n,
          y: "not!valid!base64",
          proof: "BAUG",
        })
      ).toThrow(/must be a Uint8Array or valid base64 string/);
    });

    it("throws for non-string/non-Uint8Array values", () => {
      expect(() =>
        encode({
          submitter: "ault1submitter",
          licenseId: 1n,
          epoch: 1n,
          y: 12345,
          proof: "BAUG",
        })
      ).toThrow(/must be a Uint8Array or base64 string/);
    });
  });
});
