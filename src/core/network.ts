import { parseEvmChainIdFromCosmosChainId } from "../utils/chain-id";

export { parseEvmChainIdFromCosmosChainId };

export type NetworkType = "mainnet" | "testnet" | "devnet" | "localnet" | "unknown";

export interface NetworkConfig {
  name: string;
  type: NetworkType;
  chainId: string;
  evmChainId: number;
  rpcUrl: string;
  restUrl: string;
  evmRpcUrl: string;
  indexerUrl?: string;
  explorerUrl?: string;
  isProduction: boolean;
}

export const NETWORKS: Record<string, NetworkConfig> = {
  "ault_10904-1": {
    name: "Ault Testnet",
    type: "testnet",
    chainId: "ault_10904-1",
    evmChainId: 10904,
    rpcUrl: "https://ault-testnet.mk-wk-pub-1.workers.dev/cosmos-rpc",
    restUrl: "https://ault-testnet.mk-wk-pub-1.workers.dev/rest",
    evmRpcUrl: "https://ault-testnet.mk-wk-pub-1.workers.dev/evm",
    indexerUrl: "https://ault-indexer-testnet.fly.dev",
    explorerUrl: "https://testnet-cosmos-explorer.cloud.aultblockchain.xyz",
    isProduction: false,
  },
  "ault_20904-1": {
    name: "Ault Localnet",
    type: "localnet",
    chainId: "ault_20904-1",
    evmChainId: 20904,
    rpcUrl: "http://localhost:26657",
    restUrl: "http://localhost:1317",
    evmRpcUrl: "http://localhost:8545",
    indexerUrl: "http://localhost:8080",
    isProduction: false,
  },
};

export const DEFAULT_CHAIN_ID = "ault_10904-1";

export function getNetworkConfig(chainId: string = DEFAULT_CHAIN_ID): NetworkConfig {
  const config = NETWORKS[chainId];
  if (config) {
    return config;
  }

  const evmChainId = parseEvmChainIdFromCosmosChainId(chainId) ?? 904;
  return {
    name: "Unknown Network",
    type: "unknown",
    chainId,
    evmChainId,
    rpcUrl: "http://localhost:26657",
    restUrl: "http://localhost:1317",
    evmRpcUrl: "http://localhost:8545",
    indexerUrl: "http://localhost:8080",
    isProduction: false,
  };
}

export const TIMING_CONSTANTS = {
  API_TIMEOUT_MS: 30000,
  API_RETRY_DELAY_MS: 1000,
  API_MAX_BACKOFF_MS: 30000,
} as const;

export const GAS_CONSTANTS = {
  EIP712_FEE_AMOUNT: "5000000000000000",
  EIP712_GAS_LIMIT: "200000",
  DENOM: "aault",
  PER_LICENSE: 200000,
  PER_KYC_MEMBER: 100000,
} as const;
