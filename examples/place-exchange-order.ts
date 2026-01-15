/**
 * Example: Place Exchange Orders with Signing
 *
 * This example demonstrates how to use the Ault SDK to place orders on the DEX.
 * It shows the complete flow from building messages to signing and broadcasting.
 *
 * SETUP:
 *   Set the PRIVATE_KEY environment variable (hex string, with or without 0x)
 *
 * Run with: PRIVATE_KEY=your_private_key npx tsx examples/place-exchange-order.ts
 */

import {
  createAultClient,
  getNetworkConfig,
  signAndBroadcastEip712,
  createPrivateKeySigner,
  evmToAult,
  msg,
} from '../src';
import { privateKeyToAccount } from 'viem/accounts';

const MARKET_ID = 1n;

async function main() {
  console.log('Ault SDK - Exchange Order Example');
  console.log('==================================\n');

  // Setup - get private key from environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.log('No PRIVATE_KEY set. Running in demo mode (no actual signing).\n');
    showDemoUsage();
    return;
  }

  // Create signer from private key
  const normalizedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(normalizedKey as `0x${string}`);
  const signer = createPrivateKeySigner(privateKey);
  const signerAddress = evmToAult(account.address);

  console.log(`Signer address: ${signerAddress}`);
  console.log(`EVM address: ${account.address}\n`);

  // Create client
  const network = getNetworkConfig('ault_10904-1');
  const client = createAultClient({ network, signer, signerAddress });

  // Check market exists
  console.log('1. Checking market info...');
  console.log('---------------------------');
  try {
    const marketInfo = await client.rest.exchange.getMarket(Number(MARKET_ID));
    console.log(`Market #${MARKET_ID}:`);
    console.log(`  Base: ${marketInfo.market.base_denom}`);
    console.log(`  Quote: ${marketInfo.market.quote_denom}`);
    console.log(`  Maker fee: ${marketInfo.market.maker_fee_rate}`);
    console.log(`  Taker fee: ${marketInfo.market.taker_fee_rate}`);
  } catch {
    console.log(`  Market #${MARKET_ID} not found. Using demo values.`);
  }

  // Example 1: Place a limit buy order
  console.log('\n2. Placing a Limit Buy Order');
  console.log('-----------------------------');

  // Order parameters
  const price = '1.5'; // Price per unit in quote denom
  const quantity = '100'; // Number of units to buy
  const lifespanNanos = BigInt(3600) * BigInt(1_000_000_000); // 1 hour in nanoseconds

  const limitOrderMsg = msg.exchange.placeLimitOrder({
    sender: signerAddress,
    market_id: MARKET_ID,
    is_buy: true,
    price,
    quantity,
    lifespan: lifespanNanos,
  });

  console.log(`  Order details:`);
  console.log(`    Side: BUY`);
  console.log(`    Price: ${price}`);
  console.log(`    Quantity: ${quantity}`);
  console.log(`    Lifespan: 1 hour`);

  try {
    const result = await signAndBroadcastEip712({
      network,
      signer,
      signerAddress,
      msgs: [limitOrderMsg],
      memo: 'Limit order via Ault SDK',
    });

    if (result.code === 0) {
      console.log(`\n  SUCCESS! TX Hash: ${result.txHash}`);
    } else {
      console.log(`\n  FAILED: ${result.rawLog}`);
    }
  } catch (error) {
    console.log(`\n  Error: ${(error as Error).message}`);
  }

  // Example 2: Cancel all orders in market
  console.log('\n3. Cancel All Orders in Market');
  console.log('-------------------------------');

  const cancelMsg = msg.exchange.cancelAllOrders({
    sender: signerAddress,
    market_id: MARKET_ID,
  });

  console.log(`  Cancelling all orders in market #${MARKET_ID}...`);

  try {
    const result = await signAndBroadcastEip712({
      network,
      signer,
      signerAddress,
      msgs: [cancelMsg],
      memo: 'Cancel all orders via Ault SDK',
    });

    if (result.code === 0) {
      console.log(`  SUCCESS! TX Hash: ${result.txHash}`);
    } else {
      console.log(`  FAILED: ${result.rawLog}`);
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }
}

function showDemoUsage() {
  console.log(`Usage Examples
==============

1. Place a limit order:
   ----------------------
   import { signAndBroadcastEip712, createPrivateKeySigner, msg } from "ault-sdk-ts";

   const signer = createPrivateKeySigner(privateKey);

   const result = await signAndBroadcastEip712({
     network,
     signer,
     signerAddress: "ault1...",
     msgs: [
       msg.exchange.placeLimitOrder({
         sender: "ault1...",
         market_id: 1n,
         is_buy: true,
         price: "1.5",
         quantity: "100",
         lifespan: 3600n * 1_000_000_000n, // 1 hour in nanoseconds
       }),
     ],
   });

   console.log("TX Hash:", result.txHash);

2. Place a market order:
   -----------------------
   const result = await signAndBroadcastEip712({
     network,
     signer,
     signerAddress: "ault1...",
     msgs: [
       msg.exchange.placeMarketOrder({
         sender: "ault1...",
         market_id: 1n,
         is_buy: false,
         quantity: "50",
       }),
     ],
   });

3. Cancel all orders in a market:
   --------------------------------
   const result = await signAndBroadcastEip712({
     network,
     signer,
     signerAddress: "ault1...",
     msgs: [
       msg.exchange.cancelAllOrders({
         sender: "ault1...",
         market_id: 1n,
       }),
     ],
   });

4. Using with MetaMask (browser):
   -------------------------------
   import { createEip1193Signer, signAndBroadcastEip712 } from "ault-sdk-ts";

   const signer = createEip1193Signer({
     provider: window.ethereum,
     address: evmAddress,
   });

   const result = await signAndBroadcastEip712({
     network,
     signer,
     msgs: [...],
   });

5. Using with viem WalletClient:
   ------------------------------
   import { createViemSigner, signAndBroadcastEip712 } from "ault-sdk-ts";

   const signer = createViemSigner(walletClient);

   const result = await signAndBroadcastEip712({
     network,
     signer,
     msgs: [...],
   });

NOTE: MsgCancelOrder (single order cancel) is NOT yet EIP-712 compatible.
      Use MsgCancelAllOrders to cancel all orders in a market.
`);
}

main().catch(console.error);
