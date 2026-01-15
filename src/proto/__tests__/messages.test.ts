import { describe, it, expect } from "vitest";
import {
  MsgMintLicense,
  MsgBatchMintLicense,
  MsgApproveMember,
  MsgRevokeMember,
  MsgBatchApproveMember,
  MsgBatchRevokeMember,
  MsgRevokeLicense,
  MsgBurnLicense,
  MsgSetTokenURI,
  MsgSetMinters,
  MsgSetParams,
  MsgSetKYCApprovers,
  MsgTransferLicense,
} from "../messages/license";
import {
  MsgDelegateMining,
  MsgCancelMiningDelegation,
  MsgSetOwnerVrfKey,
  MsgSubmitWork,
  MsgBatchSubmitWork,
  MsgUpdateParams as MsgUpdateMinerParams,
  MsgRegisterOperator,
  MsgUnregisterOperator,
  MsgUpdateOperatorInfo,
  MsgRedelegateMining,
} from "../messages/miner";
import {
  MsgCreateMarket,
  MsgPlaceLimitOrder,
  MsgPlaceMarketOrder,
  MsgCancelOrder,
  MsgCancelAllOrders,
  MsgUpdateMarketParams,
} from "../messages/exchange";
import { asBase64String } from "../../core/base64";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================================
// License Message Tests
// ============================================================================

describe("License Messages", () => {
  describe("MsgMintLicense", () => {
    it("has correct typeUrl", () => {
      expect(MsgMintLicense.typeUrl).toBe("/ault.license.v1.MsgMintLicense");
    });

    it("has correct aminoType", () => {
      expect(MsgMintLicense.aminoType).toBe("license/MsgMintLicense");
    });

    it("encodes message correctly", () => {
      const msg = MsgMintLicense.fromPartial({
        minter: "ault1minter",
        to: "ault1recipient",
        uri: "ipfs://test",
        reason: "test mint",
      });
      const bytes = MsgMintLicense.encode(msg).finish();

      expect(bytes.length).toBeGreaterThan(0);
      const hex = toHex(bytes);
      // Should contain field tags 1, 2, 3, 4
      expect(hex).toContain("0a"); // field 1
      expect(hex).toContain("12"); // field 2
      expect(hex).toContain("1a"); // field 3
      expect(hex).toContain("22"); // field 4
    });

    it("fromPartial uses defaults for missing fields", () => {
      const msg = MsgMintLicense.fromPartial({});
      expect(msg.minter).toBe("");
      expect(msg.to).toBe("");
      expect(msg.uri).toBe("");
      expect(msg.reason).toBe("");
    });

    it("produces deterministic output", () => {
      const msg = MsgMintLicense.fromPartial({
        minter: "ault1abc",
        to: "ault1def",
        uri: "ipfs://hash",
        reason: "test",
      });
      const bytes1 = MsgMintLicense.encode(msg).finish();
      const bytes2 = MsgMintLicense.encode(msg).finish();
      expect(toHex(bytes1)).toBe(toHex(bytes2));
    });
  });

  describe("MsgBatchMintLicense", () => {
    it("encodes arrays correctly", () => {
      const msg = MsgBatchMintLicense.fromPartial({
        minter: "ault1minter",
        to: ["ault1a", "ault1b", "ault1c"],
        uri: ["ipfs://1", "ipfs://2", "ipfs://3"],
        reason: "batch mint",
      });
      const bytes = MsgBatchMintLicense.encode(msg).finish();

      expect(bytes.length).toBeGreaterThan(0);
      // Multiple field 2 and field 3 entries for arrays
      const hex = toHex(bytes);
      expect(hex.split("12").length - 1).toBeGreaterThanOrEqual(3); // 3+ field 2 entries
    });

    it("handles empty arrays", () => {
      const msg = MsgBatchMintLicense.fromPartial({
        minter: "ault1m",
        to: [],
        uri: [],
        reason: "empty",
      });
      const bytes = MsgBatchMintLicense.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgApproveMember", () => {
    it("encodes correctly", () => {
      const msg = MsgApproveMember.fromPartial({
        authority: "ault1gov",
        member: "ault1member",
      });
      const bytes = MsgApproveMember.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgRevokeMember", () => {
    it("encodes correctly", () => {
      const msg = MsgRevokeMember.fromPartial({
        authority: "ault1gov",
        member: "ault1member",
      });
      const bytes = MsgRevokeMember.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgBatchApproveMember", () => {
    it("encodes member array", () => {
      const msg = MsgBatchApproveMember.fromPartial({
        authority: "ault1gov",
        members: ["ault1a", "ault1b"],
      });
      const bytes = MsgBatchApproveMember.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgBatchRevokeMember", () => {
    it("encodes member array", () => {
      const msg = MsgBatchRevokeMember.fromPartial({
        authority: "ault1gov",
        members: ["ault1a", "ault1b"],
      });
      const bytes = MsgBatchRevokeMember.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgRevokeLicense", () => {
    it("encodes bigint id", () => {
      const msg = MsgRevokeLicense.fromPartial({
        authority: "ault1gov",
        id: 12345n,
        reason: "revoked",
      });
      const bytes = MsgRevokeLicense.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
      // Should contain field 2 (uint64)
      expect(toHex(bytes)).toContain("10"); // field 2 varint
    });

    it("fromPartial defaults id to 0n", () => {
      const msg = MsgRevokeLicense.fromPartial({});
      expect(msg.id).toBe(0n);
    });
  });

  describe("MsgBurnLicense", () => {
    it("encodes bigint id", () => {
      const msg = MsgBurnLicense.fromPartial({
        authority: "ault1gov",
        id: 999n,
        reason: "burned",
      });
      const bytes = MsgBurnLicense.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgSetTokenURI", () => {
    it("encodes correctly", () => {
      const msg = MsgSetTokenURI.fromPartial({
        minter: "ault1m",
        id: 42n,
        uri: "ipfs://new",
      });
      const bytes = MsgSetTokenURI.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgSetMinters", () => {
    it("encodes add/remove arrays", () => {
      const msg = MsgSetMinters.fromPartial({
        authority: "ault1gov",
        add: ["ault1new"],
        remove: ["ault1old"],
      });
      const bytes = MsgSetMinters.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgSetParams", () => {
    it("encodes nested params structure", () => {
      const msg = MsgSetParams.fromPartial({
        authority: "ault1gov",
        params: {
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
        },
      });
      const bytes = MsgSetParams.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(50); // Params add significant size
    });

    it("uses default params when not provided", () => {
      const msg = MsgSetParams.fromPartial({
        authority: "ault1gov",
      });
      expect(msg.params.class_name).toBe("");
      expect(msg.params.supply_cap).toBe(0n);
    });
  });

  describe("MsgSetKYCApprovers", () => {
    it("encodes add/remove arrays", () => {
      const msg = MsgSetKYCApprovers.fromPartial({
        authority: "ault1gov",
        add: ["ault1kyc1"],
        remove: [],
      });
      const bytes = MsgSetKYCApprovers.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgTransferLicense", () => {
    it("encodes transfer with bigint license_id", () => {
      const msg = MsgTransferLicense.fromPartial({
        from: "ault1from",
        to: "ault1to",
        license_id: 123n,
        reason: "transfer",
      });
      const bytes = MsgTransferLicense.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Miner Message Tests
// ============================================================================

describe("Miner Messages", () => {
  describe("MsgDelegateMining", () => {
    it("has correct typeUrl", () => {
      expect(MsgDelegateMining.typeUrl).toBe("/ault.miner.v1.MsgDelegateMining");
    });

    it("encodes license_ids as repeated uint64", () => {
      const msg = MsgDelegateMining.fromPartial({
        owner: "ault1owner",
        license_ids: [1n, 2n, 3n],
        operator: "ault1op",
      });
      const bytes = MsgDelegateMining.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
      // Should have multiple field 2 entries
      const hex = toHex(bytes);
      expect(hex.split("10").length - 1).toBeGreaterThanOrEqual(3);
    });

    it("handles empty license_ids", () => {
      const msg = MsgDelegateMining.fromPartial({
        owner: "ault1owner",
        license_ids: [],
        operator: "ault1op",
      });
      const bytes = MsgDelegateMining.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgCancelMiningDelegation", () => {
    it("encodes correctly", () => {
      const msg = MsgCancelMiningDelegation.fromPartial({
        owner: "ault1owner",
        license_ids: [1n, 2n],
      });
      const bytes = MsgCancelMiningDelegation.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgSetOwnerVrfKey", () => {
    it("encodes base64 fields as bytes", () => {
      const msg = MsgSetOwnerVrfKey.fromPartial({
        vrf_pubkey: asBase64String("YWJj"), // "abc" in base64
        possession_proof: asBase64String("ZGVm"), // "def" in base64
        nonce: 42n,
        owner: "ault1owner",
      });
      const bytes = MsgSetOwnerVrfKey.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("handles empty base64 strings", () => {
      const msg = MsgSetOwnerVrfKey.fromPartial({
        vrf_pubkey: asBase64String(""),
        possession_proof: asBase64String(""),
        nonce: 0n,
        owner: "ault1owner",
      });
      const bytes = MsgSetOwnerVrfKey.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgSubmitWork", () => {
    it("encodes work submission", () => {
      const msg = MsgSubmitWork.fromPartial({
        license_id: 1n,
        epoch: 100n,
        y: asBase64String("eQ=="), // "y" in base64
        proof: asBase64String("cHJvb2Y="), // "proof" in base64
        nonce: asBase64String("bm9uY2U="), // "nonce" in base64
        submitter: "ault1sub",
      });
      const bytes = MsgSubmitWork.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgBatchSubmitWork", () => {
    it("encodes multiple submissions", () => {
      const msg = MsgBatchSubmitWork.fromPartial({
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
        submitter: "ault1sub",
      });
      const bytes = MsgBatchSubmitWork.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("handles empty submissions", () => {
      const msg = MsgBatchSubmitWork.fromPartial({
        submissions: [],
        submitter: "ault1sub",
      });
      const bytes = MsgBatchSubmitWork.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgUpdateParams (Miner)", () => {
    it("encodes nested miner params", () => {
      const msg = MsgUpdateMinerParams.fromPartial({
        authority: "ault1gov",
        params: {
          epoch_length_seconds: 3600n,
          target_winners_per_epoch: 10n,
          max_winners_per_epoch: 100n,
          submission_window_seconds: 300n,
          controller_alpha_q16: 0n,
          controller_window: 0n,
          threshold_min: "0.1",
          threshold_max: "0.9",
          beacon_window_epochs: 5n,
          key_rotation_cooldown_seconds: 86400n,
          vrf_verify_gas: 100000n,
          min_key_age_epochs: 3n,
          initial_emission_per_epoch: "1000000",
          emission_decay_rate: "0.01",
          max_emission_years: 10n,
          max_payouts_per_block: 50n,
          max_epochs_per_block: 10n,
          staking_reward_percentage: 10n,
          max_commission_rate: 20n,
          max_commission_rate_increase_per_epoch: 1n,
          free_mining_until_epoch: 100n,
          free_mining_max_gas_limit: 500000n,
          miner_allowed_msgs: [],
          max_free_tx_per_epoch: 100n,
        },
      });
      const bytes = MsgUpdateMinerParams.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(50);
    });
  });

  describe("MsgRegisterOperator", () => {
    it("encodes correctly", () => {
      const msg = MsgRegisterOperator.fromPartial({
        operator: "ault1op",
        commission_rate: 10n,
        commission_recipient: "ault1recipient",
      });
      const bytes = MsgRegisterOperator.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgUnregisterOperator", () => {
    it("encodes correctly", () => {
      const msg = MsgUnregisterOperator.fromPartial({
        operator: "ault1op",
      });
      const bytes = MsgUnregisterOperator.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgUpdateOperatorInfo", () => {
    it("encodes correctly", () => {
      const msg = MsgUpdateOperatorInfo.fromPartial({
        operator: "ault1op",
        new_commission_rate: 15n,
        new_commission_recipient: "ault1new",
      });
      const bytes = MsgUpdateOperatorInfo.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgRedelegateMining", () => {
    it("encodes correctly", () => {
      const msg = MsgRedelegateMining.fromPartial({
        owner: "ault1owner",
        license_ids: [1n, 2n],
        new_operator: "ault1newop",
      });
      const bytes = MsgRedelegateMining.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Exchange Message Tests
// ============================================================================

describe("Exchange Messages", () => {
  describe("MsgCreateMarket", () => {
    it("has correct typeUrl", () => {
      expect(MsgCreateMarket.typeUrl).toBe("/ault.exchange.v1beta1.MsgCreateMarket");
    });

    it("encodes correctly", () => {
      const msg = MsgCreateMarket.fromPartial({
        sender: "ault1sender",
        base_denom: "uatom",
        quote_denom: "aault",
      });
      const bytes = MsgCreateMarket.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgPlaceLimitOrder", () => {
    it("encodes with duration lifespan", () => {
      const msg = MsgPlaceLimitOrder.fromPartial({
        sender: "ault1trader",
        market_id: 1n,
        is_buy: true,
        price: "100.50",
        quantity: "10",
        lifespan: 3600000000000n, // 3600 seconds in nanoseconds
      });
      const bytes = MsgPlaceLimitOrder.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
      // Should contain field 6 (duration bytes)
      expect(toHex(bytes)).toContain("32"); // field 6 length-delimited
    });

    it("encodes is_buy=false", () => {
      const msg = MsgPlaceLimitOrder.fromPartial({
        sender: "ault1trader",
        market_id: 1n,
        is_buy: false,
        price: "99.00",
        quantity: "5",
        lifespan: 0n,
      });
      const bytes = MsgPlaceLimitOrder.encode(msg).finish();
      // is_buy=false should not write field 3 (proto3 default)
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("encodes is_buy=true", () => {
      const msg = MsgPlaceLimitOrder.fromPartial({
        sender: "ault1trader",
        market_id: 1n,
        is_buy: true,
        price: "99.00",
        quantity: "5",
        lifespan: 0n,
      });
      const bytes = MsgPlaceLimitOrder.encode(msg).finish();
      // is_buy=true should write field 3
      expect(toHex(bytes)).toContain("18"); // field 3 varint
    });
  });

  describe("MsgPlaceMarketOrder", () => {
    it("encodes correctly", () => {
      const msg = MsgPlaceMarketOrder.fromPartial({
        sender: "ault1trader",
        market_id: 2n,
        is_buy: true,
        quantity: "100",
      });
      const bytes = MsgPlaceMarketOrder.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgCancelOrder", () => {
    it("encodes order_id as bytes", () => {
      const msg = MsgCancelOrder.fromPartial({
        sender: "ault1trader",
        order_id: asBase64String("b3JkZXJfMTIz"), // "order_123" in base64
      });
      const bytes = MsgCancelOrder.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgCancelAllOrders", () => {
    it("encodes correctly", () => {
      const msg = MsgCancelAllOrders.fromPartial({
        sender: "ault1trader",
        market_id: 1n,
      });
      const bytes = MsgCancelAllOrders.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });

  describe("MsgUpdateMarketParams", () => {
    it("encodes nested updates array", () => {
      const msg = MsgUpdateMarketParams.fromPartial({
        authority: "ault1gov",
        updates: [
          { market_id: 1n, maker_fee_rate: "0.001", taker_fee_rate: "0.002" },
          { market_id: 2n, maker_fee_rate: "0.0015", taker_fee_rate: "0.0025" },
        ],
      });
      const bytes = MsgUpdateMarketParams.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });

    it("handles empty updates", () => {
      const msg = MsgUpdateMarketParams.fromPartial({
        authority: "ault1gov",
        updates: [],
      });
      const bytes = MsgUpdateMarketParams.encode(msg).finish();
      expect(bytes.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Snapshot Tests for Encoding Stability
// ============================================================================

describe("Encoding Snapshots", () => {
  it("MsgMintLicense encoding is stable", () => {
    const msg = MsgMintLicense.fromPartial({
      minter: "ault1abc",
      to: "ault1def",
      uri: "ipfs://test",
      reason: "mint",
    });
    expect(toHex(MsgMintLicense.encode(msg).finish())).toMatchInlineSnapshot(
      `"0a0861756c7431616263120861756c74316465661a0b697066733a2f2f7465737422046d696e74"`,
    );
  });

  it("MsgDelegateMining encoding is stable", () => {
    const msg = MsgDelegateMining.fromPartial({
      owner: "ault1owner",
      license_ids: [1n, 2n],
      operator: "ault1op",
    });
    expect(toHex(MsgDelegateMining.encode(msg).finish())).toMatchInlineSnapshot(
      `"0a0a61756c74316f776e6572100110021a0761756c74316f70"`,
    );
  });

  it("MsgCreateMarket encoding is stable", () => {
    const msg = MsgCreateMarket.fromPartial({
      sender: "ault1sender",
      base_denom: "base",
      quote_denom: "quote",
    });
    expect(toHex(MsgCreateMarket.encode(msg).finish())).toMatchInlineSnapshot(
      `"0a0b61756c743173656e6465721204626173651a0571756f7465"`,
    );
  });
});
