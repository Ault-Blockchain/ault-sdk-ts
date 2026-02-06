/**
 * E2E Test: License Query
 *
 * Tests license ownership and delegation status for a specific address.
 *
 * RUN:
 *   AULT_TEST_E2E_LIVE=1 pnpm test:e2e -- license-query
 *
 * Optional strict assertions:
 *   AULT_TEST_EXPECT_TOTAL_OWNED=464
 *   AULT_TEST_EXPECT_ACTIVE_COUNT=464
 *   AULT_TEST_EXPECT_DELEGATED_COUNT=459
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type Client } from "../../src/high-level-client";
import { getNetworkConfig, type NetworkConfig } from "../../src/core/network";

// Address being tested - this is a registered operator who owns licenses
const TARGET_ADDRESS = "ault1t08rcxffmgr4xdv39tg0fy5r0y7a6up459grhu";
const NETWORK_TYPE = (process.env.AULT_TEST_NETWORK || "testnet") as "testnet" | "localnet";
const RUN_LIVE_E2E =
  process.env.AULT_TEST_E2E_LIVE === "1" || process.env.AULT_TEST_E2E_LIVE === "true";

function parseOptionalCount(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${name} must be a non-negative integer, received: ${raw}`);
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer, received: ${raw}`);
  }
  return parsed;
}

const EXPECTED_TOTAL_OWNED = parseOptionalCount("AULT_TEST_EXPECT_TOTAL_OWNED");
const EXPECTED_ACTIVE_COUNT = parseOptionalCount("AULT_TEST_EXPECT_ACTIVE_COUNT");
const EXPECTED_DELEGATED_COUNT = parseOptionalCount("AULT_TEST_EXPECT_DELEGATED_COUNT");

describe.skipIf(!RUN_LIVE_E2E)("E2E: License Query", () => {
  let network: NetworkConfig;
  let client: Client;

  beforeAll(async () => {
    const chainId = NETWORK_TYPE === "localnet" ? "ault_20904-1" : "ault_10904-1";
    network = getNetworkConfig(chainId);

    // Create high-level client with a dummy signer (only using query methods)
    client = await createClient({
      network,
      signer: { type: "privateKey", key: "0x0000000000000000000000000000000000000000000000000000000000000001" },
    });

    console.log("\n========================================");
    console.log("License Query Test Configuration:");
    console.log(`  Network: ${network.name} (${network.chainId})`);
    console.log(`  REST URL: ${network.restUrl}`);
    console.log(`  Target Address: ${TARGET_ADDRESS}`);
    console.log("========================================\n");
  });

  it("should query license count owned by address", async () => {
    const balance = await client.license.getBalance(TARGET_ADDRESS);
    const count = parseInt(balance.balance, 10);

    console.log(`Licenses owned by ${TARGET_ADDRESS}: ${count}`);
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
    if (EXPECTED_TOTAL_OWNED !== undefined) {
      expect(count).toBe(EXPECTED_TOTAL_OWNED);
    }
  });

  it("should analyze ALL licenses owned, active, and delegated from address", async () => {
    console.log("\nAnalyzing all licenses in parallel...");
    const startTime = Date.now();

    // Use the new parallel helper to analyze all licenses
    const analysis = await client.analyzeLicenses(TARGET_ADDRESS);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Analysis completed in ${elapsed}s`);

    // Print results
    console.log("\n========================================");
    console.log("License Analysis Results:");
    console.log("========================================");
    console.log(`Total licenses owned:     ${analysis.total}`);
    console.log(`Active licenses:          ${analysis.active}`);
    console.log(`Delegated licenses:       ${analysis.delegated}`);
    console.log("----------------------------------------");

    if (analysis.delegations.length > 0) {
      // Group delegations by operator
      const byOperator = new Map<string, string[]>();
      for (const d of analysis.delegations) {
        const list = byOperator.get(d.operator) ?? [];
        list.push(d.licenseId);
        byOperator.set(d.operator, list);
      }

      console.log("\nDelegations by operator:");
      for (const [operator, licenseIds] of byOperator) {
        console.log(`  ${operator}: ${licenseIds.length} licenses`);
      }
    }

    console.log("========================================\n");

    const balance = await client.license.getBalance(TARGET_ADDRESS);
    expect(analysis.total).toBe(parseInt(balance.balance, 10));
    expect(analysis.active).toBeGreaterThanOrEqual(0);
    expect(analysis.active).toBeLessThanOrEqual(analysis.total);
    expect(analysis.delegated).toBeGreaterThanOrEqual(0);
    expect(analysis.delegated).toBeLessThanOrEqual(analysis.total);

    if (EXPECTED_TOTAL_OWNED !== undefined) {
      expect(analysis.total).toBe(EXPECTED_TOTAL_OWNED);
    }
    if (EXPECTED_ACTIVE_COUNT !== undefined) {
      expect(analysis.active).toBe(EXPECTED_ACTIVE_COUNT);
    }
    if (EXPECTED_DELEGATED_COUNT !== undefined) {
      expect(analysis.delegated).toBe(EXPECTED_DELEGATED_COUNT);
    }
  }, 300000); // 5 minute timeout

  it("should fetch first page of licenses with full details", async () => {
    const result = await client.license.getLicensesByOwner(TARGET_ADDRESS);

    console.log(`\nFetched ${result.licenses.length} licenses with details`);

    if (result.licenses.length > 0) {
      console.log("\nLicense Details (first 5):");
      result.licenses.slice(0, 5).forEach((license) => {
        console.log(`  License #${license.id}:`);
        console.log(`    Status: ${license.status}`);
        console.log(`    Class: ${license.class_name}`);
        console.log(`    Created: ${license.created_at}`);
      });
      if (result.licenses.length > 5) {
        console.log(`  ... and ${result.licenses.length - 5} more`);
      }
    }

    expect(Array.isArray(result.licenses)).toBe(true);
  });
});
