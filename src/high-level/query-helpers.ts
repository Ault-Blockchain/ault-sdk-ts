import type { AultClient } from "../client";
import type { License } from "../rest/types";
import { normalizeAddress } from "./address-utils";
import type { LicenseAnalysis, LicenseDelegationStatus, ParallelQueryApi } from "./types";

const BATCH_SIZE = 50;

export function createParallelQueryApi(lowLevel: AultClient): ParallelQueryApi {
  async function getAllLicenseIds(owner: string): Promise<string[]> {
    const normalizedOwner = normalizeAddress(owner);
    const balance = await lowLevel.rest.license.getBalance(normalizedOwner);
    const total = parseInt(balance.balance, 10);

    if (total === 0) return [];

    const licenseIds: string[] = [];
    const indices = Array.from({ length: total }, (_, i) => i);

    for (let i = 0; i < indices.length; i += BATCH_SIZE) {
      const batch = indices.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (index) => {
          try {
            const result = await lowLevel.rest.license.getTokenOfOwnerByIndex(normalizedOwner, index);
            return result.id;
          } catch {
            return null;
          }
        }),
      );
      licenseIds.push(...results.filter((id): id is string => id !== null));
    }

    return licenseIds;
  }

  async function getLicenseDetailsParallel(licenseIds: string[]): Promise<Array<License | null>> {
    const results: Array<License | null> = [];

    for (let i = 0; i < licenseIds.length; i += BATCH_SIZE) {
      const batch = licenseIds.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (id) => {
          try {
            const result = await lowLevel.rest.license.getLicense(id);
            return result.license;
          } catch {
            return null;
          }
        }),
      );
      results.push(...batchResults);
    }

    return results;
  }

  async function getLicenseDelegationsParallel(licenseIds: string[]): Promise<LicenseDelegationStatus[]> {
    const results: LicenseDelegationStatus[] = [];

    for (let i = 0; i < licenseIds.length; i += BATCH_SIZE) {
      const batch = licenseIds.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (licenseId) => {
          try {
            const result = await lowLevel.rest.miner.getLicenseDelegation(licenseId);
            return {
              licenseId,
              isDelegated: result.is_delegated,
              operator: result.delegation?.operator ?? null,
            };
          } catch {
            return { licenseId, isDelegated: false, operator: null };
          }
        }),
      );
      results.push(...batchResults);
    }

    return results;
  }

  async function analyzeLicenses(owner: string): Promise<LicenseAnalysis> {
    const normalizedOwner = normalizeAddress(owner);
    const licenseIds = await getAllLicenseIds(normalizedOwner);
    const total = licenseIds.length;

    if (total === 0) {
      return { total: 0, active: 0, delegated: 0, licenses: [], delegations: [] };
    }

    const [licenses, delegations] = await Promise.all([
      getLicenseDetailsParallel(licenseIds),
      getLicenseDelegationsParallel(licenseIds),
    ]);

    const validLicenses = licenses.filter((license): license is License => license !== null);
    const active = validLicenses.filter((license) => license.status === "LICENSE_STATUS_ACTIVE").length;

    const delegatedList = delegations
      .filter((delegation) => delegation.isDelegated && delegation.operator)
      .map((delegation) => ({ licenseId: delegation.licenseId, operator: delegation.operator! }));

    return {
      total,
      active,
      delegated: delegatedList.length,
      licenses: validLicenses,
      delegations: delegatedList,
    };
  }

  return {
    getAllLicenseIds,
    getLicenseDetailsParallel,
    getLicenseDelegationsParallel,
    analyzeLicenses,
  };
}
