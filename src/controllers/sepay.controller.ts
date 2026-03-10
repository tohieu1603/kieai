import { Request, Response } from 'express';
import { sepayService } from '../services/sepay.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { parsePagination } from '../utils/pagination';

export class SepayController {
  /** POST /billing/sepay/create-order — Create SePay payment order */
  createOrder = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { amount, credits } = req.body;
    const result = await sepayService.createPaymentOrder(req.user.id, amount, credits);
    return ApiResponse.created(res, result, 'Payment order created');
  });

  /**
   * POST /billing/sepay/webhook — SePay webhook callback.
   * ALWAYS returns HTTP 200 to prevent SePay retries.
   * Uses API key verification via middleware.
   */
  webhook = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      await sepayService.processWebhook({
        transferType: data.transferType,
        transferAmount: data.transferAmount,
        content: data.content,
        referenceCode: data.referenceCode,
        transactionDate: data.transactionDate,
      });
    } catch (error) {
      console.error('[sepay-webhook] Processing error:', error);
    }

    // Always return 200 — SePay requirement
    res.status(200).json({ success: true });
  };

  /** GET /billing/sepay/status/:id — Check payment status (IDOR-safe) */
  checkStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await sepayService.checkPaymentStatus(id, req.user.id);
    return ApiResponse.success(res, result);
  });

  /** GET /billing/sepay/pending — Get current pending order */
  getPendingOrder = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const order = await sepayService.getPendingOrder(req.user.id);
    return ApiResponse.success(res, {
      hasPending: !!order,
      order: order ?? null,
    });
  });

  /** DELETE /billing/sepay/cancel/:id — Cancel pending order */
  cancelOrder = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await sepayService.cancelOrder(req.user.id, id);
    return ApiResponse.success(res, result, 'Order cancelled');
  });

  /** GET /billing/sepay/history — User's SePay order history */
  getOrderHistory = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { page, limit } = parsePagination(req);
    const result = await sepayService.getOrderHistory(req.user.id, page, limit);
    return ApiResponse.paginated(res, result.data, result.total, result.page, result.limit);
  });

  /** GET /billing/sepay/admin/all — Admin: all SePay orders */
  adminGetAllOrders = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req);
    const status = req.query.status as string | undefined;
    const userId = req.query.userId as string | undefined;
    const result = await sepayService.adminGetAllOrders(page, limit, status, userId);
    return ApiResponse.success(res, result);
  });

  /** POST /billing/sepay/admin/credits — Admin: manually adjust credits */
  adminUpdateCredits = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { userId, amount, reason } = req.body;
    if (!userId || amount == null || !reason) {
      throw AppError.badRequest('userId, amount, and reason are required');
    }
    const result = await sepayService.adminUpdateCredits(req.user.id, userId, amount, reason);
    return ApiResponse.success(res, result, 'Credits updated');
  });
}

export const sepayController = new SepayController();
