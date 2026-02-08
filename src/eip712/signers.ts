import { privateKeyToAccount } from "viem/accounts";
import type { Eip712Field, Eip712TypedData } from "./types";
import { evmToAult, isValidAultAddress, isValidEvmAddress } from "../utils/address";

export type SignTypedDataResult = { signature: string } | string;
export type SignTypedDataFn = (typedData: Eip712TypedData) => Promise<SignTypedDataResult>;

/**
 * Symbol used to identify AultSigner instances created by this SDK.
 * This prevents mis-detection when duck-typing wallet types.
 */
export const AULT_SIGNER_MARKER = Symbol.for("ault-sdk:signer");

export interface AultSigner {
  signTypedData: SignTypedDataFn;
  address?: string;
  getAddress?: () => Promise<string> | string;
  /** Internal marker to identify SDK-created signers */
  [AULT_SIGNER_MARKER]?: true;
}

/**
 * Check if an object is an AultSigner created by this SDK.
 */
export function isAultSigner(obj: unknown): obj is AultSigner {
  return (
    typeof obj === "object" &&
    obj !== null &&
    AULT_SIGNER_MARKER in obj &&
    (obj as Record<symbol, unknown>)[AULT_SIGNER_MARKER] === true
  );
}

export type SignerInput = AultSigner | SignTypedDataFn;

export interface Eip1193ProviderLike {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export interface ViemWalletLike {
  address?: string;
  getAddresses?: () => Promise<readonly string[]>;
  signTypedData?: (args: {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  }) => Promise<string>;
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export interface EthersSignerLike {
  getAddress: () => Promise<string>;
  signTypedData?: (
    domain: Record<string, unknown>,
    types: Record<string, Array<{ name: string; type: string }>>,
    message: Record<string, unknown>,
  ) => Promise<string>;
  _signTypedData?: (
    domain: Record<string, unknown>,
    types: Record<string, Array<{ name: string; type: string }>>,
    message: Record<string, unknown>,
  ) => Promise<string>;
}

export interface PrivySignTypedDataLike {
  (input: unknown, options?: { address?: string }): Promise<{ signature: string }>;
}

export function normalizeSigner(input?: SignerInput): AultSigner | null {
  if (!input) return null;
  if (typeof input === "function") {
    return { signTypedData: input };
  }
  if (typeof input === "object" && typeof input.signTypedData === "function") {
    return input;
  }
  throw new Error("Invalid signer: expected a signer object or signTypedData function.");
}

export function normalizeSignature(result: SignTypedDataResult): string {
  if (typeof result === "string") {
    return result;
  }
  if (result && typeof result.signature === "string") {
    return result.signature;
  }
  throw new Error("Invalid signature response: expected hex string or { signature }.");
}

async function getSignerAddress(signer: AultSigner): Promise<string | null> {
  if (typeof signer.address === "string") {
    return signer.address;
  }
  if (typeof signer.getAddress === "function") {
    const address = await signer.getAddress();
    return typeof address === "string" ? address : null;
  }
  return null;
}

export async function resolveSignerAddress(
  signer: AultSigner | null,
  signerAddress?: string,
): Promise<string> {
  const raw = signerAddress ?? (signer ? await getSignerAddress(signer) : null);
  if (!raw) {
    throw new Error("signerAddress is required when the signer has no address.");
  }
  if (isValidAultAddress(raw)) {
    return raw;
  }
  if (isValidEvmAddress(raw)) {
    return evmToAult(raw);
  }
  throw new Error(`Invalid signerAddress: ${raw}`);
}

export function stripEip712Domain(types: Record<string, Eip712Field[]>) {
  const { EIP712Domain: _removed, ...rest } = types;
  return rest;
}

export function createEip1193Signer(options: {
  provider: Eip1193ProviderLike;
  address: string;
  method?: "eth_signTypedData_v4" | "eth_signTypedData";
}): AultSigner {
  const method = options.method ?? "eth_signTypedData_v4";
  return {
    [AULT_SIGNER_MARKER]: true,
    address: options.address,
    signTypedData: async (typedData) => {
      const payload =
        method === "eth_signTypedData_v4" ? JSON.stringify(typedData) : (typedData as unknown);
      const signature = await options.provider.request({
        method,
        params: [options.address, payload],
      });
      if (typeof signature !== "string") {
        throw new Error("Provider did not return a signature string.");
      }
      return { signature };
    },
  };
}

export function createViemSigner(
  wallet: ViemWalletLike,
  options?: { preferRpc?: boolean },
): AultSigner {
  const preferRpc = options?.preferRpc ?? true;
  const getAddress = async () => {
    if (wallet.address) return wallet.address;
    if (wallet.getAddresses) {
      const addresses = await wallet.getAddresses();
      if (addresses?.length) return addresses[0];
    }
    return undefined;
  };

  return {
    [AULT_SIGNER_MARKER]: true,
    getAddress: async () => {
      const addr = await getAddress();
      if (!addr) throw new Error("Viem wallet has no address");
      return addr;
    },
    signTypedData: async (typedData) => {
      if (preferRpc && wallet.request) {
        const address = await getAddress();
        if (!address) {
          throw new Error("Viem wallet has no address; pass signerAddress explicitly.");
        }
        const signature = await wallet.request({
          method: "eth_signTypedData_v4",
          params: [address, JSON.stringify(typedData)],
        });
        if (typeof signature !== "string") {
          throw new Error("RPC signer did not return a signature string.");
        }
        return { signature };
      }

      if (!wallet.signTypedData) {
        throw new Error("Viem signer does not support signTypedData.");
      }
      const signature = await wallet.signTypedData({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });
      return { signature };
    },
  };
}

export function createEthersSigner(signer: EthersSignerLike): AultSigner {
  const sign = signer.signTypedData ?? signer._signTypedData;
  if (!sign) {
    throw new Error("Ethers signer must implement signTypedData or _signTypedData.");
  }
  return {
    [AULT_SIGNER_MARKER]: true,
    getAddress: () => signer.getAddress(),
    signTypedData: async (typedData) => {
      const types = stripEip712Domain(typedData.types);
      const signature = await sign(typedData.domain, types, typedData.message);
      return { signature };
    },
  };
}

export function createPrivySigner(options: {
  signTypedData: PrivySignTypedDataLike;
  address?: string;
}): AultSigner {
  return {
    [AULT_SIGNER_MARKER]: true,
    address: options.address,
    signTypedData: (typedData) =>
      options.signTypedData(typedData, options.address ? { address: options.address } : undefined),
  };
}

export function createPrivateKeySigner(privateKey: string): AultSigner {
  const normalized = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(normalized as `0x${string}`);
  return createViemSigner(account);
}
