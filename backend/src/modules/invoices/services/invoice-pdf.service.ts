import puppeteer, { Browser } from 'puppeteer';
import { logger } from '@utils/common/logger.util';
import { resolvePdfLogoFilePath } from '@utils/common/public-assets.util';
import { PDFCacheService } from './pdf-cache.service';
import { env } from '@config/env.config';

export interface InvoicePDFData {
    accountNo: string;
    loanType: string;
    installmentNo: number;
    totalInstallments: number;
    billingDate: string;
    dueDate: string;
    customer: {
        name: string;
        address: string;
        city: string;
        email: string;
        phone: string;
    };
    breakdown: {
        principal: number;
        interest: number;
        fees: number;
        total: number;
    };
    summary: {
        remainingBalance: number;
        interestRate: string;
        paidInstallments: number;
        overdueAmount: number;
    };
    loan: {
        id: string;
        startDate: string;
        maturityDate: string;
        monthlyPayment: number;
    };
    payment?: {
        status: string;
        paidAt?: string;
        paidAmount?: number;
    };
}

export class InvoicePDFService {
    private static browserInstance: Browser | null = null;
    private static browserPromise: Promise<Browser> | null = null;
    private static logoCache: string | null = null;

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
     * Get cached logo or load it once
     */
    private static async getCachedLogo(): Promise<string> {
        if (this.logoCache) {
            return this.logoCache;
        }

        const fs = await import('fs/promises');
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
            throw new Error('Logo file is empty');
        }

        this.logoCache = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        logger.info({ logoPath }, 'Logo cached successfully');
        
        return this.logoCache;
    }
    /**
     * Generate Invoice PDF using Puppeteer (Optimized with Cache)
     */
    async generateInvoicePDF(data: InvoicePDFData): Promise<Buffer> {
        const startTime = Date.now();
        
        // Generate cache key
        const cacheKey = PDFCacheService.generateCacheKey(data);
        
        // Check cache first
        const cachedPDF = PDFCacheService.getCachedPDF(cacheKey);
        if (cachedPDF) {
            const duration = Date.now() - startTime;
            logger.info({ duration, cached: true }, 'PDF returned from cache');
            return cachedPDF;
        }
        
        console.log('🔍 Invoice PDF generation data:', {
            billingDate: data.billingDate,
            dueDate: data.dueDate,
            installmentNo: data.installmentNo,
            totalInstallments: data.totalInstallments,
            accountNo: data.accountNo,
            customerName: data.customer?.name,
            loanType: data.loanType,
        });

        // ตรวจสอบข้อมูลที่จำเป็น
        if (!data.billingDate) {
            console.warn('⚠️ billingDate is missing, using current date');
        }
        if (!data.dueDate) {
            console.warn('⚠️ dueDate is missing, using current date');
        }
        if (!data.installmentNo) {
            console.warn('⚠️ installmentNo is missing, using 1');
        }

        try {
            // Get browser instance (reused)
            const browser = await InvoicePDFService.getBrowser();
            const page = await browser.newPage();

            try {
                // Set viewport for consistent rendering
                await page.setViewport({ width: 1200, height: 1600 });
                
                const html = await this.generateHTML(data);
                
                await page.setContent(html, { 
                    waitUntil: 'networkidle0',
                    timeout: 30000,
                });
                
                const pdf = await page.pdf({
                    format: 'A4',
                    printBackground: true,
                    margin: {
                        top: '15mm',
                        right: '15mm',
                        bottom: '15mm',
                        left: '15mm',
                    },
                });

                const buffer = Buffer.from(pdf);
                
                // Cache the generated PDF
                PDFCacheService.cachePDF(cacheKey, buffer);

                const duration = Date.now() - startTime;
                logger.info({ duration, cached: false }, 'PDF generated and cached successfully');

                return buffer;
            } finally {
                await page.close();
            }
        } catch (error) {
            logger.error({ error }, 'Error generating invoice PDF with Puppeteer');
            throw error;
        }
    }

    /**
     * Generate HTML for Invoice PDF (Optimized)
     */
    private async generateHTML(data: InvoicePDFData): Promise<string> {
        // Use cached logo
        const logoBase64 = await InvoicePDFService.getCachedLogo();

        return `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ใบแจ้งยอดชำระค่างวด</title>
    <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Sarabun', sans-serif;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        .container {
            padding: 30px;
            max-width: 800px;
            margin: 0 auto;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #00A950;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .logo {
            display: flex;
            align-items: center;
        }
        
        .logo img {
            height: 60px;
            width: auto;
            max-width: 260px;
            object-fit: contain;
            display: block;
        }
        
        .document-title {
            font-size: 28px;
            font-weight: 900;
            color: #333;
            margin-top: 15px;
        }
        
        .loan-type {
            font-size: 16px;
            color: #666;
            font-weight: 500;
        }
        
        .invoice-info {
            text-align: right;
        }
        
        .invoice-label {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #999;
            margin-bottom: 10px;
        }
        
        .account-label {
            font-size: 12px;
            color: #666;
            font-weight: 500;
        }
        
        .account-no {
            font-size: 18px;
            font-weight: 700;
            color: #00A950;
            letter-spacing: 1px;
        }
        
        .summary-bar {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            padding: 20px;
            background: #F9FAFB;
            border-radius: 10px;
            margin-bottom: 30px;
            border: 1px solid #E5E7EB;
        }
        
        .summary-item {
            text-align: center;
        }
        
        .summary-label {
            font-size: 9px;
            color: #999;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 5px;
        }
        
        .summary-value {
            font-size: 13px;
            font-weight: 700;
            color: #333;
        }
        
        .summary-value.highlight {
            color: #00A950;
        }
        
        .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 11px;
            font-weight: 700;
            color: #00A950;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 15px;
        }
        
        .customer-name {
            font-size: 16px;
            font-weight: 700;
            color: #333;
            margin-bottom: 8px;
        }
        
        .customer-info {
            font-size: 12px;
            color: #666;
            line-height: 1.6;
        }
        
        .breakdown-box {
            background: #F9FAFB;
            padding: 20px;
            border-radius: 10px;
            border: 1px solid #E5E7EB;
        }
        
        .breakdown-title {
            font-size: 13px;
            font-weight: 700;
            color: #00A950;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(0, 169, 80, 0.1);
        }
        
        .breakdown-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            font-size: 12px;
        }
        
        .breakdown-label {
            color: #666;
        }
        
        .breakdown-value {
            font-weight: 700;
            color: #333;
        }
        
        .breakdown-total {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 2px solid #E5E7EB;
        }
        
        .total-label {
            font-size: 13px;
            font-weight: 700;
            color: #333;
        }
        
        .total-value {
            font-size: 22px;
            font-weight: 900;
            color: #00A950;
        }
        
        .payment-status {
            margin-top: 15px;
            padding: 12px;
            background: #E8F5E9;
            border-radius: 8px;
        }
        
        .payment-status-title {
            font-size: 11px;
            font-weight: 700;
            color: #2E7D32;
            margin-bottom: 5px;
        }
        
        .payment-status-info {
            font-size: 10px;
            color: #388E3C;
        }
        
        .notes-box {
            padding: 20px;
            background: rgba(230, 249, 237, 0.7);
            border-radius: 10px;
            border: 1px solid rgba(0, 169, 80, 0.1);
            margin-bottom: 30px;
        }
        
        .notes-title {
            font-size: 11px;
            font-weight: 700;
            color: #00A950;
            margin-bottom: 10px;
        }
        
        .notes-list {
            font-size: 10px;
            color: #666;
            line-height: 1.6;
            padding-left: 20px;
        }
        
        .notes-list li {
            margin-bottom: 5px;
        }
        
        .footer {
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        
        .footer-left {
            max-width: 70%;
        }
        
        .footer-bank-name {
            font-size: 10px;
            font-weight: 700;
            color: #00A950;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 5px;
        }
        
        .footer-address {
            font-size: 9px;
            color: #999;
            line-height: 1.4;
        }
        
        .footer-right {
            text-align: right;
        }
        
        .print-date {
            font-size: 9px;
            color: #999;
            margin-bottom: 10px;
        }
        
        .watermark {
            font-size: 18px;
            font-weight: 900;
            color: rgba(0, 169, 80, 0.05);
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .interest-badge {
            display: inline-block;
            font-size: 8px;
            background: white;
            border: 1px solid rgba(0, 169, 80, 0.2);
            padding: 2px 6px;
            border-radius: 3px;
            color: #00A950;
            font-weight: 700;
            margin-left: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div>
                <div class="logo-section">
                    <div class="logo">
                        <img src="${logoBase64}" alt="SME-D-Bank-Logo">
                    </div>
                </div>
                <div style="margin-top: 20px;">
                    <div class="document-title">ใบแจ้งยอดชำระค่างวด</div>
                    <div class="loan-type">${data.loanType}</div>
                </div>
            </div>
            <div class="invoice-info">
                <div class="invoice-label">INVOICE</div>
                <div class="account-label">เลขที่บัญชีสินเชื่อ</div>
                <div class="account-no">${data.accountNo}</div>
            </div>
        </div>

        <!-- Summary Bar -->
        <div class="summary-bar">
            <div class="summary-item">
                <div class="summary-label">วันที่ออกเอกสาร</div>
                <div class="summary-value">${data.billingDate}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">กำหนดชำระภายใน</div>
                <div class="summary-value highlight">${data.dueDate}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">ยอดเงินต้นคงเหลือ</div>
                <div class="summary-value">฿${data.summary.remainingBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
            </div>
        </div>

        <!-- Content Grid -->
        <div class="content-grid">
            <!-- Customer Info -->
            <div>
                <div class="section-title">ข้อมูลผู้กู้</div>
                <div class="customer-name">${data.customer.name}</div>
                <div class="customer-info">
                    ${data.customer.address}<br>
                    ${data.customer.city}<br>
                    โทร: ${data.customer.phone}
                    ${data.customer.email ? `<br>อีเมล: ${data.customer.email}` : ''}
                </div>
            </div>

            <!-- Breakdown -->
            <div class="breakdown-box">
                <div class="breakdown-title">
                    รายละเอียดการเรียกเก็บ (งวดที่ ${data.installmentNo}/${data.totalInstallments})
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label">เงินต้น (Principal)</span>
                    <span class="breakdown-value">฿${data.breakdown.principal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
                <div class="breakdown-item">
                    <span class="breakdown-label">
                        ดอกเบี้ย (Interest)
                        <span class="interest-badge">${data.summary.interestRate}</span>
                    </span>
                    <span class="breakdown-value">฿${data.breakdown.interest.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
                ${data.breakdown.fees > 0 ? `
                <div class="breakdown-item">
                    <span class="breakdown-label">ค่าธรรมเนียมอื่นๆ (Fees)</span>
                    <span class="breakdown-value">฿${data.breakdown.fees.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>
                ` : ''}
                <div class="breakdown-item breakdown-total">
                    <span class="total-label">ยอดชำระสุทธิ</span>
                    <span class="total-value">฿${data.breakdown.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                </div>

                ${data.payment ? `
                <div class="payment-status">
                    <div class="payment-status-title">สถานะ: ชำระแล้ว</div>
                    <div class="payment-status-info">วันที่ชำระ: ${data.payment.paidAt}</div>
                    <div class="payment-status-info">จำนวนเงิน: ฿${data.payment.paidAmount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                </div>
                ` : ''}
            </div>
        </div>

        <!-- Notes -->
        <div class="notes-box">
            <div class="notes-title">หมายเหตุสำคัญ:</div>
            <ul class="notes-list">
                <li>กรุณาชำระเงินภายในวันที่กำหนดเพื่อรักษาประวัติการเงินที่ดีของสถานประกอบการ</li>
                <li>เอกสารฉบับนี้จัดทำขึ้นเพื่อแจ้งยอดชำระเบื้องต้นเท่านั้น</li>
                <li>หากมีข้อสงสัยประการใด กรุณาติดต่อธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมฯ</li>
            </ul>
        </div>

        <!-- Footer -->
        <div class="footer">
            <div class="footer-left">
                <div class="footer-bank-name">
                    ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย
                </div>
                <div class="footer-address">
                    อาคาร SME Bank Tower 310 ถนนพหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ 10400
                </div>
            </div>
            <div class="footer-right">
                <div class="print-date">พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</div>
                <div class="watermark">SME D <span style="color: rgba(200, 200, 200, 0.3);">BANK</span></div>
            </div>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Save PDF to local storage and return on-demand URL
     * Note: Railway uses ephemeral FS — URL points to on-demand generation endpoint
     */
    async savePDF(pdfBuffer: Buffer, filename: string, scheduleId?: string): Promise<string> {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');

            // Save to temp location (may not persist on Railway)
            const uploadsDir = path.join(process.cwd(), 'uploads', 'invoices');
            await fs.mkdir(uploadsDir, { recursive: true });
            const filePath = path.join(uploadsDir, filename);
            await fs.writeFile(filePath, pdfBuffer);

            const baseUrl = (env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

            // If scheduleId provided, use on-demand route (survives redeploy)
            if (scheduleId) {
                return `${baseUrl}/api/invoices/pdf/schedule/${scheduleId}`;
            }

            // Fallback: static URL (may 404 after redeploy)
            return `${baseUrl}/uploads/invoices/${filename}`;
        } catch (error) {
            logger.error({ error, filename }, 'Error saving invoice PDF');
            throw error;
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

export const invoicePDFService = new InvoicePDFService();
