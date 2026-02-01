/**
 * Example: Query Miner Module Information
 *
 * This example demonstrates how to use the Miner REST API to query
 * mining data from the Ault blockchain.
 *
 * Run with: npx tsx examples/query-miner.ts
 */

import { createAultClient, getNetworkConfig } from '../src';

// Replace with actual values to test
const OWNER_ADDRESS = 'ault1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnrql8a';
const LICENSE_ID = '1';

async function main() {
  // Create client connected to testnet
  const client = createAultClient({
    network: getNetworkConfig('ault_10904-1'),
  });

  console.log('Ault SDK - Miner Query Example');
  console.log('==============================\n');

  // 1. Get current epoch
  console.log('1. Current Epoch');
  console.log('----------------');
  try {
    const epoch = await client.rest.miner.getCurrentEpoch();
    console.log(`  Epoch: ${epoch.epoch}`);
    console.log(`  Seed: ${epoch.seed}`);
    console.log(`  Threshold: ${epoch.threshold}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 2. Get miner module parameters
  console.log('\n2. Miner Module Parameters');
  console.log('--------------------------');
  try {
    const params = await client.rest.miner.getParams();
    console.log(`  Epoch duration: ${params.epoch_duration_seconds}s`);
    console.log(`  Min credits: ${params.min_credits}`);
    console.log(`  Mining enabled: ${params.mining_enabled}`);
    console.log(`  Max submissions per epoch: ${params.max_submissions_per_epoch}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 3. Get emission information
  console.log('\n3. Emission Information');
  console.log('-----------------------');
  try {
    const emission = await client.rest.miner.getEmissionInfo();
    console.log(`  Current year: ${emission.current_year}`);
    console.log(`  Annual emission: ${emission.annual_emission}`);
    console.log(`  Monthly emission: ${emission.monthly_emission}`);
    console.log(`  Daily emission: ${emission.daily_emission}`);
    console.log(`  Cumulative emitted: ${emission.cumulative_emitted}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 4. Get emission schedule
  console.log('\n4. Emission Schedule (first 5 years)');
  console.log('------------------------------------');
  try {
    const schedule = await client.rest.miner.getEmissionSchedule();
    schedule.schedule.slice(0, 5).forEach((entry, i) => {
      console.log(`  Year ${i + 1}: ${entry.annual_emission} (cumulative: ${entry.cumulative_emission})`);
    });
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 5. Get license miner info
  console.log(`\n5. Mining Info for License #${LICENSE_ID}`);
  console.log('-----------------------------------');
  try {
    const info = await client.rest.miner.getLicenseMinerInfo(LICENSE_ID);
    console.log(`  VRF Pubkey: ${info.vrf_pubkey || 'not set'}`);
    console.log(`  Last submit epoch: ${info.last_submit_epoch}`);
    console.log(`  Is eligible: ${info.is_eligible}`);
    console.log(`  Is quarantined: ${info.is_quarantined}`);
    console.log(`  Credits: ${info.credits}`);
    console.log(`  Total payouts: ${info.total_payouts}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 6. Get owner's VRF key
  console.log(`\n6. Owner VRF Key for ${OWNER_ADDRESS}`);
  console.log('------------------------------------------------');
  try {
    const key = await client.rest.miner.getOwnerKey(OWNER_ADDRESS);
    console.log(`  VRF Pubkey: ${key.vrf_pubkey || 'not registered'}`);
    console.log(`  Registered epoch: ${key.registered_epoch}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 7. List operators
  console.log('\n7. Mining Operators');
  console.log('-------------------');
  try {
    const operators = await client.rest.miner.getOperators();
    if (operators.operators.length === 0) {
      console.log('  No operators registered');
    } else {
      operators.operators.slice(0, 5).forEach((op, i) => {
        console.log(`  ${i + 1}. ${op.operator}`);
        console.log(`     Commission: ${op.commission_rate}`);
        console.log(`     Recipient: ${op.recipient}`);
      });
      if (operators.operators.length > 5) {
        console.log(`  ... and ${operators.operators.length - 5} more`);
      }
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 8. Get license delegation
  console.log(`\n8. Mining Delegation for License #${LICENSE_ID}`);
  console.log('------------------------------------------');
  try {
    const delegation = await client.rest.miner.getLicenseDelegation(LICENSE_ID);
    if (delegation.delegation) {
      console.log(`  Delegated to: ${delegation.delegation.operator}`);
    } else {
      console.log('  Not delegated');
    }
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 9. Get recent epochs
  console.log('\n9. Recent Epochs (last 5)');
  console.log('-------------------------');
  try {
    const epochs = await client.rest.miner.getEpochs({
      pagination: { "pagination.limit": 5, "pagination.reverse": true },
    });
    epochs.epochs.forEach((ep) => {
      console.log(`  Epoch ${ep.epoch}: finalized=${ep.finalized}`);
    });
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }

  // 10. Get beacon for a specific epoch
  console.log('\n10. Beacon for Epoch 1');
  console.log('----------------------');
  try {
    const beacon = await client.rest.miner.getBeacon('1');
    console.log(`  Beacon R: ${beacon.beacon_r}`);
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
  }
}

main().catch(console.error);
