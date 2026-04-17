import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';

/**
 * Session timeout duration for sensitive operations (15 minutes)
 */
const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Session types for different sensitive operations
 */
export enum SessionType {
    REGISTRATION = 'registration',
    OTP_VERIFICATION = 'otp_verification',
    LOAN_APPROVAL = 'loan_approval',
    CONTACT_LOGGING = 'contact_logging',
    PAYMENT_CONFIRMATION = 'payment_confirmation',
    DOCUMENT_REQUEST = 'document_request',
}

/**
 * Session data interface
 */
export interface SessionData {
    type: SessionType;
    userId?: string;
    lineUserId: string;
    data: Record<string, any>;
    startedAt: Date;
    expiresAt: Date;
}

/**
 * LineSessionService manages session timeouts for sensitive operations
 * 
 * Requirements:
 * - Requirement 19: Implement session timeout (15 minutes) for sensitive operations
 * - Requirement 2: Track session state for sensitive operations (registration, OTP, etc.)
 * - Requirement 5: Use ConversationState table to store session data with expiry
 */
export class LineSessionService {
    /**
     * Create a new session for a sensitive operation
     * @param lineUserId - LINE user ID
     * @param type - Type of session (registration, OTP, loan approval, etc.)
     * @param data - Session context data
     * @returns Session data with expiry information
     */
    static async createSession(
        lineUserId: string,
        type: SessionType,
        data: Record<string, any> = {}
    ): Promise<SessionData> {
        try {
            const now = new Date();
            const expiresAt = new Date(now.getTime() + SESSION_TIMEOUT_MS);

            // Clear any existing session for this user
            await this.clearSession(lineUserId);

            // Create new session in ConversationState table
            const session = await prisma.conversationState.create({
                data: {
                    lineUserId,
                    flow: 'SESSION',
                    step: 'ACTIVE',
                    state: type,
                    data: {
                        ...data,
                        sessionType: type,
                        startedAt: now.toISOString(),
                    },
                    expiresAt,
                },
            });

            logger.info({
                lineUserId,
                sessionType: type,
                expiresAt,
            }, 'Session created for sensitive operation');

            return {
                type,
                lineUserId,
                userId: data.userId,
                data: session.data as Record<string, any>,
                startedAt: now,
                expiresAt,
            };
        } catch (error) {
            logger.error({
                lineUserId,
                sessionType: type,
                error,
            }, 'Failed to create session');
            throw new Error('Failed to create session');
        }
    }

    /**
     * Get active session for a user
     * @param lineUserId - LINE user ID
     * @returns Session data if active, null if expired or not found
     */
    static async getSession(lineUserId: string): Promise<SessionData | null> {
        try {
            const session = await prisma.conversationState.findFirst({
                where: {
                    lineUserId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            if (!session) {
                return null;
            }

            // Check if session is expired
            const now = new Date();
            if (session.expiresAt < now) {
                logger.info({
                    lineUserId,
                    sessionType: session.state,
                    expiredAt: session.expiresAt,
                }, 'Session expired');

                // Clean up expired session
                await this.clearSession(lineUserId);
                return null;
            }

            const sessionData = session.data as Record<string, any>;
            return {
                type: session.state as SessionType,
                lineUserId,
                userId: sessionData.userId,
                data: sessionData,
                startedAt: new Date(sessionData.startedAt || session.createdAt),
                expiresAt: session.expiresAt,
            };
        } catch (error) {
            logger.error({
                lineUserId,
                error,
            }, 'Failed to get session');
            return null;
        }
    }

    /**
     * Update session data
     * @param lineUserId - LINE user ID
     * @param data - Updated session data (merged with existing)
     * @returns Updated session data or null if session not found/expired
     */
    static async updateSession(
        lineUserId: string,
        data: Record<string, any>
    ): Promise<SessionData | null> {
        try {
            const existingSession = await this.getSession(lineUserId);
            if (!existingSession) {
                logger.warn({
                    lineUserId,
                }, 'Cannot update session: session not found or expired');
                return null;
            }

            // Merge new data with existing data
            const updatedData = {
                ...existingSession.data,
                ...data,
            };

            const session = await prisma.conversationState.updateMany({
                where: {
                    lineUserId,
                },
                data: {
                    data: updatedData,
                    updatedAt: new Date(),
                },
            });

            if (session.count === 0) {
                return null;
            }

            logger.info({
                lineUserId,
                sessionType: existingSession.type,
            }, 'Session updated');

            return {
                ...existingSession,
                data: updatedData,
            };
        } catch (error) {
            logger.error({
                lineUserId,
                error,
            }, 'Failed to update session');
            return null;
        }
    }

    /**
     * Extend session expiry time (reset to 15 minutes from now)
     * @param lineUserId - LINE user ID
     * @returns Updated session data or null if session not found
     */
    static async extendSession(lineUserId: string): Promise<SessionData | null> {
        try {
            const existingSession = await this.getSession(lineUserId);
            if (!existingSession) {
                return null;
            }

            const newExpiresAt = new Date(Date.now() + SESSION_TIMEOUT_MS);

            await prisma.conversationState.updateMany({
                where: {
                    lineUserId,
                },
                data: {
                    expiresAt: newExpiresAt,
                    updatedAt: new Date(),
                },
            });

            logger.info({
                lineUserId,
                sessionType: existingSession.type,
                newExpiresAt,
            }, 'Session extended');

            return {
                ...existingSession,
                expiresAt: newExpiresAt,
            };
        } catch (error) {
            logger.error({
                lineUserId,
                error,
            }, 'Failed to extend session');
            return null;
        }
    }

    /**
     * Clear session for a user
     * @param lineUserId - LINE user ID
     */
    static async clearSession(lineUserId: string): Promise<void> {
        try {
            const result = await prisma.conversationState.deleteMany({
                where: {
                    lineUserId,
                },
            });

            if (result.count > 0) {
                logger.info({
                    lineUserId,
                    deletedCount: result.count,
                }, 'Session cleared');
            }
        } catch (error) {
            logger.error({
                lineUserId,
                error,
            }, 'Failed to clear session');
        }
    }

    /**
     * Check if a session is active and valid
     * @param lineUserId - LINE user ID
     * @param expectedType - Expected session type (optional)
     * @returns true if session is active and matches expected type
     */
    static async isSessionActive(
        lineUserId: string,
        expectedType?: SessionType
    ): Promise<boolean> {
        const session = await this.getSession(lineUserId);
        if (!session) {
            return false;
        }

        if (expectedType && session.type !== expectedType) {
            return false;
        }

        return true;
    }

    /**
     * Get remaining time for a session in milliseconds
     * @param lineUserId - LINE user ID
     * @returns Remaining time in milliseconds, or 0 if expired/not found
     */
    static async getRemainingTime(lineUserId: string): Promise<number> {
        const session = await this.getSession(lineUserId);
        if (!session) {
            return 0;
        }

        const now = new Date();
        const remaining = session.expiresAt.getTime() - now.getTime();
        return Math.max(0, remaining);
    }

    /**
     * Clean up all expired sessions (should be run periodically)
     * @returns Number of sessions cleaned up
     */
    static async cleanupExpiredSessions(): Promise<number> {
        try {
            const now = new Date();
            const result = await prisma.conversationState.deleteMany({
                where: {
                    expiresAt: {
                        lt: now,
                    },
                },
            });

            if (result.count > 0) {
                logger.info({
                    deletedCount: result.count,
                }, 'Expired sessions cleaned up');
            }

            return result.count;
        } catch (error) {
            logger.error({
                error,
            }, 'Failed to cleanup expired sessions');
            return 0;
        }
    }

    /**
     * Notify user that their session has expired
     * @param lineUserId - LINE user ID
     * @param sessionType - Type of session that expired
     * @returns Notification message
     */
    static createSessionExpiredMessage(
        sessionType: SessionType
    ): any {
        const messages: Record<SessionType, string> = {
            [SessionType.REGISTRATION]: '⏱️ เซสชันการลงทะเบียนหมดอายุแล้ว\n\nกรุณาเริ่มกระบวนการลงทะเบียนใหม่อีกครั้ง\nพิมพ์ "ลงทะเบียน" เพื่อเริ่มต้น',
            [SessionType.OTP_VERIFICATION]: '⏱️ เซสชันการยืนยัน OTP หมดอายุแล้ว\n\nกรุณาขอ OTP ใหม่อีกครั้ง',
            [SessionType.LOAN_APPROVAL]: '⏱️ เซสชันการอนุมัติสินเชื่อหมดอายุแล้ว\n\nกรุณาเริ่มกระบวนการอนุมัติใหม่อีกครั้ง',
            [SessionType.CONTACT_LOGGING]: '⏱️ เซสชันการบันทึกการติดต่อหมดอายุแล้ว\n\nกรุณาเริ่มบันทึกใหม่อีกครั้ง',
            [SessionType.PAYMENT_CONFIRMATION]: '⏱️ เซสชันการยืนยันการชำระเงินหมดอายุแล้ว\n\nกรุณาเริ่มกระบวนการชำระเงินใหม่อีกครั้ง',
            [SessionType.DOCUMENT_REQUEST]: '⏱️ เซสชันการขอเอกสารหมดอายุแล้ว\n\nกรุณาเริ่มกระบวนการใหม่อีกครั้ง',
        };

        return {
            type: 'text',
            text: messages[sessionType] || '⏱️ เซสชันหมดอายุแล้ว กรุณาเริ่มต้นใหม่อีกครั้ง',
        };
    }

    /**
     * Create a warning message when session is about to expire
     * @param remainingMinutes - Minutes remaining before expiry
     * @returns Warning message
     */
    static createSessionExpiryWarning(remainingMinutes: number): any {
        return {
            type: 'text',
            text: `⚠️ เซสชันของคุณจะหมดอายุในอีก ${remainingMinutes} นาที\n\nกรุณาดำเนินการให้เสร็จสิ้นภายในเวลาที่กำหนด`,
        };
    }
}
