/**
 * NEXUS VISUAL CIPHER MODULE
 * 
 * IMPORTANT DISCLAIMER:
 * This visual cipher is a deterministic Caesar-style substitution layer for visual presentation only.
 * It is NOT the actual security/encryption layer.
 * Actual end-to-end security is provided by the Web Crypto AES-256-GCM cryptographic engine.
 */

export interface DigitSumResult {
  rawCode: string;
  steps: number[];
  finalPosition: number; // 1 to 26
  mappedLetter: string;  // 'A' to 'Z'
  shiftOffset: number;   // 0 to 25 (finalPosition - 1)
}

/**
 * Deterministically derives an alphabet position (1-26) from a 4-digit SS code.
 * Recursively sums digits until the result is within 1–26.
 * 
 * Example 1:
 *  "2266" -> 2 + 2 + 6 + 6 = 16 -> 16 maps to 'P'
 * 
 * Example 2:
 *  "9999" -> 9 + 9 + 9 + 9 = 36 (> 26) -> 3 + 6 = 9 -> 9 maps to 'I'
 */
export function deriveAlphabetPosition(ssCode: string): DigitSumResult {
  const sanitized = ssCode.replace(/\D/g, '').slice(0, 4);
  if (!sanitized || sanitized.length === 0) {
    return {
      rawCode: ssCode,
      steps: [1],
      finalPosition: 1,
      mappedLetter: 'A',
      shiftOffset: 0,
    };
  }

  // Sum the initial 4 digits
  let currentSum = sanitized
    .split('')
    .reduce((acc, digit) => acc + parseInt(digit, 10), 0);

  const steps: number[] = [currentSum];

  // If initial sum is 0 (e.g. "0000"), map to 1 (A)
  if (currentSum === 0) {
    currentSum = 1;
    steps.push(1);
  }

  // If currentSum > 26, continue reducing by summing digits until <= 26
  while (currentSum > 26) {
    const nextSum = currentSum
      .toString()
      .split('')
      .reduce((acc, digit) => acc + parseInt(digit, 10), 0);
    
    // Safety check against zero
    currentSum = nextSum === 0 ? 1 : nextSum;
    steps.push(currentSum);
  }

  // Ensure result is strictly within 1..26
  const finalPosition = Math.max(1, Math.min(26, currentSum));
  const mappedLetter = String.fromCharCode(65 + (finalPosition - 1)); // 1 -> 'A', 16 -> 'P', 26 -> 'Z'
  const shiftOffset = finalPosition - 1; // 1 -> 0, 16 -> 15

  return {
    rawCode: sanitized,
    steps,
    finalPosition,
    mappedLetter,
    shiftOffset,
  };
}

/**
 * Encodes text using Caesar substitution cipher based on the derived alphabet position (1-26).
 * Only shifts alphabetic characters (A-Z, a-z).
 * Preserves numbers, spaces, punctuation, symbols, and emojis.
 * 
 * @param text The input plaintext
 * @param position Alphabet position 1-26 (or direct shift position, e.g. 16 for 'P')
 */
export function encodeVisualCipher(text: string, position: number): string {
  if (!text) return '';
  // Normalize position to 1..26
  const pos = ((position - 1) % 26 + 26) % 26 + 1;
  const shift = pos - 1; // 1 -> 0 shift (A->A), 16 -> 15 shift (A->P, M->B)

  return text
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      // Uppercase A-Z (65 - 90)
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + shift) % 26) + 65);
      }
      // Lowercase a-z (97 - 122)
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + shift) % 26) + 97);
      }
      // Non-alphabet characters remain untouched
      return char;
    })
    .join('');
}

/**
 * Decodes visual cipher text back to plaintext using the derived alphabet position (1-26).
 * Exact reversible inverse of encodeVisualCipher.
 * 
 * @param text The visual cipher text
 * @param position Alphabet position 1-26 (e.g. 16 for 'P')
 */
export function decodeVisualCipher(text: string, position: number): string {
  if (!text) return '';
  const pos = ((position - 1) % 26 + 26) % 26 + 1;
  const shift = pos - 1;

  return text
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0);
      // Uppercase A-Z (65 - 90)
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 - shift + 26) % 26) + 65);
      }
      // Lowercase a-z (97 - 122)
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 - shift + 26) % 26) + 97);
      }
      // Non-alphabet characters remain untouched
      return char;
    })
    .join('');
}
