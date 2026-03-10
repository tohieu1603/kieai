import { AppDataSource } from '../config/database.config';
import { ApiKey } from '../entities/api-key.entity';
import { BaseService } from './base.service';
import { AppError } from '../utils/app-error';
import { generateApiKey, sha256 } from '../utils/crypto';

export class ApiKeyService extends BaseService<ApiKey> {
  constructor() {
    super(AppDataSource.getRepository(ApiKey));
  }

  protected get entityName(): string {
    return 'API key';
  }

  /**
   * Create a new API key for the user.
   * Returns the full raw key ONLY on creation — never retrievable again.
   */
  async createKey(userId: string, name: string): Promise<{
    id: string;
    name: string;
    keyPrefix: string;
    key: string;
    createdAt: Date;
  }> {
    const { key, hash, prefix } = generateApiKey();

    const apiKey = await this.create({
      userId,
      name,
      keyHash: hash,
      keyPrefix: prefix,
      isRevoked: false,
      lastUsedAt: null,
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      key,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * List all non-revoked API keys for a user.
   * Never returns keyHash or full key.
   */
  async listKeys(userId: string) {
    const [keys] = await this.findAll({
      where: { userId, isRevoked: false },
      order: { createdAt: 'DESC' } as any,
    });

    return keys.map(({ id, name, keyPrefix, lastUsedAt, hourlyLimit, dailyLimit, totalLimit, ipWhitelist, createdAt }) => ({
      id,
      name,
      keyPrefix,
      lastUsedAt,
      hourlyLimit,
      dailyLimit,
      totalLimit,
      ipWhitelist,
      createdAt,
    }));
  }

  /**
   * Rename an API key. Uses findByIdAndOwner to prevent IDOR.
   */
  async renameKey(id: string, userId: string, name: string): Promise<{ id: string; name: string }> {
    const apiKey = await this.findByIdAndOwner(id, userId);
    apiKey.name = name;
    await this.repository.save(apiKey);
    return { id: apiKey.id, name: apiKey.name };
  }

  /**
   * Revoke an API key by id. Uses findByIdAndOwner to prevent IDOR.
   */
  async revokeKey(id: string, userId: string): Promise<void> {
    const apiKey = await this.findByIdAndOwner(id, userId);
    apiKey.isRevoked = true;
    await this.repository.save(apiKey);
  }

  /**
   * Update IP whitelist for an API key.
   */
  async updateWhitelist(id: string, userId: string, ips: string[]): Promise<{ id: string; ipWhitelist: string[] }> {
    const apiKey = await this.findByIdAndOwner(id, userId);
    apiKey.ipWhitelist = ips;
    await this.repository.save(apiKey);
    return { id: apiKey.id, ipWhitelist: apiKey.ipWhitelist };
  }

  /**
   * Update safe-spend limits for an API key.
   */
  async updateLimits(
    id: string,
    userId: string,
    limits: { hourlyLimit: number; dailyLimit: number; totalLimit: number },
  ): Promise<{ id: string; hourlyLimit: number; dailyLimit: number; totalLimit: number }> {
    const apiKey = await this.findByIdAndOwner(id, userId);
    apiKey.hourlyLimit = limits.hourlyLimit;
    apiKey.dailyLimit = limits.dailyLimit;
    apiKey.totalLimit = limits.totalLimit;
    await this.repository.save(apiKey);
    return {
      id: apiKey.id,
      hourlyLimit: apiKey.hourlyLimit,
      dailyLimit: apiKey.dailyLimit,
      totalLimit: apiKey.totalLimit,
    };
  }

  /**
   * Validate a raw API key. Updates lastUsedAt on success.
   * Returns the ApiKey record or null if invalid/revoked.
   */
  async validateApiKey(rawKey: string): Promise<ApiKey | null> {
    const keyHash = sha256(rawKey);

    const apiKey = await this.repository.findOne({
      where: { keyHash, isRevoked: false },
    });

    if (!apiKey) return null;

    apiKey.lastUsedAt = new Date();
    await this.repository.save(apiKey);

    return apiKey;
  }
}

export const apiKeyService = new ApiKeyService();
