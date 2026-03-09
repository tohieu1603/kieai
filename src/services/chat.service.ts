import { AppDataSource } from '../config/database.config';
import { env } from '../config/env.config';
import { logger } from '../config/logger.config';
import { AppError } from '../utils/app-error';
import { sha256 } from '../utils/crypto';
import { LogStatus } from '../enums';

// Lazy entity imports
let ApiKeyEntity: any;
let UserCreditEntity: any;
let LogEntity: any;

function getRepos() {
  if (!ApiKeyEntity) {
    ApiKeyEntity = require('../entities/api-key.entity').ApiKey;
    UserCreditEntity = require('../entities/user-credit.entity').UserCredit;
    LogEntity = require('../entities/log.entity').Log;
  }
  return {
    apiKeyRepo: AppDataSource.getRepository(ApiKeyEntity),
    creditRepo: AppDataSource.getRepository(UserCreditEntity),
    logRepo: AppDataSource.getRepository(LogEntity),
  };
}

/**
 * Token-to-credit conversion rates per model category.
 * 1 credit = X tokens (configurable per model).
 */
const TOKEN_COST_MAP: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  // Default: 1 credit per 1k input tokens, 2 credits per 1k output tokens
  default: { inputPer1k: 1, outputPer1k: 2 },
  'kimi-k2.5': { inputPer1k: 1, outputPer1k: 2 },
  'gpt-oss-120b': { inputPer1k: 2, outputPer1k: 4 },
  'deepseek-v3.2': { inputPer1k: 1, outputPer1k: 1 },
  'deepseek-r1': { inputPer1k: 2, outputPer1k: 3 },
  'kimi-k2-thinking': { inputPer1k: 2, outputPer1k: 3 },
  'glm-4-7': { inputPer1k: 1, outputPer1k: 1 },
  'seed-1.6-flash': { inputPer1k: 1, outputPer1k: 1 },
};

/**
 * Calculate credit cost from token usage.
 */
function calculateCredits(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const rates = TOKEN_COST_MAP[model] || TOKEN_COST_MAP.default;
  const inputCost = Math.ceil((promptTokens / 1000) * rates.inputPer1k);
  const outputCost = Math.ceil((completionTokens / 1000) * rates.outputPer1k);
  return inputCost + outputCost;
}

export class ChatService {
  /**
   * Authenticate request via API key (Bearer token in Authorization header).
   * Returns the API key record with userId.
   */
  async authenticateApiKey(rawKey: string) {
    const { apiKeyRepo } = getRepos();
    const keyHash = sha256(rawKey);

    const apiKey = await apiKeyRepo.findOne({
      where: { keyHash, isRevoked: false },
    });

    if (!apiKey) throw AppError.unauthorized('Invalid or revoked API key');

    // Update lastUsedAt
    apiKey.lastUsedAt = new Date();
    await apiKeyRepo.save(apiKey);

    return apiKey;
  }

  /**
   * Check if user has enough credits for a request.
   */
  async checkBalance(userId: string, minCredits = 1): Promise<number> {
    const { creditRepo } = getRepos();
    const userCredit = await creditRepo.findOne({ where: { userId } });
    const balance = userCredit?.balance ?? 0;

    if (balance < minCredits) {
      throw AppError.forbidden(`Insufficient credits. Balance: ${balance}`);
    }

    return balance;
  }

  /**
   * Forward chat completion request to LiteLLM proxy.
   * Deducts credits based on token usage.
   */
  async chatCompletion(
    userId: string,
    apiKeyId: string,
    body: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      stream?: boolean;
      temperature?: number;
      max_tokens?: number;
      [key: string]: any;
    },
  ) {
    const startTime = Date.now();
    const model = body.model;

    // Pre-check minimum credits
    await this.checkBalance(userId, 1);

    // Forward to LiteLLM proxy
    const litellmUrl = `${env.litellm.baseUrl}/v1/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (env.litellm.masterKey) {
      headers['Authorization'] = `Bearer ${env.litellm.masterKey}`;
    }

    let response: Response;
    try {
      response = await fetch(litellmUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...body, stream: false }),
      });
    } catch (error: any) {
      logger.error('LiteLLM proxy unreachable', { error: error.message });
      throw AppError.internal('AI service unavailable. Please try again later.');
    }

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('LiteLLM error', { status: response.status, body: errorBody });
      throw new AppError(
        `AI service error: ${response.status}`,
        response.status >= 500 ? 502 : response.status,
      );
    }

    const data = await response.json() as any;
    const duration = Math.round((Date.now() - startTime) / 1000);

    // Extract token usage
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || 0;

    // Calculate and deduct credits
    const creditsConsumed = calculateCredits(model, promptTokens, completionTokens);

    await this.deductCredits(userId, creditsConsumed);

    // Log the request
    await this.logRequest({
      userId,
      apiKeyId,
      model,
      duration,
      input: JSON.stringify(body.messages.slice(-1)),
      creditsConsumed,
      status: LogStatus.SUCCESS,
      taskId: data.id || '',
    });

    logger.info(`Chat completion: model=${model}, tokens=${totalTokens}, credits=${creditsConsumed}, user=${userId}`);

    // Return response with usage info
    return {
      ...data,
      credits: {
        consumed: creditsConsumed,
        promptTokens,
        completionTokens,
        totalTokens,
      },
    };
  }

  /**
   * Stream chat completion — pipes LiteLLM SSE stream to client.
   * Credits are estimated upfront and adjusted after stream completes.
   */
  async chatCompletionStream(
    userId: string,
    apiKeyId: string,
    body: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      [key: string]: any;
    },
    res: import('express').Response,
  ) {
    const startTime = Date.now();
    const model = body.model;

    await this.checkBalance(userId, 1);

    const litellmUrl = `${env.litellm.baseUrl}/v1/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (env.litellm.masterKey) {
      headers['Authorization'] = `Bearer ${env.litellm.masterKey}`;
    }

    let response: Response;
    try {
      response = await fetch(litellmUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...body, stream: true, stream_options: { include_usage: true } }),
      });
    } catch (error: any) {
      logger.error('LiteLLM proxy unreachable', { error: error.message });
      throw AppError.internal('AI service unavailable');
    }

    if (!response.ok || !response.body) {
      const errorBody = await response.text();
      logger.error('LiteLLM stream error', { status: response.status, body: errorBody });
      throw new AppError(`AI service error: ${response.status}`, 502);
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let promptTokens = 0;
    let completionTokens = 0;
    let taskId = '';

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);

        // Parse SSE chunks to extract usage from final chunk
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.id) taskId = parsed.id;
            if (parsed.usage) {
              promptTokens = parsed.usage.prompt_tokens || 0;
              completionTokens = parsed.usage.completion_tokens || 0;
            }
          } catch {
            // Not valid JSON chunk, skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Deduct credits after stream completes
    const creditsConsumed = calculateCredits(model, promptTokens, completionTokens);
    const duration = Math.round((Date.now() - startTime) / 1000);

    if (creditsConsumed > 0) {
      await this.deductCredits(userId, creditsConsumed);
    }

    await this.logRequest({
      userId,
      apiKeyId,
      model,
      duration,
      input: JSON.stringify(body.messages.slice(-1)),
      creditsConsumed,
      status: LogStatus.SUCCESS,
      taskId,
    });

    // Send final usage event before closing
    const usageEvent = `data: ${JSON.stringify({ credits: { consumed: creditsConsumed, promptTokens, completionTokens } })}\n\n`;
    res.write(usageEvent);
    res.write('data: [DONE]\n\n');
    res.end();

    logger.info(`Chat stream: model=${model}, tokens=${promptTokens + completionTokens}, credits=${creditsConsumed}, user=${userId}`);
  }

  /**
   * Deduct credits from user balance atomically.
   */
  private async deductCredits(userId: string, amount: number): Promise<void> {
    const { creditRepo } = getRepos();

    const result = await creditRepo
      .createQueryBuilder()
      .update()
      .set({ balance: () => `balance - ${amount}` })
      .where('userId = :userId AND balance >= :amount', { userId, amount })
      .execute();

    if (result.affected === 0) {
      throw AppError.forbidden('Insufficient credits');
    }
  }

  /**
   * Create a log entry for the API call.
   */
  private async logRequest(data: {
    userId: string;
    apiKeyId: string;
    model: string;
    duration: number;
    input: string;
    creditsConsumed: number;
    status: LogStatus;
    taskId: string;
  }): Promise<void> {
    const { logRepo } = getRepos();
    const now = new Date();

    try {
      await logRepo.save(
        logRepo.create({
          userId: data.userId,
          apiKeyId: data.apiKeyId,
          model: data.model,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().split(' ')[0],
          duration: data.duration,
          input: data.input,
          status: data.status,
          creditsConsumed: data.creditsConsumed,
          taskId: data.taskId,
          hasResult: data.status === LogStatus.SUCCESS,
        }),
      );
    } catch (error) {
      logger.error('Failed to log chat request', { error });
    }
  }

  /**
   * List available models from LiteLLM proxy.
   */
  async listModels() {
    const headers: Record<string, string> = {};
    if (env.litellm.masterKey) {
      headers['Authorization'] = `Bearer ${env.litellm.masterKey}`;
    }

    try {
      const response = await fetch(`${env.litellm.baseUrl}/v1/models`, { headers });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      return await response.json();
    } catch (error: any) {
      logger.error('Failed to list LiteLLM models', { error: error.message });
      throw AppError.internal('AI service unavailable');
    }
  }
}

export const chatService = new ChatService();
