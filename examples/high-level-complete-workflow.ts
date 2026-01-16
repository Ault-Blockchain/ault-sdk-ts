/**
 * Example: Complete Workflow with High-Level Client
 *
 * This example demonstrates a complete workflow using the high-level client:
 * - Queries (licenses, miner data, exchange data)
 * - License operations (mint, transfer, KYC)
 * - Miner operations (delegate, operator registration)
 * - Exchange operations (place orders)
 *
 * SETUP:
 *   Set the PRIVATE_KEY environment variable (hex string, with or without 0x)
 *
 * Run with: PRIVATE_KEY=your_private_key npx tsx examples/high-level-complete-workflow.ts
 */

import { createClient, getNetworkConfig } from "../src";
import { privateKeyToAccount } from "viem/accounts";

async function main() {
  console.log("Ault SDK - Complete Workflow Example");
  console.log("=====================================\n");

  // Setup - get private key from environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log("No PRIVATE_KEY set. Running in demo mode.\n");
    showDemoUsage();
    return;
  }

  // Create high-level client
  const normalizedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(normalizedKey as `0x${string}`);

  const client = await createClient({
    network: getNetworkConfig("ault_10904-1"),
    signer: account,
    defaultMemo: "Ault SDK Example", // Set default memo for all transactions
  });

  console.log(`Connected as: ${client.address}`);
  console.log(`Network: ${client.network.name} (${client.network.chainId})\n`);

  // ============================================================================
  // PART 1: Queries (no signing required)
  // ============================================================================
  console.log("=== PART 1: Queries ===\n");

  // License queries
  console.log("1.1 License Module");
  console.log("-------------------");
  try {
    const params = await client.license.getParams();
    console.log(`  Supply cap: ${params.supply_cap ?? "unlimited"}`);

    const supply = await client.license.getTotalSupply();
    console.log(`  Total minted: ${supply.total_supply}`);

    const balance = await client.license.getBalance(client.address);
    console.log(`  Your balance: ${balance.balance} licenses`);

    const isApproved = await client.license.isApprovedMember(client.address);
    console.log(`  KYC approved: ${isApproved.is_approved_member}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // Miner queries
  console.log("\n1.2 Miner Module");
  console.log("-----------------");
  try {
    const epoch = await client.miner.getCurrentEpoch();
    console.log(`  Current epoch: ${epoch.epoch}`);
    console.log(`  Threshold: ${epoch.threshold}`);

    const emission = await client.miner.getEmissionInfo();
    console.log(`  Current year: ${emission.current_year}`);
    console.log(`  Emission per epoch: ${emission.current_emission_per_epoch}`);

    const operators = await client.miner.getOperators();
    console.log(`  Registered operators: ${operators.operators.length}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // Exchange queries
  console.log("\n1.3 Exchange Module");
  console.log("--------------------");
  try {
    const markets = await client.exchange.getMarkets();
    console.log(`  Available markets: ${markets.markets.length}`);

    if (markets.markets.length > 0) {
      const market = markets.markets[0];
      console.log(`  First market: ${market.base_denom}/${market.quote_denom}`);

      const orderBook = await client.exchange.getOrderBook(Number(market.id), {
        levelStart: 0,
        levelEnd: 5,
      });
      const book = orderBook.order_books[0];
      const levelCount = book ? book.buys.length + book.sells.length : 0;
      console.log(`  Order book levels: ${levelCount}`);
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // ============================================================================
  // PART 2: License Operations (requires minter/KYC approver role)
  // ============================================================================
  console.log("\n\n=== PART 2: License Operations ===\n");

  // Mint a license (requires minter role)
  console.log("2.1 Mint License");
  console.log("-----------------");
  try {
    const result = await client.mintLicense({
      to: client.address, // Mint to self
      uri: "https://example.com/license/metadata.json",
      reason: "SDK example mint",
    });
    console.log(`  ${result.success ? "SUCCESS" : "FAILED"}: ${result.txHash}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // Transfer a license
  console.log("\n2.2 Transfer License");
  console.log("---------------------");
  try {
    const result = await client.transferLicense({
      licenseId: 1,
      to: "0x0000000000000000000000000000000000000001", // EVM address works!
      reason: "SDK example transfer",
    });
    console.log(`  ${result.success ? "SUCCESS" : "FAILED"}: ${result.txHash}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // KYC operations (requires KYC approver role)
  console.log("\n2.3 KYC Operations");
  console.log("-------------------");
  try {
    // Approve multiple members at once
    const result = await client.batchApproveMembers({
      members: [
        "0x1111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222",
      ],
    });
    console.log(`  Batch approve: ${result.success ? "SUCCESS" : "FAILED"}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // ============================================================================
  // PART 3: Miner Operations
  // ============================================================================
  console.log("\n\n=== PART 3: Miner Operations ===\n");

  // Delegate licenses
  console.log("3.1 Delegate Licenses");
  console.log("----------------------");
  try {
    const result = await client.delegateLicenses({
      licenseIds: [1, 2, 3], // Numbers work!
      operator: "ault1operatoraddress00000000000000000000000",
    });
    console.log(`  ${result.success ? "SUCCESS" : "FAILED"}: ${result.txHash}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // Register as operator
  console.log("\n3.2 Register as Operator");
  console.log("--------------------------");
  try {
    const result = await client.registerOperator({
      commissionRate: 500, // 5% (in basis points)
      // commissionRecipient defaults to signer address if not specified
    });
    console.log(`  ${result.success ? "SUCCESS" : "FAILED"}: ${result.txHash}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // ============================================================================
  // PART 4: Exchange Operations
  // ============================================================================
  console.log("\n\n=== PART 4: Exchange Operations ===\n");

  // Place a limit order
  console.log("4.1 Place Limit Order");
  console.log("----------------------");
  try {
    const result = await client.placeLimitOrder({
      marketId: 1,
      isBuy: true,
      price: "1.5",
      quantity: "100",
      lifespanSeconds: 3600, // 1 hour in SECONDS (not nanoseconds!)
    });
    console.log(`  ${result.success ? "SUCCESS" : "FAILED"}: ${result.txHash}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // Place a market order
  console.log("\n4.2 Place Market Order");
  console.log("-----------------------");
  try {
    const result = await client.placeMarketOrder({
      marketId: 1,
      isBuy: false,
      quantity: "50",
    });
    console.log(`  ${result.success ? "SUCCESS" : "FAILED"}: ${result.txHash}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // Cancel all orders
  console.log("\n4.3 Cancel All Orders");
  console.log("-----------------------");
  try {
    const result = await client.cancelAllOrders({ marketId: 1 });
    console.log(`  ${result.success ? "SUCCESS" : "FAILED"}: ${result.txHash}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // ============================================================================
  // PART 5: Advanced - Access Low-Level Client
  // ============================================================================
  console.log("\n\n=== PART 5: Low-Level Access ===\n");
  console.log("For advanced use cases, access the underlying client:");
  console.log("  const lowLevel = client._lowLevel;");
  console.log("  const typedData = lowLevel.eip712.buildTypedData(context, msgs);");

  console.log("\n\nDone!");
}

function showDemoUsage() {
  console.log(`High-Level Client Complete API Reference
==========================================

Creating a Client
-----------------
import { createClient, getNetworkConfig } from "ault-sdk-ts";
import { privateKeyToAccount } from "viem/accounts";

const client = await createClient({
  network: getNetworkConfig("ault_10904-1"),
  signer: privateKeyToAccount("0x..."),
  // Optional:
  defaultGasLimit: "300000",
  defaultMemo: "My App",
});

Query Methods (no signing)
--------------------------
// License
await client.license.getLicense("1");
await client.license.getOwnedBy(client.address);
await client.license.getBalance(client.address);
await client.license.isApprovedMember(address);

// Miner
await client.miner.getCurrentEpoch();
await client.miner.getOperators();
await client.miner.getLicenseDelegation("123");
await client.miner.getEmissionInfo();

// Exchange
await client.exchange.getMarkets();
await client.exchange.getOrderBook(1);
await client.exchange.getOrders({ orderer: client.address });

License Transactions
--------------------
await client.mintLicense({ to, uri, reason? });
await client.batchMintLicenses({ recipients: [{ to, uri }], reason? });
await client.transferLicense({ licenseId, to, reason? });
await client.burnLicense({ licenseId, reason? });
await client.revokeLicense({ licenseId, reason? });
await client.setTokenUri({ licenseId, uri });
await client.approveMember({ member });
await client.batchApproveMembers({ members });
await client.revokeMember({ member });
await client.batchRevokeMembers({ members });
await client.setKycApprovers({ add?, remove? });
await client.setMinters({ add?, remove? });

Miner Transactions
------------------
await client.delegateLicenses({ licenseIds, operator });
await client.undelegateLicenses({ licenseIds });
await client.redelegateLicenses({ licenseIds, newOperator });
await client.setVrfKey({ vrfPubkey, possessionProof, nonce });
await client.submitWork({ licenseId, epoch, y, proof, nonce });
await client.batchSubmitWork({ submissions });
await client.registerOperator({ commissionRate, commissionRecipient? });
await client.unregisterOperator();
await client.updateOperatorInfo({ newCommissionRate, newCommissionRecipient? });

Exchange Transactions
---------------------
await client.placeLimitOrder({
  marketId,
  isBuy,
  price,
  quantity,
  lifespanSeconds,  // In SECONDS (auto-converted to nanoseconds)
});
await client.placeMarketOrder({ marketId, isBuy, quantity });
await client.cancelOrder({ orderId });
await client.cancelAllOrders({ marketId });
await client.createMarket({ baseDenom, quoteDenom });

Transaction Options
-------------------
All transactions accept optional gasLimit and memo:

await client.mintLicense({
  to: "0x...",
  uri: "https://...",
  gasLimit: "300000",
  memo: "Custom memo",
});

Transaction Result
------------------
interface TxResult {
  txHash: string;
  code: number;
  rawLog?: string;
  success: boolean;  // true if code === 0
}

Signer Types
------------
// viem account (auto-detected)
signer: privateKeyToAccount("0x...")

// viem WalletClient (auto-detected)
signer: walletClient

// ethers (explicit)
signer: { type: "ethers", signer: ethersSigner }

// MetaMask/EIP-1193 (explicit)
signer: { type: "eip1193", provider: window.ethereum, address: "0x..." }

// Privy (explicit)
signer: { type: "privy", signTypedData, address? }

// Private key (explicit)
signer: { type: "privateKey", key: "0x..." }
`);
}

main().catch(console.error);
