/**
 * Customer Loan Restriction Service
 * 
 * Purpose: Enforce business rule - 1 customer can only have 1 active loan product at a time
 * 
 * Requirements:
 * - 1 ลูกค้า สามารถเข้าร่วมได้เพียง 1 ผลิตภัณฑ์สินเชื่อ ในเวลาเดียวกันเท่านั้น
 * - Track customer's loan history
 * - Show progress of current loan product
 */

import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';

export interface CustomerLoanStatus {
    hasActiveLoan: boolean;
    activeLoanProduct?: {
        id: string;
        productCode: string;
        productName: string;
        loanId: string;
        activatedAt: Date;
    };
    loanHistory: Array<{
        id: string;
        productCode: string;
        productName: string;
        loanId: string;
        activatedAt: Date;
        deactivatedAt: Date | null;
        status: string;
    }>;
}

export interface LoanProgress {
    loanId: string;
    loanProductName: string;
    principal: number;
    totalDisbursed: number;
    remainingAmount: number;
    disbursementProgress: number; // Percentage
    disbursementCount: number;
    totalPayments: number;
    paidPayments: number;
    paymentProgress: number; // Percentage
    status: string;
}

export class CustomerLoanRestrictionService {
    /**
     * Check if customer can apply for a new loan product
     */
    async canCustomerApplyForLoan(customerId: string, loanProductId: string): Promise<{
        allowed: boolean;
        reason?: string;
        activeProduct?: any;
    }> {
        try {
            // Check for active loan product
            const activeProduct = await prisma.customerActiveProduct.findFirst({
                where: {
                    customerId,
                    status: 'ACTIVE',
                },
                include: {
                    loanProduct: true,
                    loan: true,
                },
            });

            if (activeProduct) {
                // Customer already has an active loan product
                if (activeProduct.loanProductId === loanProductId) {
                    return {
                        allowed: false,
                        reason: 'คุณมีสินเชื่อผลิตภัณฑ์นี้อยู่แล้ว',
                        activeProduct,
                    };
                } else {
                    return {
                        allowed: false,
                        reason: `คุณมีสินเชื่อผลิตภัณฑ์ "${activeProduct.loanProduct.productName}" อยู่แล้ว กรุณาปิดสินเชื่อเดิมก่อนสมัครใหม่`,
                        activeProduct,
                    };
                }
            }

            return { allowed: true };
        } catch (error) {
            logger.error({ error, customerId, loanProductId }, 'Error checking loan eligibility');
            throw error;
        }
    }

    /**
     * Activate loan product for customer (called when loan is approved)
     */
    async activateLoanProduct(
        customerId: string,
        loanProductId: string,
        loanId: string
    ): Promise<void> {
        try {
            // Check if customer already has active product
            const existing = await prisma.customerActiveProduct.findFirst({
                where: {
                    customerId,
                    status: 'ACTIVE',
                },
            });

            if (existing) {
                throw new Error('Customer already has an active loan product');
            }

            // Create active product record
            await prisma.customerActiveProduct.create({
                data: {
                    customerId,
                    loanProductId,
                    loanId,
                    status: 'ACTIVE',
                },
            });

            logger.info(
                { customerId, loanProductId, loanId },
                'Loan product activated for customer'
            );
        } catch (error) {
            logger.error({ error, customerId, loanProductId, loanId }, 'Error activating loan product');
            throw error;
        }
    }

    /**
     * Deactivate loan product for customer (called when loan is closed/completed)
     */
    async deactivateLoanProduct(loanId: string, status: 'COMPLETED' | 'CANCELLED'): Promise<void> {
        try {
            const activeProduct = await prisma.customerActiveProduct.findFirst({
                where: {
                    loanId,
                    status: 'ACTIVE',
                },
            });

            if (!activeProduct) {
                logger.warn({ loanId }, 'No active product found for loan');
                return;
            }

            await prisma.customerActiveProduct.update({
                where: { id: activeProduct.id },
                data: {
                    status,
                    deactivatedAt: new Date(),
                },
            });

            logger.info({ loanId, status }, 'Loan product deactivated');
        } catch (error) {
            logger.error({ error, loanId }, 'Error deactivating loan product');
            throw error;
        }
    }

    /**
     * Get customer's loan status and history
     */
    async getCustomerLoanStatus(customerId: string): Promise<CustomerLoanStatus> {
        try {
            const products = await prisma.customerActiveProduct.findMany({
                where: { customerId },
                include: {
                    loanProduct: true,
                    loan: true,
                },
                orderBy: { activatedAt: 'desc' },
            });

            const activeProduct = products.find((p: any) => p.status === 'ACTIVE');

            return {
                hasActiveLoan: !!activeProduct,
                activeLoanProduct: activeProduct
                    ? {
                          id: activeProduct.loanProduct.id,
                          productCode: activeProduct.loanProduct.productCode,
                          productName: activeProduct.loanProduct.productName,
                          loanId: activeProduct.loanId,
                          activatedAt: activeProduct.activatedAt,
                      }
                    : undefined,
                loanHistory: products.map((p: any) => ({
                    id: p.loanProduct.id,
                    productCode: p.loanProduct.productCode,
                    productName: p.loanProduct.productName,
                    loanId: p.loanId,
                    activatedAt: p.activatedAt,
                    deactivatedAt: p.deactivatedAt,
                    status: p.status,
                })),
            };
        } catch (error) {
            logger.error({ error, customerId }, 'Error getting customer loan status');
            throw error;
        }
    }

    /**
     * Get loan progress for customer profile
     */
    async getLoanProgress(loanId: string): Promise<LoanProgress> {
        try {
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                include: {
                    loanProduct: true,
                    disbursements: {
                        where: { status: 'DISBURSED' },
                    },
                    paymentSchedule: true,
                },
            });

            if (!loan) {
                throw new Error('Loan not found');
            }

            const principal = Number(loan.principal);
            const totalDisbursed = Number(loan.totalDisbursed || 0);
            const remainingAmount = Number(loan.remainingAmount || principal);
            const disbursementProgress = (totalDisbursed / principal) * 100;

            const totalPayments = loan.paymentSchedule.length;
            const paidPayments = loan.paymentSchedule.filter(
                (s) => s.status === 'PAID'
            ).length;
            const paymentProgress = totalPayments > 0 ? (paidPayments / totalPayments) * 100 : 0;

            return {
                loanId: loan.id,
                loanProductName: loan.loanProduct?.productName || 'N/A',
                principal,
                totalDisbursed,
                remainingAmount,
                disbursementProgress,
                disbursementCount: loan.disbursements.length,
                totalPayments,
                paidPayments,
                paymentProgress,
                status: loan.status,
            };
        } catch (error) {
            logger.error({ error, loanId }, 'Error getting loan progress');
            throw error;
        }
    }

    /**
     * Get all loans for customer (for profile page)
     */
    async getCustomerLoans(customerId: string): Promise<{
        activeLoans: LoanProgress[];
        completedLoans: LoanProgress[];
        totalLoans: number;
    }> {
        try {
            const loans = await prisma.loan.findMany({
                where: { customerId },
                include: {
                    loanProduct: true,
                    disbursements: {
                        where: { status: 'DISBURSED' },
                    },
                    paymentSchedule: true,
                },
                orderBy: { createdAt: 'desc' },
            });

            const activeLoans: LoanProgress[] = [];
            const completedLoans: LoanProgress[] = [];

            for (const loan of loans) {
                const progress = await this.getLoanProgress(loan.id);

                if (['ACTIVE', 'DISBURSED', 'APPROVED'].includes(loan.status)) {
                    activeLoans.push(progress);
                } else if (['CLOSED', 'COMPLETED'].includes(loan.status)) {
                    completedLoans.push(progress);
                }
            }

            return {
                activeLoans,
                completedLoans,
                totalLoans: loans.length,
            };
        } catch (error) {
            logger.error({ error, customerId }, 'Error getting customer loans');
            throw error;
        }
    }
}

export const customerLoanRestriction = new CustomerLoanRestrictionService();
