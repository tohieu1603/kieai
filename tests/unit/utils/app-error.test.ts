import { AppError } from '../../../src/utils/app-error';

describe('AppError', () => {
  describe('constructor', () => {
    it('sets message correctly', () => {
      const err = new AppError('test error');
      expect(err.message).toBe('test error');
    });

    it('defaults statusCode to 400', () => {
      const err = new AppError('test error');
      expect(err.statusCode).toBe(400);
    });

    it('defaults isOperational to true', () => {
      const err = new AppError('test error');
      expect(err.isOperational).toBe(true);
    });

    it('accepts custom statusCode', () => {
      const err = new AppError('test error', 422);
      expect(err.statusCode).toBe(422);
    });

    it('accepts custom isOperational', () => {
      const err = new AppError('test error', 500, false);
      expect(err.isOperational).toBe(false);
    });

    it('is instanceof AppError', () => {
      const err = new AppError('test error');
      expect(err).toBeInstanceOf(AppError);
    });

    it('is instanceof Error', () => {
      const err = new AppError('test error');
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('static factory methods', () => {
    describe('badRequest', () => {
      it('returns statusCode 400', () => {
        const err = AppError.badRequest('Bad input');
        expect(err.statusCode).toBe(400);
      });

      it('sets provided message', () => {
        const err = AppError.badRequest('Invalid email');
        expect(err.message).toBe('Invalid email');
      });

      it('isOperational is true', () => {
        const err = AppError.badRequest('bad');
        expect(err.isOperational).toBe(true);
      });
    });

    describe('unauthorized', () => {
      it('returns statusCode 401', () => {
        const err = AppError.unauthorized();
        expect(err.statusCode).toBe(401);
      });

      it('defaults to "Unauthorized" message', () => {
        const err = AppError.unauthorized();
        expect(err.message).toBe('Unauthorized');
      });

      it('accepts custom message', () => {
        const err = AppError.unauthorized('Token expired');
        expect(err.message).toBe('Token expired');
      });
    });

    describe('forbidden', () => {
      it('returns statusCode 403', () => {
        const err = AppError.forbidden();
        expect(err.statusCode).toBe(403);
      });

      it('defaults to "Forbidden" message', () => {
        const err = AppError.forbidden();
        expect(err.message).toBe('Forbidden');
      });

      it('accepts custom message', () => {
        const err = AppError.forbidden('Insufficient permissions');
        expect(err.message).toBe('Insufficient permissions');
      });
    });

    describe('notFound', () => {
      it('returns statusCode 404', () => {
        const err = AppError.notFound();
        expect(err.statusCode).toBe(404);
      });

      it('defaults to "Resource not found" message', () => {
        const err = AppError.notFound();
        expect(err.message).toBe('Resource not found');
      });

      it('accepts custom message', () => {
        const err = AppError.notFound('User not found');
        expect(err.message).toBe('User not found');
      });
    });

    describe('conflict', () => {
      it('returns statusCode 409', () => {
        const err = AppError.conflict('Duplicate email');
        expect(err.statusCode).toBe(409);
      });

      it('sets provided message', () => {
        const err = AppError.conflict('Already exists');
        expect(err.message).toBe('Already exists');
      });
    });

    describe('tooMany', () => {
      it('returns statusCode 429', () => {
        const err = AppError.tooMany();
        expect(err.statusCode).toBe(429);
      });

      it('defaults to "Too many requests" message', () => {
        const err = AppError.tooMany();
        expect(err.message).toBe('Too many requests');
      });

      it('accepts custom message', () => {
        const err = AppError.tooMany('Rate limit exceeded');
        expect(err.message).toBe('Rate limit exceeded');
      });
    });

    describe('internal', () => {
      it('returns statusCode 500', () => {
        const err = AppError.internal();
        expect(err.statusCode).toBe(500);
      });

      it('sets isOperational to false', () => {
        const err = AppError.internal();
        expect(err.isOperational).toBe(false);
      });

      it('defaults to "Internal server error" message', () => {
        const err = AppError.internal();
        expect(err.message).toBe('Internal server error');
      });

      it('accepts custom message', () => {
        const err = AppError.internal('Database connection failed');
        expect(err.message).toBe('Database connection failed');
      });
    });
  });

  describe('instanceof checks on factory results', () => {
    it('factory results are instanceof AppError', () => {
      expect(AppError.badRequest('x')).toBeInstanceOf(AppError);
      expect(AppError.unauthorized()).toBeInstanceOf(AppError);
      expect(AppError.forbidden()).toBeInstanceOf(AppError);
      expect(AppError.notFound()).toBeInstanceOf(AppError);
      expect(AppError.conflict('x')).toBeInstanceOf(AppError);
      expect(AppError.tooMany()).toBeInstanceOf(AppError);
      expect(AppError.internal()).toBeInstanceOf(AppError);
    });

    it('factory results are instanceof Error', () => {
      expect(AppError.badRequest('x')).toBeInstanceOf(Error);
      expect(AppError.internal()).toBeInstanceOf(Error);
    });
  });
});
