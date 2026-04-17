import { FastifyRequest, FastifyReply } from 'fastify';
import { PaymentScheduleRepository } from '../repositories/payment-schedule.repository';
import { PaymentScheduleService } from '../services/payment-schedule.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { AuthorizedUser, AuthorizationService } from '@/shared/services/authorization.service';
import { prisma } from '@config/database.config';

/**
 * Payment Schedule Controller
 */
export class PaymentScheduleController {
    private paymentScheduleRepository: PaymentScheduleRepository;
    private paymentScheduleService: PaymentScheduleService;

    constructor() {
        this.paymentScheduleRepository = new PaymentScheduleRepository();
        this.paymentScheduleService = new PaymentScheduleService();
    }

    /**
     * Get payment schedules for a loan with dynamic calculation
     */
    getByLoanId = async (
        request: FastifyRequest<{ Params: { loanId: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const { loanId } = request.params;
            const user: AuthorizedUser = {
                userId: request.user!.userId,
                role: request.user!.role,
                branchId: request.user!.branchId
            };

            // Get loan first to check access
            const loan = await prisma.loan.findFirst({
                where: { id: loanId },
                select: {
                    id: true,
                    customerId: true,
                    branchId: true,
                    officerId: true,
                    outstandingBalance: true,
                    customer: {
                        select: {
                            businessName: true,
                            createdBy: true,
                        },
                    },
                },
            });
            
            if (!loan) {
                return ResponseUtil.error(reply, 'Loan not found', 404);
            }

            // Check if user can access this loan
            // Portfolio ownership is tied to the staff who created the customer (customer.createdBy),
            // with backward compatibility for older records via loan.officerId / loan.createdBy.
            const ownerId = loan.officerId || loan.customer?.createdBy || '';
            if (!AuthorizationService.canAccessLoan(user, ownerId, loan.branchId)) {
                return ResponseUtil.error(reply, 'Access denied to this loan', 403);
            }

            // ✅ Use Service instead of Repository for business logic
            const schedules = await this.paymentScheduleService.getPaymentScheduleWithDynamicCalculation(loanId);

            return ResponseUtil.success(reply, {
                schedules,
                total: schedules.length,
                loan: {
                    id: loan.id,
                    customerId: loan.customerId,
                    customerName: loan.customer?.businessName || 'Unknown',
                    outstandingBalance: loan.outstandingBalance,
                },
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get overdue payment schedules for a customer
     */
    getOverdueByCustomer = async (
        request: FastifyRequest<{ Params: { customerId: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const { customerId } = request.params;
            const branchId = request.user!.branchId;

            const schedules = await this.paymentScheduleRepository.getOverdueByCustomer(
                customerId,
                branchId!
            );

            return ResponseUtil.success(reply, {
                schedules,
                total: schedules.length,
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get upcoming payment schedules for a customer
     */
    getUpcomingByCustomer = async (
        request: FastifyRequest<{ Params: { customerId: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const { customerId } = request.params;
            const branchId = request.user!.branchId;

            const schedules = await this.paymentScheduleRepository.getUpcomingByCustomer(
                customerId,
                branchId!
            );

            return ResponseUtil.success(reply, {
                schedules,
                total: schedules.length,
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get all unpaid schedules for a customer (for payment selection)
     */
    getUnpaidByCustomer = async (
        request: FastifyRequest<{ Params: { customerId: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const { customerId } = request.params;
            const branchId = request.user!.branchId;

            const schedules = await this.paymentScheduleRepository.getUnpaidByCustomer(
                customerId,
                branchId!
            );

            return ResponseUtil.success(reply, {
                schedules,
                total: schedules.length,
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get collections summary (overdue + upcoming for all customers in branch)
     */
    getCollectionsSummary = async (
        request: FastifyRequest<{ Querystring: { days?: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const branchId = request.user!.branchId;
            const days = request.query.days ? parseInt(request.query.days) : 30;

            // Get overdue schedules
            const overdueSchedules = await this.paymentScheduleRepository.getOverdueByBranch(branchId!);

            // Get upcoming schedules
            const upcomingSchedules = await this.paymentScheduleRepository.getUpcomingByBranch(
                branchId!,
                days
            );

            return ResponseUtil.success(reply, {
                overdue: {
                    schedules: overdueSchedules,
                    total: overdueSchedules.length,
                },
                upcoming: {
                    schedules: upcomingSchedules,
                    total: upcomingSchedules.length,
                },
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}
