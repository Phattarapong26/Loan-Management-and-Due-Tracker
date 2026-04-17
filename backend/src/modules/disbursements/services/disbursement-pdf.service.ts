import puppeteer from 'puppeteer';
import { env } from '@core/config/env.config';
import { logger } from '@utils/common/logger.util';
import { resolvePdfLogoFilePath } from '@utils/common/public-assets.util';

export class DisbursementPDFService {
    /**
     * Generate Disbursement Advice PDF using Puppeteer
     */
    async generateDisbursementAdvice(data: {
        disbursement: any;
        loan: any;
        customer: any;
        branch: any;
    }): Promise<Buffer> {
        console.log('🔄 Launching Puppeteer browser...');
        let browser;
        
        try {
            // Decrypt sensitive customer data before generating PDF
            const { EncryptionUtil } = await import('@utils/security/encryption.util');
            const decryptedCustomer = { ...data.customer };
            
            if (data.customer.thaiId) {
                try {
                    decryptedCustomer.thaiId = EncryptionUtil.decrypt(data.customer.thaiId);
                    console.log('✅ Thai ID decrypted for PDF');
                } catch (error) {
                    console.warn('⚠️ Failed to decrypt Thai ID, using original value');
                }
            }
            
            if (data.customer.taxId) {
                try {
                    decryptedCustomer.taxId = EncryptionUtil.decrypt(data.customer.taxId);
                    console.log('✅ Tax ID decrypted for PDF');
                } catch (error) {
                    console.warn('⚠️ Failed to decrypt Tax ID, using original value');
                }
            }
            
            // Use decrypted customer data
            const pdfData = {
                ...data,
                customer: decryptedCustomer,
            };
            
            browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                ],
                timeout: 60000, // 60 second timeout for browser launch
            });
            console.log('✅ Browser launched successfully');

            const page = await browser.newPage();
            console.log('✅ New page created');
            
            // Set longer timeouts for page operations
            page.setDefaultTimeout(60000); // 60 seconds
            page.setDefaultNavigationTimeout(60000); // 60 seconds
            
            const totalDisbursed = Number(data.loan.totalDisbursed) || 0;
            const currentAmount = Number(data.disbursement.amount);
            const newTotalDisbursed = totalDisbursed + currentAmount;
            const remaining = Number(data.loan.principal) - newTotalDisbursed;

            console.log('🔄 Generating HTML content...');
            const html = await this.generateHTML(pdfData, totalDisbursed, currentAmount, remaining);
            console.log('✅ HTML generated, length:', html.length, 'chars');
            
            console.log('🔄 Setting page content...');
            try {
                // Try with domcontentloaded first (faster)
                await page.setContent(html, { 
                    waitUntil: 'domcontentloaded', 
                    timeout: 30000 
                });
                console.log('✅ Page content set with domcontentloaded');
            } catch (error) {
                console.warn('⚠️ domcontentloaded failed, trying with load event...');
                // Fallback to load event
                await page.setContent(html, { 
                    waitUntil: 'load', 
                    timeout: 45000 
                });
                console.log('✅ Page content set with load event');
            }
            
            // Wait a bit for any remaining rendering (using setTimeout instead of waitForTimeout)
            console.log('⏳ Waiting for rendering to complete...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('✅ Rendering wait completed');
            
            console.log('🔄 Generating PDF...');
            const pdf = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm',
                },
                timeout: 30000, // 30 second timeout for PDF generation
            });
            console.log('✅ PDF generated, size:', pdf.length, 'bytes');

            return Buffer.from(pdf);
        } catch (error: any) {
            console.error('❌ Error generating PDF with Puppeteer:', {
                error: error.message,
                stack: error.stack,
            });
            logger.error({ error }, 'Error generating PDF with Puppeteer');
            throw new Error(`Failed to generate PDF: ${error.message}`);
        } finally {
            if (browser) {
                console.log('🔄 Closing browser...');
                try {
                    await browser.close();
                    console.log('✅ Browser closed');
                } catch (closeError) {
                    console.warn('⚠️ Error closing browser:', closeError);
                }
            }
        }
    }

    /**
     * Generate HTML for PDF
     */
    private async generateHTML(
        data: { disbursement: any; loan: any; customer: any; branch: any },
        totalDisbursed: number,
        currentAmount: number,
        remaining: number
    ): Promise<string> {
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
    <title>หนังสือแจ้งการเบิกจ่ายเงินกู้</title>
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
            background-color: #f0f0f0;
            font-weight: 700;
            font-size: 15px;
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
        
        .signature {
            margin-top: 40px;
            text-align: right;
        }
        
        .signature-line {
            display: inline-block;
            border-bottom: 1px solid #333;
            width: 250px;
            margin-bottom: 5px;
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
            <h1>หนังสือแจ้งการเบิกจ่ายเงินกู้</h1>
            <div class="subtitle">Disbursement Advice</div>
        </div>

        <!-- Document Info -->
        <div class="document-info">
            <div>เลขที่เอกสาร: DA-${data.disbursement.disbursementNo}</div>
            <div>วันที่ออกเอกสาร: ${new Date().toLocaleDateString('th-TH', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}</div>
        </div>

        <!-- Bank Info -->
        <div class="section">
            <div class="section-title">ธนาคาร SME D BANK</div>
            <div class="info-row">
                <span class="info-label">สาขา:</span>
                <span>${data.branch?.name || '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">รหัสสาขา:</span>
                <span>${data.branch?.code || '-'}</span>
            </div>
        </div>

        <!-- Customer Info -->
        <div class="section">
            <div class="section-title">ข้อมูลลูกค้า</div>
            <div class="info-row">
                <span class="info-label">ชื่อ-นามสกุล / ชื่อธุรกิจ:</span>
                <span>${data.customer.businessName}</span>
            </div>
            <div class="info-row">
                <span class="info-label">ที่อยู่:</span>
                <span>${data.customer.address || '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">เบอร์โทรศัพท์:</span>
                <span>${data.customer.phone || '-'}</span>
            </div>
            ${data.customer.email ? `
            <div class="info-row">
                <span class="info-label">อีเมล:</span>
                <span>${data.customer.email}</span>
            </div>
            ` : ''}
            <div class="info-row">
                <span class="info-label">เลขบัตรประชาชน:</span>
                <span>${data.customer.thaiId || '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">เลขผู้เสียภาษี:</span>
                <span>${data.customer.taxId || '-'}</span>
            </div>
        </div>

        <!-- Loan Contract Info -->
        <div class="section">
            <div class="section-title">ข้อมูลสัญญาสินเชื่อ</div>
            <div class="info-row">
                <span class="info-label">เลขที่สัญญา:</span>
                <span>${data.loan.contract_number || '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">วันที่ทำสัญญา:</span>
                <span>${data.loan.approvedAt ? new Date(data.loan.approvedAt).toLocaleDateString('th-TH', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                }) : '-'}</span>
            </div>
            <div class="info-row">
                <span class="info-label">วงเงินกู้รวม:</span>
                <span>${Number(data.loan.principal).toLocaleString('th-TH', { 
                    minimumFractionDigits: 2 
                })} บาท</span>
            </div>
        </div>

        <!-- Disbursement Details -->
        <div class="section">
            <div class="section-title">รายละเอียดการเบิกจ่าย</div>
            <div class="info-row">
                <span class="info-label">วันที่เบิกจ่าย:</span>
                <span>${data.disbursement.disbursedAt ? 
                    new Date(data.disbursement.disbursedAt).toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    }) : 
                    new Date().toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })
                }</span>
            </div>
            <div class="info-row">
                <span class="info-label">จำนวนเงินที่เบิกจ่าย:</span>
                <span>${Number(data.disbursement.amount).toLocaleString('th-TH', { 
                    minimumFractionDigits: 2 
                })} บาท</span>
            </div>
            <div class="info-row">
                <span class="info-label">วิธีการเบิกจ่าย:</span>
                <span>${this.getDisbursementMethodLabel(data.disbursement.disbursementMethod)}</span>
            </div>
            ${data.disbursement.referenceNo ? `
            <div class="info-row">
                <span class="info-label">เลขที่อ้างอิง:</span>
                <span>${data.disbursement.referenceNo}</span>
            </div>
            ` : ''}
            ${data.disbursement.notes ? `
            <div class="info-row">
                <span class="info-label">หมายเหตุ:</span>
                <span>${data.disbursement.notes}</span>
            </div>
            ` : ''}
        </div>

        <!-- Amount Summary -->
        <div class="section">
            <div class="section-title">สรุปยอดเงินกู้</div>
            <table class="summary-table">
                <tr>
                    <td class="label">วงเงินกู้รวม:</td>
                    <td class="amount">${Number(data.loan.principal).toLocaleString('th-TH', { 
                        minimumFractionDigits: 2 
                    })} บาท</td>
                </tr>
                <tr>
                    <td class="label">เบิกจ่ายไปแล้ว:</td>
                    <td class="amount">${totalDisbursed.toLocaleString('th-TH', { 
                        minimumFractionDigits: 2 
                    })} บาท</td>
                </tr>
                <tr class="highlight">
                    <td class="label">เบิกจ่ายครั้งนี้:</td>
                    <td class="amount">${currentAmount.toLocaleString('th-TH', { 
                        minimumFractionDigits: 2 
                    })} บาท</td>
                </tr>
                <tr>
                    <td class="label">ยอดคงเหลือ:</td>
                    <td class="amount">${remaining.toLocaleString('th-TH', { 
                        minimumFractionDigits: 2 
                    })} บาท</td>
                </tr>
            </table>
        </div>

        <!-- Terms and Conditions -->
        <div class="section terms">
            <div class="section-title">เงื่อนไขและข้อตกลง</div>
            <ol>
                <li>เอกสารฉบับนี้เป็นหลักฐานการเบิกจ่ายเงินกู้</li>
                <li>กรุณาเก็บรักษาไว้เป็นหลักฐาน</li>
                <li>หากมีข้อสงสัย กรุณาติดต่อธนาคารภายใน 7 วัน</li>
                <li>เอกสารนี้ถูกสร้างโดยระบบอัตโนมัติ</li>
            </ol>
        </div>

        <!-- Signature -->
        <div class="signature">
            <div>ลายเซ็นผู้มีอำนาจ: <span class="signature-line"></span></div>
            <div style="margin-top: 10px;">วันที่: ${new Date().toLocaleDateString('th-TH', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })}</div>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * Encrypt PDF with password
     * Note: Puppeteer doesn't support encryption directly
     * For production, consider using node-qpdf or similar
     */
    async encryptPDF(pdfBuffer: Buffer, _password: string): Promise<Buffer> {
        try {
            // For now, return the PDF as-is
            // TODO: Implement proper PDF encryption using node-qpdf or similar
            logger.warn('PDF encryption not yet implemented - returning unencrypted PDF');
            return pdfBuffer;
        } catch (error) {
            logger.error({ error }, 'Error encrypting PDF');
            throw error;
        }
    }

    /**
     * Save PDF to local storage (for development)
     * In production, this should upload to S3 or similar
     */
    async savePDF(pdfBuffer: Buffer, filename: string): Promise<string> {
        try {
            console.log('🔄 Importing fs and path modules...');
            const fs = await import('fs/promises');
            const path = await import('path');

            // Create uploads directory if it doesn't exist
            const uploadsDir = path.join(process.cwd(), 'uploads', 'disbursements');
            console.log('🔄 Creating uploads directory:', uploadsDir);
            await fs.mkdir(uploadsDir, { recursive: true });
            console.log('✅ Uploads directory ready');

            // Save file
            const filePath = path.join(uploadsDir, filename);
            console.log('🔄 Writing PDF file to:', filePath);
            await fs.writeFile(filePath, pdfBuffer);
            console.log('✅ PDF file written successfully');

            const baseUrl = (env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const pdfUrl = `${baseUrl}/uploads/disbursements/${filename}`;
            console.log('✅ PDF URL generated:', pdfUrl);
            
            return pdfUrl;
        } catch (error: any) {
            console.error('❌ Error saving PDF:', {
                error: error.message,
                stack: error.stack,
                filename,
            });
            logger.error({ error, filename }, 'Error saving PDF');
            throw new Error(`Failed to save PDF: ${error.message}`);
        }
    }

    /**
     * Get disbursement method label in Thai
     */
    private getDisbursementMethodLabel(method: string): string {
        switch (method) {
            case 'TRANSFER':
                return 'โอนเงิน (Transfer)';
            case 'CHECK':
                return 'เช็ค (Check)';
            case 'CASH':
                return 'เงินสด (Cash)';
            default:
                return method;
        }
    }
}
