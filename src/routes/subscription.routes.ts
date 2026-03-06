import { Router } from 'express';
import { subscriptionController } from '../controllers/subscription.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { SubscribeDto, ChangePlanDto } from '../dtos/billing.dto';

const router = Router();

/**
 * @swagger
 * /subscriptions/plans:
 *   get:
 *     summary: List available subscription plans
 *     tags: [Subscriptions]
 *     description: Returns all active subscription plans ordered by sortOrder. Public endpoint.
 *     responses:
 *       200:
 *         description: List of subscription plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionPlan'
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @swagger
 * /subscriptions/subscribe:
 *   post:
 *     summary: Subscribe to a plan
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Creates a subscription for the authenticated user. Atomically creates the subscription,
 *       a transaction record, an invoice, and adds monthly credits to the user's balance.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planSlug, billingCycle]
 *             properties:
 *               planSlug:
 *                 type: string
 *                 example: pro
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *                 example: monthly
 *     responses:
 *       201:
 *         description: Subscription created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription: { $ref: '#/components/schemas/Subscription' }
 *                     plan: { $ref: '#/components/schemas/SubscriptionPlan' }
 *                     creditsAdded: { type: integer, example: 5000 }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Plan not found
 *       409:
 *         description: Already has active subscription
 */
router.post('/subscribe', authenticate, validateBody(SubscribeDto), subscriptionController.subscribe);

/**
 * @swagger
 * /subscriptions/my:
 *   get:
 *     summary: Get current active subscription
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     description: Returns the authenticated user's active subscription with plan details.
 *     responses:
 *       200:
 *         description: Active subscription
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Subscription'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: No active subscription
 */
router.get('/my', authenticate, subscriptionController.getMySubscription);

/**
 * @swagger
 * /subscriptions/cancel:
 *   post:
 *     summary: Cancel active subscription
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Cancels the authenticated user's active subscription. The subscription remains active
 *       until the end of the current billing period.
 *     responses:
 *       200:
 *         description: Subscription cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Subscription cancelled }
 *                 data:
 *                   $ref: '#/components/schemas/Subscription'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: No active subscription
 */
router.post('/cancel', authenticate, subscriptionController.cancel);

/**
 * @swagger
 * /subscriptions/change-plan:
 *   put:
 *     summary: Upgrade or downgrade subscription plan
 *     tags: [Subscriptions]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Changes the authenticated user's active subscription to a different plan.
 *       Prorates credits based on the remaining time in the current billing period.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPlanSlug]
 *             properties:
 *               newPlanSlug:
 *                 type: string
 *                 example: enterprise
 *     responses:
 *       200:
 *         description: Plan changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription: { $ref: '#/components/schemas/Subscription' }
 *                     newPlan: { $ref: '#/components/schemas/SubscriptionPlan' }
 *                     proratedCredits: { type: integer, example: 2500 }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Plan or subscription not found
 *       409:
 *         description: Already on this plan
 */
router.put('/change-plan', authenticate, validateBody(ChangePlanDto), subscriptionController.changePlan);

export default router;
