import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { UpdateSettingsDto, UpdateProfileDto } from '../dtos/settings.dto';

const router = Router();

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get user settings
 *     tags: [Settings]
 *     security:
 *       - cookieAuth: []
 *     description: Returns the authenticated user's settings (theme, email notifications).
 *     responses:
 *       200:
 *         description: User settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/UserSettings'
 *       401:
 *         description: Not authenticated
 *
 *   put:
 *     summary: Update user settings
 *     tags: [Settings]
 *     security:
 *       - cookieAuth: []
 *     description: Updates theme and/or email notification preferences.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateSettingsRequest'
 *     responses:
 *       200:
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/UserSettings'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 */
router.get('/', authenticate, settingsController.getSettings);
router.put('/', authenticate, validateBody(UpdateSettingsDto), settingsController.updateSettings);

/**
 * @swagger
 * /settings/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Settings]
 *     security:
 *       - cookieAuth: []
 *     description: Returns the user's profile info (name, email, initials, avatar).
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Not authenticated
 *
 *   put:
 *     summary: Update user profile
 *     tags: [Settings]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Updates user name and/or avatar URL.
 *       If name changes, initials are automatically recalculated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/UserProfile'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 */
router.get('/profile', authenticate, settingsController.getProfile);
router.put('/profile', authenticate, validateBody(UpdateProfileDto), settingsController.updateProfile);

/**
 * @swagger
 * /settings/team:
 *   get:
 *     summary: List team members
 *     tags: [Settings]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Returns team members where the authenticated user is the team owner.
 *       Includes invited member info via user relation.
 *     responses:
 *       200:
 *         description: List of team members
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TeamMember'
 *       401:
 *         description: Not authenticated
 */
router.get('/team', authenticate, settingsController.getTeamMembers);

/**
 * @swagger
 * /settings/webhooks:
 *   get:
 *     summary: List webhook keys
 *     tags: [Settings]
 *     security:
 *       - cookieAuth: []
 *     description: Returns all HMAC webhook keys for the authenticated user.
 *     responses:
 *       200:
 *         description: List of webhook keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WebhookKey'
 *       401:
 *         description: Not authenticated
 *
 *   post:
 *     summary: Create a new webhook key
 *     tags: [Settings]
 *     security:
 *       - cookieAuth: []
 *     description: Generates a new HMAC webhook key (whsec_...) for the authenticated user.
 *     responses:
 *       201:
 *         description: Webhook key created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/WebhookKey'
 *       401:
 *         description: Not authenticated
 */
router.get('/webhooks', authenticate, settingsController.getWebhookKeys);
router.post('/webhooks', authenticate, settingsController.createWebhookKey);

export default router;
