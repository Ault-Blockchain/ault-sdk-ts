import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "../../high-level-client";
import { getNetworkConfig } from "../../core/network";
import { signAndBroadcastEip712 } from "../../eip712/sign-and-broadcast";

vi.mock("../../eip712/sign-and-broadcast", () => ({
  signAndBroadcastEip712: vi.fn(),
}));

const signAndBroadcastMock = vi.mocked(signAndBroadcastEip712);

describe("High-level client exchange txs", () => {
  const network = getNetworkConfig("ault_10904-1");
  const signerAddress = "ault1t08rcxffmgr4xdv39tg0fy5r0y7a6up459grhu";

  beforeEach(() => {
    signAndBroadcastMock.mockReset();
    signAndBroadcastMock.mockResolvedValue({
      txHash: "0xabc",
      code: 0,
      rawLog: "",
    });
  });

  it("builds MsgPlaceLimitOrder with bigint market id", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.placeLimitOrder({
      marketId: "7",
      isBuy: true,
      price: "10.5",
      quantity: "2",
      lifespan: { seconds: 300n, nanos: 0 },
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.exchange.v1beta1.MsgPlaceLimitOrder",
      value: {
        sender: signerAddress,
        marketId: 7n,
        isBuy: true,
        price: "10.5",
        quantity: "2",
        lifespan: { seconds: 300n, nanos: 0 },
      },
    });
  });

  it("builds MsgPlaceMarketOrder", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.placeMarketOrder({
      marketId: 3,
      isBuy: false,
      quantity: "5",
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.exchange.v1beta1.MsgPlaceMarketOrder",
      value: {
        sender: signerAddress,
        marketId: 3n,
        isBuy: false,
        quantity: "5",
      },
    });
  });

  it("builds MsgCancelOrder", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.cancelOrder({
      orderId: new Uint8Array([1, 2, 3]),
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.exchange.v1beta1.MsgCancelOrder",
      value: {
        sender: signerAddress,
        orderId: new Uint8Array([1, 2, 3]),
      },
    });
  });

  it("builds MsgCreateMarket", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.createMarket({
      baseDenom: "uatom",
      quoteDenom: "aault",
    });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.exchange.v1beta1.MsgCreateMarket",
      value: {
        sender: signerAddress,
        baseDenom: "uatom",
        quoteDenom: "aault",
      },
    });
  });

  it("builds MsgCancelAllOrders with bigint market id", async () => {
    const client = await createClient({
      network,
      signer: { signTypedData: vi.fn() },
      signerAddress,
    });

    await client.cancelAllOrders({ marketId: "9" });

    const call = signAndBroadcastMock.mock.calls[0][0];
    expect(call.msgs[0]).toMatchObject({
      typeUrl: "/ault.exchange.v1beta1.MsgCancelAllOrders",
      value: {
        sender: signerAddress,
        marketId: 9n,
      },
    });
  });
});
