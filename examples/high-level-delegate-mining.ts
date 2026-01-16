/**
 * Example: Delegate Mining with High-Level Client
 *
 * This example demonstrates how to delegate mining licenses using the
 * simplified high-level createClient API. Compare with delegate-mining.ts
 * to see how much simpler the code is!
 *
 * SETUP:
 *   Set the PRIVATE_KEY environment variable (hex string, with or without 0x)
 *
 * Run with: PRIVATE_KEY=your_private_key npx tsx examples/high-level-delegate-mining.ts
 */

import { createClient, getNetworkConfig } from "../src";
import { privateKeyToAccount } from "viem/accounts";

// Replace with actual operator address for real delegation
const OPERATOR_ADDRESS = "ault1operatoraddresshere00000000000000000000";

async function main() {
  console.log("Ault SDK - High-Level Delegate Mining Example");
  console.log("==============================================\n");

  // Setup - get private key from environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log("No PRIVATE_KEY set. Running in demo mode (no actual signing).\n");
    showDemoUsage();
    return;
  }

  // Create high-level client with viem account
  // The client auto-detects the signer type and resolves the address!
  const normalizedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(normalizedKey as `0x${string}`);

  const client = await createClient({
    network: getNetworkConfig("ault_10904-1"),
    signer: account, // Just pass the account directly - no adapter needed!
  });

  console.log(`Signer address: ${client.address}\n`);

  // Step 1: Check owned licenses
  console.log("1. Checking owned licenses...");
  console.log("-----------------------------");
  try {
    const owned = await client.license.getOwnedBy(client.address, { limit: 10 });
    if (owned.license_ids.length === 0) {
      console.log("  No licenses owned. Cannot delegate.");
      return;
    }
    console.log(`  Owned license IDs: ${owned.license_ids.join(", ")}`);
    console.log(`  Total owned: ${owned.total}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // Step 2: Get list of operators
  console.log("\n2. Finding available operators...");
  console.log("----------------------------------");
  try {
    const operators = await client.miner.getOperators();
    if (operators.operators.length === 0) {
      console.log("  No operators registered.");
    } else {
      console.log("  Available operators:");
      operators.operators.forEach((op) => {
        console.log(`    - ${op.operator} (${op.commission_rate}% commission)`);
      });
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // Step 3: Delegate licenses - SO SIMPLE!
  console.log("\n3. Delegating licenses...");
  console.log("--------------------------");

  // With the high-level client, you just call the method directly!
  // No need to build messages, no need to pass signer/signerAddress
  const licenseIds = [1, 2, 3]; // Can use numbers, strings, or bigints

  console.log(`  Delegating licenses ${licenseIds.join(", ")} to ${OPERATOR_ADDRESS}`);

  try {
    const result = await client.delegateLicenses({
      licenseIds, // Numbers work! No need for bigints
      operator: OPERATOR_ADDRESS,
      memo: "Delegated via high-level client",
    });

    if (result.success) {
      console.log(`\n  SUCCESS! TX Hash: ${result.txHash}`);
    } else {
      console.log(`\n  FAILED (code ${result.code}): ${result.rawLog}`);
    }
  } catch (error) {
    console.log(`\n  Error: ${(error as Error).message}`);
  }

  // Step 4: Redelegate to a new operator
  console.log("\n4. Redelegating to a new operator...");
  console.log("-------------------------------------");
  try {
    const result = await client.redelegateLicenses({
      licenseIds: [1],
      newOperator: "0x1234567890123456789012345678901234567890", // EVM format works!
    });

    if (result.success) {
      console.log(`  SUCCESS! TX Hash: ${result.txHash}`);
    } else {
      console.log(`  FAILED: ${result.rawLog}`);
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // Step 5: Undelegate
  console.log("\n5. Undelegating licenses...");
  console.log("----------------------------");
  try {
    const result = await client.undelegateLicenses({
      licenseIds: [2, 3],
    });

    if (result.success) {
      console.log(`  SUCCESS! TX Hash: ${result.txHash}`);
    } else {
      console.log(`  FAILED: ${result.rawLog}`);
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }
}

function showDemoUsage() {
  console.log(`High-Level Client Usage Examples
=================================

The high-level client makes transactions SO much simpler!

1. Create a client (auto-detects signer type):
   --------------------------------------------
   import { createClient, getNetworkConfig } from "ault-sdk-ts";
   import { privateKeyToAccount } from "viem/accounts";

   const account = privateKeyToAccount("0x...");
   const client = await createClient({
     network: getNetworkConfig("ault_10904-1"),
     signer: account,
   });

2. Delegate mining licenses:
   --------------------------
   const result = await client.delegateLicenses({
     licenseIds: [1, 2, 3],      // Numbers work! No bigints needed
     operator: "0xOperator...",   // EVM addresses work! Auto-converted
   });

   if (result.success) {
     console.log("TX Hash:", result.txHash);
   }

3. Redelegate to a new operator:
   ------------------------------
   await client.redelegateLicenses({
     licenseIds: [1, 2],
     newOperator: "ault1newoperator...",
   });

4. Undelegate licenses:
   ----------------------
   await client.undelegateLicenses({
     licenseIds: [1, 2, 3],
   });

5. Query data (same API as low-level client):
   -------------------------------------------
   const licenses = await client.license.getOwnedBy(client.address);
   const operators = await client.miner.getOperators();
   const epoch = await client.miner.getCurrentEpoch();

Compare with the low-level API:
===============================
OLD WAY (low-level):
  const delegateMsg = msg.miner.delegate({
    owner: signerAddress,
    operator: OPERATOR_ADDRESS,
    license_ids: [1n, 2n, 3n],  // Must use bigints!
  });
  await signAndBroadcastEip712({
    network,
    signer,
    signerAddress,
    msgs: [delegateMsg],
  });

NEW WAY (high-level):
  await client.delegateLicenses({
    licenseIds: [1, 2, 3],
    operator: OPERATOR_ADDRESS,
  });
`);
}

main().catch(console.error);
