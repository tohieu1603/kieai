import { Repository } from 'typeorm';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../config/database.config';
import { env } from '../config/env.config';
import { logger } from '../config/logger.config';
import { AppError } from '../utils/app-error';
import { generateRandomHex, sha256 } from '../utils/crypto';
import { emailService } from './email.service';
import { UserRole } from '../enums';

// Lazy entity imports to avoid circular dependency issues
let UserEntity: any;
let UserSettingsEntity: any;
let UserCreditEntity: any;

function getRepos() {
  if (!UserEntity) {
    UserEntity = require('../entities/user.entity').User;
    UserSettingsEntity = require('../entities/user-settings.entity').UserSettings;
    UserCreditEntity = require('../entities/user-credit.entity').UserCredit;
  }
  return {
    userRepo: AppDataSource.getRepository(UserEntity),
    settingsRepo: AppDataSource.getRepository(UserSettingsEntity),
    creditRepo: AppDataSource.getRepository(UserCreditEntity),
  };
}

/**
 * Refresh token storage — in production, use Redis or DB table.
 * Map<tokenFamily, { token, userId, expiresAt }>
 * Token family rotation: each family has exactly one valid refresh token.
 */
interface RefreshTokenRecord {
  token: string;
  userId: string;
  family: string;
  expiresAt: Date;
  revoked: boolean;
}

// In-memory store — replace with DB/Redis in production
const refreshTokenStore = new Map<string, RefreshTokenRecord>();

export class AuthService {
  /**
   * Register a new user.
   */
  async register(data: {
    name: string;
    email: string;
    password: string;
  }) {
    const { userRepo, settingsRepo, creditRepo } = getRepos();

    const existing = await userRepo.findOne({ where: { email: data.email } });
    if (existing) throw AppError.conflict('Email already registered');

    const passwordHash = await bcryptjs.hash(data.password, 12);
    const initials = data.name
      .split(' ')
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);

    const emailVerifyToken = generateRandomHex(32);

    const user = await userRepo.save(
      userRepo.create({
        name: data.name,
        email: data.email,
        passwordHash,
        initials,
        emailVerifyToken,
        emailVerified: false,
        role: UserRole.DEVELOPER,
      }),
    );

    // Create default settings & credit balance
    await settingsRepo.save(settingsRepo.create({ userId: user.id }));
    await creditRepo.save(creditRepo.create({ userId: user.id, balance: 0 }));

    logger.info(`User registered: ${user.email}`);

    // Send verification email (non-blocking — failure does not break registration)
    emailService.sendVerificationEmail(user.email, user.name, emailVerifyToken);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      message: 'Registration successful. Please verify your email.',
    };
  }

  /**
   * Verify email with token.
   */
  async verifyEmail(token: string) {
    const { userRepo } = getRepos();
    const user = await userRepo.findOne({ where: { emailVerifyToken: token } });
    if (!user) throw AppError.badRequest('Invalid verification token');

    user.emailVerified = true;
    user.emailVerifyToken = null;
    await userRepo.save(user);

    logger.info(`Email verified: ${user.email}`);
    return { message: 'Email verified successfully' };
  }

  /**
   * Login — returns access + refresh tokens.
   */
  async login(email: string, password: string) {
    const { userRepo } = getRepos();
    const user = await userRepo.findOne({ where: { email } });
    if (!user) throw AppError.unauthorized('Invalid email or password');

    const valid = await bcryptjs.compare(password, user.passwordHash);
    if (!valid) throw AppError.unauthorized('Invalid email or password');

    if (!user.emailVerified) {
      throw AppError.forbidden('Please verify your email before logging in');
    }

    const { accessToken, refreshToken, family } = this.generateTokenPair(user);

    // Store refresh token with family
    this.storeRefreshToken(refreshToken, user.id, family);

    logger.info(`User logged in: ${user.email}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        initials: user.initials,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token using refresh token.
   * Implements token family rotation — if a used token is resubmitted,
   * the entire family is revoked (detects token theft).
   */
  async refreshAccessToken(refreshTokenValue: string) {
    let decoded: any;
    try {
      decoded = jwt.verify(refreshTokenValue, env.jwt.refreshSecret);
    } catch {
      throw AppError.unauthorized('Invalid refresh token');
    }

    const family = decoded.family as string;
    const stored = refreshTokenStore.get(family);

    if (!stored) {
      throw AppError.unauthorized('Refresh token family not found');
    }

    // Token reuse detection — revoke entire family
    if (stored.revoked) {
      // Someone tried to use an already-rotated token → theft detected
      refreshTokenStore.delete(family);
      logger.warn(`Refresh token reuse detected for family ${family}, user ${decoded.id}`);
      throw AppError.unauthorized('Token reuse detected. All sessions revoked.');
    }

    if (stored.token !== refreshTokenValue) {
      // Different token in same family → theft
      stored.revoked = true;
      logger.warn(`Refresh token mismatch for family ${family}`);
      throw AppError.unauthorized('Invalid refresh token');
    }

    // Rotate: mark old as revoked, issue new
    stored.revoked = true;

    const { userRepo } = getRepos();
    const user = await userRepo.findOne({ where: { id: decoded.id } });
    if (!user) throw AppError.unauthorized('User not found');

    const { accessToken, refreshToken: newRefreshToken } = this.generateTokenPair(user, family);
    this.storeRefreshToken(newRefreshToken, user.id, family);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Revoke a specific refresh token family (logout).
   */
  async logout(refreshTokenValue: string) {
    try {
      const decoded: any = jwt.verify(refreshTokenValue, env.jwt.refreshSecret);
      refreshTokenStore.delete(decoded.family);
    } catch {
      // Token already expired or invalid — still clear cookies
    }
    return { message: 'Logged out successfully' };
  }

  /**
   * Revoke ALL refresh tokens for a user.
   */
  async revokeAllTokens(userId: string) {
    for (const [family, record] of refreshTokenStore.entries()) {
      if (record.userId === userId) {
        refreshTokenStore.delete(family);
      }
    }
    logger.info(`All tokens revoked for user ${userId}`);
    return { message: 'All sessions revoked' };
  }

  /**
   * Forgot password — generates reset token, stores hash + expiry (1 hour).
   * Always returns success message to avoid email enumeration.
   */
  async forgotPassword(email: string) {
    const { userRepo } = getRepos();
    const user = await userRepo.findOne({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user) return { message: 'If an account exists, a reset email has been sent.' };

    // Don't allow reset for OAuth-only users (no password)
    if (user.authProvider !== 'local' && !user.passwordHash) {
      return { message: 'If an account exists, a reset email has been sent.' };
    }

    const resetToken = generateRandomHex(32);
    const resetTokenHash = sha256(resetToken);

    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await userRepo.save(user);

    logger.info(`Password reset requested for: ${user.email}`);

    // Send reset email (non-blocking)
    emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

    // In dev, also log the token for convenience
    if (!env.isProduction) {
      logger.debug(`[DEV] Reset token for ${email}: ${resetToken}`);
    }

    return { message: 'If an account exists, a reset email has been sent.' };
  }

  /**
   * Reset password using token.
   * Validates token hash, checks expiry, updates password, clears token.
   */
  async resetPassword(token: string, newPassword: string) {
    const { userRepo } = getRepos();
    const tokenHash = sha256(token);

    const user = await userRepo.findOne({
      where: { passwordResetToken: tokenHash },
    });

    if (!user) throw AppError.badRequest('Invalid or expired reset token');

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      // Clear expired token
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await userRepo.save(user);
      throw AppError.badRequest('Reset token has expired. Please request a new one.');
    }

    user.passwordHash = await bcryptjs.hash(newPassword, 12);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await userRepo.save(user);

    // Revoke all refresh tokens for security
    await this.revokeAllTokens(user.id);

    logger.info(`Password reset completed for: ${user.email}`);
    return { message: 'Password reset successfully. Please login with your new password.' };
  }

  /**
   * Generate tokens for OAuth-authenticated user and return login result.
   * Called after passport successfully authenticates the user.
   */
  async oauthLogin(user: any) {
    const { accessToken, refreshToken, family } = this.generateTokenPair(user);
    this.storeRefreshToken(refreshToken, user.id, family);

    logger.info(`OAuth login: ${user.email} via ${user.authProvider}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        initials: user.initials,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }

  // -- Private helpers --

  private generateTokenPair(user: any, existingFamily?: string) {
    const family = existingFamily || uuidv4();

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.jwt.accessSecret,
      { expiresIn: env.jwt.accessExpiresIn as any },
    );

    const refreshToken = jwt.sign(
      { id: user.id, family },
      env.jwt.refreshSecret,
      { expiresIn: env.jwt.refreshExpiresIn as any },
    );

    return { accessToken, refreshToken, family };
  }

  private storeRefreshToken(token: string, userId: string, family: string) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    refreshTokenStore.set(family, {
      token,
      userId,
      family,
      expiresAt,
      revoked: false,
    });
  }
}

export const authService = new AuthService();
