import nodemailer from 'nodemailer';
import { env } from '@config/env.config';
import { logger } from '@utils/common/logger.util';
import { resolve4 } from 'dns/promises';

export interface EmailOptions {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

/**
 * Resolve SMTP hostname to IPv4 explicitly.
 * Railway containers may resolve to IPv6 which is unreachable.
 */
async function resolveIPv4(hostname: string): Promise<string> {
    try {
        const addresses = await resolve4(hostname);
        if (addresses.length > 0) {
            logger.info(`[Email] DNS resolved ${hostname} → ${addresses[0]} (IPv4)`);
            return addresses[0];
        }
    } catch (err: any) {
        logger.warn(`[Email] DNS resolve4 failed for ${hostname}: ${err.message}`);
    }
    return hostname;
}

export class EmailService {
    constructor() {
        logger.info(`[Email Service] Initialized — host=${env.SMTP_HOST} port=${env.SMTP_PORT} user=${env.SMTP_USER ?? '(not set)'}`);
    }

    async sendEmail(options: EmailOptions): Promise<boolean> {
        if (!env.SMTP_USER || !env.SMTP_PASS) {
            logger.warn('[Email Service] SMTP credentials not configured — email skipped');
            return false;
        }

        try {
            // Resolve to IPv4 to bypass Railway IPv6 routing issue
            const smtpIp = await resolveIPv4(env.SMTP_HOST);

            const transporter = nodemailer.createTransport({
                host: smtpIp,
                port: env.SMTP_PORT,
                secure: env.SMTP_PORT === 465, // true only for port 465, false for 587 (STARTTLS)
                auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
                connectionTimeout: 30000,
                socketTimeout: 30000,
                tls: {
                    servername: env.SMTP_HOST, // SNI must use original hostname for TLS cert
                    rejectUnauthorized: false,
                },
            } as any);

            logger.info({ to: options.to, smtpIp, port: env.SMTP_PORT }, '[Email Service] Sending...');

            const info = await transporter.sendMail({
                from: env.SMTP_FROM || env.SMTP_USER,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
            });

            logger.info({ messageId: info.messageId, to: options.to }, '✅ Email sent');
            return true;
        } catch (error: any) {
            logger.error(`❌ Failed to send email — ${error.message} | Code: ${error.code}`);
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
