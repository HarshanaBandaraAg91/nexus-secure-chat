import { describe, it, expect } from 'vitest';
import {
  deriveAlphabetPosition,
  encodeVisualCipher,
  decodeVisualCipher,
} from './visualCipher';

describe('Visual Cipher Module', () => {
  describe('deriveAlphabetPosition', () => {
    it('should derive position 16 (P) for SS code 2266 (2+2+6+6 = 16)', () => {
      const result = deriveAlphabetPosition('2266');
      expect(result.finalPosition).toBe(16);
      expect(result.mappedLetter).toBe('P');
      expect(result.steps).toEqual([16]);
      expect(result.shiftOffset).toBe(15);
    });

    it('should derive position 9 (I) for SS code 9999 (9+9+9+9=36 -> 3+6=9)', () => {
      const result = deriveAlphabetPosition('9999');
      expect(result.finalPosition).toBe(9);
      expect(result.mappedLetter).toBe('I');
      expect(result.steps).toEqual([36, 9]);
      expect(result.shiftOffset).toBe(8);
    });

    it('should handle code 1133 (1+1+3+3 = 8 -> H)', () => {
      const result = deriveAlphabetPosition('1133');
      expect(result.finalPosition).toBe(8);
      expect(result.mappedLetter).toBe('H');
      expect(result.steps).toEqual([8]);
      expect(result.shiftOffset).toBe(7);
    });

    it('should never produce 0 as position', () => {
      const result = deriveAlphabetPosition('0000');
      expect(result.finalPosition).toBeGreaterThanOrEqual(1);
      expect(result.finalPosition).toBeLessThanOrEqual(26);
    });
  });

  describe('encodeVisualCipher & decodeVisualCipher', () => {
    it('should transform "amma" to "pbbp" with shift position 16', () => {
      const encoded = encodeVisualCipher('amma', 16);
      expect(encoded).toBe('pbbp');

      const decoded = decodeVisualCipher('pbbp', 16);
      expect(decoded).toBe('amma');
    });

    it('should transform "AMMA" to "PBBP" preserving uppercase with shift position 16', () => {
      const encoded = encodeVisualCipher('AMMA', 16);
      expect(encoded).toBe('PBBP');

      const decoded = decodeVisualCipher('PBBP', 16);
      expect(decoded).toBe('AMMA');
    });

    it('should preserve numbers, punctuation, spaces, and emojis', () => {
      const input = 'Hello, World 123! 🔐🚀';
      const encoded = encodeVisualCipher(input, 16);
      expect(encoded).not.toBe(input);
      // Punctuation and digits remain identical
      expect(encoded).toContain('123!');
      expect(encoded).toContain('🔐🚀');
      expect(encoded).toContain(', ');

      const decoded = decodeVisualCipher(encoded, 16);
      expect(decoded).toBe(input);
    });

    it('should correctly handle all 26 alphabet positions round-trip', () => {
      const message = 'The quick brown fox jumps over 13 lazy dogs! 🛡️';
      for (let pos = 1; pos <= 26; pos++) {
        const enc = encodeVisualCipher(message, pos);
        const dec = decodeVisualCipher(enc, pos);
        expect(dec).toBe(message);
      }
    });
  });
});
