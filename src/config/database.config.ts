import { DataSource } from 'typeorm';
import { env } from './env.config';
import path from 'path';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.name,
  synchronize: !env.isProduction, // auto-sync in dev only
  logging: !env.isProduction,
  entities: [path.join(__dirname, '../entities/**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '../migrations/**/*.{ts,js}')],
});
