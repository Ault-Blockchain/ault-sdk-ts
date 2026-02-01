/**
 * Example: Query License Information
 *
 * This example demonstrates how to use the License REST API to query
 * license information from the Ault blockchain.
 *
 * Run with: npx tsx examples/query-licenses.ts
 */

import { createAultClient, getNetworkConfig } from '../src';

// Replace with an actual address to test
const OWNER_ADDRESS = 'ault1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnrql8a';

async function main() {
  // Create client connected to testnet
  const client = createAultClient({
    network: getNetworkConfig('ault_10904-1'),
  });

  console.log('Ault SDK - License Query Example');
  console.log('=================================\n');

  // 1. Get module parameters
  console.log('1. License Module Parameters');
  console.log('----------------------------');
  try {
    const paramsResult = await client.rest.license.getParams();
    console.log(`  Class name: ${paramsResult.params.class_name}`);
    console.log(`  Supply cap: ${paramsResult.params.supply_cap}`);
    console.log(`  Transfers enabled: ${paramsResult.params.enable_transfers}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 2. Get total supply
  console.log('\n2. Total Supply');
  console.log('---------------');
  try {
    const supply = await client.rest.license.getTotalSupply();
    console.log(`  Total licenses minted: ${supply.total_supply}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 3. Get balance for an address
  console.log(`\n3. License Balance for ${OWNER_ADDRESS}`);
  console.log('--------------------------------------------------');
  try {
    const balance = await client.rest.license.getBalance(OWNER_ADDRESS);
    console.log(`  Balance: ${balance.balance} licenses`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 4. Get licenses owned by address (paginated)
  console.log('\n4. Licenses Owned (first 5)');
  console.log('---------------------------');
  try {
    const owned = await client.rest.license.getOwnedBy(OWNER_ADDRESS, {
      pagination: { "pagination.limit": 5 },
    });
    if (owned.license_ids.length === 0) {
      console.log('  No licenses found');
    } else {
      console.log(`  License IDs: ${owned.license_ids.join(', ')}`);
      if (owned.pagination?.next_key) {
        console.log(`  More available (next key: ${owned.pagination.next_key})`);
      }
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 5. Get a specific license (if any exist)
  console.log('\n5. License Details');
  console.log('------------------');
  try {
    const licenseResult = await client.rest.license.getLicense('1');
    console.log(`  ID: ${licenseResult.license.id}`);
    console.log(`  Owner: ${licenseResult.license.owner}`);
    console.log(`  Status: ${licenseResult.license.status}`);
    console.log(`  Class: ${licenseResult.license.class_name}`);
    console.log(`  URI: ${licenseResult.license.uri}`);
    console.log(`  Created: ${licenseResult.license.created_at}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 6. Check if license is active
  console.log('\n6. License Active Status');
  console.log('------------------------');
  try {
    const isActive = await client.rest.license.isActive('1');
    console.log(`  License #1 active: ${isActive.is_active}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 7. List minters
  console.log('\n7. Authorized Minters');
  console.log('---------------------');
  try {
    const minters = await client.rest.license.getMinters({
      pagination: { "pagination.limit": 5 },
    });
    if (minters.minters.length === 0) {
      console.log('  No minters registered');
    } else {
      minters.minters.forEach((addr, i) => {
        console.log(`  ${i + 1}. ${addr}`);
      });
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 8. Check if address is approved member
  console.log(`\n8. KYC Status for ${OWNER_ADDRESS}`);
  console.log('--------------------------------------------------');
  try {
    const isApproved = await client.rest.license.isApprovedMember(OWNER_ADDRESS);
    console.log(`  Is approved member: ${isApproved.is_approved}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }
}

main().catch(console.error);
