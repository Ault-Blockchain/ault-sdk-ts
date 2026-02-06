import { describe, it, expect, beforeEach } from "vitest";
import { createLicenseApi, type LicenseApi } from "../license";
import { createMockFetch, mockJsonResponse, type MockFetch } from "./mock-fetch";
import type { License } from "../types";

describe("LicenseApi", () => {
  let api: LicenseApi;
  let mockFetch: MockFetch;
  let context: { restUrl: string; fetchFn: MockFetch };

  const sampleLicense: License = {
    id: "1",
    owner: "ault1owner",
    status: "LICENSE_STATUS_ACTIVE",
    class_name: "Ault License",
    uri: "ipfs://test",
    created_at: "2024-01-01T00:00:00Z",
  };
  const sampleLicenseParams = {
    class_name: "Ault License",
    class_symbol: "AULT",
    base_token_uri: "ipfs://base/",
    minting_paused: false,
    supply_cap: "1000000",
    allow_metadata_update: true,
    admin_can_revoke: true,
    admin_can_burn: true,
    max_batch_size: 100,
    transfer_unlock_days: 365,
    enable_transfers: true,
    minter_allowed_msgs: ["/ault.license.v1.MsgMintLicense"],
    kyc_approver_allowed_msgs: ["/ault.license.v1.MsgApproveMember"],
    free_max_gas_limit: "200000",
    max_voting_power_per_address: "1000",
  };

  beforeEach(() => {
    mockFetch = createMockFetch();
    context = {
      restUrl: "https://api.example.com",
      fetchFn: mockFetch,
    };
    api = createLicenseApi(context);
  });

  describe("getLicense", () => {
    it("fetches single license by id", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ license: sampleLicense }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getLicense("1");

      expect(result.license).toEqual(sampleLicense);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/ault/license/v1/license/1");
    });

    it("accepts numeric id", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ license: sampleLicense }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      await api.getLicense(123);

      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/license/v1/license/123",
      );
    });
  });

  describe("getLicenses", () => {
    it("fetches licenses without params", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ licenses: [sampleLicense] }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getLicenses();

      expect(result.licenses).toHaveLength(1);
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/ault/license/v1/licenses");
    });

    it("includes query params when provided", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ licenses: [] }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      await api.getLicenses({
        status: "LICENSE_STATUS_ACTIVE",
        pagination: { "pagination.limit": 10, "pagination.reverse": true },
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("status=LICENSE_STATUS_ACTIVE");
      expect(url).toContain("pagination.limit=10");
      expect(url).toContain("pagination.reverse=true");
    });

    it("omits undefined params", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ licenses: [] }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      await api.getLicenses({ status: "LICENSE_STATUS_ACTIVE" });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("status=LICENSE_STATUS_ACTIVE");
      expect(url).not.toContain("pagination.limit=");
    });

    it("accepts null pagination.next_key", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ licenses: [sampleLicense], pagination: { next_key: null, total: "1" } }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getLicenses();

      expect(result.licenses).toEqual([sampleLicense]);
      expect(result.pagination?.next_key).toBeUndefined();
    });
  });

  describe("getLicensesByOwner", () => {
    it("fetches licenses by owner", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({
          licenses: [sampleLicense],
          pagination: { next_key: "", total: "1" },
        }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getLicensesByOwner("ault1owner");

      expect(result.licenses).toHaveLength(1);
      expect(result.licenses[0]).toEqual(sampleLicense);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/license/v1/licenses_by_owner/ault1owner",
      );
    });

    it("includes pagination params", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ licenses: [], pagination: { next_key: "" } }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      await api.getLicensesByOwner("ault1owner", {
        pagination: { "pagination.limit": 25, "pagination.key": "xyz" },
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("pagination.limit=25");
      expect(url).toContain("pagination.key=xyz");
    });

    it("accepts null pagination.next_key", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ licenses: [sampleLicense], pagination: { next_key: null, total: "1" } }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getLicensesByOwner("ault1owner");

      expect(result.licenses).toEqual([sampleLicense]);
      expect(result.pagination?.next_key).toBeUndefined();
    });
  });

  describe("getBalance", () => {
    it("fetches balance for owner", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ balance: "5" }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getBalance("ault1owner");

      expect(result.balance).toBe("5");
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/license/v1/balance/ault1owner",
      );
    });
  });

  describe("getOwner", () => {
    it("fetches owner for license id", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ owner: "ault1owner" }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getOwner("1");

      expect(result.owner).toBe("ault1owner");
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/ault/license/v1/owner/1");
    });
  });

  describe("getTokenOfOwnerByIndex", () => {
    it("fetches token by owner and index", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ id: "42" }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getTokenOfOwnerByIndex("ault1owner", 0);

      expect(result.id).toBe("42");
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/license/v1/token/ault1owner/0",
      );
    });
  });

  describe("getOwnedBy", () => {
    it("fetches owned licenses", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({
          license_ids: ["1", "2", "3"],
          pagination: { next_key: "", total: "3" },
        }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getOwnedBy("ault1owner");

      expect(result.license_ids).toEqual(["1", "2", "3"]);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/license/v1/owned_by/ault1owner",
      );
    });

    it("includes pagination params", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ license_ids: [], pagination: { next_key: "" } }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      await api.getOwnedBy("ault1owner", {
        pagination: { "pagination.limit": 50, "pagination.key": "abc" },
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("pagination.limit=50");
      expect(url).toContain("pagination.key=abc");
    });

    it("accepts null pagination.next_key", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ license_ids: ["1"], pagination: { next_key: null, total: "1" } }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getOwnedBy("ault1owner");

      expect(result.license_ids).toEqual(["1"]);
      expect(result.pagination?.next_key).toBeUndefined();
    });
  });

  describe("getLicensesByOwnerAll", () => {
    it("paginates through all licenses", async () => {
      mockFetch = createMockFetch([
        mockJsonResponse({ license_ids: ["1", "2"], pagination: { next_key: "abc", total: "5" } }),
        mockJsonResponse({ license_ids: ["3", "4"], pagination: { next_key: "def", total: "5" } }),
        mockJsonResponse({ license_ids: ["5"], pagination: { next_key: "" } }),
      ]);
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getLicensesByOwnerAll("ault1owner");

      expect(result.license_ids).toEqual(["1", "2", "3", "4", "5"]);
      expect(result.total).toBe(5);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("handles empty result", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ license_ids: [], pagination: { next_key: "" } }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getLicensesByOwnerAll("ault1owner");

      expect(result.license_ids).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("throws when pagination cursor repeats", async () => {
      mockFetch = createMockFetch([
        mockJsonResponse({ license_ids: ["1"], pagination: { next_key: "abc" } }),
        mockJsonResponse({ license_ids: ["2"], pagination: { next_key: "abc" } }),
        mockJsonResponse({ license_ids: ["3"], pagination: { next_key: "" } }),
      ]);
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      await expect(api.getLicensesByOwnerAll("ault1owner")).rejects.toThrow("Pagination cursor repeated");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("treats null next_key as final page", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ license_ids: ["1", "2"], pagination: { next_key: null, total: "2" } }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getLicensesByOwnerAll("ault1owner");

      expect(result.license_ids).toEqual(["1", "2"]);
      expect(result.total).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("getTotalSupply", () => {
    it("fetches total supply", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ total_supply: "1000" }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getTotalSupply();

      expect(result.total_supply).toBe("1000");
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/license/v1/total_supply",
      );
    });
  });

  describe("isActive", () => {
    it("checks if license is active", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ is_active: true }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.isActive("1");

      expect(result.is_active).toBe(true);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/license/v1/is_active/1",
      );
    });
  });

  describe("getParams", () => {
    it("fetches module params", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ params: sampleLicenseParams }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getParams();

      expect(result.params.class_name).toBe("Ault License");
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/ault/license/v1/params");
    });
  });

  describe("getMinters", () => {
    it("fetches minters list", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ minters: ["ault1m1", "ault1m2"] }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getMinters();

      expect(result.minters).toEqual(["ault1m1", "ault1m2"]);
      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/ault/license/v1/minters");
    });

    it("includes pagination params", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ minters: [] }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      await api.getMinters({
        pagination: { "pagination.key": "abc", "pagination.limit": 10 },
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("pagination.key=abc");
      expect(url).toContain("pagination.limit=10");
    });

    it("accepts null pagination.next_key", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ minters: ["ault1m1"], pagination: { next_key: null, total: "1" } }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getMinters();

      expect(result.minters).toEqual(["ault1m1"]);
      expect(result.pagination?.next_key).toBeUndefined();
    });
  });

  describe("getTransferUnlockTime", () => {
    it("fetches transfer unlock time", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ unlock_time: "2024-12-01T00:00:00Z" }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getTransferUnlockTime();

      expect(result.unlock_time).toBe("2024-12-01T00:00:00Z");
    });
  });

  describe("getKycApprovers", () => {
    it("fetches KYC approvers list", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ approvers: ["ault1kyc1"] }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getKycApprovers();

      expect(result.approvers).toEqual(["ault1kyc1"]);
    });

    it("accepts null pagination.next_key", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ approvers: ["ault1kyc1"], pagination: { next_key: null, total: "1" } }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getKycApprovers();

      expect(result.approvers).toEqual(["ault1kyc1"]);
      expect(result.pagination?.next_key).toBeUndefined();
    });
  });

  describe("getApprovedMembers", () => {
    it("fetches approved members list", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ members: ["ault1member1"] }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getApprovedMembers();

      expect(result.members).toEqual(["ault1member1"]);
    });

    it("accepts null pagination.next_key", async () => {
      mockFetch = createMockFetch(
        mockJsonResponse({ members: ["ault1member1"], pagination: { next_key: null, total: "1" } }),
      );
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getApprovedMembers();

      expect(result.members).toEqual(["ault1member1"]);
      expect(result.pagination?.next_key).toBeUndefined();
    });
  });

  describe("isApprovedMember", () => {
    it("checks if address is approved member", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ is_approved: true }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.isApprovedMember("ault1test");

      expect(result.is_approved).toBe(true);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/license/v1/is_approved_member/ault1test",
      );
    });
  });

  describe("isKycApprover", () => {
    it("checks if address is KYC approver", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ is_approver: false }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.isKycApprover("ault1test");

      expect(result.is_approver).toBe(false);
    });
  });

  describe("getActiveLicenseCountAt", () => {
    it("fetches active license count at snapshot time", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ count: "5" }));
      context.fetchFn = mockFetch;
      api = createLicenseApi(context);

      const result = await api.getActiveLicenseCountAt("ault1owner", "2024-01-01T00:00:00Z");

      expect(result.count).toBe("5");
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("/ault/license/v1/active_license_count_at/ault1owner");
      expect(url).toContain("snapshot_time=");
    });
  });

  describe("URL normalization", () => {
    it("handles trailing slash in base URL", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ license: sampleLicense }));
      context = {
        restUrl: "https://api.example.com/",
        fetchFn: mockFetch,
      };
      api = createLicenseApi(context);

      await api.getLicense("1");

      expect(mockFetch.mock.calls[0][0]).toBe("https://api.example.com/ault/license/v1/license/1");
    });
  });
});
