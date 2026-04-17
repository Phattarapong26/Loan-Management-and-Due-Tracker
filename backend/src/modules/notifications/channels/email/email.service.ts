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
        // Debug: Check environment variables
        logger.info('[Email Service] Initializing...');
        logger.info(`[Email Service] RESEND_API_KEY exists: ${!!env.RESEND_API_KEY}`);
        logger.info(`[Email Service] SMTP_USER exists: ${!!env.SMTP_USER}`);
        
        // Only initialize SMTP as fallback (Resend will be created on-demand)
        if (!env.RESEND_API_KEY) {
            logger.warn('[Email Service] ⚠️  RESEND_API_KEY not found, initializing SMTP fallback');
            
            const smtpHost = env.SMTP_HOST === 'smtp.gmail.com' ? '74.125.200.108' : env.SMTP_HOST;
            
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: env.SMTP_PORT,
                secure: env.SMTP_PORT === 465,
                auth: {
                    user: env.SMTP_USER,
                    pass: env.SMTP_PASS,
                },
                tls: {
                    rejectUnauthorized: false,
                },
            });
        } else {
            logger.info('[Email Service] ✅ RESEND_API_KEY found, will use Resend API');
        }
    }

    /**
     * Send email
     */
    async sendEmail(options: EmailOptions): Promise<boolean> {
        try {
            // Check if Resend API key is available (preferred for Railway)
            if (env.RESEND_API_KEY) {
                logger.info({ to: options.to }, '[Email Service] Using Resend API');
                const { Resend } = await import('resend');
                const resend = new Resend(env.RESEND_API_KEY);
                
                const result = await resend.emails.send({
                    from: env.SMTP_FROM,
                    to: options.to,
                    subject: options.subject,
                    html: options.html || options.text || '',
                });

                if (result.error) {
                    logger.error({ error: result.error, to: options.to }, 'Failed to send email via Resend');
                    return false;
                }

                logger.info({ id: result.data?.id, to: options.to }, '✅ Email sent successfully via Resend');
                return true;
            }

            // Fallback to SMTP (for local development)
            logger.warn({ to: options.to }, '[Email Service] RESEND_API_KEY not found, using SMTP');
            if (!this.transporter) {
                logger.error('[Email Service] No email service configured');
                return false;
            }

            if (!env.SMTP_USER || !env.SMTP_PASS) {
                logger.warn('[Email Service] SMTP credentials not configured');
                return false;
            }

            const info = await this.transporter.sendMail({
                from: env.SMTP_FROM,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
            });

            logger.info({ messageId: info.messageId, to: options.to }, '✅ Email sent successfully via SMTP');
            return true;
        } catch (error: any) {
            logger.error({ error: error.message, to: options.to }, 'Failed to send email');
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
     * Send OTP for LINE account linking
     */
    async sendOTP(data: {
        to: string;
        firstName: string;
        lastName: string;
        otp: string;
        expiryMinutes?: number;
    }) {
        const expiry = data.expiryMinutes ?? 5;
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0F172A;">รหัส OTP สำหรับเชื่อมต่อ LINE - SME Bank</h2>
                <p>สวัสดีครับคุณ ${data.firstName} ${data.lastName},</p>
                <p>รหัส OTP สำหรับยืนยันการเชื่อมต่อบัญชี LINE ของคุณคือ:</p>
                <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0; font-weight: bold; font-size: 36px; color: #2563EB; letter-spacing: 8px;">${data.otp}</p>
                </div>
                <p style="color: #64748B; font-size: 14px;">รหัสนี้จะหมดอายุใน ${expiry} นาที กรุณาอย่าแชร์รหัสนี้กับผู้อื่น</p>
                <p style="color: #64748B; font-size: 14px;">หากคุณไม่ได้ร้องขอ โปรดเพิกเฉยต่ออีเมลฉบับนี้</p>
                <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                    <p style="margin: 0; font-size: 12px; color: #94A3B8;">&copy; 2026 SME Bank. All rights reserved.</p>
                </div>
            </div>
        `;

        return this.sendEmail({
            to: data.to,
            subject: 'รหัส OTP เชื่อมต่อ LINE - SME Bank',
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
