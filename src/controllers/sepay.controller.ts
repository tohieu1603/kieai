import { Request, Response } from 'express';
import { sepayService } from '../services/sepay.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';

export class SepayController {
  /** POST /api/billing/sepay/create-order — Create SePay payment order */
  createOrder = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { amount, credits } = req.body;
    const result = await sepayService.createPaymentOrder(req.user.id, amount, credits);
    return ApiResponse.created(res, result, 'Payment order created');
  });

  /** POST /api/billing/sepay/webhook — SePay webhook callback (no auth, signature verified) */
  webhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-sepay-signature'] as string;
    if (!signature) throw AppError.badRequest('Missing webhook signature');

    const bodyStr = JSON.stringify(req.body);
    const valid = sepayService.verifyWebhookSignature(bodyStr, signature);
    if (!valid) throw AppError.unauthorized('Invalid webhook signature');

    const result = await sepayService.processWebhook(req.body);
    return ApiResponse.success(res, result);
  });

  /** GET /api/billing/sepay/status/:id — Check payment status */
  checkStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await sepayService.checkPaymentStatus(id, req.user.id);
    return ApiResponse.success(res, result);
  });
}

export const sepayController = new SepayController();
