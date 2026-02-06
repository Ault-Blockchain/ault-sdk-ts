/**
 * Example: Analyze Licenses (Parallel)
 *
 * This example demonstrates how to use the parallel query helpers to efficiently
 * analyze all licenses owned by an address, including active and delegation status.
 *
 * The parallel helpers fetch data in batches of 50 concurrent requests, making it
 * much faster than sequential queries. For an address with 464 licenses, this
 * completes in ~15-30 seconds instead of several minutes.
 *
 * Run with: npx tsx examples/high-level/analyze-licenses.ts
 *
 * Or with a custom address:
 *   ADDRESS=ault1youraddress... npx tsx examples/high-level/analyze-licenses.ts
 */

import { createClient } from "../../src/high-level-client";
import { getNetworkConfig } from "../../src/core/network";

// Address to analyze - can be overridden with ADDRESS env var
const TARGET_ADDRESS = process.env.ADDRESS || "ault1t08rcxffmgr4xdv39tg0fy5r0y7a6up459grhu";

async function main() {
  console.log("Ault SDK - License Analysis Example");
  console.log("====================================\n");

  // Create client (using dummy signer since we only need query methods)
  const client = await createClient({
    network: getNetworkConfig("ault_10904-1"),
    signer: { type: "privateKey", key: "0x0000000000000000000000000000000000000000000000000000000000000001" },
  });

  console.log(`Analyzing licenses for: ${TARGET_ADDRESS}`);
  console.log("This may take 15-30 seconds for addresses with many licenses...\n");

  const startTime = Date.now();

  // Use the parallel analyzer to get complete license analysis
  const analysis = await client.analyzeLicenses(TARGET_ADDRESS);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Print summary
  console.log("========================================");
  console.log("License Analysis Results");
  console.log("========================================");
  console.log(`Total licenses owned:  ${analysis.total}`);
  console.log(`Active licenses:       ${analysis.active}`);
  console.log(`Delegated licenses:    ${analysis.delegated}`);
  console.log(`Not delegated:         ${analysis.total - analysis.delegated}`);
  console.log(`Analysis time:         ${elapsed}s`);
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
      console.log(`  ${operator}`);
      console.log(`    Count: ${licenseIds.length} licenses`);
      if (licenseIds.length <= 10) {
        console.log(`    IDs: ${licenseIds.join(", ")}`);
      } else {
        console.log(`    IDs: ${licenseIds.slice(0, 10).join(", ")}... and ${licenseIds.length - 10} more`);
      }
    }
  }

  // Show some license details
  if (analysis.licenses.length > 0) {
    console.log("\nSample license details (first 5):");
    for (const license of analysis.licenses.slice(0, 5)) {
      console.log(`  License #${license.id}:`);
      console.log(`    Status: ${license.status}`);
      console.log(`    Class: ${license.class_name}`);
      console.log(`    Created: ${license.created_at}`);
    }
    if (analysis.licenses.length > 5) {
      console.log(`  ... and ${analysis.licenses.length - 5} more licenses`);
    }
  }

  console.log("\n========================================");
}

main().catch(console.error);
