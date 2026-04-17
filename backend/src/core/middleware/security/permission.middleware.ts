import { FastifyRequest, FastifyReply } from 'fastify';
import { ResponseUtil } from '@utils/formatting/response.util';
import { prisma } from '@config/database.config';

/**
 * Permission Middleware - Role-based data access control
 * Ensures users can only access data they're authorized to see
 */

/**
 * Filter query parameters based on user role
 * - OFFICER: Can only see their own data (adds officerId filter)
 * - MANAGER: Can only see their branch data (adds branchId filter)
 * - ADMIN: Can see all data (no filters added)
 */
export function filterByRole() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = (request as any).user;

        if (!user) {
            return ResponseUtil.unauthorized(reply, 'Authentication required');
        }

        const { role, branchId, userId } = user;

        // Get query parameters
        const query = request.query as any;

        // OFFICER: Can only see their own portfolio
        if (role === 'OFFICER') {
            // If trying to access other officer's data, deny
            if (query.officerId && query.officerId !== userId) {
                return ResponseUtil.forbidden(reply, 'You can only access your own portfolio');
            }

            // Force officerId to be the current user
            query.officerId = userId;

            // Also ensure they can only see their branch
            if (query.branchId && query.branchId !== branchId) {
                return ResponseUtil.forbidden(reply, 'You can only access your branch data');
            }
            query.branchId = branchId;
        }

        // CUSTOMER: Should not access staff data endpoints
        else if (role === 'CUSTOMER') {
            return ResponseUtil.forbidden(reply, 'Insufficient permissions');
        }

        // MANAGER: Can only see their branch data
        else if (role === 'MANAGER') {
            // If trying to access other branch's data, deny
            if (query.branchId && query.branchId !== branchId) {
                return ResponseUtil.forbidden(reply, 'You can only access your branch data');
            }

            // Force branchId to be the current user's branch
            query.branchId = branchId;
        }

        // ADMIN: No restrictions, can see all data
        // No filters added for admin

        // Update request query with filtered parameters
        request.query = query;
    };
}

/**
 * Check if user can access specific branch
 * Used for branch profile and branch-specific endpoints
 */
export function canAccessBranch() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = (request as any).user;

        if (!user) {
            return ResponseUtil.unauthorized(reply, 'Authentication required');
        }

        const { role, branchId } = user;
        const params = request.params as any;
        const requestedBranchId = params.id || params.branchId;

        // ADMIN: Can access any branch
        if (role === 'ADMIN') {
            return;
        }

        // MANAGER and OFFICER: Can only access their own branch
        if (role === 'MANAGER' || role === 'OFFICER') {
            if (requestedBranchId !== branchId) {
                return ResponseUtil.forbidden(reply, 'You can only access your own branch');
            }
        }

        if (role === 'CUSTOMER') {
            return ResponseUtil.forbidden(reply, 'Insufficient permissions');
        }
    };
}

/**
 * Check if user can access specific customer
 * Used for customer detail and customer-specific endpoints
 */
export function canAccessCustomer() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = (request as any).user;

        if (!user) {
            return ResponseUtil.unauthorized(reply, 'Authentication required');
        }

        const { role, branchId, userId } = user;
        const params = request.params as any;
        const customerId = params.id || params.customerId;

        // ADMIN: Can access any customer
        if (role === 'ADMIN') {
            return;
        }

        // Need to check customer's branch and officer
        const customer = await prisma.customer.findUnique({
            where: { id: customerId },
            select: {
                branchId: true,
                createdBy: true,
            },
        });

        if (!customer) {
            return ResponseUtil.notFound(reply, 'Customer not found');
        }

        // MANAGER: Can access customers in their branch
        if (role === 'MANAGER') {
            if (customer.branchId !== branchId) {
                return ResponseUtil.forbidden(reply, 'You can only access customers in your branch');
            }
            return;
        }

        // OFFICER: Can only access their own customers
        if (role === 'OFFICER') {
            if (customer.branchId !== branchId || customer.createdBy !== userId) {
                return ResponseUtil.forbidden(reply, 'You can only access your own customers');
            }
        }

        if (role === 'CUSTOMER') {
            return ResponseUtil.forbidden(reply, 'Insufficient permissions');
        }
    };
}

/**
 * Check if user can access specific loan
 * Used for loan detail and loan-specific endpoints
 */
export function canAccessLoan() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = (request as any).user;

        if (!user) {
            return ResponseUtil.unauthorized(reply, 'Authentication required');
        }

        const { role, branchId, userId } = user;
        const params = request.params as any;
        const loanId = params.id || params.loanId;

        // ADMIN: Can access any loan
        if (role === 'ADMIN') {
            return;
        }

        // Need to check loan's branch and officer
        const loan = await prisma.loan.findUnique({
            where: { id: loanId },
            select: {
                branchId: true,
                officerId: true,
                customer: {
                    select: {
                        createdBy: true,
                    },
                },
            },
        });

        if (!loan) {
            return ResponseUtil.notFound(reply, 'Loan not found');
        }

        // MANAGER: Can access loans in their branch
        if (role === 'MANAGER') {
            if (loan.branchId !== branchId) {
                return ResponseUtil.forbidden(reply, 'You can only access loans in your branch');
            }
            return;
        }

        // OFFICER: Can only access their own loans
        if (role === 'OFFICER') {
            const isOwner =
                loan.officerId === userId ||
                loan.customer?.createdBy === userId;
            if (loan.branchId !== branchId || !isOwner) {
                return ResponseUtil.forbidden(reply, 'You can only access your own loans');
            }
        }

        if (role === 'CUSTOMER') {
            return ResponseUtil.forbidden(reply, 'Insufficient permissions');
        }
    };
}

/**
 * Ensure customer is created with correct branch and officer
 * Used for customer creation endpoint
 */
export function enforceCustomerOwnership() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = (request as any).user;

        if (!user) {
            return ResponseUtil.unauthorized(reply, 'Authentication required');
        }

        const { role, branchId } = user;
        const body = request.body as any;

        // OFFICER: Automatically assign to their branch and themselves
        if (role === 'OFFICER') {
            // Override any branchId in request
            body.branchId = branchId;
            // Customer will be created by this officer (handled in service via userId)
        }

        else if (role === 'CUSTOMER') {
            return ResponseUtil.forbidden(reply, 'Insufficient permissions');
        }

        // MANAGER: Must be in their branch
        else if (role === 'MANAGER') {
            if (body.branchId && body.branchId !== branchId) {
                return ResponseUtil.forbidden(reply, 'You can only create customers in your branch');
            }
            body.branchId = branchId;
        }

        // ADMIN: Can specify any branch — branchId optional here, controller validates
        else if (role === 'ADMIN') {
            // Allow admin to create customer without branchId at middleware level
            // Controller will validate and return proper error if missing
        }

        // Update request body
        request.body = body;
    };
}

/**
 * Ensure loan is created with correct branch and officer
 * Used for loan creation endpoint
 */
export function enforceLoanOwnership() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        const user = (request as any).user;

        if (!user) {
            return ResponseUtil.unauthorized(reply, 'Authentication required');
        }

        const { role, branchId, userId } = user;
        const body = request.body as any;

        // Verify customer exists and get their branch
        const customer = await prisma.customer.findUnique({
            where: { id: body.customerId },
            select: {
                branchId: true,
                createdBy: true,
            },
        });

        if (!customer) {
            return ResponseUtil.badRequest(reply, 'Customer not found');
        }

        // OFFICER: Can only create loans for their own customers
        if (role === 'OFFICER') {
            if (customer.branchId !== branchId || customer.createdBy !== userId) {
                return ResponseUtil.forbidden(reply, 'You can only create loans for your own customers');
            }
            // Automatically assign to their branch and themselves
            body.branchId = branchId;
            body.officerId = userId;
        }

        else if (role === 'CUSTOMER') {
            return ResponseUtil.forbidden(reply, 'Insufficient permissions');
        }

        // MANAGER: Can create loans for any customer in their branch
        else if (role === 'MANAGER') {
            if (customer.branchId !== branchId) {
                return ResponseUtil.forbidden(reply, 'You can only create loans for customers in your branch');
            }
            body.branchId = branchId;
            // Portfolio ownership follows the staff who created the customer
            if (body.officerId && body.officerId !== customer.createdBy) {
                return ResponseUtil.forbidden(reply, 'You can only create loans under the customer owner');
            }
            body.officerId = customer.createdBy;
        }

        // ADMIN: Can create loans for any customer
        else if (role === 'ADMIN') {
            // Use customer's branch
            body.branchId = customer.branchId;
            // Admin must specify officer or default to customer's creator
            if (!body.officerId) {
                body.officerId = customer.createdBy;
            }
        }

        // Update request body
        request.body = body;
    };
}
