# Ault SDK Examples

This directory contains runnable examples demonstrating how to use the Ault SDK.

## Prerequisites

Make sure you have the SDK built:

```bash
pnpm install
pnpm build
```

## Running Examples

All examples can be run with `tsx`:

```bash
# Install tsx if you haven't
pnpm add -D tsx

# Run examples
npx tsx examples/query-licenses.ts
npx tsx examples/high-level-complete-workflow.ts
```

For transaction examples, set your private key:

```bash
PRIVATE_KEY=your_private_key npx tsx examples/high-level-delegate-mining.ts
```

## High-Level Client Examples (Recommended)

These examples use the new `createClient()` high-level API which is simpler and handles all the complexity internally:

| Example | Description |
|---------|-------------|
| `high-level-delegate-mining.ts` | Delegate mining licenses with simple API calls |
| `high-level-exchange-orders.ts` | Place orders with protobuf Duration lifespan |
| `high-level-complete-workflow.ts` | Complete API reference showing all operations |
| `high-level-signers.ts` | Different ways to initialize the client (viem, ethers, MetaMask, Privy) |

**Key advantages of high-level API:**
- No message building required
- Numbers work for IDs (no bigints needed)
- EVM addresses auto-converted to ault1 format
- Lifespan uses protobuf Duration (seconds + nanos)
- `result.success` boolean for easy checking

## Query Examples (Read-Only)

These examples demonstrate REST API queries and don't require a wallet:

| Example | Description |
|---------|-------------|
| `query-licenses.ts` | Query license information: balance, owned licenses, minters, KYC status |
| `query-miner.ts` | Query miner data: epochs, operators, emission info, delegations |
| `query-exchange.ts` | Query exchange data: markets, orders, order books |

## Low-Level Transaction Examples

These examples show the low-level API with manual message building:

| Example | Description |
|---------|-------------|
| `delegate-mining.ts` | Low-level delegate mining using `msg` namespace and `signAndBroadcastEip712` |
| `place-exchange-order.ts` | Low-level exchange orders with manual nanosecond conversion |

**Note:** For most use cases, prefer the high-level examples above.

## Quick Comparison

### High-Level (Recommended)
```typescript
const client = await createClient({
  network: getNetworkConfig("ault_10904-1"),
  signer: privateKeyToAccount("0x..."),
});

await client.delegateMining({
  licenseIds: [1, 2, 3],
  operator: "0xOperator...",
});
```

### Low-Level
```typescript
const client = createAultClient({ network });
const signer = createPrivateKeySigner(privateKey);

await signAndBroadcastEip712({
  network,
  signer,
  signerAddress: evmToAult(address),
  msgs: [
    msg.miner.delegateMining({
      owner: signerAddress,
      operator: operatorAddress,
      licenseIds: [1n, 2n, 3n],
    }),
  ],
});
```

## Configuration

Most examples use placeholder addresses. To test against real data, update the constants at the top of each file:

```typescript
// Replace with actual values
const OWNER_ADDRESS = 'ault1youraddresshere...';
const LICENSE_ID = '1';
```

## Network

By default, examples connect to testnet (`ault_10904-1`). To use localnet:

```typescript
const client = await createClient({
  network: getNetworkConfig('ault_20904-1'), // localnet
  signer: mySigner,
});
```
