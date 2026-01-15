# Ault SDK for TypeScript

A TypeScript SDK for the Ault blockchain that provides REST query clients and EIP-712 transaction signing for the License, Miner, and Exchange modules.

## Features

- REST query clients for License, Miner, and Exchange modules
- EIP-712 typed data builder for secure off-chain signing
- Transaction encoding and broadcasting
- Works across Node.js, Bun, and browser runtimes
- Full TypeScript support with comprehensive type definitions
- Automatic retry with exponential backoff
- Pagination helpers for list endpoints

## Installation

```bash
# npm
npm install ault-sdk-ts

# pnpm
pnpm add ault-sdk-ts

# bun
bun add ault-sdk-ts
```

## Quick Start

### Creating a Client

```typescript
import { createAultClient, getNetworkConfig } from 'ault-sdk-ts';

// Create client for testnet
const client = createAultClient({
  network: getNetworkConfig('ault_10904-1'), // testnet
});

// Or create client for localnet
const localClient = createAultClient({
  network: getNetworkConfig('ault_20904-1'), // localnet
});

// Or use a custom network configuration
const customClient = createAultClient({
  network: {
    name: 'My Network',
    type: 'testnet',
    chainId: 'ault_10904-1',
    evmChainId: 10904,
    rpcUrl: 'https://my-rpc.example.com',
    restUrl: 'https://my-rest.example.com',
    evmRpcUrl: 'https://my-evm.example.com',
    isProduction: false,
  },
});
```

### Querying Licenses

```typescript
// Get a specific license
const license = await client.rest.license.getLicense('1');
console.log(license.owner, license.status);

// List licenses by owner
const licenses = await client.rest.license.getOwnedBy('ault1abc...', {
  limit: 10,
});

// Get all licenses for an owner (auto-pagination)
const allLicenses = await client.rest.license.getLicensesByOwnerAll('ault1abc...');

// Check license module parameters
const params = await client.rest.license.getParams();
```

### Querying Miner Data

```typescript
// Get current epoch
const epoch = await client.rest.miner.getCurrentEpoch();
console.log(`Current epoch: ${epoch.epoch}`);

// Get mining info for a license
const info = await client.rest.miner.getLicenseMinerInfo('123');
console.log(`Eligible: ${info.is_eligible}`);

// List all operators
const operators = await client.rest.miner.getOperators();

// Get emission schedule
const schedule = await client.rest.miner.getEmissionSchedule();
```

### Querying Exchange Data

```typescript
// List all markets
const markets = await client.rest.exchange.getMarkets();

// Get a specific market
const market = await client.rest.exchange.getMarket(1);

// Get order book
const orderBook = await client.rest.exchange.getOrderBook(1, {
  level_start: 0,
  level_end: 10,
});

// List orders for a specific address
const orders = await client.rest.exchange.getOrders({
  orderer: 'ault1abc...',
});
```

### Signing and Broadcasting Transactions

The SDK uses EIP-712 typed data for transaction signing, which is compatible with MetaMask and other Ethereum wallets.

```typescript
import {
  createAultClient,
  getNetworkConfig,
  msg,
  createViemSigner,
  evmToAult,
} from 'ault-sdk-ts';
import { createWalletClient, custom } from 'viem';

const walletClient = createWalletClient({
  transport: custom(window.ethereum),
});

const [evmAddress] = await walletClient.getAddresses();
const aultAddress = evmToAult(evmAddress);

const client = createAultClient({
  network: getNetworkConfig('ault_10904-1'),
  signer: createViemSigner(walletClient),
});

// Example: Delegate mining licenses to an operator
const result = await client.eip712.signAndBroadcast({
  signerAddress: aultAddress, // optional if signer exposes an address
  msgs: [
    msg.miner.delegate({
      owner: aultAddress,
      operator: 'ault1operator...',
      license_ids: ['1', '2', '3'],
    }),
  ],
});

console.log(`Transaction hash: ${result.txHash}`);
```

### Signer Helpers

The SDK includes adapters for common signer types:

- `createViemSigner(walletClientOrAccount)`
- `createEthersSigner(ethersSigner)`
- `createEip1193Signer({ provider, address })` (MetaMask/WalletConnect/Privy Embedded)
- `createPrivySigner({ signTypedData, address? })`
- `createPrivateKeySigner(privateKey)` (agent keys / server-side)

If a signer does not expose an address, pass `signerAddress` (ault or `0x`) to `signAndBroadcastEip712` or `client.eip712.signAndBroadcast`.

## API Reference

### Client Options

```typescript
interface AultClientOptions {
  network: NetworkConfig;
  signer?: SignerInput;            // Optional default signer
  signerAddress?: string;          // Optional default signer address (ault or 0x)
  fetchFn?: typeof fetch;           // Custom fetch implementation
  fetchOptions?: FetchWithRetryOptions;
}

interface FetchWithRetryOptions {
  timeout?: number;           // Request timeout in ms (default: 30000)
  retries?: number;           // Number of retries (default: 3)
  retryDelay?: number;        // Base delay between retries (default: 1000)
  exponentialBackoff?: boolean; // Use exponential backoff (default: true)
}
```

### Network Configuration

```typescript
interface NetworkConfig {
  name: string;
  type: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | 'unknown';
  chainId: string;           // Cosmos chain ID (e.g., "ault_10904-1")
  evmChainId: number;        // EVM chain ID (e.g., 10904)
  rpcUrl: string;            // Cosmos RPC endpoint
  restUrl: string;           // REST API endpoint
  evmRpcUrl: string;         // EVM JSON-RPC endpoint
  indexerUrl?: string;       // Optional indexer URL
  explorerUrl?: string;      // Optional explorer URL
  isProduction: boolean;
}
```

### REST Clients

#### License API

| Method | Description |
|--------|-------------|
| `getLicense(id)` | Get a single license by ID |
| `getLicenses(params)` | List licenses with optional filters |
| `getBalance(owner)` | Get license balance for an address |
| `getOwner(id)` | Get owner of a specific license |
| `getTokenOfOwnerByIndex(owner, index)` | Get license ID by owner and index |
| `getOwnedBy(owner, params)` | Get paginated licenses owned by address |
| `getLicensesByOwnerAll(owner)` | Get all licenses (auto-pagination) |
| `getTotalSupply()` | Get total number of licenses |
| `isActive(id)` | Check if a license is active |
| `getParams()` | Get license module parameters |
| `getMinters(params)` | List authorized minters |
| `getTransferUnlockTime()` | Get transfer unlock timestamp |
| `getKycApprovers(params)` | List KYC approvers |
| `getApprovedMembers(params)` | List approved members |
| `isApprovedMember(address)` | Check if address is approved |
| `isKycApprover(address)` | Check if address is KYC approver |
| `getActiveLicenseCountAt(owner, time)` | Get license count at snapshot time |

#### Miner API

| Method | Description |
|--------|-------------|
| `getCurrentEpoch()` | Get current epoch info |
| `getLicenseMinerInfo(licenseId)` | Get mining info for a license |
| `getBeacon(epoch)` | Get beacon randomness |
| `getParams()` | Get miner module parameters |
| `getOwnerKey(owner)` | Get owner's VRF key info |
| `getEmissionInfo()` | Get current emission info |
| `getEmissionSchedule()` | Get annual emission schedule |
| `getEpochInfo(epoch)` | Get details for a specific epoch |
| `getEpochs(params)` | List epochs with pagination |
| `getEpochsAll()` | Get all epochs (auto-pagination) |
| `getOperator(operator)` | Get operator info |
| `getOperators()` | List all operators |
| `getLicenseDelegation(licenseId)` | Get delegation for a license |
| `getDelegatedLicenses(operator)` | Get licenses delegated to operator |
| `getLicensePayouts(licenseId, params)` | Get payouts for a license |

#### Exchange API

| Method | Description |
|--------|-------------|
| `getParams()` | Get exchange module parameters |
| `getMarkets(params)` | List markets with pagination |
| `getMarket(marketId)` | Get a single market |
| `getOrders(params)` | List orders with filters |
| `getOrder(orderId)` | Get a single order |
| `getOrderBook(marketId, params)` | Get order book for a market |

### EIP-712 Message Builders

All message builders are accessed via the `msg` namespace:

#### License Messages

```typescript
msg.license.mint({ minter, to, reason, uri })
msg.license.batchMint({ minter, to, reason, uri })
msg.license.approveMember({ authority, member })
msg.license.revokeMember({ authority, member })
msg.license.batchApproveMember({ authority, members })
msg.license.batchRevokeMember({ authority, members })
msg.license.revoke({ authority, id, reason })
msg.license.burn({ authority, id })
msg.license.setTokenUri({ authority, id, uri })
msg.license.transfer({ sender, recipient, id })
```

#### Miner Messages

```typescript
msg.miner.setOwnerVrfKey({ owner, vrf_pubkey })
msg.miner.submitWork({ owner, license_id, epoch, signature })
msg.miner.batchSubmitWork({ owner, works })
msg.miner.registerOperator({ owner, operator, commission_rate, recipient })
msg.miner.unregisterOperator({ owner, operator })
msg.miner.updateOperatorInfo({ owner, operator, commission_rate, recipient })
msg.miner.delegate({ owner, operator, license_ids })
msg.miner.redelegate({ owner, new_operator, license_ids })
msg.miner.cancelDelegation({ owner, license_ids })
```

#### Exchange Messages

```typescript
msg.exchange.createMarket({ sender, base_denom, quote_denom })
msg.exchange.placeLimitOrder({ sender, market_id, is_buy, price, quantity, lifespan })
msg.exchange.placeMarketOrder({ sender, market_id, is_buy, quantity })
msg.exchange.cancelOrder({ sender, order_id })           // Note: Not EIP-712 compatible yet
msg.exchange.cancelAllOrders({ sender, market_id })
msg.exchange.updateMarketParams({ authority, updates })
```

### Utility Functions

#### Address Conversion

```typescript
import { evmToAult, aultToEvm, isValidAultAddress, isValidEvmAddress } from 'ault-sdk-ts';

// Convert EVM address to Ault bech32
const aultAddr = evmToAult('0x1234...abcd');
// => "ault1..."

// Convert Ault bech32 to EVM address
const evmAddr = aultToEvm('ault1...');
// => "0x1234...abcd"

// Validate addresses
isValidAultAddress('ault1...');     // true/false
isValidEvmAddress('0x1234...');     // true/false
isValidValidatorAddress('aultvaloper1...'); // true/false
```

#### Chain ID Parsing

```typescript
import { parseEvmChainIdFromCosmosChainId } from 'ault-sdk-ts';

const evmChainId = parseEvmChainIdFromCosmosChainId('ault_10904-1');
// => 10904
```

## Examples

### Example: Query and Display License Information

```typescript
import { createAultClient, getNetworkConfig } from 'ault-sdk-ts';

async function displayLicenseInfo(ownerAddress: string) {
  const client = createAultClient({
    network: getNetworkConfig('ault_10904-1'),
  });

  // Get balance
  const balance = await client.rest.license.getBalance(ownerAddress);
  console.log(`Total licenses: ${balance.balance}`);

  // Get all licenses
  const licenses = await client.rest.license.getLicensesByOwnerAll(ownerAddress);

  for (const license of licenses) {
    console.log(`License #${license.id}:`);
    console.log(`  Status: ${license.status}`);
    console.log(`  Class: ${license.class_name}`);
    console.log(`  Created: ${license.created_at}`);

    // Check if active in miner module
    const minerInfo = await client.rest.miner.getLicenseMinerInfo(license.id);
    console.log(`  Mining eligible: ${minerInfo.is_eligible}`);
  }
}
```

### Example: Delegate Mining Licenses

```typescript
import {
  getNetworkConfig,
  msg,
  signAndBroadcastEip712,
  type SignerInput,
} from 'ault-sdk-ts';

async function delegateMining(
  signer: SignerInput,
  signerAddress: string,
  operatorAddress: string,
  licenseIds: string[],
) {
  const network = getNetworkConfig('ault_10904-1');

  const result = await signAndBroadcastEip712({
    network,
    signer,
    signerAddress,
    msgs: [
      msg.miner.delegate({
        owner: signerAddress,
        operator: operatorAddress,
        license_ids: licenseIds,
      }),
    ],
  });

  if (result.code === 0) {
    console.log(`Successfully delegated! TX: ${result.txHash}`);
  } else {
    console.error(`Failed: ${result.rawLog}`);
  }

  return result;
}
```

### Example: Place a Limit Order on the Exchange

```typescript
import {
  getNetworkConfig,
  msg,
  signAndBroadcastEip712,
  type SignerInput,
} from 'ault-sdk-ts';

async function placeLimitOrder(
  signer: SignerInput,
  signerAddress: string,
  marketId: number,
  isBuy: boolean,
  price: string,
  quantity: string,
  lifespanSeconds: number,
) {
  const network = getNetworkConfig('ault_10904-1');

  // Convert lifespan to nanoseconds string (as required by the chain)
  const lifespanNanos = (BigInt(lifespanSeconds) * BigInt(1_000_000_000)).toString();

  const result = await signAndBroadcastEip712({
    network,
    signer,
    signerAddress,
    msgs: [
      msg.exchange.placeLimitOrder({
        sender: signerAddress,
        market_id: marketId.toString(),
        is_buy: isBuy,
        price,
        quantity,
        lifespan: lifespanNanos,
      }),
    ],
  });

  if (result.code === 0) {
    console.log(`Order placed! TX: ${result.txHash}`);
  } else {
    console.error(`Failed: ${result.rawLog}`);
  }

  return result;
}

// Usage example:
// Place a buy order for 100 units at price 1.5, valid for 1 hour
// await placeLimitOrder(
//   signer,
//   'ault1...',
//   1,              // market ID
//   true,           // is_buy
//   '1.5',          // price
//   '100',          // quantity
//   3600,           // 1 hour in seconds
// );
```

### Example: Using with MetaMask (Browser)

```typescript
import {
  getNetworkConfig,
  msg,
  signAndBroadcastEip712,
  evmToAult,
  createEip1193Signer,
} from 'ault-sdk-ts';

async function delegateWithMetaMask(operatorAddress: string, licenseIds: string[]) {
  // Get connected account from MetaMask
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts'
  });
  const evmAddress = accounts[0];
  const aultAddress = evmToAult(evmAddress);

  const network = getNetworkConfig('ault_10904-1');
  const signer = createEip1193Signer({ provider: window.ethereum, address: evmAddress });

  const result = await signAndBroadcastEip712({
    network,
    signer,
    signerAddress: aultAddress,
    msgs: [
      msg.miner.delegate({
        owner: aultAddress,
        operator: operatorAddress,
        license_ids: licenseIds,
      }),
    ],
  });

  return result;
}
```

### Example: Using with Privy (Embedded Wallet)

```typescript
import { useSignTypedData, useWallets } from '@privy-io/react-auth';
import {
  getNetworkConfig,
  msg,
  signAndBroadcastEip712,
  evmToAult,
  createPrivySigner,
} from 'ault-sdk-ts';

async function delegateWithPrivy(operatorAddress: string, licenseIds: string[]) {
  const { signTypedData } = useSignTypedData();
  const { wallets } = useWallets();

  const evmAddress = wallets[0]?.address;
  if (!evmAddress) {
    throw new Error('No Privy wallet connected');
  }

  const aultAddress = evmToAult(evmAddress);
  const network = getNetworkConfig('ault_10904-1');
  const signer = createPrivySigner({ signTypedData, address: evmAddress });

  const result = await signAndBroadcastEip712({
    network,
    signer,
    signerAddress: aultAddress,
    msgs: [
      msg.miner.delegate({
        owner: aultAddress,
        operator: operatorAddress,
        license_ids: licenseIds,
      }),
    ],
  });

  return result;
}
```

### Example: Using with ethers.js

```typescript
import { ethers } from 'ethers';
import {
  getNetworkConfig,
  msg,
  signAndBroadcastEip712,
  evmToAult,
  createEthersSigner,
} from 'ault-sdk-ts';

async function delegateWithEthers(
  signer: ethers.Signer,
  operatorAddress: string,
  licenseIds: string[],
) {
  const evmAddress = await signer.getAddress();
  const aultAddress = evmToAult(evmAddress);

  const network = getNetworkConfig('ault_10904-1');
  const signerAdapter = createEthersSigner(signer);

  const result = await signAndBroadcastEip712({
    network,
    signer: signerAdapter,
    signerAddress: aultAddress,
    msgs: [
      msg.miner.delegate({
        owner: aultAddress,
        operator: operatorAddress,
        license_ids: licenseIds,
      }),
    ],
  });

  return result;
}
```

### Example: Using with viem

```typescript
import { createWalletClient, custom } from 'viem';
import {
  getNetworkConfig,
  msg,
  signAndBroadcastEip712,
  evmToAult,
  createViemSigner,
} from 'ault-sdk-ts';

async function delegateWithViem(operatorAddress: string, licenseIds: string[]) {
  const walletClient = createWalletClient({
    transport: custom(window.ethereum),
  });

  const [evmAddress] = await walletClient.getAddresses();
  const aultAddress = evmToAult(evmAddress);

  const network = getNetworkConfig('ault_10904-1');
  const signer = createViemSigner(walletClient);

  const result = await signAndBroadcastEip712({
    network,
    signer,
    signerAddress: aultAddress,
    msgs: [
      msg.miner.delegate({
        owner: aultAddress,
        operator: operatorAddress,
        license_ids: licenseIds,
      }),
    ],
  });

  return result;
}
```

### Example: Using an Agent Key (Server-side)

```typescript
import {
  getNetworkConfig,
  msg,
  signAndBroadcastEip712,
  evmToAult,
  createPrivateKeySigner,
} from 'ault-sdk-ts';

async function delegateWithAgentKey(
  agentPrivateKey: string,
  operatorAddress: string,
  licenseIds: string[],
) {
  const signer = createPrivateKeySigner(agentPrivateKey);
  const evmAddress = await signer.getAddress?.();
  if (!evmAddress) {
    throw new Error('Signer did not expose an address');
  }

  const aultAddress = evmToAult(evmAddress);
  const network = getNetworkConfig('ault_10904-1');

  const result = await signAndBroadcastEip712({
    network,
    signer,
    msgs: [
      msg.miner.delegate({
        owner: aultAddress,
        operator: operatorAddress,
        license_ids: licenseIds,
      }),
    ],
  });

  return result;
}
```

## Error Handling

The SDK provides typed errors for better error handling:

```typescript
import { ApiError, NetworkError, TimeoutError } from 'ault-sdk-ts';

try {
  const license = await client.rest.license.getLicense('999999');
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error: ${error.message}`);
    console.error(`Status: ${error.status}`);
  } else if (error instanceof NetworkError) {
    console.error(`Network Error: ${error.message}`);
  } else if (error instanceof TimeoutError) {
    console.error(`Request timed out`);
  }
}
```

## Runtime Compatibility

The SDK is designed to work across multiple JavaScript runtimes:

- **Node.js**: Requires Node.js 18+ (for native fetch support) or provide a custom fetch implementation
- **Bun**: Full support out of the box
- **Browser**: Full support in modern browsers

For older Node.js versions, you can inject a fetch implementation:

```typescript
import fetch from 'node-fetch';

const client = createAultClient({
  network: getNetworkConfig('ault_10904-1'),
  fetchFn: fetch as unknown as typeof globalThis.fetch,
});
```

## Constants

The SDK exports useful constants:

```typescript
import { GAS_CONSTANTS, TIMING_CONSTANTS } from 'ault-sdk-ts';

// Gas constants
GAS_CONSTANTS.EIP712_FEE_AMOUNT    // '5000000000000000' (default fee)
GAS_CONSTANTS.EIP712_GAS_LIMIT    // '200000' (default gas limit)
GAS_CONSTANTS.DENOM               // 'aault'
GAS_CONSTANTS.PER_LICENSE         // 200000 (gas per license)

// Timing constants
TIMING_CONSTANTS.API_TIMEOUT      // 30000 (30 seconds)
TIMING_CONSTANTS.RETRY_DELAY      // 1000 (1 second)
TIMING_CONSTANTS.MAX_BACKOFF      // 30000 (30 seconds)
```

## License

MIT
