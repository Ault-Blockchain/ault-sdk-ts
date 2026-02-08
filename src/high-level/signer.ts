import {
  createEip1193Signer,
  createEthersSigner,
  createPrivateKeySigner,
  createPrivySigner,
  createViemSigner,
  isAultSigner,
  type AultSigner,
  type Eip1193ProviderLike,
  type EthersSignerLike,
  type PrivySignTypedDataLike,
  type ViemWalletLike,
} from "../eip712/signers";
import type { FlexibleSignerInput } from "./types";

/**
 * Auto-detect and normalize signer input to AultSigner.
 */
export function autoDetectSigner(input: FlexibleSignerInput): AultSigner {
  // Handle explicitly typed signers
  if (typeof input === "object" && input !== null && "type" in input) {
    const typed = input as { type: string };
    switch (typed.type) {
      case "viem": {
        const v = input as { type: "viem"; wallet: ViemWalletLike; preferRpc?: boolean };
        return createViemSigner(v.wallet, { preferRpc: v.preferRpc });
      }
      case "ethers": {
        const e = input as { type: "ethers"; signer: EthersSignerLike };
        return createEthersSigner(e.signer);
      }
      case "privy": {
        const p = input as {
          type: "privy";
          signTypedData: PrivySignTypedDataLike;
          address?: string;
        };
        return createPrivySigner({ signTypedData: p.signTypedData, address: p.address });
      }
      case "privateKey": {
        const pk = input as { type: "privateKey"; key: string };
        return createPrivateKeySigner(pk.key);
      }
      case "eip1193": {
        const eip = input as { type: "eip1193"; provider: Eip1193ProviderLike; address: string };
        return createEip1193Signer({ provider: eip.provider, address: eip.address });
      }
    }
  }

  // Handle raw signTypedData function
  if (typeof input === "function") {
    return { signTypedData: input };
  }

  // Check if it's already an AultSigner created by this SDK (has our marker)
  // This MUST come before duck-typing to avoid mis-detecting SDK signers as ethers signers
  if (isAultSigner(input)) {
    return input;
  }

  // Try duck-typing detection for common wallet types
  const obj = input as Record<string, unknown>;

  // Check for ethers signer - it has getAddress as a FUNCTION and either signTypedData or _signTypedData
  // Ethers' signTypedData(domain, types, message) is incompatible with AultSigner's signTypedData(typedData)
  // Note: We check for ethers BEFORE generic signTypedData because the signatures are incompatible
  if (typeof obj.getAddress === "function" && (obj._signTypedData || obj.signTypedData)) {
    // Additional check: ethers signers typically have `provider` property
    // This helps distinguish from other objects that might have getAddress + signTypedData
    if (obj.provider !== undefined || obj._signTypedData) {
      return createEthersSigner(input as unknown as EthersSignerLike);
    }
  }

  // Check for viem WalletClient (has request method for RPC)
  // Must also have address or getAddresses to be usable as a viem wallet
  if (typeof obj.request === "function") {
    const hasAddress = typeof obj.address === "string";
    const hasGetAddresses = typeof obj.getAddresses === "function";

    if (hasAddress || hasGetAddresses) {
      return createViemSigner(input as unknown as ViemWalletLike);
    }

    // Has request but no address info - likely an EIP-1193 provider without account access
    throw new Error(
      'Object has "request" method but no "address" or "getAddresses". ' +
        'If this is an EIP-1193 provider, use { type: "eip1193", provider, address } format ' +
        "to explicitly provide the signer address.",
    );
  }

  // Accept objects with signTypedData - compatible with:
  // - viem LocalAccount (signTypedData takes { domain, types, primaryType, message })
  // - Raw AultSigner objects
  if (
    typeof input === "object" &&
    input !== null &&
    "signTypedData" in input &&
    typeof input.signTypedData === "function"
  ) {
    return input as AultSigner;
  }

  throw new Error(
    'Could not auto-detect signer type. Please use explicit { type: "viem" | "ethers" | "privy" | "privateKey" | "eip1193", ... } format.',
  );
}
