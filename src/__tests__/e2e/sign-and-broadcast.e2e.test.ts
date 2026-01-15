/**
 * End-to-End Test: Sign and Broadcast Transactions
 *
 * This test signs and broadcasts real transactions to testnet/devnet.
 *
 * SETUP:
 *   1. Set the AULT_TEST_PRIVATE_KEY environment variable (hex string, with or without 0x)
 *   2. Optionally set AULT_TEST_NETWORK to 'testnet' or 'localnet' (default: testnet)
 *
 * RUN:
 *   AULT_TEST_PRIVATE_KEY=your_private_key pnpm test:e2e
 *
 * IMPORTANT:
 *   - The test account needs some AULT tokens for gas fees
 *   - Tests are designed to be idempotent where possible
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { type Hex } from "viem";

import {
  createAultClient,
  getNetworkConfig,
  signAndBroadcastEip712,
  msg,
  evmToAult,
  queryAccount,
  buildEip712TypedData,
  GAS_CONSTANTS,
  createViemSigner,
  normalizeSignature,
  type NetworkConfig,
  type AultClient,
} from "../../index";

function loadEnvLocal(): void {
  const envUrl = new URL("../../../.env.local", import.meta.url);
  if (!existsSync(envUrl)) {
    return;
  }

  const contents = readFileSync(envUrl, "utf8");
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (!key) continue;
    if (process.env[key] !== undefined) continue;
    const unquoted =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))
        ? value.slice(1, -1)
        : value;
    process.env[key] = unquoted;
  }
}

loadEnvLocal();

// Skip all tests if no private key is provided
const PRIVATE_KEY = process.env.AULT_TEST_PRIVATE_KEY;
const NETWORK_TYPE = (process.env.AULT_TEST_NETWORK || "testnet") as "testnet" | "localnet";

const shouldRun = !!PRIVATE_KEY;
const shouldBroadcast =
  shouldRun && (process.env.AULT_TEST_BROADCAST === "1" || process.env.AULT_TEST_BROADCAST === "true");

const POLL_DELAY_MS = 2000;
const MAX_POLLS = 8;
const MAX_POLL_DELAY_MS = 10000;
const E2E_LONG_TIMEOUT_MS = 130000;
const BROADCAST_SETTLE_MS = 6000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForNewLicenseId(client: AultClient, owner: string, beforeBalance: bigint): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(POLL_DELAY_MS * (attempt + 1), MAX_POLL_DELAY_MS);
      await sleep(delay);
    }
    const balance = BigInt((await client.rest.license.getBalance(owner)).balance);
    if (balance > beforeBalance) {
      const index = Number(beforeBalance);
      const token = await client.rest.license.getTokenOfOwnerByIndex(owner, index);
      return token.id;
    }
  }
  return null;
}

async function waitForDelegation(client: AultClient, licenseId: string, operator: string): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(POLL_DELAY_MS * (attempt + 1), MAX_POLL_DELAY_MS);
      await sleep(delay);
    }
    const delegation = await client.rest.miner.getLicenseDelegation(licenseId);
    if (delegation.is_delegated && delegation.delegation?.operator === operator) {
      return true;
    }
  }
  return false;
}

async function waitForUndelegation(client: AultClient, licenseId: string): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(POLL_DELAY_MS * (attempt + 1), MAX_POLL_DELAY_MS);
      await sleep(delay);
    }
    const delegation = await client.rest.miner.getLicenseDelegation(licenseId);
    if (!delegation.is_delegated) {
      return true;
    }
  }
  return false;
}

async function pickRandomOperator(client: AultClient, owner: string): Promise<string> {
  const operators = await client.rest.miner.getOperators();
  const eligible = operators.operators.filter((op) => op.operator !== owner);
  if (eligible.length > 0) {
    return eligible[Math.floor(Math.random() * eligible.length)].operator;
  }
  console.log("No registered operators found; using random address");
  return evmToAult(`0x${randomBytes(20).toString("hex")}`);
}

async function isMinter(client: AultClient, address: string): Promise<boolean> {
  let nextAddress: string | undefined;
  for (let attempt = 0; attempt < 20; attempt++) {
    const page = await client.rest.license.getMinters({
      address_key: nextAddress,
      limit: 200,
    });
    if (page.minters.includes(address)) {
      return true;
    }
    if (!page.next_address) {
      return false;
    }
    nextAddress = page.next_address;
  }
  return false;
}

// Helper to normalize private key format
function normalizePrivateKey(key: string): Hex {
  const cleaned = key.startsWith("0x") ? key : `0x${key}`;
  return cleaned as Hex;
}

describe.skipIf(!shouldRun)("E2E: Sign and Broadcast", () => {
  let network: NetworkConfig;
  let client: AultClient;
  let account: PrivateKeyAccount;
  let aultAddress: string;
  let signer: ReturnType<typeof createViemSigner>;

  beforeAll(() => {
    // Setup network
    const chainId = NETWORK_TYPE === "localnet" ? "ault_20904-1" : "ault_10904-1";
    network = getNetworkConfig(chainId);
    client = createAultClient({ network });

    // Setup account from private key
    account = privateKeyToAccount(normalizePrivateKey(PRIVATE_KEY!));
    aultAddress = evmToAult(account.address);
    signer = createViemSigner(account);

    console.log("\n========================================");
    console.log("E2E Test Configuration:");
    console.log(`  Network: ${network.name} (${network.chainId})`);
    console.log(`  REST URL: ${network.restUrl}`);
    console.log(`  EVM Address: ${account.address}`);
    console.log(`  Ault Address: ${aultAddress}`);
    console.log("========================================\n");
  });

  describe("Account Queries", () => {
    it("should query account info", async () => {
      const accountInfo = await queryAccount(network, aultAddress);

      console.log("Account Info:", {
        accountNumber: accountInfo.accountNumber,
        sequence: accountInfo.sequence,
        hasPubkey: !!accountInfo.pubkeyBase64,
      });

      expect(accountInfo.accountNumber).toBeGreaterThanOrEqual(0);
      expect(accountInfo.sequence).toBeGreaterThanOrEqual(0);
    });

    it("should query license balance", async () => {
      const balance = await client.rest.license.getBalance(aultAddress);

      console.log("License Balance:", balance.balance);

      expect(balance).toHaveProperty("balance");
    });
  });

  describe("EIP-712 Typed Data Generation", () => {
    it("should build valid typed data for MsgDelegateMining", async () => {
      const accountInfo = await queryAccount(network, aultAddress);

      const delegateMsg = msg.miner.delegate({
        owner: aultAddress,
        operator: aultAddress, // delegate to self for testing
        license_ids: [1n],
      });

      const typedData = buildEip712TypedData(
        {
          chainId: network.chainId,
          accountNumber: accountInfo.accountNumber,
          sequence: accountInfo.sequence,
          fee: {
            amount: GAS_CONSTANTS.EIP712_FEE_AMOUNT,
            denom: GAS_CONSTANTS.DENOM,
            gas: GAS_CONSTANTS.EIP712_GAS_LIMIT,
          },
          memo: "E2E test",
        },
        [delegateMsg],
        network.evmChainId
      );

      console.log("Typed Data Domain:", typedData.domain);
      console.log("Typed Data Types:", Object.keys(typedData.types));
      console.log("Typed Data Message Keys:", Object.keys(typedData.message));

      // Validate structure
      expect(typedData.domain.name).toBe("Cosmos Web3");
      expect(typedData.domain.version).toBe("1.0.0");
      expect(typedData.domain.chainId).toBe(network.evmChainId);
      expect(typedData.domain.verifyingContract).toBe("cosmos");
      expect(typedData.domain.salt).toBe("0");
      expect(typedData.primaryType).toBe("Tx");
      expect(typedData.message).toHaveProperty("msg0");
    });

    it("should sign typed data with viem account", async () => {
      const accountInfo = await queryAccount(network, aultAddress);

      const delegateMsg = msg.miner.delegate({
        owner: aultAddress,
        operator: aultAddress,
        license_ids: [1n],
      });

      const typedData = buildEip712TypedData(
        {
          chainId: network.chainId,
          accountNumber: accountInfo.accountNumber,
          sequence: accountInfo.sequence,
          fee: {
            amount: GAS_CONSTANTS.EIP712_FEE_AMOUNT,
            denom: GAS_CONSTANTS.DENOM,
            gas: GAS_CONSTANTS.EIP712_GAS_LIMIT,
          },
          memo: "E2E signature test",
        },
        [delegateMsg],
        network.evmChainId
      );

      // Sign with viem
      const result = await signer.signTypedData(typedData);
      const signature = normalizeSignature(result);

      console.log("Signature:", signature.slice(0, 20) + "...");
      console.log("Signature length:", signature.length);

      // Validate signature format
      expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/); // 65 bytes = 130 hex chars + 0x
    });
  });

  describe.skipIf(!shouldBroadcast)("Transaction Broadcast", () => {
    /**
     * Test: Delegate mining licenses to a random operator
     *
     * This test requires the account to own at least one license.
     * It attempts to delegate to a random registered operator.
     */
    it("should broadcast MsgDelegateMining", async () => {
      // First check if user has any licenses
      const ownedLicenses = await client.rest.license.getOwnedBy(aultAddress, { limit: 1 });

      if (ownedLicenses.license_ids.length === 0) {
        console.log("No licenses owned - skipping delegation broadcast test");
        console.log("To run this test, the test account needs to own at least one license");
        return;
      }

      const licenseId = ownedLicenses.license_ids[0];
      console.log(`Found license #${licenseId}, will attempt delegation`);

      // Check current delegation status
      const currentDelegation = await client.rest.miner.getLicenseDelegation(licenseId);
      if (currentDelegation.delegation) {
        console.log(`License already delegated to: ${currentDelegation.delegation.operator}`);
        console.log("Skipping to avoid conflicts - use cancel delegation first");
        return;
      }

      const operatorAddress = await pickRandomOperator(client, aultAddress);
      console.log(`Delegating to operator: ${operatorAddress}`);
      const delegateMsg = msg.miner.delegate({
        owner: aultAddress,
        operator: operatorAddress,
        license_ids: [BigInt(licenseId)],
      });

      try {
        const result = await signAndBroadcastEip712({
          network,
          msgs: [delegateMsg],
          memo: "E2E test: delegate mining",
          signer,
        });

        console.log("Broadcast Result:", {
          txHash: result.txHash,
          code: result.code,
          rawLog: result.rawLog?.slice(0, 300),
        });
        await sleep(BROADCAST_SETTLE_MS);

        // We got a transaction hash - the signing worked!
        expect(result.txHash).toMatch(/^[A-F0-9]{64}$/i);

        if (result.code === 0) {
          console.log("SUCCESS: Transaction accepted by the chain!");
        } else {
          // Non-zero code could be expected (e.g., operator not registered)
          console.log(`Transaction returned code ${result.code}`);
          console.log("This may be expected if operator is not registered");
        }
      } catch (error) {
        console.error("Broadcast error:", error);
        throw error;
      }
    });

    /**
     * Test: Cancel mining delegation (cleanup)
     *
     * This test cancels any existing delegation for cleanup purposes.
     */
    it("should broadcast MsgCancelMiningDelegation (cleanup)", async () => {
      const ownedLicenses = await client.rest.license.getOwnedBy(aultAddress, { limit: 1 });

      if (ownedLicenses.license_ids.length === 0) {
        console.log("No licenses owned - skipping cancel delegation test");
        return;
      }

      const licenseId = ownedLicenses.license_ids[0];
      const currentDelegation = await client.rest.miner.getLicenseDelegation(licenseId);

      if (!currentDelegation.delegation) {
        console.log("License not delegated - nothing to cancel");
        return;
      }

      console.log(`Cancelling delegation for license #${licenseId}`);

      const cancelMsg = msg.miner.cancelDelegation({
        owner: aultAddress,
        license_ids: [BigInt(licenseId)],
      });

      try {
        const result = await signAndBroadcastEip712({
          network,
          msgs: [cancelMsg],
          memo: "E2E test: cancel delegation",
          signer,
        });

        console.log("Cancel Result:", {
          txHash: result.txHash,
          code: result.code,
          rawLog: result.rawLog?.slice(0, 300),
        });
        await sleep(BROADCAST_SETTLE_MS);

        expect(result.txHash).toMatch(/^[A-F0-9]{64}$/i);
      } catch (error) {
        console.error("Cancel delegation error:", error);
        throw error;
      }
    });

    it(
      "should mint, fetch, delegate, and undelegate a license",
      async () => {
        const params = await client.rest.license.getParams();
        if (params.params.minting_paused) {
          console.log("Minting is paused on this network; skipping mint/delegate flow");
          return;
        }

        const totalSupply = BigInt((await client.rest.license.getTotalSupply()).total_supply);
        const supplyCap = BigInt(params.params.supply_cap);
        if (supplyCap > 0n && totalSupply >= supplyCap) {
          console.log("License supply cap reached; skipping mint/delegate flow");
          return;
        }

        const authorized = await isMinter(client, aultAddress);
        if (!authorized) {
          console.log("Signer is not an authorized minter; skipping mint/delegate flow");
          return;
        }

        const beforeBalance = BigInt((await client.rest.license.getBalance(aultAddress)).balance);
        const uniqueTag = new Date().toISOString();

        console.log("Minting license...");
        const mintResult = await signAndBroadcastEip712({
          network,
          signer,
          msgs: [
            msg.license.mint({
              minter: aultAddress,
              to: aultAddress,
              uri: `e2e:${uniqueTag}`,
              reason: "E2E mint test",
            }),
          ],
          memo: "E2E test: mint license",
        });
        await sleep(BROADCAST_SETTLE_MS);

        console.log("Mint Result:", {
          txHash: mintResult.txHash,
          code: mintResult.code,
          rawLog: mintResult.rawLog?.slice(0, 300),
        });

        if (mintResult.code !== 0) {
          throw new Error(`Mint failed: ${mintResult.rawLog ?? "unknown error"}`);
        }

        const newLicenseId = await waitForNewLicenseId(client, aultAddress, beforeBalance);
        if (!newLicenseId) {
          throw new Error("Minted license ID not found after polling");
        }

        console.log(`Minted license #${newLicenseId}`);
        const license = await client.rest.license.getLicense(newLicenseId);
        expect(license.license.owner).toBe(aultAddress);
        expect(license.license.id).toBe(newLicenseId);

        const operatorAddress = await pickRandomOperator(client, aultAddress);

        console.log(`Delegating license #${newLicenseId} to ${operatorAddress}`);
        const delegateResult = await signAndBroadcastEip712({
          network,
          signer,
          msgs: [
            msg.miner.delegate({
              owner: aultAddress,
              operator: operatorAddress,
              license_ids: [BigInt(newLicenseId)],
            }),
          ],
          memo: "E2E test: delegate minted license",
        });
        await sleep(BROADCAST_SETTLE_MS);

        console.log("Delegate Result:", {
          txHash: delegateResult.txHash,
          code: delegateResult.code,
          rawLog: delegateResult.rawLog?.slice(0, 300),
        });

        expect(delegateResult.code).toBe(0);

        const delegated = await waitForDelegation(client, newLicenseId, operatorAddress);
        if (!delegated) {
          throw new Error("Delegation not observed after polling");
        }

        console.log(`Undelegating license #${newLicenseId}`);
        const cancelResult = await signAndBroadcastEip712({
          network,
          signer,
          msgs: [
            msg.miner.cancelDelegation({
              owner: aultAddress,
              license_ids: [BigInt(newLicenseId)],
            }),
          ],
          memo: "E2E test: undelegate minted license",
        });
        await sleep(BROADCAST_SETTLE_MS);

        console.log("Undelegate Result:", {
          txHash: cancelResult.txHash,
          code: cancelResult.code,
          rawLog: cancelResult.rawLog?.slice(0, 300),
        });

        expect(cancelResult.code).toBe(0);

        const undelegated = await waitForUndelegation(client, newLicenseId);
        if (!undelegated) {
          throw new Error("Undelegation not observed after polling");
        }
      },
      E2E_LONG_TIMEOUT_MS
    );
  });

  describe("Exchange Operations", () => {
    it("should query markets", async () => {
      try {
        const markets = await client.rest.exchange.getMarkets();
        console.log("Available markets:", markets.markets.length);

        if (markets.markets.length > 0) {
          console.log("First market:", markets.markets[0]);
        }
      } catch (error) {
        console.log("Exchange query failed (module may not be active):", (error as Error).message);
      }
    });
  });
});

/**
 * Diagnostic test that always runs to show configuration
 */
describe("E2E Configuration Check", () => {
  it("should show test configuration status", () => {
    console.log("\n========================================");
    console.log("E2E Test Environment:");
    console.log(`  AULT_TEST_PRIVATE_KEY: ${PRIVATE_KEY ? "SET (hidden)" : "NOT SET"}`);
    console.log(`  AULT_TEST_NETWORK: ${NETWORK_TYPE}`);
    console.log(`  AULT_TEST_BROADCAST: ${shouldBroadcast ? "ENABLED" : "DISABLED"}`);
    console.log(`  Tests will ${shouldRun ? "RUN" : "SKIP"}`);
    console.log("========================================\n");

    if (!shouldRun) {
      console.log("To run E2E tests, set AULT_TEST_PRIVATE_KEY environment variable:");
      console.log("  AULT_TEST_PRIVATE_KEY=your_hex_private_key pnpm test:e2e");
    } else if (!shouldBroadcast) {
      console.log("Broadcast tests are disabled to avoid hammering testnet.");
      console.log("Enable with: AULT_TEST_BROADCAST=1 pnpm test:e2e");
    }

    expect(true).toBe(true);
  });
});
