/**
 * Example: Delegate Mining Licenses
 *
 * This example demonstrates how to delegate mining licenses to an operator
 * using the Ault SDK.
 *
 * SETUP:
 *   Set the PRIVATE_KEY environment variable (hex string, with or without 0x)
 *
 * Run with: PRIVATE_KEY=your_private_key npx tsx examples/delegate-mining.ts
 */

import {
  createAultClient,
  getNetworkConfig,
  signAndBroadcastEip712,
  createPrivateKeySigner,
  evmToAult,
  msg,
} from "../src";
import { privateKeyToAccount } from "viem/accounts";

// Replace with actual operator address for real delegation
const OPERATOR_ADDRESS = "ault1operatoraddresshere00000000000000000000";
const LICENSE_IDS = [1n, 2n, 3n];

async function main() {
  console.log("Ault SDK - Delegate Mining Example");
  console.log("===================================\n");

  // Setup - get private key from environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log("No PRIVATE_KEY set. Running in demo mode (no actual signing).\n");
    showDemoUsage();
    return;
  }

  // Create signer from private key
  const normalizedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(normalizedKey as `0x${string}`);
  const signer = createPrivateKeySigner(privateKey);
  const signerAddress = evmToAult(account.address);

  console.log(`Signer address: ${signerAddress}`);
  console.log(`EVM address: ${account.address}\n`);

  // Create client
  const network = getNetworkConfig("ault_10904-1");
  const client = createAultClient({ network, signer, signerAddress });

  // Check owned licenses
  console.log("1. Checking owned licenses...");
  console.log("-----------------------------");
  try {
    const owned = await client.rest.license.getOwnedBy(signerAddress, { limit: 10 });
    if (owned.license_ids.length === 0) {
      console.log("  No licenses owned. Cannot delegate.");
      return;
    }
    console.log(`  Owned license IDs: ${owned.license_ids.join(", ")}`);
    console.log(`  Total owned: ${owned.total}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // Get list of registered operators
  console.log("\n2. Finding available operators...");
  console.log("----------------------------------");
  try {
    const operators = await client.rest.miner.getOperators();
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

  // Delegate mining licenses
  console.log("\n3. Delegating licenses...");
  console.log("--------------------------");

  const delegateMsg = msg.miner.delegateMining({
    owner: signerAddress,
    operator: OPERATOR_ADDRESS,
    licenseIds: LICENSE_IDS,
  });

  console.log(`  Delegating licenses ${LICENSE_IDS.join(", ")} to ${OPERATOR_ADDRESS}`);

  try {
    const result = await signAndBroadcastEip712({
      network,
      signer,
      signerAddress,
      msgs: [delegateMsg],
      memo: "Delegate mining via Ault SDK",
    });

    if (result.code === 0) {
      console.log(`\n  SUCCESS! TX Hash: ${result.txHash}`);
    } else {
      console.log(`\n  FAILED: ${result.rawLog}`);
    }
  } catch (error) {
    console.log(`\n  Error: ${(error as Error).message}`);
  }
}

function showDemoUsage() {
  console.log(`Usage Examples
==============

1. Delegate mining licenses to an operator:
   ------------------------------------------
   import { signAndBroadcastEip712, createPrivateKeySigner, msg } from "ault-sdk-ts";

   const signer = createPrivateKeySigner(privateKey);

   const result = await signAndBroadcastEip712({
     network,
     signer,
     signerAddress: "ault1...",
     msgs: [
       msg.miner.delegateMining({
         owner: "ault1...",
         operator: "ault1operator...",
         licenseIds: [1n, 2n, 3n],
       }),
     ],
   });

   console.log("TX Hash:", result.txHash);

2. Redelegate to a new operator:
   ------------------------------
   const result = await signAndBroadcastEip712({
     network,
     signer,
     signerAddress: "ault1...",
     msgs: [
       msg.miner.redelegateMining({
         owner: "ault1...",
         newOperator: "ault1newoperator...",
         licenseIds: [1n, 2n],
       }),
     ],
   });

3. Cancel mining delegation:
   --------------------------
   const result = await signAndBroadcastEip712({
     network,
     signer,
     signerAddress: "ault1...",
     msgs: [
       msg.miner.cancelMiningDelegation({
         owner: "ault1...",
         licenseIds: [1n],
       }),
     ],
   });

4. Using with MetaMask (browser):
   -------------------------------
   import { createEip1193Signer } from "ault-sdk-ts";

   const signer = createEip1193Signer({
     provider: window.ethereum,
     address: evmAddress,
   });

5. Using with viem WalletClient:
   ------------------------------
   import { createViemSigner } from "ault-sdk-ts";

   const signer = createViemSigner(walletClient);

6. Using with ethers.js:
   ----------------------
   import { createEthersSigner } from "ault-sdk-ts";

   const signer = createEthersSigner(ethersSigner);
`);
}

main().catch(console.error);
