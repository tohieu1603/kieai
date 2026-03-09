import { generateRandomHex, sha256, generateApiKey, generateHmacKey } from '../../../src/utils/crypto';

describe('crypto utils', () => {
  describe('generateRandomHex', () => {
    it('returns a hex string', () => {
      const result = generateRandomHex();
      expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it('returns correct length for default 32 bytes (64 hex chars)', () => {
      const result = generateRandomHex();
      expect(result).toHaveLength(64);
    });

    it('returns correct length for custom byte size', () => {
      expect(generateRandomHex(16)).toHaveLength(32);
      expect(generateRandomHex(8)).toHaveLength(16);
      expect(generateRandomHex(24)).toHaveLength(48);
    });

    it('generates unique values on each call', () => {
      const first = generateRandomHex();
      const second = generateRandomHex();
      expect(first).not.toBe(second);
    });
  });

  describe('sha256', () => {
    it('returns a 64-character hex string', () => {
      const hash = sha256('hello');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns consistent hash for the same input', () => {
      const input = 'consistent-input';
      expect(sha256(input)).toBe(sha256(input));
    });

    it('returns known hash for well-known input', () => {
      // echo -n "hello" | sha256sum = 2cf24dba...
      expect(sha256('hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('returns different hashes for different inputs', () => {
      expect(sha256('input-a')).not.toBe(sha256('input-b'));
    });
  });

  describe('generateApiKey', () => {
    it('returns an object with key, hash, and prefix', () => {
      const result = generateApiKey();
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('hash');
      expect(result).toHaveProperty('prefix');
    });

    it('key starts with "km_"', () => {
      const { key } = generateApiKey();
      expect(key).toMatch(/^km_/);
    });

    it('hash matches sha256 of the key', () => {
      const { key, hash } = generateApiKey();
      expect(hash).toBe(sha256(key));
    });

    it('prefix is exactly 8 characters', () => {
      const { prefix } = generateApiKey();
      expect(prefix).toHaveLength(8);
    });

    it('prefix is a hex string', () => {
      const { prefix } = generateApiKey();
      expect(prefix).toMatch(/^[0-9a-f]{8}$/);
    });

    it('prefix matches the first 8 chars of the raw portion of key', () => {
      const { key, prefix } = generateApiKey();
      const raw = key.slice(3); // strip 'km_'
      expect(raw.substring(0, 8)).toBe(prefix);
    });

    it('generates unique keys on each call', () => {
      const first = generateApiKey();
      const second = generateApiKey();
      expect(first.key).not.toBe(second.key);
      expect(first.hash).not.toBe(second.hash);
    });
  });

  describe('generateHmacKey', () => {
    it('starts with "whsec_"', () => {
      const key = generateHmacKey();
      expect(key).toMatch(/^whsec_/);
    });

    it('has correct total length (whsec_ + 48 hex chars from 24 bytes)', () => {
      const key = generateHmacKey();
      // 'whsec_' = 6 chars, 24 bytes = 48 hex chars
      expect(key).toHaveLength(6 + 48);
    });

    it('hex portion is valid hex', () => {
      const key = generateHmacKey();
      const hexPart = key.slice(6);
      expect(hexPart).toMatch(/^[0-9a-f]{48}$/);
    });

    it('generates unique keys on each call', () => {
      const first = generateHmacKey();
      const second = generateHmacKey();
      expect(first).not.toBe(second);
    });
  });
});
