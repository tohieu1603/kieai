import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env.config';

const validate: Options['validate'] = { xForwardedForHeader: false, default: true };

/**
 * Global rate limiter — applies to all routes.
 */
export const globalRateLimit = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});

/**
 * Strict rate limiter for auth endpoints (register, forgot-password, reset-password).
 * 10 attempts per 15 minutes per IP.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate,
  message: {
    success: false,
    message: 'Too many auth attempts. Please try again in 15 minutes.',
  },
});

/**
 * Login-specific rate limiter — stricter to prevent brute-force.
 * 5 attempts per 15 minutes, keyed by IP + email combo.
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: (req) => {
    const email = (req.body?.email || '').toLowerCase().trim();
    return `${req.ip}:${email}`;
  },
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  },
});

/**
 * API key rate limiter — 60 requests per minute.
 */
export const apiKeyRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => (req as any).apiKeyId || req.ip || 'unknown',
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  message: {
    success: false,
    message: 'API rate limit exceeded.',
  },
});
