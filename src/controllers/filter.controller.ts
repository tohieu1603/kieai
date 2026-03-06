import { Request, Response } from 'express';
import { filterService } from '../services/filter.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';

export class FilterController {
  /** GET / — return all filter categories and providers */
  getFilters = asyncHandler(async (_req: Request, res: Response) => {
    const [categories, providers] = await Promise.all([
      filterService.getFilterCategories(),
      filterService.getProviders(),
    ]);
    return ApiResponse.success(res, { categories, providers });
  });
}

export const filterController = new FilterController();
