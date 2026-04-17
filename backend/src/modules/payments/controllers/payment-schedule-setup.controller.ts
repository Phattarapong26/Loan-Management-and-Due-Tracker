import { FastifyRequest, FastifyReply } from 'fastify';
import { ResponseUtil } from '@utils/formatting/response.util';
import { paymentScheduleGenerator, PaymentDayAdjustment } from '../services/payment-schedule-generator.service';
import { prisma } from '@config/database.config';

export class PaymentScheduleSetupController {
    /**
     * Get suggested payment dates for a loan
     */
    getSuggestedDates = async (
        request: FastifyRequest<{ Params: { loanId: string } }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { loanId } = request.params;

            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
            });

            if (!loan) {
                return ResponseUtil.error(reply, 'Loan not found', 404);
            }

            if (!loan.disbursementDate) {
                return ResponseUtil.error(reply, 'Disbursement date not set', 400);
            }

            const suggestedDates = paymentScheduleGenerator.getSuggestedPaymentDates(
                loan.disbursementDate
            );

            return ResponseUtil.success(reply, {
                disbursementDate: loan.disbursementDate,
                suggestedDates,
                minDate: new Date(loan.disbursementDate.getTime() + 7 * 24 * 60 * 60 * 1000),
                maxDate: new Date(loan.disbursementDate.getTime() + 60 * 24 * 60 * 60 * 1000),
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 500);
        }
    };

    /**
     * Preview payment schedule before saving
     */
    previewSchedule = async (
        request: FastifyRequest<{
            Params: { loanId: string };
            Body: {
                firstPaymentDate: string;
                paymentDayAdjustment?: string;
            };
        }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { loanId } = request.params;
            const { firstPaymentDate, paymentDayAdjustment = 'LAST_DAY' } = request.body;

            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
            });

            if (!loan) {
                return ResponseUtil.error(reply, 'Loan not found', 404);
            }

            if (!loan.disbursementDate) {
                return ResponseUtil.error(reply, 'Disbursement date not set', 400);
            }

            const firstPaymentDateObj = new Date(firstPaymentDate);

            // Validate
            paymentScheduleGenerator.validateFirstPaymentDate(
                firstPaymentDateObj,
                loan.disbursementDate
            );

            // Preview
            const preview = await paymentScheduleGenerator.previewSchedule({
                firstPaymentDate: firstPaymentDateObj,
                paymentDay: firstPaymentDateObj.getDate(),
                paymentDayAdjustment: paymentDayAdjustment as PaymentDayAdjustment,
                termMonths: loan.termMonths,
            });

            return ResponseUtil.success(reply, {
                firstPaymentDate: firstPaymentDateObj,
                paymentDay: firstPaymentDateObj.getDate(),
                paymentDayAdjustment,
                preview,
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Set first payment date and generate schedule
     */
    setFirstPaymentDate = async (
        request: FastifyRequest<{
            Params: { loanId: string };
            Body: {
                firstPaymentDate: string;
                paymentDayAdjustment?: string;
            };
        }>,
        reply: FastifyReply
    ): Promise<FastifyReply> => {
        try {
            const { loanId } = request.params;
            const { firstPaymentDate, paymentDayAdjustment = 'LAST_DAY' } = request.body;

            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
            });

            if (!loan) {
                return ResponseUtil.error(reply, 'Loan not found', 404);
            }

            if (loan.status !== 'APPROVED' && loan.status !== 'DISBURSED') {
                return ResponseUtil.error(reply, 'Loan must be approved first', 400);
            }

            if (!loan.disbursementDate) {
                return ResponseUtil.error(reply, 'Disbursement date not set', 400);
            }

            const firstPaymentDateObj = new Date(firstPaymentDate);

            // Validate
            paymentScheduleGenerator.validateFirstPaymentDate(
                firstPaymentDateObj,
                loan.disbursementDate
            );

            // Update loan
            const updatedLoan = await prisma.loan.update({
                where: { id: loanId },
                data: {
                    firstPaymentDate: firstPaymentDateObj,
                    paymentDay: firstPaymentDateObj.getDate(),
                    paymentDayAdjustment: paymentDayAdjustment as string,
                },
            });

            // Generate payment schedule
            await paymentScheduleGenerator.generateSchedule(updatedLoan);

            // Get generated schedules
            const schedules = await prisma.paymentSchedule.findMany({
                where: { loanId },
                orderBy: { paymentNumber: 'asc' },
            });

            return ResponseUtil.success(reply, {
                loan: updatedLoan,
                schedules,
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}

export const paymentScheduleSetupController = new PaymentScheduleSetupController();
