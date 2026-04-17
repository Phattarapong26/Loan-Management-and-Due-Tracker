import { FastifyRequest, FastifyReply } from 'fastify';
import { ResponseUtil } from '@utils/formatting/response.util';

/**
 * Branch isolation middleware
 * Ensures users can only access resources from their own branch
 * (except ADMIN who can access all)
 */
export const requireBranch = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    if (!request.user) {
        return ResponseUtil.unauthorized(reply, 'Authentication required');
    }

    // Admin can access all branches
    if (request.user.role === 'ADMIN') {
        return;
    }

    // Other roles must have branchId
    if (!request.user.branchId) {
        return ResponseUtil.forbidden(
            reply,
            'Branch access required. Please contact administrator.'
        );
    }
};

/**
 * Check if user can access specific branch
 */
export const checkBranchAccess = (resourceBranchId: string, userBranchId?: string, userRole?: string): boolean => {
    // Admin can access all
    if (userRole === 'ADMIN') {
        return true;
    }

    // Must match branch
    return userBranchId === resourceBranchId;
};
