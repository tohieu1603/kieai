import { Request, Response } from 'express';
import { CreditPackage } from '../entities/credit-package.entity';
import { BaseController } from './base.controller';
import { billingService } from '../services/billing.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { parsePagination } from '../utils/pagination';
import { AppError } from '../utils/app-error';

export class BillingController extends BaseController<CreditPackage> {
  constructor() {
    super(billingService);
  }

  /** GET /packages — List active credit packages (public) */
  getPackages = asyncHandler(async (_req: Request, res: Response) => {
    const packages = await billingService.getPackages();
    return ApiResponse.success(res, packages);
  });

  /** POST /purchase — Purchase credits (auth required) */
  purchaseCredits = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { packageId } = req.body;
    const transaction = await billingService.purchaseCredits(req.user.id, packageId);
    return ApiResponse.created(res, transaction, 'Credits purchased successfully');
  });

  /** GET /transactions — User's transaction history (auth required) */
  getTransactions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { page, limit } = parsePagination(req);
    const result = await billingService.getTransactions(req.user.id, page, limit);
    return ApiResponse.paginated(res, result.data, result.total, result.page, result.limit);
  });

  /** GET /balance — Current credit balance (auth required) */
  getBalance = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const balance = await billingService.getBalance(req.user.id);
    return ApiResponse.success(res, balance);
  });
}

export const billingController = new BillingController();
