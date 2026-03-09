/**
 * Unit tests for AuthService.
 * All DB access is mocked via AppDataSource.getRepository.
 */

// --- Module mocks (must be top-level, before any imports) ---

jest.mock('../../../src/config/database.config', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

jest.mock('../../../src/config/env.config', () => ({
  env: {
    jwt: {
      accessSecret: 'access-secret',
      refreshSecret: 'refresh-secret',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    },
    isProduction: false,
  },
}));

jest.mock('../../../src/config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// uuid is an ESM-only package in newer versions — mock it to avoid transform issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-family'),
}));

// Email service mock — prevent nodemailer transport creation
jest.mock('../../../src/services/email.service', () => ({
  emailService: {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  },
}));

// Lazy entity mocks — AuthService uses require() inside getRepos()
jest.mock('../../../src/entities/user.entity', () => ({ User: 'UserEntity' }));
jest.mock('../../../src/entities/user-settings.entity', () => ({
  UserSettings: 'UserSettingsEntity',
}));
jest.mock('../../../src/entities/user-credit.entity', () => ({
  UserCredit: 'UserCreditEntity',
}));

// --- Imports (after mocks) ---

import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../../src/services/auth.service';
import { AppError } from '../../../src/utils/app-error';
import { UserRole } from '../../../src/enums';

// --- Helpers ---

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn().mockImplementation((entity: any) =>
    Promise.resolve({ id: 'test-uuid', ...entity }),
  ),
  create: jest.fn().mockImplementation((data: any) => data),
  remove: jest.fn(),
  count: jest.fn(),
});

// --- Test suite ---

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: ReturnType<typeof createMockRepo>;
  let mockSettingsRepo: ReturnType<typeof createMockRepo>;
  let mockCreditRepo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepo = createMockRepo();
    mockSettingsRepo = createMockRepo();
    mockCreditRepo = createMockRepo();

    const { AppDataSource } = require('../../../src/config/database.config');
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity: any) => {
      if (entity === 'UserEntity') return mockUserRepo;
      if (entity === 'UserSettingsEntity') return mockSettingsRepo;
      if (entity === 'UserCreditEntity') return mockCreditRepo;
      return createMockRepo();
    });

    service = new AuthService();
  });

  // -------------------------------------------------------------------------
  // register()
  // -------------------------------------------------------------------------
  describe('register()', () => {
    const registerData = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Password123!',
    };

    it('creates user, settings, and credits on successful registration', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      mockUserRepo.create.mockImplementation((data: any) => data);
      mockUserRepo.save.mockResolvedValue({
        id: 'user-id-1',
        name: registerData.name,
        email: registerData.email,
      });
      mockSettingsRepo.create.mockImplementation((data: any) => data);
      mockSettingsRepo.save.mockResolvedValue({});
      mockCreditRepo.create.mockImplementation((data: any) => data);
      mockCreditRepo.save.mockResolvedValue({});

      const result = await service.register(registerData);

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: registerData.email },
      });
      expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
      expect(mockSettingsRepo.save).toHaveBeenCalledTimes(1);
      expect(mockCreditRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        name: registerData.name,
        email: registerData.email,
        message: 'Registration successful. Please verify your email.',
      });
    });

    it('throws 409 conflict when email already exists', async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: 'existing-id', email: registerData.email });

      await expect(service.register(registerData)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Email already registered',
      });

      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });

    it('hashes the password before saving', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      let savedData: any = null;
      mockUserRepo.create.mockImplementation((data: any) => {
        savedData = data;
        return data;
      });
      mockUserRepo.save.mockImplementation((data: any) =>
        Promise.resolve({ id: 'uid', ...data }),
      );
      mockSettingsRepo.create.mockImplementation((d: any) => d);
      mockSettingsRepo.save.mockResolvedValue({});
      mockCreditRepo.create.mockImplementation((d: any) => d);
      mockCreditRepo.save.mockResolvedValue({});

      await service.register(registerData);

      expect(savedData.passwordHash).toBeDefined();
      const isHashed = await bcryptjs.compare(registerData.password, savedData.passwordHash);
      expect(isHashed).toBe(true);
    });

    it('generates correct initials from name', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      let createdData: any = null;
      mockUserRepo.create.mockImplementation((data: any) => {
        createdData = data;
        return data;
      });
      mockUserRepo.save.mockImplementation((data: any) =>
        Promise.resolve({ id: 'uid', ...data }),
      );
      mockSettingsRepo.create.mockImplementation((d: any) => d);
      mockSettingsRepo.save.mockResolvedValue({});
      mockCreditRepo.create.mockImplementation((d: any) => d);
      mockCreditRepo.save.mockResolvedValue({});

      await service.register({ ...registerData, name: 'Alice Bob' });

      expect(createdData.initials).toBe('AB');
    });

    it('assigns DEVELOPER role by default', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      let createdData: any = null;
      mockUserRepo.create.mockImplementation((data: any) => {
        createdData = data;
        return data;
      });
      mockUserRepo.save.mockImplementation((data: any) =>
        Promise.resolve({ id: 'uid', ...data }),
      );
      mockSettingsRepo.create.mockImplementation((d: any) => d);
      mockSettingsRepo.save.mockResolvedValue({});
      mockCreditRepo.create.mockImplementation((d: any) => d);
      mockCreditRepo.save.mockResolvedValue({});

      await service.register(registerData);

      expect(createdData.role).toBe(UserRole.DEVELOPER);
    });
  });

  // -------------------------------------------------------------------------
  // login()
  // -------------------------------------------------------------------------
  describe('login()', () => {
    const email = 'user@example.com';
    const password = 'Secret123!';

    const buildUser = async (overrides: Record<string, any> = {}) => ({
      id: 'user-id',
      name: 'Test User',
      email,
      passwordHash: await bcryptjs.hash(password, 1), // cost=1 for speed
      emailVerified: true,
      initials: 'TU',
      avatarUrl: null,
      role: UserRole.DEVELOPER,
      authProvider: 'local',
      ...overrides,
    });

    it('returns access token, refresh token, and user on valid credentials', async () => {
      const user = await buildUser();
      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.login(email, password);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toMatchObject({
        id: user.id,
        email: user.email,
        name: user.name,
      });
    });

    it('throws 401 when email does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.login('no@one.com', password)).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('throws 401 when password is wrong', async () => {
      const user = await buildUser();
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(service.login(email, 'WrongPass!')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('throws 403 when email is not verified', async () => {
      const user = await buildUser({ emailVerified: false });
      mockUserRepo.findOne.mockResolvedValue(user);

      await expect(service.login(email, password)).rejects.toMatchObject({
        statusCode: 403,
        message: 'Please verify your email before logging in',
      });
    });

    it('issues verifiable JWT tokens signed with correct secrets', async () => {
      const user = await buildUser();
      mockUserRepo.findOne.mockResolvedValue(user);

      const { accessToken, refreshToken } = await service.login(email, password);

      const decodedAccess = jwt.verify(accessToken, 'access-secret') as any;
      expect(decodedAccess.id).toBe(user.id);
      expect(decodedAccess.email).toBe(user.email);

      const decodedRefresh = jwt.verify(refreshToken, 'refresh-secret') as any;
      expect(decodedRefresh.id).toBe(user.id);
    });
  });

  // -------------------------------------------------------------------------
  // verifyEmail()
  // -------------------------------------------------------------------------
  describe('verifyEmail()', () => {
    it('sets emailVerified=true and clears token on valid token', async () => {
      const user = {
        id: 'uid',
        email: 'user@example.com',
        emailVerified: false,
        emailVerifyToken: 'valid-token-hex',
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockImplementation((u: any) => Promise.resolve(u));

      const result = await service.verifyEmail('valid-token-hex');

      expect(result).toEqual({ message: 'Email verified successfully' });
      expect(user.emailVerified).toBe(true);
      expect(user.emailVerifyToken).toBeNull();
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
    });

    it('throws 400 when token is invalid', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyEmail('bad-token')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Invalid verification token',
      });
    });
  });

  // -------------------------------------------------------------------------
  // oauthLogin()
  // -------------------------------------------------------------------------
  describe('oauthLogin()', () => {
    it('returns tokens and user object for any authenticated user', async () => {
      const oauthUser = {
        id: 'oauth-uid',
        name: 'OAuth User',
        email: 'oauth@example.com',
        initials: 'OU',
        avatarUrl: 'https://avatar.url',
        role: UserRole.DEVELOPER,
        authProvider: 'google',
      };

      const result = await service.oauthLogin(oauthUser);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toMatchObject({
        id: oauthUser.id,
        email: oauthUser.email,
        name: oauthUser.name,
      });
    });

    it('issues verifiable access token for oauth user', async () => {
      const oauthUser = {
        id: 'oauth-uid-2',
        name: 'OAuth2',
        email: 'oauth2@example.com',
        initials: 'O2',
        avatarUrl: null,
        role: UserRole.DEVELOPER,
        authProvider: 'github',
      };

      const { accessToken } = await service.oauthLogin(oauthUser);
      const decoded = jwt.verify(accessToken, 'access-secret') as any;

      expect(decoded.id).toBe(oauthUser.id);
    });
  });

  // -------------------------------------------------------------------------
  // logout()
  // -------------------------------------------------------------------------
  describe('logout()', () => {
    it('returns success message for a valid refresh token', async () => {
      // Generate a real refresh token to logout with
      const token = jwt.sign(
        { id: 'user-id', family: 'some-family' },
        'refresh-secret',
        { expiresIn: '7d' },
      );

      const result = await service.logout(token);

      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('returns success message even for an invalid/expired token', async () => {
      const result = await service.logout('totally-invalid-token');

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  // -------------------------------------------------------------------------
  // forgotPassword()
  // -------------------------------------------------------------------------
  describe('forgotPassword()', () => {
    const successMessage = { message: 'If an account exists, a reset email has been sent.' };

    it('saves password reset token hash when user exists', async () => {
      const user: any = {
        id: 'uid',
        email: 'user@example.com',
        authProvider: 'local',
        passwordHash: 'some-hash',
        passwordResetToken: null,
        passwordResetExpires: null,
      };
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockImplementation((u: any) => Promise.resolve(u));

      const result = await service.forgotPassword(user.email);

      expect(result).toEqual(successMessage);
      expect(mockUserRepo.save).toHaveBeenCalledTimes(1);
      expect(user.passwordResetToken).toBeTruthy();
      expect(user.passwordResetExpires).toBeInstanceOf(Date);
    });

    it('returns same success message when user does not exist (no enumeration)', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.forgotPassword('nobody@example.com');

      expect(result).toEqual(successMessage);
      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });

    it('returns same success message for OAuth-only users without a password', async () => {
      const oauthUser = {
        id: 'uid',
        email: 'oauthonly@example.com',
        authProvider: 'google',
        passwordHash: null,
      };
      mockUserRepo.findOne.mockResolvedValue(oauthUser);

      const result = await service.forgotPassword(oauthUser.email);

      expect(result).toEqual(successMessage);
      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // refreshAccessToken()
  // -------------------------------------------------------------------------
  describe('refreshAccessToken()', () => {
    it('returns new token pair on valid refresh token', async () => {
      const user = {
        id: 'uid',
        email: 'user@example.com',
        role: UserRole.DEVELOPER,
        name: 'Test',
        initials: 'TT',
        avatarUrl: null,
      };

      // First login to store a token in the in-memory store
      const hashPw = await bcryptjs.hash('pass', 1);
      mockUserRepo.findOne.mockResolvedValue({
        ...user,
        passwordHash: hashPw,
        emailVerified: true,
        authProvider: 'local',
      });

      const loginResult = await service.login(user.email, 'pass');
      const { refreshToken } = loginResult;

      // Use the refresh token once — should succeed
      mockUserRepo.findOne.mockResolvedValue(user);
      const refreshResult = await service.refreshAccessToken(refreshToken);

      expect(refreshResult).toHaveProperty('accessToken');
      expect(refreshResult).toHaveProperty('refreshToken');

      // Verify the new access token is a valid JWT
      const decoded = jwt.verify(refreshResult.accessToken, 'access-secret') as any;
      expect(decoded.id).toBe(user.id);
    });

    it('throws 401 for an invalid refresh token string', async () => {
      await expect(service.refreshAccessToken('bad.token.value')).rejects.toMatchObject({
        statusCode: 401,
      });
    });
  });

  // -------------------------------------------------------------------------
  // revokeAllTokens()
  // -------------------------------------------------------------------------
  describe('revokeAllTokens()', () => {
    it('returns confirmation message', async () => {
      const result = await service.revokeAllTokens('user-id');
      expect(result).toEqual({ message: 'All sessions revoked' });
    });
  });
});
