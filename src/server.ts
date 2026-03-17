process.env.TZ = 'UTC';
import { LessThan } from 'typeorm';
import app from './app';
import { AppDataSource } from './config/database.config';
import { env } from './config/env.config';
import { logger } from './config/logger.config';

const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // every 6 hours

/** Purge expired & revoked refresh tokens older than 7 days */
async function cleanupExpiredTokens() {
  try {
    const { RefreshToken } = await import('./entities/refresh-token.entity');
    const repo = AppDataSource.getRepository(RefreshToken);
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { affected } = await repo.delete({ expiresAt: LessThan(cutoff) });
    if (affected && affected > 0) {
      logger.info(`Cleanup: purged ${affected} expired refresh tokens`);
    }
  } catch (err) {
    logger.error('Refresh token cleanup failed', { error: err });
  }
}

async function bootstrap() {
  try {
    // Connect to database
    await AppDataSource.initialize();
    logger.info('Database connected successfully');

    // Schedule expired token cleanup
    setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL);
    cleanupExpiredTokens(); // run once on startup

    // Start server
    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await AppDataSource.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down...');
  await AppDataSource.destroy();
  process.exit(0);
});

bootstrap();
