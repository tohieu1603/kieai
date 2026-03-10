import { Router } from 'express';
import { modelController } from '../controllers/model.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { UserRole } from '../enums';

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
 * /models/pricing:
 *   get:
 *     summary: List all model pricing tiers
 *     tags: [Models]
 *     description: |
 *       Returns all pricing tiers grouped by model with category counts, search, and pagination.
 *       Designed for a pricing page similar to kie.ai/pricing.
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [chat, video, image, music]
 *         description: Filter by pricing category
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by model name, tier name, or provider
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 25, minimum: 1, maximum: 100 }
 *         description: Models per page
 *     responses:
 *       200:
 *         description: Grouped pricing tiers with category counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 models:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string }
 *                       name: { type: string, example: 'gpt-5-codex' }
 *                       slug: { type: string }
 *                       category: { type: string }
 *                       priceCount: { type: integer, example: 2 }
 *                       prices:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             name: { type: string, example: 'gpt-5-codex, Chat, Output' }
 *                             category: { type: string, example: 'chat' }
 *                             provider: { type: string, example: 'OpenAI' }
 *                             credits: { type: number, example: 800 }
 *                             creditUnit: { type: string, example: 'per million tokens' }
 *                             ourPrice: { type: number, example: 4.0 }
 *                             marketPrice: { type: number, nullable: true }
 *                             discount: { type: integer, nullable: true, example: 20 }
 *                 counts:
 *                   type: object
 *                   properties:
 *                     all: { type: integer, example: 239 }
 *                     chat: { type: integer, example: 18 }
 *                     video: { type: integer, example: 136 }
 *                     image: { type: integer, example: 65 }
 *                     music: { type: integer, example: 20 }
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     totalPages: { type: integer }
 */
router.get('/pricing', modelController.getPricingList);

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

// ── Admin: pricing tier update/delete (before /:slug to avoid route conflict) ──

/**
 * @swagger
 * /models/pricing-tiers/{tierId}:
 *   put:
 *     summary: Update a pricing tier (admin)
 *     tags: [Models]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tierId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               credits: { type: number }
 *               ourPrice: { type: number }
 *               marketPrice: { type: number, nullable: true }
 *     responses:
 *       200:
 *         description: Pricing tier updated
 *       404:
 *         description: Pricing tier not found
 */
router.put('/pricing-tiers/:tierId', authenticate, authorize(UserRole.ADMIN), modelController.updatePricingTier);

/**
 * @swagger
 * /models/pricing-tiers/{tierId}:
 *   delete:
 *     summary: Delete a pricing tier (admin)
 *     tags: [Models]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: tierId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Pricing tier deleted
 *       404:
 *         description: Pricing tier not found
 */
router.delete('/pricing-tiers/:tierId', authenticate, authorize(UserRole.ADMIN), modelController.deletePricingTier);

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

// ── Admin CRUD (requires auth + admin role) ──

/**
 * @swagger
 * /models:
 *   post:
 *     summary: Create a new model (admin)
 *     tags: [Models]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug, provider, description, category, tags, taskTags, pricingDisplay, gradient]
 *             properties:
 *               name: { type: string, example: 'GPT-5' }
 *               slug: { type: string, example: 'gpt-5' }
 *               provider: { type: string, example: 'OpenAI' }
 *               description: { type: string }
 *               category: { type: string, enum: [video, image, music, chat] }
 *               tags: { type: array, items: { type: string } }
 *               taskTags: { type: array, items: { type: string } }
 *               pricingDisplay: { type: string }
 *               gradient: { type: string }
 *               image: { type: string, nullable: true }
 *               isNew: { type: boolean }
 *               isPopular: { type: boolean }
 *               isActive: { type: boolean }
 *     responses:
 *       201:
 *         description: Model created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — admin only
 */
router.post('/', authenticate, authorize(UserRole.ADMIN), modelController.createModel);

/**
 * @swagger
 * /models/{id}:
 *   put:
 *     summary: Update a model (admin)
 *     tags: [Models]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               provider: { type: string }
 *               description: { type: string }
 *               category: { type: string, enum: [video, image, music, chat] }
 *               isActive: { type: boolean }
 *     responses:
 *       200:
 *         description: Model updated
 *       404:
 *         description: Model not found
 */
router.put('/:id', authenticate, authorize(UserRole.ADMIN), modelController.updateModel);

/**
 * @swagger
 * /models/{id}:
 *   delete:
 *     summary: Delete a model (admin)
 *     tags: [Models]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Model deleted
 *       404:
 *         description: Model not found
 */
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), modelController.deleteModel);

/**
 * @swagger
 * /models/{id}/pricing:
 *   post:
 *     summary: Add pricing tier to a model (admin)
 *     tags: [Models]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Model ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, provider, credits, creditUnit, ourPrice]
 *             properties:
 *               name: { type: string, example: 'GPT-5 Input' }
 *               category: { type: string, enum: [chat, video, image, music] }
 *               provider: { type: string, example: 'OpenAI' }
 *               credits: { type: number, example: 1000 }
 *               creditUnit: { type: string, example: '1K tokens' }
 *               ourPrice: { type: number, example: 5.0 }
 *               marketPrice: { type: number, nullable: true, example: 6.0 }
 *     responses:
 *       201:
 *         description: Pricing tier created
 *       404:
 *         description: Model not found
 */
router.post('/:id/pricing', authenticate, authorize(UserRole.ADMIN), modelController.createPricingTier);

export default router;
