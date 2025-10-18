import { sceneSchema, Scene } from '../domain/scene';

const KEY_HEX = '3f0c1d2e4b5a69788796a5b4c3d2e1f0cafebabefeedc0de1122334455667788';
const IV_LENGTH = 12;

const hexToUint8Array = (hex: string): Uint8Array => {
  const clean = hex.replace(/[^0-9a-f]/gi, '');
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const array = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    array[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return array;
};

const bufferToBase64 = (buffer: ArrayBuffer): string => {
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }
  throw new Error('Entorn sense suport de base64 disponible');
};

const base64ToBuffer = (base64: string): ArrayBuffer => {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64').buffer;
  }
  throw new Error('Entorn sense suport de base64 disponible');
};

const getKey = async (): Promise<CryptoKey> => {
  const keyData = hexToUint8Array(KEY_HEX);
  return crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['encrypt', 'decrypt']);
};

export const encodeScene = async (scene: Scene): Promise<string> => {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const payload = new TextEncoder().encode(JSON.stringify(scene));
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
  const packed = new Uint8Array(iv.byteLength + cipherBuffer.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(cipherBuffer), iv.byteLength);
  return bufferToBase64(packed.buffer);
};

export const decodeScene = async (encoded: string): Promise<Scene> => {
  const data = new Uint8Array(base64ToBuffer(encoded));
  const iv = data.slice(0, IV_LENGTH);
  const cipher = data.slice(IV_LENGTH);
  const key = await getKey();
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  const json = new TextDecoder().decode(decrypted);
  const parsed = JSON.parse(json);
  return sceneSchema.parse(parsed);
};
