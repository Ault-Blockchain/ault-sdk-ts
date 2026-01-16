/**
 * Example: Exchange Orders with High-Level Client
 *
 * This example demonstrates how to place and cancel orders on the DEX
 * using the simplified high-level createClient API.
 *
 * Key improvements over the low-level API:
 * - No message building required
 * - Lifespan in SECONDS (auto-converted to nanoseconds)
 * - Numbers work for market IDs (no bigints needed)
 *
 * SETUP:
 *   Set the PRIVATE_KEY environment variable (hex string, with or without 0x)
 *
 * Run with: PRIVATE_KEY=your_private_key npx tsx examples/high-level-exchange-orders.ts
 */

import { createClient, getNetworkConfig } from "../src";
import { privateKeyToAccount } from "viem/accounts";

const MARKET_ID = 1;

async function main() {
  console.log("Ault SDK - High-Level Exchange Orders Example");
  console.log("=============================================\n");

  // Setup - get private key from environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log("No PRIVATE_KEY set. Running in demo mode (no actual signing).\n");
    showDemoUsage();
    return;
  }

  // Create high-level client
  const normalizedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(normalizedKey as `0x${string}`);

  const client = await createClient({
    network: getNetworkConfig("ault_10904-1"),
    signer: account,
  });

  console.log(`Signer address: ${client.address}\n`);

  // Step 1: Check market info
  console.log("1. Checking market info...");
  console.log("---------------------------");
  try {
    const marketInfo = await client.exchange.getMarket(MARKET_ID);
    console.log(`Market #${MARKET_ID}:`);
    console.log(`  Base: ${marketInfo.market.base_denom}`);
    console.log(`  Quote: ${marketInfo.market.quote_denom}`);
    console.log(`  Maker fee: ${marketInfo.market.maker_fee_rate}`);
    console.log(`  Taker fee: ${marketInfo.market.taker_fee_rate}`);
  } catch {
    console.log(`  Market #${MARKET_ID} not found. Using demo values.`);
  }

  // Step 2: Place a limit order - SO MUCH SIMPLER!
  console.log("\n2. Placing a Limit Buy Order");
  console.log("-----------------------------");
  console.log("  Order details:");
  console.log("    Side: BUY");
  console.log("    Price: 1.5");
  console.log("    Quantity: 100");
  console.log("    Lifespan: 1 hour (3600 seconds)");

  try {
    // Note: lifespanSeconds is in SECONDS, not nanoseconds!
    // The client converts it automatically
    const result = await client.placeLimitOrder({
      marketId: MARKET_ID, // Numbers work! No bigints needed
      isBuy: true,
      price: "1.5",
      quantity: "100",
      lifespanSeconds: 3600, // 1 hour in SECONDS (not nanoseconds!)
      memo: "Limit order via high-level client",
    });

    if (result.success) {
      console.log(`\n  SUCCESS! TX Hash: ${result.txHash}`);
    } else {
      console.log(`\n  FAILED (code ${result.code}): ${result.rawLog}`);
    }
  } catch (error) {
    console.log(`\n  Error: ${(error as Error).message}`);
  }

  // Step 3: Place a market order
  console.log("\n3. Placing a Market Sell Order");
  console.log("-------------------------------");
  console.log("  Order details:");
  console.log("    Side: SELL");
  console.log("    Quantity: 50");

  try {
    const result = await client.placeMarketOrder({
      marketId: MARKET_ID,
      isBuy: false,
      quantity: "50",
    });

    if (result.success) {
      console.log(`\n  SUCCESS! TX Hash: ${result.txHash}`);
    } else {
      console.log(`\n  FAILED: ${result.rawLog}`);
    }
  } catch (error) {
    console.log(`\n  Error: ${(error as Error).message}`);
  }

  // Step 4: View current orders
  console.log("\n4. Checking current orders...");
  console.log("------------------------------");
  try {
    const orders = await client.exchange.getOrders({ orderer: client.address });
    if (orders.orders.length === 0) {
      console.log("  No open orders");
    } else {
      console.log(`  Found ${orders.orders.length} orders:`);
      orders.orders.slice(0, 5).forEach((order) => {
        console.log(`    - Order ${order.id}: ${order.is_buy ? "BUY" : "SELL"} ${order.quantity} @ ${order.price}`);
      });
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // Step 5: Cancel all orders in market
  console.log("\n5. Cancelling all orders in market...");
  console.log("--------------------------------------");

  try {
    const result = await client.cancelAllOrders({
      marketId: MARKET_ID,
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
  console.log(`High-Level Exchange API Examples
=================================

1. Create a client:
   -----------------
   import { createClient, getNetworkConfig } from "ault-sdk-ts";
   import { privateKeyToAccount } from "viem/accounts";

   const account = privateKeyToAccount("0x...");
   const client = await createClient({
     network: getNetworkConfig("ault_10904-1"),
     signer: account,
   });

2. Place a limit order:
   ----------------------
   const result = await client.placeLimitOrder({
     marketId: 1,              // Numbers work!
     isBuy: true,
     price: "1.5",
     quantity: "100",
     lifespanSeconds: 3600,    // SECONDS! (not nanoseconds)
   });

3. Place a market order:
   -----------------------
   await client.placeMarketOrder({
     marketId: 1,
     isBuy: false,
     quantity: "50",
   });

4. Cancel all orders in a market:
   --------------------------------
   await client.cancelAllOrders({ marketId: 1 });

5. Cancel a specific order:
   --------------------------
   await client.cancelOrder({ orderId: "base64OrderId..." });

6. Query orders:
   ---------------
   const orders = await client.exchange.getOrders({ orderer: client.address });
   const orderBook = await client.exchange.getOrderBook(1);

Compare: Low-Level vs High-Level
================================

LOW-LEVEL (old way):
  const lifespanNanos = BigInt(3600) * BigInt(1_000_000_000);
  const orderMsg = msg.exchange.placeLimitOrder({
    sender: signerAddress,
    market_id: 1n,
    is_buy: true,
    price: "1.5",
    quantity: "100",
    lifespan: lifespanNanos,
  });
  await signAndBroadcastEip712({
    network,
    signer,
    signerAddress,
    msgs: [orderMsg],
  });

HIGH-LEVEL (new way):
  await client.placeLimitOrder({
    marketId: 1,
    isBuy: true,
    price: "1.5",
    quantity: "100",
    lifespanSeconds: 3600,
  });

Key improvements:
- No message building
- No separate signAndBroadcast call
- Numbers instead of bigints for IDs
- Lifespan in seconds (intuitive) instead of nanoseconds
- result.success boolean for easy checking
`);
}

main().catch(console.error);
