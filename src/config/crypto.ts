export const MOMENTOR_MAGIC = new TextEncoder().encode("MTR1");
export const MOMENTOR_VERSION = 1;

export const MTR_KEY_B64 =
  "AAN7jJc2mM0x5yqrxw7dQ0c0vFf1pH3m0jKQ2xgq1sE=";

function decodeBase64Key(source: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(source);
    const output = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      output[i] = binary.charCodeAt(i);
    }
    return output;
  }

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(source, "base64"));
  }

  throw new Error("Entorn sense suport per decodificar base64");
}

export async function getMomentorKey(): Promise<CryptoKey> {
  const raw = decodeBase64Key(MTR_KEY_B64);
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
