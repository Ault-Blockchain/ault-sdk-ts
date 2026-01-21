import { describe, it, expect, beforeEach } from "vitest";
import { createStakingApi, type StakingApi } from "../staking";
import { createMockFetch, mockJsonResponse, type MockFetch } from "../../__tests__/helpers/mock-fetch";
import type {
  Validator,
  DelegationResponse,
  UnbondingDelegation,
  DelegationReward,
  StakingPool,
} from "../types";

describe("StakingApi", () => {
  let api: StakingApi;
  let mockFetch: MockFetch;
  let context: { restUrl: string; fetchFn: MockFetch };

  const sampleValidator: Validator = {
    operator_address: "aultvaloper1validator",
    consensus_pubkey: {
      "@type": "/cosmos.crypto.ed25519.PubKey",
      value: "AQID",
    },
    jailed: false,
    status: "BOND_STATUS_BONDED",
    tokens: "1000",
    delegator_shares: "1000",
    description: {
      moniker: "validator",
      identity: "",
      website: "",
      security_contact: "",
      details: "",
    },
    unbonding_height: "0",
    unbonding_time: "2024-01-01T00:00:00Z",
    commission: {
      commission_rates: {
        rate: "0.1",
        max_rate: "0.2",
        max_change_rate: "0.01",
      },
      update_time: "2024-01-01T00:00:00Z",
    },
    min_self_delegation: "1",
  };
  const sampleDelegation: DelegationResponse = {
    delegation: {
      delegator_address: "ault1delegator",
      validator_address: "aultvaloper1validator",
      shares: "100.5",
    },
    balance: {
      denom: "aault",
      amount: "100",
    },
  };
  const sampleUnbonding: UnbondingDelegation = {
    delegator_address: "ault1delegator",
    validator_address: "aultvaloper1validator",
    entries: [
      {
        creation_height: "123",
        completion_time: "2024-01-01T00:00:00Z",
        initial_balance: "10",
        balance: "5",
      },
    ],
  };
  const sampleRewards: DelegationReward[] = [
    {
      validator_address: "aultvaloper1validator",
      reward: [{ denom: "aault", amount: "0.5" }],
    },
  ];
  const samplePool: StakingPool = {
    not_bonded_tokens: "100",
    bonded_tokens: "900",
  };

  beforeEach(() => {
    mockFetch = createMockFetch();
    context = {
      restUrl: "https://api.example.com",
      fetchFn: mockFetch,
    };
    api = createStakingApi(context);
  });

  it("fetches validators without params", async () => {
    mockFetch = createMockFetch(mockJsonResponse({ validators: [] }));
    context.fetchFn = mockFetch;
    api = createStakingApi(context);

    const result = await api.getValidators();

    expect(result.validators).toEqual([]);
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/cosmos/staking/v1beta1/validators");
  });

  it("supports pagination dot notation", async () => {
    mockFetch = createMockFetch(mockJsonResponse({ validators: [] }));
    context.fetchFn = mockFetch;
    api = createStakingApi(context);

    await api.getValidators({ "pagination.key": "abc", "pagination.limit": 10 });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("pagination.key=abc");
    expect(url).toContain("pagination.limit=10");
  });

  it("supports pagination underscore notation", async () => {
    mockFetch = createMockFetch(mockJsonResponse({ validators: [] }));
    context.fetchFn = mockFetch;
    api = createStakingApi(context);

    await api.getValidators({ pagination_key: "def", pagination_limit: 20 });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("pagination.key=def");
    expect(url).toContain("pagination.limit=20");
  });

  it("adds validator status to the query string", async () => {
    mockFetch = createMockFetch(mockJsonResponse({ validators: [] }));
    context.fetchFn = mockFetch;
    api = createStakingApi(context);

    await api.getValidators({ status: "BOND_STATUS_BONDED" });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("status=BOND_STATUS_BONDED");
  });

  it("parses validator responses with consensus_pubkey value field", async () => {
    mockFetch = createMockFetch(mockJsonResponse({ validator: sampleValidator }));
    context.fetchFn = mockFetch;
    api = createStakingApi(context);

    const result = await api.getValidator("aultvaloper1validator");

    expect(result.validator.consensus_pubkey?.value).toBe("AQID");
  });

  it("coerces staking params numbers", async () => {
    const params = {
      unbonding_time: "1814400s",
      max_validators: "125",
      max_entries: "7",
      historical_entries: "10000",
      bond_denom: "aault",
      min_commission_rate: "0.05",
    };

    mockFetch = createMockFetch(mockJsonResponse({ params }));
    context.fetchFn = mockFetch;
    api = createStakingApi(context);

    const result = await api.getStakingParams();

    expect(result.params.max_validators).toBe(125);
    expect(result.params.max_entries).toBe(7);
    expect(result.params.historical_entries).toBe(10000);
  });

  it("fetches delegations with pagination", async () => {
    mockFetch = createMockFetch(
      mockJsonResponse({ delegation_responses: [sampleDelegation], pagination: { total: "1" } }),
    );
    context.fetchFn = mockFetch;
    api = createStakingApi(context);

    const result = await api.getDelegations("ault1delegator", { pagination_limit: 5 });

    expect(result.delegation_responses).toHaveLength(1);
    expect(result.delegation_responses[0].delegation.validator_address).toBe("aultvaloper1validator");
    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe(
      "https://api.example.com/cosmos/staking/v1beta1/delegations/ault1delegator?pagination.limit=5",
    );
  });

  it("fetches unbonding delegations with dot-notation pagination", async () => {
    mockFetch = createMockFetch(
      mockJsonResponse({ unbonding_responses: [sampleUnbonding], pagination: { next_key: "next" } }),
    );
    context.fetchFn = mockFetch;
    api = createStakingApi(context);

    const result = await api.getUnbondingDelegations("ault1delegator", {
      "pagination.key": "next",
    });

    expect(result.unbonding_responses).toHaveLength(1);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe(
      "https://api.example.com/cosmos/staking/v1beta1/delegators/ault1delegator/unbonding_delegations?pagination.key=next",
    );
  });

  it("fetches staking rewards", async () => {
    mockFetch = createMockFetch(
      mockJsonResponse({ rewards: sampleRewards, total: [{ denom: "aault", amount: "0.5" }] }),
    );
    context.fetchFn = mockFetch;
    api = createStakingApi(context);

    const result = await api.getStakingRewards("ault1delegator");

    expect(result.rewards[0].validator_address).toBe("aultvaloper1validator");
    expect(result.total[0].amount).toBe("0.5");
    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe(
      "https://api.example.com/cosmos/distribution/v1beta1/delegators/ault1delegator/rewards",
    );
  });

  it("fetches staking pool", async () => {
    mockFetch = createMockFetch(mockJsonResponse({ pool: samplePool }));
    context.fetchFn = mockFetch;
    api = createStakingApi(context);

    const result = await api.getStakingPool();

    expect(result.pool.bonded_tokens).toBe("900");
    expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/cosmos/staking/v1beta1/pool");
  });
});
