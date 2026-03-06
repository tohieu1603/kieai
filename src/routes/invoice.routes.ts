import { Router } from 'express';
import { invoiceController } from '../controllers/invoice.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /invoices:
 *   get:
 *     summary: List user's invoices
 *     tags: [Invoices]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Returns paginated invoices for the authenticated user.
 *       IDOR protected — only returns the user's own invoices.
 *     parameters:
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
 *         description: Paginated invoices
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
 *                         $ref: '#/components/schemas/Invoice'
 *       401:
 *         description: Not authenticated
 */
router.get('/', authenticate, invoiceController.list);

/**
 * @swagger
 * /invoices/{id}:
 *   get:
 *     summary: Get invoice by ID
 *     tags: [Invoices]
 *     security:
 *       - cookieAuth: []
 *     description: Returns a single invoice. IDOR protected — verifies ownership before returning.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Invoice UUID
 *     responses:
 *       200:
 *         description: Invoice details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Invoice'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Invoice not found
 */
router.get('/:id', authenticate, invoiceController.getById);

export default router;
