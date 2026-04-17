import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '@utils/common/logger.util';
import { ResponseUtil } from '@utils/formatting/response.util';

/**
 * Global error handler with user-friendly messages
 */
export const errorHandler = (
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
) => {
    // Log error สำหรับ Debug (ไม่ส่งไปหาผู้ใช้)
    logger.error(
        {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code,
            },
            request: {
                method: request.method,
                url: request.url,
                userId: request.user?.userId,
            },
        },
        'Error occurred'
    );

    // Handle specific error types
    if (error.statusCode === 429) {
        return ResponseUtil.error(
            reply,
            'Too many requests, please try again later',
            429,
            'RATE_LIMIT_EXCEEDED'
        );
    }

    if (error.validation) {
        return ResponseUtil.validationError(reply, error.validation);
    }

    // Default error response - ใช้ Error Mapper
    return ResponseUtil.internalError(
        reply,
        error.message || 'An unexpected error occurred'
    );
};
