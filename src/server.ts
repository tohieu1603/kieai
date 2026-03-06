import app from './app';
import { AppDataSource } from './config/database.config';
import { env } from './config/env.config';
import { logger } from './config/logger.config';

async function bootstrap() {
  try {
    // Connect to database
    await AppDataSource.initialize();
    logger.info('Database connected successfully');

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
