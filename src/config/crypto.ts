export const MOMENTOR_MAGIC = new TextEncoder().encode("MTR1");
export const MOMENTOR_VERSION = 1;

export const MTR_KEY_B64 =
  "AAN7jJc2mM0x5yqrxw7dQ0c0vFf1pH3m0jKQ2xgq1sE=";

type BufferNamespace = {
  from(input: string, encoding: string): ArrayLike<number>;
};

function decodeBase64Key(source: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(source);
    const output = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      output[i] = binary.charCodeAt(i);
    }
    return output;
  }

  const maybeBuffer = (globalThis as { Buffer?: BufferNamespace }).Buffer;
  if (maybeBuffer) {
    return Uint8Array.from(maybeBuffer.from(source, "base64"));
  }

  throw new Error("Entorn sense suport per decodificar base64");
}

export async function getMomentorKey(): Promise<CryptoKey> {
  const raw = decodeBase64Key(MTR_KEY_B64);
  const rawBuffer = raw.buffer.slice(
    raw.byteOffset,
    raw.byteOffset + raw.byteLength
  ) as ArrayBuffer;
  return crypto.subtle.importKey("raw", rawBuffer, "AES-GCM", false, ["encrypt", "decrypt"]);
}
