import { FastifyRequest } from 'fastify';
import { LoanRepository } from '../repositories/loan.repository';
import { PaymentScheduleRepository } from '@payments/repositories/payment-schedule.repository';
import { ProductConfigRepository } from '@config-mgmt/repositories/product-config.repository';
import { SystemConfigRepository } from '@config-mgmt/repositories/system-config.repository';
import { CustomerRepository } from '@customers/repositories/customer.repository';
import { BranchRepository } from '@branches/repositories/branch.repository';
import { calculateDSCR, generatePaymentSchedule } from '@utils/calculation/calculation.util';
import { CreateLoanInput, ApproveLoanInput, RejectLoanInput } from '../models/loan.model';
import { QueueUtil } from '@utils/common/queue.util';
import { loanStatusNotification } from '@notifications/services/loan-status-notification.service';
import { notificationHelper } from '@notifications/services/notification-helper.service';
import { prisma } from '@config/database.config';
import { Prisma } from '@prisma/client';
import { withRetryAndJitter } from '@utils/common/retry.util';
import { DisbursementRepository } from '@disbursements/repositories/disbursement.repository';
import { computeCreditAssessment } from '../../collections/utils/credit-assessment.util';

/**
 * Determine required approval level based on loan amount
 * ≤ 500,000 THB: OFFICER only
 * 500,001 - 2,000,000 THB: OFFICER + MANAGER
 * > 2,000,000 THB: OFFICER + MANAGER + HQ
 */
function getRequiredApprovalLevel(loanAmount: number): 'OFFICER' | 'MANAGER' | 'HQ' {
    if (loanAmount <= 500000) {
        return 'OFFICER';
    } else if (loanAmount <= 2000000) {
        return 'MANAGER';
    } else {
        return 'HQ';
    }
}

/**
 * Loan Service - Business logic ONLY
 * Orchestrates repositories and handles business rules
 */
export class LoanService {
    private loanRepository: LoanRepository;
    private paymentScheduleRepository: PaymentScheduleRepository;
    private disbursementRepository: DisbursementRepository;
    private productConfigRepository: ProductConfigRepository;
    private systemConfigRepository: SystemConfigRepository;
    private customerRepository: CustomerRepository;
    private branchRepository: BranchRepository;

    constructor() {
        this.loanRepository = new LoanRepository();
        this.paymentScheduleRepository = new PaymentScheduleRepository();
        this.disbursementRepository = new DisbursementRepository();
        this.productConfigRepository = new ProductConfigRepository();
        this.systemConfigRepository = new SystemConfigRepository();
        this.customerRepository = new CustomerRepository();
        this.branchRepository = new BranchRepository();
    }

    /**
     * Calculate actual interest rate from loan product configuration
     * Handles FIXED, VARIABLE, and TIERED interest rate types
     */
    private async calculateInterestRateFromProduct(
        loanProductId: string,
        termMonths: number,
        loanAmount: number
    ): Promise<number> {
        const { prisma } = await import('@config/database.config');
        const { InterestRateService } = await import('@loans/calculators/interest-rate.service');
        const interestRateService = new InterestRateService();

        // Fetch loan product with tiers
        const loanProduct = await prisma.loanProduct.findUnique({
            where: { id: loanProductId },
            include: {
                yearInterestTiers: {
                    orderBy: { startYear: 'asc' }
                },
                interestRateTiers: {
                    where: { status: 'ACTIVE' },
                    orderBy: { minAmount: 'asc' }
                }
            }
        });

        if (!loanProduct) {
            throw new Error('Loan product not found');
        }

        // Handle based on interest rate type
        switch (loanProduct.interestRateType) {
            case 'FIXED': {
                // For FIXED rates, use the simple year-based rate
                // Year 1-3: use interestRateYear1_3
                // Year 4+: use interestRateYear4Plus
                const years = Math.ceil(termMonths / 12);

                if (years <= 3 && loanProduct.interestRateYear1_3) {
                    return Number(loanProduct.interestRateYear1_3);
                } else if (years > 3 && loanProduct.interestRateYear4Plus) {
                    return Number(loanProduct.interestRateYear4Plus);
                } else if (loanProduct.interestRateYear1_3) {
                    // Fallback to year 1-3 rate
                    return Number(loanProduct.interestRateYear1_3);
                }

                throw new Error('No fixed interest rate configured for this product');
            }

            case 'VARIABLE': {
                // For VARIABLE rates, resolve the formula using MLR/MRR
                if (!loanProduct.interestRateFormula) {
                    throw new Error('No interest rate formula configured for variable rate product');
                }

                // Calculate rate from formula (e.g., "MLR + 1.5%")
                const calculatedRate = await interestRateService.calculateRateFromFormula(
                    loanProduct.interestRateFormula
                );

                return calculatedRate;
            }

            case 'TIERED': {
                // For TIERED rates, determine which tier applies

                // First check year-based tiers
                if (loanProduct.yearInterestTiers && loanProduct.yearInterestTiers.length > 0) {
                    // Use the first year's tier for initial rate
                    const firstYearTier = loanProduct.yearInterestTiers.find(
                        tier => tier.startYear === 1
                    );

                    if (firstYearTier) {
                        if (firstYearTier.tierType === 'FIXED' && firstYearTier.rate) {
                            return Number(firstYearTier.rate);
                        } else if (firstYearTier.tierType === 'VARIABLE' && firstYearTier.formula) {
                            // Resolve variable formula
                            const calculatedRate = await interestRateService.calculateRateFromFormula(
                                firstYearTier.formula
                            );
                            return calculatedRate;
                        }
                    }
                }

                // Fallback to amount-based tiers
                if (loanProduct.interestRateTiers && loanProduct.interestRateTiers.length > 0) {
                    // Find the tier that matches the loan amount
                    const applicableTier = loanProduct.interestRateTiers.find(tier => {
                        const minAmount = Number(tier.minAmount);
                        const maxAmount = tier.maxAmount ? Number(tier.maxAmount) : Infinity;
                        return loanAmount >= minAmount && loanAmount <= maxAmount;
                    });

                    if (applicableTier) {
                        return Number(applicableTier.interestRate);
                    }

                    // If no tier matches, use the highest tier
                    const highestTier = loanProduct.interestRateTiers[loanProduct.interestRateTiers.length - 1];
                    if (highestTier) {
                        return Number(highestTier.interestRate);
                    }
                }

                throw new Error('No applicable interest rate tier found for this loan amount and duration');
            }

            case 'MIXED': {
                // For MIXED rates, use year 1-3 rate initially
                // The rate will change over time based on year-based tiers
                const years = Math.ceil(termMonths / 12);

                if (years <= 3 && loanProduct.interestRateYear1_3) {
                    // Year 1-3: use fixed rate
                    return Number(loanProduct.interestRateYear1_3);
                } else if (years > 3) {
                    // Year 4+: use variable rate or fixed rate
                    if (loanProduct.interestRateFormula) {
                        // Calculate from formula (e.g., "MLR + 1.0%")
                        const calculatedRate = await interestRateService.calculateRateFromFormula(
                            loanProduct.interestRateFormula
                        );
                        return calculatedRate;
                    } else if (loanProduct.interestRateYear4Plus) {
                        // Use fixed rate for year 4+
                        return Number(loanProduct.interestRateYear4Plus);
                    }
                }

                // Fallback to year 1-3 rate
                if (loanProduct.interestRateYear1_3) {
                    return Number(loanProduct.interestRateYear1_3);
                }

                throw new Error('No interest rate configured for MIXED rate product');
            }

            default:
                throw new Error(`Unsupported interest rate type: ${loanProduct.interestRateType}`);
        }
    }

    /**
     * Create loan with DSCR calculation and payment schedule
     * Uses queue to prevent race conditions
     */
    async createLoan(
        _request: FastifyRequest,
        input: CreateLoanInput,
        branchId: string,
        officerId: string
    ) {
        // Validate branch access
        const branch = await this.branchRepository.findById(branchId);
        if (!branch) {
            throw new Error('Branch not found');
        }

        // Validate customer exists and belongs to branch
        const customer = await this.customerRepository.findById(input.customerId, branchId);
        if (!customer) {
            throw new Error('Customer not found or does not belong to this branch');
        }

        // 🔴 CRITICAL CHECK 1: Blacklist Customer Check
        if (customer.status && (customer.status as string).toLowerCase() === 'blacklisted') {
            throw new Error('CUSTOMER_BLACKLISTED');
        }

        // 🔴 CRITICAL CHECK 2: Duplicate Loan Detection
        const existingLoans = await this.loanRepository.list({
            customerId: input.customerId,
            branchId,
            page: 1,
            limit: 100,
        });
        const pendingLoans = existingLoans.loans?.filter(
            (loan: any) => loan.status === 'PENDING_APPROVAL'
        ) || [];
        if (pendingLoans.length > 0) {
            const existingLoanId = pendingLoans[0]?.id;
            const error = new Error('DUPLICATE_LOAN_APPLICATION');
            (error as any).existingLoanId = existingLoanId; // Attach loan ID for frontend
            throw error;
        }

        // Get product config if specified
        let productConfig = null;
        if (input.productConfigId) {
            productConfig = await this.productConfigRepository.findActiveById(input.productConfigId);
            if (!productConfig) {
                throw new Error('Product configuration not found or inactive');
            }
        }

        // 🔴 CRITICAL CHECK 3: Budget Exceeded Check
        if (input.loanProductId) {
            const { ProductBudgetService } = await import('@products/services/product-budget.service');
            const budgetService = new ProductBudgetService();

            const budgetCheck = await budgetService.checkBudgetAvailability(
                input.loanProductId,
                Number(input.principal)
                // fiscalYear and quarter are optional, will use current if not provided
            );

            if (!budgetCheck.available) {
                throw new Error('BUDGET_EXCEEDED');
            }
        }

        // Calculate actual interest rate from loan product if specified
        let actualInterestRate = input.interestRate;
        if (input.loanProductId) {
            actualInterestRate = await this.calculateInterestRateFromProduct(
                input.loanProductId,
                input.termMonths,
                Number(input.principal)
            );
        }

        // Calculate DSCR (Monthly basis)
        const dscrResult = calculateDSCR({
            monthlyRevenue: input.annualRevenue / 12, // Convert annual to monthly
            monthlyCogs: input.annualCogs / 12,       // Convert annual to monthly
            monthlyOpex: input.annualOpex / 12,       // Convert annual to monthly
            loanAmount: Number(input.principal),
            interestRate: actualInterestRate, // Use calculated rate from product
            durationMonths: input.termMonths,
        });

        // Check DSCR threshold (from config, not hardcoded)
        const minDSCR = parseFloat(
            await this.systemConfigRepository.getValue('loan.min_dscr', '1.2')
        );

        if (dscrResult.dscr < minDSCR && dscrResult.status === 'risk') {
            throw new Error(
                `DSCR ${dscrResult.dscr} is below minimum threshold ${minDSCR}. ${dscrResult.recommendation}`
            );
        }

        // Use queue to prevent race conditions when creating loan
        const queue = QueueUtil.getQueue('loan-create');
        const job = await queue.add('create', {
            input: {
                ...input,
                interestRate: actualInterestRate, // Override with calculated rate
            },
            branchId,
            officerId,
            dscrResult,
            productConfig: productConfig ? productConfig.config : null,
        });

        // Wait for job completion (with timeout)
        const result = await QueueUtil.waitForJob(job.id!, 30000); // 30 seconds timeout

        if (result.failed) {
            throw new Error(result.error || 'Failed to create loan');
        }

        return result.data;
    }

    /**
     * Process loan creation (called by queue worker)
     */
    async processLoanCreation(data: {
        input: CreateLoanInput;
        branchId: string;
        officerId: string;
        dscrResult: any;
        productConfig: any;
    }) {
        const { input, branchId, officerId, dscrResult, productConfig } = data;

        console.log('[Loan Creation] Processing loan with data:', {
            customerId: input.customerId,
            loanProductId: input.loanProductId,
            principal: input.principal,
            termMonths: input.termMonths,
        });

        // Determine required approval level based on loan amount
        const approvalLevel = getRequiredApprovalLevel(Number(input.principal));

        // Generate contract number using SME D Bank standard format
        const { ContractNumberService } = await import('@shared/repositories/contract-number.service');
        const contractNumber = await ContractNumberService.generateContractNumber(
            branchId,
            input.loanProductId
        );

        // Create loan
        const loan = await this.loanRepository.create({
            customerId: input.customerId,
            branchId,
            officerId,
            contractNumber, // Add contract number
            principal: input.principal,
            interestRate: input.interestRate,
            termMonths: input.termMonths,
            paymentDay: input.paymentDay || 1, // Default to 1st of month
            firstPaymentDate: input.firstPaymentDate ? new Date(input.firstPaymentDate) : undefined,
            dscr: dscrResult.dscr,
            dscrStatus: dscrResult.status,
            monthlyPayment: dscrResult.monthlyPayment,
            totalInterest: dscrResult.monthlyPayment * input.termMonths - input.principal,
            productConfigId: input.productConfigId || undefined,
            productConfig: productConfig,
            loanProductId: input.loanProductId || undefined, // ✅ Add loan product ID
            approvalLevel,
        });

        console.log('[Loan Creation] Loan created successfully:', {
            loanId: loan.id,
            contractNumber: loan.contract_number,
            loanProductId: loan.loanProductId,
        });

        // Generate payment schedule
        const disbursementDate = new Date(); // Will be updated when approved
        const paymentSchedule = generatePaymentSchedule({
            loanAmount: input.principal,
            interestRate: input.interestRate,
            durationMonths: input.termMonths,
            disbursementDate,
            paymentDay: input.paymentDay,
        });

        // Save payment schedules
        await this.paymentScheduleRepository.createMany(
            paymentSchedule.map((s) => ({
                loanId: loan.id,
                paymentNumber: s.paymentNumber,
                paymentDate: s.paymentDate,
                principalAmount: s.principalAmount,
                interestAmount: s.interestAmount,
                totalPayment: s.totalPayment,
                remainingBalance: s.remainingBalance,
            }))
        );

        // Get loan with relations
        const loanWithDetails = await this.loanRepository.findById(loan.id);

        // 🔔 Send notification to branch manager for approval
        try {
            const { prisma } = await import('@config/database.config');
            const customer = await this.customerRepository.findById(input.customerId);
            const officer = await prisma.user.findUnique({
                where: { id: officerId },
                select: { firstName: true, lastName: true },
            });

            if (customer && officer) {
                await notificationHelper.sendLoanApprovalRequest({
                    loanId: loan.id,
                    branchId,
                    customerName: customer.businessName,
                    amount: input.principal,
                    officerName: `${officer.firstName} ${officer.lastName}`,
                });
            }
        } catch (error) {
            console.error('Failed to send loan approval request notification:', error);
            // Don't throw - notification failure shouldn't block loan creation
        }

        return {
            loan: loanWithDetails,
            dscr: dscrResult,
            schedule: paymentSchedule.slice(0, 5), // Return first 5 payments as preview
        };
    }

    /**
     * Get loan by ID
     */
    async getLoan(loanId: string, branchId?: string) {
        const loan = await this.loanRepository.findById(loanId, branchId);
        if (!loan) {
            throw new Error('Loan not found');
        }

        // Get payment schedule
        const schedule = await this.paymentScheduleRepository.findByLoanId(loanId);

        // Derive next-payment + overdueDays from payment_schedules (source of truth)
        const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const msPerDay = 1000 * 60 * 60 * 24;
        const today = startOfDay(new Date());

        const pending = (schedule || [])
            .filter((s: any) => ['UNPAID', 'PARTIAL', 'OVERDUE'].includes(String(s.status || '').toUpperCase()))
            .sort((a: any, b: any) => Number(a.paymentNumber || 0) - Number(b.paymentNumber || 0))[0];

        const nextPaymentDate = pending?.paymentDate ? new Date(pending.paymentDate) : null;
        const derivedOverdueDays =
            nextPaymentDate && startOfDay(nextPaymentDate).getTime() < today.getTime()
                ? Math.max(0, Math.floor((today.getTime() - startOfDay(nextPaymentDate).getTime()) / msPerDay))
                : 0;

        // Schedule history signals (no schema changes)
        let overdueInstallmentsCount = 0;
        let delinquencyCount = 0;
        let maxDpd = 0;
        let paidInstallmentsCount = 0;
        let onTimePaidCount = 0;
        let prepaidInstallmentsCount = 0;

        for (const row of schedule || []) {
            const due = startOfDay(new Date(row.paymentDate));
            const status = String(row.status || '').toUpperCase();
            const isUnpaid = ['UNPAID', 'PARTIAL', 'OVERDUE'].includes(status);
            const isPaid = status === 'PAID';
            const isPastDue = due.getTime() < today.getTime();

            const dpdStored =
                typeof (row as any).daysOverdue === 'number' && Number.isFinite((row as any).daysOverdue)
                    ? Math.max(0, Math.floor((row as any).daysOverdue))
                    : 0;
            let dpd = 0;

            if (isPaid) {
                if (row.paidAt) {
                    const paidAt = startOfDay(new Date(row.paidAt));
                    dpd = Math.max(0, Math.floor((paidAt.getTime() - due.getTime()) / msPerDay));
                } else {
                    dpd = dpdStored;
                }
            } else if (isUnpaid && isPastDue) {
                const dpdComputed = Math.max(0, Math.floor((today.getTime() - due.getTime()) / msPerDay));
                dpd = Math.max(dpdComputed, dpdStored);
            }

            if (isUnpaid && isPastDue) overdueInstallmentsCount += 1;
            if (dpd > 0) delinquencyCount += 1;
            if (dpd > maxDpd) maxDpd = dpd;

            if (isPaid) {
                paidInstallmentsCount += 1;
                if (row.paidAt) {
                    const paidAt = startOfDay(new Date(row.paidAt));
                    if (paidAt.getTime() <= due.getTime()) onTimePaidCount += 1;
                }
                if (due.getTime() > today.getTime()) prepaidInstallmentsCount += 1;
            }
        }

        // Credit bureau (latest snapshot)
        const customerId = (loan as any).customerId as string | undefined;
        const ncb = customerId
            ? await prisma.customerCreditBureau.findFirst({
                  where: { customerId },
                  orderBy: [{ createdAt: 'desc' }],
                  select: { nplStatus: true, totalLimit: true, totalOutstanding: true },
              })
            : null;

        const limit = ncb?.totalLimit ? Number(ncb.totalLimit) : 0;
        const outstanding = ncb?.totalOutstanding ? Number(ncb.totalOutstanding) : 0;
        const creditUtilization = limit > 0 ? Math.min(100, Math.max(0, (outstanding / limit) * 100)) : undefined;

        const daysUntilDue = nextPaymentDate
            ? Math.floor((startOfDay(nextPaymentDate).getTime() - today.getTime()) / msPerDay)
            : 0;

        const customer = (loan as any).customer || {};
        const credit = computeCreditAssessment({
            daysUntilDue,
            loanOverdueDays: derivedOverdueDays,
            scheduleStatus: pending?.status || undefined,
            loanStatus: (loan as any).status,
            overdueInstallmentsCount,
            delinquencyCount,
            maxDpd,
            paidInstallmentsCount,
            onTimePaidCount,
            prepaidInstallmentsCount,
            dscr: (loan as any).dscr ? Number((loan as any).dscr) : undefined,
            nplStatus: ncb?.nplStatus ?? undefined,
            creditUtilization,
            industryCode: customer.industry_code || undefined,
            businessAge: customer.business_age_years ?? undefined,
        });

        return {
            ...loan,
            overdueDays: derivedOverdueDays,
            nextPaymentDate,
            nextPaymentAmount: pending?.totalPayment ?? null,
            creditGrade: credit.grade,
            creditScore: credit.score,
            creditReasons: credit.reasons,
            creditNextActions: credit.nextActions,
            paymentSchedule: schedule,
        };
    }

    /**
     * List loans with pagination
     */
    async listLoans(params: {
        branchId?: string;
        officerId?: string; // Add officerId parameter
        page: number;
        limit: number;
        status?: string;
        customerId?: string;
        search?: string;
    }) {
        console.log('=== Loan Service listLoans ===');
        console.log('Params:', params);
        
        // ✅ Try to get from cache first (with error handling)
        // TEMPORARILY DISABLE CACHE FOR DEBUGGING
        /*
        try {
            const cacheKey = CacheUtil.loanListKey(params);
            const cached = await CacheUtil.get(cacheKey);
            
            if (cached) {
                console.log('Returning cached result');
                return cached;
            }
        } catch (error) {
            // Cache error - continue without cache
            console.warn('[Cache] Failed to get loan list from cache:', error);
        }
        */
        
        const result = await this.loanRepository.list(params);

        // ✅ Ensure Active Contracts is consistent:
        // Derive nextPaymentDate/nextPaymentAmount/overdueDays from PaymentSchedule + current outstandingBalance.
        // This prevents stale overdueDays/nextPayment fields from showing wrong status after payments or migrations.
        const now = new Date();
        const msPerDay = 1000 * 60 * 60 * 24;
        const calcMonthlyPayment = (principal: number, monthlyRate: number, months: number) => {
            if (months <= 0) return 0;
            if (monthlyRate === 0) return principal / months;
            const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, months);
            const denominator = Math.pow(1 + monthlyRate, months) - 1;
            return denominator === 0 ? principal : numerator / denominator;
        };

        const loansWithDerived = await Promise.all(
            (result?.loans || []).map(async (loan: any) => {
	                try {
	                    const pending = await prisma.paymentSchedule.findFirst({
	                        where: {
	                            loanId: loan.id,
	                            status: { in: ['UNPAID', 'OVERDUE'] },
	                        },
	                        orderBy: { paymentNumber: 'asc' },
	                        select: {
	                            paymentNumber: true,
	                            paymentDate: true,
	                            status: true,
	                        },
	                    });

                    const outstanding = Number(loan.outstandingBalance || 0);
                    const interestRate = Number(loan.interestRate || 0);
                    const monthlyRate = interestRate / 100 / 12;

	                    if (!pending || outstanding <= 0) {
	                        return {
	                            ...loan,
	                            overdueDays: 0,
	                            nextPaymentDate: null,
	                            nextPaymentAmount: null,
	                            nextPaymentScheduleStatus: null,
	                        };
	                    }

                    const derivedOverdueDays =
                        pending.paymentDate.getTime() < now.getTime()
                            ? Math.max(0, Math.floor((now.getTime() - pending.paymentDate.getTime()) / msPerDay))
                            : 0;

                    const remainingMonths = Math.max(1, Number(loan.termMonths || 1) - (pending.paymentNumber - 1));
                    const monthlyPayment = calcMonthlyPayment(outstanding, monthlyRate, remainingMonths);
                    const interestAmount = outstanding * monthlyRate;
                    const principalAmount = Math.min(Math.max(0, monthlyPayment - interestAmount), outstanding);
                    const totalPayment = Math.max(0, interestAmount + principalAmount);

	                    return {
	                        ...loan,
	                        overdueDays: derivedOverdueDays,
	                        nextPaymentDate: pending.paymentDate,
	                        nextPaymentAmount: totalPayment,
	                        nextPaymentScheduleStatus: pending.status,
	                    };
	                } catch (error) {
	                    // Fail-safe: never break list endpoint due to schedule calculation issues
	                    return loan;
	                }
            })
	        );

	        // Attach credit assessment for Active Contracts (uses only data already in DB)
	        const uniqueCustomerIds = Array.from(
	            new Set((loansWithDerived || []).map((l: any) => l.customerId).filter(Boolean))
	        ) as string[];

		        const loanIds = Array.from(new Set((loansWithDerived || []).map((l: any) => l.id).filter(Boolean))) as string[];
		        const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
		        const today = startOfDay(new Date());

		        // Pull schedule history signals from payment_schedules (no schema changes)
		        const scheduleRows =
	            loanIds.length > 0
	                ? await prisma.paymentSchedule.findMany({
	                      where: { loanId: { in: loanIds } },
	                      select: {
	                          loanId: true,
	                          paymentDate: true,
	                          status: true,
	                          paidAt: true,
	                          daysOverdue: true,
	                      },
	                  })
	                : [];

		        const scheduleSignalsByLoan = new Map<
		            string,
		            {
		                overdueInstallmentsCount: number;
		                delinquencyCount: number;
		                maxDpd: number;
		                paidInstallmentsCount: number;
		                onTimePaidCount: number;
		                prepaidInstallmentsCount: number;
		            }
		        >();

		        for (const row of scheduleRows) {
		            const existing = scheduleSignalsByLoan.get(row.loanId) || {
		                overdueInstallmentsCount: 0,
		                delinquencyCount: 0,
		                maxDpd: 0,
		                paidInstallmentsCount: 0,
		                onTimePaidCount: 0,
		                prepaidInstallmentsCount: 0,
		            };

		            const due = startOfDay(new Date(row.paymentDate));
		            const status = String(row.status || '').toUpperCase();
		            const isUnpaid = ['UNPAID', 'PARTIAL', 'OVERDUE'].includes(status);
		            const isPaid = status === 'PAID';
		            const isPastDue = due.getTime() < today.getTime();

		            const dpdStored = typeof row.daysOverdue === 'number' ? Math.max(0, row.daysOverdue) : 0;
		            let dpd = 0;

		            // IMPORTANT: For PAID schedules, do NOT compute DPD from "today" (that would grow forever and be wrong).
		            // Use paidAt (or stored daysOverdue) as the lateness signal.
		            if (isPaid) {
		                if (row.paidAt) {
		                    const paidAt = startOfDay(new Date(row.paidAt));
		                    dpd = Math.max(0, Math.floor((paidAt.getTime() - due.getTime()) / msPerDay));
		                } else {
		                    dpd = dpdStored;
		                }
		            } else if (isUnpaid && isPastDue) {
		                const dpdComputed = Math.max(0, Math.floor((today.getTime() - due.getTime()) / msPerDay));
		                dpd = Math.max(dpdComputed, dpdStored);
		            }

		            if (isUnpaid && isPastDue) {
		                existing.overdueInstallmentsCount += 1;
		            }

		            if (dpd > 0) {
		                existing.delinquencyCount += 1;
		            }

		            if (dpd > existing.maxDpd) {
		                existing.maxDpd = dpd;
		            }

		            if (isPaid) {
		                existing.paidInstallmentsCount += 1;
		                if (row.paidAt) {
		                    const paidAt = startOfDay(new Date(row.paidAt));
		                    if (paidAt.getTime() <= due.getTime()) {
		                        existing.onTimePaidCount += 1;
		                    }
		                }
		                if (due.getTime() > today.getTime()) {
		                    existing.prepaidInstallmentsCount += 1;
		                }
		            }

		            scheduleSignalsByLoan.set(row.loanId, existing);
		        }

	        const ncbRows =
	            uniqueCustomerIds.length > 0
	                ? await prisma.customerCreditBureau.findMany({
	                      where: { customerId: { in: uniqueCustomerIds } },
	                      orderBy: [{ createdAt: 'desc' }],
	                      select: {
	                          customerId: true,
	                          nplStatus: true,
	                          totalLimit: true,
	                          totalOutstanding: true,
	                      },
	                  })
	                : [];

	        const ncbByCustomer = new Map<string, { nplStatus: boolean; creditUtilization?: number }>();
	        for (const row of ncbRows) {
	            if (ncbByCustomer.has(row.customerId)) continue; // keep latest row (createdAt desc)
	            const limit = row.totalLimit ? Number(row.totalLimit) : 0;
	            const outstanding = row.totalOutstanding ? Number(row.totalOutstanding) : 0;
	            const creditUtilization = limit > 0 ? Math.min(100, Math.max(0, (outstanding / limit) * 100)) : undefined;
	            ncbByCustomer.set(row.customerId, { nplStatus: Boolean(row.nplStatus), creditUtilization });
	        }

		        const loansWithCredit = (loansWithDerived || []).map((loan: any) => {
		            const nextDate: Date | null = loan.nextPaymentDate ? new Date(loan.nextPaymentDate) : null;
		            const daysUntilDue = nextDate ? Math.floor((startOfDay(nextDate).getTime() - today.getTime()) / msPerDay) : 0;

	            const ncb = loan.customerId ? ncbByCustomer.get(loan.customerId) : undefined;
	            const customer = loan.customer || {};
		            const scheduleSignals = scheduleSignalsByLoan.get(loan.id) || {
		                overdueInstallmentsCount: 0,
		                delinquencyCount: 0,
		                maxDpd: 0,
		                paidInstallmentsCount: 0,
		                onTimePaidCount: 0,
		                prepaidInstallmentsCount: 0,
		            };

		            let credit = computeCreditAssessment({
		                daysUntilDue,
		                loanOverdueDays: typeof loan.overdueDays === 'number' ? loan.overdueDays : undefined,
		                scheduleStatus: loan.nextPaymentScheduleStatus || undefined,
		                loanStatus: loan.status,
		                overdueInstallmentsCount: scheduleSignals.overdueInstallmentsCount,
		                delinquencyCount: scheduleSignals.delinquencyCount,
		                maxDpd: scheduleSignals.maxDpd,
		                paidInstallmentsCount: scheduleSignals.paidInstallmentsCount,
		                onTimePaidCount: scheduleSignals.onTimePaidCount,
		                prepaidInstallmentsCount: scheduleSignals.prepaidInstallmentsCount,
		                dscr: loan.dscr ? Number(loan.dscr) : undefined,
		                nplStatus: ncb?.nplStatus,
		                creditUtilization: ncb?.creditUtilization,
		                industryCode: customer.industry_code || undefined,
		                businessAge: customer.business_age_years ?? undefined,
	            });

	            // Fail-safe: never return undefined grade to frontend
	            if (!credit?.grade) {
	                credit = {
	                    grade: 'FAIR',
	                    score: 50,
	                    reasons: ['ข้อมูลเครดิตไม่ครบถ้วนในระบบ'],
	                    nextActions: ['ตรวจสอบข้อมูลลูกค้า/ตารางชำระ', 'ติดตามตามรอบปกติ'],
	                };
	            }

	            return {
	                ...loan,
	                creditGrade: credit.grade,
	                creditScore: credit.score,
	                creditReasons: credit.reasons,
	                creditNextActions: credit.nextActions,
	            };
	        });

	        const response = {
	            loans: loansWithCredit,
	            total: result?.total || 0,
	            page: params.page,
	            limit: params.limit,
	            totalPages: Math.ceil((result?.total || 0) / params.limit),
        };
        
        // ✅ Cache for 60 seconds (with error handling)
        // TEMPORARILY DISABLE CACHE FOR DEBUGGING
        /*
        try {
            const cacheKey = CacheUtil.loanListKey(params);
            await CacheUtil.set(cacheKey, response, 60);
        } catch (error) {
            // Cache error - continue without caching
            console.warn('[Cache] Failed to set loan list cache:', error);
        }
        */
        
        console.log('===============================');
        return response;
    }

    /**
     * Approve loan (Manager only)
     * ✅ With retry mechanism for race conditions
     */
    async approveLoan(
        _request: FastifyRequest,
        loanId: string,
        _input: ApproveLoanInput,
        branchId: string | undefined,
        managerId: string,
        approverRole: 'MANAGER' | 'ADMIN'
    ) {
        // ✅ Wrap in retry mechanism to handle race conditions
        return withRetryAndJitter(async () => {
            // SECURITY (CRITICAL-05): Use Serializable transaction to prevent budget race conditions
            // This ensures that concurrent approvals cannot exceed the budget
            await prisma.$transaction(async (tx) => {
                // Get loan with transaction lock
                const loan = await this.loanRepository.findById(loanId, branchId, tx);
                if (!loan) {
                    throw new Error('Loan not found');
                }

                if (loan.status !== 'PENDING_APPROVAL') {
                    throw new Error(`Loan is not pending approval. Current status: ${loan.status}`);
                }

                // ✅ Approval authority: Manager can approve up to 15,000,000 THB (inclusive)
                if (approverRole === 'MANAGER') {
                    const limit = 15_000_000;
                    const amount = Number(loan.principal);
                    if (Number.isFinite(amount) && amount > limit) {
                        const error: any = new Error(
                            `Manager approval limit exceeded. limit=${limit}, amount=${amount}, loanId=${loanId}`
                        );
                        error.code = 'MANAGER_APPROVAL_LIMIT_EXCEEDED';
                        error.details = { limit, amount, loanId };
                        throw error;
                    }
                }

                // ✅ Check budget availability inside transaction
                if (loan.loanProductId) {
                    console.log('[Loan Approval] Checking budget for loan:', {
                        loanId,
                        loanProductId: loan.loanProductId,
                        principal: loan.principal,
                    });

                    const { ProductBudgetService } = await import('@products/services/product-budget.service');
                    const budgetService = new ProductBudgetService();

                    // Pass tx to budget check
                    const budgetCheck = await budgetService.checkBudgetAvailability(
                        loan.loanProductId,
                        Number(loan.principal),
                        undefined,
                        undefined,
                        tx
                    );

                    console.log('[Loan Approval] Budget check result:', budgetCheck);

                    if (!budgetCheck.available) {
                        throw new Error(`ไม่สามารถอนุมัติสินเชื่อได้: ${budgetCheck.message}`);
                    }

                    // Reserve budget for this loan (with tx)
                    try {
                        await budgetService.reserveBudget(
                            loan.loanProductId,
                            loanId,
                            Number(loan.principal),
                            branchId || loan.branchId,
                            undefined,
                            undefined,
                            tx
                        );
                    } catch (error: any) {
                        throw new Error(`ไม่สามารถจองงบประมาณได้: ${error.message}`);
                    }
                } else {
                    console.log('[Loan Approval] No loanProductId - skipping budget reservation');
                }

                // Update loan with approval (with tx)
                await this.loanRepository.update(
                    loanId,
                    {
                        status: 'APPROVED',
                        approvedBy: managerId,
                        approvedAt: new Date(),
                    },
                    branchId,
                    tx
                );

                // ✅ AUTO-CREATE DISBURSEMENT inside transaction to prevent race condition
                // Check inside tx so concurrent approvals cannot both pass
                const existingDisb = await tx.loanDisbursement.count({ where: { loanId } });
                if (existingDisb === 0) {
                    const disbursementNo = await tx.loanDisbursement.count({ where: { loanId } }) + 1;
                    const disbursementDate = new Date();
                    disbursementDate.setDate(disbursementDate.getDate() + 1);
                    const firstPaymentDate = new Date(disbursementDate);
                    firstPaymentDate.setDate(firstPaymentDate.getDate() + 30);

                    await tx.loanDisbursement.create({
                        data: {
                            loanId,
                            disbursementNo: 1,
                            amount: loan.principal,
                            purpose: 'เบิกจ่ายเงินกู้อัตโนมัติหลังการอนุมัติ',
                            requestedDate: disbursementDate,
                            notes: 'สร้างอัตโนมัติหลังจากการอนุมัติสินเชื่อ',
                            createdBy: managerId,
                            status: 'PENDING',
                        },
                    });

                    // Update loan with default payment schedule
                    await tx.loan.update({
                        where: { id: loanId },
                        data: { firstPaymentDate, paymentDay: 15 },
                    });
                }

                return loan;
            }, {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                timeout: 10000 // 10s timeout to prevent long locks
            });

            // Fetch final state for return and notification
            const finalLoan = await this.loanRepository.findById(loanId);

            // Send LINE notification to customer
            await loanStatusNotification.notifyLoanApproved(loanId);

            // 🔔 Send in-app notification to loan officer
            if (finalLoan) {
                try {
                    // Get customer and manager info
                    const loanWithDetails = await this.loanRepository.findById(loanId, branchId) as any;
                    const customerName = loanWithDetails?.customer?.businessName || 'ลูกค้า';
                    const managerName = loanWithDetails?.approver
                        ? `${loanWithDetails.approver.firstName} ${loanWithDetails.approver.lastName}`
                        : 'ผู้จัดการ';

                    // Notify the loan officer (not the manager who approved)
                    await notificationHelper.sendLoanApprovalResult({
                        loanId,
                        customerName,
                        approved: true,
                        managerName,
                    });
                } catch (error) {
                    console.error('Failed to create loan approval notification:', error);
                    // Don't throw - notification failure shouldn't block loan approval
                }
            }

            return finalLoan;
        }, {
            maxRetries: 3,
            initialDelay: 100,
            maxDelay: 2000,
            onRetry: (attempt, error) => {
                console.warn(`[Loan Approval] Retry attempt ${attempt} due to: ${error.message}`);
            }
        });
    }

    /**
     * Reject loan (Manager only)
     */
    async rejectLoan(
        _request: FastifyRequest,
        loanId: string,
        input: RejectLoanInput,
        branchId: string | undefined,
        managerId: string
    ) {
        // Get loan
        const loan = await this.loanRepository.findById(loanId, branchId);
        if (!loan) {
            throw new Error('Loan not found');
        }

        if (loan.status !== 'PENDING_APPROVAL') {
            throw new Error(`Loan is not pending approval. Current status: ${loan.status}`);
        }

        // ✅ Release budget if it was reserved (shouldn't happen for PENDING_APPROVAL, but check anyway)
        if (loan.loanProductId) {
            const { ProductBudgetService } = await import('@products/services/product-budget.service');
            const budgetService = new ProductBudgetService();

            try {
                await budgetService.releaseBudget(
                    loan.loanProductId,
                    loanId,
                    Number(loan.principal),
                    loan.branchId
                );
            } catch (error: any) {
                console.error('Failed to release budget:', error);
                // Don't throw - budget release failure shouldn't block loan rejection
            }
        }

        // Update loan status
        await this.loanRepository.update(
            loanId,
            {
                status: 'REJECTED',
                rejectedBy: managerId,
                rejectedAt: new Date(),
                rejectedReason: input.reason,
            },
            branchId
        );

        const updatedLoan = await this.loanRepository.findById(loanId);

        // Send LINE notification to customer
        await loanStatusNotification.notifyLoanRejected(loanId, input.reason);

        // 🔔 Send in-app notification to loan officer
        if (updatedLoan) {
            try {
                // Get customer and manager info
                const loanWithDetails = await this.loanRepository.findById(loanId, branchId) as any;
                const customerName = loanWithDetails?.customer?.businessName || 'ลูกค้า';
                const managerName = loanWithDetails?.rejectedBy
                    ? `${loanWithDetails.approver?.firstName || ''} ${loanWithDetails.approver?.lastName || ''}`.trim() || 'ผู้จัดการ'
                    : 'ผู้จัดการ';

                // Notify the loan officer (not the manager who rejected)
                await notificationHelper.sendLoanApprovalResult({
                    loanId,
                    customerName,
                    approved: false,
                    managerName,
                    reason: input.reason,
                });
            } catch (error) {
                console.error('Failed to create loan rejection notification:', error);
                // Don't throw - notification failure shouldn't block loan rejection
            }
        }

        return updatedLoan;
    }

    /**
     * Get pending approvals for branch
     */
    async getPendingApprovals(branchId?: string) {
        const loans = await this.loanRepository.findPendingApprovals(branchId);
        return { loans };
    }

    /**
     * Get loan statistics
     */
    async getLoanStatistics(params: {
        branchId?: string;
        officerId?: string;
        status?: string;
    }) {
        const result = await this.loanRepository.getStatistics(params);
        return result;
    }
}
