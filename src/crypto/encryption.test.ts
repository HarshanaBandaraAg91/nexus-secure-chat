import { describe, it, expect } from 'vitest';
import {
  generateRoomKey,
  encryptMessage,
  decryptMessage,
  exportKeyToBase64,
  importKeyFromBase64,
} from './encryption';
import {
  generateSalt,
  generateSecureSessionToken,
  deriveKeyWrappingKey,
  wrapRoomMasterKey,
  unwrapRoomMasterKey,
  computeAccessVerifier,
} from './keyManagement';

describe('Web Crypto AES-256-GCM Engine', () => {
  it('should generate a valid 256-bit AES-GCM key and encrypt/decrypt messages correctly', async () => {
    const key = await generateRoomKey();
    const plaintext = 'Confidential Mission Payload: 0xDEADBEEF 🔒';

    const { ciphertext, iv } = await encryptMessage(plaintext, key);

    expect(ciphertext).toBeDefined();
    expect(iv).toBeDefined();
    expect(ciphertext).not.toBe(plaintext);

    const decrypted = await decryptMessage(ciphertext, iv, key);
    expect(decrypted).toBe(plaintext);
  });

  it('should ALWAYS generate unique IVs for consecutive encryptions of the same plaintext', async () => {
    const key = await generateRoomKey();
    const plaintext = 'Secret Message';

    const enc1 = await encryptMessage(plaintext, key);
    const enc2 = await encryptMessage(plaintext, key);
    const enc3 = await encryptMessage(plaintext, key);

    // IVs must be distinct
    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc2.iv).not.toBe(enc3.iv);
    expect(enc1.iv).not.toBe(enc3.iv);

    // Ciphertexts must also be distinct due to distinct IVs
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);
  });

  it('should export and re-import keys faithfully', async () => {
    const originalKey = await generateRoomKey();
    const exported = await exportKeyToBase64(originalKey);
    const importedKey = await importKeyFromBase64(exported);

    const plaintext = 'Verify Key Export';
    const { ciphertext, iv } = await encryptMessage(plaintext, originalKey);
    const decrypted = await decryptMessage(ciphertext, iv, importedKey);

    expect(decrypted).toBe(plaintext);
  });

  it('should fail decryption when ciphertext or IV is tampered with', async () => {
    const key = await generateRoomKey();
    const { ciphertext, iv } = await encryptMessage('Original Message', key);

    const tamperedCiphertext = ciphertext.slice(0, -4) + 'AAAA';

    await expect(decryptMessage(tamperedCiphertext, iv, key)).rejects.toThrow();
  });
});

describe('Key Derivation & Wrapping (PBKDF2 + AES-GCM)', () => {
  it('should securely wrap and unwrap a master room key with derived KWK', async () => {
    const masterRoomKey = await generateRoomKey();
    const salt = generateSalt();
    const sessionToken = generateSecureSessionToken();
    const userSecret = `434:1133:${sessionToken}`;

    const kwk = await deriveKeyWrappingKey(userSecret, salt);
    const { wrappedKey, iv } = await wrapRoomMasterKey(masterRoomKey, kwk);

    // Unwrap with identical secret
    const unwrappedMasterKey = await unwrapRoomMasterKey(wrappedKey, iv, kwk);

    // Test that unwrapped master key can encrypt/decrypt seamlessly
    const testMsg = 'Testing wrapped key integrity';
    const encrypted = await encryptMessage(testMsg, masterRoomKey);
    const decrypted = await decryptMessage(encrypted.ciphertext, encrypted.iv, unwrappedMasterKey);

    expect(decrypted).toBe(testMsg);
  });

  it('should fail unwrapping when an invalid secret/KWK is provided', async () => {
    const masterRoomKey = await generateRoomKey();
    const salt = generateSalt();
    const sessionToken = generateSecureSessionToken();
    const correctSecret = `434:1133:${sessionToken}`;
    const wrongSecret = `434:9999:${sessionToken}`;

    const correctKWK = await deriveKeyWrappingKey(correctSecret, salt);
    const wrongKWK = await deriveKeyWrappingKey(wrongSecret, salt);

    const { wrappedKey, iv } = await wrapRoomMasterKey(masterRoomKey, correctKWK);

    // Attempting unwrap with wrong KWK should fail cryptographic authentication
    await expect(unwrapRoomMasterKey(wrappedKey, iv, wrongKWK)).rejects.toThrow();
  });

  it('should compute deterministic hashes for security verification', async () => {
    const salt = generateSalt();
    const hash1 = await computeAccessVerifier('1133', salt);
    const hash2 = await computeAccessVerifier('1133', salt);
    const hashDifferent = await computeAccessVerifier('2266', salt);

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDifferent);
  });
});
