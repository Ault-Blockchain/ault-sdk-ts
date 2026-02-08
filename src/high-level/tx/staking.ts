import { msg } from "../../eip712/builder";
import { normalizeValidatorAddress } from "../../utils/address";
import type { StakingTxApi } from "../types";
import type { TxModuleContext } from "./context";

export function createStakingTxApi({ signerAddress, exec }: TxModuleContext): StakingTxApi {
  return {
    async delegate({ validatorAddress, amount, gasLimit, memo }) {
      return exec(
        [
          msg.staking.delegate({
            delegatorAddress: signerAddress,
            validatorAddress: normalizeValidatorAddress(validatorAddress),
            amount,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async undelegate({ validatorAddress, amount, gasLimit, memo }) {
      return exec(
        [
          msg.staking.undelegate({
            delegatorAddress: signerAddress,
            validatorAddress: normalizeValidatorAddress(validatorAddress),
            amount,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async redelegate({ validatorAddressSrc, validatorAddressDst, amount, gasLimit, memo }) {
      return exec(
        [
          msg.staking.beginRedelegate({
            delegatorAddress: signerAddress,
            validatorSrcAddress: normalizeValidatorAddress(validatorAddressSrc),
            validatorDstAddress: normalizeValidatorAddress(validatorAddressDst),
            amount,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async withdrawRewards({ validatorAddresses, gasLimit, memo }) {
      if (validatorAddresses.length === 0) {
        throw new Error("validatorAddresses must include at least one validator address.");
      }

      // Create one MsgWithdrawDelegatorReward per validator.
      const msgs = validatorAddresses.map((validatorAddress) =>
        msg.distribution.withdrawDelegatorReward({
          delegatorAddress: signerAddress,
          validatorAddress: normalizeValidatorAddress(validatorAddress),
        }),
      );

      return exec(msgs, { gasLimit, memo });
    },
  };
}
