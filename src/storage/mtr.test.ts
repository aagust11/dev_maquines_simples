import { afterEach, describe, expect, it, vi } from 'vitest';
import { encryptSceneToMtr, decryptMtrToScene } from './mtr';
import { CURRENT_EDITOR_SCENE_VERSION, type EditorSceneSnapshot } from '../routes/editor-types';

const SAMPLE_SCENE: EditorSceneSnapshot = {
  editorVersion: CURRENT_EDITOR_SCENE_VERSION,
  elements: [
    {
      id: 'load-1',
      kind: 'load',
      name: 'Càrrega',
      position: { x: 120, y: 180 },
      size: { width: 100, height: 100 },
      anchors: [
        {
          id: 'load-1:load',
          label: 'Load',
          type: 'load',
          offset: { x: 50, y: 50 },
          attachedToLoad: true,
        },
      ],
      data: {},
    },
  ],
  ropePath: ['load-1:load'],
  gravity: 9.81,
  loadMass: 75,
  inputForceOverride: null,
};

function bufferToBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

describe('mtr storage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('encrypts and decrypts scenes symmetrically', async () => {
    const blob = await encryptSceneToMtr(SAMPLE_SCENE);
    const buffer = await blob.arrayBuffer();
    const scene = await decryptMtrToScene(buffer);
    expect(scene).toEqual(SAMPLE_SCENE);
  });

  it('matches the AES-GCM reference vector', async () => {
    const iv = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((array: Uint8Array) => {
      array.set(iv);
      return array;
    });

    const blob = await encryptSceneToMtr(SAMPLE_SCENE);
    const buffer = await blob.arrayBuffer();
    const base64 = bufferToBase64(buffer);

    expect(base64).toBe(
      'TVRSMQEMAAECAwQFBgcICQoLLaVnbLnJDVg4AUzb9Uh5UbznN+Df2WF+3oWo/mS51P5UNSXex+rTuYRunQPIIcJz2hZ2DPlXe8e58CFnSkfd9GLV5USbVGDYf4wzXNse0suxssXfo49t5uXMzwtDVJHS3JyMWSmoj+dSf0Y0i7hXyZ9ANWZse4nS10hSgnQPAYcWAB1d1Ux+jr4m3nj5BY0MTS/J2LgIHnJVyKozEgKZFaG8QGJNYipUbriJom8sxKMGoJ/MSbSkCZ9BVB85vp5xt/i8y46s9JQNL7z0qeCvrqpV6t6W8aCUM2VKpc2j8JXUGKcE2dpr3vjV2SwdWyJ51KgkKKK00FQP7IWYQ0v1l6uacY9VxSLPk1ch9KWO1Dsd9xlA36rNK30fF/jFyqblCf4sHhd9dakerRW3bBEzHp+QBcfaTHIpxv3Lt60cQp/UnjxLs0WLNl5QadXTVSzsc6HpOVlk2oaVzL10ry2TvyD/s0qVgqaC',
    );
  });
});
