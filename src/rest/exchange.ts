import { fetchRest, type RestContext } from "./context";
import type { ExchangeMarket, ExchangeOrder, OrderBook, ExchangeParams, PageResponse } from "./types";
import {
  ExchangeParamsResponseSchema,
  MarketsResponseSchema,
  MarketResponseSchema,
  OrdersResponseSchema,
  OrderResponseSchema,
  OrderBookResponseSchema,
} from "./types";
import { buildQuery } from "../core/query";

export interface ExchangeApi {
  getParams: () => Promise<{ params: ExchangeParams }>;
  getMarkets: (params?: {
    "pagination.key"?: string;
    "pagination.limit"?: number;
  }) => Promise<{ markets: ExchangeMarket[]; pagination?: PageResponse }>;
  getMarket: (marketId: string | number) => Promise<{ market: ExchangeMarket }>;
  getOrders: (params?: {
    orderer?: string;
    market_id?: string | number;
    "pagination.key"?: string;
    "pagination.limit"?: number;
  }) => Promise<{
    orders: ExchangeOrder[];
    pagination?: PageResponse;
  }>;
  getOrder: (orderId: string) => Promise<{ order: ExchangeOrder }>;
  getOrderBook: (
    marketId: string | number,
    params?: { levelStart?: number; levelEnd?: number },
  ) => Promise<{
    order_books: OrderBook[];
  }>;
}

export function createExchangeApi(context: RestContext): ExchangeApi {
  return {
    async getParams() {
      return fetchRest(
        context,
        "/ault/exchange/v1beta1/params",
        undefined,
        ExchangeParamsResponseSchema,
      );
    },
    async getMarkets(params = {}) {
      const query = buildQuery({
        "pagination.key": params["pagination.key"],
        "pagination.limit": params["pagination.limit"],
      });
      return fetchRest(
        context,
        `/ault/exchange/v1beta1/markets${query}`,
        undefined,
        MarketsResponseSchema,
      );
    },
    async getMarket(marketId) {
      return fetchRest(
        context,
        `/ault/exchange/v1beta1/markets/${marketId}`,
        undefined,
        MarketResponseSchema,
      );
    },
    async getOrders(params = {}) {
      const query = buildQuery({
        orderer: params.orderer,
        market_id: params.market_id,
        "pagination.key": params["pagination.key"],
        "pagination.limit": params["pagination.limit"],
      });
      return fetchRest(
        context,
        `/ault/exchange/v1beta1/orders${query}`,
        undefined,
        OrdersResponseSchema,
      );
    },
    async getOrder(orderId) {
      return fetchRest(
        context,
        `/ault/exchange/v1beta1/orders/${orderId}`,
        undefined,
        OrderResponseSchema,
      );
    },
    async getOrderBook(marketId, params = {}) {
      const query = buildQuery({
        level_start: params.levelStart,
        level_end: params.levelEnd,
      });
      return fetchRest(
        context,
        `/ault/exchange/v1beta1/markets/${marketId}/order_book${query}`,
        undefined,
        OrderBookResponseSchema,
      );
    },
  };
}
