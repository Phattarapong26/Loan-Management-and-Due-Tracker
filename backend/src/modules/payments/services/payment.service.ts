import { FastifyRequest } from 'fastify';
import { PaymentRepository } from '../repositories/payment.repository';
import { LoanRepository } from '@loans/repositories/loan.repository';
import { PaymentScheduleRepository } from '../repositories/payment-schedule.repository';
import { CreatePaymentInput } from '../models/payment.model';
import { AuthorizedUser, AuthorizationService } from '@/shared/services/authorization.service';
import {
    processPaymentWithRetry,
    validatePayment,
} from './payment-safe.service';
import { logger } from '@utils/common/logger.util';

/**
 * Payment Service - Business logic ONLY
 * Handles payment recording, balance updates, overdue/NPL detection
 */
export class PaymentService {
    private paymentRepository: PaymentRepository;
    private loanRepository: LoanRepository;
    private paymentScheduleRepository: PaymentScheduleRepository;

    constructor() {
        this.paymentRepository = new PaymentRepository();
        this.loanRepository = new LoanRepository();
        this.paymentScheduleRepository = new PaymentScheduleRepository();
    }

    /**
     * Record payment with safe service (prevents race conditions and duplicates)
     * Uses optimistic locking, idempotency keys, and retry mechanism
     */
    async recordPayment(
        _request: FastifyRequest,
        input: CreatePaymentInput,
        branchId: string,
        userId: string
    ) {
        // Validate loan exists and belongs to branch
        const loan = await this.loanRepository.findById(input.loanId, branchId);
        if (!loan) {
            throw new Error('Loan not found or does not belong to this branch');
        }

        // Payments must still be recordable even if the loan is currently marked DEFAULTED/NPL.
        // If customer catches up, the status should be able to revert to normal.
        if (!['ACTIVE', 'DISBURSED', 'DEFAULTED', 'NPL'].includes(loan.status)) {
            throw new Error(`Cannot record payment for loan with status: ${loan.status}`);
        }

        // If paymentScheduleId is provided, validate it
        if (input.paymentScheduleId) {
            const schedule = await this.paymentScheduleRepository.findById(input.paymentScheduleId);
            if (!schedule || schedule.loanId !== input.loanId) {
                throw new Error('Payment schedule not found or does not belong to this loan');
            }
        }

        // Validate payment before processing
        const validation = await validatePayment({
            loanId: input.loanId,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            paymentType: 'ON_TIME', // Will be determined by safe service
            paymentScheduleId: input.paymentScheduleId,
            notes: input.notes,
            createdBy: userId,
        });

        if (!validation.valid) {
            throw new Error(validation.errors.join(', '));
        }

        // Use safe service with retry mechanism
        const result = await processPaymentWithRetry({
            loanId: input.loanId,
            amount: input.amount,
            paymentMethod: input.paymentMethod,
            paymentType: 'ON_TIME', // Will be determined by safe service
            paymentScheduleId: input.paymentScheduleId,
            notes: input.notes,
            createdBy: userId,
        });

        // Auto-generate & send receipt in background (do not fail the payment if this errors)
        try {
            const { paymentReceiptService } = await import('@invoices/services/payment-receipt.service');
            void paymentReceiptService
                .generatePaymentReceipt(result.payment.id, userId, {
                    includeQRCode: false,
                    autoSend: true,
                })
                .catch((error: unknown) => {
                    logger.error(
                        { error, paymentId: result.payment.id, loanId: result.loan.id },
                        'Failed to auto-generate/send receipt (payment still recorded)'
                    );
                });
        } catch (error: unknown) {
            logger.error(
                { error, paymentId: result.payment.id, loanId: result.loan.id },
                'Failed to initialize receipt generation (payment still recorded)'
            );
        }

        return {
            payment: result.payment,
            loan: result.loan,
            paymentType: result.payment.paymentType,
            interestSaved: result.payment.interestSaved,
            penaltyAmount: result.payment.penaltyAmount,
            newOutstandingBalance: result.newBalance,
            isPaidOff: result.newBalance <= 0,
            isIdempotent: result.isIdempotent,
        };
    }

    /**
     * Get payment by ID
     */
    async getPayment(paymentId: string) {
        const payment = await this.paymentRepository.findById(paymentId);
        if (!payment) {
            throw new Error('Payment not found');
        }

        return payment;
    }

    /**
     * List payments with pagination
     */
    async listPayments(params: {
        loanId?: string;
        page: number;
        limit: number;
        paymentType?: 'EARLY' | 'ON_TIME' | 'LATE';
        startDate?: Date;
        endDate?: Date;
    }, user?: AuthorizedUser) {
        // Access control: when loanId is specified, ensure caller can access all requested loans.
        if (params.loanId && user && user.role !== 'ADMIN') {
            const loanIds = params.loanId.includes(',')
                ? params.loanId.split(',').map((id) => id.trim()).filter(Boolean)
                : [params.loanId];

            for (const loanId of loanIds) {
                const loan = await this.loanRepository.findById(loanId);
                if (!loan) {
                    throw new Error('Loan not found');
                }
                const ownerId = (loan as any).officerId || (loan as any).customer?.createdBy || '';
                if (!AuthorizationService.canAccessLoan(user, ownerId, loan.branchId)) {
                    throw new Error('Access denied to this loan');
                }
            }
        }

        const result = await this.paymentRepository.list(params);

        return {
            payments: result.payments,
            total: result.total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(result.total / params.limit),
        };
    }

    /**
     * Get payment history for loan
     */
    async getLoanPaymentHistory(loanId: string, user: AuthorizedUser) {
        // Get loan first to check access
        const loan = await this.loanRepository.findById(loanId);
        if (!loan) {
            throw new Error('Loan not found');
        }

        // Check if user can access this loan
        // Portfolio ownership is tied to the staff who created the customer (customer.createdBy),
        // with backward compatibility for older records via loan.officerId.
        const ownerId = (loan as any).officerId || (loan as any).customer?.createdBy || '';
        if (!AuthorizationService.canAccessLoan(user, ownerId, loan.branchId)) {
            throw new Error('Access denied to this loan');
        }

        const payments = await this.paymentRepository.getLoanHistory(loanId);
        const totalPaid = await this.paymentRepository.getTotalPaid(loanId);

        return {
            payments,
            totalPaid,
            outstandingBalance: Number(loan.outstandingBalance),
            nextPaymentDate: loan.nextPaymentDate,
            nextPaymentAmount: loan.nextPaymentAmount,
        };
    }

    /**
     * Get payment statistics
     */
    async getPaymentStatistics(params: {
        startDate?: Date;
        endDate?: Date;
        branchId?: string;
    }) {
        // Optimized: Use database aggregation instead of fetching all records
        const [paymentStats, scheduleStats] = await Promise.all([
            this.paymentRepository.getStats({
                startDate: params.startDate,
                endDate: params.endDate,
                branchId: params.branchId,
            }),
            // Schedule stats are always "current snapshot", not filtered by date range
            this.paymentScheduleRepository.getStats({
                branchId: params.branchId,
            }),
        ]);

        return {
            totalCollected: paymentStats.totalCollected,
            totalPending: scheduleStats.totalPending,
            totalOverdue: scheduleStats.totalOverdue,
            overdueCount: scheduleStats.overdueCount,
            totalPayments: paymentStats.count,
        };
    }

    /**
     * Check and update overdue loans
     * Should be called by scheduled job
     */
    async updateOverdueLoans() {
        const today = new Date();
        const overduePayments = await this.paymentScheduleRepository.getOverduePayments(today);

        // Group by loanId and use earliest past-due schedule as the source of truth
        const earliestOverdueByLoan = new Map<
            string,
            { branchId: string; status: string; earliestPaymentDate: Date }
        >();

        for (const schedule of overduePayments) {
            const loan = schedule.loan as { id: string; branchId: string; status: string };
            const existing = earliestOverdueByLoan.get(loan.id);
            if (!existing || schedule.paymentDate.getTime() < existing.earliestPaymentDate.getTime()) {
                earliestOverdueByLoan.set(loan.id, {
                    branchId: loan.branchId,
                    status: loan.status,
                    earliestPaymentDate: schedule.paymentDate,
                });
            }
        }

        const updates: Array<{ loanId: string; overdueDays: number }> = [];

        for (const schedule of overduePayments) {
            // Keep schedule status consistent
            await this.paymentScheduleRepository.updateStatus(schedule.id, 'OVERDUE');
        }

        for (const [loanId, info] of earliestOverdueByLoan.entries()) {
            const daysOverdue = Math.max(
                0,
                Math.floor((today.getTime() - info.earliestPaymentDate.getTime()) / (1000 * 60 * 60 * 24))
            );

            await this.loanRepository.update(loanId, { overdueDays: daysOverdue }, info.branchId);

            // Mark as NPL if overdue >= 90 days
            if (daysOverdue >= 90 && info.status !== 'NPL') {
                await this.loanRepository.update(loanId, { status: 'NPL' }, info.branchId);
            }

            updates.push({ loanId, overdueDays: daysOverdue });
        }

        return { updated: updates.length, loans: updates };
    }
}
