import { createAultClient } from "../client";
import { resolveSignerAddress } from "../eip712/signers";
import { autoDetectSigner } from "./signer";
import { createParallelQueryApi } from "./query-helpers";
import { createExchangeTxApi } from "./tx/exchange";
import { createLicenseTxApi } from "./tx/license";
import { createMinerTxApi } from "./tx/miner";
import { createStakingTxApi } from "./tx/staking";
import { createTxExecutor } from "./tx-executor";
import type { Client, ClientOptions } from "./types";

/**
 * Create a high-level client for the Ault SDK.
 *
 * @example
 * ```typescript
 * import { createClient, getNetworkConfig } from 'ault-sdk-ts';
 * import { privateKeyToAccount } from 'viem/accounts';
 *
 * const account = privateKeyToAccount('0x...');
 * const client = await createClient({
 *   network: getNetworkConfig('ault_10904-1'),
 *   signer: account,
 * });
 *
 * // Query
 * const licenses = await client.license.getOwnedBy(client.address);
 *
 * // Transactions
 * const result = await client.delegateMining({
 *   licenseIds: [1, 2, 3],
 *   operator: '0xOperator...',
 * });
 * ```
 */
export async function createClient(options: ClientOptions): Promise<Client> {
  const lowLevel = createAultClient({
    network: options.network,
    fetchFn: options.fetchFn,
    fetchOptions: options.fetchOptions,
  });

  const signer = autoDetectSigner(options.signer);
  const signerAddress = await resolveSignerAddress(signer, options.signerAddress);
  const exec = createTxExecutor({
    network: options.network,
    signer,
    signerAddress,
    fetchFn: options.fetchFn,
    fetchOptions: options.fetchOptions,
    defaultGasLimit: options.defaultGasLimit,
    defaultMemo: options.defaultMemo,
  });

  return {
    network: options.network,
    address: signerAddress,

    // Query APIs (pass-through)
    license: lowLevel.rest.license,
    miner: lowLevel.rest.miner,
    exchange: lowLevel.rest.exchange,
    staking: lowLevel.rest.staking,

    ...createLicenseTxApi({ signerAddress, exec }),
    ...createMinerTxApi({ signerAddress, exec }),
    ...createExchangeTxApi({ signerAddress, exec }),
    ...createStakingTxApi({ signerAddress, exec }),
    ...createParallelQueryApi(lowLevel),

    _lowLevel: lowLevel,
  };
}
