/**
 * Unit tests for BillingService.
 * AppDataSource.getRepository and AppDataSource.transaction are mocked.
 */

// --- Module mocks ---

jest.mock('../../../src/config/database.config', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    transaction: jest.fn(),
  },
}));

jest.mock('../../../src/config/logger.config', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// BillingService imports entities at module level
jest.mock('../../../src/entities/credit-package.entity', () => ({
  CreditPackage: 'CreditPackageEntity',
}));
jest.mock('../../../src/entities/transaction.entity', () => ({
  Transaction: 'TransactionEntity',
}));
jest.mock('../../../src/entities/user-credit.entity', () => ({
  UserCredit: 'UserCreditEntity',
}));

// --- Imports (after mocks) ---

import { BillingService } from '../../../src/services/billing.service';
import { AppError } from '../../../src/utils/app-error';

// --- Helpers ---

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn().mockImplementation((entity: any) =>
    Promise.resolve({ id: 'generated-uuid', createdAt: new Date(), ...entity }),
  ),
  create: jest.fn().mockImplementation((data: any) => data),
  remove: jest.fn(),
  count: jest.fn(),
});

// --- Test suite ---

describe('BillingService', () => {
  let service: BillingService;
  let mockPackageRepo: ReturnType<typeof createMockRepo>;

  // Per-test transaction sub-repos
  let txnPackageRepo: ReturnType<typeof createMockRepo>;
  let txnTransactionRepo: ReturnType<typeof createMockRepo>;
  let txnUserCreditRepo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPackageRepo = createMockRepo();
    txnPackageRepo = createMockRepo();
    txnTransactionRepo = createMockRepo();
    txnUserCreditRepo = createMockRepo();

    const { AppDataSource } = require('../../../src/config/database.config');

    // getRepository is used by the BaseService constructor and by getTransactions / getBalance
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockPackageRepo);

    // transaction() receives a callback; we call it with a fake EntityManager
    (AppDataSource.transaction as jest.Mock).mockImplementation(
      async (cb: (manager: any) => Promise<any>) => {
        const fakeManager = {
          getRepository: jest.fn((entity: string) => {
            if (entity === 'CreditPackageEntity') return txnPackageRepo;
            if (entity === 'TransactionEntity') return txnTransactionRepo;
            if (entity === 'UserCreditEntity') return txnUserCreditRepo;
            return createMockRepo();
          }),
        };
        return cb(fakeManager);
      },
    );

    service = new BillingService();
  });

  // -------------------------------------------------------------------------
  // getPackages()
  // -------------------------------------------------------------------------
  describe('getPackages()', () => {
    it('returns active packages ordered by price ASC', async () => {
      const packages = [
        { id: 'pkg-1', name: 'Starter', credits: 100, price: 5, isActive: true },
        { id: 'pkg-2', name: 'Pro', credits: 500, price: 20, isActive: true },
      ];
      mockPackageRepo.findAndCount.mockResolvedValue([packages, 2]);

      const result = await service.getPackages();

      expect(result).toEqual(packages);
      expect(mockPackageRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isActive: true } }),
      );
    });

    it('returns an empty array when no packages are active', async () => {
      mockPackageRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getPackages();

      expect(result).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // purchaseCredits()
  // -------------------------------------------------------------------------
  describe('purchaseCredits()', () => {
    const userId = 'user-id-1';
    const packageId = 'pkg-id-1';

    const mockPackage = {
      id: packageId,
      name: 'Starter',
      credits: 100,
      price: 5,
      isActive: true,
    };

    it('creates a transaction record and increments user credit balance', async () => {
      txnPackageRepo.findOne.mockResolvedValue(mockPackage);

      const savedTxn = {
        id: 'txn-id',
        userId,
        packageId,
        credits: mockPackage.credits,
        amount: mockPackage.price,
        createdAt: new Date(),
      };
      txnTransactionRepo.create.mockReturnValue(savedTxn);
      txnTransactionRepo.save.mockResolvedValue(savedTxn);

      const existingCredit = { userId, balance: 50 };
      txnUserCreditRepo.findOne.mockResolvedValue(existingCredit);
      txnUserCreditRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      const result = await service.purchaseCredits(userId, packageId);

      expect(result).toMatchObject({ userId, packageId, credits: 100 });
      expect(existingCredit.balance).toBe(150); // 50 + 100
      expect(txnTransactionRepo.save).toHaveBeenCalledTimes(1);
      expect(txnUserCreditRepo.save).toHaveBeenCalledTimes(1);
    });

    it('creates a new UserCredit record if user has no existing balance', async () => {
      txnPackageRepo.findOne.mockResolvedValue(mockPackage);

      const savedTxn = {
        id: 'txn-id',
        userId,
        packageId,
        credits: mockPackage.credits,
        amount: mockPackage.price,
      };
      txnTransactionRepo.create.mockReturnValue(savedTxn);
      txnTransactionRepo.save.mockResolvedValue(savedTxn);

      // No existing credit record
      txnUserCreditRepo.findOne.mockResolvedValue(null);
      const newCreditRecord: any = { userId, balance: 0 };
      txnUserCreditRepo.create.mockReturnValue(newCreditRecord);
      txnUserCreditRepo.save.mockImplementation((c: any) => Promise.resolve(c));

      await service.purchaseCredits(userId, packageId);

      expect(txnUserCreditRepo.create).toHaveBeenCalledWith({ userId, balance: 0 });
      expect(newCreditRecord.balance).toBe(100); // 0 + 100
    });

    it('throws 404 when package does not exist or is inactive', async () => {
      txnPackageRepo.findOne.mockResolvedValue(null);

      await expect(service.purchaseCredits(userId, 'nonexistent-pkg')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Credit package not found or no longer available',
      });

      expect(txnTransactionRepo.save).not.toHaveBeenCalled();
      expect(txnUserCreditRepo.save).not.toHaveBeenCalled();
    });

    it('wraps the entire operation in a DB transaction', async () => {
      txnPackageRepo.findOne.mockResolvedValue(mockPackage);
      txnTransactionRepo.create.mockReturnValue({ userId, packageId, credits: 100 });
      txnTransactionRepo.save.mockResolvedValue({ id: 'txn', credits: 100 });
      txnUserCreditRepo.findOne.mockResolvedValue({ userId, balance: 0 });
      txnUserCreditRepo.save.mockResolvedValue({});

      await service.purchaseCredits(userId, packageId);

      const { AppDataSource } = require('../../../src/config/database.config');
      expect(AppDataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // getTransactions()
  // -------------------------------------------------------------------------
  describe('getTransactions()', () => {
    it('returns paginated transaction list with metadata', async () => {
      const transactions = [
        { id: 'txn-1', userId: 'u1', credits: 100, amount: 5, createdAt: new Date() },
        { id: 'txn-2', userId: 'u1', credits: 500, amount: 20, createdAt: new Date() },
      ];
      // getTransactions calls AppDataSource.getRepository(Transaction) directly
      mockPackageRepo.findAndCount.mockResolvedValue([transactions, 2]);

      const result = await service.getTransactions('u1', 1, 10);

      expect(result).toMatchObject({
        data: transactions,
        total: 2,
        page: 1,
        limit: 10,
      });
    });

    it('calculates correct skip value from page and limit', async () => {
      mockPackageRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getTransactions('u1', 3, 20);

      expect(mockPackageRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('scopes results to the provided userId', async () => {
      mockPackageRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.getTransactions('user-xyz', 1, 5);

      expect(mockPackageRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-xyz' } }),
      );
    });

    it('returns empty data array when user has no transactions', async () => {
      mockPackageRepo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getTransactions('user-no-txns', 1, 10);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // getBalance()
  // -------------------------------------------------------------------------
  describe('getBalance()', () => {
    it('returns the current credit balance for the user', async () => {
      mockPackageRepo.findOne.mockResolvedValue({ userId: 'u1', balance: 250 });

      const result = await service.getBalance('u1');

      expect(result).toEqual({ balance: 250 });
    });

    it('returns balance of 0 when no credit record exists', async () => {
      mockPackageRepo.findOne.mockResolvedValue(null);

      const result = await service.getBalance('u1');

      expect(result).toEqual({ balance: 0 });
    });

    it('queries by userId', async () => {
      mockPackageRepo.findOne.mockResolvedValue(null);

      await service.getBalance('user-abc');

      expect(mockPackageRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-abc' },
      });
    });
  });
});
