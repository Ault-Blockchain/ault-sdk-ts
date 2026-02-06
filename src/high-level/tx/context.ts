import type { TxExecutor } from "../tx-executor";

export interface TxModuleContext {
  signerAddress: string;
  exec: TxExecutor;
}
