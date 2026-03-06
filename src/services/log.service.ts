import { AppDataSource } from '../config/database.config';
import { Log } from '../entities/log.entity';
import { parsePagination } from '../utils/pagination';
import { LogStatus } from '../enums';

export class LogService {
  private get repo() {
    return AppDataSource.getRepository(Log);
  }

  /**
   * Get paginated logs for a user. Always filters by userId (IDOR prevention).
   */
  async getLogs(
    userId: string,
    filters?: {
      model?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('log')
      .where('log.user_id = :userId', { userId });

    if (filters?.model) {
      qb.andWhere('log.model = :model', { model: filters.model });
    }

    if (filters?.status) {
      qb.andWhere('log.status = :status', { status: filters.status as LogStatus });
    }

    if (filters?.dateFrom) {
      qb.andWhere('log.date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters?.dateTo) {
      qb.andWhere('log.date <= :dateTo', { dateTo: filters.dateTo });
    }

    qb.orderBy('log.date', 'DESC').addOrderBy('log.time', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * Aggregated usage statistics for a user (last 30 days for daily, all-time for endpoint/key).
   */
  async getUsageStats(userId: string) {
    const repo = this.repo;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    const fromDateStr = fromDate.toISOString().split('T')[0];

    // Daily usage — last 30 days
    const dailyRaw = await repo
      .createQueryBuilder('log')
      .select('log.date', 'date')
      .addSelect('SUM(log.credits_consumed)', 'credits')
      .where('log.user_id = :userId', { userId })
      .andWhere('log.date >= :fromDate', { fromDate: fromDateStr })
      .groupBy('log.date')
      .orderBy('log.date', 'ASC')
      .getRawMany();

    const dailyUsage = dailyRaw.map((row) => ({
      date: row.date,
      credits: Number(row.credits) || 0,
    }));

    // Endpoint (model) usage — all-time
    const endpointRaw = await repo
      .createQueryBuilder('log')
      .select('log.model', 'model')
      .addSelect('SUM(log.credits_consumed)', 'credits')
      .addSelect('COUNT(log.id)', 'requests')
      .where('log.user_id = :userId', { userId })
      .groupBy('log.model')
      .orderBy('credits', 'DESC')
      .getRawMany();

    const endpointUsage = endpointRaw.map((row) => ({
      model: row.model,
      credits: Number(row.credits) || 0,
      requests: Number(row.requests) || 0,
    }));

    // Key usage — group by api_key_id
    const keyRaw = await repo
      .createQueryBuilder('log')
      .select('log.api_key_id', 'apiKeyId')
      .addSelect('SUM(log.credits_consumed)', 'credits')
      .addSelect('COUNT(log.id)', 'requests')
      .addSelect('MAX(log.date)', 'lastUsedDate')
      .where('log.user_id = :userId', { userId })
      .andWhere('log.api_key_id IS NOT NULL')
      .groupBy('log.api_key_id')
      .orderBy('credits', 'DESC')
      .getRawMany();

    const keyUsage = keyRaw.map((row) => ({
      apiKeyId: row.apiKeyId,
      credits: Number(row.credits) || 0,
      requests: Number(row.requests) || 0,
      lastUsedDate: row.lastUsedDate,
    }));

    return { dailyUsage, endpointUsage, keyUsage };
  }
}

export const logService = new LogService();
