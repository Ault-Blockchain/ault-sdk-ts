import { hexToBytes, hashTypedData, recoverPublicKey } from "viem";
import { buildEip712TypedData, type AnyEip712Msg, type Eip712TxContext } from "./builder";
import { GAS_CONSTANTS, TIMING_CONSTANTS, type NetworkConfig } from "../core/network";
import { fetchJson, postJson, type FetchFn } from "../core/http";
import { bytesToBase64, base64ToBytes } from "../core/base64";
import { parseEvmChainIdFromCosmosChainId } from "../utils/chain-id";
import {
  normalizeSigner,
  normalizeSignature,
  resolveSignerAddress,
  type SignerInput,
} from "./signers";
import {
  encodeAuthInfo,
  encodeEthSecp256k1PubKey,
  encodeTxBody,
  encodeTxRaw,
  SIGN_MODE_LEGACY_AMINO_JSON,
} from "../proto/tx-encode";
import { MSG_ENCODERS } from "./msg-encoders.generated";

interface NodeInfoResponse {
  default_node_info?: { network?: string };
  node_info?: { network?: string };
}

export interface AccountInfo {
  accountNumber: string;
  sequence: string;
  pubkeyBase64: string | null;
}

interface AccountQueryResponse {
  account: {
    base_account?: {
      account_number?: string;
      accountNumber?: string;
      sequence?: string;
      pub_key?: { key?: string };
      pubKey?: { key?: string };
    };
    baseAccount?: {
      account_number?: string;
      accountNumber?: string;
      sequence?: string;
      pub_key?: { key?: string };
      pubKey?: { key?: string };
    };
    account?: {
      base_account?: {
        account_number?: string;
        accountNumber?: string;
        sequence?: string;
        pub_key?: { key?: string };
        pubKey?: { key?: string };
      };
    };
    account_number?: string;
    accountNumber?: string;
    sequence?: string;
    pub_key?: { key?: string };
    pubKey?: { key?: string };
  };
}

const chainIdCache = new Map<string, string>();

export async function queryChainId(
  network: NetworkConfig,
  fetchFn?: FetchFn,
  fetchOptions?: import("../core/http").FetchWithRetryOptions,
): Promise<string> {
  const cacheKey = network.restUrl;
  const cached = chainIdCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const data = await fetchJson<NodeInfoResponse>(
      `${network.restUrl}/cosmos/base/tendermint/v1beta1/node_info`,
      {},
      { timeout: TIMING_CONSTANTS.API_TIMEOUT_MS, retries: 2, ...fetchOptions },
      fetchFn,
    );
    const chainId = data.default_node_info?.network ?? data.node_info?.network;
    if (chainId) {
      chainIdCache.set(cacheKey, chainId);
      return chainId;
    }
  } catch {
    // fall back to configured chain ID
  }

  return network.chainId;
}

export async function queryAccount(
  network: NetworkConfig,
  address: string,
  fetchFn?: FetchFn,
  fetchOptions?: import("../core/http").FetchWithRetryOptions,
): Promise<AccountInfo> {
  const data = await fetchJson<AccountQueryResponse>(
    `${network.restUrl}/cosmos/auth/v1beta1/accounts/${address}`,
    {},
    { timeout: TIMING_CONSTANTS.API_TIMEOUT_MS, retries: 3, ...fetchOptions },
    fetchFn,
  );

  const account = data.account;
  const base =
    account?.base_account ?? account?.baseAccount ?? account?.account?.base_account ?? account;
  const accountNumber = String(base.account_number ?? base.accountNumber ?? "0");
  const sequence = String(base.sequence ?? "0");
  const pubkey = base.pub_key?.key ?? base.pubKey?.key ?? null;

  return { accountNumber, sequence, pubkeyBase64: pubkey };
}

async function recoverPubkeyFromTypedDataSignature(
  typedData: ReturnType<typeof buildEip712TypedData>,
  signature: `0x${string}`,
): Promise<string> {
  const hash = hashTypedData({
    domain: typedData.domain as Parameters<typeof hashTypedData>[0]["domain"],
    types: typedData.types as Parameters<typeof hashTypedData>[0]["types"],
    primaryType: typedData.primaryType,
    message: typedData.message as Parameters<typeof hashTypedData>[0]["message"],
  });

  const publicKey = await recoverPublicKey({ hash, signature });
  const uncompressedBytes = hexToBytes(publicKey);
  const x = uncompressedBytes.slice(1, 33);
  const y = uncompressedBytes.slice(33, 65);
  const prefix = y[31] % 2 === 0 ? 0x02 : 0x03;
  const compressed = new Uint8Array(33);
  compressed[0] = prefix;
  compressed.set(x, 1);
  return bytesToBase64(compressed);
}

export interface SignAndBroadcastParams {
  network: NetworkConfig;
  signer?: SignerInput;
  signerAddress?: string;
  msgs: AnyEip712Msg[];
  memo?: string;
  gasLimit?: string;
  fetchFn?: FetchFn;
  fetchOptions?: import("../core/http").FetchWithRetryOptions;
}

export async function signAndBroadcastEip712({
  network,
  signerAddress,
  signer,
  msgs,
  memo = "",
  gasLimit,
  fetchFn,
  fetchOptions,
}: SignAndBroadcastParams): Promise<{ txHash: string; code: number; rawLog?: string }> {
  const resolvedSigner = normalizeSigner(signer);
  if (!resolvedSigner) {
    throw new Error("signer is required to sign EIP-712 typed data.");
  }
  const resolvedSignerAddress = await resolveSignerAddress(resolvedSigner, signerAddress);

  const actualChainId = await queryChainId(network, fetchFn, fetchOptions);
  const accountInfo = await queryAccount(network, resolvedSignerAddress, fetchFn, fetchOptions);

  const context: Eip712TxContext = {
    chainId: actualChainId,
    accountNumber: accountInfo.accountNumber,
    sequence: accountInfo.sequence,
    fee: {
      amount: GAS_CONSTANTS.EIP712_FEE_AMOUNT,
      denom: GAS_CONSTANTS.DENOM,
      gas: gasLimit || GAS_CONSTANTS.EIP712_GAS_LIMIT,
    },
    memo,
  };

  const evmChainId = parseEvmChainIdFromCosmosChainId(actualChainId) ?? network.evmChainId;
  const typedData = buildEip712TypedData(context, msgs, evmChainId);
  const signature = normalizeSignature(await resolvedSigner.signTypedData(typedData));

  const pubkey =
    accountInfo.pubkeyBase64 ||
    (await recoverPubkeyFromTypedDataSignature(typedData, signature as `0x${string}`));

  const sigBytes = hexToBytes(signature as `0x${string}`);
  const sigWithoutRecovery = sigBytes.slice(0, 64);

  const encodedMessages = msgs.map((msg) => {
    const encoder = MSG_ENCODERS[msg.typeUrl];
    if (!encoder) {
      throw new Error(`No encoder found for message type: ${msg.typeUrl}`);
    }
    return { typeUrl: msg.typeUrl, value: encoder(msg.value) };
  });

  const bodyBytes = encodeTxBody({ messages: encodedMessages, memo });
  const pubkeyBytes = base64ToBytes(pubkey);
  const pubkeyProto = encodeEthSecp256k1PubKey(pubkeyBytes);

  const authInfoBytes = encodeAuthInfo({
    signerInfos: [
      {
        publicKey: { typeUrl: "/cosmos.evm.crypto.v1.ethsecp256k1.PubKey", value: pubkeyProto },
        mode: SIGN_MODE_LEGACY_AMINO_JSON,
        sequence: accountInfo.sequence,
      },
    ],
    fee: {
      amount: [{ denom: GAS_CONSTANTS.DENOM, amount: context.fee.amount }],
      gasLimit: BigInt(context.fee.gas),
    },
  });

  const txRawBytes = encodeTxRaw({
    bodyBytes,
    authInfoBytes,
    signatures: [sigWithoutRecovery],
  });

  const txBytesBase64 = bytesToBase64(txRawBytes);

  const result = await postJson<
    { tx_bytes: string; mode: string },
    { tx_response: { txhash: string; code: number; raw_log?: string } }
  >(
    `${network.restUrl}/cosmos/tx/v1beta1/txs`,
    { tx_bytes: txBytesBase64, mode: "BROADCAST_MODE_SYNC" },
    { timeout: TIMING_CONSTANTS.API_TIMEOUT_MS, retries: 2, ...fetchOptions },
    fetchFn,
  );

  return {
    txHash: result.tx_response.txhash,
    code: result.tx_response.code,
    rawLog: result.tx_response.raw_log,
  };
}
