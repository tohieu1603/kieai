import { AppDataSource } from '../config/database.config';
import { env } from '../config/env.config';
import { logger } from '../config/logger.config';
import { AppError } from '../utils/app-error';
import { TransactionType, TransactionStatus, InvoiceStatus } from '../enums';

// Lazy imports to avoid circular dependency at module load time
let TransactionEntity: any;
let UserCreditEntity: any;
let InvoiceEntity: any;

function getRepos() {
  if (!TransactionEntity) {
    TransactionEntity = require('../entities/transaction.entity').Transaction;
    UserCreditEntity = require('../entities/user-credit.entity').UserCredit;
    InvoiceEntity = require('../entities/invoice.entity').Invoice;
  }
  return {
    txnRepo: AppDataSource.getRepository(TransactionEntity),
    creditRepo: AppDataSource.getRepository(UserCreditEntity),
    invoiceRepo: AppDataSource.getRepository(InvoiceEntity),
  };
}

const DEPOSIT_EXPIRY_MINUTES = 30;

/**
 * Generate unique order code with prefix.
 * Used as transfer content for bank transfers — SePay webhook matches by this code.
 */
function generateOrderCode(prefix = 'OM'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Generate SePay QR code image URL.
 * Format: https://qr.sepay.vn/img?acc={BANK_ACCOUNT}&bank={BANK_CODE}&amount={AMOUNT}&des={ORDER_CODE}
 */
function generateQrCodeUrl(amount: number, orderCode: string): string {
  const params = new URLSearchParams({
    acc: env.sepay.bankAccount,
    bank: env.sepay.bankCode,
    amount: amount.toString(),
    des: orderCode,
  });
  return `https://qr.sepay.vn/img?${params.toString()}`;
}

export interface PaymentOrderResponse {
  transactionId: string;
  orderCode: string;
  amount: number;
  credits: number;
  status: string;
  paymentInfo: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    transferContent: string;
    qrCodeUrl: string;
  };
  expiresAt: string;
  createdAt: string;
}

export class SepayService {
  /**
   * Create a SePay payment order.
   * - Reuses existing pending order if same amount (anti-spam).
   * - Cancels old pending if different amount.
   * - Generates QR code URL for VietQR.
   */
  async createPaymentOrder(userId: string, amount: number, credits: number): Promise<PaymentOrderResponse> {
    if (amount < 1) throw AppError.badRequest('Minimum amount is 1');
    if (credits < 1) throw AppError.badRequest('Credits must be at least 1');

    const { txnRepo } = getRepos();

    // Check for existing pending order
    const existingPending = await txnRepo.findOne({
      where: {
        userId,
        type: TransactionType.SEPAY_TOPUP,
        status: TransactionStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (existingPending) {
      const expiresAt = new Date(existingPending.createdAt);
      expiresAt.setMinutes(expiresAt.getMinutes() + DEPOSIT_EXPIRY_MINUTES);
      const isExpired = expiresAt <= new Date();

      if (!isExpired && Number(existingPending.amount) === amount) {
        // Same amount, reuse existing order (anti-spam)
        return this.formatOrderResponse(existingPending);
      }

      // Different amount or expired → cancel old order
      existingPending.status = TransactionStatus.FAILED;
      existingPending.description = 'Cancelled: replaced by new order';
      await txnRepo.save(existingPending);
    }

    const orderCode = generateOrderCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + DEPOSIT_EXPIRY_MINUTES);

    const txn = await txnRepo.save(
      txnRepo.create({
        userId,
        packageId: null,
        credits,
        amount,
        type: TransactionType.SEPAY_TOPUP,
        status: TransactionStatus.PENDING,
        description: `SePay top-up: ${credits} credits`,
        sepayRef: orderCode,
      }),
    );

    logger.info(`SePay payment order created: ${orderCode} for user ${userId}`);
    return this.formatOrderResponse(txn);
  }

  /**
   * Get current pending order for user (for retry payment).
   */
  async getPendingOrder(userId: string): Promise<PaymentOrderResponse | null> {
    const { txnRepo } = getRepos();
    const pending = await txnRepo.findOne({
      where: {
        userId,
        type: TransactionType.SEPAY_TOPUP,
        status: TransactionStatus.PENDING,
      },
      order: { createdAt: 'DESC' },
    });

    if (!pending) return null;

    const expiresAt = new Date(pending.createdAt);
    expiresAt.setMinutes(expiresAt.getMinutes() + DEPOSIT_EXPIRY_MINUTES);
    if (expiresAt <= new Date()) return null;

    return this.formatOrderResponse(pending);
  }

  /**
   * Cancel a pending order (IDOR-safe: scoped by userId).
   */
  async cancelOrder(userId: string, transactionId: string): Promise<{ success: boolean }> {
    const { txnRepo } = getRepos();
    const txn = await txnRepo.findOne({
      where: { id: transactionId, userId, type: TransactionType.SEPAY_TOPUP },
    });

    if (!txn) throw AppError.notFound('Payment order not found');
    if (txn.status !== TransactionStatus.PENDING) {
      throw AppError.badRequest('Only pending orders can be cancelled');
    }

    txn.status = TransactionStatus.FAILED;
    txn.description = 'Cancelled by user';
    await txnRepo.save(txn);

    return { success: true };
  }

  /**
   * Get user's payment order history (IDOR-safe).
   */
  async getOrderHistory(userId: string, page: number, limit: number) {
    const { txnRepo } = getRepos();
    const [data, total] = await txnRepo.findAndCount({
      where: { userId, type: TransactionType.SEPAY_TOPUP },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: data.map((txn: any) => this.formatOrderResponse(txn)),
      total,
      page,
      limit,
    };
  }

  /**
   * Process SePay webhook callback.
   * - Idempotent: duplicate referenceCode is a no-op.
   * - Atomic: transaction update + credit in single DB transaction.
   * - Late-payment tolerant: processes expired pending orders.
   */
  async processWebhook(payload: {
    transferType?: string;
    transferAmount: number;
    content: string;
    referenceCode: string;
    transactionDate: string;
  }) {
    const { txnRepo, creditRepo, invoiceRepo } = getRepos();

    // Extract order code from transfer content
    const orderCodeMatch = payload.content.match(/OM[A-Z0-9]+/);
    if (!orderCodeMatch) {
      logger.warn(`SePay webhook: no order code found in content: ${payload.content}`);
      return { processed: false, reason: 'No matching order code' };
    }

    const orderCode = orderCodeMatch[0];

    // Idempotency check: if this referenceCode was already processed, skip
    if (payload.referenceCode) {
      const existing = await txnRepo.findOne({
        where: { description: `ref:${payload.referenceCode}` },
      });
      if (existing) {
        logger.info(`SePay webhook: duplicate referenceCode ${payload.referenceCode}, skipping`);
        return { processed: true, transactionId: existing.id };
      }
    }

    // Find matching pending transaction by orderCode (sepayRef)
    const txn = await txnRepo.findOne({
      where: { sepayRef: orderCode },
    });

    if (!txn) {
      logger.warn(`SePay webhook: no transaction found for order code ${orderCode}`);
      return { processed: false, reason: 'No matching transaction' };
    }

    // Already completed → idempotent success
    if (txn.status === TransactionStatus.COMPLETED) {
      return { processed: true, transactionId: txn.id };
    }

    // Only process pending or failed (expired) orders — late payment recovery
    if (txn.status !== TransactionStatus.PENDING && txn.status !== TransactionStatus.FAILED) {
      logger.warn(`SePay webhook: transaction ${txn.id} has status ${txn.status}, cannot process`);
      return { processed: false, reason: 'Invalid transaction status' };
    }

    // Verify amount is sufficient
    if (Number(payload.transferAmount) < Number(txn.amount)) {
      logger.warn(
        `SePay webhook: amount mismatch. Expected ${txn.amount}, got ${payload.transferAmount}`,
      );
      return { processed: false, reason: 'Amount mismatch' };
    }

    // Atomic: update transaction + add credits + generate invoice
    await AppDataSource.transaction(async (manager) => {
      const txnRepoM = manager.getRepository(TransactionEntity);
      const creditRepoM = manager.getRepository(UserCreditEntity);
      const invoiceRepoM = manager.getRepository(InvoiceEntity);

      // Update transaction to completed
      txn.status = TransactionStatus.COMPLETED;
      txn.description = `SePay top-up: ${txn.credits} credits | ref:${payload.referenceCode}`;
      await txnRepoM.save(txn);

      // Add credits to user balance (upsert)
      let userCredit = await creditRepoM.findOne({ where: { userId: txn.userId } });
      if (!userCredit) {
        userCredit = creditRepoM.create({ userId: txn.userId, balance: 0 });
      }
      userCredit.balance = Number(userCredit.balance) + Number(txn.credits);
      await creditRepoM.save(userCredit);

      // Auto-generate invoice
      const invoiceCount = await invoiceRepoM.count();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1).padStart(5, '0')}`;

      await invoiceRepoM.save(
        invoiceRepoM.create({
          invoiceNumber,
          userId: txn.userId,
          transactionId: txn.id,
          status: InvoiceStatus.PAID,
          subtotal: txn.amount,
          tax: 0,
          total: txn.amount,
          currency: 'USD',
          issuedAt: new Date(),
          paidAt: new Date(),
          items: [
            {
              description: `${txn.credits} API Credits (SePay)`,
              quantity: 1,
              unitPrice: txn.amount,
              amount: txn.amount,
            },
          ],
        }),
      );
    });

    logger.info(
      `SePay payment completed: ${orderCode}, ${txn.credits} credits added for user ${txn.userId}`,
    );
    return { processed: true, transactionId: txn.id };
  }

  /**
   * Check payment status by transaction ID (IDOR-safe: scoped by userId).
   */
  async checkPaymentStatus(transactionId: string, userId: string) {
    const { txnRepo } = getRepos();
    const txn = await txnRepo.findOne({
      where: { id: transactionId, userId, type: TransactionType.SEPAY_TOPUP },
    });
    if (!txn) throw AppError.notFound('Payment not found');

    return this.formatOrderResponse(txn);
  }

  /**
   * Admin: Get all SePay transactions across all users.
   */
  async adminGetAllOrders(page: number, limit: number, status?: string, userId?: string) {
    const { txnRepo } = getRepos();

    const where: any = { type: TransactionType.SEPAY_TOPUP };
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const [data, total] = await txnRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      data: data.map((txn: any) => this.formatOrderResponse(txn)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: Manually adjust user credits.
   */
  async adminUpdateCredits(adminUserId: string, targetUserId: string, amount: number, reason: string) {
    const { txnRepo, creditRepo } = getRepos();

    // Create adjustment transaction
    const txn = await txnRepo.save(
      txnRepo.create({
        userId: targetUserId,
        packageId: null,
        credits: Math.abs(amount),
        amount: 0,
        type: amount > 0 ? TransactionType.CREDIT_PURCHASE : TransactionType.REFUND,
        status: TransactionStatus.COMPLETED,
        description: `Admin adjustment: ${reason} (by ${adminUserId})`,
      }),
    );

    // Update user balance
    let userCredit = await creditRepo.findOne({ where: { userId: targetUserId } });
    if (!userCredit) {
      userCredit = creditRepo.create({ userId: targetUserId, balance: 0 });
    }
    userCredit.balance = Math.max(0, Number(userCredit.balance) + amount);
    await creditRepo.save(userCredit);

    logger.info(`Admin ${adminUserId} adjusted credits for user ${targetUserId}: ${amount} (${reason})`);

    return {
      transactionId: txn.id,
      newBalance: userCredit.balance,
    };
  }

  /**
   * Format transaction as payment order response with bank info & QR URL.
   */
  private formatOrderResponse(txn: any): PaymentOrderResponse {
    const expiresAt = new Date(txn.createdAt);
    expiresAt.setMinutes(expiresAt.getMinutes() + DEPOSIT_EXPIRY_MINUTES);
    const isExpired = expiresAt <= new Date();

    const status = txn.status === TransactionStatus.PENDING && isExpired ? 'expired' : txn.status;

    return {
      transactionId: txn.id,
      orderCode: txn.sepayRef,
      amount: txn.amount,
      credits: txn.credits,
      status,
      paymentInfo: {
        bankName: env.sepay.bankCode,
        accountNumber: env.sepay.bankAccount,
        accountName: env.sepay.merchantName,
        transferContent: txn.sepayRef,
        qrCodeUrl: generateQrCodeUrl(Number(txn.amount), txn.sepayRef),
      },
      expiresAt: expiresAt.toISOString(),
      createdAt: txn.createdAt instanceof Date ? txn.createdAt.toISOString() : txn.createdAt,
    };
  }
}

export const sepayService = new SepayService();
