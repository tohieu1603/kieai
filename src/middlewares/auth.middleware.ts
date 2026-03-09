import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { AppError } from '../utils/app-error';
import { UserRole } from '../enums';

interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  emailVerified?: boolean;
}

/**
 * Verify JWT access token from httpOnly cookie.
 * Populates req.user with decoded payload.
 * Rejects unverified-email accounts from accessing protected resources.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.access_token;

  if (!token) {
    return next(AppError.unauthorized('Access token required'));
  }

  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret) as JwtPayload;

    if (!decoded.emailVerified) {
      return next(AppError.forbidden('Please verify your email before accessing this resource'));
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch {
    return next(AppError.unauthorized('Invalid or expired access token'));
  }
}

/**
 * Role-based access control middleware factory.
 * Usage: authorize(UserRole.ADMIN) or authorize(UserRole.ADMIN, UserRole.DEVELOPER)
 */
export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(AppError.forbidden('Insufficient permissions'));
    }
    next();
  };
}

/**
 * Ensures the authenticated user can only access their own resources.
 * Checks req.params[paramName] against req.user.id.
 */
export function ownerOnly(paramName = 'userId') {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    const resourceOwnerId = req.params[paramName];
    if (resourceOwnerId && resourceOwnerId !== req.user.id && req.user.role !== UserRole.ADMIN) {
      return next(AppError.forbidden('You can only access your own resources'));
    }
    next();
  };
}
