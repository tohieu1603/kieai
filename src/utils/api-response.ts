import { Response } from 'express';

/**
 * Standardized API response wrapper.
 */
export class ApiResponse {
  static success<T>(res: Response, data: T, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static created<T>(res: Response, data: T, message = 'Created') {
    return this.success(res, data, message, 201);
  }

  static paginated<T>(
    res: Response,
    data: T[],
    total: number,
    page: number,
    limit: number,
    message = 'Success',
  ) {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  static error(res: Response, message: string, statusCode = 400, errors?: Record<string, unknown>) {
    const body: Record<string, unknown> = { success: false, message };
    if (errors) body.errors = errors;
    return res.status(statusCode).json(body);
  }
}
