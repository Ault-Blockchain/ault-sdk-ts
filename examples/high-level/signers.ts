/**
 * Example: Different Signer Types with High-Level Client
 *
 * This example demonstrates all the different ways to create a high-level
 * client with various wallet/signer types.
 *
 * Run with: npx tsx examples/high-level/signers.ts
 */

import { createClient, getNetworkConfig, evmToAult } from "../../src";

// For viem examples
import { privateKeyToAccount } from "viem/accounts";
// Note: In a real app, you'd also import createWalletClient, custom from 'viem'

const network = getNetworkConfig("ault_10904-1");

/**
 * Example 1: Using a viem LocalAccount (privateKeyToAccount)
 *
 * This is the simplest way - just pass the account directly!
 * The client auto-detects it's a viem account.
 */
async function withViemAccount() {
  console.log("1. viem LocalAccount (auto-detected)");
  console.log("-------------------------------------");

  const account = privateKeyToAccount(
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  );

  const client = await createClient({
    network,
    signer: account, // Just pass it directly!
  });

  console.log(`   Address: ${client.address}`);
  console.log(`   Ready to sign transactions!\n`);
  return client;
}

/**
 * Example 2: Using a viem WalletClient (browser/RPC)
 *
 * WalletClients use RPC to sign, so they work with browser wallets.
 */
async function withViemWalletClient() {
  console.log("2. viem WalletClient (auto-detected)");
  console.log("-------------------------------------");

  // In a real app:
  // import { createWalletClient, custom } from 'viem';
  // const walletClient = createWalletClient({ transport: custom(window.ethereum) });
  // const client = await createClient({ network, signer: walletClient });

  console.log("   // In browser:");
  console.log("   const walletClient = createWalletClient({ transport: custom(window.ethereum) });");
  console.log("   const client = await createClient({ network, signer: walletClient });\n");
}

/**
 * Example 3: Using ethers.js signer
 *
 * Ethers signers need explicit type annotation because their signTypedData
 * signature is different from viem.
 */
async function withEthersSigner() {
  console.log("3. ethers.js Signer (explicit type)");
  console.log("------------------------------------");

  // In a real app:
  // import { ethers } from 'ethers';
  // const provider = new ethers.JsonRpcProvider('...');
  // const signer = new ethers.Wallet('0x...', provider);
  // const client = await createClient({
  //   network,
  //   signer: { type: 'ethers', signer },
  // });

  console.log("   // Usage:");
  console.log("   const signer = new ethers.Wallet('0x...', provider);");
  console.log("   const client = await createClient({");
  console.log("     network,");
  console.log("     signer: { type: 'ethers', signer },");
  console.log("   });\n");
}

/**
 * Example 4: Using MetaMask or any EIP-1193 provider
 *
 * For browser wallets that implement the EIP-1193 standard.
 */
async function withEip1193Provider() {
  console.log("4. MetaMask / EIP-1193 (explicit type)");
  console.log("--------------------------------------");

  // In a real app (browser):
  // const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  // const client = await createClient({
  //   network,
  //   signer: {
  //     type: 'eip1193',
  //     provider: window.ethereum,
  //     address: accounts[0],
  //   },
  // });

  console.log("   // Usage:");
  console.log("   const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });");
  console.log("   const client = await createClient({");
  console.log("     network,");
  console.log("     signer: {");
  console.log("       type: 'eip1193',");
  console.log("       provider: window.ethereum,");
  console.log("       address: accounts[0],");
  console.log("     },");
  console.log("   });\n");
}

/**
 * Example 5: Using Privy embedded wallets
 *
 * Privy provides a signTypedData function through React hooks.
 */
async function withPrivy() {
  console.log("5. Privy Embedded Wallet (explicit type)");
  console.log("-----------------------------------------");

  // In a React component:
  // import { useSignTypedData, useWallets } from '@privy-io/react-auth';
  // const { signTypedData } = useSignTypedData();
  // const { wallets } = useWallets();
  //
  // const client = await createClient({
  //   network,
  //   signer: {
  //     type: 'privy',
  //     signTypedData,
  //     address: wallets[0]?.address,
  //   },
  // });

  console.log("   // Usage (in React component):");
  console.log("   const { signTypedData } = useSignTypedData();");
  console.log("   const { wallets } = useWallets();");
  console.log("   const client = await createClient({");
  console.log("     network,");
  console.log("     signer: {");
  console.log("       type: 'privy',");
  console.log("       signTypedData,");
  console.log("       address: wallets[0]?.address,");
  console.log("     },");
  console.log("   });\n");
}

/**
 * Example 6: Using a raw private key
 *
 * For server-side applications or testing.
 */
async function withPrivateKey() {
  console.log("6. Private Key (explicit type)");
  console.log("-------------------------------");

  const client = await createClient({
    network,
    signer: {
      type: "privateKey",
      key: "0x0000000000000000000000000000000000000000000000000000000000000001",
    },
  });

  console.log(`   Address: ${client.address}`);
  console.log("   (Use this for server-side apps or testing)\n");
  return client;
}

/**
 * Example 7: Providing an explicit signer address
 *
 * Use this when the signer cannot expose its address, or to force a specific
 * address format. The address MUST match the signer key.
 */
async function withExplicitAddress() {
  console.log("7. Explicit Signer Address Override");
  console.log("------------------------------------");

  const account = privateKeyToAccount(
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  );

  const signerAddress = evmToAult(account.address);

  const client = await createClient({
    network,
    signer: account,
    signerAddress, // Must match the signer address
  });

  console.log(`   Address: ${client.address}`);
  console.log("   (Only use when you need to supply the signer's own address)\n");
}

/**
 * Example 8: With custom options
 */
async function withCustomOptions() {
  console.log("8. Custom Options");
  console.log("------------------");

  const account = privateKeyToAccount(
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  );

  const client = await createClient({
    network,
    signer: account,
    defaultGasLimit: "300000", // Higher gas limit
    defaultMemo: "My DApp v1.0", // Default memo for all transactions
    fetchOptions: {
      timeout: 60000, // 60 second timeout
      retries: 5, // More retries
    },
  });

  console.log(`   Address: ${client.address}`);
  console.log("   Custom gas limit: 300000");
  console.log("   Custom memo: 'My DApp v1.0'");
  console.log("   Custom timeout: 60s\n");
  return client;
}

async function main() {
  console.log("Ault SDK - Signer Types Example");
  console.log("================================\n");

  await withViemAccount();
  await withViemWalletClient();
  await withEthersSigner();
  await withEip1193Provider();
  await withPrivy();
  await withPrivateKey();
  await withExplicitAddress();
  await withCustomOptions();

  console.log("Summary: Signer Auto-Detection");
  console.log("==============================");
  console.log("The high-level client auto-detects these signer types:");
  console.log("  - viem LocalAccount (privateKeyToAccount)");
  console.log("  - viem WalletClient (createWalletClient)");
  console.log("  - ethers Wallet/Signer (when passed with { type: 'ethers' })");
  console.log("");
  console.log("For these, use explicit type:");
  console.log("  - ethers.js: { type: 'ethers', signer }");
  console.log("  - EIP-1193: { type: 'eip1193', provider, address }");
  console.log("  - Privy: { type: 'privy', signTypedData, address? }");
  console.log("  - Private key: { type: 'privateKey', key }");
}

main().catch(console.error);
