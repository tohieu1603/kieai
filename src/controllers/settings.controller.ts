import { Request, Response } from 'express';
import { settingsService } from '../services/settings.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';

export class SettingsController {
  /** GET / — Get user settings */
  getSettings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await settingsService.getSettings(userId);
    return ApiResponse.success(res, settings);
  });

  /** PUT / — Update user settings */
  updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const settings = await settingsService.updateSettings(userId, req.body);
    return ApiResponse.success(res, settings, 'Settings updated');
  });

  /** GET /profile — Get user profile */
  getProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const profile = await settingsService.getProfile(userId);
    return ApiResponse.success(res, profile);
  });

  /** PUT /profile — Update user profile */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const profile = await settingsService.updateProfile(userId, req.body);
    return ApiResponse.success(res, profile, 'Profile updated');
  });

  /** GET /team — List team members */
  getTeamMembers = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const members = await settingsService.getTeamMembers(userId);
    return ApiResponse.success(res, members);
  });

  /** GET /webhooks — List webhook keys */
  getWebhookKeys = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const keys = await settingsService.getWebhookKeys(userId);
    return ApiResponse.success(res, keys);
  });

  /** POST /webhooks — Create webhook key */
  createWebhookKey = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const key = await settingsService.createWebhookKey(userId);
    return ApiResponse.created(res, key, 'Webhook key created');
  });
}

export const settingsController = new SettingsController();
