import { BinaryWriter } from "../tx-encode";
import { base64ToBytes, type Base64String } from "../../core/base64";

export interface MsgCreateMarket {
  sender: string;
  base_denom: string;
  quote_denom: string;
}

export const MsgCreateMarket = {
  typeUrl: "/ault.exchange.v1beta1.MsgCreateMarket",
  aminoType: "exchange/MsgCreateMarket",
  encode(message: MsgCreateMarket): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.sender);
    writer.writeString(2, message.base_denom);
    writer.writeString(3, message.quote_denom);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgCreateMarket>): MsgCreateMarket {
    return {
      sender: object.sender ?? "",
      base_denom: object.base_denom ?? "",
      quote_denom: object.quote_denom ?? "",
    };
  },
};

export interface MsgPlaceLimitOrder {
  sender: string;
  market_id: bigint;
  is_buy: boolean;
  price: string;
  quantity: string;
  lifespan: bigint;
}

function encodeDurationFromNanoseconds(nanos: bigint): Uint8Array {
  const seconds = nanos / 1_000_000_000n;
  const nanosRemainder = Number(nanos % 1_000_000_000n);
  const writer = new BinaryWriter();
  writer.writeUint64(1, seconds);
  writer.writeInt32(2, nanosRemainder);
  return writer.finish();
}

export const MsgPlaceLimitOrder = {
  typeUrl: "/ault.exchange.v1beta1.MsgPlaceLimitOrder",
  aminoType: "exchange/MsgPlaceLimitOrder",
  encode(message: MsgPlaceLimitOrder): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.sender);
    writer.writeUint64(2, message.market_id);
    writer.writeBool(3, message.is_buy);
    writer.writeString(4, message.price);
    writer.writeString(5, message.quantity);
    const durationBytes = encodeDurationFromNanoseconds(message.lifespan);
    writer.writeBytes(6, durationBytes);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgPlaceLimitOrder>): MsgPlaceLimitOrder {
    return {
      sender: object.sender ?? "",
      market_id: object.market_id ?? 0n,
      is_buy: object.is_buy ?? false,
      price: object.price ?? "",
      quantity: object.quantity ?? "",
      lifespan: object.lifespan ?? 0n,
    };
  },
};

export interface MsgPlaceMarketOrder {
  sender: string;
  market_id: bigint;
  is_buy: boolean;
  quantity: string;
}

export const MsgPlaceMarketOrder = {
  typeUrl: "/ault.exchange.v1beta1.MsgPlaceMarketOrder",
  aminoType: "exchange/MsgPlaceMarketOrder",
  encode(message: MsgPlaceMarketOrder): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.sender);
    writer.writeUint64(2, message.market_id);
    writer.writeBool(3, message.is_buy);
    writer.writeString(4, message.quantity);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgPlaceMarketOrder>): MsgPlaceMarketOrder {
    return {
      sender: object.sender ?? "",
      market_id: object.market_id ?? 0n,
      is_buy: object.is_buy ?? false,
      quantity: object.quantity ?? "",
    };
  },
};

export interface MsgCancelOrder {
  sender: string;
  order_id: Base64String;
}

export const MsgCancelOrder = {
  typeUrl: "/ault.exchange.v1beta1.MsgCancelOrder",
  aminoType: "exchange/MsgCancelOrder",
  encode(message: MsgCancelOrder): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.sender);
    writer.writeBytes(2, base64ToBytes(message.order_id));
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgCancelOrder>): MsgCancelOrder {
    return {
      sender: object.sender ?? "",
      order_id: (object.order_id ?? "") as Base64String,
    };
  },
};

export interface MsgCancelAllOrders {
  sender: string;
  market_id: bigint;
}

export const MsgCancelAllOrders = {
  typeUrl: "/ault.exchange.v1beta1.MsgCancelAllOrders",
  aminoType: "exchange/MsgCancelAllOrders",
  encode(message: MsgCancelAllOrders): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.sender);
    writer.writeUint64(2, message.market_id);
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgCancelAllOrders>): MsgCancelAllOrders {
    return {
      sender: object.sender ?? "",
      market_id: object.market_id ?? 0n,
    };
  },
};

export interface MarketParamUpdate {
  market_id: bigint;
  maker_fee_rate: string;
  taker_fee_rate: string;
}

function encodeMarketParamUpdate(update: MarketParamUpdate): Uint8Array {
  const writer = new BinaryWriter();
  writer.writeUint64(1, update.market_id);
  writer.writeString(2, update.maker_fee_rate);
  writer.writeString(3, update.taker_fee_rate);
  return writer.finish();
}

export interface MsgUpdateMarketParams {
  authority: string;
  updates: MarketParamUpdate[];
}

export const MsgUpdateMarketParams = {
  typeUrl: "/ault.exchange.v1beta1.MsgUpdateMarketParams",
  aminoType: "exchange/MsgUpdateMarketParams",
  encode(message: MsgUpdateMarketParams): { finish(): Uint8Array } {
    const writer = new BinaryWriter();
    writer.writeString(1, message.authority);
    for (const update of message.updates) {
      writer.writeBytes(2, encodeMarketParamUpdate(update));
    }
    return { finish: () => writer.finish() };
  },
  fromPartial(object: Partial<MsgUpdateMarketParams>): MsgUpdateMarketParams {
    return {
      authority: object.authority ?? "",
      updates: object.updates ?? [],
    };
  },
};
