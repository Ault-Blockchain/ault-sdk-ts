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
npx tsx examples/query-miner.ts
npx tsx examples/query-exchange.ts
npx tsx examples/delegate-mining.ts
npx tsx examples/place-exchange-order.ts
```

## Example Descriptions

### Query Examples (Read-Only)

These examples demonstrate REST API queries and don't require a wallet:

| Example | Description |
|---------|-------------|
| `query-licenses.ts` | Query license information: balance, owned licenses, minters, KYC status |
| `query-miner.ts` | Query miner data: epochs, operators, emission info, delegations |
| `query-exchange.ts` | Query exchange data: markets, orders, order books |

### Transaction Examples

These examples show how to build EIP-712 typed data for signing:

| Example | Description |
|---------|-------------|
| `delegate-mining.ts` | Build a transaction to delegate mining licenses to an operator |
| `place-exchange-order.ts` | Build limit orders, market orders, and cancel orders for the DEX |

**Note:** Transaction examples show the typed data structure but don't actually sign or broadcast since they require a real wallet. See the code comments for instructions on integrating with MetaMask, ethers.js, or viem.

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
const client = createAultClient({
  network: getNetworkConfig('ault_20904-1'), // localnet
});
```
