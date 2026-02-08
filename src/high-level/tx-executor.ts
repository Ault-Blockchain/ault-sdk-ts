import type { FetchFn, FetchWithRetryOptions } from "../core/http";
import { GAS_CONSTANTS, type NetworkConfig } from "../core/network";
import { signAndBroadcastEip712 } from "../eip712/sign-and-broadcast";
import type { AnyEip712Msg } from "../eip712/builder";
import type { AultSigner } from "../eip712/signers";
import type { TxOptions, TxResult } from "./types";

interface TxExecutorOptions {
  network: NetworkConfig;
  signer: AultSigner;
  signerAddress: string;
  fetchFn?: FetchFn;
  fetchOptions?: FetchWithRetryOptions;
  defaultGasLimit?: string;
  defaultMemo?: string;
}

export type TxExecutor = (msgs: AnyEip712Msg[], txOptions?: TxOptions) => Promise<TxResult>;

export function createTxExecutor(options: TxExecutorOptions): TxExecutor {
  const defaultGasLimit = options.defaultGasLimit ?? GAS_CONSTANTS.EIP712_GAS_LIMIT;
  const defaultMemo = options.defaultMemo ?? "";

  return async function exec(msgs: AnyEip712Msg[], txOptions?: TxOptions): Promise<TxResult> {
    const result = await signAndBroadcastEip712({
      network: options.network,
      signer: options.signer,
      signerAddress: options.signerAddress,
      msgs,
      gasLimit: txOptions?.gasLimit ?? defaultGasLimit,
      memo: txOptions?.memo ?? defaultMemo,
      fetchFn: options.fetchFn,
      fetchOptions: options.fetchOptions,
    });

    return {
      txHash: result.txHash,
      code: result.code,
      rawLog: result.rawLog,
      success: result.code === 0,
    };
  };
}
