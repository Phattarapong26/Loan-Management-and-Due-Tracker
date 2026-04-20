/**
 * Secure Document Service
 * 
 * Purpose: Create password-protected document access
 * Features:
 * - Generate secure tokens for document access
 * - Validate ID card last 4 digits as password
 * - Track document access attempts
 */

import { SecureDocumentRepository } from '../repositories/secure-document.repository';
import { env } from '@config/env.config';
import { logger } from '@utils/common/logger.util';
import crypto from 'crypto';
import fs from 'fs/promises';

export interface SecureDocumentToken {
    token: string;
    documentType: 'invoice' | 'receipt' | 'contract';
    documentId: string;
    customerId: string;
    expiresAt: Date;
}

export class SecureDocumentService {
    private repository: SecureDocumentRepository;

    constructor() {
        this.repository = new SecureDocumentRepository();
    }
    /**
     * Generate secure token for document access
     * Token expires in 7 days
     */
    async generateSecureToken(
        documentType: 'invoice' | 'receipt' | 'contract',
        documentId: string,
        customerId: string
    ): Promise<string> {
        try {
            // Generate random token
            const token = crypto.randomBytes(32).toString('hex');
            
            // Set expiration (7 days from now)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            // Store token in database
            await this.repository.createToken({ token, documentType, documentId, customerId, expiresAt });

            logger.info({
                documentType,
                documentId,
                customerId,
                expiresAt,
            }, 'Secure document token generated');

            return token;
        } catch (error) {
            logger.error({ error, documentType, documentId }, 'Error generating secure token');
            throw error;
        }
    }

    /**
     * Validate password (last 4 digits of ID card) and grant access
     */
    async validateAndGrantAccess(
        token: string,
        password: string
    ): Promise<{ success: boolean; documentUrl?: string; error?: string }> {
        try {
            // Get token from database
            const tokenRecord = await this.repository.findToken(token);

            if (!tokenRecord) {
                logger.warn({ token: token.substring(0, 10) }, 'Invalid token');
                return { success: false, error: 'ลิงก์ไม่ถูกต้องหรือหมดอายุ' };
            }

            // Check if token expired
            if (new Date() > tokenRecord.expiresAt) {
                logger.warn({ token: token.substring(0, 10) }, 'Token expired');
                return { success: false, error: 'ลิงก์หมดอายุแล้ว กรุณาติดต่อเจ้าหน้าที่' };
            }

            // Get customer's Thai ID
            const customer = tokenRecord.customer as any;
            if (!customer.thaiId) {
                logger.error({ customerId: customer.id }, 'Customer has no Thai ID');
                return { success: false, error: 'ไม่พบข้อมูลบัตรประชาชน กรุณาติดต่อเจ้าหน้าที่' };
            }

            // Decrypt Thai ID
            const { EncryptionUtil } = await import('@utils/security/encryption.util');
            let decryptedThaiId: string;
            try {
                decryptedThaiId = EncryptionUtil.decrypt(customer.thaiId);
            } catch (error) {
                logger.error({ 
                    customerId: customer.id,
                    error 
                }, 'Failed to decrypt Thai ID');
                return { success: false, error: 'ไม่สามารถตรวจสอบข้อมูลได้ กรุณาติดต่อเจ้าหน้าที่' };
            }

            // Log for debugging
            logger.info({
                customerId: customer.id,
                decryptedThaiIdLength: decryptedThaiId?.length,
                decryptedThaiIdSample: decryptedThaiId?.substring(0, 5) + '...' + decryptedThaiId?.slice(-4),
                passwordLength: password.length,
            }, 'Validating password');

            // Validate password (last 4 digits of Thai ID)
            const last4Digits = decryptedThaiId.slice(-4);
            
            logger.info({
                last4Digits,
                providedPassword: password,
                match: password === last4Digits,
            }, 'Password comparison');
            
            if (password !== last4Digits) {
                // Log failed attempt
                await this.logAccessAttempt(token, false, 'Invalid password');
                
                logger.warn({
                    token: token.substring(0, 10),
                    customerId: customer.id,
                }, 'Invalid password attempt');
                
                return { success: false, error: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' };
            }

            // Password correct - log successful access
            await this.logAccessAttempt(token, true);

            // Update access count
            await this.repository.incrementAccessCount(token);

            // Generate document URL based on type
            const documentUrl = await this.getDocumentUrl(
                tokenRecord.documentType,
                tokenRecord.documentId
            );

            logger.info({
                token: token.substring(0, 10),
                customerId: customer.id,
                documentType: tokenRecord.documentType,
            }, 'Document access granted');

            return { success: true, documentUrl };
        } catch (error) {
            logger.error({ error, token: token.substring(0, 10) }, 'Error validating access');
            return { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' };
        }
    }

    /**
     * Get document URL based on type
     */
    private async getDocumentUrl(documentType: string, documentId: string): Promise<string> {
            switch (documentType) {
                case 'invoice':
                    // For invoice, generate and return PDF URL
                    return await this.getInvoicePDFUrl(documentId);
                case 'receipt':
                    // For receipt, generate and return PDF URL
                    return await this.getReceiptPDFUrl(documentId);
                case 'contract':
                    // For contract, generate and return PDF URL
                    return await this.getContractPDFUrl(documentId);
                default:
                    const baseUrl = env.FRONTEND_URL || 'http://localhost:5173';
                    return `${baseUrl}/document/${documentId}`;
            }
        }

    /**
     * Get receipt PDF URL
     */
    private async getReceiptPDFUrl(receiptId: string): Promise<string> {
            try {
                const receipt = await this.repository.findReceipt(receiptId);

                if (!receipt) {
                    throw new Error('Receipt not found');
                }

                const receiptData = (receipt as any).receiptData;

                // Check if PDF URL is already stored in receiptData
                if (receiptData.pdfUrl) {
                    logger.info({ receiptId, pdfUrl: receiptData.pdfUrl }, 'Using stored PDF URL');
                    return receiptData.pdfUrl;
                }

                // If no PDF URL stored, generate it now
                logger.info({ receiptId }, 'PDF URL not found, generating new PDF');
                const { paymentReceiptPDFService } = await import('@invoices/services/payment-receipt-pdf.service');

                const pdfBuffer = await paymentReceiptPDFService.generatePaymentReceiptPDF(receiptData);
                const filename = `receipt-${receiptData.receiptNumber}-${Date.now()}.pdf`;
                const pdfUrl = await paymentReceiptPDFService.savePDF(pdfBuffer, filename);

                // Update receiptData with PDF URL for future use
                await this.repository.updateReceiptData(receiptId, { ...receiptData, pdfUrl });

                logger.info({ receiptId, pdfUrl }, 'PDF generated and URL stored');
                return pdfUrl;
            } catch (error) {
                logger.error({ error, receiptId }, 'Error getting receipt PDF URL');
                throw error;
            }
        }
    /**
     * Get invoice PDF URL
     */
    /**
         * Get invoice PDF URL
         */
        private async getInvoicePDFUrl(invoiceId: string): Promise<string> {
                try {
                    logger.info({ invoiceId }, 'Getting invoice PDF URL');

                    // Try to find invoice by ID
                    let invoice = await this.repository.findInvoiceById(invoiceId);

                    // If invoice not found, it might be a payment schedule ID
                    if (!invoice) {
                        logger.warn({ invoiceId }, 'Invoice not found by ID, trying as payment schedule ID');
                        invoice = await this.repository.findInvoiceByScheduleId(invoiceId);
                    }

                    // If still not found, generate invoice from payment schedule
                    if (!invoice) {
                        logger.info({ paymentScheduleId: invoiceId }, 'Invoice not found, generating from payment schedule');

                        const schedule = await this.repository.findPaymentScheduleWithLoan(invoiceId);

                        if (!schedule) {
                            logger.error({ invoiceId }, 'Payment schedule not found');
                            throw new Error('Invoice or payment schedule not found');
                        }

                        // Generate invoice
                        const { NextPaymentInvoiceService } = await import('@invoices/services/next-payment-invoice.service');
                        const invoiceService = new NextPaymentInvoiceService();

                        const invoiceData = await invoiceService.generateNextPaymentInvoice(
                            schedule.loanId,
                            'SYSTEM'
                        );

                        // Fetch the created invoice
                        invoice = await this.repository.findInvoiceById(invoiceData.invoiceId);

                        if (!invoice) {
                            logger.error({ invoiceId: invoiceData.invoiceId }, 'Failed to fetch generated invoice');
                            throw new Error('Failed to generate invoice');
                        }

                        logger.info({ 
                            paymentScheduleId: invoiceId,
                            generatedInvoiceId: invoice.id 
                        }, 'Invoice generated successfully');
                    }

                    logger.info({ 
                        invoiceId, 
                        actualInvoiceId: invoice.id,
                        hasInvoiceData: !!invoice.invoiceData 
                    }, 'Invoice found');

                    const invoiceData = (invoice as any).invoiceData;

                    // Check if PDF URL is already stored in invoiceData
                    if (invoiceData?.pdfUrl) {
                        logger.info({ invoiceId: invoice.id, pdfUrl: invoiceData.pdfUrl }, 'Using stored invoice PDF URL');
                        return invoiceData.pdfUrl;
                    }

                    // If no PDF URL stored, generate it now
                    logger.info({ invoiceId: invoice.id }, 'Invoice PDF URL not found, generating new PDF');

                    try {
                        const { PDFGenerationService } = await import('@documents/services/pdf-generation.service');
                        const pdfService = new PDFGenerationService();

                        logger.info({ 
                            invoiceId: invoice.id, 
                            paymentScheduleId: invoice.paymentScheduleId 
                        }, 'Starting PDF generation');

                        // Convert NextPaymentInvoiceData to InvoiceData format
                        // Handle date conversion safely - generatedAt might be string or Date
                        let generatedAtDate: Date;
                        let dueDateDate: Date;
                        
                        try {
                            generatedAtDate = typeof invoiceData.metadata.generatedAt === 'string' 
                                ? new Date(invoiceData.metadata.generatedAt) 
                                : invoiceData.metadata.generatedAt;
                            
                            dueDateDate = typeof invoiceData.nextPayment.dueDate === 'string'
                                ? new Date(invoiceData.nextPayment.dueDate)
                                : invoiceData.nextPayment.dueDate;

                            // Validate dates
                            if (isNaN(generatedAtDate.getTime())) {
                                logger.warn({ generatedAt: invoiceData.metadata.generatedAt }, 'Invalid generatedAt date, using current date');
                                generatedAtDate = new Date();
                            }
                            
                            if (isNaN(dueDateDate.getTime())) {
                                logger.warn({ dueDate: invoiceData.nextPayment.dueDate }, 'Invalid dueDate, using current date');
                                dueDateDate = new Date();
                            }
                        } catch (dateError) {
                            logger.error({ error: dateError, invoiceData: invoiceData.metadata }, 'Error parsing dates, using current date');
                            generatedAtDate = new Date();
                            dueDateDate = new Date();
                        }

                        const convertedInvoiceData = {
                            accountNo: invoiceData.invoiceNumber,
                            loanType: 'สินเชื่อ SME', // Default loan type
                            installmentNo: invoiceData.nextPayment.installmentNo || 1,
                            totalInstallments: invoiceData.nextPayment.totalInstallments || 1,
                            billingDate: generatedAtDate.toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            }),
                            dueDate: dueDateDate.toLocaleDateString('th-TH', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            }),
                            customer: {
                                name: invoiceData.customer.businessName,
                                address: invoiceData.customer.address || 'ไม่ได้ระบุที่อยู่',
                                city: 'กรุงเทพฯ', // Default city
                                phone: invoiceData.customer.phone || 'ไม่ได้ระบุเบอร์โทร',
                                email: invoiceData.customer.email || 'ไม่ได้ระบุอีเมล',
                            },
                            breakdown: {
                                principal: invoiceData.nextPayment.principalAmount,
                                interest: invoiceData.nextPayment.interestAmount,
                                fees: 0,
                                total: invoiceData.nextPayment.totalAmount,
                            },
                            summary: {
                                remainingBalance: invoiceData.loanSummary.remainingPrincipal,
                                interestRate: `${invoiceData.loanSummary.interestRate}% p.a.`,
                                paidInstallments: 0, // Will be calculated
                                overdueAmount: 0, // Will be calculated
                            },
                            loan: {
                                id: invoiceData.loanId,
                                startDate: 'ไม่ระบุ', // Not available
                                maturityDate: 'ไม่ระบุ', // Not available  
                                monthlyPayment: invoiceData.nextPayment.totalAmount,
                            },
                        };

                        console.log('🔍 Converted invoice data for PDF:', {
                            accountNo: convertedInvoiceData.accountNo,
                            billingDate: convertedInvoiceData.billingDate,
                            dueDate: convertedInvoiceData.dueDate,
                            installmentNo: convertedInvoiceData.installmentNo,
                            totalInstallments: convertedInvoiceData.totalInstallments,
                            customerName: convertedInvoiceData.customer.name,
                        });

                        // Generate PDF (returns local path)
                        const pdfPath = await pdfService.generateInvoicePDF(convertedInvoiceData as any, invoice.paymentScheduleId);

                        logger.info({ invoiceId: invoice.id, pdfPath }, 'PDF generated, saving to permanent location');

                        // Save PDF and get URL
                        const filename = `invoice-${invoice.invoiceNumber}-${Date.now()}.pdf`;
                        const pdfUrl = await pdfService.saveInvoicePDF(pdfPath, filename);

                        logger.info({ invoiceId: invoice.id, pdfUrl }, 'PDF saved, cleaning up temp file');

                        // Clean up temporary file
                        try {
                            await fs.unlink(pdfPath);
                            logger.info({ pdfPath }, 'Temp file cleaned up');
                        } catch (cleanupError) {
                            logger.warn({ error: cleanupError, pdfPath }, 'Failed to cleanup temporary PDF file');
                        }

                        // Update invoiceData with PDF URL for future use
                        logger.info({ invoiceId: invoice.id }, 'Updating invoice with PDF URL');
                        await this.repository.updateInvoiceData(invoice.id, { ...invoiceData, pdfUrl });

                        logger.info({ invoiceId: invoice.id, pdfUrl }, 'Invoice PDF generated and URL stored successfully');
                        return pdfUrl;
                    } catch (pdfError) {
                        logger.error({ 
                            error: pdfError, 
                            errorMessage: pdfError instanceof Error ? pdfError.message : 'Unknown error',
                            errorStack: pdfError instanceof Error ? pdfError.stack : undefined,
                            invoiceId: invoice.id
                        }, 'Error during PDF generation/save process');
                        throw pdfError;
                    }
                } catch (error) {
                    logger.error({ 
                        error, 
                        errorMessage: error instanceof Error ? error.message : 'Unknown error',
                        errorStack: error instanceof Error ? error.stack : undefined,
                        invoiceId 
                    }, 'Error getting invoice PDF URL');
                    throw error;
                }
            }



    /**
     * Get contract PDF URL
     */
    private async getContractPDFUrl(loanId: string): Promise<string> {
            try {
                // Get loan data
                const loan = await this.repository.findLoanById(loanId);

                if (!loan) {
                    throw new Error('Loan not found');
                }

                // Check if there's a contract PDF URL in productConfig
                const productConfig = loan.productConfig as any;
                const pdfUrl = productConfig?.disbursementPdfUrl || productConfig?.contractPdfUrl;
                
                if (pdfUrl) {
                    logger.info({ loanId, pdfUrl, source: productConfig?.disbursementPdfUrl ? 'disbursement' : 'contract' }, 'Using stored PDF URL from productConfig');
                    
                    // If the PDF URL is a relative path, make it absolute using the correct base URL
                    if (pdfUrl.startsWith('/uploads/') || pdfUrl.startsWith('uploads/')) {
                        const baseUrl = (env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
                        const cleanPath = pdfUrl.startsWith('/') ? pdfUrl : `/${pdfUrl}`;
                        const fullUrl = `${baseUrl}${cleanPath}`;
                        
                        logger.info({ loanId, originalUrl: pdfUrl, fullUrl }, 'Converted relative PDF URL to absolute URL');
                        return fullUrl;
                    }
                    
                    return pdfUrl;
                }

                // If no PDF URL found, return a fallback URL to the loan details page
                logger.warn({ loanId, productConfig }, 'No contract PDF found, redirecting to loan page');
                const { ConfigService } = await import('@modules/config/services/config.service');
                const configService = ConfigService.getInstance();
                const frontendUrl = await configService.getFrontendUrl(env.FRONTEND_URL || 'http://localhost:5173');
                return `${frontendUrl}/loans/${loanId}`;
            } catch (error) {
                logger.error({ error, loanId }, 'Error getting contract PDF URL');
                throw error;
            }
        }

    private async logAccessAttempt(token: string, success: boolean, reason?: string): Promise<void> {
        try {
            await this.repository.logAccessAttempt(token, success, reason);
        } catch (error) {
            logger.error({ error, token: token.substring(0, 10) }, 'Error logging access attempt');
        }
    }

    /**
     * Get secure document URL for LINE (using dynamic URL)
     */
    async getSecureDocumentUrl(token: string): Promise<string> {
        const { ConfigService } = await import('@modules/config/services/config.service');
        const configService = ConfigService.getInstance();
        const defaultUrl = env.FRONTEND_URL || 'http://localhost:5173';
        const baseUrl = await configService.getFrontendUrl(defaultUrl);
        return `${baseUrl}/secure-document/${token}`;
    }

    async cleanupExpiredTokens(): Promise<number> {
        try {
            const count = await this.repository.deleteExpiredTokens();
            logger.info({ count }, 'Cleaned up expired document tokens');
            return count;
        } catch (error) {
            logger.error({ error }, 'Error cleaning up expired tokens');
            return 0;
        }
    }
}
