import { msg } from "../../eip712/builder";
import { toBigInt } from "../address-utils";
import type { ExchangeTxApi } from "../types";
import type { TxModuleContext } from "./context";

export function createExchangeTxApi({ signerAddress, exec }: TxModuleContext): ExchangeTxApi {
  return {
    async placeLimitOrder({ marketId, isBuy, price, quantity, lifespan, gasLimit, memo }) {
      return exec(
        [
          msg.exchange.placeLimitOrder({
            sender: signerAddress,
            marketId: toBigInt(marketId),
            isBuy,
            price,
            quantity,
            lifespan,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async placeMarketOrder({ marketId, isBuy, quantity, gasLimit, memo }) {
      return exec(
        [
          msg.exchange.placeMarketOrder({
            sender: signerAddress,
            marketId: toBigInt(marketId),
            isBuy,
            quantity,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async cancelOrder({ orderId, gasLimit, memo }) {
      return exec(
        [
          msg.exchange.cancelOrder({
            sender: signerAddress,
            orderId,
          }),
        ],
        { gasLimit, memo },
      );
    },

    async cancelAllOrders({ marketId, gasLimit, memo }) {
      return exec(
        [
          msg.exchange.cancelAllOrders({
            sender: signerAddress,
            marketId: toBigInt(marketId),
          }),
        ],
        { gasLimit, memo },
      );
    },

    async createMarket({ baseDenom, quoteDenom, gasLimit, memo }) {
      return exec(
        [
          msg.exchange.createMarket({
            sender: signerAddress,
            baseDenom,
            quoteDenom,
          }),
        ],
        { gasLimit, memo },
      );
    },
  };
}
