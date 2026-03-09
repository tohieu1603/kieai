import { errorHandler } from '../../../src/middlewares/error-handler.middleware';
import { AppError } from '../../../src/utils/app-error';

jest.mock('../../../src/config/logger.config', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { logger } from '../../../src/config/logger.config';

function makeRes() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json } as any;
}

const req = {} as any;
const next = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('errorHandler', () => {
  describe('when error is an AppError instance', () => {
    it('responds with the AppError statusCode', () => {
      const err = AppError.notFound('User not found');
      const res = makeRes();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('responds with the AppError message', () => {
      const err = AppError.notFound('User not found');
      const res = makeRes();

      errorHandler(err, req, res, next);

      expect(res.status(404).json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('handles 400 bad request errors', () => {
      const err = AppError.badRequest('Validation failed');
      const res = makeRes();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('handles 401 unauthorized errors', () => {
      const err = AppError.unauthorized('Token required');
      const res = makeRes();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('handles 403 forbidden errors', () => {
      const err = AppError.forbidden('No access');
      const res = makeRes();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.status(403).json).toHaveBeenCalledWith({
        success: false,
        message: 'No access',
      });
    });

    it('calls logger.warn with AppError details', () => {
      const err = AppError.conflict('Email already exists');
      const res = makeRes();

      errorHandler(err, req, res, next);

      expect(logger.warn).toHaveBeenCalledWith(
        'AppError: Email already exists',
        { statusCode: 409 },
      );
    });

    it('does not call logger.error for AppError', () => {
      const err = AppError.badRequest('bad');
      const res = makeRes();

      errorHandler(err, req, res, next);

      expect(logger.error).not.toHaveBeenCalled();
    });
  });

  describe('when error is a generic Error', () => {
    it('responds with status 500', () => {
      const err = new Error('Something exploded');
      const res = makeRes();

      errorHandler(err, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('responds with "Internal server error" message', () => {
      const err = new Error('Something exploded');
      const res = makeRes();

      errorHandler(err, req, res, next);

      expect(res.status(500).json).toHaveBeenCalledWith({
        success: false,
        message: 'Internal server error',
      });
    });

    it('calls logger.error with error details', () => {
      const err = new Error('db crash');
      const res = makeRes();

      errorHandler(err, req, res, next);

      expect(logger.error).toHaveBeenCalledWith(
        'Unhandled error',
        { error: 'db crash', stack: err.stack },
      );
    });

    it('does not call logger.warn for generic errors', () => {
      const err = new Error('unexpected');
      const res = makeRes();

      errorHandler(err, req, res, next);

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});
