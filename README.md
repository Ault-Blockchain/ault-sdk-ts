# Ault SDK for TypeScript

A TypeScript SDK for the Ault blockchain that provides high-level transaction methods and REST query clients for the License, Miner, and Exchange modules.

## Features

- High-level client with simple transaction methods (no manual message building)
- Flexible signer support (viem, ethers, Privy, MetaMask, private keys)
- Automatic address format conversion (0x <-> ault1)
- REST query clients for License, Miner, and Exchange modules
- EIP-712 typed data signing
- Works across Node.js, Bun, and browser runtimes
- Full TypeScript support with comprehensive type definitions
- Automatic retry with exponential backoff

## Installation

```bash
# npm
npm install git+https://github.com/Ault-Blockchain/ault-sdk-ts.git

# pnpm
pnpm add git+https://github.com/Ault-Blockchain/ault-sdk-ts.git

# bun
bun add git+https://github.com/Ault-Blockchain/ault-sdk-ts.git
```

## Quick Start

```typescript
import { createClient, getNetworkConfig } from 'ault-sdk-ts';
import { privateKeyToAccount } from 'viem/accounts';

// Create a client with a viem account
const account = privateKeyToAccount('0x...');
const client = await createClient({
  network: getNetworkConfig('ault_10904-1'),
  signer: account,
});

// Query data
const licenses = await client.license.getOwnedBy(client.address);
const epoch = await client.miner.getCurrentEpoch();

// Execute transactions (no message building required!)
const result = await client.delegateMining({
  licenseIds: [1, 2, 3],        // accepts numbers, strings, or bigints
  operator: '0xOperator...',    // accepts 0x or ault1 format
});

console.log(`TX Hash: ${result.txHash}, Success: ${result.success}`);
```

## Creating a Client

The `createClient()` function accepts multiple signer types and auto-detects the format:

### With viem

```typescript
import { createClient, getNetworkConfig } from 'ault-sdk-ts';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount('0x...');
const client = await createClient({
  network: getNetworkConfig('ault_10904-1'),
  signer: account,
});
```

### With viem WalletClient (Browser)

```typescript
import { createClient, getNetworkConfig } from 'ault-sdk-ts';
import { createWalletClient, custom } from 'viem';

const walletClient = createWalletClient({
  transport: custom(window.ethereum),
});

const client = await createClient({
  network: getNetworkConfig('ault_10904-1'),
  signer: walletClient,
});
```

### With ethers.js

```typescript
import { createClient, getNetworkConfig } from 'ault-sdk-ts';
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('...');
const signer = new ethers.Wallet('0x...', provider);

const client = await createClient({
  network: getNetworkConfig('ault_10904-1'),
  signer: { type: 'ethers', signer },
});
```

### With MetaMask (EIP-1193)

```typescript
import { createClient, getNetworkConfig } from 'ault-sdk-ts';

const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

const client = await createClient({
  network: getNetworkConfig('ault_10904-1'),
  signer: {
    type: 'eip1193',
    provider: window.ethereum,
    address: accounts[0],
  },
});
```

### With Privy

```typescript
import { createClient, getNetworkConfig } from 'ault-sdk-ts';
import { useSignTypedData, useWallets } from '@privy-io/react-auth';

const { signTypedData } = useSignTypedData();
const { wallets } = useWallets();

const client = await createClient({
  network: getNetworkConfig('ault_10904-1'),
  signer: {
    type: 'privy',
    signTypedData,
    address: wallets[0]?.address,
  },
});
```

### With Private Key (Server-side)

```typescript
import { createClient, getNetworkConfig } from 'ault-sdk-ts';

const client = await createClient({
  network: getNetworkConfig('ault_10904-1'),
  signer: { type: 'privateKey', key: '0x...' },
});
```

## Client Options

```typescript
interface ClientOptions {
  network: NetworkConfig;           // Required: network configuration
  signer: FlexibleSignerInput;      // Required: wallet/signer
  signerAddress?: string;           // Optional: override signer address
  fetchFn?: typeof fetch;           // Optional: custom fetch
  fetchOptions?: FetchWithRetryOptions;
  defaultGasLimit?: string;         // Optional: default gas limit
  defaultMemo?: string;             // Optional: default memo
}
```

## Query Methods

The client provides pass-through access to all REST API methods:

```typescript
// License queries
const license = await client.license.getLicense('1');
const licenses = await client.license.getOwnedBy(client.address);
const balance = await client.license.getBalance(client.address);
const isApproved = await client.license.isApprovedMember(address);

// Miner queries
const epoch = await client.miner.getCurrentEpoch();
const operators = await client.miner.getOperators();
const delegation = await client.miner.getLicenseDelegation('123');
const emission = await client.miner.getEmissionInfo();

// Exchange queries
const markets = await client.exchange.getMarkets();
const orderBook = await client.exchange.getOrderBook(1);
const orders = await client.exchange.getOrders({ orderer: client.address });
```

## Parallel Query Helpers

For analyzing large numbers of licenses efficiently, use the parallel query helpers:

```typescript
// Analyze all licenses for an owner in one call (parallel fetching)
const analysis = await client.analyzeLicenses('ault1...');
console.log(`Total: ${analysis.total}`);
console.log(`Active: ${analysis.active}`);
console.log(`Delegated: ${analysis.delegated}`);

// Group delegations by operator
const byOperator = new Map<string, number>();
for (const d of analysis.delegations) {
  byOperator.set(d.operator, (byOperator.get(d.operator) ?? 0) + 1);
}
```

The `analyzeLicenses()` method fetches all data in parallel batches, making it much faster than sequential queries. For an address with 464 licenses, it completes in ~15-30 seconds instead of several minutes.

### Individual Parallel Helpers

For more control, use the individual parallel helpers:

```typescript
// Get all license IDs owned by an address (parallel batched)
const licenseIds = await client.getAllLicenseIds('ault1...');

// Get license details for multiple IDs in parallel
const licenses = await client.getLicenseDetailsParallel(licenseIds);

// Get delegation status for multiple IDs in parallel
const delegations = await client.getLicenseDelegationsParallel(licenseIds);

// Process results
for (const d of delegations) {
  if (d.isDelegated) {
    console.log(`License ${d.licenseId} delegated to ${d.operator}`);
  }
}
```

## Transaction Methods

All transaction methods return a `TxResult`:

```typescript
interface TxResult {
  txHash: string;    // Transaction hash
  code: number;      // Result code (0 = success)
  rawLog?: string;   // Raw log from transaction
  success: boolean;  // Convenience: code === 0
}
```

### License Transactions

```typescript
// Mint a license
await client.mintLicense({
  to: '0x...',                    // EVM or ault1 address
  uri: 'https://example.com/metadata.json',
  reason: 'Minted via SDK',       // Optional, defaults to ""
});

// Batch mint
await client.batchMintLicense({
  recipients: [
    { to: '0xAddr1...', uri: 'https://example.com/1.json' },
    { to: '0xAddr2...', uri: 'https://example.com/2.json' },
  ],
});

// Transfer
await client.transferLicense({
  licenseId: 123,                 // bigint, number, or string
  to: '0x...',
});

// Burn/Revoke (admin only)
await client.burnLicense({ licenseId: 123 });
await client.revokeLicense({ licenseId: 123 });

// KYC management
await client.approveMember({ member: '0x...' });
await client.revokeMember({ member: '0x...' });
await client.batchApproveMember({ members: ['0x...', '0x...'] });

// Admin functions
await client.setMinters({ add: ['0x...'], remove: [] });
await client.setKYCApprovers({ add: ['0x...'], remove: [] });
```

### Miner Transactions

```typescript
import { base64ToBytes } from 'ault-sdk-ts';

// Delegate licenses to an operator
await client.delegateMining({
  licenseIds: [1, 2, 3],          // bigint[], number[], or string[]
  operator: '0xOperator...',
});

// Cancel mining delegation
await client.cancelMiningDelegation({
  licenseIds: [1, 2, 3],
});

// Redelegate to a new operator
await client.redelegateMining({
  licenseIds: [1, 2, 3],
  newOperator: '0xNewOperator...',
});

// Set VRF key (Uint8Array)
await client.setOwnerVrfKey({
  vrfPubkey: base64ToBytes('base64...'),
  possessionProof: base64ToBytes('base64...'),
  nonce: 1n,
});

// Submit mining work (Uint8Array)
await client.submitWork({
  licenseId: 123,
  epoch: 456,
  y: base64ToBytes('base64...'),
  proof: base64ToBytes('base64...'),
});

// Batch submit work
await client.batchSubmitWork({
  submissions: [
    { licenseId: 1, epoch: 100, y: base64ToBytes('...'), proof: base64ToBytes('...') },
    { licenseId: 2, epoch: 100, y: base64ToBytes('...'), proof: base64ToBytes('...') },
  ],
});

// Operator management
await client.registerOperator({
  commissionRate: 5,              // Percentage (0-100)
  commissionRecipient: '0x...',   // Optional, defaults to signer
});
await client.unregisterOperator();
await client.updateOperatorInfo({
  newCommissionRate: 6,
  newCommissionRecipient: '0x...',
});
```

### Exchange Transactions

```typescript
import { base64ToBytes } from 'ault-sdk-ts';

// Place a limit order
await client.placeLimitOrder({
  marketId: 1,
  isBuy: true,
  price: '1.5',
  quantity: '100',
  lifespan: { seconds: 3600n, nanos: 0 }, // 1 hour
});

// Place a market order
await client.placeMarketOrder({
  marketId: 1,
  isBuy: true,
  quantity: '100',
});

// Cancel orders
await client.cancelOrder({ orderId: base64ToBytes('base64OrderId...') });
await client.cancelAllOrders({ marketId: 1 });

// Create a market
await client.createMarket({
  baseDenom: 'uatom',
  quoteDenom: 'uusdc',
});
```

### Transaction Options

All transaction methods accept optional `gasLimit` and `memo`:

```typescript
await client.delegateMining({
  licenseIds: [1, 2, 3],
  operator: '0x...',
  gasLimit: '300000',             // Override default gas limit
  memo: 'Delegating via SDK',     // Custom memo
});
```

## Development

### Generating Protos

Proto and EIP-712 generation expects both the Ault core repo and the Cosmos SDK repo to be checked out alongside this repo:

```
../ault/proto
../cosmos-sdk/proto
```

From this repo root, run:

```bash
pnpm gen:proto
```

Note: `pnpm gen:eip712` also reads Cosmos SDK protos (staking/distribution) and requires `../cosmos-sdk/proto`.

## Error Handling

```typescript
import { ApiError, NetworkError, TimeoutError } from 'ault-sdk-ts';

try {
  const result = await client.mintLicense({ to: '0x...', uri: '...' });
  if (!result.success) {
    console.error(`Transaction failed: ${result.rawLog}`);
  }
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error (${error.status}): ${error.message}`);
  } else if (error instanceof NetworkError) {
    console.error(`Network Error: ${error.message}`);
  } else if (error instanceof TimeoutError) {
    console.error('Request timed out');
  }
}
```

## Advanced Usage

For advanced use cases, you can access the low-level client:

```typescript
// Access low-level client
const lowLevel = client._lowLevel;

// Build EIP-712 typed data manually
const typedData = lowLevel.eip712.buildTypedData(context, msgs);

// Use the msg namespace directly
import { msg } from 'ault-sdk-ts';
import { privateKeyToAccount } from 'viem/accounts';

const mySigner = privateKeyToAccount('0x...');

const delegateMsg = msg.miner.delegateMining({
  owner: 'ault1...',
  operator: 'ault1...',
  licenseIds: [1n, 2n, 3n],
});

// Sign and broadcast manually
const result = await lowLevel.eip712.signAndBroadcast({
  signer: mySigner,       // provide the signer explicitly
  signerAddress: 'ault1...',
  msgs: [delegateMsg],
});
```

### Low-Level Client

For more control, use `createAultClient()` directly:

```typescript
import { createAultClient, getNetworkConfig, msg, signAndBroadcastEip712 } from 'ault-sdk-ts';

const client = createAultClient({
  network: getNetworkConfig('ault_10904-1'),
});

// Query
const licenses = await client.rest.license.getLicenses();

// Build and broadcast transactions manually
const result = await signAndBroadcastEip712({
  network: client.network,
  signer: mySigner,
  signerAddress: 'ault1...',
  msgs: [
    msg.miner.delegateMining({
      owner: 'ault1...',
      operator: 'ault1...',
      licenseIds: [1n, 2n, 3n],
    }),
  ],
});
```

## Network Configuration

```typescript
import { getNetworkConfig, NETWORKS } from 'ault-sdk-ts';

// Use predefined networks
const testnet = getNetworkConfig('ault_10904-1');
const localnet = getNetworkConfig('ault_20904-1');

// Or define custom network
const customNetwork = {
  name: 'My Network',
  type: 'testnet' as const,
  chainId: 'ault_10904-1',
  evmChainId: 10904,
  rpcUrl: 'https://my-rpc.example.com',
  restUrl: 'https://my-rest.example.com',
  evmRpcUrl: 'https://my-evm.example.com',
  isProduction: false,
};
```

## Utility Functions

```typescript
import {
  evmToAult,
  aultToEvm,
  isValidAultAddress,
  isValidEvmAddress,
  parseEvmChainIdFromCosmosChainId,
} from 'ault-sdk-ts';

// Address conversion
const aultAddr = evmToAult('0x1234...abcd');  // => "ault1..."
const evmAddr = aultToEvm('ault1...');        // => "0x1234...abcd"

// Validation
isValidAultAddress('ault1...');               // true/false
isValidEvmAddress('0x1234...');               // true/false

// Chain ID
const evmChainId = parseEvmChainIdFromCosmosChainId('ault_10904-1');  // => 10904
```

## Constants

```typescript
import { GAS_CONSTANTS, TIMING_CONSTANTS } from 'ault-sdk-ts';

GAS_CONSTANTS.EIP712_FEE_AMOUNT   // '5000000000000000'
GAS_CONSTANTS.EIP712_GAS_LIMIT    // '200000'
GAS_CONSTANTS.DENOM               // 'aault'
GAS_CONSTANTS.PER_LICENSE         // 200000

TIMING_CONSTANTS.API_TIMEOUT_MS   // 30000
TIMING_CONSTANTS.API_RETRY_DELAY_MS // 1000
TIMING_CONSTANTS.API_MAX_BACKOFF_MS // 30000
```

## Runtime Compatibility

- **Node.js**: Requires Node.js 18+ (for native fetch) or provide custom fetch
- **Bun**: Full support
- **Browser**: Full support in modern browsers

For older Node.js versions:

```typescript
import fetch from 'node-fetch';

const client = await createClient({
  network: getNetworkConfig('ault_10904-1'),
  signer: mySigner,
  fetchFn: fetch as unknown as typeof globalThis.fetch,
});
```

## License

MIT
