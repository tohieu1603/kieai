import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';
import { sepayController } from '../controllers/sepay.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { PurchaseCreditsDto, CreateSepayOrderDto } from '../dtos/billing.dto';

const router = Router();

/**
 * @swagger
 * /billing/packages:
 *   get:
 *     summary: List available credit packages
 *     tags: [Billing]
 *     description: Returns all active credit packages ordered by price ascending. Public endpoint.
 *     responses:
 *       200:
 *         description: List of credit packages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CreditPackage'
 *             example:
 *               success: true
 *               message: Success
 *               data:
 *                 - { id: '...', price: 5, credits: 1000, badge: null, isActive: true }
 *                 - { id: '...', price: 50, credits: 10000, badge: 'SAVE 5%', isActive: true }
 *                 - { id: '...', price: 500, credits: 105000, badge: 'SAVE 10%', isActive: true }
 */
router.get('/packages', billingController.getPackages);

/**
 * @swagger
 * /billing/purchase:
 *   post:
 *     summary: Purchase credits
 *     tags: [Billing]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Purchases a credit package. Creates a transaction record and atomically increments
 *       the user's credit balance (wrapped in a DB transaction).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PurchaseCreditsRequest'
 *     responses:
 *       201:
 *         description: Purchase successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Package not found or inactive
 */
router.post('/purchase', authenticate, validateBody(PurchaseCreditsDto), billingController.purchaseCredits);

/**
 * @swagger
 * /billing/transactions:
 *   get:
 *     summary: Get transaction history
 *     tags: [Billing]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Returns paginated transaction history for the authenticated user.
 *       IDOR protected — only returns the user's own transactions.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated transactions
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
 *                         $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Not authenticated
 */
router.get('/transactions', authenticate, billingController.getTransactions);

/**
 * @swagger
 * /billing/balance:
 *   get:
 *     summary: Get current credit balance
 *     tags: [Billing]
 *     security:
 *       - cookieAuth: []
 *     description: Returns the authenticated user's current credit balance.
 *     responses:
 *       200:
 *         description: Credit balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/CreditBalance'
 *       401:
 *         description: Not authenticated
 */
router.get('/balance', authenticate, billingController.getBalance);

/**
 * @swagger
 * /billing/sepay/create-order:
 *   post:
 *     summary: Create a SePay VietQR payment order
 *     tags: [Billing]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Creates a pending payment order for a SePay VietQR bank transfer top-up.
 *       Returns the transfer content (used as payment reference) and VietQR bank details.
 *       The order expires in 30 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, credits]
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 1
 *                 example: 10
 *                 description: Payment amount in USD
 *               credits:
 *                 type: integer
 *                 minimum: 1
 *                 example: 2000
 *                 description: Number of credits to receive
 *     responses:
 *       201:
 *         description: Payment order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId: { type: string, format: uuid }
 *                     transferContent: { type: string, example: OM1A2B3C4D... }
 *                     qrData:
 *                       type: object
 *                       properties:
 *                         bankCode: { type: string }
 *                         bankAccount: { type: string }
 *                         amount: { type: number }
 *                         content: { type: string }
 *                         accountName: { type: string }
 *                     expiresIn: { type: integer, example: 1800 }
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 */
router.post('/sepay/create-order', authenticate, validateBody(CreateSepayOrderDto), sepayController.createOrder);

/**
 * @swagger
 * /billing/sepay/webhook:
 *   post:
 *     summary: SePay webhook callback
 *     tags: [Billing]
 *     description: |
 *       Webhook endpoint called by SePay when a bank transfer is confirmed.
 *       No user authentication — uses HMAC-SHA256 signature verification via X-SePay-Signature header.
 *       On success: marks transaction as completed, adds credits, generates invoice.
 *     parameters:
 *       - in: header
 *         name: X-SePay-Signature
 *         required: true
 *         schema: { type: string }
 *         description: HMAC-SHA256 signature of the request body
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transferContent, transferAmount, referenceCode, transactionDate]
 *             properties:
 *               transferContent: { type: string, description: Transfer reference content }
 *               transferAmount: { type: number, description: Amount transferred }
 *               referenceCode: { type: string, description: SePay reference code }
 *               transactionDate: { type: string, description: Transaction date }
 *     responses:
 *       200:
 *         description: Webhook processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     processed: { type: boolean }
 *                     transactionId: { type: string, format: uuid }
 *       400:
 *         description: Missing or invalid signature
 *       401:
 *         description: Invalid webhook signature
 */
router.post('/sepay/webhook', sepayController.webhook);

/**
 * @swagger
 * /billing/sepay/status/{id}:
 *   get:
 *     summary: Check SePay payment status
 *     tags: [Billing]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Returns the current status of a SePay payment order.
 *       IDOR protected — only the owner can check their payment status.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Transaction ID returned from create-order
 *     responses:
 *       200:
 *         description: Payment status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     status: { type: string, enum: [pending, completed, failed, refunded] }
 *                     amount: { type: number }
 *                     credits: { type: integer }
 *                     transferContent: { type: string }
 *                     createdAt: { type: string, format: date-time }
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 */
router.get('/sepay/status/:id', authenticate, sepayController.checkStatus);

export default router;
