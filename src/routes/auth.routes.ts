import { Router } from 'express';
import passport from 'passport';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authRateLimit, loginRateLimit } from '../middlewares/rate-limit.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { RegisterDto, LoginDto, VerifyEmailDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto, DeleteAccountDto } from '../dtos/auth.dto';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     description: |
 *       Creates a new user account. Sends verification email.
 *       Rate limited: 10 requests per 15 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Created }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     name: { type: string, example: 'Huy Nguyen' }
 *                     email: { type: string, format: email }
 *                     message: { type: string, example: 'Registration successful. Please verify your email.' }
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email already registered
 *       429:
 *         description: Too many auth attempts
 */
router.post('/register', authRateLimit, validateBody(RegisterDto), authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email & password
 *     tags: [Auth]
 *     description: |
 *       Authenticates user and sets httpOnly cookies (access_token, refresh_token).
 *       Rate limited: 10 requests per 15 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful. Cookies set automatically.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *               example: access_token=eyJ...; HttpOnly; Secure; SameSite=Strict; Path=/
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Login successful' }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Invalid email or password
 *       403:
 *         description: Email not verified
 *       429:
 *         description: Too many auth attempts
 */
router.post('/login', loginRateLimit, validateBody(LoginDto), authController.login);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify email address
 *     tags: [Auth]
 *     description: Verifies user email using the token sent during registration.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyEmailRequest'
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid verification token
 */
router.post('/verify-email', validateBody(VerifyEmailDto), authController.verifyEmail);
router.post('/resend-verification', authRateLimit, authController.resendVerification);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     description: |
 *       Uses the refresh_token cookie to issue a new access_token.
 *       Implements token rotation — old refresh token is invalidated.
 *       If a previously-used refresh token is resubmitted, the entire token family is revoked (theft detection).
 *     responses:
 *       200:
 *         description: Token refreshed. New cookies set.
 *       401:
 *         description: Invalid or expired refresh token / Token reuse detected
 */
router.post('/refresh', authController.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout current session
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     description: Revokes the current refresh token family and clears cookies.
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /auth/revoke-all:
 *   post:
 *     summary: Revoke all sessions
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     description: Revokes ALL refresh tokens for the authenticated user across all devices.
 *     responses:
 *       200:
 *         description: All sessions revoked
 *       401:
 *         description: Not authenticated
 */
router.post('/revoke-all', authenticate, authController.revokeAll);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user info
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     description: Returns the authenticated user's basic info from the JWT token.
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     email: { type: string, format: email }
 *                     role: { type: string, enum: [admin, developer, viewer] }
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticate, authController.me);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Auth]
 *     description: |
 *       Sends a password reset link to the provided email address.
 *       Always returns success to prevent email enumeration.
 *       Rate limited: 10 requests per 15 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Always returns success (prevents email enumeration)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     message: { type: string, example: 'If an account exists, a reset email has been sent.' }
 *       429:
 *         description: Too many auth attempts
 */
router.post('/forgot-password', authRateLimit, validateBody(ForgotPasswordDto), authController.forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Auth]
 *     description: |
 *       Resets the user's password using the token from the reset email.
 *       Token is valid for 1 hour. All existing sessions are revoked on success.
 *       Rate limited: 10 requests per 15 minutes.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Reset token received via email
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 example: newSecurePass123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: object
 *                   properties:
 *                     message: { type: string, example: 'Password reset successfully. Please login with your new password.' }
 *       400:
 *         description: Invalid or expired reset token
 *       429:
 *         description: Too many auth attempts
 */
router.post('/reset-password', authRateLimit, validateBody(ResetPasswordDto), authController.resetPassword);

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Change password (authenticated)
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Changes the user's password. Requires current password.
 *       All sessions are revoked on success — user must re-login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Current password is incorrect
 *       401:
 *         description: Not authenticated
 */
router.put('/change-password', authenticate, authRateLimit, validateBody(ChangePasswordDto), authController.changePassword);

/**
 * @swagger
 * /auth/delete-account:
 *   delete:
 *     summary: Delete user account
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     description: |
 *       Permanently deletes the authenticated user's account and all related data.
 *       Password users must provide their current password for confirmation.
 *       OAuth-only users can delete without password.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: Required for password users, optional for OAuth-only
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       400:
 *         description: Password incorrect or missing
 *       401:
 *         description: Not authenticated
 */
router.delete('/delete-account', authenticate, validateBody(DeleteAccountDto), authController.deleteAccount);

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Auth - OAuth]
 *     description: Redirects to Google's OAuth consent screen.
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth
 */
router.get('/google', passport.authenticate('google', { session: false, scope: ['profile', 'email'] }));

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth - OAuth]
 *     description: |
 *       Handles Google OAuth callback. Sets httpOnly cookies and redirects to frontend.
 *       On success redirects to: {frontendUrl}/auth/callback?success=true
 *     responses:
 *       302:
 *         description: Redirect to frontend with session cookies set
 *       401:
 *         description: Google authentication failed
 */
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/api/auth/google/failed' }),
  authController.googleCallback,
);
router.get('/google/failed', (_req, res) => res.status(401).json({ success: false, message: 'Google authentication failed' }));

/**
 * @swagger
 * /auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth login
 *     tags: [Auth - OAuth]
 *     description: Redirects to GitHub's OAuth consent screen.
 *     responses:
 *       302:
 *         description: Redirect to GitHub OAuth
 */
router.get('/github', passport.authenticate('github', { session: false, scope: ['user:email'] }));

/**
 * @swagger
 * /auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     tags: [Auth - OAuth]
 *     description: |
 *       Handles GitHub OAuth callback. Sets httpOnly cookies and redirects to frontend.
 *       On success redirects to: {frontendUrl}/auth/callback?success=true
 *     responses:
 *       302:
 *         description: Redirect to frontend with session cookies set
 *       401:
 *         description: GitHub authentication failed
 */
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/api/auth/github/failed' }),
  authController.githubCallback,
);
router.get('/github/failed', (_req, res) => res.status(401).json({ success: false, message: 'GitHub authentication failed' }));

export default router;
