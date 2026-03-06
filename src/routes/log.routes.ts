import { Router } from 'express';
import { logController } from '../controllers/log.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /logs:
 *   get:
 *     summary: Get API call logs
 *     tags: [Logs]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Returns paginated API call logs for the authenticated user.
 *       Supports filtering by model, status, and date range.
 *       IDOR protected — only returns the user's own logs.
 *     parameters:
 *       - in: query
 *         name: model
 *         schema: { type: string }
 *         description: Filter by model slug
 *         example: 'nano-banana-2'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failed, processing]
 *         description: Filter by log status
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *         description: Start date (inclusive)
 *         example: '2026-03-01'
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *         description: End date (inclusive)
 *         example: '2026-03-06'
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated logs
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Log'
 *       401:
 *         description: Not authenticated
 */
router.get('/', authenticate, logController.getLogs);

/**
 * @swagger
 * /logs/usage:
 *   get:
 *     summary: Get usage statistics
 *     tags: [Logs]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Returns aggregated usage stats for the authenticated user:
 *       - **dailyUsage**: Credits consumed per day (last 30 days) — for Recharts line/bar chart
 *       - **endpointUsage**: Credits consumed per model — for pie/donut chart
 *       - **keyUsage**: Credits consumed per API key — for table/list view
 *       All computed from the logs table (no separate storage).
 *     responses:
 *       200:
 *         description: Usage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/UsageStats'
 *       401:
 *         description: Not authenticated
 */
router.get('/usage', authenticate, logController.getUsageStats);

export default router;
