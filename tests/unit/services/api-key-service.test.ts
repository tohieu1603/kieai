/**
 * Unit tests for ApiKeyService.
 * AppDataSource.getRepository is mocked so no real DB is hit.
 */

// --- Module mocks ---

jest.mock('../../../src/config/database.config', () => ({
  AppDataSource: { getRepository: jest.fn() },
}));

jest.mock('../../../src/config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ApiKeyService imports ApiKey entity at the top level (not lazily).
// We mock it so the constructor call to getRepository succeeds.
jest.mock('../../../src/entities/api-key.entity', () => ({ ApiKey: 'ApiKeyEntity' }));

// --- Imports (after mocks) ---

import { ApiKeyService } from '../../../src/services/api-key.service';
import { AppError } from '../../../src/utils/app-error';
import { sha256 } from '../../../src/utils/crypto';

// --- Helpers ---

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn().mockImplementation((entity: any) =>
    Promise.resolve({ id: 'key-uuid', createdAt: new Date(), ...entity }),
  ),
  create: jest.fn().mockImplementation((data: any) => data),
  remove: jest.fn(),
  count: jest.fn(),
});

// --- Test suite ---

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let mockRepo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepo = createMockRepo();

    const { AppDataSource } = require('../../../src/config/database.config');
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockRepo);

    service = new ApiKeyService();
  });

  // -------------------------------------------------------------------------
  // createKey()
  // -------------------------------------------------------------------------
  describe('createKey()', () => {
    it('returns a key with the km_ prefix', async () => {
      const userId = 'user-123';
      const name = 'My Key';
      const createdAt = new Date();

      mockRepo.create.mockImplementation((data: any) => data);
      mockRepo.save.mockImplementation((data: any) =>
        Promise.resolve({ id: 'key-id', createdAt, ...data }),
      );

      const result = await service.createKey(userId, name);

      expect(result.key).toMatch(/^km_/);
    });

    it('saves the hash of the key (not the raw key)', async () => {
      const userId = 'user-123';
      const name = 'Hash Test';
      const createdAt = new Date();

      let savedData: any = null;
      mockRepo.create.mockImplementation((data: any) => {
        savedData = data;
        return data;
      });
      mockRepo.save.mockImplementation((data: any) =>
        Promise.resolve({ id: 'key-id', createdAt, ...data }),
      );

      const result = await service.createKey(userId, name);

      // The hash stored should match sha256 of the returned raw key
      expect(savedData.keyHash).toBe(sha256(result.key));
    });

    it('saves a keyPrefix that is a substring of the raw key body', async () => {
      const createdAt = new Date();

      let savedData: any = null;
      mockRepo.create.mockImplementation((data: any) => {
        savedData = data;
        return data;
      });
      mockRepo.save.mockImplementation((data: any) =>
        Promise.resolve({ id: 'key-id', createdAt, ...data }),
      );

      const result = await service.createKey('user-1', 'Prefix Test');

      // key format: km_<hex> — prefix is first 8 chars of the hex portion
      const rawBody = result.key.replace('km_', '');
      expect(rawBody.startsWith(savedData.keyPrefix)).toBe(true);
    });

    it('sets isRevoked=false on creation', async () => {
      const createdAt = new Date();

      let savedData: any = null;
      mockRepo.create.mockImplementation((data: any) => {
        savedData = data;
        return data;
      });
      mockRepo.save.mockImplementation((data: any) =>
        Promise.resolve({ id: 'key-id', createdAt, ...data }),
      );

      await service.createKey('user-1', 'New Key');

      expect(savedData.isRevoked).toBe(false);
    });

    it('returns id, name, keyPrefix, key, and createdAt', async () => {
      const createdAt = new Date('2024-01-01');
      mockRepo.create.mockImplementation((data: any) => data);
      mockRepo.save.mockImplementation((data: any) =>
        Promise.resolve({ id: 'the-id', createdAt, name: 'K', keyPrefix: 'ab12cd34', ...data }),
      );

      const result = await service.createKey('u1', 'K');

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('keyPrefix');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('createdAt');
      // keyHash must NOT be present in the returned object
      expect(result).not.toHaveProperty('keyHash');
    });
  });

  // -------------------------------------------------------------------------
  // listKeys()
  // -------------------------------------------------------------------------
  describe('listKeys()', () => {
    it('returns only non-sensitive fields (no keyHash)', async () => {
      const now = new Date();
      mockRepo.findAndCount.mockResolvedValue([
        [
          {
            id: 'k1',
            name: 'Key One',
            keyPrefix: 'aabb1122',
            keyHash: 'secret-hash-should-not-appear',
            lastUsedAt: null,
            createdAt: now,
            userId: 'u1',
            isRevoked: false,
          },
        ],
        1,
      ]);

      const result = await service.listKeys('u1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'k1',
        name: 'Key One',
        keyPrefix: 'aabb1122',
        lastUsedAt: null,
        createdAt: now,
      });
      expect(result[0]).not.toHaveProperty('keyHash');
    });

    it('calls findAndCount with userId and isRevoked=false filter', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.listKeys('user-abc');

      expect(mockRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-abc', isRevoked: false }),
        }),
      );
    });

    it('returns empty array when user has no active keys', async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.listKeys('user-no-keys');

      expect(result).toEqual([]);
    });

    it('returns multiple keys sorted by createdAt DESC', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 1000);
      mockRepo.findAndCount.mockResolvedValue([
        [
          { id: 'k1', name: 'New', keyPrefix: 'aa', keyHash: 'h1', lastUsedAt: null, createdAt: now, userId: 'u1', isRevoked: false },
          { id: 'k2', name: 'Old', keyPrefix: 'bb', keyHash: 'h2', lastUsedAt: null, createdAt: earlier, userId: 'u1', isRevoked: false },
        ],
        2,
      ]);

      const result = await service.listKeys('u1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('k1');
      expect(result[1].id).toBe('k2');
    });
  });

  // -------------------------------------------------------------------------
  // revokeKey()
  // -------------------------------------------------------------------------
  describe('revokeKey()', () => {
    it('sets isRevoked=true and saves the key', async () => {
      const existingKey: any = {
        id: 'key-id',
        userId: 'user-id',
        isRevoked: false,
        keyHash: 'hash',
        keyPrefix: 'pref',
        name: 'Test',
        createdAt: new Date(),
        lastUsedAt: null,
      };
      mockRepo.findOne.mockResolvedValue(existingKey);
      mockRepo.save.mockImplementation((k: any) => Promise.resolve(k));

      await service.revokeKey('key-id', 'user-id');

      expect(existingKey.isRevoked).toBe(true);
      expect(mockRepo.save).toHaveBeenCalledWith(existingKey);
    });

    it('throws 404 when key does not belong to user (IDOR prevention)', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.revokeKey('key-id', 'wrong-user')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // -------------------------------------------------------------------------
  // validateApiKey()
  // -------------------------------------------------------------------------
  describe('validateApiKey()', () => {
    it('returns the ApiKey record and updates lastUsedAt for a valid key', async () => {
      const rawKey = 'km_validkeystring1234567890abcdef';
      const existingKey: any = {
        id: 'key-id',
        keyHash: sha256(rawKey),
        isRevoked: false,
        lastUsedAt: null,
        name: 'Prod Key',
      };
      mockRepo.findOne.mockResolvedValue(existingKey);
      mockRepo.save.mockImplementation((k: any) => Promise.resolve(k));

      const result = await service.validateApiKey(rawKey);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('key-id');
      expect(existingKey.lastUsedAt).toBeInstanceOf(Date);
      expect(mockRepo.save).toHaveBeenCalledWith(existingKey);
    });

    it('queries by sha256 hash of the raw key', async () => {
      const rawKey = 'km_somekeyvalue';
      mockRepo.findOne.mockResolvedValue(null);

      await service.validateApiKey(rawKey);

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { keyHash: sha256(rawKey), isRevoked: false },
      });
    });

    it('returns null when key does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.validateApiKey('km_doesnotexist');

      expect(result).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('returns null for a revoked key (filtered in query)', async () => {
      // Revoked keys are excluded by the where clause — findOne returns null
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.validateApiKey('km_revokedkey');

      expect(result).toBeNull();
    });
  });
});
