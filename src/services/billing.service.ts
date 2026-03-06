import { AppDataSource } from '../config/database.config';
import { CreditPackage } from '../entities/credit-package.entity';
import { Transaction } from '../entities/transaction.entity';
import { UserCredit } from '../entities/user-credit.entity';
import { BaseService } from './base.service';
import { AppError } from '../utils/app-error';

export class BillingService extends BaseService<CreditPackage> {
  constructor() {
    super(AppDataSource.getRepository(CreditPackage));
  }

  protected get entityName(): string {
    return 'Credit package';
  }

  /**
   * List all active credit packages ordered by price ascending.
   */
  async getPackages(): Promise<CreditPackage[]> {
    const [packages] = await this.findAll({
      where: { isActive: true },
      order: { price: 'ASC' } as any,
    });
    return packages;
  }

  /**
   * Purchase credits from a package.
   * Wrapped in a DB transaction for atomicity: creates Transaction record and increments UserCredit balance.
   */
  async purchaseCredits(userId: string, packageId: string): Promise<Transaction> {
    return AppDataSource.transaction(async (manager) => {
      const packageRepo = manager.getRepository(CreditPackage);
      const transactionRepo = manager.getRepository(Transaction);
      const userCreditRepo = manager.getRepository(UserCredit);

      const pkg = await packageRepo.findOne({ where: { id: packageId, isActive: true } });
      if (!pkg) throw AppError.notFound('Credit package not found or no longer available');

      // Create transaction record
      const txn = transactionRepo.create({
        userId,
        packageId,
        credits: pkg.credits,
        amount: pkg.price,
      });
      const savedTxn = await transactionRepo.save(txn);

      // Upsert user credit balance
      let userCredit = await userCreditRepo.findOne({ where: { userId } });
      if (!userCredit) {
        userCredit = userCreditRepo.create({ userId, balance: 0 });
      }
      userCredit.balance = userCredit.balance + pkg.credits;
      await userCreditRepo.save(userCredit);

      return savedTxn;
    });
  }

  /**
   * Get paginated transaction history for a user (IDOR safe — userId scoped).
   */
  async getTransactions(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: Transaction[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const transactionRepo = AppDataSource.getRepository(Transaction);

    const [data, total] = await transactionRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total, page, limit };
  }

  /**
   * Get current credit balance for a user.
   */
  async getBalance(userId: string): Promise<{ balance: number }> {
    const userCreditRepo = AppDataSource.getRepository(UserCredit);
    const userCredit = await userCreditRepo.findOne({ where: { userId } });
    return { balance: userCredit?.balance ?? 0 };
  }
}

export const billingService = new BillingService();
