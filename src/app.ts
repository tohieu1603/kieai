import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.config';
import { swaggerSpec } from './config/swagger.config';
import { configurePassport } from './config/passport.config';
import { globalRateLimit } from './middlewares/rate-limit.middleware';
import { errorHandler } from './middlewares/error-handler.middleware';
import routes from './routes';

const app = express();

// Security
app.use(helmet());
app.use(cors({
  origin: env.frontendUrl,
  credentials: true, // allow cookies
}));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Passport (OAuth)
configurePassport();
app.use(passport.initialize());

// Global rate limiter
app.use(globalRateLimit);

// Swagger docs (before API routes, no rate limit)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Operis Market API Docs',
}));
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// API routes
app.use('/api', routes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
