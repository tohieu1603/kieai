/**
 * Integration tests for Auth routes.
 * Tests the full Express middleware chain via supertest.
 * DB layer and rate limiters are mocked.
 */

import 'reflect-metadata';

// --- Module mocks (must precede app import) ---

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getMany: jest.fn().mockResolvedValue([]),
};

jest.mock('../../src/config/database.config', () => ({
  AppDataSource: {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      save: jest.fn().mockImplementation((e: any) => Promise.resolve({ id: 'uuid', ...e })),
      create: jest.fn().mockImplementation((d: any) => d),
      remove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    }),
    initialize: jest.fn().mockResolvedValue(true),
    isInitialized: true,
    transaction: jest.fn(),
  },
}));

// Mock env so JWT secrets are predictable regardless of .env file
jest.mock('../../src/config/env.config', () => ({
  env: {
    port: 3000,
    nodeEnv: 'test',
    isProduction: false,
    db: { host: 'localhost', port: 5432, username: 'postgres', password: 'postgres', name: 'test' },
    jwt: {
      accessSecret: 'access-secret',
      refreshSecret: 'refresh-secret',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    },
    cookie: { domain: 'localhost', secure: false },
    rateLimit: { windowMs: 900000, max: 100 },
    smtp: { host: 'smtp.test', port: 587, user: '', pass: '', from: 'test@test.com' },
    google: { clientId: '', clientSecret: '', callbackUrl: '' },
    github: { clientId: '', clientSecret: '', callbackUrl: '' },
    sepay: { apiKey: '', webhookSecret: '', bankAccount: '', bankCode: '', merchantName: '' },
    frontendUrl: 'http://localhost:3001',
  },
}));

jest.mock('../../src/config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/config/passport.config', () => ({
  configurePassport: jest.fn(),
}));

// Bypass all rate limiters so tests are not blocked
jest.mock('../../src/middlewares/rate-limit.middleware', () => ({
  globalRateLimit: (_req: any, _res: any, next: any) => next(),
  authRateLimit: (_req: any, _res: any, next: any) => next(),
  apiKeyRateLimit: (_req: any, _res: any, next: any) => next(),
}));

// Mock uuid (v13 ships pure ESM which CJS Jest cannot parse)
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid-v4') }));

// Lazy entity mocks consumed by auth.service and passport.config via require()
jest.mock('../../src/entities/user.entity', () => ({ User: 'UserEntity' }));
jest.mock('../../src/entities/user-settings.entity', () => ({ UserSettings: 'UserSettingsEntity' }));
jest.mock('../../src/entities/user-credit.entity', () => ({ UserCredit: 'UserCreditEntity' }));

// --- Imports ---

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../src/config/database.config';
import app from '../../src/app';

// --- Helpers ---

const mockRepo = () => (AppDataSource.getRepository as jest.Mock).mock.results[0]?.value;

const buildRepo = (overrides: Record<string, jest.Mock> = {}) => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn().mockImplementation((e: any) => Promise.resolve({ id: 'test-uuid', ...e })),
  create: jest.fn().mockImplementation((d: any) => d),
  remove: jest.fn(),
  count: jest.fn(),
  ...overrides,
});

function setupRepo(overrides: Record<string, jest.Mock> = {}) {
  const repo = buildRepo(overrides);
  (AppDataSource.getRepository as jest.Mock).mockReturnValue(repo);
  return repo;
}

function makeAccessToken(payload: object = {}) {
  return jwt.sign(
    { id: 'uid', email: 'test@test.com', role: 'developer', ...payload },
    'access-secret',
  );
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    // No existing user → registration succeeds
    setupRepo({ findOne: jest.fn().mockResolvedValue(null) });
  });

  it('returns 201 with valid body', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice Smith', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ email: 'alice@example.com', name: 'Alice Smith' });
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when password is too short (< 8 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/auth/register').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 409 when email is already registered', async () => {
    setupRepo({
      findOne: jest.fn().mockResolvedValue({ id: 'existing-uuid', email: 'alice@example.com' }),
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@example.com', password: 'password123' });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/api/auth/login').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bad-email', password: 'password123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------

describe('POST /api/auth/logout', () => {
  it('returns 401 when no access token cookie is present', async () => {
    const res = await request(app).post('/api/auth/logout');
    // authenticate middleware on /logout requires auth
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 when valid access token present (no refresh cookie)', async () => {
    const token = makeAccessToken();
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`access_token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------

describe('GET /api/auth/me', () => {
  it('returns 401 when no access token cookie is provided', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when access token is malformed', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', ['access_token=not.a.valid.jwt']);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when token is signed with wrong secret', async () => {
    const token = jwt.sign({ id: 'uid', email: 'x@x.com', role: 'developer' }, 'wrong-secret');
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`access_token=${token}`]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 and user payload when valid token is provided', async () => {
    const token = makeAccessToken({ id: 'uid', email: 'test@test.com', role: 'developer' });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`access_token=${token}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ id: 'uid', email: 'test@test.com', role: 'developer' });
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify-email
// ---------------------------------------------------------------------------

describe('POST /api/auth/verify-email', () => {
  it('returns 400 when token field is missing', async () => {
    const res = await request(app).post('/api/auth/verify-email').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when token is invalid', async () => {
    setupRepo({ findOne: jest.fn().mockResolvedValue(null) });

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'invalid-token' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 for a valid verification token', async () => {
    const userRecord = {
      id: 'uid',
      email: 'test@test.com',
      emailVerifyToken: 'valid-token',
      emailVerified: false,
    };
    setupRepo({
      findOne: jest.fn().mockResolvedValue(userRecord),
      save: jest.fn().mockResolvedValue({ ...userRecord, emailVerified: true }),
    });

    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'valid-token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------

describe('POST /api/auth/forgot-password', () => {
  it('returns 400 when email field is missing', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 even when email does not exist (enumeration prevention)', async () => {
    setupRepo({ findOne: jest.fn().mockResolvedValue(null) });

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
// ---------------------------------------------------------------------------

describe('POST /api/auth/reset-password', () => {
  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when newPassword is too short', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'some-token', newPassword: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when reset token is invalid', async () => {
    setupRepo({ findOne: jest.fn().mockResolvedValue(null) });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'bad-token', newPassword: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------

describe('POST /api/auth/refresh', () => {
  it('returns 401 when no refresh_token cookie is present', async () => {
    const res = await request(app).post('/api/auth/refresh');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

describe('404 handler', () => {
  it('returns 404 for a nonexistent route', async () => {
    const res = await request(app).get('/nonexistent-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('returns 404 for an unknown /api/* route', async () => {
    const res = await request(app).get('/api/this-does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
