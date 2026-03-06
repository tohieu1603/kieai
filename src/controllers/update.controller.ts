import { Request, Response } from 'express';
import { updateService } from '../services/update.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { parsePagination } from '../utils/pagination';

export class UpdateController {
  /**
   * GET / — List api_updates (public). Query: tag, page, limit
   */
  getUpdates = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req);
    const tag = req.query.tag as string | undefined;

    const { data, total } = await updateService.getUpdates(tag, page, limit);
    return ApiResponse.paginated(res, data, total, page, limit);
  });

  /**
   * GET /tags — List all update tags (public).
   */
  getTags = asyncHandler(async (_req: Request, res: Response) => {
    const tags = await updateService.getTags();
    return ApiResponse.success(res, tags);
  });
}

export const updateController = new UpdateController();
