import { Router } from 'express';
import { filterController } from '../controllers/filter.controller';

const router = Router();

/**
 * @swagger
 * /filters:
 *   get:
 *     summary: Get all filter categories & providers
 *     tags: [Filters]
 *     description: |
 *       Returns all filter categories (e.g. "Video Generation", "Image Generation") with their
 *       filter options (e.g. "Text to Video", "Lip Sync"), plus all model providers.
 *       Used for the marketplace sidebar filters.
 *     responses:
 *       200:
 *         description: Filter data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/FilterCategory'
 *                     providers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Provider'
 */
router.get('/', filterController.getFilters);

export default router;
