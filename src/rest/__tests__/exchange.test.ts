import { describe, it, expect, beforeEach } from "vitest";
import { createExchangeApi, type ExchangeApi } from "../exchange";
import { createMockFetch, mockJsonResponse, type MockFetch } from "../../__tests__/helpers/mock-fetch";
import type { ExchangeMarket, ExchangeOrder, OrderBook } from "../types";

describe("ExchangeApi", () => {
  let api: ExchangeApi;
  let mockFetch: MockFetch;
  let context: { restUrl: string; fetchFn: MockFetch };

  const sampleMarket: ExchangeMarket = {
    id: "1",
    base_denom: "uatom",
    quote_denom: "aault",
    escrow_address: "ault1escrow",
    maker_fee_rate: "0.001",
    taker_fee_rate: "0.002",
    last_price: "100.50",
    last_matching_height: "12345",
  };

  const sampleOrder: ExchangeOrder = {
    id: "order123",
    orderer: "ault1trader",
    market_id: "1",
    is_buy: true,
    price: "100.00",
    quantity: "10",
    msg_height: "12340",
    open_quantity: "5",
    remaining_deposit: "500",
    deadline: "2024-12-01T00:00:00Z",
  };

  const sampleOrderBook: OrderBook = {
    price_interval: "0.01",
    sells: [
      { p: "100.10", q: "50" },
      { p: "100.20", q: "100" },
    ],
    buys: [
      { p: "99.90", q: "75" },
      { p: "99.80", q: "150" },
    ],
  };
  const sampleExchangeParams = {
    market_creation_fee: [{ denom: "aault", amount: "1000" }],
    fees: {
      default_maker_fee_rate: "0.001",
      default_taker_fee_rate: "0.002",
    },
    max_order_lifespan: "86400s",
    max_order_price_ratio: "1.5",
    max_swap_routes_len: 3,
  };

  beforeEach(() => {
    mockFetch = createMockFetch();
    context = {
      restUrl: "https://api.example.com",
      fetchFn: mockFetch,
    };
    api = createExchangeApi(context);
  });

  describe("getParams", () => {
    it("fetches exchange params", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ params: sampleExchangeParams }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      const result = await api.getParams();

      expect(result.params.max_order_lifespan).toBe("86400s");
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/exchange/v1beta1/params",
      );
    });
  });

  describe("getMarkets", () => {
    it("fetches markets list without params", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ markets: [sampleMarket] }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      const result = await api.getMarkets();

      expect(result.markets).toHaveLength(1);
      expect(result.markets[0]).toEqual(sampleMarket);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/exchange/v1beta1/markets",
      );
    });

    it("includes pagination params", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ markets: [] }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      await api.getMarkets({ "pagination.key": "abc", "pagination.limit": 10 });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("pagination.key=abc");
      expect(url).toContain("pagination.limit=10");
    });

    it("handles empty markets response", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ markets: [] }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      const result = await api.getMarkets();

      expect(result.markets).toEqual([]);
    });
  });

  describe("getMarket", () => {
    it("fetches single market by id", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ market: sampleMarket }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      const result = await api.getMarket("1");

      expect(result.market).toEqual(sampleMarket);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/exchange/v1beta1/markets/1",
      );
    });

    it("accepts numeric market id", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ market: sampleMarket }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      await api.getMarket(42);

      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/exchange/v1beta1/markets/42",
      );
    });
  });

  describe("getOrders", () => {
    it("fetches orders without params", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ orders: [sampleOrder] }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      const result = await api.getOrders();

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0]).toEqual(sampleOrder);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/exchange/v1beta1/orders",
      );
    });

    it("filters by orderer", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ orders: [] }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      await api.getOrders({ orderer: "ault1trader" });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("orderer=ault1trader");
    });

    it("filters by market_id", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ orders: [] }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      await api.getOrders({ market_id: "1" });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("market_id=1");
    });

    it("includes pagination and filter params together", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ orders: [] }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      await api.getOrders({
        orderer: "ault1trader",
        market_id: "1",
        "pagination.key": "xyz",
        "pagination.limit": 50,
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("orderer=ault1trader");
      expect(url).toContain("market_id=1");
      expect(url).toContain("pagination.key=xyz");
      expect(url).toContain("pagination.limit=50");
    });
  });

  describe("getOrder", () => {
    it("fetches single order by id", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ order: sampleOrder }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      const result = await api.getOrder("order123");

      expect(result.order).toEqual(sampleOrder);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/exchange/v1beta1/orders/order123",
      );
    });
  });

  describe("getOrderBook", () => {
    it("fetches order book for market without params", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ order_books: [sampleOrderBook] }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      const result = await api.getOrderBook("1");

      expect(result.order_books).toHaveLength(1);
      expect(result.order_books[0]).toEqual(sampleOrderBook);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/exchange/v1beta1/markets/1/order_book",
      );
    });

    it("accepts numeric market id", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ order_books: [] }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      await api.getOrderBook(42);

      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/exchange/v1beta1/markets/42/order_book",
      );
    });

    it("includes level range params", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ order_books: [] }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      await api.getOrderBook("1", { levelStart: 0, levelEnd: 10 });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("level_start=0");
      expect(url).toContain("level_end=10");
    });
  });

  describe("response types", () => {
    it("correctly types market response", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ market: sampleMarket }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      const result = await api.getMarket("1");

      // Type checking - these should compile without errors
      expect(result.market.id).toBe("1");
      expect(result.market.base_denom).toBe("uatom");
      expect(result.market.quote_denom).toBe("aault");
      expect(result.market.maker_fee_rate).toBe("0.001");
      expect(result.market.taker_fee_rate).toBe("0.002");
    });

    it("correctly types order response", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ order: sampleOrder }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      const result = await api.getOrder("order123");

      // Type checking
      expect(result.order.is_buy).toBe(true);
      expect(result.order.price).toBe("100.00");
      expect(result.order.quantity).toBe("10");
      expect(result.order.open_quantity).toBe("5");
    });

    it("correctly types order book response", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ order_books: [sampleOrderBook] }));
      context.fetchFn = mockFetch;
      api = createExchangeApi(context);

      const result = await api.getOrderBook("1");

      // Type checking
      expect(result.order_books[0].price_interval).toBe("0.01");
      expect(result.order_books[0].sells[0].p).toBe("100.10");
      expect(result.order_books[0].sells[0].q).toBe("50");
      expect(result.order_books[0].buys[0].p).toBe("99.90");
    });
  });

  describe("URL construction", () => {
    it("handles trailing slash in base URL", async () => {
      mockFetch = createMockFetch(mockJsonResponse({ params: sampleExchangeParams }));
      context = {
        restUrl: "https://api.example.com/",
        fetchFn: mockFetch,
      };
      api = createExchangeApi(context);

      await api.getParams();

      expect(mockFetch.mock.calls[0][0]).toBe(
        "https://api.example.com/ault/exchange/v1beta1/params",
      );
    });
  });
});
