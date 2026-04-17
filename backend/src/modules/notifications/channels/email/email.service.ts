import nodemailer from 'nodemailer';
import { env } from '@config/env.config';
import { logger } from '@utils/common/logger.util';

export interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

export class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        // Initialize Nodemailer with Gmail
        logger.info('[Email Service] Initializing Nodemailer with Gmail...');
        logger.info(`[Email Service] SMTP_HOST: ${env.SMTP_HOST}`);
        logger.info(`[Email Service] SMTP_PORT: ${env.SMTP_PORT}`);
        logger.info(`[Email Service] SMTP_USER: ${env.SMTP_USER ?? '(not set)'}`);
        logger.info(`[Email Service] SMTP_PASS exists: ${!!env.SMTP_PASS}`);

        if (!env.SMTP_USER || !env.SMTP_PASS) {
            logger.error('[Email Service] ❌ SMTP credentials not configured');
            return;
        }

        try {
            this.transporter = nodemailer.createTransport({
                host: env.SMTP_HOST,       // smtp.gmail.com
                port: env.SMTP_PORT,       // 587
                secure: env.SMTP_PORT === 465, // true only for port 465 (SSL); false uses STARTTLS on 587
                family: 4,                 // Force IPv4 — prevents ENETUNREACH on IPv6-only hosts
                auth: {
                    user: env.SMTP_USER,   // Gmail address
                    pass: env.SMTP_PASS,   // Gmail App Password
                },
                connectionTimeout: 10000,  // 10 s — fail fast instead of hanging 2 min
                socketTimeout: 10000,      // 10 s — abort stalled socket reads/writes
            });

            logger.info(
                `[Email Service] ✅ Nodemailer initialized — host: ${env.SMTP_HOST}, port: ${env.SMTP_PORT}, user: ${env.SMTP_USER}`,
            );
        } catch (error: any) {
            logger.error({ error: error.message }, '[Email Service] Failed to initialize Nodemailer');
        }
    }

    /**
     * Verify the SMTP connection and credentials.
     * Logs success or a detailed failure reason so SMTP issues are immediately visible.
     */
    async verifyConnection(): Promise<boolean> {
        if (!this.transporter) {
            logger.error('[Email Service] verifyConnection: transporter not initialised');
            return false;
        }

        try {
            await this.transporter.verify();
            logger.info(
                `[Email Service] ✅ SMTP connection verified — host: ${env.SMTP_HOST}, port: ${env.SMTP_PORT}, user: ${env.SMTP_USER}`,
            );
            return true;
        } catch (error: any) {
            const errorDetails = `SMTP Error: ${error.message} | Code: ${error.code} | Response: ${error.response} | ResponseCode: ${error.responseCode}`;
            logger.error(`[Email Service] ❌ SMTP connection verification failed — ${errorDetails}`);
            return false;
        }
    }

    /**
     * Send email using Nodemailer with Gmail
     */
    async sendEmail(options: EmailOptions): Promise<boolean> {
        try {
            if (!this.transporter) {
                logger.error('[Email Service] Nodemailer not initialized');
                return false;
            }

            if (!env.SMTP_USER || !env.SMTP_PASS) {
                logger.error('[Email Service] SMTP credentials not configured');
                return false;
            }

            logger.info(
                {
                    to: options.to,
                    smtpHost: env.SMTP_HOST,
                    smtpPort: env.SMTP_PORT,
                    smtpUser: env.SMTP_USER,
                },
                '[Email Service] Sending email via Gmail...',
            );

            const info = await this.transporter.sendMail({
                from: env.SMTP_FROM || env.SMTP_USER,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
            });

            logger.info({ messageId: info.messageId, to: options.to }, '✅ Email sent successfully via Gmail');
            return true;
        } catch (error: any) {
            const errorDetails = `SMTP Error: ${error.message} | Code: ${error.code} | Response: ${error.response} | ResponseCode: ${error.responseCode}`;
            logger.error(`❌ Failed to send email via Gmail — ${errorDetails}`);
            return false;
        }
    }

    /**
     * Send welcome email with temporary password
     */
    async sendTemporaryPassword(data: {
        to: string;
        firstName: string;
        lastName: string;
        email: string;
        temporaryPassword: string;
    }) {
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0F172A;">Welcome to SME Bank</h2>
                <p>Hello ${data.firstName} ${data.lastName},</p>
                <p>Your account has been created on the SME Bank lending platform.</p>
                <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #64748B;">Account Email:</p>
                    <p style="margin: 5px 0 15px 0; font-weight: bold; font-size: 16px;">${data.email}</p>
                    <p style="margin: 0; color: #64748B;">Temporary Password:</p>
                    <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 24px; color: #2563EB; letter-spacing: 2px;">${data.temporaryPassword}</p>
                </div>
                <p style="color: #64748B; font-size: 14px;">Please login and change your password immediately for security reasons.</p>
                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #94A3B8;">&copy; 2026 SME Bank. All rights reserved.</p>
                </div>
            </div>
        `;

        return this.sendEmail({
            to: data.to,
            subject: 'Account Created - SME Bank',
            html,
        });
    }

    /**
     * Send password reset notification
     */
    async sendPasswordReset(data: {
        to: string;
        firstName: string;
        lastName: string;
        temporaryPassword?: string;
    }) {
        const isTemporary = !!data.temporaryPassword;

        let contentHtml = '';
        if (isTemporary) {
            contentHtml = `
                <p>Your password has been reset by an administrator.</p>
                <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #64748B;">New Temporary Password:</p>
                    <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 24px; color: #2563EB; letter-spacing: 2px;">${data.temporaryPassword}</p>
                </div>
                <p style="color: #64748B; font-size: 14px;">Please login and change your password immediately.</p>
            `;
        } else {
            contentHtml = `
                <p>Your password has been successfully changed.</p>
                <p>If you did not perform this action, please contact support immediately.</p>
            `;
        }

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0F172A;">Password Reset - SME Bank</h2>
                <p>Hello ${data.firstName} ${data.lastName},</p>
                ${contentHtml}
                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #94A3B8;">&copy; 2026 SME Bank. All rights reserved.</p>
                </div>
            </div>
        `;

        return this.sendEmail({
            to: data.to,
            subject: isTemporary ? 'Password Reset - SME Bank' : 'Password Changed - SME Bank',
            html,
        });
    }

    /**
     * Send forgot password link
     */
    async sendForgotPasswordLink(data: {
        to: string;
        firstName: string;
        lastName: string;
        resetUrl: string;
    }) {
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0F172A;">รีเซ็ตรหัสผ่าน - SME Bank</h2>
                <p>สวัสดีครับคุณ ${data.firstName} ${data.lastName},</p>
                <p>เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ โปรดคลิกที่ปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${data.resetUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">ตั้งรหัสผ่านใหม่</a>
                </div>
                <p style="color: #64748B; font-size: 14px;">ลิงก์นี้จะมีอายุการใช้งาน 1 ชั่วโมง หากคุณไม่ได้ร้องขอโปรดเพิกเฉยต่ออีเมลฉบับนี้</p>
                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #94A3B8;">&copy; 2026 SME Bank. All rights reserved.</p>
                </div>
            </div>
        `;

        return this.sendEmail({
            to: data.to,
            subject: 'รีเซ็ตรหัสผ่าน - SME Bank',
            html,
        });
    }
}
