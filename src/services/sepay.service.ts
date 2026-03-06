import crypto from 'crypto';
import { AppDataSource } from '../config/database.config';
import { env } from '../config/env.config';
import { logger } from '../config/logger.config';
import { AppError } from '../utils/app-error';
import { TransactionType, TransactionStatus, InvoiceStatus } from '../enums';

// Lazy imports for entities to avoid circular dependency issues at module load time
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

export class SepayService {
  /**
   * Generate a VietQR payment URL / transfer content for a credit top-up.
   * Content format: "OM <userId short> <timestamp>" — used to match webhook callbacks.
   */
  async createPaymentOrder(userId: string, amount: number, credits: number) {
    if (amount < 1) throw AppError.badRequest('Minimum amount is $1');
    if (credits < 1) throw AppError.badRequest('Credits must be at least 1');

    const { txnRepo } = getRepos();
    const transferContent = `OM${userId.substring(0, 8).toUpperCase()}${Date.now().toString(36).toUpperCase()}`;

    const txn = await txnRepo.save(
      txnRepo.create({
        userId,
        packageId: null,
        credits,
        amount,
        type: TransactionType.SEPAY_TOPUP,
        status: TransactionStatus.PENDING,
        description: `SePay top-up: ${credits} credits`,
        sepayRef: transferContent,
      }),
    );

    // Build VietQR data
    const qrData = {
      bankCode: env.sepay.bankCode,
      bankAccount: env.sepay.bankAccount,
      amount,
      content: transferContent,
      accountName: env.sepay.merchantName,
    };

    logger.info(`SePay payment order created: ${transferContent} for user ${userId}`);

    return {
      transactionId: txn.id,
      transferContent,
      qrData,
      expiresIn: 30 * 60, // 30 minutes in seconds
    };
  }

  /**
   * Verify SePay webhook HMAC-SHA256 signature.
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!env.sepay.webhookSecret) return false;
    const expected = crypto
      .createHmac('sha256', env.sepay.webhookSecret)
      .update(body)
      .digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  /**
   * Process SePay webhook callback.
   * Called when a bank transfer is confirmed by SePay.
   */
  async processWebhook(payload: {
    transferContent: string;
    transferAmount: number;
    referenceCode: string;
    transactionDate: string;
  }) {
    const { txnRepo, creditRepo, invoiceRepo } = getRepos();

    // Find matching pending transaction by sepayRef
    const txn = await txnRepo.findOne({
      where: { sepayRef: payload.transferContent, status: TransactionStatus.PENDING },
    });

    if (!txn) {
      logger.warn(`SePay webhook: no matching pending transaction for ${payload.transferContent}`);
      return { processed: false, reason: 'No matching transaction' };
    }

    // Verify amount is sufficient
    if (Number(payload.transferAmount) < Number(txn.amount)) {
      logger.warn(
        `SePay webhook: amount mismatch. Expected ${txn.amount}, got ${payload.transferAmount}`,
      );
      txn.status = TransactionStatus.FAILED;
      txn.description = `Amount mismatch: expected ${txn.amount}, received ${payload.transferAmount}`;
      await txnRepo.save(txn);
      return { processed: false, reason: 'Amount mismatch' };
    }

    // Complete the transaction atomically
    await AppDataSource.transaction(async (manager) => {
      const txnRepoM = manager.getRepository(TransactionEntity);
      const creditRepoM = manager.getRepository(UserCreditEntity);
      const invoiceRepoM = manager.getRepository(InvoiceEntity);

      // Update transaction to completed
      txn.status = TransactionStatus.COMPLETED;
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
      `SePay payment completed: ${payload.transferContent}, ${txn.credits} credits added for user ${txn.userId}`,
    );
    return { processed: true, transactionId: txn.id };
  }

  /**
   * Check payment status by transaction ID (user-facing, IDOR safe).
   */
  async checkPaymentStatus(transactionId: string, userId: string) {
    const { txnRepo } = getRepos();
    const txn = await txnRepo.findOne({
      where: { id: transactionId, userId, type: TransactionType.SEPAY_TOPUP },
    });
    if (!txn) throw AppError.notFound('Payment not found');

    return {
      id: txn.id,
      status: txn.status,
      amount: txn.amount,
      credits: txn.credits,
      transferContent: txn.sepayRef,
      createdAt: txn.createdAt,
    };
  }
}

export const sepayService = new SepayService();
