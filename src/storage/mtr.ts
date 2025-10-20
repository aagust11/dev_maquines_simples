import { MOMENTOR_MAGIC, MOMENTOR_VERSION, getMomentorKey } from "../config/crypto";
import { CURRENT_EDITOR_SCENE_VERSION, type EditorSceneSnapshot } from "../routes/editor-types";

const te = new TextEncoder();
const td = new TextDecoder();

function concat(...arrays: Uint8Array[]) {
  const out = new Uint8Array(arrays.reduce((sum, arr) => sum + arr.length, 0));
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

function ensureMagic(magic: Uint8Array) {
  if (magic.length !== MOMENTOR_MAGIC.length) {
    return false;
  }
  for (let i = 0; i < MOMENTOR_MAGIC.length; i += 1) {
    if (magic[i] !== MOMENTOR_MAGIC[i]) {
      return false;
    }
  }
  return true;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCanvasAnchor(
  value: unknown,
): value is EditorSceneSnapshot["elements"][number]["anchors"][number] {
  if (!isObject(value)) {
    return false;
  }

  if (typeof value.id !== "string" || value.id.length === 0) {
    return false;
  }

  if (typeof value.label !== "string") {
    return false;
  }

  if (!["fixed", "pulley", "load"].includes(String(value.type))) {
    return false;
  }

  const offset = value.offset;
  if (!isObject(offset) || typeof offset.x !== "number" || typeof offset.y !== "number") {
    return false;
  }

  if (
    value.frictionCoefficient !== undefined &&
    value.frictionCoefficient !== null &&
    typeof value.frictionCoefficient !== "number"
  ) {
    return false;
  }

  if (
    value.defaultWrapAngle !== undefined &&
    value.defaultWrapAngle !== null &&
    typeof value.defaultWrapAngle !== "number"
  ) {
    return false;
  }

  if (
    value.diameter !== undefined &&
    value.diameter !== null &&
    typeof value.diameter !== "number"
  ) {
    return false;
  }

  if (
    value.attachedToLoad !== undefined &&
    value.attachedToLoad !== null &&
    typeof value.attachedToLoad !== "boolean"
  ) {
    return false;
  }

  return true;
}

function isPrimitiveRecord(value: unknown): value is Record<string, number | string | boolean> {
  if (!isObject(value)) {
    return false;
  }

  return Object.values(value).every((entry) => {
    const type = typeof entry;
    return type === "number" || type === "string" || type === "boolean";
  });
}

function isCanvasElement(value: unknown): value is EditorSceneSnapshot["elements"][number] {
  if (!isObject(value)) {
    return false;
  }

  if (typeof value.id !== "string" || value.id.length === 0) {
    return false;
  }

  if (!["fixed", "pulley", "blockAndTackle", "lever", "winch", "load"].includes(String(value.kind))) {
    return false;
  }

  if (typeof value.name !== "string") {
    return false;
  }

  const position = value.position;
  if (!isObject(position) || typeof position.x !== "number" || typeof position.y !== "number") {
    return false;
  }

  const size = value.size;
  if (!isObject(size) || typeof size.width !== "number" || typeof size.height !== "number") {
    return false;
  }

  if (!Array.isArray(value.anchors) || !value.anchors.every((anchor) => isCanvasAnchor(anchor))) {
    return false;
  }

  if (!isPrimitiveRecord(value.data)) {
    return false;
  }

  return true;
}

function validateScene(candidate: unknown): EditorSceneSnapshot {
  if (!isObject(candidate)) {
    throw new Error("Fitxer .mtr malmès: contingut invàlid");
  }

  const { editorVersion, elements, ropePath, gravity, loadMass, inputForceOverride } = candidate;

  if (editorVersion !== CURRENT_EDITOR_SCENE_VERSION) {
    throw new Error(`Versió d'escena no suportada: ${String(editorVersion)}`);
  }

  if (!Array.isArray(elements)) {
    throw new Error("Fitxer .mtr malmès: elements invàlids");
  }

  if (!elements.every((element) => isCanvasElement(element))) {
    throw new Error("Fitxer .mtr malmès: element invàlid");
  }

  if (!Array.isArray(ropePath) || !ropePath.every((item) => typeof item === "string")) {
    throw new Error("Fitxer .mtr malmès: traçat invàlid");
  }

  if (typeof gravity !== "number" || Number.isNaN(gravity)) {
    throw new Error("Fitxer .mtr malmès: gravetat invàlida");
  }

  if (typeof loadMass !== "number" || Number.isNaN(loadMass)) {
    throw new Error("Fitxer .mtr malmès: massa invàlida");
  }

  if (
    inputForceOverride !== undefined &&
    inputForceOverride !== null &&
    (typeof inputForceOverride !== "number" || Number.isNaN(inputForceOverride))
  ) {
    throw new Error("Fitxer .mtr malmès: override de força invàlid");
  }

  return {
    editorVersion: CURRENT_EDITOR_SCENE_VERSION,
    elements: elements as EditorSceneSnapshot["elements"],
    ropePath: ropePath as string[],
    gravity,
    loadMass,
    inputForceOverride: inputForceOverride ?? null,
  };
}

export type Scene = EditorSceneSnapshot;

export async function encryptSceneToMtr(scene: Scene): Promise<Blob> {
  const key = await getMomentorKey();
  const json = te.encode(JSON.stringify(scene));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, json);
  const cipher = new Uint8Array(cipherBuffer);
  if (cipher.length < 16) {
    throw new Error("Error d'encriptació: etiqueta GCM absent");
  }
  const tag = cipher.slice(cipher.length - 16);
  const ct = cipher.slice(0, cipher.length - 16);
  const header = new Uint8Array([MOMENTOR_VERSION, iv.length]);
  const file = concat(MOMENTOR_MAGIC, header, iv, ct, tag);
  return new Blob([file], { type: "application/octet-stream" });
}

export async function decryptMtrToScene(buffer: ArrayBuffer): Promise<Scene> {
  const bytes = new Uint8Array(buffer);
  const minimumLength = MOMENTOR_MAGIC.length + 2 + 12 + 16;
  if (bytes.length < minimumLength) {
    throw new Error("Fitxer .mtr malmès: massa curt");
  }

  const magic = bytes.slice(0, MOMENTOR_MAGIC.length);
  if (!ensureMagic(magic)) {
    throw new Error("Fitxer .mtr malmès: encapçalament MTR1 invàlid");
  }

  const version = bytes[MOMENTOR_MAGIC.length];
  if (version !== MOMENTOR_VERSION) {
    throw new Error(`Versió .mtr no suportada: ${version}`);
  }

  const ivLength = bytes[MOMENTOR_MAGIC.length + 1];
  const ivStart = MOMENTOR_MAGIC.length + 2;
  const ivEnd = ivStart + ivLength;
  if (ivLength !== 12 || ivEnd > bytes.length) {
    throw new Error("Fitxer .mtr malmès: IV invàlid");
  }
  const iv = bytes.slice(ivStart, ivEnd);

  const payload = bytes.slice(ivEnd);
  if (payload.length < 16) {
    throw new Error("Fitxer .mtr malmès: etiqueta GCM absent");
  }

  const tag = payload.slice(payload.length - 16);
  const ct = payload.slice(0, payload.length - 16);
  const key = await getMomentorKey();
  const cipher = new Uint8Array(ct.length + tag.length);
  cipher.set(ct, 0);
  cipher.set(tag, ct.length);

  let plainBuffer: ArrayBuffer;
  try {
    plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  } catch (error) {
    throw new Error("Clau Momentor incorrecta o fitxer malmès");
  }

  const decoded = td.decode(new Uint8Array(plainBuffer));
  const parsed = JSON.parse(decoded) as unknown;
  return validateScene(parsed);
}
