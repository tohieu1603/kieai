import { Request, Response } from 'express';
import { logService } from '../services/log.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { parsePagination } from '../utils/pagination';

export class LogController {
  /**
   * GET / — Paginated logs for authenticated user.
   * Query: model, status, dateFrom, dateTo, page, limit
   */
  getLogs = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { page, limit } = parsePagination(req);

    const filters = {
      model: req.query.model as string | undefined,
      status: req.query.status as string | undefined,
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
    };

    const { data, total } = await logService.getLogs(userId, filters, page, limit);
    return ApiResponse.paginated(res, data, total, page, limit);
  });

  /**
   * GET /usage — Aggregated usage stats for authenticated user.
   */
  getUsageStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const stats = await logService.getUsageStats(userId);
    return ApiResponse.success(res, stats);
  });
}

export const logController = new LogController();
