import nodemailer from 'nodemailer';
import { env } from '../config/env.config';
import { logger } from '../config/logger.config';

/**
 * Reusable email transporter — created once, shared across all sends.
 */
const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

export class EmailService {
  /**
   * Send email verification link after registration.
   */
  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${env.frontendUrl}/auth/verify-email?token=${token}`;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #111; margin-bottom: 8px;">Welcome to Operis Market!</h2>
        <p style="color: #555; font-size: 15px;">Hi <strong>${name}</strong>,</p>
        <p style="color: #555; font-size: 15px;">Please verify your email address to get started.</p>
        <a href="${verifyUrl}"
           style="display: inline-block; padding: 12px 28px; margin: 20px 0;
                  background: #111; color: #fff; border-radius: 6px;
                  text-decoration: none; font-weight: 600; font-size: 14px;">
          Verify Email
        </a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">
          Or copy this link: <br/>
          <a href="${verifyUrl}" style="color: #555; word-break: break-all;">${verifyUrl}</a>
        </p>
        <p style="color: #aaa; font-size: 12px; margin-top: 32px;">
          This link expires in 24 hours. If you didn't create an account, ignore this email.
        </p>
      </div>
    `;

    await this.send(to, 'Verify your email — Operis Market', html);
    logger.info(`Verification email sent to ${to}`);
  }

  /**
   * Send password reset link.
   */
  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${env.frontendUrl}/auth/reset-password?token=${token}`;

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #111; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #555; font-size: 15px;">Hi <strong>${name}</strong>,</p>
        <p style="color: #555; font-size: 15px;">
          We received a request to reset your password. Click the button below to choose a new one.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; padding: 12px 28px; margin: 20px 0;
                  background: #111; color: #fff; border-radius: 6px;
                  text-decoration: none; font-weight: 600; font-size: 14px;">
          Reset Password
        </a>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">
          Or copy this link: <br/>
          <a href="${resetUrl}" style="color: #555; word-break: break-all;">${resetUrl}</a>
        </p>
        <p style="color: #aaa; font-size: 12px; margin-top: 32px;">
          This link expires in 1 hour. If you didn't request a password reset, ignore this email.
        </p>
      </div>
    `;

    await this.send(to, 'Reset your password — Operis Market', html);
    logger.info(`Password reset email sent to ${to}`);
  }

  /**
   * Low-level send helper. Logs errors but does not throw — email failures
   * should not block the main auth flow.
   */
  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await transporter.sendMail({
        from: `"Operis Market" <${env.smtp.from}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      logger.error(`Failed to send email to ${to}`, { error });
    }
  }
}

export const emailService = new EmailService();
