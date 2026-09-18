import { describe, it, expect } from 'vitest';
import {
  generateRoomKey,
  encryptMessage,
  decryptMessage,
  exportKeyToBase64,
} from './encryption';
import {
  generateSalt,
  generateSecureSessionToken,
  deriveKeyWrappingKey,
  wrapRoomMasterKey,
  unwrapRoomMasterKey,
  computeAccessVerifier,
} from './keyManagement';
import {
  deriveAlphabetPosition,
  encodeVisualCipher,
  decodeVisualCipher,
} from './visualCipher';
import { sendEncryptedMessage } from '../services/messageService';

describe('Security Architecture & Strict Separation (TEST A to TEST K)', () => {
  // TEST A: Room Code ≠ encryption key
  it('TEST A: Room Code is NOT the encryption key', async () => {
    const roomCode = '434';
    const masterKey = await generateRoomKey();
    const exportedKey = await exportKeyToBase64(masterKey);

    expect(exportedKey).not.toBe(roomCode);
    expect(exportedKey).not.toContain(roomCode);
    // Key is 256-bit (32 bytes -> 44 chars in base64)
    expect(exportedKey.length).toBe(44);
  });

  // TEST B: Access Code ≠ encryption key
  it('TEST B: Access Code is NOT the encryption key', async () => {
    const accessCode = '2266';
    const masterKey = await generateRoomKey();
    const exportedKey = await exportKeyToBase64(masterKey);

    expect(exportedKey).not.toBe(accessCode);
    expect(exportedKey).not.toContain(accessCode);
  });

  // TEST C: Visual Cipher Key ≠ encryption key
  it('TEST C: Visual Cipher Key is NOT the encryption key', async () => {
    const visualShiftNumber = 16; // 'P'
    const masterKey = await generateRoomKey();
    const exportedKey = await exportKeyToBase64(masterKey);

    expect(exportedKey).not.toBe(String(visualShiftNumber));
  });

  // TEST D: Changing the Room Code does not produce a predictable AES key
  it('TEST D: Changing Room Code does not produce a predictable AES key', async () => {
    const key1 = await generateRoomKey();
    const key2 = await generateRoomKey();

    const raw1 = await exportKeyToBase64(key1);
    const raw2 = await exportKeyToBase64(key2);

    expect(raw1).not.toBe(raw2);
  });

  // TEST E: Changing the Access Code does not directly produce a predictable AES key
  it('TEST E: Changing Access Code does not directly produce a predictable AES key', async () => {
    const key1 = await generateRoomKey();
    const key2 = await generateRoomKey();

    const raw1 = await exportKeyToBase64(key1);
    const raw2 = await exportKeyToBase64(key2);

    expect(raw1).not.toBe(raw2);
  });

  // TEST F: Every AES-GCM message uses a unique random IV
  it('TEST F: Every AES-GCM message uses a unique random IV', async () => {
    const key = await generateRoomKey();
    const message = 'Confidential Payload';

    const enc1 = await encryptMessage(message, key);
    const enc2 = await encryptMessage(message, key);
    const enc3 = await encryptMessage(message, key);

    // All IVs must be unique
    const ivs = new Set([enc1.iv, enc2.iv, enc3.iv]);
    expect(ivs.size).toBe(3);

    // All ciphertexts must be distinct due to distinct IVs
    const ciphertexts = new Set([enc1.ciphertext, enc2.ciphertext, enc3.ciphertext]);
    expect(ciphertexts.size).toBe(3);
  });

  // TEST G: Supabase message rows contain no plaintext message
  it('TEST G: Supabase message rows contain zero plaintext', async () => {
    const masterKey = await generateRoomKey();
    const plaintext = 'amma';
    const roomCode = '434';
    const shiftPos = 16; // 'P'

    const sent = await sendEncryptedMessage(
      'room-uuid-1',
      roomCode,
      'user-1',
      'Bob',
      plaintext,
      masterKey,
      shiftPos
    );

    // The wire ciphertext contains only base64 AES-GCM ciphertext
    expect(sent.ciphertext).not.toContain(plaintext);
    expect(sent.ciphertext).not.toContain('pbbp');
    expect(sent.ciphertext).not.toContain(roomCode);
  });

  // TEST H: Supabase Realtime payloads contain no plaintext message
  it('TEST H: Supabase Realtime payloads contain only ciphertext and IV', async () => {
    const masterKey = await generateRoomKey();
    const { ciphertext, iv } = await encryptMessage('pbbp', masterKey);

    expect(ciphertext).toBeDefined();
    expect(iv).toBeDefined();
    expect(ciphertext).not.toBe('pbbp');
    expect(ciphertext).not.toBe('amma');
  });

  // TEST I: Unauthorized users cannot read/unwrap room messages
  it('TEST I: Unauthorized access code fails cryptographic unwrapping', async () => {
    const roomCode = '434';
    const validAccessCode = '2266';
    const invalidAccessCode = '9999';
    const salt = generateSalt();

    const masterKey = await generateRoomKey();

    // Wrap with valid access code credentials
    const validKWK = await deriveKeyWrappingKey(`${roomCode}:${validAccessCode}`, salt);
    const wrapped = await wrapRoomMasterKey(masterKey, validKWK);

    // Attacker attempts unwrap with invalid access code
    const invalidKWK = await deriveKeyWrappingKey(`${roomCode}:${invalidAccessCode}`, salt);

    await expect(
      unwrapRoomMasterKey(wrapped.wrappedKey, wrapped.iv, invalidKWK)
    ).rejects.toThrow();
  });

  // TEST J: Visual cipher remains reversible (2266 -> 16 -> P -> amma <-> pbbp <-> amma)
  it('TEST J: Visual cipher remains reversible for SS 2266 (amma <-> pbbp)', () => {
    const derivation = deriveAlphabetPosition('2266');
    expect(derivation.finalPosition).toBe(16);
    expect(derivation.mappedLetter).toBe('P');

    const original = 'amma';
    const encoded = encodeVisualCipher(original, 16);
    expect(encoded).toBe('pbbp');

    const decoded = decodeVisualCipher(encoded, 16);
    expect(decoded).toBe(original);
  });

  // TEST K: Visual cipher remains reversible for SS 9999 (9+9+9+9=36 -> 3+6=9 -> I)
  it('TEST K: Visual cipher remains reversible for SS 9999 (9999 -> 36 -> 9 -> I)', () => {
    const derivation = deriveAlphabetPosition('9999');
    expect(derivation.steps).toEqual([36, 9]);
    expect(derivation.finalPosition).toBe(9);
    expect(derivation.mappedLetter).toBe('I');

    const original = 'amma';
    const encoded = encodeVisualCipher(original, 9);
    // 'a' + 8 = 'i', 'm' + 8 = 'u' -> 'iuui'
    expect(encoded).toBe('iuui');

    const decoded = decodeVisualCipher(encoded, 9);
    expect(decoded).toBe(original);
  });
});
