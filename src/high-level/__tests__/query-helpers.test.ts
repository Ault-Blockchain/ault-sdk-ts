import { describe, expect, it, vi } from "vitest";
import type { AultClient } from "../../client";
import { evmToAult } from "../../utils/address";
import { createParallelQueryApi } from "../query-helpers";

function makeLowLevelMock() {
  const getBalance = vi.fn();
  const getTokenOfOwnerByIndex = vi.fn();
  const getLicense = vi.fn();
  const getLicenseDelegation = vi.fn();

  const lowLevel = {
    rest: {
      license: {
        getBalance,
        getTokenOfOwnerByIndex,
        getLicense,
      },
      miner: {
        getLicenseDelegation,
      },
    },
  } as unknown as AultClient;

  return {
    lowLevel,
    getBalance,
    getTokenOfOwnerByIndex,
    getLicense,
    getLicenseDelegation,
  };
}

describe("createParallelQueryApi", () => {
  it("analyzes licenses and filters missing records", async () => {
    const { lowLevel, getBalance, getTokenOfOwnerByIndex, getLicense, getLicenseDelegation } =
      makeLowLevelMock();

    getBalance.mockResolvedValue({ balance: "3" });
    getTokenOfOwnerByIndex
      .mockResolvedValueOnce({ id: "1" })
      .mockResolvedValueOnce({ id: "2" })
      .mockResolvedValueOnce({ id: "3" });

    getLicense
      .mockResolvedValueOnce({
        license: {
          id: "1",
          owner: "ault1owner",
          status: "LICENSE_STATUS_ACTIVE",
          class_name: "A",
          uri: "ipfs://1",
          created_at: "2024-01-01T00:00:00Z",
        },
      })
      .mockResolvedValueOnce({
        license: {
          id: "2",
          owner: "ault1owner",
          status: "LICENSE_STATUS_REVOKED",
          class_name: "A",
          uri: "ipfs://2",
          created_at: "2024-01-01T00:00:00Z",
        },
      })
      .mockRejectedValueOnce(new Error("not found"));

    getLicenseDelegation
      .mockResolvedValueOnce({
        is_delegated: true,
        delegation: { operator: "ault1operator" },
      })
      .mockResolvedValueOnce({
        is_delegated: false,
        delegation: null,
      })
      .mockRejectedValueOnce(new Error("boom"));

    const api = createParallelQueryApi(lowLevel);
    const ownerAddress = evmToAult("0x0000000000000000000000000000000000000002");
    const result = await api.analyzeLicenses(ownerAddress);

    expect(result.total).toBe(3);
    expect(result.active).toBe(1);
    expect(result.delegated).toBe(1);
    expect(result.licenses).toHaveLength(2);
    expect(result.delegations).toEqual([{ licenseId: "1", operator: "ault1operator" }]);
  });

  it("normalizes evm owner addresses", async () => {
    const { lowLevel, getBalance } = makeLowLevelMock();
    getBalance.mockResolvedValue({ balance: "0" });

    const api = createParallelQueryApi(lowLevel);
    const evmAddress = "0x0000000000000000000000000000000000000001";

    await api.getAllLicenseIds(evmAddress);

    expect(getBalance).toHaveBeenCalledWith(evmToAult(evmAddress));
  });
});
