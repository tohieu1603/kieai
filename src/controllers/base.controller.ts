import { Request, Response } from 'express';
import { ObjectLiteral } from 'typeorm';
import { BaseService } from '../services/base.service';
import { ApiResponse } from '../utils/api-response';
import { parsePagination } from '../utils/pagination';
import { asyncHandler } from '../utils/async-handler';

/**
 * Generic base controller providing reusable CRUD endpoints.
 * Subclass and override to customize behavior.
 */
export abstract class BaseController<T extends ObjectLiteral> {
  constructor(protected readonly service: BaseService<T>) {}

  /** GET / — List with pagination */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, skip } = parsePagination(req);
    const [data, total] = await this.service.findAll({
      skip,
      take: limit,
      order: this.defaultOrder(),
    });
    return ApiResponse.paginated(res, data, total, page, limit);
  });

  /** GET /:id — Get by ID */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const entity = await this.service.findById(id, this.defaultRelations());
    return ApiResponse.success(res, entity);
  });

  /** POST / — Create */
  create = asyncHandler(async (req: Request, res: Response) => {
    const entity = await this.service.create(req.body);
    return ApiResponse.created(res, entity);
  });

  /** PUT /:id — Update */
  update = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const entity = await this.service.update(id, req.body);
    return ApiResponse.success(res, entity, 'Updated');
  });

  /** DELETE /:id — Delete */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await this.service.delete(id);
    return ApiResponse.success(res, null, 'Deleted');
  });

  /** Override for default sorting */
  protected defaultOrder(): any {
    return { createdAt: 'DESC' };
  }

  /** Override to eager-load relations */
  protected defaultRelations(): any {
    return undefined;
  }
}
