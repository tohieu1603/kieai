import { Router } from 'express';
import { modelController } from '../controllers/model.controller';

const router = Router();

/**
 * @swagger
 * /models:
 *   get:
 *     summary: List & search AI models
 *     tags: [Models]
 *     description: |
 *       Returns a paginated list of active AI models.
 *       Supports full-text search on name/description/provider and filtering by category, tags, provider.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search query (matches name, description, provider — case-insensitive)
 *         example: 'veo'
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [video, image, music, chat]
 *         description: Filter by model category
 *       - in: query
 *         name: tags
 *         schema: { type: string }
 *         description: 'Comma-separated tags filter (e.g. "Text to Video,Image to Video")'
 *         example: 'Text to Video'
 *       - in: query
 *         name: provider
 *         schema: { type: string }
 *         description: Filter by provider name (partial match)
 *         example: 'Google'
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Paginated list of models
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
 *                         $ref: '#/components/schemas/Model'
 */
router.get('/', modelController.getAll);

/**
 * @swagger
 * /models/featured:
 *   get:
 *     summary: Get featured model slides
 *     tags: [Models]
 *     description: Returns active featured slides for the marketplace hero carousel, ordered by sortOrder.
 *     responses:
 *       200:
 *         description: List of featured slides
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/FeaturedSlide'
 */
router.get('/featured', modelController.getFeaturedSlides);

/**
 * @swagger
 * /models/{slug}/pricing:
 *   get:
 *     summary: Get pricing tiers for a model
 *     tags: [Models]
 *     description: Returns all pricing tiers for the specified model.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         description: Model URL-friendly slug
 *         example: 'veo-3-1'
 *     responses:
 *       200:
 *         description: Pricing tiers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PricingTier'
 *       404:
 *         description: Model not found
 */
router.get('/:slug/pricing', modelController.getPricing);

/**
 * @swagger
 * /models/{slug}:
 *   get:
 *     summary: Get model detail by slug
 *     tags: [Models]
 *     description: |
 *       Returns full model details including playground fields (with options) and pricing tiers.
 *       Used for the model detail / playground page.
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string }
 *         description: Model URL-friendly slug
 *         example: 'nano-banana-2'
 *     responses:
 *       200:
 *         description: Full model detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/ModelDetail'
 *       404:
 *         description: Model not found
 */
router.get('/:slug', modelController.getBySlug);

export default router;
