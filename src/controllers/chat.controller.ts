import { Request, Response } from 'express';
import { chatService } from '../services/chat.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { AppError } from '../utils/app-error';

export class ChatController {
  /** POST /api/chat/completions */
  completions = asyncHandler(async (req: Request, res: Response) => {
    const rawKey = this.extractBearerToken(req);
    const apiKey = await chatService.authenticateApiKey(rawKey);

    const { model, messages, stream, ...rest } = req.body;

    if (!model || !messages || !Array.isArray(messages)) {
      throw AppError.badRequest('model and messages[] are required');
    }

    if (stream) {
      // SSE streaming — response handled inside service
      await chatService.chatCompletionStream(
        apiKey.userId,
        apiKey.id,
        { model, messages, stream: true, ...rest },
        res,
      );
      return; // response already sent
    }

    // Non-streaming
    const result = await chatService.chatCompletion(
      apiKey.userId,
      apiKey.id,
      { model, messages, ...rest },
    );

    return ApiResponse.success(res, result);
  });

  /** GET /api/chat/models */
  models = asyncHandler(async (req: Request, res: Response) => {
    const rawKey = this.extractBearerToken(req);
    await chatService.authenticateApiKey(rawKey);

    const result = await chatService.listModels();
    return ApiResponse.success(res, result);
  });

  private extractBearerToken(req: Request): string {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing Bearer token in Authorization header');
    }
    return auth.slice(7);
  }
}

export const chatController = new ChatController();
