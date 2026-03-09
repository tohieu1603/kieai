/**
 * E2E tests for API endpoints.
 * Exercises multiple route groups through the full Express middleware chain.
 * DB layer and rate limiters are mocked.
 */

import 'reflect-metadata';

// --- Module mocks (must precede app import) ---

const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  addGroupBy: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getMany: jest.fn().mockResolvedValue([]),
  getRawMany: jest.fn().mockResolvedValue([]),
  getRawOne: jest.fn().mockResolvedValue(null),
};

jest.mock('../../src/config/database.config', () => ({
  AppDataSource: {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      save: jest.fn().mockImplementation((e: any) => Promise.resolve({ id: 'uuid', ...e })),
      create: jest.fn().mockImplementation((d: any) => d),
      remove: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
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

// Bypass all rate limiters
jest.mock('../../src/middlewares/rate-limit.middleware', () => ({
  globalRateLimit: (_req: any, _res: any, next: any) => next(),
  authRateLimit: (_req: any, _res: any, next: any) => next(),
  apiKeyRateLimit: (_req: any, _res: any, next: any) => next(),
}));

// Mock uuid (v13 ships pure ESM which CJS Jest cannot parse)
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid-v4') }));

// Entity mocks — covers both lazy require() and direct ES imports used by services
jest.mock('../../src/entities/user.entity', () => ({ User: class User {} }));
jest.mock('../../src/entities/user-settings.entity', () => ({ UserSettings: class UserSettings {} }));
jest.mock('../../src/entities/user-credit.entity', () => ({ UserCredit: class UserCredit {} }));
jest.mock('../../src/entities/log.entity', () => ({ Log: class Log {} }));
jest.mock('../../src/entities/model.entity', () => ({ Model: class Model {} }));
jest.mock('../../src/entities/featured-slide.entity', () => ({ FeaturedSlide: class FeaturedSlide {} }));
jest.mock('../../src/entities/api-key.entity', () => ({ ApiKey: class ApiKey {} }));
jest.mock('../../src/entities/credit-package.entity', () => ({ CreditPackage: class CreditPackage {} }));
jest.mock('../../src/entities/transaction.entity', () => ({ Transaction: class Transaction {} }));
jest.mock('../../src/entities/invoice.entity', () => ({ Invoice: class Invoice {} }));
jest.mock('../../src/entities/filter-category.entity', () => ({ FilterCategory: class FilterCategory {} }));
jest.mock('../../src/entities/filter-option.entity', () => ({ FilterOption: class FilterOption {} }));
jest.mock('../../src/entities/provider.entity', () => ({ Provider: class Provider {} }));
jest.mock('../../src/entities/team-member.entity', () => ({ TeamMember: class TeamMember {} }));
jest.mock('../../src/entities/webhook-key.entity', () => ({ WebhookKey: class WebhookKey {} }));
jest.mock('../../src/entities/subscription-plan.entity', () => ({ SubscriptionPlan: class SubscriptionPlan {} }));
jest.mock('../../src/entities/subscription.entity', () => ({ Subscription: class Subscription {} }));
jest.mock('../../src/entities/api-update.entity', () => ({ ApiUpdate: class ApiUpdate {} }));
jest.mock('../../src/entities/api-update-tag.entity', () => ({ ApiUpdateTag: class ApiUpdateTag {} }));
jest.mock('../../src/entities/api-endpoint.entity', () => ({ ApiEndpoint: class ApiEndpoint {} }));
jest.mock('../../src/entities/api-request-param.entity', () => ({ ApiRequestParam: class ApiRequestParam {} }));
jest.mock('../../src/entities/model-pricing-tier.entity', () => ({ ModelPricingTier: class ModelPricingTier {} }));
jest.mock('../../src/entities/model-playground-field.entity', () => ({ ModelPlaygroundField: class ModelPlaygroundField {} }));
jest.mock('../../src/entities/model-field-option.entity', () => ({ ModelFieldOption: class ModelFieldOption {} }));

// --- Imports ---

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../../src/config/database.config';
import app from '../../src/app';

// --- Helpers ---

function getAuthCookie(): string {
  const token = jwt.sign(
    { id: 'user-id', email: 'test@test.com', role: 'developer' },
    'access-secret',
  );
  return `access_token=${token}`;
}

function setupRepo(overrides: Record<string, jest.Mock> = {}) {
  const base = {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    save: jest.fn().mockImplementation((e: any) => Promise.resolve({ id: 'uuid', ...e })),
    create: jest.fn().mockImplementation((d: any) => d),
    remove: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    ...overrides,
  };
  (AppDataSource.getRepository as jest.Mock).mockReturnValue(base);
  return base;
}

// ---------------------------------------------------------------------------
// Swagger / Health
// ---------------------------------------------------------------------------

describe('GET /api-docs.json', () => {
  it('returns 200 with a valid swagger spec object', async () => {
    const res = await request(app).get('/api-docs.json');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      openapi: expect.any(String),
      info: expect.objectContaining({ title: expect.any(String) }),
    });
  });
});

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(res.body.timestamp).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------

describe('404 handling', () => {
  it('returns 404 with success:false for unknown route', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false });
  });

  it('returns 404 for deeply nested unknown route', async () => {
    const res = await request(app).get('/api/v99/deep/route/that/does/not/exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Auth flow
// ---------------------------------------------------------------------------

describe('Auth flow', () => {
  describe('POST /api/auth/register', () => {
    it('returns 201 for valid registration data', async () => {
      setupRepo({ findOne: jest.fn().mockResolvedValue(null) });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Bob Builder', email: 'bob@example.com', password: 'secure1234' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({ email: 'bob@example.com' });
    });

    it('returns 400 for invalid registration data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'X', email: 'bad', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns 400 when credentials are missing', async () => {
      const res = await request(app).post('/api/auth/login').send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 without auth cookie', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 200 with user data when authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', [getAuthCookie()]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({ id: 'user-id', email: 'test@test.com', role: 'developer' });
    });
  });
});

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

describe('Models endpoints', () => {
  beforeEach(() => {
    // Reset to full mock repo before each model test
    setupRepo();
  });

  it('GET /api/models — returns 200 with paginated shape (no filters)', async () => {
    const res = await request(app).get('/api/models');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/models — returns 200 with ?q search query parameter', async () => {
    // ?q triggers modelService.search() which uses createQueryBuilder
    const res = await request(app).get('/api/models?q=gpt&page=1&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/models/featured — returns 200', async () => {
    const res = await request(app).get('/api/models/featured');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

describe('GET /api/filters', () => {
  it('returns 200 with categories and providers shape', async () => {
    setupRepo({ find: jest.fn().mockResolvedValue([]) });

    const res = await request(app).get('/api/filters');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------

describe('API Keys endpoints', () => {
  it('POST /api/api-keys — returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/api-keys')
      .send({ name: 'my key' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/api-keys — returns 401 without auth', async () => {
    const res = await request(app).get('/api/api-keys');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/api-keys — returns 200 when authenticated', async () => {
    setupRepo({ find: jest.fn().mockResolvedValue([]) });

    const res = await request(app)
      .get('/api/api-keys')
      .set('Cookie', [getAuthCookie()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

describe('Billing endpoints', () => {
  it('GET /api/billing/packages — returns 200 (public endpoint)', async () => {
    setupRepo({ find: jest.fn().mockResolvedValue([]) });

    const res = await request(app).get('/api/billing/packages');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/billing/balance — returns 401 without auth', async () => {
    const res = await request(app).get('/api/billing/balance');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/billing/transactions — returns 401 without auth', async () => {
    const res = await request(app).get('/api/billing/transactions');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/billing/purchase — returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/billing/purchase')
      .send({ packageId: 'some-uuid' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

describe('Settings endpoints', () => {
  it('GET /api/settings — returns 401 without auth', async () => {
    const res = await request(app).get('/api/settings');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/settings/profile — returns 401 without auth', async () => {
    const res = await request(app).get('/api/settings/profile');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/settings — returns 200 when authenticated', async () => {
    setupRepo({
      findOne: jest.fn().mockResolvedValue({
        id: 'settings-uuid',
        userId: 'user-id',
        theme: 'dark',
        emailNotifications: true,
      }),
    });

    const res = await request(app)
      .get('/api/settings')
      .set('Cookie', [getAuthCookie()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

describe('GET /api/logs', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/logs');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 200 with authenticated request', async () => {
    setupRepo({ findAndCount: jest.fn().mockResolvedValue([[], 0]) });

    const res = await request(app)
      .get('/api/logs')
      .set('Cookie', [getAuthCookie()]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

describe('Subscriptions endpoints', () => {
  it('GET /api/subscriptions/plans — returns 200 (public endpoint)', async () => {
    setupRepo({ find: jest.fn().mockResolvedValue([]) });

    const res = await request(app).get('/api/subscriptions/plans');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /api/subscriptions/my — returns 401 without auth', async () => {
    const res = await request(app).get('/api/subscriptions/my');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

describe('GET /api/invoices', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/invoices');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
