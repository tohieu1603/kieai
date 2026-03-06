import { Request } from 'express';

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Extract pagination params from query string with safe defaults.
 */
export function parsePagination(req: Request, maxLimit = 100): PaginationOptions {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
