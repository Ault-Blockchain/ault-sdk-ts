import { msg, type WorkSubmission } from "../../eip712/builder";
import { normalizeAddress, toBigInt } from "../address-utils";
import type { MinerTxApi } from "../types";
import type { TxModuleContext } from "./context";

export function createMinerTxApi({ signerAddress, exec }: TxModuleContext): MinerTxApi {
  return {
    async delegateMining({ licenseIds, operator, gasLimit, memo }) {
      return exec(
        [
          msg.miner.delegateMining({
            owner: signerAddress,
            licenseIds: licenseIds.map(toBigInt),
            operator: normalizeAddress(operator),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async cancelMiningDelegation({ licenseIds, gasLimit, memo }) {
      return exec(
        [
          msg.miner.cancelMiningDelegation({
            owner: signerAddress,
            licenseIds: licenseIds.map(toBigInt),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async redelegateMining({ licenseIds, newOperator, gasLimit, memo }) {
      return exec(
        [
          msg.miner.redelegateMining({
            owner: signerAddress,
            licenseIds: licenseIds.map(toBigInt),
            newOperator: normalizeAddress(newOperator),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async setOwnerVrfKey({ vrfPubkey, possessionProof, nonce, gasLimit, memo }) {
      return exec(
        [
          msg.miner.setOwnerVrfKey({
            owner: signerAddress,
            vrfPubkey,
            possessionProof,
            nonce: toBigInt(nonce),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async submitWork({ licenseId, epoch, y, proof, gasLimit, memo }) {
      return exec(
        [
          msg.miner.submitWork({
            submitter: signerAddress,
            licenseId: toBigInt(licenseId),
            epoch: toBigInt(epoch),
            y,
            proof,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async batchSubmitWork({ submissions, gasLimit, memo }) {
      const mappedSubmissions: WorkSubmission[] = submissions.map((s) => ({
        licenseId: toBigInt(s.licenseId),
        epoch: toBigInt(s.epoch),
        y: s.y,
        proof: s.proof,
      }));

      return exec(
        [
          msg.miner.batchSubmitWork({
            submitter: signerAddress,
            submissions: mappedSubmissions,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async registerOperator({ commissionRate, commissionRecipient, gasLimit, memo }) {
      return exec(
        [
          msg.miner.registerOperator({
            operator: signerAddress,
            commissionRate,
            commissionRecipient: normalizeAddress(commissionRecipient ?? signerAddress),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async unregisterOperator(params = {}) {
      return exec(
        [
          msg.miner.unregisterOperator({
            operator: signerAddress,
          }),
        ],
        { gasLimit: params.gasLimit, memo: params.memo },
      );
    },

    async updateOperatorInfo({ newCommissionRate, newCommissionRecipient, gasLimit, memo }) {
      return exec(
        [
          msg.miner.updateOperatorInfo({
            operator: signerAddress,
            newCommissionRate,
            newCommissionRecipient: normalizeAddress(newCommissionRecipient ?? signerAddress),
          }),
        ],
        { gasLimit, memo },
      );
    },
  };
}
