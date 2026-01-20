type BufferLike = {
  from: (
    data: Uint8Array | string,
    encoding?: string,
  ) => Uint8Array & { toString: (enc: string) => string };
};

export type Base64String = string & { __brand: "Base64String" };

const BASE64_PATTERN = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function getBufferConstructor(): BufferLike | null {
  const buffer = (globalThis as { Buffer?: BufferLike }).Buffer;
  if (!buffer || typeof buffer.from !== "function") {
    return null;
  }
  return buffer;
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  const buffer = getBufferConstructor();
  if (buffer) {
    return buffer.from(bytes).toString("base64");
  }
  throw new Error("No base64 encoder available in this runtime.");
}

export function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const buffer = getBufferConstructor();
  if (buffer) {
    return new Uint8Array(buffer.from(base64, "base64"));
  }
  throw new Error("No base64 decoder available in this runtime.");
}

export function isBase64String(value: string, allowEmpty = true): boolean {
  if (value === "") {
    return allowEmpty;
  }
  return BASE64_PATTERN.test(value);
}

export function asBase64String(value: string, allowEmpty = true): Base64String {
  if (!isBase64String(value, allowEmpty)) {
    throw new Error("Expected base64 string.");
  }
  return value as Base64String;
}
