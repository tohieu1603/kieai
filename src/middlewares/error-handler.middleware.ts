import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';
import { logger } from '../config/logger.config';

/**
 * Global error handling middleware. Must be registered LAST.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    logger.warn(`AppError: ${err.message}`, { statusCode: err.statusCode });
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.data && { data: err.data }),
    });
  }

  // Unexpected errors
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
