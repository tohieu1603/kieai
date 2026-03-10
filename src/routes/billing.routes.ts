import { Router } from 'express';
import { billingController } from '../controllers/billing.controller';
import { sepayController } from '../controllers/sepay.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { sepayWebhookMiddleware } from '../middlewares/sepay-webhook.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { PurchaseCreditsDto, CreateSepayOrderDto } from '../dtos/billing.dto';
import { UserRole } from '../enums';

const router = Router();

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

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
 */
router.get('/packages', billingController.getPackages);

/**
 * @swagger
 * /billing/sepay/webhook:
 *   post:
 *     summary: SePay webhook callback
 *     tags: [Billing]
 *     description: |
 *       Webhook endpoint called by SePay when a bank transfer is confirmed.
 *       No user authentication — uses API key verification via Authorization header.
 *       Always returns HTTP 200 per SePay requirement.
 *
 *       **Processing flow:**
 *       1. Verify API key from Authorization header
 *       2. Extract order code (OM prefix) from transfer content
 *       3. Idempotency check via referenceCode
 *       4. Verify amount is sufficient
 *       5. Atomic: mark transaction completed + add credits + generate invoice
 *       6. Late-payment tolerant: processes expired pending orders
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         schema: { type: string }
 *         description: "Apikey <SEPAY_API_KEY>"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [transferAmount, content, referenceCode, transactionDate]
 *             properties:
 *               transferType: { type: string, description: Transfer type (in/out) }
 *               transferAmount: { type: number, description: Amount transferred }
 *               content: { type: string, description: Transfer content (contains order code) }
 *               referenceCode: { type: string, description: SePay reference code }
 *               transactionDate: { type: string, description: Transaction date }
 *     responses:
 *       200:
 *         description: Always 200 (SePay requirement)
 *     security: []
 */
router.post('/sepay/webhook', sepayWebhookMiddleware, sepayController.webhook);

// =============================================================================
// USER ENDPOINTS — Require authentication
// =============================================================================

router.use(authenticate);

/**
 * @swagger
 * /billing/purchase:
 *   post:
 *     summary: Purchase credits from package
 *     tags: [Billing]
 *     security: [{ cookieAuth: [] }]
 */
router.post('/purchase', validateBody(PurchaseCreditsDto), billingController.purchaseCredits);

/**
 * @swagger
 * /billing/transactions:
 *   get:
 *     summary: Get transaction history
 *     tags: [Billing]
 *     security: [{ cookieAuth: [] }]
 */
router.get('/transactions', billingController.getTransactions);

/**
 * @swagger
 * /billing/balance:
 *   get:
 *     summary: Get current credit balance
 *     tags: [Billing]
 *     security: [{ cookieAuth: [] }]
 */
router.get('/balance', billingController.getBalance);

/**
 * @swagger
 * /billing/sepay/create-order:
 *   post:
 *     summary: Create a SePay VietQR payment order
 *     tags: [Billing]
 *     security: [{ cookieAuth: [] }]
 *     description: |
 *       Creates a pending payment order for SePay VietQR bank transfer.
 *       Returns bank details, transfer content (order code), and QR code URL.
 *       Order expires in 30 minutes.
 *
 *       **Anti-spam:** Reuses existing pending order if same amount.
 *       Cancels old pending if different amount.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, credits]
 *             properties:
 *               amount: { type: number, minimum: 1, description: Payment amount }
 *               credits: { type: integer, minimum: 1, description: Credits to receive }
 *     responses:
 *       201:
 *         description: Payment order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId: { type: string, format: uuid }
 *                     orderCode: { type: string, example: OMABCD1234 }
 *                     amount: { type: number }
 *                     credits: { type: integer }
 *                     status: { type: string }
 *                     paymentInfo:
 *                       type: object
 *                       properties:
 *                         bankName: { type: string }
 *                         accountNumber: { type: string }
 *                         accountName: { type: string }
 *                         transferContent: { type: string }
 *                         qrCodeUrl: { type: string, example: "https://qr.sepay.vn/img?..." }
 *                     expiresAt: { type: string, format: date-time }
 */
router.post('/sepay/create-order', validateBody(CreateSepayOrderDto), sepayController.createOrder);

/**
 * @swagger
 * /billing/sepay/pending:
 *   get:
 *     summary: Get current pending payment order
 *     tags: [Billing]
 *     security: [{ cookieAuth: [] }]
 *     description: Returns the user's current pending SePay order (if any, not expired).
 *     responses:
 *       200:
 *         description: Pending order or null
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasPending: { type: boolean }
 *                     order: { nullable: true }
 */
router.get('/sepay/pending', sepayController.getPendingOrder);

/**
 * @swagger
 * /billing/sepay/status/{id}:
 *   get:
 *     summary: Check SePay payment status
 *     tags: [Billing]
 *     security: [{ cookieAuth: [] }]
 *     description: Returns payment status. IDOR-safe — only the owner can check.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Payment status
 *       404:
 *         description: Payment not found
 */
router.get('/sepay/status/:id', sepayController.checkStatus);

/**
 * @swagger
 * /billing/sepay/cancel/{id}:
 *   delete:
 *     summary: Cancel pending payment order
 *     tags: [Billing]
 *     security: [{ cookieAuth: [] }]
 *     description: Cancels a pending SePay order. Only pending orders can be cancelled. IDOR-safe.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order cancelled
 *       400:
 *         description: Only pending orders can be cancelled
 *       404:
 *         description: Order not found
 */
router.delete('/sepay/cancel/:id', sepayController.cancelOrder);

/**
 * @swagger
 * /billing/sepay/history:
 *   get:
 *     summary: SePay payment order history
 *     tags: [Billing]
 *     security: [{ cookieAuth: [] }]
 *     description: Returns paginated SePay payment history for the authenticated user.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated payment history
 */
router.get('/sepay/history', sepayController.getOrderHistory);

// =============================================================================
// ADMIN ENDPOINTS — Require admin role
// =============================================================================

/**
 * @swagger
 * /billing/sepay/admin/all:
 *   get:
 *     summary: "[Admin] All SePay orders"
 *     tags: [Billing]
 *     security: [{ cookieAuth: [] }]
 *     description: Admin-only. List all SePay transactions across all users.
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, completed, failed, refunded] }
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: All SePay orders
 *       403:
 *         description: Insufficient permissions
 */
router.get('/sepay/admin/all', authorize(UserRole.ADMIN), sepayController.adminGetAllOrders);

/**
 * @swagger
 * /billing/sepay/admin/credits:
 *   post:
 *     summary: "[Admin] Manually adjust user credits"
 *     tags: [Billing]
 *     security: [{ cookieAuth: [] }]
 *     description: |
 *       Admin-only. Manually add or deduct credits for a user.
 *       Positive amount = add credits, negative = deduct.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, amount, reason]
 *             properties:
 *               userId: { type: string, format: uuid }
 *               amount: { type: integer, description: "Positive to add, negative to deduct" }
 *               reason: { type: string, description: Reason for adjustment }
 *     responses:
 *       200:
 *         description: Credits updated
 *       400:
 *         description: Missing required fields
 *       403:
 *         description: Insufficient permissions
 */
router.post('/sepay/admin/credits', authorize(UserRole.ADMIN), sepayController.adminUpdateCredits);

export default router;
