import crypto from 'crypto';

/**
 * Generate a random hex string for API keys, tokens, etc.
 */
export function generateRandomHex(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a string with SHA-256.
 */
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate API key in format: `om_<random>` (om = operis market)
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const raw = generateRandomHex(32);
  const key = `om_${raw}`;
  const hash = sha256(key);
  const prefix = raw.substring(0, 8);
  return { key, hash, prefix };
}

/**
 * Generate HMAC key for webhooks.
 */
export function generateHmacKey(): string {
  return `whsec_${generateRandomHex(24)}`;
}
