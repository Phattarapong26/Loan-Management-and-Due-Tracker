import { DisbursementRepository } from '../repositories/disbursement.repository';
import { LoanRepository } from '@loans/repositories/loan.repository';
import {
    CreateDisbursementInput,
    UpdateDisbursementInput,
    ListDisbursementsQuery,
    ApproveDisbursementInput,
    RejectDisbursementInput,
    ExecuteDisbursementInput,
    DisbursementStatsQuery,
} from '../models/disbursement.model';
import { DisbursementStatus } from '@prisma/client';
import { dynamicInterestCalculator } from '@loans/calculators/dynamic-interest-calculator.service';
import { loanStatusNotification } from '@notifications/services/loan-status-notification.service';
import { NotificationService } from '@notifications/services/notification.service';
import { FastifyRequest } from 'fastify';
import { DisbursementPDFService } from './disbursement-pdf.service';
import { EncryptionUtil } from '@utils/security/encryption.util';
import { logger } from '@utils/common/logger.util';

export class DisbursementService {
    private disbursementRepository: DisbursementRepository;
    private loanRepository: LoanRepository;
    private notificationService: NotificationService;

    constructor() {
        this.disbursementRepository = new DisbursementRepository();
        this.loanRepository = new LoanRepository();
        this.notificationService = new NotificationService();
    }

    /**
     * Create new disbursement request
     */
    async createDisbursement(input: CreateDisbursementInput, userId: string, branchId?: string) {
        // Get loan details
        const loan = await this.loanRepository.findById(input.loanId);
        if (!loan) {
            throw new Error('ไม่พบข้อมูลสัญญาสินเชื่อ');
        }

        // Check branch access
        if (branchId && loan.branchId !== branchId) {
            throw new Error('ไม่พบข้อมูลสัญญาสินเชื่อ');
        }

        // Check loan status
        if (loan.status !== 'APPROVED' && loan.status !== 'ACTIVE' && loan.status !== 'DISBURSED') {
            throw new Error('สัญญาสินเชื่อต้องได้รับการอนุมัติก่อนจึงจะสามารถเบิกจ่ายได้');
        }

        // Calculate remaining amount
        const totalDisbursed = Number(loan.totalDisbursed || 0);
        const principal = Number(loan.principal);
        const remainingAmount = principal - totalDisbursed;

        // Check if requested amount exceeds remaining
        if (input.amount > remainingAmount) {
            throw new Error(
                `จำนวนเงินเกินกว่ายอดคงเหลือ (คงเหลือ: ${remainingAmount.toLocaleString('th-TH')} บาท)`
            );
        }

        // ✅ Validate payment schedule for first disbursement
        if (loan.status === 'APPROVED') {
            // First disbursement must have payment schedule
            if (!input.firstPaymentDate || !input.paymentDay) {
                throw new Error(
                    'การเบิกจ่ายครั้งแรกต้องระบุข้อมูลรอบการชำระเงิน (วันที่ลูกค้าชำระงวดแรก และวันที่ชำระประจำทุกเดือน)'
                );
            }

            // Validate dates
            const requestedDate = new Date(input.requestedDate);
            const firstPaymentDate = new Date(input.firstPaymentDate);
            const today = new Date();
            
            today.setHours(0, 0, 0, 0);
            requestedDate.setHours(0, 0, 0, 0);
            firstPaymentDate.setHours(0, 0, 0, 0);

            // Check disbursement date
            if (requestedDate < today) {
                throw new Error('วันที่เบิกจ่ายต้องเป็นวันนี้หรืออนาคต');
            }

            // Check first payment date is at least 7 days after disbursement
            const minFirstPaymentDate = new Date(requestedDate);
            minFirstPaymentDate.setDate(minFirstPaymentDate.getDate() + 7);

            if (firstPaymentDate < minFirstPaymentDate) {
                throw new Error(
                    `วันชำระงวดแรกต้องมากกว่าวันเบิกจ่ายอย่างน้อย 7 วัน (ควรเป็น ${minFirstPaymentDate.toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    })} หรือหลังจากนั้น)`
                );
            }

            // Validate payment day
            if (input.paymentDay < 1 || input.paymentDay > 31) {
                throw new Error('วันที่ชำระประจำเดือนต้องอยู่ระหว่าง 1-31');
            }
        }

        // Get next disbursement number
        const disbursementNo = await this.disbursementRepository.getNextDisbursementNo(input.loanId);

        // ✅ If this is the first disbursement (loan is APPROVED), set payment schedule
        if (loan.status === 'APPROVED' && input.firstPaymentDate && input.paymentDay) {
            await this.loanRepository.update(input.loanId, {
                firstPaymentDate: new Date(input.firstPaymentDate),
                paymentDay: input.paymentDay,
            });
        }

        // Create disbursement
        const disbursement = await this.disbursementRepository.create({
            loanId: input.loanId,
            disbursementNo,
            amount: input.amount,
            purpose: input.purpose,
            requestedDate: new Date(input.requestedDate),
            nextDisbursementDate: input.nextDisbursementDate
                ? new Date(input.nextDisbursementDate)
                : undefined,
            notes: input.notes,
            createdBy: userId,
        });

        return disbursement;
    }

    /**
     * Get disbursement by ID
     */
    async getDisbursement(id: string, branchId?: string) {
        const disbursement = await this.disbursementRepository.findById(id);
        if (!disbursement) {
            throw new Error('Disbursement not found');
        }

        // Check branch access
        if (branchId && disbursement.loan.branchId !== branchId) {
            throw new Error('Disbursement not found');
        }

        // Decrypt sensitive customer data - create new object to avoid mutation issues
        if (disbursement.loan?.customer) {
            const decryptedCustomer = this.decryptCustomerData(disbursement.loan.customer);
            
            // Return new object with decrypted data
            return {
                ...disbursement,
                loan: {
                    ...disbursement.loan,
                    customer: decryptedCustomer,
                },
            };
        }

        return disbursement;
    }

    /**
     * Decrypt customer sensitive data
     */
    private decryptCustomerData(customer: any): any {
        try {
            let decryptedThaiId = customer.thaiId ?? null;
            let decryptedTaxId = customer.taxId ?? null;

            if (customer.thaiId) {
                try {
                    decryptedThaiId = EncryptionUtil.decrypt(customer.thaiId);
                } catch {
                    // plain text or unsupported format — use as-is
                    decryptedThaiId = customer.thaiId;
                }
            }

            if (customer.taxId) {
                const hasColons = customer.taxId.includes(':');
                const looksEncrypted = hasColons || (customer.taxId.length > 50);
                if (looksEncrypted) {
                    try {
                        decryptedTaxId = EncryptionUtil.decrypt(customer.taxId);
                    } catch {
                        decryptedTaxId = customer.taxId;
                    }
                }
            }

            return { ...customer, thaiId: decryptedThaiId, taxId: decryptedTaxId };
        } catch {
            return customer;
        }
    }

    /**
     * List disbursements
     */
    async listDisbursements(query: ListDisbursementsQuery, branchId?: string) {
        const params: any = {
            page: query.page,
            limit: query.limit,
            loanId: query.loanId || undefined,
            customerId: query.customerId || undefined,
            branchId: branchId || query.branchId || undefined,
            status: query.status || undefined,
        };

        if (query.dateFrom) {
            params.dateFrom = new Date(query.dateFrom);
        }
        if (query.dateTo) {
            params.dateTo = new Date(query.dateTo);
        }

        const result = await this.disbursementRepository.list(params);

        // Decrypt sensitive customer data for all disbursements
        const disbursementsWithDecryptedData = result.disbursements.map((d: any) => {
            if (d.loan && d.loan.customer) {
                return { ...d, loan: { ...d.loan, customer: this.decryptCustomerData(d.loan.customer) } };
            }
            return d;
        });

        return { disbursements: disbursementsWithDecryptedData, total: result.total };
    }

    /**
     * Update disbursement
     */
    async updateDisbursement(id: string, input: UpdateDisbursementInput, branchId?: string) {
        const disbursement = await this.getDisbursement(id, branchId);

        // Only allow updates for PENDING status
        if (disbursement.status !== DisbursementStatus.PENDING) {
            throw new Error('สามารถแก้ไขได้เฉพาะคำขอที่มีสถานะ "รออนุมัติ" เท่านั้น');
        }

        // If amount is being updated, check remaining amount
        if (input.amount && input.amount !== Number(disbursement.amount)) {
            const loan = await this.loanRepository.findById(disbursement.loanId);
            if (!loan) {
                throw new Error('ไม่พบข้อมูลสัญญาสินเชื่อ');
            }

            const totalDisbursed = Number(loan.totalDisbursed || 0);
            const principal = Number(loan.principal);
            const currentDisbursementAmount = Number(disbursement.amount);
            const remainingAmount = principal - totalDisbursed + currentDisbursementAmount;

            if (input.amount > remainingAmount) {
                throw new Error(
                    `จำนวนเงินเกินกว่ายอดคงเหลือ (คงเหลือ: ${remainingAmount.toLocaleString('th-TH')} บาท)`
                );
            }
        }

        // ✅ Validate payment schedule if provided
        if (input.firstPaymentDate || input.paymentDay !== undefined) {
            const requestedDate = input.requestedDate 
                ? new Date(input.requestedDate) 
                : new Date(disbursement.requestedDate);
            
            requestedDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Validate disbursement date
            if (requestedDate < today) {
                throw new Error('วันที่เบิกจ่ายต้องเป็นวันนี้หรืออนาคต');
            }

            // Validate first payment date if provided
            if (input.firstPaymentDate) {
                const firstPaymentDate = new Date(input.firstPaymentDate);
                firstPaymentDate.setHours(0, 0, 0, 0);

                const minFirstPaymentDate = new Date(requestedDate);
                minFirstPaymentDate.setDate(minFirstPaymentDate.getDate() + 7);

                if (firstPaymentDate < minFirstPaymentDate) {
                    throw new Error(
                        `วันชำระงวดแรกต้องมากกว่าวันเบิกจ่ายอย่างน้อย 7 วัน (ควรเป็น ${minFirstPaymentDate.toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        })} หรือหลังจากนั้น)`
                    );
                }
            }

            // Validate payment day
            if (input.paymentDay !== undefined) {
                if (input.paymentDay < 1 || input.paymentDay > 31) {
                    throw new Error('วันที่ชำระประจำเดือนต้องอยู่ระหว่าง 1-31');
                }
            }
        }

        const updateData: any = {};
        if (input.amount !== undefined) updateData.amount = input.amount;
        if (input.purpose !== undefined) updateData.purpose = input.purpose;
        if (input.requestedDate !== undefined)
            updateData.requestedDate = new Date(input.requestedDate);
        if (input.nextDisbursementDate !== undefined)
            updateData.nextDisbursementDate = new Date(input.nextDisbursementDate);
        if (input.notes !== undefined) updateData.notes = input.notes;

        // ✅ Update payment schedule on the loan if provided
        if (input.firstPaymentDate || input.paymentDay !== undefined) {
            const loan = await this.loanRepository.findById(disbursement.loanId);
            if (!loan) {
                throw new Error('ไม่พบข้อมูลสัญญาสินเชื่อ');
            }

            const loanUpdateData: any = {};
            if (input.firstPaymentDate) {
                loanUpdateData.firstPaymentDate = new Date(input.firstPaymentDate);
            }
            if (input.paymentDay !== undefined) {
                loanUpdateData.paymentDay = input.paymentDay;
            }

            // Update loan with payment schedule
            await this.loanRepository.update(disbursement.loanId, loanUpdateData);
        }

        return this.disbursementRepository.update(id, updateData);
    }

    /**
     * Approve disbursement
     */
    async approveDisbursement(
        id: string,
        input: ApproveDisbursementInput,
        userId: string,
        branchId?: string
    ) {
        const disbursement = await this.getDisbursement(id, branchId);

        if (disbursement.status !== DisbursementStatus.PENDING) {
            throw new Error('ไม่สามารถอนุมัติได้ เนื่องจากสถานะไม่ใช่ "รออนุมัติ"');
        }

        // Check if loan still has enough remaining amount
        const loan = await this.loanRepository.findById(disbursement.loanId);
        if (!loan) {
            throw new Error('ไม่พบข้อมูลสัญญาสินเชื่อ');
        }

        // ✅ Validate payment schedule data - check from actual loan record
        const missingFields: string[] = [];
        
        console.log('[Approve Disbursement] Checking payment schedule:', {
            disbursementId: id,
            loanId: loan.id,
            hasFirstPaymentDate: !!loan.firstPaymentDate,
            hasPaymentDay: !!loan.paymentDay,
            firstPaymentDate: loan.firstPaymentDate,
            paymentDay: loan.paymentDay,
        });
        
        if (!loan.firstPaymentDate) {
            missingFields.push('วันที่ลูกค้าชำระงวดแรก');
        }
        
        if (!loan.paymentDay) {
            missingFields.push('วันที่ชำระประจำทุกเดือน');
        }

        if (missingFields.length > 0) {
            throw new Error(
                `ข้อมูลรอบการชำระเงินไม่ครบถ้วน กรุณาแก้ไขคำขอเบิกจ่ายเพื่อเพิ่มข้อมูล: ${missingFields.join(', ')}`
            );
        }

        // Validate disbursement date
        const disbursementDate = new Date(disbursement.requestedDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        disbursementDate.setHours(0, 0, 0, 0);

        if (disbursementDate < today) {
            throw new Error('วันที่เบิกจ่ายต้องเป็นวันนี้หรืออนาคต กรุณาแก้ไขวันที่เบิกจ่ายก่อนอนุมัติ');
        }

        // Validate first payment date is at least 7 days after disbursement
        const firstPaymentDate = new Date(loan.firstPaymentDate!);
        firstPaymentDate.setHours(0, 0, 0, 0);
        
        const minFirstPaymentDate = new Date(disbursementDate);
        minFirstPaymentDate.setDate(minFirstPaymentDate.getDate() + 7);

        if (firstPaymentDate < minFirstPaymentDate) {
            throw new Error(
                `วันชำระงวดแรกต้องมากกว่าวันเบิกจ่ายอย่างน้อย 7 วัน (ควรเป็น ${minFirstPaymentDate.toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                })} หรือหลังจากนั้น)`
            );
        }

        const totalDisbursed = Number(loan.totalDisbursed || 0);
        const principal = Number(loan.principal);
        const remainingAmount = principal - totalDisbursed;
        const requestedAmount = Number(disbursement.amount);

        if (requestedAmount > remainingAmount) {
            throw new Error(
                `จำนวนเงินเกินกว่ายอดคงเหลือ (คงเหลือ: ${remainingAmount.toLocaleString('th-TH')} บาท)`
            );
        }

        const approved = await this.disbursementRepository.approve(id, userId, input.notes);

        // 🔔 Send in-app notification to Loan Officer
        const loanData = disbursement.loan as any;
        if (loanData && loanData.officerId) {
            try {
                await this.notificationService.createNotification({} as FastifyRequest, {
                    userId: loanData.officerId,
                    type: 'LOAN_APPROVED',
                    title: `อนุมัติการเบิกจ่าย - ${disbursement.loan.customer?.businessName}`,
                    message: `การเบิกจ่ายจำนวน ${Number(disbursement.amount).toLocaleString('th-TH')} บาท ได้รับการอนุมัติแล้ว`,
                    link: `/loans/${disbursement.loanId}`,
                    priority: 'HIGH',
                    eventId: `DISBURSEMENT_APPROVED:${id}`,
                    dedupKey: `DISBURSEMENT_APPROVED-${id}`,
                    dedupWindow: 24,
                    audienceRoles: ['OFFICER', 'MANAGER'],
                    metadata: {
                        disbursementId: id,
                        loanId: disbursement.loanId,
                        amount: disbursement.amount,
                        approvedAt: new Date().toISOString(),
                    },
                });
            } catch (error) {
                console.error('Failed to create disbursement approval notification:', error);
            }
        }

        return approved;
    }

    /**
     * Reject disbursement
     */
    async rejectDisbursement(
        id: string,
        input: RejectDisbursementInput,
        userId: string,
        branchId?: string
    ) {
        const disbursement = await this.getDisbursement(id, branchId);

        if (disbursement.status !== DisbursementStatus.PENDING) {
            throw new Error('Can only reject pending disbursements');
        }

        const rejected = await this.disbursementRepository.reject(id, userId, input.reason);

        // 🔔 Send in-app notification to Loan Officer
        const loanData2 = disbursement.loan as any;
        if (loanData2 && loanData2.officerId) {
            try {
                await this.notificationService.createNotification({} as FastifyRequest, {
                    userId: loanData2.officerId,
                    type: 'LOAN_REJECTED',
                    title: `ปฏิเสธการเบิกจ่าย - ${disbursement.loan.customer?.businessName}`,
                    message: `การเบิกจ่ายจำนวน ${Number(disbursement.amount).toLocaleString('th-TH')} บาท ถูกปฏิเสธ เหตุผล: ${input.reason}`,
                    link: `/loans/${disbursement.loanId}`,
                    priority: 'MEDIUM',
                    eventId: `DISBURSEMENT_REJECTED:${id}`,
                    dedupKey: `DISBURSEMENT_REJECTED-${id}`,
                    dedupWindow: 24,
                    audienceRoles: ['OFFICER', 'MANAGER'],
                    metadata: {
                        disbursementId: id,
                        loanId: disbursement.loanId,
                        amount: disbursement.amount,
                        reason: input.reason,
                        rejectedAt: new Date().toISOString(),
                    },
                });
            } catch (error) {
                console.error('Failed to create disbursement rejection notification:', error);
            }
        }

        return rejected;
    }

    /**
     * Execute disbursement (disburse funds)
     */
    async executeDisbursement(
        id: string,
        input: ExecuteDisbursementInput,
        userId: string,
        branchId?: string
    ) {
        const disbursement = await this.getDisbursement(id, branchId);

        if (disbursement.status !== DisbursementStatus.APPROVED) {
            throw new Error('Can only disburse approved disbursements');
        }

        // Auto-generate reference number if not provided
        let referenceNo = input.referenceNo;
        if (!referenceNo) {
            const { ReferenceGenerator } = await import('@utils/calculation/reference-generator.util');
            referenceNo = await ReferenceGenerator.generateDisbursementReference(disbursement.loanId);
        }

        // Execute disbursement
        const updated = await this.disbursementRepository.disburse(
            id,
            userId,
            input.disbursementMethod,
            referenceNo!, // Non-null assertion since we generate it above
            input.notes
        );

        // Update loan's total disbursed and remaining amount
        const loan = await this.loanRepository.findById(disbursement.loanId);
        if (!loan) {
            throw new Error('Loan not found');
        }

        const totalDisbursed = Number(loan.totalDisbursed || 0) + Number(disbursement.amount);
        const principal = Number(loan.principal);
        const remainingAmount = principal - totalDisbursed;

        // Retry on serialization conflict (Postgres error 40001)
        const retryUpdate = async (fn: () => Promise<void>, retries = 3): Promise<void> => {
            for (let i = 0; i < retries; i++) {
                try {
                    await fn();
                    return;
                } catch (err: any) {
                    const isSerializationError = err?.code === 'P2034' || err?.message?.includes('serialize') || err?.message?.includes('40001');
                    if (isSerializationError && i < retries - 1) {
                        await new Promise(r => setTimeout(r, 100 * (i + 1)));
                        continue;
                    }
                    throw err;
                }
            }
        };

        await retryUpdate(() => this.loanRepository.updateDisbursementTracking(disbursement.loanId, {
            totalDisbursed,
            remainingAmount,
        }));

        // ✅ Convert reserved budget to disbursed
        if (loan.loanProductId) {
            const { ProductBudgetService } = await import('@products/services/product-budget.service');
            const budgetService = new ProductBudgetService();

            try {
                await budgetService.disburseBudget(
                    loan.loanProductId,
                    disbursement.loanId,
                    Number(disbursement.amount),
                    loan.branchId
                );
            } catch (error: any) {
                console.error('Failed to update budget on disbursement:', error);
                // Don't throw - budget update failure shouldn't block disbursement
            }
        }

        // ✅ Update loan with disbursement date and maturity date on first disbursement
        if (loan.status === 'APPROVED') {
            const disbursementDate = new Date();

            // Calculate maturity date
            const maturityDate = new Date(disbursementDate);
            maturityDate.setMonth(maturityDate.getMonth() + loan.termMonths);

            await this.loanRepository.update(disbursement.loanId, {
                disbursementDate,
                maturityDate,
            });
        }

        // Update loan status to DISBURSED if first disbursement
        if (loan.status === 'APPROVED') {
            await retryUpdate(() => this.loanRepository.updateStatus(disbursement.loanId, 'DISBURSED'));
        }

        // ✅ Recalculate payment schedule (will use firstPaymentDate and paymentDay from loan)
        // This implements the dynamic principal calculation requirement
        try {
            await dynamicInterestCalculator.recalculatePaymentSchedule(disbursement.loanId);
        } catch (error) {
            console.error('Error recalculating payment schedule:', error);
            // Don't fail the disbursement, but log the error
        }

        // ⭐ Generate and send PDF Disbursement Advice
        let pdfUrl: string | null = null;
        let pdfPassword: string | null = null;
        
        try {
            console.log('🔄 Starting PDF generation for disbursement:', {
                disbursementId: updated.id,
                disbursementNo: updated.disbursementNo,
                loanId: disbursement.loanId,
            });

            // Update status to 'generating'
            const currentConfig = loan.productConfig as any || {};
            await this.disbursementRepository.updateLoanProductConfig(disbursement.loanId, {
                ...currentConfig,
                disbursementPdfStatus: 'generating',
                disbursementPdfError: null,
            });

            const pdfService = new DisbursementPDFService();

            // 1. Get customer password (last 4 digits of thaiId)
            const { EncryptionUtil } = await import('@utils/security/encryption.util');
            const encryptedThaiId = disbursement.loan.customer.thaiId;
            const taxId = disbursement.loan.customer.taxId;

            if (encryptedThaiId) {
                // Decrypt and get last 4 digits — fallback to raw digits if key mismatch
                try {
                    const decryptedId = EncryptionUtil.decrypt(encryptedThaiId);
                    pdfPassword = decryptedId.slice(-4);
                } catch {
                    const digitsOnly = String(encryptedThaiId).replace(/\D/g, '');
                    pdfPassword = digitsOnly.length >= 4 ? digitsOnly.slice(-4) : '0000';
                    logger.warn({ customerId: disbursement.loan.customer.id }, '[DisbursementService] thaiId decrypt failed, using digit fallback for PDF password');
                }
            } else if (taxId) {
                // taxId is plain text; do NOT decrypt
                const digitsOnly = String(taxId).replace(/\D/g, '');
                if (digitsOnly.length < 4) {
                    throw new Error('Customer taxId has insufficient digits for PDF password');
                }
                pdfPassword = digitsOnly.slice(-4);
            } else {
                throw new Error('Customer has no thaiId or taxId for PDF password');
            }

            // 2. Generate PDF
            const pdfBuffer = await pdfService.generateDisbursementAdvice({
                disbursement: updated,
                loan: loan,
                customer: disbursement.loan.customer,
                branch: disbursement.loan.branch,
            });

            // 3. Encrypt PDF
            const encryptedPDF = await pdfService.encryptPDF(pdfBuffer, pdfPassword);

            // 4. Save PDF (temp) then use on-demand URL
            const filename = `disbursement-${updated.disbursementNo}-${Date.now()}.pdf`;
            await pdfService.savePDF(encryptedPDF, filename);

            // Use on-demand route URL instead of static file path (Railway ephemeral FS)
            const baseUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
            pdfUrl = `${baseUrl}/api/disbursements/loans/${disbursement.loanId}/pdf`;

            // Store PDF URL in loan's productConfig with success status
            if (pdfUrl) {
                await this.disbursementRepository.updateLoanProductConfig(disbursement.loanId, {
                    ...currentConfig,
                    disbursementPdfUrl: pdfUrl,
                    disbursementPdfGeneratedAt: new Date().toISOString(),
                    disbursementPdfStatus: 'success',
                    disbursementPdfError: null,
                    disbursementPdfRetryCount: 0,
                });
            }
        } catch (pdfError: any) {
            logger.error({ err: pdfError, disbursementId: updated.id }, 'Failed to generate disbursement PDF');
            
            const currentConfig = loan.productConfig as any || {};
            const retryCount = (currentConfig.disbursementPdfRetryCount || 0) + 1;
            
            await this.disbursementRepository.updateLoanProductConfig(disbursement.loanId, {
                ...currentConfig,
                disbursementPdfStatus: 'failed',
                disbursementPdfError: pdfError.message,
                disbursementPdfRetryCount: retryCount,
            });
        }

        // Send LINE notification (with or without PDF)
        try {
            if (pdfUrl && pdfPassword) {
                await loanStatusNotification.notifyLoanDisbursedWithPDF(
                    disbursement.loanId,
                    Number(disbursement.amount),
                    referenceNo!,
                    pdfUrl,
                    pdfPassword
                );
            } else {
                await loanStatusNotification.notifyLoanDisbursed(
                    disbursement.loanId,
                    Number(disbursement.amount),
                    referenceNo!
                );
            }
        } catch (notificationError: any) {
            logger.error({ err: notificationError, disbursementId: updated.id }, 'Failed to send LINE notification');
        }

        return updated;
    }

    /**
     * Cancel disbursement
     */
    async cancelDisbursement(id: string, branchId?: string) {
        const disbursement = await this.getDisbursement(id, branchId);

        if (
            disbursement.status !== DisbursementStatus.PENDING &&
            disbursement.status !== DisbursementStatus.APPROVED
        ) {
            throw new Error('Can only cancel pending or approved disbursements');
        }

        return this.disbursementRepository.updateStatus(id, DisbursementStatus.CANCELLED);
    }

    /**
     * Get disbursements by loan ID
     */
    async getDisbursementsByLoan(loanId: string, branchId?: string) {
        const loan = await this.loanRepository.findById(loanId);
        if (!loan) {
            throw new Error('Loan not found');
        }

        if (branchId && loan.branchId !== branchId) {
            throw new Error('Loan not found');
        }

        return this.disbursementRepository.findByLoanId(loanId);
    }

    /**
     * Get disbursement summary for a loan
     */
    async getDisbursementSummary(loanId: string, branchId?: string) {
        const loan = await this.loanRepository.findById(loanId);
        if (!loan) {
            throw new Error('Loan not found');
        }

        if (branchId && loan.branchId !== branchId) {
            throw new Error('Loan not found');
        }

        const disbursements = await this.disbursementRepository.findByLoanId(loanId);

        const principal = Number(loan.principal);
        const totalDisbursed = Number(loan.totalDisbursed || 0);
        const remainingAmount = Number(loan.remainingAmount || principal);

        const pending = disbursements.filter((d) => d.status === DisbursementStatus.PENDING).length;
        const approved = disbursements.filter((d) => d.status === DisbursementStatus.APPROVED)
            .length;
        const disbursed = disbursements.filter((d) => d.status === DisbursementStatus.DISBURSED)
            .length;
        const rejected = disbursements.filter((d) => d.status === DisbursementStatus.REJECTED)
            .length;

        const nextDisbursement = disbursements.find(
            (d) =>
                d.status === DisbursementStatus.APPROVED &&
                d.nextDisbursementDate &&
                new Date(d.nextDisbursementDate) > new Date()
        );

        return {
            loanId,
            principal,
            totalDisbursed,
            remainingAmount,
            disbursementPercentage: (totalDisbursed / principal) * 100,
            totalDisbursements: disbursements.length,
            pending,
            approved,
            disbursed,
            rejected,
            nextDisbursementDate: nextDisbursement?.nextDisbursementDate || null,
            disbursements,
        };
    }

    /**
     * Get disbursement statistics
     */
    async getStats(query: DisbursementStatsQuery, branchId?: string) {
        const params: any = {
            branchId: branchId || query.branchId || undefined,
        };

        if (query.dateFrom) {
            params.dateFrom = new Date(query.dateFrom);
        }
        if (query.dateTo) {
            params.dateTo = new Date(query.dateTo);
        }

        return this.disbursementRepository.getStats(params);
    }

    /**
     * Delete disbursement
     */
    async deleteDisbursement(id: string, branchId?: string) {
        const disbursement = await this.getDisbursement(id, branchId);

        // Only allow deletion of PENDING or REJECTED disbursements
        if (
            disbursement.status !== DisbursementStatus.PENDING &&
            disbursement.status !== DisbursementStatus.REJECTED
        ) {
            throw new Error('Can only delete pending or rejected disbursements');
        }

        await this.disbursementRepository.delete(id);
        return { success: true };
    }

    async regenerateContractPdfForLoan(loanId: string, userId: string, branchId?: string) {
        const loan = await this.disbursementRepository.findLoanWithRelations(loanId);

        if (!loan) {
            throw new Error('Loan not found');
        }

        if (branchId && loan.branchId !== branchId) {
            throw new Error('Loan not found');
        }

        const latestDisbursement = await this.disbursementRepository.findLatestDisbursedByLoanId(loanId);

        // If no DISBURSED record, try any disbursement record (APPROVED, PENDING)
        const effectiveDisbursement = latestDisbursement || await this.disbursementRepository.findAnyDisbursementByLoanId(loanId);

        // Build effective disbursement — use real record or synthetic from loan data
        const disbursementForPdf = effectiveDisbursement || {
            id: `synthetic-${loanId}`,
            loanId,
            disbursementNo: loan.contract_number || `LOAN-${loanId.substring(0, 8)}`,
            amount: loan.principal,
            status: 'DISBURSED',
            disbursedAt: loan.createdAt || new Date(),
            referenceNo: loan.contract_number || '',
        };

        // Update status to 'generating'
        const currentConfig = (loan.productConfig as any) || {};
        await this.disbursementRepository.updateLoanProductConfig(loanId, {
            ...currentConfig,
            disbursementPdfStatus: 'generating',
            disbursementPdfError: null,
        });

        try {
            const pdfService = new DisbursementPDFService();

            const { EncryptionUtil } = await import('@utils/security/encryption.util');
            const encryptedThaiId = (loan.customer as any).thaiId;
            const taxId = (loan.customer as any).taxId;
            let pdfPassword: string;

            if (encryptedThaiId) {
                try {
                    const decryptedId = EncryptionUtil.decrypt(encryptedThaiId);
                    pdfPassword = decryptedId.slice(-4);
                } catch {
                    const digitsOnly = String(encryptedThaiId).replace(/\D/g, '');
                    pdfPassword = digitsOnly.length >= 4 ? digitsOnly.slice(-4) : '0000';
                }
            } else if (taxId) {
                const digitsOnly = String(taxId).replace(/\D/g, '');
                pdfPassword = digitsOnly.length >= 4 ? digitsOnly.slice(-4) : '0000';
            } else {
                pdfPassword = loanId.replace(/-/g, '').slice(-4);
            }

            const pdfBuffer = await pdfService.generateDisbursementAdvice({
                disbursement: disbursementForPdf,
                loan,
                customer: loan.customer,
                branch: loan.branch,
            });

            const encryptedPDF = await pdfService.encryptPDF(pdfBuffer, pdfPassword);
            const filename = `disbursement-${disbursementForPdf.disbursementNo}-${Date.now()}.pdf`;
            await pdfService.savePDF(encryptedPDF, filename);
            // Use on-demand route URL (Railway ephemeral FS — static files don't persist)
            const baseUrl = (process.env.BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
            const pdfUrl = `${baseUrl}/api/disbursements/loans/${loanId}/pdf`;

            // Update with success status
            await this.disbursementRepository.updateLoanProductConfig(loanId, {
                ...currentConfig,
                disbursementPdfUrl: pdfUrl,
                disbursementPdfGeneratedAt: new Date().toISOString(),
                disbursementPdfStatus: 'success',
                disbursementPdfError: null,
                disbursementPdfRetryCount: 0,
                contractPdfRegeneratedBy: userId,
            });

            // Send LINE notification with PDF
            try {
                // Check if this is triggered by LINE webhook (user requested)
                const isLineTriggered = userId === 'system-line-webhook';
                
                if (isLineTriggered) {
                    // Send custom message for LINE-triggered generation
                    const loan = await this.disbursementRepository.findLoanWithCustomerLine(loanId);

                    if (loan) {
                        const lineUserId = loan.customer.lineUserId || loan.customer.user?.lineUserId;
                        
                        if (lineUserId) {
                            const contractNumber = loan.contract_number || 'ของคุณ';
                            const { lineNotificationQueue } = await import('@line/services/messaging/line-notification-queue.service');
                            
                            // Send success message with PDF link
                            await lineNotificationQueue.enqueue(
                                lineUserId,
                                {
                                    type: 'text',
                                    text: `✅ ใบสัญญาเงินกู้ ${contractNumber} พร้อมแล้ว!\n\n📄 กรุณากดปุ่ม "สัญญา" อีกครั้งเพื่อดูเอกสาร`
                                },
                                'high'
                            );
                            
                            logger.info({ loanId, lineUserId }, 'Sent PDF ready notification to LINE user');
                        }
                    }
                } else {
                    // Normal notification for staff-triggered regeneration
                    await loanStatusNotification.notifyLoanDisbursedWithPDF(
                        loanId,
                        Number(latestDisbursement.amount),
                        latestDisbursement.referenceNo || '',
                        pdfUrl,
                        pdfPassword
                    );
                }
                
                console.log('✅ LINE notification sent successfully');
            } catch (notificationError) {
                console.error('❌ Failed to send LINE notification:', notificationError);
                // Don't fail the regeneration
            }

            return {
                success: true,
                pdfUrl,
                message: 'PDF regenerated successfully',
            };
        } catch (error: any) {
            // Update status to 'failed'
            const retryCount = (currentConfig.disbursementPdfRetryCount || 0) + 1;
            await this.disbursementRepository.updateLoanProductConfig(loanId, {
                ...currentConfig,
                disbursementPdfStatus: 'failed',
                disbursementPdfError: error.message,
                disbursementPdfRetryCount: retryCount,
            });

            throw error;
        }
    }
}
