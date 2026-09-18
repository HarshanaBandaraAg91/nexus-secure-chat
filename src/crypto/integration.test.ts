import { describe, it, expect } from 'vitest';
import {
  generateRoomKey,
  encryptMessage,
  decryptMessage,
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

describe('End-to-End Cryptographic Scenario & Acceptance Test', () => {
  it('Scenario: Bob creates room 434 (Access: 1133), Lal joins (Access: 2266), Bob sends "amma" -> visual "pbbp" -> AES wire -> Lal decrypts AES -> visual decode -> "amma"', async () => {
    const roomCode = '434';
    const bobAccessCode = '1133';
    const lalAccessCode = '2266';
    const roomSalt = generateSalt();
    const sessionSalt = generateSalt();
    const sessionToken = generateSecureSessionToken();

    // 1. Bob creates master 256-bit AES-GCM room key
    const masterRoomKey = await generateRoomKey();

    // 2. Wrap keys for Bob (Creator) and Lal (Guest)
    const bobKWK = await deriveKeyWrappingKey(`${roomCode}:${bobAccessCode}`, sessionSalt);
    const lalKWK = await deriveKeyWrappingKey(`${roomCode}:${lalAccessCode}`, sessionSalt);

    const bobWrapped = await wrapRoomMasterKey(masterRoomKey, bobKWK);
    const lalWrapped = await wrapRoomMasterKey(masterRoomKey, lalKWK);

    // 3. Store hashes for access verifier checks
    const bobVerifier = await computeAccessVerifier(bobAccessCode, roomSalt);
    const lalVerifier = await computeAccessVerifier(lalAccessCode, roomSalt);

    // 4. Lal joins room 434 using Access Code 2266
    const lalInputVerifier = await computeAccessVerifier('2266', roomSalt);
    expect(lalInputVerifier).toBe(lalVerifier); // Verifier matches guest access code

    // Lal derives KWK and unwraps the master key
    const lalDerivedKWK = await deriveKeyWrappingKey(`${roomCode}:2266`, sessionSalt);
    const lalUnwrappedMasterKey = await unwrapRoomMasterKey(
      lalWrapped.wrappedKey,
      lalWrapped.iv,
      lalDerivedKWK
    );
    expect(lalUnwrappedMasterKey).toBeDefined();

    // 5. Bob sends plaintext message "amma" with visual cipher shift from code 2266 (Shift Pos: 16 -> 'P')
    const plaintext = 'amma';
    const visualShiftResult = deriveAlphabetPosition(lalAccessCode);
    expect(visualShiftResult.finalPosition).toBe(16);
    expect(visualShiftResult.mappedLetter).toBe('P');

    // Visual cipher encodes "amma" to "pbbp"
    const visualCipherText = encodeVisualCipher(plaintext, visualShiftResult.finalPosition);
    expect(visualCipherText).toBe('pbbp');

    // Actual AES-256-GCM encryption with unique IV
    const { ciphertext, iv } = await encryptMessage(visualCipherText, masterRoomKey);
    expect(ciphertext).toBeDefined();
    expect(iv).toBeDefined();
    expect(ciphertext).not.toBe(plaintext);
    expect(ciphertext).not.toBe(visualCipherText);

    // 6. Lal receives the wire packet and decrypts AES-256-GCM layer
    const lalAESDecrypted = await decryptMessage(ciphertext, iv, lalUnwrappedMasterKey);
    expect(lalAESDecrypted).toBe('pbbp');

    // 7. Lal runs visual cipher decryption with security number 2266 (or shift 16)
    const lalVisualDerivation = deriveAlphabetPosition('2266');
    expect(lalVisualDerivation.finalPosition).toBe(16);

    const lalFinalPlaintext = decodeVisualCipher(lalAESDecrypted, lalVisualDerivation.finalPosition);
    expect(lalFinalPlaintext).toBe('amma');
  });

  it('Scenario: 9999 digit reduction to 9 (I) and visual transformation', () => {
    const derivation = deriveAlphabetPosition('9999');
    expect(derivation.steps).toEqual([36, 9]);
    expect(derivation.finalPosition).toBe(9);
    expect(derivation.mappedLetter).toBe('I');

    // 'a' maps to 'i' (shift = 8)
    const encoded = encodeVisualCipher('a', 9);
    expect(encoded).toBe('i');

    const encodedWord = encodeVisualCipher('amma', 9);
    expect(encodedWord).toBe('iuui');

    const decoded = decodeVisualCipher(encodedWord, 9);
    expect(decoded).toBe('amma');
  });

  it('Scenario: Eve attempts to join with wrong Access Code (9999)', async () => {
    const roomCode = '434';
    const bobAccessCode = '1133';
    const roomSalt = generateSalt();
    const sessionSalt = generateSalt();

    const masterRoomKey = await generateRoomKey();
    const bobKWK = await deriveKeyWrappingKey(`${roomCode}:${bobAccessCode}`, sessionSalt);
    const bobWrapped = await wrapRoomMasterKey(masterRoomKey, bobKWK);

    // Eve tries to derive KWK with 9999
    const eveKWK = await deriveKeyWrappingKey(`${roomCode}:9999`, sessionSalt);

    // Unwrapping must fail authentication
    await expect(
      unwrapRoomMasterKey(bobWrapped.wrappedKey, bobWrapped.iv, eveKWK)
    ).rejects.toThrow();
  });
});
