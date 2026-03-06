import { Router } from 'express';
import { apiKeyController } from '../controllers/api-key.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { CreateApiKeyDto } from '../dtos/api-key.dto';

const router = Router();

/**
 * @swagger
 * /api-keys:
 *   post:
 *     summary: Create a new API key
 *     tags: [API Keys]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Generates a new API key for the authenticated user.
 *       The full key is returned ONLY in this response — it cannot be retrieved again.
 *       Store it securely.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateApiKeyRequest'
 *     responses:
 *       201:
 *         description: API key created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'API key created. Save the key now — it will not be shown again.' }
 *                 data:
 *                   $ref: '#/components/schemas/ApiKeyCreated'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *
 *   get:
 *     summary: List user's API keys
 *     tags: [API Keys]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Returns all non-revoked API keys for the authenticated user.
 *       Only shows key prefix (first 8 chars) — never the full key or hash.
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ApiKey'
 *       401:
 *         description: Not authenticated
 */
router.post('/', authenticate, validateBody(CreateApiKeyDto), apiKeyController.create);
router.get('/', authenticate, apiKeyController.list);

/**
 * @swagger
 * /api-keys/{id}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [API Keys]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Soft-revokes an API key (sets isRevoked = true).
 *       IDOR protected — users can only revoke their own keys.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key revoked
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: API key not found (or belongs to another user)
 */
router.delete('/:id', authenticate, apiKeyController.revoke);

export default router;
