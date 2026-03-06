import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { modelService } from '../services/model.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { parsePagination } from '../utils/pagination';

export class ModelController extends BaseController<any> {
  constructor() {
    super(modelService);
  }

  /** GET / — list/search models with optional filters */
  override getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePagination(req);
    const { q, category, tags: rawTags, provider } = req.query as Record<string, string>;

    const tags = rawTags ? rawTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;

    const hasFilters = q || category || tags?.length || provider;

    if (hasFilters) {
      const [data, total] = await modelService.search(q, category, tags, provider, page, limit);
      return ApiResponse.paginated(res, data, total, page, limit);
    }

    const [data, total] = await modelService.findAll({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return ApiResponse.paginated(res, data, total, page, limit);
  });

  /** GET /featured — active featured slides */
  getFeaturedSlides = asyncHandler(async (_req: Request, res: Response) => {
    const slides = await modelService.getFeaturedSlides();
    return ApiResponse.success(res, slides);
  });

  /** GET /:slug — model detail by slug */
  getBySlug = asyncHandler(async (req: Request, res: Response) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const model = await modelService.findBySlug(slug);
    return ApiResponse.success(res, model);
  });

  /** GET /:slug/pricing — pricing tiers for model */
  getPricing = asyncHandler(async (req: Request, res: Response) => {
    const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
    const tiers = await modelService.getPricingBySlug(slug);
    return ApiResponse.success(res, tiers);
  });
}

export const modelController = new ModelController();
