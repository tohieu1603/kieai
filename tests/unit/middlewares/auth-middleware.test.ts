import jwt from 'jsonwebtoken';

const JWT_SECRET = 'access-secret';

jest.mock('../../../src/config/env.config', () => ({
  env: {
    jwt: {
      accessSecret: JWT_SECRET,
    },
  },
}));

import { authenticate, authorize, ownerOnly } from '../../../src/middlewares/auth.middleware';
import { AppError } from '../../../src/utils/app-error';
import { UserRole } from '../../../src/enums';

function makeToken(payload: object, secret = JWT_SECRET, options: jwt.SignOptions = { expiresIn: '1h' }) {
  return jwt.sign(payload, secret, options);
}

function makeReq(overrides: Record<string, any> = {}) {
  return {
    cookies: {},
    params: {},
    user: undefined,
    ...overrides,
  } as any;
}

const res = {} as any;

describe('authenticate', () => {
  it('calls next with unauthorized error when no token present', () => {
    const req = makeReq({ cookies: {} });
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Access token required');
  });

  it('calls next with unauthorized error when token is invalid', () => {
    const req = makeReq({ cookies: { access_token: 'bad.token.here' } });
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Invalid or expired access token');
  });

  it('calls next with unauthorized error when token is signed with wrong secret', () => {
    const token = makeToken({ id: '1', email: 'a@b.com', role: UserRole.VIEWER }, 'wrong-secret');
    const req = makeReq({ cookies: { access_token: token } });
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('sets req.user and calls next() with no error on valid JWT', () => {
    const payload = { id: 'user-123', email: 'user@example.com', role: UserRole.DEVELOPER };
    const token = makeToken(payload);
    const req = makeReq({ cookies: { access_token: token } });
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({ id: 'user-123', email: 'user@example.com', role: UserRole.DEVELOPER });
  });

  it('sets req.user with correct role for admin token', () => {
    const payload = { id: 'admin-1', email: 'admin@example.com', role: UserRole.ADMIN };
    const token = makeToken(payload);
    const req = makeReq({ cookies: { access_token: token } });
    const next = jest.fn();

    authenticate(req, res, next);

    expect(req.user?.role).toBe(UserRole.ADMIN);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('authorize', () => {
  it('calls next with unauthorized error when req.user is not set', () => {
    const req = makeReq({ user: undefined });
    const next = jest.fn();

    authorize(UserRole.ADMIN)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('calls next with forbidden error when user role not in allowed roles', () => {
    const req = makeReq({ user: { id: '1', email: 'a@b.com', role: UserRole.VIEWER } });
    const next = jest.fn();

    authorize(UserRole.ADMIN, UserRole.DEVELOPER)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Insufficient permissions');
  });

  it('calls next() with no error when user role is in allowed roles', () => {
    const req = makeReq({ user: { id: '1', email: 'a@b.com', role: UserRole.DEVELOPER } });
    const next = jest.fn();

    authorize(UserRole.ADMIN, UserRole.DEVELOPER)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() when user is admin and admin role is allowed', () => {
    const req = makeReq({ user: { id: '1', email: 'a@b.com', role: UserRole.ADMIN } });
    const next = jest.fn();

    authorize(UserRole.ADMIN)(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next with forbidden error when single-role restriction is not met', () => {
    const req = makeReq({ user: { id: '1', email: 'a@b.com', role: UserRole.DEVELOPER } });
    const next = jest.fn();

    authorize(UserRole.VIEWER)(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(403);
  });
});

describe('ownerOnly', () => {
  it('calls next with unauthorized error when req.user is not set', () => {
    const req = makeReq({ user: undefined, params: { userId: 'some-id' } });
    const next = jest.fn();

    ownerOnly()(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it('calls next with forbidden error when userId differs and user is not admin', () => {
    const req = makeReq({
      user: { id: 'user-abc', email: 'u@b.com', role: UserRole.DEVELOPER },
      params: { userId: 'user-xyz' },
    });
    const next = jest.fn();

    ownerOnly()(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('You can only access your own resources');
  });

  it('calls next() with no error when userId matches req.user.id', () => {
    const req = makeReq({
      user: { id: 'user-abc', email: 'u@b.com', role: UserRole.VIEWER },
      params: { userId: 'user-abc' },
    });
    const next = jest.fn();

    ownerOnly()(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() with no error when user is admin even if userId differs', () => {
    const req = makeReq({
      user: { id: 'admin-1', email: 'admin@b.com', role: UserRole.ADMIN },
      params: { userId: 'user-xyz' },
    });
    const next = jest.fn();

    ownerOnly()(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('calls next() with no error when param is absent', () => {
    const req = makeReq({
      user: { id: 'user-abc', email: 'u@b.com', role: UserRole.VIEWER },
      params: {},
    });
    const next = jest.fn();

    ownerOnly()(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('respects custom paramName when provided', () => {
    const req = makeReq({
      user: { id: 'user-abc', email: 'u@b.com', role: UserRole.DEVELOPER },
      params: { ownerId: 'someone-else' },
    });
    const next = jest.fn();

    ownerOnly('ownerId')(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });
});
