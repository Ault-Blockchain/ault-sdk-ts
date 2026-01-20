import { describe, it, expect } from "vitest";
import { buildEip712TypedData, msg, type Eip712TxContext } from "../builder";
import { base64ToBytes } from "../../core/base64";

// ============================================================================
// Typed Data Snapshot Tests
// ============================================================================

const baseContext: Eip712TxContext = {
  chainId: "ault_10904-1",
  accountNumber: "42",
  sequence: "5",
  fee: {
    amount: "5000000000000000",
    denom: "aault",
    gas: "200000",
  },
  memo: "",
};

describe("Typed Data Snapshots", () => {
  describe("Domain structure", () => {
    it("domain is correctly structured", () => {
      const message = msg.license.mintLicense({
        minter: "ault1minter",
        to: "ault1to",
        uri: "ipfs://test",
        reason: "test",
      });
      const typedData = buildEip712TypedData(baseContext, [message]);

      expect(typedData.domain).toMatchInlineSnapshot(`
        {
          "chainId": 10904,
          "name": "Cosmos Web3",
          "salt": "0",
          "verifyingContract": "cosmos",
          "version": "1.0.0",
        }
      `);
    });

    it("extracts chain ID from different formats", () => {
      const message = msg.license.mintLicense({
        minter: "m",
        to: "t",
        uri: "u",
        reason: "r",
      });

      const typedData1 = buildEip712TypedData({ ...baseContext, chainId: "ault_12345-1" }, [message]);
      expect(typedData1.domain.chainId).toBe(12345);

      const typedData2 = buildEip712TypedData({ ...baseContext, chainId: "ault_99999-2" }, [message]);
      expect(typedData2.domain.chainId).toBe(99999);
    });
  });

  describe("Base types structure", () => {
    it("contains all required base types", () => {
      const message = msg.license.mintLicense({
        minter: "ault1minter",
        to: "ault1to",
        uri: "ipfs://test",
        reason: "test",
      });
      const typedData = buildEip712TypedData(baseContext, [message]);

      expect(typedData.types.EIP712Domain).toMatchInlineSnapshot(`
        [
          {
            "name": "name",
            "type": "string",
          },
          {
            "name": "version",
            "type": "string",
          },
          {
            "name": "chainId",
            "type": "uint256",
          },
          {
            "name": "verifyingContract",
            "type": "string",
          },
          {
            "name": "salt",
            "type": "string",
          },
        ]
      `);

      expect(typedData.types.Fee).toMatchInlineSnapshot(`
        [
          {
            "name": "amount",
            "type": "Coin[]",
          },
          {
            "name": "gas",
            "type": "string",
          },
        ]
      `);

      expect(typedData.types.Coin).toMatchInlineSnapshot(`
        [
          {
            "name": "denom",
            "type": "string",
          },
          {
            "name": "amount",
            "type": "string",
          },
        ]
      `);
    });
  });

  describe("License message snapshots", () => {
    it("MsgMintLicense typed data", () => {
      const message = msg.license.mintLicense({
        minter: "ault1minter",
        to: "ault1recipient",
        uri: "ipfs://QmTest",
        reason: "Initial mint",
      });
      const typedData = buildEip712TypedData(baseContext, [message]);

      expect(typedData.types.Tx).toMatchInlineSnapshot(`
        [
          {
            "name": "account_number",
            "type": "string",
          },
          {
            "name": "chain_id",
            "type": "string",
          },
          {
            "name": "fee",
            "type": "Fee",
          },
          {
            "name": "memo",
            "type": "string",
          },
          {
            "name": "sequence",
            "type": "string",
          },
          {
            "name": "msg0",
            "type": "TypeMsgMintLicense0",
          },
        ]
      `);

      expect(typedData.message.msg0).toMatchInlineSnapshot(`
        {
          "type": "license/MsgMintLicense",
          "value": {
            "minter": "ault1minter",
            "reason": "Initial mint",
            "to": "ault1recipient",
            "uri": "ipfs://QmTest",
          },
        }
      `);
    });

    it("MsgBatchMintLicense typed data with arrays", () => {
      const message = msg.license.batchMintLicense({
        minter: "ault1minter",
        to: ["ault1a", "ault1b", "ault1c"],
        uri: ["ipfs://1", "ipfs://2", "ipfs://3"],
        reason: "Batch mint",
      });
      const typedData = buildEip712TypedData(baseContext, [message]);

      expect(typedData.types.TypeValue0).toMatchInlineSnapshot(`
        [
          {
            "name": "uri",
            "type": "string[]",
          },
          {
            "name": "to",
            "type": "string[]",
          },
          {
            "name": "reason",
            "type": "string",
          },
          {
            "name": "minter",
            "type": "string",
          },
        ]
      `);
    });

    it("MsgTransferLicense typed data", () => {
      const message = msg.license.transferLicense({
        from: "ault1from",
        to: "ault1to",
        licenseId: 123n,
        reason: "Transfer",
      });
      const typedData = buildEip712TypedData(baseContext, [message]);

      expect(typedData.message.msg0).toMatchInlineSnapshot(`
        {
          "type": "license/MsgTransferLicense",
          "value": {
            "from": "ault1from",
            "license_id": "123",
            "reason": "Transfer",
            "to": "ault1to",
          },
        }
      `);
    });
  });

  describe("Miner message snapshots", () => {
    it("MsgDelegateMining typed data", () => {
      const message = msg.miner.delegateMining({
        owner: "ault1owner",
        licenseIds: [1n, 2n, 3n],
        operator: "ault1operator",
      });
      const typedData = buildEip712TypedData(baseContext, [message]);

      expect(typedData.types.TypeValue0).toMatchInlineSnapshot(`
        [
          {
            "name": "owner",
            "type": "string",
          },
          {
            "name": "operator",
            "type": "string",
          },
          {
            "name": "license_ids",
            "type": "string[]",
          },
        ]
      `);

      expect(typedData.message.msg0).toMatchInlineSnapshot(`
        {
          "type": "miner/MsgDelegateMining",
          "value": {
            "license_ids": [
              "1",
              "2",
              "3",
            ],
            "operator": "ault1operator",
            "owner": "ault1owner",
          },
        }
      `);
    });

    it("MsgBatchSubmitWork typed data with nested submissions", () => {
      const message = msg.miner.batchSubmitWork({
        submitter: "ault1submitter",
        submissions: [
          {
            licenseId: 1n,
            epoch: 100n,
            y: base64ToBytes("eQ=="),
            proof: base64ToBytes("cA=="),
            nonce: base64ToBytes("bg=="),
          },
          {
            licenseId: 2n,
            epoch: 100n,
            y: base64ToBytes("eQ=="),
            proof: base64ToBytes("cA=="),
            nonce: base64ToBytes("bg=="),
          },
        ],
      });
      const typedData = buildEip712TypedData(baseContext, [message]);

      // Should have nested type for submissions
      expect(Object.keys(typedData.types)).toContain("TypeValueSubmissions0");
      expect(typedData.types.TypeValueSubmissions0).toMatchInlineSnapshot(`
        [
          {
            "name": "y",
            "type": "string",
          },
          {
            "name": "proof",
            "type": "string",
          },
          {
            "name": "nonce",
            "type": "string",
          },
          {
            "name": "license_id",
            "type": "string",
          },
          {
            "name": "epoch",
            "type": "string",
          },
        ]
      `);
    });

    it("MsgRegisterOperator typed data", () => {
      const message = msg.miner.registerOperator({
        operator: "ault1op",
        commissionRate: 10,
        commissionRecipient: "ault1recipient",
      });
      const typedData = buildEip712TypedData(baseContext, [message]);

      expect(typedData.message.msg0).toMatchInlineSnapshot(`
        {
          "type": "miner/MsgRegisterOperator",
          "value": {
            "commission_rate": "10",
            "commission_recipient": "ault1recipient",
            "operator": "ault1op",
          },
        }
      `);
    });
  });

  describe("Exchange message snapshots", () => {
    it("MsgPlaceLimitOrder typed data", () => {
      const message = msg.exchange.placeLimitOrder({
        sender: "ault1trader",
        marketId: 1n,
        isBuy: true,
        price: "100.50",
        quantity: "10",
        lifespan: { seconds: 3600n, nanos: 0 },
      });
      const typedData = buildEip712TypedData(baseContext, [message]);

      expect(typedData.types.TypeValue0).toMatchInlineSnapshot(`
        [
          {
            "name": "sender",
            "type": "string",
          },
          {
            "name": "quantity",
            "type": "string",
          },
          {
            "name": "price",
            "type": "string",
          },
          {
            "name": "market_id",
            "type": "string",
          },
          {
            "name": "lifespan",
            "type": "string",
          },
          {
            "name": "is_buy",
            "type": "bool",
          },
        ]
      `);

      expect(typedData.message.msg0).toMatchInlineSnapshot(`
        {
          "type": "exchange/MsgPlaceLimitOrder",
          "value": {
            "is_buy": true,
            "lifespan": "3600000000000",
            "market_id": "1",
            "price": "100.50",
            "quantity": "10",
            "sender": "ault1trader",
          },
        }
      `);
    });

    it("MsgPlaceMarketOrder typed data", () => {
      const message = msg.exchange.placeMarketOrder({
        sender: "ault1trader",
        marketId: 1n,
        isBuy: false,
        quantity: "5",
      });
      const typedData = buildEip712TypedData(baseContext, [message]);

      expect(typedData.message.msg0).toMatchInlineSnapshot(`
        {
          "type": "exchange/MsgPlaceMarketOrder",
          "value": {
            "is_buy": false,
            "market_id": "1",
            "quantity": "5",
            "sender": "ault1trader",
          },
        }
      `);
    });
  });

  describe("Multi-message transactions", () => {
    it("two messages of the same type", () => {
      const messages = [
        msg.license.mintLicense({ minter: "m", to: "t1", uri: "u1", reason: "r1" }),
        msg.license.mintLicense({ minter: "m", to: "t2", uri: "u2", reason: "r2" }),
      ];
      const typedData = buildEip712TypedData(baseContext, [messages[0], messages[1]]);

      // Messages use TypeMsgMintLicense naming with deduplication
      expect(typedData.types.Tx).toContainEqual({ name: "msg0", type: "TypeMsgMintLicense0" });
      expect(typedData.types.Tx).toContainEqual({ name: "msg1", type: "TypeMsgMintLicense0" });

      expect(typedData.message).toHaveProperty("msg0");
      expect(typedData.message).toHaveProperty("msg1");
    });

    it("two messages of different types", () => {
      const messages = [
        msg.license.mintLicense({ minter: "m", to: "t", uri: "u", reason: "r" }),
        msg.miner.delegateMining({ owner: "o", licenseIds: [1n], operator: "op" }),
      ];
      const typedData = buildEip712TypedData(baseContext, [messages[0], messages[1]]);

      expect(typedData.message.msg0).toMatchObject({ type: "license/MsgMintLicense" });
      expect(typedData.message.msg1).toMatchObject({ type: "miner/MsgDelegateMining" });
    });
  });

  describe("Context variations", () => {
    it("includes memo in message", () => {
      const contextWithMemo = {
        ...baseContext,
        memo: "Test memo",
      };
      const message = msg.license.mintLicense({
        minter: "m",
        to: "t",
        uri: "u",
        reason: "r",
      });
      const typedData = buildEip712TypedData(contextWithMemo, [message]);

      expect(typedData.message.memo).toBe("Test memo");
    });

    it("formats account_number and sequence as strings", () => {
      const context = {
        ...baseContext,
        accountNumber: "123",
        sequence: "456",
      };
      const message = msg.license.mintLicense({
        minter: "m",
        to: "t",
        uri: "u",
        reason: "r",
      });
      const typedData = buildEip712TypedData(context, [message]);

      expect(typedData.message.account_number).toBe("123");
      expect(typedData.message.sequence).toBe("456");
    });

    it("includes correct fee structure", () => {
      const message = msg.license.mintLicense({
        minter: "m",
        to: "t",
        uri: "u",
        reason: "r",
      });
      const typedData = buildEip712TypedData(baseContext, [message]);

      expect(typedData.message.fee).toMatchInlineSnapshot(`
        {
          "amount": [
            {
              "amount": "5000000000000000",
              "denom": "aault",
            },
          ],
          "gas": "200000",
        }
      `);
    });
  });

  describe("Empty nested arrays", () => {
    it("handles empty submissions array as string[]", () => {
      const message = msg.miner.batchSubmitWork({
        submitter: "ault1submitter",
        submissions: [],
      });
      const typedData = buildEip712TypedData(baseContext, [message]);

      // Empty nested array should be typed as string[]
      const valueType = typedData.types.TypeValue0;
      const submissionsField = valueType?.find((f) => f.name === "submissions");
      expect(submissionsField?.type).toBe("string[]");
    });
  });

  describe("Type deduplication", () => {
    it("reuses identical type definitions", () => {
      const messages = [
        msg.license.mintLicense({ minter: "m1", to: "t1", uri: "u1", reason: "r1" }),
        msg.license.mintLicense({ minter: "m2", to: "t2", uri: "u2", reason: "r2" }),
      ];
      const typedData = buildEip712TypedData(baseContext, [messages[0], messages[1]]);

      // Both messages should use the same TypeValue since they have identical field structure
      expect(typedData.types.TypeValue0).toBeDefined();
      // The second message should reuse TypeValue0, not create TypeValue1
      const typeCount = Object.keys(typedData.types).filter((k) => k.startsWith("TypeValue")).length;
      expect(typeCount).toBe(1);
    });
  });
});
