/**
 * Example: Query Exchange Module Information
 *
 * This example demonstrates how to use the Exchange REST API to query
 * market and order data from the Ault blockchain DEX.
 *
 * Run with: npx tsx examples/query-exchange.ts
 */

import { createAultClient, getNetworkConfig } from '../src';

// Replace with actual values to test
const TRADER_ADDRESS = 'ault1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnrql8a';
const MARKET_ID = 1;

async function main() {
  // Create client connected to testnet
  const client = createAultClient({
    network: getNetworkConfig('ault_10904-1'),
  });

  console.log('Ault SDK - Exchange Query Example');
  console.log('==================================\n');

  // 1. Get exchange module parameters
  console.log('1. Exchange Module Parameters');
  console.log('-----------------------------');
  try {
    const params = await client.rest.exchange.getParams();
    console.log(`  Market creation fee: ${params.market_creation_fee?.amount} ${params.market_creation_fee?.denom}`);
    console.log(`  Default maker fee: ${params.default_maker_fee_rate}`);
    console.log(`  Default taker fee: ${params.default_taker_fee_rate}`);
    console.log(`  Max order lifespan: ${params.max_order_lifespan}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 2. List all markets
  console.log('\n2. Available Markets');
  console.log('--------------------');
  try {
    const markets = await client.rest.exchange.getMarkets();
    if (markets.markets.length === 0) {
      console.log('  No markets available');
    } else {
      markets.markets.forEach((market) => {
        console.log(`  Market #${market.id}:`);
        console.log(`    Pair: ${market.base_denom} / ${market.quote_denom}`);
        console.log(`    Maker fee: ${market.maker_fee_rate}`);
        console.log(`    Taker fee: ${market.taker_fee_rate}`);
      });
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 3. Get a specific market
  console.log(`\n3. Market #${MARKET_ID} Details`);
  console.log('------------------------');
  try {
    const market = await client.rest.exchange.getMarket(MARKET_ID);
    console.log(`  ID: ${market.market.id}`);
    console.log(`  Base denom: ${market.market.base_denom}`);
    console.log(`  Quote denom: ${market.market.quote_denom}`);
    console.log(`  Maker fee rate: ${market.market.maker_fee_rate}`);
    console.log(`  Taker fee rate: ${market.market.taker_fee_rate}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 4. Get order book for market
  console.log(`\n4. Order Book for Market #${MARKET_ID}`);
  console.log('-------------------------------');
  try {
    const orderBook = await client.rest.exchange.getOrderBook(MARKET_ID, {
      level_start: 0,
      level_end: 5,
    });

    console.log(`  Price interval: ${orderBook.order_book.price_interval}`);

    console.log('\n  Asks (Sells):');
    if (orderBook.order_book.sells.length === 0) {
      console.log('    No sell orders');
    } else {
      orderBook.order_book.sells.forEach((level) => {
        console.log(`    Price: ${level.price} | Quantity: ${level.quantity}`);
      });
    }

    console.log('\n  Bids (Buys):');
    if (orderBook.order_book.buys.length === 0) {
      console.log('    No buy orders');
    } else {
      orderBook.order_book.buys.forEach((level) => {
        console.log(`    Price: ${level.price} | Quantity: ${level.quantity}`);
      });
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 5. Get orders for a specific trader
  console.log(`\n5. Orders for ${TRADER_ADDRESS}`);
  console.log('------------------------------------------------');
  try {
    const orders = await client.rest.exchange.getOrders({
      orderer: TRADER_ADDRESS,
    });
    if (orders.orders.length === 0) {
      console.log('  No active orders');
    } else {
      orders.orders.forEach((order) => {
        console.log(`  Order #${order.id}:`);
        console.log(`    Market: ${order.market_id}`);
        console.log(`    Side: ${order.is_buy ? 'BUY' : 'SELL'}`);
        console.log(`    Price: ${order.price}`);
        console.log(`    Quantity: ${order.quantity}`);
        console.log(`    Open quantity: ${order.open_quantity}`);
        console.log(`    Deadline: ${order.deadline}`);
      });
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 6. Get all orders for a market
  console.log(`\n6. All Orders in Market #${MARKET_ID}`);
  console.log('------------------------------');
  try {
    const orders = await client.rest.exchange.getOrders({
      market_id: MARKET_ID.toString(),
    });
    if (orders.orders.length === 0) {
      console.log('  No active orders');
    } else {
      const buyOrders = orders.orders.filter((o) => o.is_buy);
      const sellOrders = orders.orders.filter((o) => !o.is_buy);
      console.log(`  Buy orders: ${buyOrders.length}`);
      console.log(`  Sell orders: ${sellOrders.length}`);
      console.log(`  Total: ${orders.orders.length}`);
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }
}

main().catch(console.error);
