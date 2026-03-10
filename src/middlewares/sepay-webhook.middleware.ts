/**
 * SePay Webhook Verification Middleware
 * Validates API key from Authorization header against SEPAY_API_KEY env var.
 * Always returns HTTP 200 per SePay requirement — rejected requests are logged but not retried.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.config';
import { logger } from '../config/logger.config';

/**
 * Verify SePay webhook API key.
 * If key mismatch → log warning, respond 200 with success:true (SePay never retries).
 * If no SEPAY_API_KEY configured → skip verification (dev mode).
 */
export function sepayWebhookMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip verification if no API key configured (dev/test)
  if (!env.sepay.apiKey) {
    logger.warn('[sepay-webhook] No SEPAY_API_KEY configured — skipping verification');
    next();
    return;
  }

  const authHeader = req.headers.authorization || '';
  // SePay sends: "Apikey <key>" or just the raw key
  const providedKey = authHeader.startsWith('Apikey ')
    ? authHeader.slice(7)
    : authHeader;

  if (providedKey !== env.sepay.apiKey) {
    logger.warn(
      `[sepay-webhook] Rejected: invalid API key from ${req.ip} | header: "${authHeader.slice(0, 20)}..."`,
    );
    // Always return 200 to prevent SePay retries
    res.status(200).json({ success: true });
    return;
  }

  next();
}
