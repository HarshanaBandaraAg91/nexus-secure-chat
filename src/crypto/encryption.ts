/**
 * NEXUS CRYPTOGRAPHIC ENGINE
 * 
 * Standard-compliant Web Crypto API implementation for AES-256-GCM.
 * Zero external cryptographic dependencies - relies strictly on native browser cryptography.
 */

/**
 * Converts ArrayBuffer / Uint8Array to standard Base64 string.
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts standard Base64 string to Uint8Array.
 */
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a cryptographically secure 256-bit AES-GCM room key.
 */
export async function generateRoomKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable for key wrapping
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext string using AES-256-GCM with a unique 96-bit (12-byte) IV.
 * NEVER reuses an IV.
 */
export async function encryptMessage(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  // Generate cryptographically random 12-byte IV for this message
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
    },
    key,
    encodedPlaintext as unknown as BufferSource
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypts AES-256-GCM ciphertext using the room key and message IV.
 * Throws an error if ciphertext or authentication tag is invalid.
 */
export async function decryptMessage(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const ciphertextBuffer = base64ToBuffer(ciphertextBase64);
  const ivBuffer = base64ToBuffer(ivBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer as unknown as BufferSource,
    },
    key,
    ciphertextBuffer as unknown as BufferSource
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Exports a CryptoKey to raw Base64 representation for wrapping.
 */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return bufferToBase64(exported);
}

/**
 * Imports a raw Base64 representation into an AES-GCM CryptoKey.
 */
export async function importKeyFromBase64(base64Key: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(base64Key);
  return await crypto.subtle.importKey(
    'raw',
    raw as unknown as BufferSource,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}
