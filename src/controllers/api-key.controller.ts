import { Request, Response } from 'express';
import { ApiKey } from '../entities/api-key.entity';
import { BaseController } from './base.controller';
import { apiKeyService } from '../services/api-key.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';

export class ApiKeyController extends BaseController<ApiKey> {
  constructor() {
    super(apiKeyService);
  }

  /** POST / — Create a new API key */
  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const { name } = req.body;
    const result = await apiKeyService.createKey(req.user.id, name);
    return ApiResponse.created(res, result, 'API key created. Save the key now — it will not be shown again.');
  });

  /** GET / — List user's non-revoked API keys */
  list = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const keys = await apiKeyService.listKeys(req.user.id);
    return ApiResponse.success(res, keys);
  });

  /** PATCH /:id — Rename an API key */
  rename = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name } = req.body;
    const result = await apiKeyService.renameKey(id, req.user.id, name);
    return ApiResponse.success(res, result, 'API key renamed');
  });

  /** DELETE /:id — Revoke an API key */
  revoke = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await apiKeyService.revokeKey(id, req.user.id);
    return ApiResponse.success(res, null, 'API key revoked');
  });

  /** PUT /:id/limits — Update safe-spend limits */
  updateLimits = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { hourlyLimit, dailyLimit, totalLimit } = req.body;
    const result = await apiKeyService.updateLimits(id, req.user.id, { hourlyLimit, dailyLimit, totalLimit });
    return ApiResponse.success(res, result, 'Limits updated');
  });

  /** PUT /:id/whitelist — Update IP whitelist */
  updateWhitelist = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { ips } = req.body;
    const result = await apiKeyService.updateWhitelist(id, req.user.id, ips);
    return ApiResponse.success(res, result, 'Whitelist updated');
  });
}

export const apiKeyController = new ApiKeyController();
