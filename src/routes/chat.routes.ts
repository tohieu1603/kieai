import { Router } from 'express';
import { chatController } from '../controllers/chat.controller';

const router = Router();

/**
 * @swagger
 * /chat/completions:
 *   post:
 *     summary: Chat completion (non-streaming & streaming)
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Forward a chat completion request to the AI proxy (LiteLLM).
 *       Authenticate via API key in the Authorization header (`Bearer <api-key>`).
 *       Set `stream: true` for Server-Sent Events (SSE) streaming.
 *       Credits are deducted based on token usage after the response completes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [model, messages]
 *             properties:
 *               model:
 *                 type: string
 *                 example: "kimi-k2.5"
 *                 description: Model name (see GET /chat/models)
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role: { type: string, enum: [system, user, assistant], example: "user" }
 *                     content: { type: string, example: "Hello, how are you?" }
 *               stream:
 *                 type: boolean
 *                 default: false
 *                 description: Enable SSE streaming
 *               temperature:
 *                 type: number
 *                 example: 0.7
 *               max_tokens:
 *                 type: integer
 *                 example: 1024
 *     responses:
 *       200:
 *         description: Chat completion response with credit usage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     choices:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           message:
 *                             type: object
 *                             properties:
 *                               role: { type: string }
 *                               content: { type: string }
 *                     credits:
 *                       type: object
 *                       properties:
 *                         consumed: { type: integer, example: 3 }
 *                         promptTokens: { type: integer, example: 120 }
 *                         completionTokens: { type: integer, example: 450 }
 *                         totalTokens: { type: integer, example: 570 }
 *       401:
 *         description: Invalid or missing API key
 *       403:
 *         description: Insufficient credits
 *       502:
 *         description: AI service error
 */
router.post('/completions', chatController.completions);

/**
 * @swagger
 * /chat/models:
 *   get:
 *     summary: List available AI models
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Returns the list of available models from the AI proxy.
 *       Requires a valid API key in the Authorization header.
 *     responses:
 *       200:
 *         description: List of models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id: { type: string, example: "kimi-k2.5" }
 *                           object: { type: string, example: "model" }
 *       401:
 *         description: Invalid or missing API key
 */
router.get('/models', chatController.models);

export default router;
