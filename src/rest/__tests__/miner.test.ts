import { describe, it, expect, beforeEach } from "vitest";
import { createMinerApi, type MinerApi } from "../miner";
import {
  createMockFetch,
  mockJsonResponse,
  mockErrorResponse,
  type MockFetch,
} from "./mock-fetch";
import type { Operator, MiningDelegation, EpochInfo } from "../types";

describe("MinerApi", () => {
  let api: MinerApi;
  let mockFetch: MockFetch;
  let context: { restUrl: string; fetchFn: MockFetch };

  const sampleOperator: Operator = {
    operator: "ault1operator",
    commission_rate: 10,
    commission_recipient: "ault1recipient",
    last_update_epoch: "99",
  };

  const sampleDelegation: MiningDelegation = {
    license_id: "1",
    operator: "ault1operator",
  };

  const sampleEpoch: EpochInfo = {
    epoch: "100",
    seed: "c2VlZA==",
    threshold: "dGhyZXNob2xk",
    beacon_r: "YmVhY29u",
    finalized: true,
  };
  const sampleMinerParams = {
    epoch_length_seconds: "3600",
    target_winners_per_epoch: 10,
    max_winners_per_epoch: 20,
    submission_window_seconds: 300,
    controller_alpha_q16: 1,
    controller_window: 5,
    threshold_min: "00",
    threshold_max: "ff",
    beacon_window_epochs: 3,
    key_rotation_cooldown_seconds: "60",
    vrf_verify_gas: 20000,
    min_key_age_epochs: 2,
    initial_emission_per_epoch: "1000",
    emission_decay_rate: "0.05",
    max_emission_years: 10,
    max_payouts_per_block: 500,
    max_epochs_per_block: "100",
    staking_reward_percentage: 5,
    max_commission_rate: 50,
    max_commission_rate_increase_per_epoch: 5,
    free_mining_until_epoch: "0",
    free_mining_max_gas_limit: "200000",
    miner_allowed_msgs: ["/ault.miner.v1.MsgSubmitWork"],
    max_free_tx_per_epoch: 10,
  };

  beforeEach(() => {
    mockFetch = createMockFetch();
    context = {
      restUrl: "https://api.example.com",
      fetchFn: mockFetch,
    };
    api = createMinerApi(context);
  });

  describe("getCurrentEpoch", () => {
    it("fetches current epoch info", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ epoch: "100", seed: "0xabc", threshold: "0.5" }),
      );
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getCurrentEpoch();

      expect(result.epoch).toBe("100");
      expect(result.seed).toBe("0xabc");
      expect(result.threshold).toBe("0.5");
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/ault/miner/v1/epoch");
    });
  });

  describe("getLicenseMinerInfo", () => {
    it("fetches miner info for license", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({
          vrf_pubkey: "cHVia2V5",
          last_submit_epoch: "99",
          eligible_now: true,
          quarantined_local: false,
          quarantined_source: false,
          all_time_credits: "42",
          all_time_payouts: "1000",
        }),
      );
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getLicenseMinerInfo("1");

      expect(result.vrf_pubkey).toBe("cHVia2V5");
      expect(result.last_submit_epoch).toBe("99");
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/miner/v1/license/1/info",
      );
    });

    it("accepts numeric license id", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({
          vrf_pubkey: "cHVia2V5",
          last_submit_epoch: "99",
          eligible_now: true,
          quarantined_local: false,
          quarantined_source: false,
          all_time_credits: "42",
          all_time_payouts: "1000",
        }),
      );
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      await api.getLicenseMinerInfo(42);

      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/miner/v1/license/42/info",
      );
    });
  });

  describe("getBeacon", () => {
    it("fetches beacon for epoch", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ r: "0xbeacon", finalized: true }));
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getBeacon("100");

      expect(result.r).toBe("0xbeacon");
      expect(result.finalized).toBe(true);
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/ault/miner/v1/beacon/100");
    });
  });

  describe("getParams", () => {
    it("fetches miner params", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ params: sampleMinerParams }));
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getParams();

      expect(result.params.epoch_length_seconds).toBe("3600");
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/ault/miner/v1/params");
    });
  });

  describe("getOwnerKey", () => {
    it("fetches owner VRF key", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({
          vrf_pubkey: "cHVia2V5",
          nonce: "2",
          last_rotation_time: "1700000000",
          registration_epoch: "10",
          valid_from_epoch: "12",
          registration_chain_id: "ault-1",
        }),
      );
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getOwnerKey("ault1owner");

      expect(result.vrf_pubkey).toBe("cHVia2V5");
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/miner/v1/owner/ault1owner/key",
      );
    });
  });

  describe("getEmissionInfo", () => {
    it("fetches emission info", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({
          current_year: 1,
          annual_emission: "1000000",
          monthly_emission: "100000",
          daily_emission: "10000",
          cumulative_emitted: "5000000",
          epochs_until_next_year: "100",
          current_epoch: "1200",
          epochs_per_year: "1300",
        }),
      );
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getEmissionInfo();

      expect(result.annual_emission).toBe("1000000");
      expect(result.cumulative_emitted).toBe("5000000");
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/miner/v1/emission/info",
      );
    });
  });

  describe("getEmissionSchedule", () => {
    it("fetches emission schedule", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ schedule: [] }));
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getEmissionSchedule();

      expect(result).toHaveProperty("schedule");
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/miner/v1/emission/schedule",
      );
    });
  });

  describe("getEpochInfo", () => {
    it("fetches epoch info", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ info: sampleEpoch }),
      );
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getEpochInfo("100");

      expect(result.info.epoch).toBe("100");
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/ault/miner/v1/epoch/100");
    });
  });

  describe("getEpochs", () => {
    it("fetches epochs list without params", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ epochs: [sampleEpoch] }),
      );
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getEpochs();

      expect(result.epochs).toHaveLength(1);
      expect(result.epochs[0]).toEqual(sampleEpoch);
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/ault/miner/v1/epochs");
    });

    it("includes pagination params", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ epochs: [] }));
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      await api.getEpochs({
        pagination: { "pagination.limit": 10, "pagination.reverse": true },
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("pagination.limit=10");
      expect(url).toContain("pagination.reverse=true");
    });
  });

  describe("getEpochsAll", () => {
    it("paginates through all epochs", async () => {
      const epoch1 = { ...sampleEpoch, epoch: "1" };
      const epoch2 = { ...sampleEpoch, epoch: "2" };
      const epoch3 = { ...sampleEpoch, epoch: "3" };

      mockFetch = createMockFetch([
        mockJsonResponse({ epochs: [epoch1, epoch2], pagination: { next_key: "abc" } }),
        mockJsonResponse({ epochs: [epoch3], pagination: { next_key: "" } }),
      ]);
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getEpochsAll();

      expect(result.epochs).toHaveLength(3);
      expect(result.epochs.map((e) => e.epoch)).toEqual(["1", "2", "3"]);
      expect(result.total).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("handles empty result", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ epochs: [], pagination: { next_key: "" } }));
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getEpochsAll();

      expect(result.epochs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("handles single page result", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ epochs: [sampleEpoch], pagination: { next_key: "" } }),
      );
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getEpochsAll();

      expect(result.epochs).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getOperator", () => {
    it("fetches operator info", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ operator: sampleOperator }));
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getOperator("ault1operator");

      expect(result.operator).toEqual(sampleOperator);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/cosmos/miner/v1/operator/ault1operator",
      );
    });

    it("handles info field in response", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ info: sampleOperator }));
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getOperator("ault1operator");

      expect(result.operator).toEqual(sampleOperator);
    });

    it("returns null for 404", async () => {
      mockFetch = createMockFetch(mockErrorResponse(404, { code: 5, message: "not found" }));
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getOperator("ault1unknown");

      expect(result.operator).toBeNull();
    });
  });

  describe("getOperators", () => {
    it("fetches all operators", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ operators: [sampleOperator] }));
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getOperators();

      expect(result.operators).toHaveLength(1);
      expect(result.operators[0]).toEqual(sampleOperator);
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/cosmos/miner/v1/operators");
    });
  });

  describe("getLicenseDelegation", () => {
    it("fetches delegation info", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ delegation: sampleDelegation, is_delegated: true }),
      );
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getLicenseDelegation("1");

      expect(result.delegation).toEqual(sampleDelegation);
      expect(result.is_delegated).toBe(true);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/cosmos/miner/v1/license/1/delegation",
      );
    });

    it("returns null delegation when not delegated", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ delegation: null, is_delegated: false }));
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getLicenseDelegation("1");

      expect(result.delegation).toBeNull();
      expect(result.is_delegated).toBe(false);
    });

    it("returns null for 404", async () => {
      mockFetch = createMockFetch(mockErrorResponse(404, { code: 5, message: "not found" }));
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getLicenseDelegation("999");

      expect(result.delegation).toBeNull();
      expect(result.is_delegated).toBe(false);
    });
  });

  describe("getDelegatedLicenses", () => {
    it("fetches licenses delegated to operator", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ license_ids: ["1", "2", "3"] }));
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getDelegatedLicenses("ault1operator");

      expect(result.license_ids).toEqual(["1", "2", "3"]);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/cosmos/miner/v1/operator/ault1operator/licenses",
      );
    });
  });

  describe("getLicensePayouts", () => {
    it("fetches license payouts without params", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ total_payout: "1000", total_credits: "25" }),
      );
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      const result = await api.getLicensePayouts("1");

      expect(result.total_payout).toBe("1000");
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/miner/v1/license/1/payouts",
      );
    });

    it("includes epoch range params", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ total_payout: "1000", total_credits: "25" }),
      );
      context.fetchFn = mockFetch;
      api = createMinerApi(context);

      await api.getLicensePayouts("1", { fromEpoch: "10", toEpoch: "20" });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("from_epoch=10");
      expect(url).toContain("to_epoch=20");
    });
  });

  describe("URL construction", () => {
    it("handles trailing slash in base URL", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ epoch: "1", seed: "", threshold: "" }));
      context = {
        restUrl: "https://api.example.com/",
        fetchFn: mockFetch,
      };
      api = createMinerApi(context);

      await api.getCurrentEpoch();

      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/ault/miner/v1/epoch");
    });
  });
});
