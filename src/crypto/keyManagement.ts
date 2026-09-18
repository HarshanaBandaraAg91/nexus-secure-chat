/**
 * NEXUS KEY MANAGEMENT & SECURITY SEPARATION MODULE
 * 
 * STRICT ARCHITECTURAL SEPARATION:
 * 1. ROOM CODE: Identifies the enclave channel in routing and database.
 * 2. ACCESS CODE: Authenticates/authorizes room membership entry.
 * 3. CRYPTOGRAPHIC ROOM KEY: 256-bit cryptographically random AES-GCM key for true message E2EE.
 * 4. VISUAL CIPHER KEY: Deterministic Caesar substitution layer for interactive visual HUD.
 * 
 * GUARANTEES:
 * - Room Code ≠ Encryption Key
 * - Access Code ≠ Encryption Key
 * - Visual Cipher Key ≠ Encryption Key
 * - AES-256-GCM keys are generated from cryptographically secure entropy, NEVER directly from 4-digit codes.
 */

import { bufferToBase64, base64ToBuffer } from './encryption';

/**
 * Generates a cryptographically secure 16-byte random salt.
 */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(salt);
}

/**
 * Generates a high-entropy 256-bit random session token (32 bytes).
 */
export function generateSecureSessionToken(): string {
  const token = crypto.getRandomValues(new Uint8Array(32));
  return bufferToBase64(token);
}

/**
 * Derives a Key Wrapping Key (KWK) from high-entropy session material and salt using PBKDF2 (100,000 rounds).
 */
export async function deriveKeyWrappingKey(
  sessionMaterial: string,
  saltBase64: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const rawMaterial = encoder.encode(sessionMaterial);
  const salt = base64ToBuffer(saltBase64);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    rawMaterial as unknown as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Wraps (encrypts) the Master 256-bit Room Key using a Key Wrapping Key (KWK).
 */
export async function wrapRoomMasterKey(
  masterKey: CryptoKey,
  kwk: CryptoKey
): Promise<{ wrappedKey: string; iv: string }> {
  const rawMasterKey = await crypto.subtle.exportKey('raw', masterKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    kwk,
    rawMasterKey as unknown as BufferSource
  );

  return {
    wrappedKey: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Unwraps (decrypts) the Master 256-bit Room Key using the authorized KWK.
 * Fails cryptographically if unauthorized or tampered with.
 */
export async function unwrapRoomMasterKey(
  wrappedKeyBase64: string,
  ivBase64: string,
  kwk: CryptoKey
): Promise<CryptoKey> {
  const encryptedBuffer = base64ToBuffer(wrappedKeyBase64);
  const ivBuffer = base64ToBuffer(ivBase64);

  const rawMasterKey = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer as unknown as BufferSource,
    },
    kwk,
    encryptedBuffer as unknown as BufferSource
  );

  return await crypto.subtle.importKey(
    'raw',
    rawMasterKey as unknown as BufferSource,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Computes a salted SHA-256 access authorization verifier hash.
 * This verifies room membership eligibility without exposing the access code or linking it to the encryption key.
 */
export async function computeAccessVerifier(
  accessCode: string,
  roomSalt: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`nexus-auth-v2:${accessCode}:${roomSalt}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  return bufferToBase64(hashBuffer);
}
