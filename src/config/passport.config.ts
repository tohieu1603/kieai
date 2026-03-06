import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { env } from './env.config';
import { AppDataSource } from './database.config';
import { logger } from './logger.config';

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
 * Shared OAuth handler: finds or creates user, links if email matches existing account.
 */
async function handleOAuthUser(
  provider: 'google' | 'github',
  oauthId: string,
  email: string,
  name: string,
  avatarUrl: string | null,
  done: (err: any, user?: any) => void,
) {
  try {
    const { userRepo, settingsRepo, creditRepo } = getRepos();

    // 1. Check if OAuth account already linked
    let user = await userRepo.findOne({
      where: { authProvider: provider, oauthId },
    });

    if (user) {
      return done(null, user);
    }

    // 2. Check if email exists (link accounts)
    user = await userRepo.findOne({ where: { email } });

    if (user) {
      // Link OAuth to existing account (only if not already linked to different provider)
      if (user.authProvider === 'local') {
        user.authProvider = provider;
        user.oauthId = oauthId;
        if (!user.avatarUrl && avatarUrl) user.avatarUrl = avatarUrl;
        user.emailVerified = true; // OAuth emails are verified
        await userRepo.save(user);
      }
      return done(null, user);
    }

    // 3. Create new user
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((w: string) => w[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || '??';

    const newUser = await userRepo.save(
      userRepo.create({
        name,
        email,
        initials,
        avatarUrl,
        passwordHash: null, // OAuth users have no password
        authProvider: provider,
        oauthId,
        emailVerified: true, // OAuth emails are pre-verified
        role: 'developer',
      }),
    );

    // Create default settings & credits
    await settingsRepo.save(settingsRepo.create({ userId: newUser.id }));
    await creditRepo.save(creditRepo.create({ userId: newUser.id, balance: 0 }));

    logger.info(`New OAuth user registered: ${email} via ${provider}`);
    return done(null, newUser);
  } catch (error) {
    logger.error(`OAuth error (${provider}):`, { error });
    return done(error);
  }
}

export function configurePassport() {
  // Google OAuth 2.0
  if (env.google.clientId) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.google.clientId,
          clientSecret: env.google.clientSecret,
          callbackURL: env.google.callbackUrl,
          scope: ['profile', 'email'],
        },
        async (_accessToken, _refreshToken, profile, done) => {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'));

          await handleOAuthUser(
            'google',
            profile.id,
            email,
            profile.displayName || email.split('@')[0],
            profile.photos?.[0]?.value || null,
            done,
          );
        },
      ),
    );
  }

  // GitHub OAuth 2.0
  if (env.github.clientId) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: env.github.clientId,
          clientSecret: env.github.clientSecret,
          callbackURL: env.github.callbackUrl,
          scope: ['user:email'],
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;

          await handleOAuthUser(
            'github',
            profile.id,
            email,
            profile.displayName || profile.username || 'GitHub User',
            profile.photos?.[0]?.value || null,
            done,
          );
        },
      ),
    );
  }

  // Serialize/deserialize (we use stateless JWT, so minimal)
  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser((id: string, done) => {
    const { userRepo } = getRepos();
    userRepo.findOne({ where: { id } }).then(
      (user: any) => done(null, user),
      (err: any) => done(err),
    );
  });
}
