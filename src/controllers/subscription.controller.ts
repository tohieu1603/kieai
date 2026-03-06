import { Request, Response } from 'express';
import { subscriptionService } from '../services/subscription.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';
import { BillingCycle } from '../enums';

export class SubscriptionController {
  /** GET /api/subscriptions/plans — List active plans (public) */
  getPlans = asyncHandler(async (_req: Request, res: Response) => {
    const plans = await subscriptionService.getPlans();
    return ApiResponse.success(res, plans);
  });

  /** POST /api/subscriptions/subscribe — Subscribe to a plan (auth required) */
  subscribe = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { planSlug, billingCycle } = req.body;
    const result = await subscriptionService.subscribe(req.user.id, planSlug, billingCycle as BillingCycle);
    return ApiResponse.created(res, result, 'Subscription created successfully');
  });

  /** GET /api/subscriptions/my — Get user's active subscription (auth required) */
  getMySubscription = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const subscription = await subscriptionService.getUserSubscription(req.user.id);
    return ApiResponse.success(res, subscription);
  });

  /** POST /api/subscriptions/cancel — Cancel active subscription (auth required) */
  cancel = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const subscription = await subscriptionService.cancelSubscription(req.user.id);
    return ApiResponse.success(res, subscription, 'Subscription cancelled');
  });

  /** PUT /api/subscriptions/change-plan — Upgrade/downgrade plan (auth required) */
  changePlan = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { newPlanSlug } = req.body;
    const result = await subscriptionService.upgradeDowngrade(req.user.id, newPlanSlug);
    return ApiResponse.success(res, result, 'Plan changed successfully');
  });
}

export const subscriptionController = new SubscriptionController();
