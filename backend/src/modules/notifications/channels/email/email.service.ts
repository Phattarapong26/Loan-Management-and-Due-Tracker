import sgMail from '@sendgrid/mail';
import { env } from '@config/env.config';
import { logger } from '@utils/common/logger.util';

export interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

export class EmailService {
    constructor() {
        logger.info(`[Email Service] Initialized — SENDGRID_API_KEY=${env.SENDGRID_API_KEY ? 'SET' : 'NOT SET'} SENDGRID_FROM=${env.SENDGRID_FROM ?? 'NOT SET'}`);
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        if (!env.SENDGRID_API_KEY || !env.SENDGRID_FROM) {
            logger.warn(`[Email Service] SendGrid not configured — key=${JSON.stringify(env.SENDGRID_API_KEY)} from=${JSON.stringify(env.SENDGRID_FROM)}`);
            return false;
        }

        // Set API key on every call to ensure it's always fresh
        sgMail.setApiKey(env.SENDGRID_API_KEY);

        try {
            await sgMail.send({
                from: env.SENDGRID_FROM as string,
                to: options.to,
                subject: options.subject,
                text: options.text ?? '',
                html: options.html,
            } as any);

            logger.info({ to: options.to }, '✅ Email sent via SendGrid');
            return true;
        } catch (error: any) {
            logger.error(`❌ Failed to send email via SendGrid — ${error.message}`);
            return false;
        }
    }

    async sendTemporaryPassword(data: {
        to: string; firstName: string; lastName: string; email: string; temporaryPassword: string;
    }) {
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0F172A;">Welcome to SME Bank</h2>
                <p>Hello ${data.firstName} ${data.lastName},</p>
                <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #64748B;">Account Email: <strong>${data.email}</strong></p>
                    <p style="margin: 10px 0 0 0; color: #64748B;">Temporary Password: <strong style="font-size: 20px; color: #2563EB;">${data.temporaryPassword}</strong></p>
                </div>
                <p style="color: #64748B; font-size: 14px;">Please login and change your password immediately.</p>
            </div>`;
        return this.sendEmail({ to: data.to, subject: 'Account Created - SME Bank', html });
    }

    async sendPasswordReset(data: {
        to: string; firstName: string; lastName: string; temporaryPassword?: string;
    }) {
        const isTemporary = !!data.temporaryPassword;
        const contentHtml = isTemporary
            ? `<p>Your password has been reset.</p>
               <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
                   <p style="margin: 0; color: #64748B;">New Temporary Password: <strong style="font-size: 20px; color: #2563EB;">${data.temporaryPassword}</strong></p>
               </div>`
            : `<p>Your password has been successfully changed.</p>`;

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0F172A;">Password Reset - SME Bank</h2>
                <p>Hello ${data.firstName} ${data.lastName},</p>
                ${contentHtml}
            </div>`;
        return this.sendEmail({
            to: data.to,
            subject: isTemporary ? 'Password Reset - SME Bank' : 'Password Changed - SME Bank',
            html,
        });
    }

    async sendOTP(data: {
        to: string; firstName: string; lastName: string; otp: string; expiryMinutes?: number;
    }) {
        const expiry = data.expiryMinutes ?? 5;
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0F172A;">รหัส OTP - SME Bank</h2>
                <p>สวัสดีครับคุณ ${data.firstName} ${data.lastName},</p>
                <div style="background-color: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                    <p style="margin: 0; font-weight: bold; font-size: 36px; color: #2563EB; letter-spacing: 8px;">${data.otp}</p>
                </div>
                <p style="color: #64748B; font-size: 14px;">รหัสนี้จะหมดอายุใน ${expiry} นาที</p>
            </div>`;
        return this.sendEmail({ to: data.to, subject: 'รหัส OTP - SME Bank', html });
    }

    async sendForgotPasswordLink(data: {
        to: string; firstName: string; lastName: string; resetUrl: string;
    }) {
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #0F172A;">รีเซ็ตรหัสผ่าน - SME Bank</h2>
                <p>สวัสดีครับคุณ ${data.firstName} ${data.lastName},</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${data.resetUrl}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">ตั้งรหัสผ่านใหม่</a>
                </div>
                <p style="color: #64748B; font-size: 14px;">ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง</p>
            </div>`;
        return this.sendEmail({ to: data.to, subject: 'รีเซ็ตรหัสผ่าน - SME Bank', html });
    }
}
