// Minimal protobuf encoder for Cosmos TxRaw and related types.

const WIRE_VARINT = 0;
const WIRE_LENGTH_DELIMITED = 2;

export class BinaryWriter {
  private chunks: Uint8Array[] = [];

  writeVarint(value: bigint | number): this {
    let v = BigInt(value);
    const bytes: number[] = [];
    do {
      let byte = Number(v & 0x7fn);
      v >>= 7n;
      if (v > 0n) byte |= 0x80;
      bytes.push(byte);
    } while (v > 0n);
    this.chunks.push(new Uint8Array(bytes));
    return this;
  }

  writeTag(fieldNumber: number, wireType: number): this {
    return this.writeVarint((fieldNumber << 3) | wireType);
  }

  writeString(fieldNumber: number, value: string): this {
    if (!value) return this;
    this.writeTag(fieldNumber, WIRE_LENGTH_DELIMITED);
    const bytes = new TextEncoder().encode(value);
    this.writeVarint(bytes.length);
    this.chunks.push(bytes);
    return this;
  }

  writeBool(fieldNumber: number, value: boolean): this {
    if (!value) return this;
    this.writeTag(fieldNumber, WIRE_VARINT);
    this.writeVarint(value ? 1 : 0);
    return this;
  }

  writeUint64(fieldNumber: number, value: bigint | number): this {
    const v = BigInt(value);
    if (v === 0n) return this;
    this.writeTag(fieldNumber, WIRE_VARINT);
    this.writeVarint(v);
    return this;
  }

  writeInt32(fieldNumber: number, value: number): this {
    if (value === 0) return this;
    this.writeTag(fieldNumber, WIRE_VARINT);
    this.writeVarint(value);
    return this;
  }

  writeBytes(fieldNumber: number, value: Uint8Array): this {
    if (value.length === 0) return this;
    this.writeTag(fieldNumber, WIRE_LENGTH_DELIMITED);
    this.writeVarint(value.length);
    this.chunks.push(value);
    return this;
  }

  writeRepeatedString(fieldNumber: number, values: string[]): this {
    for (const value of values) {
      this.writeString(fieldNumber, value);
    }
    return this;
  }

  writeRepeatedUint64(fieldNumber: number, values: (bigint | number)[]): this {
    for (const value of values) {
      this.writeTag(fieldNumber, WIRE_VARINT);
      this.writeVarint(BigInt(value));
    }
    return this;
  }

  writeRepeatedBytes(fieldNumber: number, values: Uint8Array[]): this {
    for (const value of values) {
      this.writeBytes(fieldNumber, value);
    }
    return this;
  }

  finish(): Uint8Array {
    const total = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }
}

export function encodeAny(typeUrl: string, value: Uint8Array): Uint8Array {
  const writer = new BinaryWriter();
  writer.writeString(1, typeUrl);
  writer.writeBytes(2, value);
  return writer.finish();
}

export function encodeCoin(denom: string, amount: string): Uint8Array {
  const writer = new BinaryWriter();
  writer.writeString(1, denom);
  writer.writeString(2, amount);
  return writer.finish();
}

export interface TxFee {
  amount: { denom: string; amount: string }[];
  gasLimit: bigint | number;
}

export function encodeFee(fee: TxFee): Uint8Array {
  const writer = new BinaryWriter();
  for (const coin of fee.amount) {
    const coinBytes = encodeCoin(coin.denom, coin.amount);
    writer.writeBytes(1, coinBytes);
  }
  writer.writeUint64(2, fee.gasLimit);
  return writer.finish();
}

export function encodeModeInfoSingle(mode: number): Uint8Array {
  const writer = new BinaryWriter();
  writer.writeInt32(1, mode);
  return writer.finish();
}

export function encodeModeInfo(mode: number): Uint8Array {
  const writer = new BinaryWriter();
  const singleBytes = encodeModeInfoSingle(mode);
  writer.writeBytes(1, singleBytes);
  return writer.finish();
}

export interface SignerInfo {
  publicKey: { typeUrl: string; value: Uint8Array };
  sequence: bigint | number | string;
  mode: number;
}

export function encodeSignerInfo(info: SignerInfo): Uint8Array {
  const writer = new BinaryWriter();
  const pubKeyAny = encodeAny(info.publicKey.typeUrl, info.publicKey.value);
  writer.writeBytes(1, pubKeyAny);
  const modeInfoBytes = encodeModeInfo(info.mode);
  writer.writeBytes(2, modeInfoBytes);
  writer.writeUint64(3, typeof info.sequence === "string" ? BigInt(info.sequence) : info.sequence);
  return writer.finish();
}

export interface AuthInfo {
  signerInfos: SignerInfo[];
  fee: TxFee;
}

export function encodeAuthInfo(authInfo: AuthInfo): Uint8Array {
  const writer = new BinaryWriter();
  for (const signerInfo of authInfo.signerInfos) {
    writer.writeBytes(1, encodeSignerInfo(signerInfo));
  }
  writer.writeBytes(2, encodeFee(authInfo.fee));
  return writer.finish();
}

export interface TxBody {
  messages: { typeUrl: string; value: Uint8Array }[];
  memo: string;
  timeoutHeight?: bigint | number;
}

export function encodeTxBody(body: TxBody): Uint8Array {
  const writer = new BinaryWriter();
  for (const msg of body.messages) {
    writer.writeBytes(1, encodeAny(msg.typeUrl, msg.value));
  }
  if (body.memo) {
    writer.writeString(2, body.memo);
  }
  if (body.timeoutHeight) {
    writer.writeUint64(3, body.timeoutHeight);
  }
  return writer.finish();
}

export interface TxRaw {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
  signatures: Uint8Array[];
}

export function encodeTxRaw(txRaw: TxRaw): Uint8Array {
  const writer = new BinaryWriter();
  writer.writeBytes(1, txRaw.bodyBytes);
  writer.writeBytes(2, txRaw.authInfoBytes);
  writer.writeRepeatedBytes(3, txRaw.signatures);
  return writer.finish();
}

export function encodeEthSecp256k1PubKey(key: Uint8Array): Uint8Array {
  const writer = new BinaryWriter();
  writer.writeBytes(1, key);
  return writer.finish();
}

export const SIGN_MODE_LEGACY_AMINO_JSON = 127;
