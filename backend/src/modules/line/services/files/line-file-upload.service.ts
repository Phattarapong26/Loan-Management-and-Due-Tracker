/**
 * LINE File Upload Service
 * 
 * Purpose: Upload and send PDF files to LINE users
 * Features:
 * - Upload PDF to public storage
 * - Send file message via LINE Messaging API
 * - Handle LINE file size limits (10 MB)
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { env } from '@config/env.config';
import { logger } from '@utils/common/logger.util';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';

export class LineFileUploadService {
    private accessToken: string;
    private baseUrl: string;

    constructor() {
        this.accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
        this.baseUrl = (env.BACKEND_URL || '').replace(/\/+$/, '');
    }

    /**
     * Get the current base URL (now hardcoded)
     */
    private async getBaseUrl(): Promise<string> {
        if (this.baseUrl) return this.baseUrl;
        return 'http://localhost:3000';
    }

    /**
     * Send PDF file to LINE user
     * 
     * @param lineUserId - LINE User ID
     * @param pdfPath - Local path to PDF file
     * @param filename - Display filename
     * @returns Success status
     */
    async sendPDFToUser(lineUserId: string, pdfPath: string, filename: string): Promise<boolean> {
        try {
            logger.info({ lineUserId, pdfPath, filename }, 'Sending PDF to LINE user');

            // Check file size (LINE limit: 10 MB)
            const stats = await fs.stat(pdfPath);
            const fileSizeMB = stats.size / (1024 * 1024);
            
            if (fileSizeMB > 10) {
                logger.error({ fileSizeMB }, 'PDF file exceeds LINE size limit (10 MB)');
                throw new Error('PDF file too large for LINE (max 10 MB)');
            }

            // Copy file to public directory
            const publicFilename = `${Date.now()}-${filename}`;
            const publicDir = path.join(process.cwd(), 'uploads', 'invoices', 'public');
            await fs.mkdir(publicDir, { recursive: true });
            
            const publicPath = path.join(publicDir, publicFilename);
            await fs.copyFile(pdfPath, publicPath);

            // Generate public URL
            const baseUrl = await this.getBaseUrl();
            const publicUrl = `${baseUrl}/api/invoices/pdf/${publicFilename}`;

            logger.info({ publicUrl, fileSizeMB }, 'PDF copied to public directory');

            // Send via LINE Push Message API - only send the download link
            await axios.post(
                `${LINE_MESSAGING_API}/message/push`,
                {
                    to: lineUserId,
                    messages: [
                        {
                            type: 'text',
                            text: `✅ ใบแจ้งหนี้ของคุณพร้อมแล้ว!\n\n📥 ดาวน์โหลด: ${publicUrl}\n\n💡 คลิกลิงก์เพื่อดูและบันทึกไฟล์`,
                        },
                    ],
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            logger.info({ lineUserId, publicUrl }, 'PDF sent successfully to LINE user');
            return true;
        } catch (error) {
            logger.error({ error, lineUserId, pdfPath }, 'Error sending PDF to LINE user');
            throw error;
        }
    }

    /**
     * Send loading message to user
     */
    async sendLoadingMessage(lineUserId: string): Promise<void> {
        try {
            await axios.post(
                `${LINE_MESSAGING_API}/message/push`,
                {
                    to: lineUserId,
                    messages: [
                        {
                            type: 'text',
                            text: '⏳ กำลังสร้างใบแจ้งหนี้ PDF...\n\nกรุณารอสักครู่',
                        },
                    ],
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
        } catch (error) {
            logger.error({ error, lineUserId }, 'Error sending loading message');
        }
    }

    /**
     * Send error message to user
     */
    async sendErrorMessage(lineUserId: string, errorMessage?: string): Promise<void> {
        try {
            await axios.post(
                `${LINE_MESSAGING_API}/message/push`,
                {
                    to: lineUserId,
                    messages: [
                        {
                            type: 'text',
                            text: errorMessage || '❌ เกิดข้อผิดพลาดในการสร้าง PDF\n\nกรุณาลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่',
                        },
                    ],
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
        } catch (error) {
            logger.error({ error, lineUserId }, 'Error sending error message');
        }
    }

    /**
     * Cleanup old public PDF files
     */
    static async cleanupPublicFiles(olderThanHours: number = 24): Promise<void> {
        try {
            const publicDir = path.join(process.cwd(), 'uploads', 'invoices', 'public');
            const files = await fs.readdir(publicDir);
            const now = Date.now();
            const maxAge = olderThanHours * 60 * 60 * 1000;

            for (const file of files) {
                const filePath = path.join(publicDir, file);
                const stats = await fs.stat(filePath);
                const age = now - stats.mtimeMs;

                if (age > maxAge) {
                    await fs.unlink(filePath);
                    logger.info({ file, age }, 'Cleaned up old public PDF file');
                }
            }
        } catch (error) {
            logger.error({ error }, 'Error cleaning up public PDF files');
        }
    }
}
