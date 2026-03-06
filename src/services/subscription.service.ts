import { AppDataSource } from '../config/database.config';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { Transaction } from '../entities/transaction.entity';
import { UserCredit } from '../entities/user-credit.entity';
import { Invoice } from '../entities/invoice.entity';
import { AppError } from '../utils/app-error';
import { logger } from '../config/logger.config';
import {
  BillingCycle,
  SubscriptionStatus,
  TransactionType,
  TransactionStatus,
  InvoiceStatus,
} from '../enums';

export class SubscriptionService {
  private get planRepo() {
    return AppDataSource.getRepository(SubscriptionPlan);
  }

  private get subRepo() {
    return AppDataSource.getRepository(Subscription);
  }

  /**
   * List all active subscription plans ordered by sortOrder ascending.
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Subscribe a user to a plan.
   * Creates subscription, transaction, invoice, and adds monthly credits atomically.
   */
  async subscribe(userId: string, planSlug: string, billingCycle: BillingCycle) {
    const plan = await this.planRepo.findOne({ where: { slug: planSlug, isActive: true } });
    if (!plan) throw AppError.notFound('Subscription plan not found');

    // Check for existing active subscription
    const existing = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
    if (existing) throw AppError.conflict('You already have an active subscription');

    const price =
      billingCycle === BillingCycle.YEARLY ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === BillingCycle.YEARLY) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    return AppDataSource.transaction(async (manager) => {
      const subRepoM = manager.getRepository(Subscription);
      const txnRepoM = manager.getRepository(Transaction);
      const creditRepoM = manager.getRepository(UserCredit);
      const invoiceRepoM = manager.getRepository(Invoice);

      // Create subscription
      const subscription = await subRepoM.save(
        subRepoM.create({
          userId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        }),
      );

      // Create transaction record
      const txn = await txnRepoM.save(
        txnRepoM.create({
          userId,
          packageId: null,
          credits: plan.monthlyCredits,
          amount: price,
          type: TransactionType.SUBSCRIPTION,
          status: TransactionStatus.COMPLETED,
          subscriptionId: subscription.id,
          description: `${plan.name} subscription (${billingCycle})`,
        }),
      );

      // Add monthly credits to user balance
      let userCredit = await creditRepoM.findOne({ where: { userId } });
      if (!userCredit) {
        userCredit = creditRepoM.create({ userId, balance: 0 });
      }
      userCredit.balance = Number(userCredit.balance) + plan.monthlyCredits;
      await creditRepoM.save(userCredit);

      // Generate invoice
      const invoiceCount = await invoiceRepoM.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, '0')}`;

      await invoiceRepoM.save(
        invoiceRepoM.create({
          invoiceNumber,
          userId,
          transactionId: txn.id,
          subscriptionId: subscription.id,
          status: InvoiceStatus.PAID,
          subtotal: price,
          tax: 0,
          total: price,
          currency: 'USD',
          issuedAt: now,
          paidAt: now,
          items: [
            {
              description: `${plan.name} Plan — ${billingCycle === BillingCycle.YEARLY ? 'Annual' : 'Monthly'} subscription`,
              quantity: 1,
              unitPrice: price,
              amount: price,
            },
          ],
        }),
      );

      logger.info(`User ${userId} subscribed to plan ${plan.slug} (${billingCycle})`);

      return {
        subscription,
        plan,
        creditsAdded: plan.monthlyCredits,
      };
    });
  }

  /**
   * Get active subscription with plan details for a user (IDOR safe).
   */
  async getUserSubscription(userId: string) {
    const subscription = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: { plan: true },
    });
    if (!subscription) throw AppError.notFound('No active subscription found');
    return subscription;
  }

  /**
   * Cancel a subscription. Stays active until period end.
   */
  async cancelSubscription(userId: string) {
    const subscription = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
    if (!subscription) throw AppError.notFound('No active subscription to cancel');

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    await this.subRepo.save(subscription);

    logger.info(`User ${userId} cancelled subscription ${subscription.id}`);
    return subscription;
  }

  /**
   * Upgrade or downgrade to a different plan.
   * Prorates credits based on remaining period ratio.
   */
  async upgradeDowngrade(userId: string, newPlanSlug: string) {
    const newPlan = await this.planRepo.findOne({ where: { slug: newPlanSlug, isActive: true } });
    if (!newPlan) throw AppError.notFound('Subscription plan not found');

    const subscription = await this.subRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: { plan: true },
    });
    if (!subscription) throw AppError.notFound('No active subscription to change');

    if (subscription.planId === newPlan.id) {
      throw AppError.conflict('You are already on this plan');
    }

    // Calculate prorated credits: remaining fraction of period
    const now = new Date();
    const totalPeriodMs =
      subscription.currentPeriodEnd.getTime() - subscription.currentPeriodStart.getTime();
    const remainingMs = Math.max(0, subscription.currentPeriodEnd.getTime() - now.getTime());
    const remainingFraction = totalPeriodMs > 0 ? remainingMs / totalPeriodMs : 0;
    const proratedCredits = Math.round(newPlan.monthlyCredits * remainingFraction);

    return AppDataSource.transaction(async (manager) => {
      const subRepoM = manager.getRepository(Subscription);
      const txnRepoM = manager.getRepository(Transaction);
      const creditRepoM = manager.getRepository(UserCredit);

      // Update subscription plan
      subscription.planId = newPlan.id;
      const updatedSub = await subRepoM.save(subscription);

      // Create transaction for plan change
      await txnRepoM.save(
        txnRepoM.create({
          userId,
          packageId: null,
          credits: proratedCredits,
          amount: 0,
          type: TransactionType.SUBSCRIPTION,
          status: TransactionStatus.COMPLETED,
          subscriptionId: subscription.id,
          description: `Plan change to ${newPlan.name} — ${proratedCredits} prorated credits`,
        }),
      );

      // Add prorated credits
      if (proratedCredits > 0) {
        let userCredit = await creditRepoM.findOne({ where: { userId } });
        if (!userCredit) {
          userCredit = creditRepoM.create({ userId, balance: 0 });
        }
        userCredit.balance = Number(userCredit.balance) + proratedCredits;
        await creditRepoM.save(userCredit);
      }

      logger.info(`User ${userId} changed plan to ${newPlan.slug}, prorated ${proratedCredits} credits`);

      return {
        subscription: updatedSub,
        newPlan,
        proratedCredits,
      };
    });
  }
}

export const subscriptionService = new SubscriptionService();
