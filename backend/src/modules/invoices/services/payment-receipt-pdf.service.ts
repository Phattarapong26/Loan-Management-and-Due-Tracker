import puppeteer from 'puppeteer';
import { logger } from '@utils/common/logger.util';
import { PaymentReceiptData } from './payment-receipt.service';
import { resolvePdfLogoFilePath } from '@utils/common/public-assets.util';
import { env } from '@config/env.config';

export class PaymentReceiptPDFService {
    /**
     * Generate Payment Receipt PDF using Puppeteer
     */
    async generatePaymentReceiptPDF(receiptData: PaymentReceiptData): Promise<Buffer> {
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        });

        try {
            const page = await browser.newPage();
            
            const html = await this.generateHTML(receiptData);
            
            await page.setContent(html, { waitUntil: 'networkidle0' });
            
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm',
                },
            });

            return Buffer.from(pdf);
        } catch (error) {
            logger.error({ error }, 'Error generating payment receipt PDF with Puppeteer');
            throw error;
        } finally {
            await browser.close();
        }
    }

    /**
     * Generate HTML for Payment Receipt PDF
     */
    private async generateHTML(data: PaymentReceiptData): Promise<string> {
        // Read logo and convert to base64
        const fs = await import('fs/promises');
        let logoBase64 = '';
        
        try {
            const { filePath: logoPath } = await resolvePdfLogoFilePath({
                callerFileUrl: import.meta.url,
            });

            if (logoPath) {
                const logoBuffer = await fs.readFile(logoPath);
                logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
            } else {
                logger.warn('Logo file not found, PDF will be generated without logo');
            }
        } catch (error: unknown) {
            logger.warn({ error }, 'Failed to load logo, PDF will be generated without logo');
        }

        return `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ใบเสร็จรับเงิน</title>
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
        }
        
        .container {
            padding: 20px;
        }
        
        .logo {
            text-align: center;
            margin-bottom: 20px;
        }
        
        .logo img {
            max-width: 90px;
            height: auto;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .header .subtitle {
            font-size: 14px;
            color: #666;
        }
        
        .document-info {
            text-align: right;
            margin-bottom: 30px;
            font-size: 13px;
        }
        
        .section {
            margin-bottom: 25px;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: 700;
            border-bottom: 2px solid #333;
            padding-bottom: 5px;
            margin-bottom: 10px;
        }
        
        .info-row {
            margin-bottom: 8px;
            font-size: 13px;
        }
        
        .info-label {
            display: inline-block;
            width: 180px;
            font-weight: 600;
        }
        
        .summary-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        
        .summary-table td {
            padding: 10px;
            border: 1px solid #ddd;
        }
        
        .summary-table .label {
            width: 60%;
            font-weight: 600;
        }
        
        .summary-table .amount {
            width: 40%;
            text-align: right;
        }
        
        .summary-table .highlight {
            background-color: #E8F5E9;
            font-weight: 700;
            font-size: 15px;
        }
        
        .validation-box {
            background-color: #FFF3E0;
            border: 2px solid #FF9800;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
        }
        
        .validation-code {
            font-size: 20px;
            font-weight: 700;
            color: #FF6B00;
            letter-spacing: 2px;
        }
        
        .terms {
            margin-top: 30px;
            font-size: 12px;
        }
        
        .terms ol {
            margin-left: 20px;
        }
        
        .terms li {
            margin-bottom: 5px;
        }
        
        .footer-note {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Logo -->
        ${logoBase64 ? `
        <div class="logo">
            <img src="${logoBase64}" alt="SME-D-Bank-Logo">
        </div>
        ` : ''}
        
        <!-- Header -->
        <div class="header">
            <h1>ใบเสร็จรับเงิน</h1>
            <div class="subtitle">Payment Receipt</div>
        </div>

        <!-- Document Info -->
        <div class="document-info">
            <div>เลขที่ใบเสร็จ: ${data.receiptNumber}</div>
            <div>วันที่ออกใบเสร็จ: ${new Date(data.receiptInfo.issuedAt).toLocaleDateString('th-TH', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}</div>
        </div>

        <!-- Bank Info -->
        <div class="section">
            <div class="section-title">ธนาคาร SME D BANK</div>
            <div class="info-row">
                <span class="info-label">ผู้รับเงิน:</span>
                <span>ธนาคาร SME D BANK</span>
            </div>
        </div>

        <!-- Customer Info -->
        <div class="section">
            <div class="section-title">ข้อมูลผู้ชำระเงิน</div>
            <div class="info-row">
                <span class="info-label">ชื่อ-นามสกุล / ชื่อธุรกิจ:</span>
                <span>${data.customer.businessName}</span>
            </div>
            <div class="info-row">
                <span class="info-label">ที่อยู่:</span>
                <span>${data.customer.address}</span>
            </div>
            <div class="info-row">
                <span class="info-label">เบอร์โทรศัพท์:</span>
                <span>${data.customer.phone}</span>
            </div>
            ${data.customer.email ? `
            <div class="info-row">
                <span class="info-label">อีเมล:</span>
                <span>${data.customer.email}</span>
            </div>
            ` : ''}
            <div class="info-row">
                <span class="info-label">เลขประจำตัวผู้เสียภาษี (Tax ID):</span>
                <span>${data.customer.taxId || '-'}</span>
            </div>
        </div>

        <!-- Loan Info -->
        <div class="section">
            <div class="section-title">ข้อมูลสัญญาสินเชื่อ</div>
            <div class="info-row">
                <span class="info-label">เลขที่สัญญา:</span>
                <span>${data.loanInfo.contractNumber}</span>
            </div>
            <div class="info-row">
                <span class="info-label">วงเงินกู้เดิม:</span>
                <span>${data.loanInfo.originalPrincipal.toLocaleString('th-TH', { 
                    minimumFractionDigits: 2 
                })} บาท</span>
            </div>
            <div class="info-row">
                <span class="info-label">ยอดคงเหลือ:</span>
                <span>${data.loanInfo.outstandingBalance.toLocaleString('th-TH', { 
                    minimumFractionDigits: 2 
                })} บาท</span>
            </div>
        </div>

        <!-- Payment Details -->
        <div class="section">
            <div class="section-title">รายละเอียดการชำระเงิน</div>
            <div class="info-row">
                <span class="info-label">วันที่ชำระเงิน:</span>
                <span>${new Date(data.paymentDetails.paymentDate).toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</span>
            </div>
            <div class="info-row">
                <span class="info-label">วิธีการชำระเงิน:</span>
                <span>${this.getPaymentMethodLabel(data.paymentDetails.paymentMethod)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">ประเภทการชำระ:</span>
                <span>${this.getPaymentTypeLabel(data.paymentDetails.paymentType)}</span>
            </div>
        </div>

        <!-- Payment Allocation -->
        <div class="section">
            <div class="section-title">การจัดสรรเงิน</div>
            <table class="summary-table">
                <tr>
                    <td class="label">เงินต้น:</td>
                    <td class="amount">${data.paymentAllocation.principalAmount.toLocaleString('th-TH', { 
                        minimumFractionDigits: 2 
                    })} บาท</td>
                </tr>
                <tr>
                    <td class="label">ดอกเบี้ย:</td>
                    <td class="amount">${data.paymentAllocation.interestAmount.toLocaleString('th-TH', { 
                        minimumFractionDigits: 2 
                    })} บาท</td>
                </tr>
                ${data.paymentAllocation.penaltyAmount > 0 ? `
                <tr>
                    <td class="label">ค่าปรับ:</td>
                    <td class="amount">${data.paymentAllocation.penaltyAmount.toLocaleString('th-TH', { 
                        minimumFractionDigits: 2 
                    })} บาท</td>
                </tr>
                ` : ''}
                <tr class="highlight">
                    <td class="label">รวมเงินที่ชำระ:</td>
                    <td class="amount">${data.paymentAllocation.totalAmount.toLocaleString('th-TH', { 
                        minimumFractionDigits: 2 
                    })} บาท</td>
                </tr>
            </table>
        </div>

        <!-- Loan Statistics -->
        <div class="section">
            <div class="section-title">สถิติการชำระเงิน</div>
            <div class="info-row">
                <span class="info-label">ชำระไปแล้วทั้งหมด:</span>
                <span>${data.loanStatistics.totalPaid.toLocaleString('th-TH', { 
                    minimumFractionDigits: 2 
                })} บาท</span>
            </div>
            <div class="info-row">
                <span class="info-label">งวดที่เหลือ:</span>
                <span>${data.loanStatistics.remainingInstallments} งวด</span>
            </div>
            <div class="info-row">
                <span class="info-label">ความคืบหน้า:</span>
                <span>${data.loanStatistics.paymentProgress.toFixed(2)}%</span>
            </div>
            ${data.loanInfo.nextPaymentDate ? `
            <div class="info-row">
                <span class="info-label">กำหนดชำระงวดถัดไป:</span>
                <span>${new Date(data.loanInfo.nextPaymentDate).toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</span>
            </div>
            ` : ''}
            ${data.loanInfo.nextPaymentAmount ? `
            <div class="info-row">
                <span class="info-label">ยอดชำระงวดถัดไป:</span>
                <span>${data.loanInfo.nextPaymentAmount.toLocaleString('th-TH', { 
                    minimumFractionDigits: 2 
                })} บาท</span>
            </div>
            ` : ''}
        </div>

        <!-- Validation Code -->
        <div class="validation-box">
            <div style="font-size: 14px; margin-bottom: 5px;">รหัสตรวจสอบความถูกต้อง</div>
            <div class="validation-code">${data.receiptInfo.validationCode}</div>
            <div style="font-size: 11px; margin-top: 5px; color: #666;">
                ใช้รหัสนี้ตรวจสอบความถูกต้องของใบเสร็จได้ที่เว็บไซต์ธนาคาร
            </div>
        </div>

        <!-- Terms -->
        <div class="section terms">
            <div class="section-title">หมายเหตุ</div>
            <ol>
                <li>ใบเสร็จฉบับนี้เป็นหลักฐานการชำระเงิน กรุณาเก็บรักษาไว้</li>
                <li>หากมีข้อสงสัยเกี่ยวกับการชำระเงิน กรุณาติดต่อธนาคารภายใน 7 วัน</li>
                <li>ใบเสร็จนี้ถูกสร้างโดยระบบอัตโนมัติ</li>
                <li>ขอบคุณที่ชำระเงินตรงเวลา</li>
            </ol>
        </div>

        <!-- Footer -->
        <div class="footer-note">
            <div>เอกสารนี้ออกโดย: ${data.receiptInfo.issuedBy}</div>
            <div>ธนาคาร SME D BANK - ธนาคารเพื่อ SME ไทย</div>
            <div style="margin-top: 10px;">
                ขอบคุณที่ใช้บริการ
            </div>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Save PDF to local storage
     */
    async savePDF(pdfBuffer: Buffer, filename: string): Promise<string> {
        try {
            const fs = await import('fs/promises');
            const path = await import('path');

            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(process.cwd(), 'uploads', 'receipts');
            await fs.mkdir(uploadsDir, { recursive: true });

            // Save file
            const filePath = path.join(uploadsDir, filename);
            await fs.writeFile(filePath, pdfBuffer);

            const baseUrl = (env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const pdfUrl = `${baseUrl}/uploads/receipts/${filename}`;
            
            console.log('✅ Generated PDF URL:', pdfUrl);
            return pdfUrl;
        } catch (error) {
            logger.error({ error, filename }, 'Error saving receipt PDF');
            throw error;
        }
    }

    /**
     * Get payment method label in Thai
     */
    private getPaymentMethodLabel(method: string): string {
        switch (method) {
            case 'TRANSFER':
                return 'โอนเงิน (Transfer)';
            case 'CASH':
                return 'เงินสด (Cash)';
            case 'CHECK':
                return 'เช็ค (Check)';
            case 'CREDIT_CARD':
                return 'บัตรเครดิต (Credit Card)';
            default:
                return method;
        }
    }

    /**
     * Get payment type label in Thai
     */
    private getPaymentTypeLabel(type: string): string {
        switch (type) {
            case 'EARLY':
                return 'ชำระก่อนกำหนด (Early Payment)';
            case 'ON_TIME':
                return 'ชำระตรงเวลา (On Time)';
            case 'LATE':
                return 'ชำระล่าช้า (Late Payment)';
            default:
                return type;
        }
    }
}

export const paymentReceiptPDFService = new PaymentReceiptPDFService();
