import { AppDataSource } from '../config/database.config';
import { UserSettings } from '../entities/user-settings.entity';
import { User } from '../entities/user.entity';
import { TeamMember } from '../entities/team-member.entity';
import { WebhookKey } from '../entities/webhook-key.entity';
import { AppError } from '../utils/app-error';
import { generateHmacKey } from '../utils/crypto';

export class SettingsService {
  private get settingsRepo() {
    return AppDataSource.getRepository(UserSettings);
  }

  private get userRepo() {
    return AppDataSource.getRepository(User);
  }

  private get teamMemberRepo() {
    return AppDataSource.getRepository(TeamMember);
  }

  private get webhookKeyRepo() {
    return AppDataSource.getRepository(WebhookKey);
  }

  /**
   * Get user_settings by userId.
   */
  async getSettings(userId: string): Promise<UserSettings> {
    const settings = await this.settingsRepo.findOne({ where: { userId } });
    if (!settings) throw AppError.notFound('Settings not found');
    return settings;
  }

  /**
   * Update user_settings fields (theme, emailNotifications).
   */
  async updateSettings(
    userId: string,
    data: { theme?: string; emailNotifications?: boolean },
  ): Promise<UserSettings> {
    const settings = await this.getSettings(userId);
    Object.assign(settings, data);
    return this.settingsRepo.save(settings);
  }

  /**
   * Get user profile fields.
   */
  async getProfile(userId: string): Promise<{ id: string; name: string; email: string; initials: string; avatarUrl: string | null }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw AppError.notFound('User not found');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      initials: user.initials,
      avatarUrl: user.avatarUrl,
    };
  }

  /**
   * Update user profile. Recalculates initials when name changes.
   */
  async updateProfile(
    userId: string,
    data: { name?: string; avatarUrl?: string },
  ): Promise<{ id: string; name: string; email: string; initials: string; avatarUrl: string | null }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw AppError.notFound('User not found');

    if (data.name !== undefined) {
      user.name = data.name;
      user.initials = data.name
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }

    if (data.avatarUrl !== undefined) {
      user.avatarUrl = data.avatarUrl;
    }

    await this.userRepo.save(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      initials: user.initials,
      avatarUrl: user.avatarUrl,
    };
  }

  /**
   * List team members where teamOwnerId = userId.
   */
  async getTeamMembers(userId: string): Promise<TeamMember[]> {
    return this.teamMemberRepo.find({
      where: { teamOwnerId: userId },
      relations: ['user'],
      order: { invitedAt: 'DESC' },
    });
  }

  /**
   * List webhook keys for user.
   */
  async getWebhookKeys(userId: string): Promise<WebhookKey[]> {
    return this.webhookKeyRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' } as any,
    });
  }

  /**
   * Create a new HMAC webhook key for user.
   */
  async createWebhookKey(userId: string): Promise<WebhookKey> {
    const hmacKey = generateHmacKey();
    const webhookKey = this.webhookKeyRepo.create({ userId, hmacKey });
    return this.webhookKeyRepo.save(webhookKey);
  }
}

export const settingsService = new SettingsService();
