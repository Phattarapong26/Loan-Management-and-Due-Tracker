/**
 * PDF Generation Service
 * 
 * Generate PDF from invoice data using Puppeteer
 */

import puppeteer, { Browser } from 'puppeteer';
import { InvoiceData } from '@invoices/services/invoice.service';
import { logger } from '@utils/common/logger.util';
import { env } from '@config/env.config';
import path from 'path';
import fs from 'fs/promises';
import { resolvePdfLogoFilePath } from '@utils/common/public-assets.util';

export class PDFGenerationService {
    private static browserInstance: Browser | null = null;
    private static browserPromise: Promise<Browser> | null = null;

    /**
     * Get or create browser instance (singleton pattern for performance)
     */
    private static async getBrowser(): Promise<Browser> {
        if (this.browserInstance && this.browserInstance.isConnected()) {
            return this.browserInstance;
        }

        if (this.browserPromise) {
            return this.browserPromise;
        }

        this.browserPromise = puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
        });

        this.browserInstance = await this.browserPromise;
        this.browserPromise = null;

        return this.browserInstance;
    }

    /**
     * Generate PDF from invoice data
     */
    async generateInvoicePDF(invoiceData: InvoiceData, paymentScheduleId: string): Promise<string> {
        const startTime = Date.now();
        
        try {
            logger.info({ paymentScheduleId }, 'Starting PDF generation');

            // Create temp directory if not exists
            const tempDir = path.join(process.cwd(), 'uploads', 'invoices', 'temp');
            await fs.mkdir(tempDir, { recursive: true });

            // Generate filename
            const filename = `invoice-${paymentScheduleId}-${Date.now()}.pdf`;
            const pdfPath = path.join(tempDir, filename);

            // Get browser instance
            const browser = await PDFGenerationService.getBrowser();
            const page = await browser.newPage();

            try {
                // Set viewport for consistent rendering
                await page.setViewport({ width: 1200, height: 1600 });

                // Generate HTML
                const html = await this.generateInvoiceHTML(invoiceData);

                // Load HTML
                await page.setContent(html, {
                    waitUntil: 'networkidle0',
                    timeout: 30000,
                });

                // Generate PDF
                await page.pdf({
                    path: pdfPath,
                    format: 'A4',
                    printBackground: true,
                    margin: {
                        top: '10mm',
                        bottom: '10mm',
                        left: '10mm',
                        right: '10mm',
                    },
                });

                const duration = Date.now() - startTime;
                logger.info({ paymentScheduleId, duration, pdfPath }, 'PDF generated successfully');

                return pdfPath;
            } finally {
                await page.close();
            }
        } catch (error) {
            logger.error({ error, paymentScheduleId }, 'Error generating PDF');
            throw error;
        }
    }
    /**
     * Save invoice PDF and return public URL
     */
    async saveInvoicePDF(pdfPath: string, filename: string): Promise<string> {
        try {
            // Read the PDF file
            const pdfBuffer = await fs.readFile(pdfPath);

            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
            await fs.mkdir(uploadsDir, { recursive: true });

            // Save file to permanent location
            const permanentPath = path.join(uploadsDir, filename);
            await fs.writeFile(permanentPath, pdfBuffer);

            const baseUrl = (env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const pdfUrl = `${baseUrl}/uploads/invoices/${filename}`;

            logger.info({ filename, pdfUrl }, 'Invoice PDF saved successfully');
            return pdfUrl;
        } catch (error) {
            logger.error({ error, filename }, 'Error saving invoice PDF');
            throw error;
        }
    }


    /**
     * Generate HTML for invoice
     */
    private async generateInvoiceHTML(data: InvoiceData): Promise<string> {
        const { filePath: logoPath, tried } = await resolvePdfLogoFilePath({
            callerFileUrl: import.meta.url,
        });

        if (!logoPath) {
            throw new Error(
                `Logo file not found. Set PDF_LOGO_PATH to override. Tried: ${tried.join(', ')}`
            );
        }

        const logoBuffer = await fs.readFile(logoPath);
        if (!logoBuffer || logoBuffer.length === 0) {
            throw new Error(`Logo file is empty: ${logoPath}`);
        }

        const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

        const statusColor = data.payment?.status === 'PAID' ? '#00AA5B' : '#FFA500';
        const statusText = data.payment?.status === 'PAID' ? 'ชำระแล้ว' : 'รอชำระ';

        return `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ใบแจ้งหนี้ - ${data.accountNo}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Sarabun', 'Tahoma', sans-serif; 
            color: #333; 
            line-height: 1.6;
            padding: 20px;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #00AA5B;
        }
        .logo-section { display: flex; align-items: center; gap: 15px; }
        .logo { display: block; height: 60px; width: auto; max-width: 260px; object-fit: contain; }
        .bank-name { 
            font-size: 24px; 
            font-weight: bold; 
            color: #00AA5B; 
        }
        .bank-subtitle { 
            font-size: 9px; 
            color: #666; 
            max-width: 200px;
        }
        .invoice-info { text-align: right; }
        .invoice-title { 
            font-size: 28px; 
            font-weight: bold; 
            margin-bottom: 10px;
        }
        .account-no { 
            font-size: 18px; 
            color: #00AA5B; 
            font-weight: bold;
            letter-spacing: 2px;
        }
        .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr 1fr; 
            gap: 15px;
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .info-item label { 
            display: block; 
            font-size: 10px; 
            color: #666; 
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .info-item value { 
            display: block; 
            font-size: 14px; 
            font-weight: bold;
        }
        .content-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 30px;
            margin-bottom: 30px;
        }
        .section-title { 
            font-size: 12px; 
            color: #00AA5B; 
            font-weight: bold;
            margin-bottom: 15px;
            text-transform: uppercase;
        }
        .customer-info p { 
            margin-bottom: 5px; 
            font-size: 13px;
        }
        .breakdown { 
            background: #f9fafb; 
            padding: 20px; 
            border-radius: 8px;
        }
        .breakdown-item { 
            display: flex; 
            justify-content: space-between;
            padding: 8px 0;
            font-size: 13px;
        }
        .breakdown-item.total { 
            border-top: 2px solid #00AA5B;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 16px;
            font-weight: bold;
        }
        .breakdown-item .amount { 
            color: #00AA5B; 
            font-weight: bold;
        }
        .breakdown-item.total .amount { 
            font-size: 20px;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            background: ${statusColor};
            color: white;
        }
        .footer { 
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 10px;
            color: #666;
        }
        .qr-section {
            text-align: center;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            margin: 20px 0;
        }
        .qr-placeholder {
            width: 150px;
            height: 150px;
            margin: 0 auto 10px;
            border: 2px dashed #00AA5B;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00AA5B;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-section">
                <img src="${logoBase64}" class="logo" alt="SME-D-Bank-Logo">
                <div>
                    <div class="bank-name">SME D BANK</div>
                    <div class="bank-subtitle">ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อม</div>
                </div>
            </div>
            <div class="invoice-info">
                <div class="invoice-title">ใบแจ้งยอดชำระค่างวด</div>
                <div class="account-no">${data.accountNo}</div>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-item">
                <label>วันที่ออกเอกสาร</label>
                <value>${data.billingDate}</value>
            </div>
            <div class="info-item">
                <label>กำหนดชำระภายใน</label>
                <value style="color: #00AA5B;">${data.dueDate}</value>
            </div>
            <div class="info-item">
                <label>งวดที่</label>
                <value>${data.installmentNo}/${data.totalInstallments}</value>
            </div>
        </div>

        <div class="content-grid">
            <div>
                <div class="section-title">ข้อมูลผู้กู้</div>
                <div class="customer-info">
                    <p><strong>${data.customer.name}</strong></p>
                    <p>${data.customer.address}</p>
                    <p>${data.customer.city}</p>
                    <p>โทร: ${data.customer.phone}</p>
                    ${data.customer.email ? `<p>อีเมล: ${data.customer.email}</p>` : ''}
                </div>
            </div>

            <div>
                <div class="section-title">รายละเอียดการชำระ</div>
                <div class="breakdown">
                    <div class="breakdown-item">
                        <span>เงินต้น</span>
                        <span class="amount">฿${data.breakdown.principal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="breakdown-item">
                        <span>ดอกเบี้ย (${data.summary.interestRate})</span>
                        <span class="amount">฿${data.breakdown.interest.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    ${data.breakdown.fees > 0 ? `
                    <div class="breakdown-item">
                        <span>ค่าธรรมเนียม</span>
                        <span class="amount">฿${data.breakdown.fees.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    ` : ''}
                    <div class="breakdown-item total">
                        <span>ยอดชำระสุทธิ</span>
                        <span class="amount">฿${data.breakdown.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
                
                <div style="margin-top: 15px;">
                    <span class="status-badge">${statusText}</span>
                </div>
            </div>
        </div>

        <div class="qr-section">
            <div class="qr-placeholder">QR Code<br/>สำหรับชำระเงิน</div>
            <p style="font-size: 11px; color: #666;">สแกน QR Code เพื่อชำระผ่าน Mobile Banking</p>
        </div>

        <div class="footer">
            <p><strong>ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย</strong></p>
            <p>อาคาร SME Bank Tower 310 ถนนพหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ 10400</p>
            <p style="margin-top: 10px;">พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Cleanup old PDF files
     */
    static async cleanupOldFiles(olderThanHours: number = 1): Promise<void> {
        try {
            const tempDir = path.join(process.cwd(), 'uploads', 'invoices', 'temp');
            const files = await fs.readdir(tempDir);
            const now = Date.now();
            const maxAge = olderThanHours * 60 * 60 * 1000;

            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);
                const age = now - stats.mtimeMs;

                if (age > maxAge) {
                    await fs.unlink(filePath);
                    logger.info({ file, age }, 'Cleaned up old PDF file');
                }
            }
        } catch (error) {
            logger.error({ error }, 'Error cleaning up old PDF files');
        }
    }

    /**
     * Close browser instance (for graceful shutdown)
     */
    static async closeBrowser(): Promise<void> {
        if (this.browserInstance) {
            await this.browserInstance.close();
            this.browserInstance = null;
        }
    }
}
