import { FastifyReply } from 'fastify';
import { ErrorMessageMapper } from './error-message-mapper.util';

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        message: string;              // User-friendly message (แสดงให้ผู้ใช้)
        technicalMessage?: string;    // Technical message (สำหรับ Debug)
        code?: string;
        details?: any;
        nextSteps?: string[];         // ขั้นตอนที่ผู้ใช้ควรทำต่อ
        supportContact?: string;      // ช่องทางติดต่อ Support
        referenceId?: string;         // รหัสอ้างอิงสำหรับติดต่อ Support
        retryable?: boolean;          // บอกว่าลองใหม่ได้หรือไม่
    };
    meta?: {
        timestamp: string;
        requestId?: string;
    };
}

/**
 * Standardized API response utility
 */
export class ResponseUtil {
    /**
     * Send success response
     */
    static success<T>(
        reply: FastifyReply,
        data: T,
        statusCode: number = 200
    ): FastifyReply {
        const response: ApiResponse<T> = {
            success: true,
            data,
            meta: {
                timestamp: new Date().toISOString(),
                requestId: reply.request.id,
            },
        };

        return reply.code(statusCode).send(response);
    }

    /**
     * Send error response with user-friendly messages
     */
    static error(
        reply: FastifyReply,
        message: string,
        statusCode: number = 400,
        code?: string,
        details?: any
    ): FastifyReply {
        // แปล Error เป็นภาษาที่เข้าใจง่าย
        const userFriendlyError = ErrorMessageMapper.map(code, message);

        const response: ApiResponse = {
            success: false,
            error: {
                message: userFriendlyError.userMessage,           // แสดงให้ผู้ใช้
                technicalMessage: userFriendlyError.technicalMessage, // สำหรับ Debug
                code,
                details,
                nextSteps: userFriendlyError.nextSteps,
                supportContact: userFriendlyError.supportContact,
                referenceId: userFriendlyError.referenceId,
                retryable: userFriendlyError.retryable,
            },
            meta: {
                timestamp: new Date().toISOString(),
                requestId: reply.request.id,
            },
        };

        return reply.code(statusCode).send(response);
    }

    /**
     * Send validation error
     */
    static validationError(
        reply: FastifyReply,
        errors: any
    ): FastifyReply {
        return this.error(reply, 'Validation failed', 422, 'VALIDATION_ERROR', errors);
    }

    /**
     * Send unauthorized error
     */
    static unauthorized(
        reply: FastifyReply,
        message: string = 'Unauthorized'
    ): FastifyReply {
        return this.error(reply, message, 401, 'UNAUTHORIZED');
    }

    /**
     * Send forbidden error
     */
    static forbidden(
        reply: FastifyReply,
        message: string = 'Forbidden'
    ): FastifyReply {
        return this.error(reply, message, 403, 'FORBIDDEN');
    }

    /**
     * Send not found error
     */
    static notFound(
        reply: FastifyReply,
        message: string = 'Resource not found'
    ): FastifyReply {
        return this.error(reply, message, 404, 'NOT_FOUND');
    }

    /**
     * Send internal server error
     */
    static internalError(
        reply: FastifyReply,
        message: string = 'Internal server error'
    ): FastifyReply {
        return this.error(reply, message, 500, 'INTERNAL_ERROR');
    }

    /**
     * Send bad request error
     */
    static badRequest(
        reply: FastifyReply,
        message: string = 'Bad request'
    ): FastifyReply {
        return this.error(reply, message, 400, 'BAD_REQUEST');
    }
}
