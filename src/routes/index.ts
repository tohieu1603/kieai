import { Router } from 'express';
import authRoutes from './auth.routes';
import modelRoutes from './model.routes';
import filterRoutes from './filter.routes';
import apiKeyRoutes from './api-key.routes';
import billingRoutes from './billing.routes';
import logRoutes from './log.routes';
import settingsRoutes from './settings.routes';
import updateRoutes from './update.routes';
import subscriptionRoutes from './subscription.routes';
import invoiceRoutes from './invoice.routes';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth
router.use('/auth', authRoutes);

// Models & Marketplace
router.use('/models', modelRoutes);
router.use('/filters', filterRoutes);

// API Keys
router.use('/api-keys', apiKeyRoutes);

// Billing & Credits
router.use('/billing', billingRoutes);

// Logs & Usage
router.use('/logs', logRoutes);

// User Settings
router.use('/settings', settingsRoutes);

// API Updates
router.use('/updates', updateRoutes);

// Subscriptions
router.use('/subscriptions', subscriptionRoutes);

// Invoices
router.use('/invoices', invoiceRoutes);

export default router;
