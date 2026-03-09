import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../utils/api-response';
import { asyncHandler } from '../utils/async-handler';
import { env } from '../config/env.config';

/** Cookie options for httpOnly tokens */
const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: 'strict' as const,
  domain: env.cookie.domain,
  path: '/',
  maxAge,
});

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 min
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export class AuthController {
  /** POST /api/auth/register */
  register = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    return ApiResponse.created(res, result);
  });

  /** POST /api/auth/verify-email */
  verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    const result = await authService.verifyEmail(token);
    return ApiResponse.success(res, result);
  });

  /** POST /api/auth/resend-verification */
  resendVerification = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await authService.resendVerification(email);
    return ApiResponse.success(res, result);
  });

  /** POST /api/auth/login */
  login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    // Set httpOnly cookies
    res.cookie('access_token', result.accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refresh_token', result.refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

    return ApiResponse.success(res, {
      user: result.user,
    }, 'Login successful');
  });

  /** POST /api/auth/refresh */
  refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return ApiResponse.error(res, 'Refresh token required', 401);
    }

    const result = await authService.refreshAccessToken(refreshToken);

    res.cookie('access_token', result.accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refresh_token', result.refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

    return ApiResponse.success(res, null, 'Token refreshed');
  });

  /** POST /api/auth/logout */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return ApiResponse.success(res, null, 'Logged out');
  });

  /** POST /api/auth/revoke-all — Revoke all sessions */
  revokeAll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Unauthorized', 401);
    }
    const result = await authService.revokeAllTokens(req.user.id);

    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return ApiResponse.success(res, result);
  });

  /** GET /api/auth/me — Get current user */
  me = asyncHandler(async (req: Request, res: Response) => {
    return ApiResponse.success(res, req.user);
  });

  /** POST /api/auth/forgot-password */
  forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    return ApiResponse.success(res, result);
  });

  /** POST /api/auth/reset-password */
  resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, newPassword } = req.body;
    const result = await authService.resetPassword(token, newPassword);
    return ApiResponse.success(res, result);
  });

  /** GET /api/auth/google/callback — Google OAuth callback */
  googleCallback = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    if (!user) return ApiResponse.error(res, 'OAuth authentication failed', 401);

    const result = await authService.oauthLogin(user);

    res.cookie('access_token', result.accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refresh_token', result.refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

    return res.redirect(`${env.frontendUrl}/auth/callback?success=true`);
  });

  /** GET /api/auth/github/callback — GitHub OAuth callback */
  githubCallback = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user as any;
    if (!user) return ApiResponse.error(res, 'OAuth authentication failed', 401);

    const result = await authService.oauthLogin(user);

    res.cookie('access_token', result.accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('refresh_token', result.refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

    return res.redirect(`${env.frontendUrl}/auth/callback?success=true`);
  });
}

export const authController = new AuthController();
