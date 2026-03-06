import { Router } from 'express';
import { updateController } from '../controllers/update.controller';

const router = Router();

/**
 * @swagger
 * /updates:
 *   get:
 *     summary: List API updates / changelog
 *     tags: [Updates]
 *     description: |
 *       Returns paginated API updates (changelog entries).
 *       Optionally filter by tag (e.g. "General API", "Video API").
 *     parameters:
 *       - in: query
 *         name: tag
 *         schema: { type: string }
 *         description: Filter by update tag
 *         example: 'Video API'
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated API updates
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
 *                         $ref: '#/components/schemas/ApiUpdate'
 */
router.get('/', updateController.getUpdates);

/**
 * @swagger
 * /updates/tags:
 *   get:
 *     summary: List all update tags
 *     tags: [Updates]
 *     description: Returns all available API update tags, ordered by name. Used for the tag filter dropdown.
 *     responses:
 *       200:
 *         description: List of tags
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiUpdateTag'
 *             example:
 *               success: true
 *               message: Success
 *               data:
 *                 - { id: '...', name: 'All APIs' }
 *                 - { id: '...', name: 'General API' }
 *                 - { id: '...', name: 'Image API' }
 *                 - { id: '...', name: 'Video API' }
 */
router.get('/tags', updateController.getTags);

export default router;
