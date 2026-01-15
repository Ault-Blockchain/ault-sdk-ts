import type { NetworkConfig } from "./core/network";
import type { FetchWithRetryOptions, FetchFn } from "./core/http";
import { createLicenseApi, type LicenseApi } from "./rest/license";
import { createMinerApi, type MinerApi } from "./rest/miner";
import { createExchangeApi, type ExchangeApi } from "./rest/exchange";
import type { RestContext } from "./rest/context";
import { buildEip712TypedData } from "./eip712/builder";
import type { Eip712Msg, Eip712TxContext } from "./eip712/builder";
import { signAndBroadcastEip712 } from "./eip712/sign-and-broadcast";
import type { SignAndBroadcastParams } from "./eip712/sign-and-broadcast";
import { EIP712_MSG_TYPES } from "./eip712/registry";
import type { SignerInput } from "./eip712/signers";
import {
  aultToEvm,
  evmToAult,
  isValidAultAddress,
  isValidEvmAddress,
  isValidValidatorAddress,
} from "./utils/address";
import { parseEvmChainIdFromCosmosChainId } from "./utils/chain-id";

export interface AultClientOptions {
  network: NetworkConfig;
  signer?: SignerInput;
  signerAddress?: string;
  fetchFn?: FetchFn;
  fetchOptions?: FetchWithRetryOptions;
}

export interface AultClient {
  network: NetworkConfig;
  rest: {
    license: LicenseApi;
    miner: MinerApi;
    exchange: ExchangeApi;
  };
  eip712: {
    buildTypedData: (
      context: Eip712TxContext,
      msgs: Eip712Msg[],
      evmChainId?: number,
    ) => {
      types: Record<string, unknown>;
      primaryType: "Tx";
      domain: Record<string, unknown>;
      message: Record<string, unknown>;
    };
    signAndBroadcast: (
      params: Omit<SignAndBroadcastParams, "network" | "fetchFn">,
    ) => Promise<{ txHash: string; code: number; rawLog?: string }>;
    registry: typeof EIP712_MSG_TYPES;
  };
  utils: {
    address: {
      aultToEvm: typeof aultToEvm;
      evmToAult: typeof evmToAult;
      isValidAultAddress: typeof isValidAultAddress;
      isValidEvmAddress: typeof isValidEvmAddress;
      isValidValidatorAddress: typeof isValidValidatorAddress;
    };
    chainId: {
      parseEvmChainIdFromCosmosChainId: typeof parseEvmChainIdFromCosmosChainId;
    };
  };
}

export function createAultClient(options: AultClientOptions): AultClient {
  const context: RestContext = {
    restUrl: options.network.restUrl,
    fetchFn: options.fetchFn,
    fetchOptions: options.fetchOptions,
  };

  return {
    network: options.network,
    rest: {
      license: createLicenseApi(context),
      miner: createMinerApi(context),
      exchange: createExchangeApi(context),
    },
    eip712: {
      buildTypedData: buildEip712TypedData,
      signAndBroadcast: (params) =>
        signAndBroadcastEip712({
          ...params,
          network: options.network,
          fetchFn: options.fetchFn,
          signer: params.signer ?? options.signer,
          signerAddress: params.signerAddress ?? options.signerAddress,
        }),
      registry: EIP712_MSG_TYPES,
    },
    utils: {
      address: {
        aultToEvm,
        evmToAult,
        isValidAultAddress,
        isValidEvmAddress,
        isValidValidatorAddress,
      },
      chainId: {
        parseEvmChainIdFromCosmosChainId,
      },
    },
  };
}
