import 'reflect-metadata';
import { validateBody } from '../../../src/middlewares/validate.middleware';
import { RegisterDto } from '../../../src/dtos/auth.dto';
import { AppError } from '../../../src/utils/app-error';

function makeReq(body: Record<string, any>) {
  return { body } as any;
}

const res = {} as any;

describe('validateBody', () => {
  describe('with RegisterDto', () => {
    it('calls next() with no error and sets req.body to DTO instance on valid body', async () => {
      const req = makeReq({ name: 'Alice', email: 'alice@example.com', password: 'secret123' });
      const next = jest.fn();

      await validateBody(RegisterDto)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
      expect(req.body).toBeInstanceOf(RegisterDto);
      expect(req.body.name).toBe('Alice');
      expect(req.body.email).toBe('alice@example.com');
      expect(req.body.password).toBe('secret123');
    });

    it('calls next with AppError 400 when required fields are missing', async () => {
      const req = makeReq({});
      const next = jest.fn();

      await validateBody(RegisterDto)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
      expect(err.message).toBeTruthy();
    });

    it('calls next with AppError when email is invalid', async () => {
      const req = makeReq({ name: 'Alice', email: 'not-an-email', password: 'secret123' });
      const next = jest.fn();

      await validateBody(RegisterDto)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
    });

    it('calls next with AppError when password is too short', async () => {
      const req = makeReq({ name: 'Alice', email: 'alice@example.com', password: 'short' });
      const next = jest.fn();

      await validateBody(RegisterDto)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
    });

    it('calls next with AppError when name is too short', async () => {
      const req = makeReq({ name: 'A', email: 'alice@example.com', password: 'secret123' });
      const next = jest.fn();

      await validateBody(RegisterDto)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
    });

    it('error message contains constraint descriptions joined by semicolons', async () => {
      const req = makeReq({ name: 'A', email: 'bad-email', password: 'x' });
      const next = jest.fn();

      await validateBody(RegisterDto)(req, res, next);

      const err = next.mock.calls[0][0];
      expect(err.message).toContain(';');
    });

    it('rejects unknown properties with AppError 400 (forbidNonWhitelisted)', async () => {
      const req = makeReq({
        name: 'Alice',
        email: 'alice@example.com',
        password: 'secret123',
        unknownField: 'should be rejected',
      });
      const next = jest.fn();

      await validateBody(RegisterDto)(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
    });

    it('does not modify req.body when validation fails', async () => {
      const body = { name: 'A', email: 'bad', password: 'x' };
      const req = makeReq(body);
      const next = jest.fn();

      await validateBody(RegisterDto)(req, res, next);

      const err = next.mock.calls[0][0];
      expect(err).toBeInstanceOf(AppError);
      // req.body should NOT be a RegisterDto instance since validation failed
      expect(req.body).not.toBeInstanceOf(RegisterDto);
    });
  });
});
