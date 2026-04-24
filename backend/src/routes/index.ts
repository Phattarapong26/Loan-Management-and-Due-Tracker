import { FastifyInstance } from 'fastify';
import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';

// Controllers - organized by module
import { lineController } from '@line/controllers/line.controller';
import { LineAuditController } from '@line/controllers/line-audit.controller';
import { paymentWebhookController } from '@payments/controllers/payment-webhook.controller';
import { AuthController } from '@auth/controllers/auth.controller';
import { TransactionController } from '@transactions/controllers/transaction.controller';
import { CustomerController } from '@customers/controllers/customer.controller';
import { LoanController } from '@loans/controllers/loan.controller';
import { PaymentController } from '@payments/controllers/payment.controller';
import { ConfigController } from '@config-mgmt/controllers/config.controller';
import { DocumentController } from '@documents/controllers/document.controller';
import { BranchController } from '@branches/controllers/branch.controller';
import { UserController } from '@users/controllers/user.controller';
import { ContactLogController } from '@collections/controllers/contact-log.controller';
import { CollectionController } from '@collections/controllers/collection.controller';
import { CollectionActionsController } from '@collections/controllers/collection-actions.controller';
import { BucketRollRatesController } from '@collections/controllers/bucket-roll-rates.controller';
import { PenaltyController } from '@collections/controllers/penalty.controller';
import { DebtManagementController } from '@collections/controllers/debt-management.controller';
import { filterOptionsController } from '@collections/controllers/filter-options.controller';
import { DashboardController } from '@reports/controllers/dashboard.controller';
import { ReportController } from '@reports/controllers/report.controller';
import { NotificationController } from '@notifications/controllers/notification.controller';
import { CalendarEventController } from '@calendar/controllers/calendar-event.controller';
import { LoanProductController } from '@loans/controllers/loan-product.controller';
import { InterestRateController } from '@loans/controllers/interest-rate.controller';
import { DisbursementController } from '@disbursements/controllers/disbursement.controller';
import { PaymentScheduleController } from '@payments/controllers/payment-schedule.controller';

// Models
import type { DebtManagementQuery } from '../modules/collections/models/debt-management.model';
import { paymentScheduleSetupController } from '@payments/controllers/payment-schedule-setup.controller';
import { InvoiceController } from '@invoices/controllers/invoice.controller';
import { paymentReceiptController } from '@invoices/controllers/payment-receipt.controller';
import { MonitoringController } from '@monitoring/controllers/monitoring.controller';

// Utilities
import { ResponseUtil } from '@utils/formatting/response.util';

// Middlewares
import { authenticate, authorize } from '@middlewares/security/auth.middleware';
import { requireBranch } from '@middlewares/common/branch.middleware';
import { validateBody, validateQuery, validateBodyWithTracking } from '@middlewares/validation/validate.middleware';
import { validatePaymentAmount } from '@payments/validators/payment-validation.middleware';
import { verifyLineSignature } from '@line/middleware/line-signature.middleware';
import { lineRateLimit } from '@line/middleware/line-rate-limit.middleware';
import { rateLimitMiddleware } from '@utils/common/rate-limiter.util';
import { checkIPBlocked } from '@core/middleware/security/brute-force-protection.middleware';
import { 
    filterByRole, 
    canAccessCustomer, 
    canAccessLoan,
    enforceCustomerOwnership,
    enforceLoanOwnership 
} from '@middlewares/security/permission.middleware';

// Models/Schemas
import {
    loginSchema,
    registerSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordWithTokenSchema,
    changePasswordSchema,
    ForgotPasswordInput,
    ResetPasswordWithTokenInput,
    ChangePasswordInput,
    LoginInput,
    RefreshTokenInput,
    RegisterInput,
} from '@auth/models/auth.model';

import {
    createTransactionSchema,
    updateTransactionSchema,
    listTransactionsQuerySchema,
    CreateTransactionInput,
    ListTransactionsQuery,
    UpdateTransactionInput,
} from '@transactions/models/transaction.model';

import {
    createCustomerSchema,
    updateCustomerSchema,
    listCustomersQuerySchema,
    CreateCustomerInput,
    UpdateCustomerInput,
    ListCustomersQuery,
} from '@customers/models/customer.model';

import {
    createLoanSchema,
    approveLoanSchema,
    rejectLoanSchema,
    listLoansQuerySchema,
    CreateLoanInput,
    ApproveLoanInput,
    RejectLoanInput,
    ListLoansQuery,
} from '@loans/models/loan.model';

import {
    createPaymentSchema,
    listPaymentsQuerySchema,
    CreatePaymentInput,
    ListPaymentsQuery,
} from '@payments/models/payment.model';

import {
    createSystemConfigSchema,
    updateSystemConfigSchema,
    listSystemConfigsQuerySchema,
    createProductConfigSchema,
    updateProductConfigSchema,
    listProductConfigsQuerySchema,
    CreateSystemConfigInput,
    UpdateSystemConfigInput,
    CreateProductConfigInput,
    UpdateProductConfigInput,
    ListSystemConfigsQuery,
    ListProductConfigsQuery,
} from '@config-mgmt/models/config.model';

import {
    auditLogQuerySchema,
    AuditLogQuery,
} from '@monitoring/models/monitoring.model';

import {
    listDocumentsQuerySchema,
    ListDocumentsQuery,
} from '@documents/models/document.model';

import {
    createBranchSchema,
    updateBranchSchema,
    listBranchesQuerySchema,
    CreateBranchInput,
    UpdateBranchInput,
    ListBranchesQuery,
} from '@branches/models/branch.model';

import {
    createUserSchema,
    updateUserSchema,
    listUsersQuerySchema,
    resetPasswordSchema,
    CreateUserInput,
    UpdateUserInput,
    ListUsersQuery,
    ResetPasswordInput,
} from '@users/models/user.model';

import {
    createContactLogSchema,
    listContactLogsQuerySchema,
    getRemindersQuerySchema,
    CreateContactLogInput,
    ListContactLogsQuery,
    GetRemindersQuery,
} from '@collections/models/contact-log.model';

import {
    createDisbursementSchema,
    updateDisbursementSchema,
    listDisbursementsQuerySchema,
    approveDisbursementSchema,
    rejectDisbursementSchema,
    executeDisbursementSchema,
    disbursementStatsSchema,
    CreateDisbursementInput,
    UpdateDisbursementInput,
    ListDisbursementsQuery,
    ApproveDisbursementInput,
    RejectDisbursementInput,
    ExecuteDisbursementInput,
    DisbursementStatsQuery,
} from '@disbursements/models/disbursement.model';

import {
    createNotificationSchema,
    listNotificationsQuerySchema,
    CreateNotificationInput,
    ListNotificationsQuery,
} from '@notifications/models/notification.model';

import {
    createCalendarEventSchema,
    updateCalendarEventSchema,
    listCalendarEventsQuerySchema,
    CreateCalendarEventInput,
    UpdateCalendarEventInput,
    ListCalendarEventsQuery,
} from '@calendar/models/calendar-event.model';

// Module-specific routes
import { principalCalculatorRoutes } from '@loans/principal-calculator.routes';
import { nextPaymentInvoiceRoutes } from '@invoices/routes/next-payment-invoice.routes';
import { paymentTimelineRoutes } from '@payments/routes/payment-timeline.routes';
import { productBudgetRoutes } from '@products/routes/product-budget.routes';
import { configRoutes } from '@modules/config/routes/config.routes';
import { healthRoutes } from './health';
import { apiStatusRoutes } from './api-status.routes';
import { metricsRoutes } from './metrics.routes';
import { secureDocumentRoutes } from '@documents/routes/secure-document.routes';
import { businessProfileRoutes } from './business-profiles';
import { securityRoutes } from '@monitoring/routes/security.routes';
import { monitoringRoutes } from './monitoring.routes';
import { lineBackfillRoutes } from './line-backfill.routes';
import { documentBackfillRoutes } from './document-backfill.routes';

export async function registerRoutes(app: FastifyInstance) {
    const authController = new AuthController();
    const transactionController = new TransactionController();
    const customerController = new CustomerController();
    const loanController = new LoanController();
    const paymentController = new PaymentController();
    const configController = new ConfigController();
    const documentController = new DocumentController();
    const branchController = new BranchController();
    const userController = new UserController();
    const contactLogController = new ContactLogController();
    const collectionController = new CollectionController();
    const bucketRollRatesController = new BucketRollRatesController();
    const penaltyController = new PenaltyController();
    const debtManagementController = new DebtManagementController();
    const dashboardController = new DashboardController();
    const reportController = new ReportController();
    const notificationController = new NotificationController();
    const calendarEventController = new CalendarEventController();
    const loanProductController = new LoanProductController();
    const disbursementController = new DisbursementController();
    const paymentScheduleController = new PaymentScheduleController();
    const invoiceController = new InvoiceController();
    const monitoringController = new MonitoringController();
    const lineAuditController = new LineAuditController();

    // Health check routes are registered via healthRoutes below

    // Auth routes
    // SECURITY: Registration locked to ADMIN only (CRITICAL-02)
    app.post<{ Body: RegisterInput }>(
        '/api/auth/register',
        { preHandler: [authenticate, authorize('ADMIN'), validateBody(registerSchema)] },
        authController.register
    );

    // SECURITY: Login rate limited — 5 attempts per 5 minutes per email/IP (CRITICAL-01)
    // + Brute Force Protection with Auto-Blocking
    app.post<{ Body: LoginInput }>(
        '/api/auth/login',
        {
            preHandler: [
                checkIPBlocked, // ✅ Check if IP is blocked first
                validateBodyWithTracking(loginSchema), // ✅ Track validation failures
                rateLimitMiddleware({
                    maxRequests: 5,
                    windowMs: 300000,
                    identifierGenerator: (req: any) => req.body?.email || req.ip,
                }),
            ],
        },
        authController.login
    );

    app.post('/api/auth/logout', { preHandler: [authenticate] }, authController.logout);

    // SECURITY: Refresh token rate limited — 20 per minute per IP
    app.post<{ Body: RefreshTokenInput }>(
        '/api/auth/refresh',
        {
            preHandler: [
                validateBody(refreshTokenSchema),
                rateLimitMiddleware({
                    maxRequests: 20,
                    windowMs: 60000,
                }),
            ],
        },
        authController.refreshToken
    );

    app.get('/api/auth/me', { preHandler: [authenticate] }, authController.me);
    app.get('/api/auth/me/debug', { preHandler: [authenticate] }, authController.meDebug);

    // SECURITY: Forgot password rate limited — 3 per 15 minutes per IP
    app.post<{ Body: ForgotPasswordInput }>(
        '/api/auth/forgot-password',
        {
            preHandler: [
                validateBody(forgotPasswordSchema),
                rateLimitMiddleware({
                    maxRequests: 3,
                    windowMs: 900000,
                }),
            ],
        },
        authController.forgotPassword
    );

    app.post<{ Body: ResetPasswordWithTokenInput }>(
        '/api/auth/reset-password',
        { preHandler: [validateBody(resetPasswordWithTokenSchema)] },
        authController.resetPasswordWithToken
    );

    app.post<{ Body: ChangePasswordInput }>(
        '/api/auth/change-password',
        { preHandler: [authenticate, validateBody(changePasswordSchema)] },
        authController.changePassword
    );

    // Transaction routes
    // SECURITY: Added requireBranch and authorize (CRITICAL-06)
    app.post<{ Body: CreateTransactionInput }>(
        '/api/transactions',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER'), validateBody(createTransactionSchema)],
        },
        transactionController.create
    );

    app.get<{ Querystring: ListTransactionsQuery }>(
        '/api/transactions',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER'), validateQuery(listTransactionsQuerySchema)],
        },
        transactionController.list
    );

    app.get<{ Params: { id: string } }>(
        '/api/transactions/:id',
        { preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')] },
        transactionController.getById
    );

    app.patch<{ Params: { id: string }; Body: UpdateTransactionInput }>(
        '/api/transactions/:id',
        {
            preHandler: [
                authenticate,
                authorize('ADMIN', 'MANAGER'),
                validateBody(updateTransactionSchema),
            ],
        },
        transactionController.update
    );

    // Customer routes
    app.post<{ Body: CreateCustomerInput }>(
        '/api/customers',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                enforceCustomerOwnership(), // NEW: Enforce ownership rules
                validateBody(createCustomerSchema),
            ],
        },
        customerController.create
    );

    app.post<{ Body: { documentId: string; businessProfile: any } }>(
        '/api/customers/from-document',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                enforceCustomerOwnership(), // NEW: Enforce ownership rules
            ],
        },
        customerController.createFromDocument
    );

    app.get<{ Querystring: ListCustomersQuery }>(
        '/api/customers',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                filterByRole(), // NEW: Filter by role (OFFICER sees only their customers)
                validateQuery(listCustomersQuerySchema),
            ],
        },
        customerController.list
    );

    app.get<{ Params: { id: string } }>(
        '/api/customers/:id',
        {
            preHandler: [
                authenticate, 
                requireBranch, 
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                canAccessCustomer(), // NEW: Check if user can access this customer
            ],
        },
        customerController.getById
    );

    app.patch<{ Params: { id: string }; Body: UpdateCustomerInput }>(
        '/api/customers/:id',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                canAccessCustomer(), // NEW: Check if user can access this customer
                validateBody(updateCustomerSchema),
            ],
        },
        customerController.update
    );

    // Delete customer
    app.delete<{ Params: { id: string } }>(
        '/api/customers/:id',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER'), // Only ADMIN and MANAGER can delete
                canAccessCustomer(),
            ],
        },
        customerController.delete
    );

    // Update customer with AI data
    app.post<{ Params: { id: string }; Body: { aiData: any; confidenceScore: number; warnings: string[] } }>(
        '/api/customers/:id/ai-data',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
            ],
        },
        customerController.updateWithAIData
    );

    // Generate LINE QR code for customer
    app.post<{ Params: { id: string } }>(
        '/api/customers/:id/line/generate-qr',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
            ],
        },
        customerController.generateLINEQR
    );

    // Loan routes
    app.post<{ Body: CreateLoanInput }>(
        '/api/loans',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                enforceLoanOwnership(), // NEW: Enforce ownership rules
                validateBody(createLoanSchema),
            ],
        },
        loanController.create
    );

    app.get<{ Querystring: ListLoansQuery }>(
        '/api/loans',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                filterByRole(), // NEW: Filter by role (OFFICER sees only their loans)
                validateQuery(listLoansQuerySchema),
            ],
        },
        loanController.list
    );

    // IMPORTANT: Specific routes must come BEFORE parameterized routes
    app.get<{ Querystring: { status?: string } }>(
        '/api/loans/statistics',
        {
            preHandler: [
                authenticate, 
                requireBranch, 
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                filterByRole(), // NEW: Filter statistics by role
            ],
        },
        loanController.getStatistics
    );

    app.get(
        '/api/loans/pending-approvals',
        {
            preHandler: [
                authenticate, 
                requireBranch, 
                authorize('ADMIN', 'MANAGER'),
                filterByRole(), // NEW: Filter pending approvals by role
            ],
        },
        loanController.getPendingApprovals
    );

    app.get<{ Params: { id: string } }>(
        '/api/loans/:id',
        {
            preHandler: [
                authenticate, 
                requireBranch, 
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                canAccessLoan(), // NEW: Check if user can access this loan
            ],
        },
        loanController.getById
    );

    app.post<{ Params: { id: string }; Body: ApproveLoanInput }>(
        '/api/loans/:id/approve',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER'),
                canAccessLoan(), // NEW: Check if user can access this loan
                validateBody(approveLoanSchema),
            ],
        },
        loanController.approve
    );

    app.post<{ Params: { id: string }; Body: RejectLoanInput }>(
        '/api/loans/:id/reject',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER'),
                canAccessLoan(), // NEW: Check if user can access this loan
                validateBody(rejectLoanSchema),
            ],
        },
        loanController.reject
    );

    // Soft delete loan (All roles can delete with audit log)
    app.delete<{ Params: { id: string } }>(
        '/api/loans/:id',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'), // All roles can delete their accessible loans
                canAccessLoan(),
            ],
        },
        loanController.delete
    );

    // Restore soft-deleted loan (Admin only)
    app.post<{ Params: { id: string } }>(
        '/api/loans/:id/restore',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN'), // Only ADMIN can restore loans
            ],
        },
        loanController.restore
    );

    // Payment routes
    app.post<{ Body: CreatePaymentInput }>(
        '/api/payments',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateBody(createPaymentSchema),
                validatePaymentAmount(),
            ],
        },
        paymentController.create
    );

    app.get<{ Querystring: ListPaymentsQuery }>(
        '/api/payments',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateQuery(listPaymentsQuerySchema),
            ],
        },
        paymentController.list
    );

    app.get<{ Querystring: { startDate?: string; endDate?: string } }>(
        '/api/payments/statistics',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
            ],
        },
        paymentController.getStatistics
    );

    app.get<{ Params: { id: string } }>(
        '/api/payments/:id',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentController.getById
    );

    app.get<{ Params: { loanId: string } }>(
        '/api/loans/:loanId/payments',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentController.getLoanHistory
    );

    // Penalty routes (for payment calculations)
    app.get<{ Params: { loanId: string }; Querystring: { overdueDays?: string } }>(
        '/api/loans/:loanId/penalty-preview',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        penaltyController.getPenaltyPreview
    );

    app.get<{ Params: { loanId: string }; Querystring: { overdueDays?: string } }>(
        '/api/loans/:loanId/penalty-rate',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        penaltyController.getPenaltyRate
    );

    // Payment Schedule routes
    app.get<{ Params: { loanId: string } }>(
        '/api/loans/:loanId/payment-schedules',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentScheduleController.getByLoanId
    );

    app.get<{ Params: { customerId: string } }>(
        '/api/customers/:customerId/payment-schedules/overdue',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentScheduleController.getOverdueByCustomer
    );

    app.get<{ Params: { customerId: string } }>(
        '/api/customers/:customerId/payment-schedules/upcoming',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentScheduleController.getUpcomingByCustomer
    );

    app.get<{ Params: { customerId: string } }>(
        '/api/customers/:customerId/payment-schedules/unpaid',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentScheduleController.getUnpaidByCustomer
    );

    app.get<{ Querystring: { days?: string } }>(
        '/api/payment-schedules/collections',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentScheduleController.getCollectionsSummary
    );

    // Payment Schedule Setup routes (First Payment Date)
    app.get<{ Params: { loanId: string } }>(
        '/api/loans/:loanId/payment-schedule/suggested-dates',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentScheduleSetupController.getSuggestedDates
    );

    app.post<{ Params: { loanId: string }; Body: { firstPaymentDate: string; paymentDayAdjustment?: string } }>(
        '/api/loans/:loanId/payment-schedule/preview',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentScheduleSetupController.previewSchedule
    );

    app.post<{ Params: { loanId: string }; Body: { firstPaymentDate: string; paymentDayAdjustment?: string } }>(
        '/api/loans/:loanId/payment-schedule/set-first-payment',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentScheduleSetupController.setFirstPaymentDate
    );

    // Simplified payment schedule endpoint for frontend compatibility
    app.post<{ Params: { loanId: string }; Body: { firstPaymentDate: string; paymentDay: number } }>(
        '/api/loans/:loanId/payment-schedule',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        async (request, reply) => {
            // Convert paymentDay to paymentDayAdjustment format
            const { firstPaymentDate, paymentDay } = request.body;
            const adjustedBody = {
                firstPaymentDate,
                paymentDayAdjustment: paymentDay === 30 ? 'LAST_DAY' : 'SAME_DAY'
            };

            // Call the existing controller with adjusted parameters
            request.body = adjustedBody as any;
            return paymentScheduleSetupController.setFirstPaymentDate(request as any, reply);
        }
    );
    // Invoice routes
    // SECURITY (CRITICAL-03): Public endpoints rate limited — 10 per 5 minutes per IP
    const publicEndpointRateLimit = rateLimitMiddleware({
        maxRequests: 10,
        windowMs: 300000,
    });

    // Public invoice verification route - requires national ID
    app.post<{ Params: { paymentScheduleId: string }; Body: { nationalId: string } }>(
        '/api/invoices/verify/:paymentScheduleId',
        { preHandler: [publicEndpointRateLimit] },
        invoiceController.verifyInvoiceAccess
    );

    // Public loan invoice verification route - requires national ID
    app.post<{ Params: { loanId: string }; Body: { nationalId: string } }>(
        '/api/invoices/verify-loan/:loanId',
        { preHandler: [publicEndpointRateLimit] },
        invoiceController.verifyLoanInvoiceAccess
    );

    // Payment Receipt routes
    // Public receipt verification route - requires national ID
    // Public receipt verification route - requires national ID
    app.post<{ Params: { receiptId: string }; Body: { nationalId: string } }>(
        '/api/receipts/verify/:receiptId',
        { preHandler: [publicEndpointRateLimit] },
        paymentReceiptController.verifyReceiptAccess
    );

    // Public loan receipts verification route - requires national ID
    app.post<{ Params: { loanId: string }; Body: { nationalId: string } }>(
        '/api/receipts/verify-loan/:loanId',
        { preHandler: [publicEndpointRateLimit] },
        paymentReceiptController.verifyLoanReceiptsAccess
    );

    // Public receipt verification by receipt number - requires national ID
    app.post<{ Params: { receiptNumber: string }; Body: { nationalId: string } }>(
        '/api/receipts/verify-number/:receiptNumber',
        { preHandler: [publicEndpointRateLimit] },
        paymentReceiptController.verifyReceiptByNumber
    );

    // Public invoice route (for LINE users) - DEPRECATED, rate limited
    app.get<{ Params: { paymentScheduleId: string }; Querystring: { save?: string } }>(
        '/api/invoices/public/:paymentScheduleId',
        { preHandler: [publicEndpointRateLimit] },
        invoiceController.getInvoice
    );

    // Public PDF serving route (for LINE file downloads) - no authentication required
    app.get<{ Params: { filename: string } }>(
        '/api/invoices/pdf/:filename',
        async (request, reply) => {
            try {
                const { filename } = request.params;

                // Security: validate filename format (prevent directory traversal)
                if (!/^[\w-]+\.pdf$/.test(filename)) {
                    return reply.code(400).send({ error: 'Invalid filename format' });
                }

                const path = await import('path');
                const fs = await import('fs/promises');

                const publicDir = path.join(process.cwd(), 'uploads', 'invoices', 'public');
                const filePath = path.join(publicDir, filename);

                // ✅ SECURITY FIX: Verify that resolved path is within allowed directory
                let realPath: string;
                try {
                    realPath = await fs.realpath(filePath);
                } catch {
                    return reply.code(404).send({ error: 'File not found' });
                }

                // ✅ Ensure the real path is within the public directory
                if (!realPath.startsWith(publicDir)) {
                    logger.warn({ filename, realPath, publicDir }, 'Path traversal attempt detected');
                    return reply.code(403).send({ error: 'Access denied' });
                }

                // Check if file exists
                try {
                    await fs.access(realPath);
                } catch {
                    return reply.code(404).send({ error: 'File not found' });
                }

                // ✅ Sanitize filename in Content-Disposition header
                const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

                // Send file
                const fileStream = await fs.readFile(realPath);
                reply
                    .header('Content-Type', 'application/pdf')
                    .header('Content-Disposition', `inline; filename="${safeFilename}"`)
                    .header('Cache-Control', 'public, max-age=3600')
                    .send(fileStream);
            } catch (error) {
                logger.error({ error }, 'Error serving PDF file');
                return reply.code(500).send({ error: 'ไม่สามารถเปิดไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง' });
            }
        }
    );

    app.get<{ Params: { paymentScheduleId: string }; Querystring: { save?: string } }>(
        '/api/invoices/schedule/:paymentScheduleId',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        invoiceController.getInvoice
    );

    app.get<{ Params: { loanId: string }; Querystring: { installmentNo: string } }>(
        '/api/invoices/loan/:loanId/installment',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        invoiceController.getInvoiceByInstallment
    );

    // Invoice access history (for admin)
    app.get<{ Params: { paymentScheduleId: string }; Querystring: { limit?: string } }>(
        '/api/invoices/access-history/:paymentScheduleId',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER')],
        },
        invoiceController.getInvoiceAccessHistory
    );

    // PDF Cache management (for admin)
    app.get(
        '/api/invoices/pdf-cache/stats',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN')],
        },
        invoiceController.getPDFCacheStats
    );

    app.delete(
        '/api/invoices/pdf-cache/clear',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN')],
        },
        invoiceController.clearPDFCache
    );

    // Receipt routes (for staff)
    app.post<{ Params: { paymentId: string }; Body: { includeQRCode?: boolean; autoSend?: boolean; sendVia?: 'LINE' | 'EMAIL' | 'SMS' } }>(
        '/api/receipts/generate/:paymentId',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentReceiptController.generateReceipt
    );

    app.get<{ Params: { loanId: string } }>(
        '/api/receipts/loan/:loanId',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentReceiptController.getLoanReceipts
    );

    app.get<{ Params: { receiptId: string } }>(
        '/api/receipts/:receiptId/pdf-url',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        paymentReceiptController.getReceiptPdfUrl
    );

    // Receipt access history (for admin)
    app.get<{ Params: { receiptId: string }; Querystring: { limit?: string } }>(
        '/api/receipts/access-history/:receiptId',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER')],
        },
        paymentReceiptController.getReceiptAccessHistory
    );

    app.get<{ Params: { loanId: string } }>(
        '/api/invoices/loan/:loanId',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        invoiceController.getLoanInvoices
    );

    // Save invoice (pre-generate)
    app.post<{ Params: { paymentScheduleId: string }; Body: { sendVia?: string } }>(
        '/api/invoices/schedule/:paymentScheduleId/save',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        invoiceController.saveInvoice
    );

    // Mark invoice as viewed
    app.post<{ Params: { invoiceId: string } }>(
        '/api/invoices/:invoiceId/viewed',
        {
            preHandler: [authenticate],
        },
        invoiceController.markAsViewed
    );

    // Get invoice history (audit trail)
    app.get<{ Params: { paymentScheduleId: string } }>(
        '/api/invoices/schedule/:paymentScheduleId/history',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        invoiceController.getInvoiceHistory
    );

    // Configuration routes (Admin only)
    // Settings API - Simplified endpoints for Settings page
    app.get(
        '/api/settings/general',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        async (_request, reply) => {
            try {
                const configs = await prisma.systemConfig.findMany({
                    where: {
                        key: {
                            in: ['company.name', 'company.email', 'company.phone', 'system.language']
                        }
                    }
                });

                const settings = {
                    companyName: configs.find(c => c.key === 'company.name')?.value || 'บริษัท สินเชื่อไทย จำกัด',
                    email: configs.find(c => c.key === 'company.email')?.value || 'contact@thailoan.co.th',
                    phone: configs.find(c => c.key === 'company.phone')?.value || '02-123-4567',
                    language: configs.find(c => c.key === 'system.language')?.value || 'th',
                };

                return ResponseUtil.success(reply, settings);
            } catch (error: any) {
                return ResponseUtil.error(reply, 'ไม่สามารถโหลดข้อมูลการตั้งค่าได้', 500, 'LOAD_ERROR');
            }
        }
    );

    app.patch(
        '/api/settings/general',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        async (request, reply) => {
            try {
                const { companyName, email, phone, language } = request.body as any;
                const userId = request.user!.userId;

                const updates = [
                    { key: 'company.name', value: companyName },
                    { key: 'company.email', value: email },
                    { key: 'company.phone', value: phone },
                    { key: 'system.language', value: language },
                ];

                for (const update of updates) {
                    await prisma.systemConfig.upsert({
                        where: { key: update.key },
                        create: {
                            key: update.key,
                            value: update.value,
                            category: update.key.startsWith('company') ? 'company' : 'system',
                            dataType: 'STRING',
                            createdBy: userId,
                            updatedBy: userId,
                        },
                        update: {
                            value: update.value,
                            updatedBy: userId,
                        },
                    });
                }

                return ResponseUtil.success(reply, { message: 'Settings updated successfully' });
            } catch (error: any) {
                return ResponseUtil.error(reply, 'ไม่สามารถบันทึกการตั้งค่าได้ กรุณาลองใหม่อีกครั้ง', 500, 'INTERNAL_ERROR');
            }
        }
    );

    app.get(
        '/api/settings/notifications',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        async (_request, reply) => {
            try {
                const configs = await prisma.systemConfig.findMany({
                    where: {
                        key: {
                            in: [
                                'notifications.email_enabled',
                                'notifications.line_enabled',
                                'notifications.reminder_days',
                                'notifications.daily_report',
                                'notifications.npl_alert'
                            ]
                        }
                    }
                });

                const settings = {
                    emailNotifications: configs.find(c => c.key === 'notifications.email_enabled')?.value === 'true',
                    lineNotifications: configs.find(c => c.key === 'notifications.line_enabled')?.value === 'true',
                    reminderDays: configs.find(c => c.key === 'notifications.reminder_days')?.value || '3',
                    dailyReport: configs.find(c => c.key === 'notifications.daily_report')?.value === 'true',
                    nplAlert: configs.find(c => c.key === 'notifications.npl_alert')?.value === 'true',
                };

                return ResponseUtil.success(reply, settings);
            } catch (error: any) {
                return ResponseUtil.error(reply, 'ไม่สามารถโหลดการตั้งค่าการแจ้งเตือนได้', 500, 'LOAD_ERROR');
            }
        }
    );

    app.patch(
        '/api/settings/notifications',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        async (request, reply) => {
            try {
                const { emailNotifications, lineNotifications, reminderDays, dailyReport, nplAlert } = request.body as any;
                const userId = request.user!.userId;

                const updates = [
                    { key: 'notifications.email_enabled', value: String(emailNotifications) },
                    { key: 'notifications.line_enabled', value: String(lineNotifications) },
                    { key: 'notifications.reminder_days', value: String(reminderDays) },
                    { key: 'notifications.daily_report', value: String(dailyReport) },
                    { key: 'notifications.npl_alert', value: String(nplAlert) },
                ];

                for (const update of updates) {
                    await prisma.systemConfig.upsert({
                        where: { key: update.key },
                        create: {
                            key: update.key,
                            value: update.value,
                            category: 'notifications',
                            dataType: 'BOOLEAN',
                            createdBy: userId,
                            updatedBy: userId,
                        },
                        update: {
                            value: update.value,
                            updatedBy: userId,
                        },
                    });
                }

                return ResponseUtil.success(reply, { message: 'Notification settings updated successfully' });
            } catch (error: any) {
                return ResponseUtil.error(reply, 'ไม่สามารถบันทึกการตั้งค่าการแจ้งเตือนได้ กรุณาลองใหม่อีกครั้ง', 500, 'INTERNAL_ERROR');
            }
        }
    );

    app.get(
        '/api/settings/security',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        async (_request, reply) => {
            try {
                const configs = await prisma.systemConfig.findMany({
                    where: {
                        key: {
                            in: [
                                'security.session_timeout',
                                'security.password_expiry',
                                'security.two_factor',
                                'security.login_attempts'
                            ]
                        }
                    }
                });

                const settings = {
                    sessionTimeout: configs.find(c => c.key === 'security.session_timeout')?.value || '24',
                    passwordExpiry: configs.find(c => c.key === 'security.password_expiry')?.value || '90',
                    twoFactor: configs.find(c => c.key === 'security.two_factor')?.value === 'true',
                    loginAttempts: configs.find(c => c.key === 'security.login_attempts')?.value || '5',
                };

                return ResponseUtil.success(reply, settings);
            } catch (error: any) {
                return ResponseUtil.error(reply, 'ไม่สามารถโหลดการตั้งค่าความปลอดภัยได้', 500, 'LOAD_ERROR');
            }
        }
    );

    app.patch(
        '/api/settings/security',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        async (request, reply) => {
            try {
                const { sessionTimeout, passwordExpiry, twoFactor, loginAttempts } = request.body as any;
                const userId = request.user!.userId;

                const updates = [
                    { key: 'security.session_timeout', value: String(sessionTimeout) },
                    { key: 'security.password_expiry', value: String(passwordExpiry) },
                    { key: 'security.two_factor', value: String(twoFactor) },
                    { key: 'security.login_attempts', value: String(loginAttempts) },
                ];

                for (const update of updates) {
                    await prisma.systemConfig.upsert({
                        where: { key: update.key },
                        create: {
                            key: update.key,
                            value: update.value,
                            category: 'security',
                            dataType: update.key.includes('timeout') || update.key.includes('expiry') || update.key.includes('attempts') ? 'INTEGER' : 'BOOLEAN',
                            createdBy: userId,
                            updatedBy: userId,
                        },
                        update: {
                            value: update.value,
                            updatedBy: userId,
                        },
                    });
                }

                return ResponseUtil.success(reply, { message: 'Security settings updated successfully' });
            } catch (error: any) {
                return ResponseUtil.error(reply, 'ไม่สามารถบันทึกการตั้งค่าความปลอดภัยได้ กรุณาลองใหม่อีกครั้ง', 500, 'INTERNAL_ERROR');
            }
        }
    );

    // System Config routes
    app.post<{ Body: CreateSystemConfigInput }>(
        '/api/config/system',
        {
            preHandler: [
                authenticate,
                authorize('ADMIN'),
                validateBody(createSystemConfigSchema),
            ],
        },
        configController.createSystemConfig
    );

    app.get<{ Querystring: ListSystemConfigsQuery }>(
        '/api/config/system',
        {
            preHandler: [
                authenticate,
                authorize('ADMIN', 'MANAGER'),
                validateQuery(listSystemConfigsQuerySchema),
            ],
        },
        configController.listSystemConfigs
    );

    app.get<{ Params: { key: string } }>(
        '/api/config/system/:key',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER')],
        },
        configController.getSystemConfig
    );

    app.patch<{ Params: { key: string }; Body: UpdateSystemConfigInput }>(
        '/api/config/system/:key',
        {
            preHandler: [
                authenticate,
                authorize('ADMIN'),
                validateBody(updateSystemConfigSchema),
            ],
        },
        configController.updateSystemConfig
    );

    app.delete<{ Params: { key: string } }>(
        '/api/config/system/:key',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        configController.deleteSystemConfig
    );

    // Product Config routes
    app.post<{ Body: CreateProductConfigInput }>(
        '/api/config/products',
        {
            preHandler: [
                authenticate,
                authorize('ADMIN'),
                validateBody(createProductConfigSchema),
            ],
        },
        configController.createProductConfig
    );

    app.get<{ Querystring: ListProductConfigsQuery }>(
        '/api/config/products',
        {
            preHandler: [
                authenticate,
                authorize('ADMIN', 'MANAGER'),
                validateQuery(listProductConfigsQuerySchema),
            ],
        },
        configController.listProductConfigs
    );

    app.get(
        '/api/config/products/active',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        configController.getActiveProductConfigs
    );

    app.get<{ Params: { id: string } }>(
        '/api/config/products/:id',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER')],
        },
        configController.getProductConfig
    );

    app.patch<{ Params: { id: string }; Body: UpdateProductConfigInput }>(
        '/api/config/products/:id',
        {
            preHandler: [
                authenticate,
                authorize('ADMIN'),
                validateBody(updateProductConfigSchema),
            ],
        },
        configController.updateProductConfig
    );

    // Document routes
    app.post(
        '/api/documents/upload',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        documentController.upload
    );

    app.get<{ Querystring: ListDocumentsQuery }>(
        '/api/documents',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateQuery(listDocumentsQuerySchema),
            ],
        },
        documentController.list
    );

    app.get<{ Params: { id: string } }>(
        '/api/documents/:id',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        documentController.getById
    );

    app.get<{ Params: { id: string } }>(
        '/api/documents/:id/file',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        documentController.getFile
    );

    app.post<{ Params: { id: string }; Body: { customerId: string } }>(
        '/api/documents/:id/link-customer',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        documentController.linkToCustomer
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    app.post<{ Params: { id: string }; Body: any }>(
        '/api/documents/:id/save-parsed-data',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        documentController.saveParsedData
    );

    app.delete<{ Params: { id: string } }>(
        '/api/documents/:id',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        documentController.delete
    );

    // Branch routes
    // IMPORTANT: Specific routes must come BEFORE parameterized routes
    app.get(
        '/api/branches/all',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        async (_request, reply) => {
            // Get all branches without pagination - call service directly
            try {
                const branches = await prisma.branch.findMany({
                    where: {
                        status: 'ACTIVE' // Use status field, not isActive
                    },
                    orderBy: { name: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        address: true,
                        phone: true,
                        province: true,
                        district: true,
                        subdistrict: true,
                        postalCode: true,
                        status: true,
                    },
                });
                return ResponseUtil.success(reply, branches);
            } catch (error: any) {
                return ResponseUtil.error(reply, 'ไม่สามารถโหลดข้อมูลสาขาได้', 500, 'LOAD_ERROR');
            }
        }
    );

    app.post<{ Body: CreateBranchInput }>(
        '/api/branches',
        {
            preHandler: [
                authenticate,
                authorize('ADMIN'),
                validateBody(createBranchSchema),
            ],
        },
        branchController.create
    );

    app.get<{ Querystring: ListBranchesQuery }>(
        '/api/branches',
        {
            preHandler: [
                authenticate,
                authorize('ADMIN', 'MANAGER'),
                validateQuery(listBranchesQuerySchema),
            ],
        },
        branchController.list
    );

    // IMPORTANT: Specific routes MUST come BEFORE parameterized routes
    app.get<{ Params: { id: string } }>(
        '/api/branches/:id/stats',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        branchController.getWithStats
    );

    app.get<{ Params: { id: string } }>(
        '/api/branches/:id/employees',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        branchController.getEmployees
    );

    app.get<{ Params: { id: string } }>(
        '/api/branches/:id',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        branchController.getById
    );

    app.patch<{ Params: { id: string }; Body: UpdateBranchInput }>(
        '/api/branches/:id',
        {
            preHandler: [
                authenticate,
                authorize('ADMIN'),
                validateBody(updateBranchSchema),
            ],
        },
        branchController.update
    );

    app.delete<{ Params: { id: string } }>(
        '/api/branches/:id',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        branchController.delete
    );

    // User routes
    app.post<{ Body: CreateUserInput }>(
        '/api/users',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN'),
                validateBody(createUserSchema),
            ],
        },
        userController.create
    );

    app.get<{ Querystring: ListUsersQuery }>(
        '/api/users',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER'),
                validateQuery(listUsersQuerySchema),
            ],
        },
        userController.list
    );

    app.get<{ Params: { id: string } }>(
        '/api/users/:id',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER')],
        },
        userController.getById
    );

    app.patch<{ Params: { id: string }; Body: UpdateUserInput }>(
        '/api/users/:id',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateBody(updateUserSchema),
            ],
        },
        userController.update
    );

    app.post<{ Params: { id: string }; Body: ResetPasswordInput }>(
        '/api/users/:id/reset-password',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN'),
                validateBody(resetPasswordSchema),
            ],
        },
        userController.resetPassword
    );

    // Contact Log routes (Collections)
    app.post<{ Body: CreateContactLogInput }>(
        '/api/contact-logs',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateBody(createContactLogSchema),
            ],
        },
        contactLogController.create
    );

    app.get<{ Querystring: ListContactLogsQuery }>(
        '/api/contact-logs',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateQuery(listContactLogsQuerySchema),
            ],
        },
        contactLogController.list
    );

    app.get<{ Params: { id: string } }>(
        '/api/contact-logs/:id',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        contactLogController.getById
    );

    app.get<{ Querystring: GetRemindersQuery }>(
        '/api/contact-logs/reminders',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateQuery(getRemindersQuerySchema),
            ],
        },
        contactLogController.getReminders
    );

    // Collection routes (Payment follow-ups and overdue management)
    app.get(
        '/api/collections/dashboard',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        collectionController.getDashboard
    );

    app.get<{
        Querystring: { daysAhead?: string };
    }>(
        '/api/collections/near-due',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        collectionController.getNearDue
    );

    app.get<{
        Querystring: { daysBack?: string };
    }>(
        '/api/collections/near-overdue',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        collectionController.getNearOverdue
    );

    app.get(
        '/api/collections/overdue',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        collectionController.getOverdue
    );

    app.get(
        '/api/collections/stats',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        collectionController.getStats
    );

    app.get<{ Querystring: { branchId?: string; interval?: 'week' | 'month'; points?: string; officerId?: string; productId?: string } }>(
        '/api/collections/bucket-roll-rates',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        bucketRollRatesController.getBucketRollRatesAnalysis
    );

    // Collection Actions routes (Enhanced collection management)
    const collectionActionsController = new CollectionActionsController();

    app.post<{ Body: any }>(
        '/api/collection-actions',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        collectionActionsController.create
    );

    app.get<{ Querystring: any }>(
        '/api/collection-actions',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        collectionActionsController.list
    );

    app.get<{ Params: { id: string } }>(
        '/api/collection-actions/:id',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        collectionActionsController.getById
    );

    app.put<{ Params: { id: string }; Body: any }>(
        '/api/collection-actions/:id',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        collectionActionsController.update
    );

    app.post<{ Params: { id: string }; Body: any }>(
        '/api/collection-actions/:id/approve',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER')],
        },
        collectionActionsController.approve
    );

    app.post<{ Params: { id: string }; Body: any }>(
        '/api/collection-actions/:id/reject',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER')],
        },
        collectionActionsController.reject
    );

    app.get<{ Params: { customerId: string }; Querystring: any }>(
        '/api/collection-actions/customer/:customerId/history',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        collectionActionsController.getCustomerHistory
    );

    app.get(
        '/api/collection-actions/pending-approvals',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER')],
        },
        collectionActionsController.getPendingApprovals
    );

    app.get<{ Querystring: any }>(
        '/api/collection-actions/stats',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        collectionActionsController.getStats
    );

    // Dashboard routes
    app.get(
        '/api/dashboard/loan-officer',
        {
            // NOTE: Some legacy/seeded users may not have branchId in JWT payload yet.
            // The service can still scope by officerId; branch filtering is applied when available.
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        dashboardController.getLoanOfficerDashboard
    );

    app.get(
        '/api/dashboard/loan-officer/debug',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        dashboardController.getLoanOfficerDashboardDebug
    );

    app.get(
        '/api/dashboard/branch-manager',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER')],
        },
        dashboardController.getBranchManagerDashboard
    );

    app.get(
        '/api/dashboard/stats',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        dashboardController.getStats
    );

    app.get(
        '/api/dashboard/charts',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        dashboardController.getCharts
    );

    app.get(
        '/api/dashboard/recent-activities',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        dashboardController.getRecentActivities
    );

    app.get(
        '/api/dashboard/admin',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        dashboardController.getAdminDashboard
    );

    // Report routes
    app.get<{ Querystring: { branchId?: string; officerId?: string; productId?: string; dateFrom?: string; dateTo?: string } }>(
        '/api/reports/branch-summary',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER')],
        },
        reportController.generateBranchSummary
    );

    app.get<{ Querystring: { branchId?: string; officerId?: string; productId?: string; dateFrom?: string; dateTo?: string } }>(
        '/api/reports/npl-report',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER')],
        },
        reportController.generateNPLReport
    );

    app.get<{ Querystring: { branchId?: string; officerId?: string; productId?: string; dateFrom?: string; dateTo?: string } }>(
        '/api/reports/officer-performance',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER')],
        },
        reportController.generateOfficerPerformance
    );

    app.get<{ Querystring: { branchId?: string; officerId?: string; productId?: string; dateFrom?: string; dateTo?: string; startDate?: string; endDate?: string } }>(
        '/api/reports/loans',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER')],
        },
        reportController.getLoanReport
    );

    app.get<{ Querystring: { branchId?: string; officerId?: string; productId?: string; dateFrom?: string; dateTo?: string; startDate?: string; endDate?: string } }>(
        '/api/reports/payments',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER')],
        },
        reportController.getPaymentReport
    );

    // LINE Webhook routes
    app.post(
        '/api/line/webhook',
        {
            preHandler: [verifyLineSignature, lineRateLimit],
        },
        lineController.webhook
    );

    // Public (no-auth) endpoint for LINE overpayment simulator context
    // Uses a signed token to ensure the loan belongs to the LINE user.
    app.get<{ Querystring: { t?: string } }>(
        '/api/public/overpayment-context',
        async (request, reply) => {
            const token = request.query?.t;
            if (!token) {
                return reply.code(400).send({ success: false, error: 'Missing token' });
            }

            const { OverpaymentLinkTokenService } = await import('@line/services/overpayment-link-token.service');
            const payload = OverpaymentLinkTokenService.verifyToken(token);
            if (!payload) {
                return reply.code(401).send({ success: false, error: 'Invalid or expired token' });
            }

            const { prisma } = await import('@config/database.config');

            const loan = await prisma.loan.findFirst({
                where: {
                    id: payload.loanId,
                    OR: [
                        { customer: { lineUserId: payload.lineUserId } },
                        { customer: { user: { lineUserId: payload.lineUserId } } },
                        // Some flows identify the customer via `customer.userId` (user UUID) instead of LINE userId.
                        { customer: { userId: payload.lineUserId } },
                    ],
                },
                select: {
                    id: true,
                    contract_number: true,
                    outstandingBalance: true,
                    remainingAmount: true,
                    nextPaymentAmount: true,
                    monthlyPayment: true,
                    interestRate: true,
                    interestCalculationMethod: true,
                    termMonths: true,
                    principal: true,
                    allow_early_payment: true,
                    early_payment_penalty_rate: true,
                    customer: { select: { businessName: true } },
                },
            });

            if (!loan) {
                return reply.code(404).send({ success: false, error: 'Loan not found' });
            }

            const [monthsPaid, nextSchedule] = await Promise.all([
                prisma.paymentSchedule.count({
                    where: { loanId: loan.id, status: 'PAID' },
                }),
                prisma.paymentSchedule.findFirst({
                    where: {
                        loanId: loan.id,
                        status: { in: ['UNPAID', 'PARTIAL'] },
                    },
                    orderBy: { paymentNumber: 'asc' },
                    select: {
                        remainingBalance: true,
                        totalPayment: true,
                        paymentDate: true,
                    },
                }),
            ]);

            const remainingMonths = Math.max(0, loan.termMonths - monthsPaid);
            const currentBalance = Number(
                nextSchedule?.remainingBalance ??
                    (loan.remainingAmount && Number(loan.remainingAmount) > 0 ? loan.remainingAmount : undefined) ??
                    loan.outstandingBalance ??
                    0
            );
            const monthlyPayment = Number(
                loan.nextPaymentAmount ?? nextSchedule?.totalPayment ?? loan.monthlyPayment ?? 0
            );

            return reply.send({
                success: true,
                data: {
                    loanId: loan.id,
                    contractNumber: loan.contract_number || '',
                    currentBalance,
                    monthlyPayment,
                    interestRate: Number(loan.interestRate),
                    remainingMonths,
                    principal: Number(loan.principal),
                    customerName: loan.customer.businessName || '',
                    allowEarlyPayment: Boolean(loan.allow_early_payment ?? true),
                    earlyPaymentPenaltyRate: Number(loan.early_payment_penalty_rate ?? 0),
                    interestCalculationMethod: loan.interestCalculationMethod || '',
                },
            });
        }
    );

    // LINE configuration
    app.get(
        '/api/line/config',
        { preHandler: [authenticate] },
        lineController.getLineConfig
    );

    // Send daily notifications
    app.post(
        '/api/line/notifications/daily',
        { preHandler: [authenticate, authorize('ADMIN', 'MANAGER')] },
        lineController.sendDailyNotification
    );

    // Admin: test daily notification to a specific target user (same as normal daily by that user's role/branch)
    app.post(
        '/api/line/notifications/test',
        { preHandler: [authenticate, authorize('ADMIN')] },
        lineController.sendTestDailyNotification
    );

    // Admin: test customer notification (payment reminder flex)
    app.post(
        '/api/line/customers/notifications/test',
        { preHandler: [authenticate, authorize('ADMIN')] },
        lineController.sendTestCustomerNotification
    );

    // Manage rich menu
    app.post(
        '/api/line/manage-rich-menu',
        { preHandler: [authenticate, authorize('ADMIN')] },
        lineController.manageRichMenu
    );

    // ==================== LINE AUDIT ROUTES ====================
    
    // List all LINE audit logs (Admin only)
    app.get<{ Querystring: any }>(
        '/api/line/audit/logs',
        { preHandler: [authenticate, authorize('ADMIN')] },
        lineAuditController.listAuditLogs
    );

    // Get user LINE status and audit logs
    app.get<{ Params: { userId: string } }>(
        '/api/line/audit/users/:userId',
        { preHandler: [authenticate, authorize('ADMIN', 'MANAGER')] },
        lineAuditController.getUserLineStatus
    );

    // Get customer LINE status and audit logs
    app.get<{ Params: { customerId: string } }>(
        '/api/line/audit/customers/:customerId',
        { preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')] },
        lineAuditController.getCustomerLineStatus
    );

    // Get audit logs by LINE User ID
    app.get<{ Params: { lineUserId: string } }>(
        '/api/line/audit/line-users/:lineUserId',
        { preHandler: [authenticate, authorize('ADMIN')] },
        lineAuditController.getLineUserAuditLogs
    );

    // Disconnect user LINE account (Admin only)
    app.post<{ Params: { userId: string }; Body: any }>(
        '/api/line/audit/users/:userId/disconnect',
        { preHandler: [authenticate, authorize('ADMIN')] },
        lineAuditController.disconnectUserLineAccount
    );

    // Disconnect customer LINE account (Admin/Manager only)
    app.post<{ Params: { customerId: string }; Body: any }>(
        '/api/line/audit/customers/:customerId/disconnect',
        { preHandler: [authenticate, authorize('ADMIN', 'MANAGER')] },
        lineAuditController.disconnectCustomerLineAccount
    );

    // LINE Registration & Linking
    app.post(
        '/api/line/registration/initiate',
        { preHandler: [authenticate] },
        lineController.initiateRegistration
    );

    app.post(
        '/api/line/registration/complete',
        { preHandler: [authenticate] },
        lineController.completeRegistration
    );

    app.post(
        '/api/line/registration/verify-otp',
        { preHandler: [authenticate] },
        lineController.verifyOTP
    );

    // Direct Account Linking (used by Task 3.3 and frontend)
    app.post(
        '/api/line/link',
        { preHandler: [authenticate] },
        lineController.linkAccount
    );

    app.post(
        '/api/line/unlink/:userId',
        { preHandler: [authenticate] },
        lineController.unlinkAccount
    );

    app.get(
        '/api/line/check/:userId',
        { preHandler: [authenticate] },
        lineController.checkLinkStatus
    );

    app.post(
        '/api/line/test-message',
        { preHandler: [authenticate] },
        lineController.sendTestMessage
    );

    app.get(
        '/api/line/registration/qr/check/:token',
        { preHandler: [authenticate] },
        lineController.checkQRStatus
    );

    // Alias route for QR status check
    app.get<{ Params: { token: string } }>(
        '/api/line/qr/status/:token',
        { preHandler: [authenticate] },
        lineController.checkQRStatus
    );

    // Alias route for QR generation (redirects to customer route)
    app.post<{ Params: { id: string } }>(
        '/api/line/qr/generate/:id',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
            ],
        },
        customerController.generateLINEQR
    );



    // Notification routes
    app.post<{ Body: CreateNotificationInput }>(
        '/api/notifications',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateBody(createNotificationSchema),
            ],
        },
        notificationController.create
    );

    app.get<{ Querystring: ListNotificationsQuery }>(
        '/api/notifications',
        {
            preHandler: [
                authenticate,
                validateQuery(listNotificationsQuerySchema),
            ],
        },
        notificationController.list
    );

    app.get<{ Params: { id: string } }>(
        '/api/notifications/:id',
        {
            preHandler: [authenticate],
        },
        notificationController.getById
    );

    app.post<{ Params: { id: string } }>(
        '/api/notifications/:id/read',
        {
            preHandler: [authenticate],
        },
        notificationController.markAsRead
    );

    app.post(
        '/api/notifications/read-all',
        {
            preHandler: [authenticate],
        },
        notificationController.markAllAsRead
    );

    app.get(
        '/api/notifications/unread-count',
        {
            preHandler: [authenticate],
        },
        notificationController.getUnreadCount
    );

    // Calendar Event routes
    app.post<{ Body: CreateCalendarEventInput }>(
        '/api/calendar-events',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateBody(createCalendarEventSchema),
            ],
        },
        calendarEventController.create
    );

    app.get<{ Querystring: ListCalendarEventsQuery }>(
        '/api/calendar-events',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateQuery(listCalendarEventsQuerySchema),
            ],
        },
        calendarEventController.list
    );

    app.get<{ Params: { id: string } }>(
        '/api/calendar-events/:id',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        calendarEventController.getById
    );

    app.patch<{ Params: { id: string }; Body: UpdateCalendarEventInput }>(
        '/api/calendar-events/:id',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateBody(updateCalendarEventSchema),
            ],
        },
        calendarEventController.update
    );

    app.delete<{ Params: { id: string } }>(
        '/api/calendar-events/:id',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        calendarEventController.delete
    );

    // Loan Product routes
    // IMPORTANT: Specific routes must come BEFORE parameterized routes
    app.get(
        '/api/loan-products/stats',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        loanProductController.getProductStats
    );

    app.get(
        '/api/loan-products',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        loanProductController.list
    );

    app.post(
        '/api/loan-products',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        loanProductController.create
    );

    app.get<{ Params: { id: string } }>(
        '/api/loan-products/:id',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        loanProductController.getById
    );

    app.patch<{ Params: { id: string } }>(
        '/api/loan-products/:id',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        loanProductController.update
    );

    app.delete<{ Params: { id: string } }>(
        '/api/loan-products/:id',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        loanProductController.delete
    );

    // Interest Rate routes
    app.get(
        '/api/interest-rates/current',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        (request, reply) => new InterestRateController().getCurrentRates(request, reply)
    );

    app.get(
        '/api/interest-rates',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        (request, reply) => new InterestRateController().getCurrentRates(request, reply)
    );

    app.patch(
        '/api/interest-rates/mlr',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        (request, reply) => new InterestRateController().updateMLR(request, reply)
    );

    app.patch(
        '/api/interest-rates/mrr',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        (request, reply) => new InterestRateController().updateMRR(request, reply)
    );

    app.post(
        '/api/interest-rates/calculate',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        (request, reply) => new InterestRateController().calculateFromFormula(request, reply)
    );

    app.get(
        '/api/interest-rates/history',
        {
            preHandler: [authenticate, authorize('ADMIN', 'MANAGER')],
        },
        (request, reply) => new InterestRateController().getRateHistory(request, reply)
    );

    // Disbursement routes
    // IMPORTANT: Specific routes must come BEFORE parameterized routes
    app.get<{ Querystring: DisbursementStatsQuery }>(
        '/api/disbursements/stats',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateQuery(disbursementStatsSchema),
            ],
        },
        async (request, reply) => disbursementController.getStats(request, reply)
    );

    app.post<{ Body: CreateDisbursementInput }>(
        '/api/disbursements',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateBody(createDisbursementSchema),
            ],
        },
        async (request, reply) => disbursementController.create(request, reply)
    );

    app.get<{ Querystring: ListDisbursementsQuery }>(
        '/api/disbursements',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateQuery(listDisbursementsQuerySchema),
            ],
        },
        async (request, reply) => disbursementController.list(request, reply)
    );

    app.get<{ Params: { id: string } }>(
        '/api/disbursements/:id',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        async (request, reply) => disbursementController.getById(request, reply)
    );

    app.patch<{ Params: { id: string }; Body: UpdateDisbursementInput }>(
        '/api/disbursements/:id',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateBody(updateDisbursementSchema),
            ],
        },
        async (request, reply) => disbursementController.update(request, reply)
    );

    app.post<{ Params: { id: string }; Body: ApproveDisbursementInput }>(
        '/api/disbursements/:id/approve',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER'),
                validateBody(approveDisbursementSchema),
            ],
        },
        async (request, reply) => disbursementController.approve(request, reply)
    );

    app.post<{ Params: { id: string }; Body: RejectDisbursementInput }>(
        '/api/disbursements/:id/reject',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER'),
                validateBody(rejectDisbursementSchema),
            ],
        },
        async (request, reply) => disbursementController.reject(request, reply)
    );

    app.post<{ Params: { id: string }; Body: ExecuteDisbursementInput }>(
        '/api/disbursements/:id/execute',
        {
            preHandler: [
                authenticate,
                requireBranch,
                authorize('ADMIN', 'MANAGER', 'OFFICER'),
                validateBody(executeDisbursementSchema),
            ],
        },
        async (request, reply) => disbursementController.disburse(request, reply)
    );

    // Regenerate contract PDF (GET since no body needed)
    app.get<{ Params: { loanId: string } }>(
        '/api/disbursements/loans/:loanId/regenerate-contract-pdf',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        async (request, reply) => disbursementController.regenerateContractPdf(request, reply)
    );

    // Stream disbursement PDF on-demand (password-protected for LINE browser)
    app.get<{ Params: { loanId: string }; Querystring: { password?: string } }>(
        '/api/disbursements/loans/:loanId/pdf',
        async (request, reply) => {
            try {
                const { loanId } = request.params;
                const { password } = request.query;
                const { DisbursementPDFService } = await import('@disbursements/services/disbursement-pdf.service');
                const { prisma: db } = await import('@config/database.config');

                const disbursement = await db.loanDisbursement.findFirst({
                    where: { loanId },
                    include: {
                        loan: {
                            include: {
                                customer: true,
                                branch: true,
                                loanProduct: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                });

                if (!disbursement) {
                    return reply.code(404).send({ error: 'Disbursement not found' });
                }

                // Verify password if provided (last 4 digits of thaiId)
                if (password) {
                    const { EncryptionUtil } = await import('@utils/security/encryption.util');
                    const customer = disbursement.loan.customer as any;
                    let decryptedThaiId = customer.thaiId;
                    try { decryptedThaiId = EncryptionUtil.decrypt(customer.thaiId); } catch { /* plain text */ }
                    const last4 = decryptedThaiId.slice(-4);
                    if (password !== last4) {
                        return reply.code(401).send({ error: 'รหัสผ่านไม่ถูกต้อง' });
                    }
                }

                const { EncryptionUtil } = await import('@utils/security/encryption.util');
                const customer = disbursement.loan.customer as any;
                let decryptedThaiId = customer.thaiId;
                try { decryptedThaiId = EncryptionUtil.decrypt(customer.thaiId); } catch { /* plain text */ }

                const pdfService = new DisbursementPDFService();
                const pdfBuffer = await pdfService.generateDisbursementAdvice({
                    disbursement: disbursement as any,
                    loan: disbursement.loan as any,
                    customer: { ...customer, thaiId: decryptedThaiId },
                    branch: disbursement.loan.branch as any,
                });

                return reply
                    .header('Content-Type', 'application/pdf')
                    .header('Content-Disposition', `inline; filename="disbursement-${loanId}.pdf"`)
                    .send(pdfBuffer);
            } catch (err: any) {
                return reply.code(500).send({ error: 'ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง' });
            }
        }
    );

    // Payment Webhook routes (external payment providers)
    app.post('/api/webhooks/payment', paymentWebhookController.handlePaymentWebhook);
    app.post('/api/webhooks/slip-upload', paymentWebhookController.handleSlipUpload);

    // ─── On-demand PDF routes (Railway ephemeral FS — no static file storage) ───

    // Invoice PDF on-demand by payment schedule ID (public — no auth needed for LINE browser)
    app.get<{ Params: { scheduleId: string } }>(
        '/api/invoices/pdf/schedule/:scheduleId',
        async (request, reply) => {
            try {
                const { scheduleId } = request.params;
                const { NextPaymentInvoiceService } = await import('@invoices/services/next-payment-invoice.service');
                const { InvoicePDFService } = await import('@invoices/services/invoice-pdf.service');
                const invoiceService = new NextPaymentInvoiceService();
                const pdfService = new InvoicePDFService();
                const invoiceData = await invoiceService.generateNextPaymentInvoice(scheduleId, 'SYSTEM');
                const pdfBuffer = await pdfService.generateInvoicePDF(invoiceData as any);
                return reply
                    .header('Content-Type', 'application/pdf')
                    .header('Content-Disposition', `inline; filename="invoice-${scheduleId}.pdf"`)
                    .send(pdfBuffer);
            } catch (err: any) {
                return reply.code(500).send({ error: 'ไม่สามารถสร้างไฟล์ PDF ใบแจ้งหนี้ได้ กรุณาลองใหม่อีกครั้ง' });
            }
        }
    );

    // Receipt PDF on-demand by payment ID (public — no auth needed for LINE browser)
    app.get<{ Params: { paymentId: string } }>(
        '/api/receipts/pdf/payment/:paymentId',
        async (request, reply) => {
            try {
                const { paymentId } = request.params;
                const { prisma: db } = await import('@config/database.config');
                const receipt = await db.paymentReceipt.findFirst({
                    where: { paymentId },
                    select: { id: true, receiptData: true },
                });
                if (!receipt) return reply.code(404).send({ error: 'ไม่พบใบเสร็จ' });
                const { paymentReceiptPDFService } = await import('@invoices/services/payment-receipt-pdf.service');
                const pdfBuffer = await paymentReceiptPDFService.generatePaymentReceiptPDF(receipt.receiptData as any);
                return reply
                    .header('Content-Type', 'application/pdf')
                    .header('Content-Disposition', `inline; filename="receipt-${paymentId}.pdf"`)
                    .send(pdfBuffer);
            } catch (err: any) {
                return reply.code(500).send({ error: 'ไม่สามารถสร้างไฟล์ PDF ใบเสร็จได้ กรุณาลองใหม่อีกครั้ง' });
            }
        }
    );

    // Overdue invoice PDF — all overdue schedules with penalty (public for LINE browser)
    app.get<{ Params: { loanId: string } }>(
        '/api/invoices/pdf/overdue/:loanId',
        async (request, reply) => {
            try {
                const { loanId } = request.params;
                const { prisma: db } = await import('@config/database.config');
                const today = new Date();
                const PENALTY_RATE_DAILY = 0.03 / 365;

                const [loan, schedules] = await Promise.all([
                    db.loan.findUnique({
                        where: { id: loanId },
                        include: {
                            customer: { select: { businessName: true, phone: true, email: true } },
                            branch: { select: { name: true } },
                            loanProduct: { select: { productName: true } },
                        },
                    }),
                    db.paymentSchedule.findMany({
                        where: { loanId, status: { in: ['OVERDUE', 'PARTIAL'] } },
                        orderBy: { paymentDate: 'asc' },
                    }),
                ]);

                if (!loan || schedules.length === 0) {
                    return reply.code(404).send({ error: 'ไม่พบรายการค้างชำระ' });
                }

                const fmt = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2 });
                const fmtDate = (d: Date) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

                const schedulesWithPenalty = schedules.map(sc => {
                    const days = Math.max(0, Math.floor((today.getTime() - new Date(sc.paymentDate).getTime()) / 86400000));
                    const penalty = Number(sc.totalPayment) * PENALTY_RATE_DAILY * days;
                    return { ...sc, daysOverdue: days, penalty, totalWithPenalty: Number(sc.totalPayment) + penalty };
                });

                const totalPrincipal = schedulesWithPenalty.reduce((s, sc) => s + Number(sc.totalPayment), 0);
                const totalPenalty = schedulesWithPenalty.reduce((s, sc) => s + sc.penalty, 0);
                const grandTotal = totalPrincipal + totalPenalty;

                const { resolvePdfLogoFilePath } = await import('@utils/common/public-assets.util');
                const { filePath: logoPath } = await resolvePdfLogoFilePath({ callerFileUrl: import.meta.url });
                let logoBase64 = '';
                if (logoPath) {
                    try {
                        const buf = await (await import('fs/promises')).readFile(logoPath);
                        if (buf.length > 0) logoBase64 = `data:image/png;base64,${buf.toString('base64')}`;
                    } catch { /* no logo */ }
                }

                const rowsHtml = schedulesWithPenalty.map((sc, i) => `
                    <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
                        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center">${sc.paymentNumber}</td>
                        <td style="padding:8px;border:1px solid #e5e7eb">${fmtDate(sc.paymentDate)}</td>
                        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right">${fmt(Number(sc.totalPayment))}</td>
                        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;color:#ef4444">${sc.daysOverdue} วัน</td>
                        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;color:#ef4444">${fmt(sc.penalty)}</td>
                        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold">${fmt(sc.totalWithPenalty)}</td>
                    </tr>`).join('');

                const html = `<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8">
                <style>body{font-family:Tahoma,sans-serif;padding:20px;color:#333}
                table{width:100%;border-collapse:collapse}th{background:#ef4444;color:#fff;padding:10px;border:1px solid #e5e7eb}
                .total-row{background:#fef2f2;font-weight:bold}</style></head><body>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:3px solid #ef4444;padding-bottom:15px">
                    ${logoBase64 ? `<img src="${logoBase64}" style="height:50px">` : '<div style="font-size:20px;font-weight:bold;color:#ef4444">SME D BANK</div>'}
                    <div style="text-align:right"><div style="font-size:22px;font-weight:bold">ใบแจ้งหนี้งวดค้างชำระ</div>
                    <div style="color:#666;font-size:12px">วันที่ออก: ${fmtDate(today)}</div></div>
                </div>
                <div style="background:#f9fafb;padding:15px;border-radius:8px;margin-bottom:20px">
                    <strong>${loan.customer.businessName}</strong><br>
                    สินเชื่อ: ${loan.loanProduct?.productName || '-'} | เลขที่สัญญา: ${loan.contract_number || loan.id.substring(0, 8)}<br>
                    โทร: ${loan.customer.phone || '-'} | อีเมล: ${loan.customer.email || '-'}
                </div>
                <table><thead><tr>
                    <th>งวดที่</th><th>ครบกำหนด</th><th>ยอดงวด (บาท)</th><th>ค้างชำระ</th><th>ดอกเบี้ยปรับ (บาท)</th><th>รวม (บาท)</th>
                </tr></thead><tbody>${rowsHtml}
                <tr class="total-row">
                    <td colspan="2" style="padding:10px;border:1px solid #e5e7eb;text-align:center">รวมทั้งหมด (${schedulesWithPenalty.length} งวด)</td>
                    <td style="padding:10px;border:1px solid #e5e7eb;text-align:right">${fmt(totalPrincipal)}</td>
                    <td style="padding:10px;border:1px solid #e5e7eb"></td>
                    <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;color:#ef4444">${fmt(totalPenalty)}</td>
                    <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;font-size:16px;color:#ef4444">${fmt(grandTotal)}</td>
                </tr></tbody></table>
                <div style="margin-top:20px;padding:15px;background:#fef2f2;border-radius:8px;text-align:center">
                    <div style="font-size:18px;font-weight:bold;color:#ef4444">ยอดรวมที่ต้องชำระ: ${fmt(grandTotal)} บาท</div>
                    <div style="font-size:11px;color:#666;margin-top:5px">กรุณาชำระภายใน 7 วัน เพื่อหลีกเลี่ยงดอกเบี้ยปรับเพิ่มเติม</div>
                </div>
                <div style="margin-top:30px;font-size:10px;color:#999;border-top:1px solid #e5e7eb;padding-top:10px">
                    พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')} | ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย
                </div></body></html>`;

                const puppeteer = await import('puppeteer');
                const browser = await puppeteer.default.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
                const page = await browser.newPage();
                await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
                const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
                await page.close();
                await browser.close();

                return reply
                    .header('Content-Type', 'application/pdf')
                    .header('Content-Disposition', `inline; filename="overdue-invoice-${loanId}.pdf"`)
                    .send(pdfBuffer);
            } catch (err: any) {
                return reply.code(500).send({ error: 'ไม่สามารถสร้างไฟล์ PDF ใบแจ้งหนี้ค้างชำระได้ กรุณาลองใหม่อีกครั้ง' });
            }
        }
    );

    // Register modular routes
    await app.register(principalCalculatorRoutes, { prefix: '/api' });
    await app.register(nextPaymentInvoiceRoutes, { prefix: '/api' });
    await app.register(paymentTimelineRoutes, { prefix: '/api' });
    await app.register(productBudgetRoutes, { prefix: '/api' });
    await app.register(configRoutes, { prefix: '/api' });
    await app.register(secureDocumentRoutes);
    await app.register(businessProfileRoutes, { prefix: '/api' });
    await app.register(securityRoutes, { prefix: '/api' }); // Security routes for threat detection
    await app.register(monitoringRoutes, { prefix: '/api' }); // Performance monitoring routes
    await app.register(lineBackfillRoutes); // LINE data backfill admin routes
    await app.register(documentBackfillRoutes); // Document backfill monitoring routes

    // Debt Management routes
    app.get<{ Querystring: DebtManagementQuery }>(
        '/api/debt-management/summary',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        async (request, reply) => debtManagementController.getSummary(request, reply)
    );

    app.get<{ Querystring: DebtManagementQuery }>(
        '/api/debt-management/contract-size-distribution',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        async (request, reply) => debtManagementController.getContractSizeDistribution(request, reply)
    );

    app.get<{ Querystring: DebtManagementQuery }>(
        '/api/debt-management/loan-type-distribution',
        {
            preHandler: [authenticate, requireBranch, authorize('ADMIN', 'MANAGER', 'OFFICER')],
        },
        async (request, reply) => debtManagementController.getLoanTypeDistribution(request, reply)
    );

    // Filter Options routes
    app.get(
        '/api/filter-options/branches',
        {
            preHandler: [authenticate],
        },
        async (request, reply) => filterOptionsController.getBranches(request, reply)
    );

    app.get(
        '/api/filter-options/regions',
        {
            preHandler: [authenticate],
        },
        async (request, reply) => filterOptionsController.getRegions(request, reply)
    );

    app.get<{ Querystring: { region?: string } }>(
        '/api/filter-options/zones',
        {
            preHandler: [authenticate],
        },
        filterOptionsController.getZones.bind(filterOptionsController)
    );

    app.get(
        '/api/filter-options/years',
        {
            preHandler: [authenticate],
        },
        async (request, reply) => filterOptionsController.getYears(request, reply)
    );

    // Thai Address API routes
    const { thaiAddressController } = await import('../modules/branches/controllers/thai-address.controller');
    
    app.get(
        '/api/thai-address/provinces',
        {
            preHandler: [authenticate],
        },
        thaiAddressController.getProvinces.bind(thaiAddressController)
    );

    app.get<{ Querystring: { province?: string } }>(
        '/api/thai-address/districts',
        {
            preHandler: [authenticate],
        },
        thaiAddressController.getDistricts.bind(thaiAddressController)
    );

    app.get<{ Querystring: { province?: string; district?: string } }>(
        '/api/thai-address/subdistricts',
        {
            preHandler: [authenticate],
        },
        thaiAddressController.getSubdistricts.bind(thaiAddressController)
    );

    app.get<{ Querystring: { province?: string; district?: string; subdistrict?: string } }>(
        '/api/thai-address/postal-code',
        {
            preHandler: [authenticate],
        },
        thaiAddressController.getPostalCode.bind(thaiAddressController)
    );

    // Health check routes (no prefix - /health, /health/ready, /health/live)
    await app.register(healthRoutes);

    // Metrics routes (no prefix - /metrics for Prometheus)
    await app.register(metricsRoutes);

    // API status routes (for monitoring all endpoints)
    await app.register(apiStatusRoutes, { prefix: '/api' });

    // Monitoring & Audit routes
    app.get<{ Querystring: AuditLogQuery }>(
        '/api/monitoring/audit-logs',
        {
            preHandler: [authenticate, authorize('ADMIN')],
            // Use validateQuery middleware
            onRequest: async (request, reply) => {
                try {
                    request.query = auditLogQuerySchema.parse(request.query);
                } catch (error: any) {
                    return ResponseUtil.validationError(reply, error.errors);
                }
            }
        },
        monitoringController.getAuditLogs
    );

    app.delete(
        '/api/monitoring/audit-logs',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        monitoringController.clearAuditLogs
    );

    app.get(
        '/api/monitoring/security-summary',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        monitoringController.getSecuritySummary
    );

    // Database test route (development only)
    if (process.env.NODE_ENV === 'development') {
        app.get('/api/db-test', async () => {
            const userCount = await prisma.user.count();
            return {
                success: true,
                message: 'Database connected',
                userCount
            };
        });
    }

    // Admin: Manual trigger for LINE data backfill
    app.post(
        '/api/admin/backfill-line-data',
        {
            preHandler: [authenticate, authorize('ADMIN')],
        },
        async (_request, reply) => {
            try {
                logger.info('Manual LINE data backfill triggered via API');
                const { runLineDataBackfill } = await import('@jobs/schedulers/line-data-backfill.job');
                const stats = await runLineDataBackfill();
                return ResponseUtil.success(reply, {
                    message: 'LINE data backfill completed',
                    stats,
                });
            } catch (error: any) {
                logger.error({ error }, 'Manual LINE data backfill failed');
                return ResponseUtil.error(reply, 'ไม่สามารถประมวลผลข้อมูล LINE ได้ กรุณาลองใหม่อีกครั้ง', 500, 'INTERNAL_ERROR');
            }
        }
    );

    return app;
}
