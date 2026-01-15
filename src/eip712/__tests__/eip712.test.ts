import { describe, it, expect } from "vitest";
import { EIP712_MSG_TYPES } from "../registry";
import { validateEip712FieldOrder } from "../field-order";
import { msg, buildEip712TypedData, type Eip712TxContext } from "../builder";
import { asBase64String } from "../../core/base64";

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

        expect(
          names,
          `${typeUrl} nested type '${nestedName}' should be in descending order`,
        ).toEqual(sorted);
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
      const result = msg.license.mint({
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
      const result = msg.license.batchMint({
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
      const result = msg.license.transfer({
        from: "ault1from",
        to: "ault1to",
        license_id: 123n,
        reason: "transfer reason",
      });

      expect(result.typeUrl).toBe("/ault.license.v1.MsgTransferLicense");
      expect(result.value.license_id).toBe(123n);
    });

    it("setParams creates correct message with nested params", () => {
      const params = {
        class_name: "Ault License",
        class_symbol: "AULT",
        base_token_uri: "ipfs://",
        minting_paused: false,
        supply_cap: 1000000n,
        allow_metadata_update: true,
        admin_can_revoke: true,
        admin_can_burn: false,
        max_batch_mint_size: 100n,
        transfer_unlock_days: 30n,
        enable_transfers: true,
        minter_allowed_msgs: [],
        kyc_approver_allowed_msgs: [],
        free_max_gas_limit: 200000n,
        max_voting_power_per_address: 100n,
      };

      const result = msg.license.setParams({ authority: "ault1gov", params });

      expect(result.typeUrl).toBe("/ault.license.v1.MsgSetParams");
      expect(result.value.params).toEqual(params);
    });
  });

  describe("msg.miner", () => {
    it("delegate creates correct message", () => {
      const result = msg.miner.delegate({
        owner: "ault1owner",
        license_ids: [1n, 2n, 3n],
        operator: "ault1operator",
      });

      expect(result.typeUrl).toBe("/ault.miner.v1.MsgDelegateMining");
      expect(result.value.license_ids).toEqual([1n, 2n, 3n]);
    });

    it("submitWork creates correct message", () => {
      const result = msg.miner.submitWork({
        submitter: "ault1submitter",
        license_id: 42n,
        epoch: 100n,
        y: asBase64String("eQ=="),
        proof: asBase64String("cHJvb2Y="),
        nonce: asBase64String("bm9uY2U="),
      });

      expect(result.typeUrl).toBe("/ault.miner.v1.MsgSubmitWork");
      expect(result.value).toMatchObject({
        submitter: "ault1submitter",
        license_id: 42n,
        epoch: 100n,
      });
    });

    it("batchSubmitWork creates correct message with submissions array", () => {
      const result = msg.miner.batchSubmitWork({
        submitter: "ault1submitter",
        submissions: [
          {
            license_id: 1n,
            epoch: 100n,
            y: asBase64String("eQ=="),
            proof: asBase64String("cA=="),
            nonce: asBase64String("bg=="),
          },
          {
            license_id: 2n,
            epoch: 100n,
            y: asBase64String("eQ=="),
            proof: asBase64String("cA=="),
            nonce: asBase64String("bg=="),
          },
        ],
      });

      expect(result.typeUrl).toBe("/ault.miner.v1.MsgBatchSubmitWork");
      expect(result.value.submissions).toHaveLength(2);
    });

    it("registerOperator creates correct message", () => {
      const result = msg.miner.registerOperator({
        operator: "ault1op",
        commission_rate: 10n,
        commission_recipient: "ault1recipient",
      });

      expect(result.typeUrl).toBe("/ault.miner.v1.MsgRegisterOperator");
    });
  });

  describe("msg.exchange", () => {
    it("placeLimitOrder creates correct message", () => {
      const result = msg.exchange.placeLimitOrder({
        sender: "ault1trader",
        market_id: 1n,
        is_buy: true,
        price: "100.50",
        quantity: "10",
        lifespan: 3600000000000n,
      });

      expect(result.typeUrl).toBe("/ault.exchange.v1beta1.MsgPlaceLimitOrder");
      expect(result.value.is_buy).toBe(true);
    });

    it("placeMarketOrder creates correct message", () => {
      const result = msg.exchange.placeMarketOrder({
        sender: "ault1trader",
        market_id: 1n,
        is_buy: false,
        quantity: "5",
      });

      expect(result.typeUrl).toBe("/ault.exchange.v1beta1.MsgPlaceMarketOrder");
      expect(result.value.is_buy).toBe(false);
    });

    it("cancelAllOrders creates correct message", () => {
      const result = msg.exchange.cancelAllOrders({
        sender: "ault1trader",
        market_id: 1n,
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
    accountNumber: 42,
    sequence: 5,
    fee: {
      amount: "5000000000000000",
      denom: "aault",
      gas: "200000",
    },
    memo: "test memo",
  };

  it("builds valid typed data for single message", () => {
    const message = msg.license.mint({
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
    const message = msg.miner.delegate({
      owner: "ault1owner",
      license_ids: [1n, 2n],
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
      msg.license.mint({ minter: "m", to: "t", uri: "u", reason: "r" }),
      msg.license.mint({ minter: "m2", to: "t2", uri: "u2", reason: "r2" }),
    ];

    const typedData = buildEip712TypedData(baseContext, messages);

    expect(typedData.message.msg0).toBeDefined();
    expect(typedData.message.msg1).toBeDefined();
  });

  it("throws for empty messages array", () => {
    expect(() => buildEip712TypedData(baseContext, [])).toThrow("At least one message is required");
  });

  it("throws for unknown message type", () => {
    const badMessage = { typeUrl: "/unknown.msg.Type", value: {} };

    expect(() => buildEip712TypedData(baseContext, [badMessage])).toThrow(
      "Unknown message type: /unknown.msg.Type",
    );
  });

  it("extracts EVM chain ID from Cosmos chain ID", () => {
    const message = msg.license.mint({ minter: "m", to: "t", uri: "u", reason: "r" });

    const typedData = buildEip712TypedData({ ...baseContext, chainId: "ault_12345-1" }, [message]);

    expect(typedData.domain.chainId).toBe(12345);
  });

  it("uses provided EVM chain ID override", () => {
    const message = msg.license.mint({ minter: "m", to: "t", uri: "u", reason: "r" });

    const typedData = buildEip712TypedData(baseContext, [message], 99999);

    expect(typedData.domain.chainId).toBe(99999);
  });

  it("handles messages with nested types", () => {
    const message = msg.miner.batchSubmitWork({
      submitter: "ault1submitter",
      submissions: [
        {
          license_id: 1n,
          epoch: 100n,
          y: asBase64String("eQ=="),
          proof: asBase64String("cA=="),
          nonce: asBase64String("bg=="),
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
    const message = msg.license.mint({ minter: "m", to: "t", uri: "u", reason: "r" });
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
      expect(config.aminoType, `${typeUrl} aminoType should contain /`).toMatch(/^\w+\/\w+$/);
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
          expect(
            config.nestedTypes![field.name],
            `${typeUrl} missing nested type for ${field.name}`,
          ).toBeDefined();
        }
      }
    }
  });
});
