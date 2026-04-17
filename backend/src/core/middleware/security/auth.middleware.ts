import { FastifyRequest, FastifyReply } from 'fastify';
import { JWTUtil, JWTPayload } from '@utils/security/jwt.util';
import { ResponseUtil } from '@utils/formatting/response.util';
import { SessionRepository } from '@auth/repositories/session.repository';
import { UserRepository } from '@users/repositories/user.repository';
import { logger } from '@utils/common/logger.util';

// Extend FastifyRequest to include user
// Extend FastifyJWT to include user payload
declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: JWTPayload | { userId: string; sessionId: string };
        user: JWTPayload;
    }
}

// Create singleton instances
const sessionRepository = new SessionRepository();
const userRepository = new UserRepository();

/**
 * Authentication middleware - verifies JWT token
 * 
 * SECURITY FEATURES:
 * 1. Uses Repository pattern (no direct Prisma access)
 * 2. Grace Period for race condition prevention during token rotation
 * 3. Real-time user status check (prevents zombie/deactivated users)
 * 4. Structured logging (no sensitive data leakage)
 */
export const authenticate = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        // Get token from header or cookie
        const authHeader = request.headers.authorization;
        const token =
            authHeader?.startsWith('Bearer ')
                ? authHeader.substring(7)
                : request.cookies.accessToken;

        if (!token) {
            return ResponseUtil.unauthorized(reply, 'No token provided');
        }

        // Verify token first (this is fast and doesn't hit the database)
        const payload = await JWTUtil.verifyAccessToken(request, token);

        // SECURITY: Use structured logger — no token/session data in production logs
        logger.debug({ userId: payload.userId, hasSessionId: !!payload.sessionId }, 'Verifying user token');

        // Check if user has ANY valid session (using Repository)
        // PREFERRED: Use sessionId from payload to link to specific session
        let session;
        let lookupType = 'UNKNOWN';

        if (payload.sessionId) {
            session = await sessionRepository.findActiveSessionById(payload.sessionId);
            lookupType = 'SESSION_ID';
        } else {
            // Fallback for old tokens without sessionId (Transition period)
            logger.debug({ userId: payload.userId }, 'Legacy token without sessionId — using user lookup fallback');
            session = await sessionRepository.findActiveSessionByUserId(payload.userId);
            lookupType = 'USER_ID_FALLBACK';
        }

        if (!session) {
            logger.info({ userId: payload.userId, lookupType }, 'No valid session found');
            return ResponseUtil.unauthorized(reply, 'Invalid or expired session');
        }

        // GRACE PERIOD: Accept if token matches current OR previous token (within grace period)
        const isCurrentToken = session.token === token;
        const isPreviousToken =
            session.previousToken === token &&
            session.previousTokenExpiresAt &&
            session.previousTokenExpiresAt > new Date();

        if (!isCurrentToken && !isPreviousToken) {
            logger.info({ userId: payload.userId, lookupType }, 'Token mismatch — possible token reuse after rotation');
            return ResponseUtil.unauthorized(reply, 'Token has been refreshed, please use new token');
        }

        // ZOMBIE USER PREVENTION: Check user status in real-time
        // This prevents banned/deactivated users from continuing to use the system
        const user = await userRepository.findById(payload.userId);
        if (!user || user.status !== 'ACTIVE') {
            logger.warn({ userId: payload.userId, status: user?.status || 'NOT_FOUND' }, 'Inactive user attempted access — session invalidated');
            // Invalidate session immediately
            await sessionRepository.invalidate(session.id);
            return ResponseUtil.unauthorized(reply, 'Account is not active');
        }

        // Log if using previous token (for monitoring)
        if (isPreviousToken) {
            logger.debug({ userId: payload.userId }, 'User accessing via grace-period previous token');
        }

        // Attach user to request
        request.user = payload;
    } catch (error: any) {
        logger.debug({ error: error.message }, 'Token verification failed');
        return ResponseUtil.unauthorized(reply, 'Invalid token');
    }
};

/**
 * Authorization middleware - checks user role
 */
export const authorize = (...allowedRoles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
        if (!request.user) {
            logger.info({ url: request.url }, 'Authorize: no user in request');
            return ResponseUtil.unauthorized(reply);
        }

        if (!allowedRoles.includes(request.user.role)) {
            logger.info(
                { url: request.url, userRole: request.user.role, allowedRoles },
                'Access denied — insufficient role'
            );
            return ResponseUtil.forbidden(
                reply,
                'You do not have permission to access this resource'
            );
        }

        logger.debug({ url: request.url, role: request.user.role }, 'Access granted');
    };
};
