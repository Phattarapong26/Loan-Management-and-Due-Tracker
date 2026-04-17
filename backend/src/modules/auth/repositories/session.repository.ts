import { prisma } from '@config/database.config';
import { Session } from '@prisma/client';
import { env, parseExpiryToMs } from '@config/env.config';

/**
 * Session Repository - Database access ONLY
 * NO business logic allowed
 */
export class SessionRepository {
    /**
     * Create new session
     */
    async create(data: {
        id?: string; // Optional custom ID
        userId: string;
        token: string;
        refreshToken?: string;
        ipAddress?: string;
        userAgent?: string;
        expiresAt: Date;
    }): Promise<Session> {
        // If refreshToken is provided, delete any existing session with the same refreshToken
        // This prevents unique constraint violations when refreshing tokens
        if (data.refreshToken) {
            await prisma.session.deleteMany({
                where: {
                    refreshToken: data.refreshToken,
                },
            });
        }

        return prisma.session.create({
            data: {
                ...data,
            },
        });
    }

    /**
     * Find session by token
     */
    async findByToken(token: string): Promise<Session | null> {
        return prisma.session.findUnique({
            where: { token },
        });
    }

    /**
     * Find session by refresh token
     */
    async findByRefreshToken(refreshToken: string): Promise<Session | null> {
        return prisma.session.findUnique({
            where: { refreshToken },
        });
    }

    /**
     * Find session by previous refresh token (for grace period)
     */
    async findByPreviousRefreshToken(refreshToken: string): Promise<Session | null> {
        return prisma.session.findFirst({
            where: {
                previousRefreshToken: refreshToken,
                isValid: true,
                expiresAt: { gt: new Date() },
            } as any,
        });
    }

    /**
     * Count active sessions for a user
     */
    async countActiveSessionsByUserId(userId: string): Promise<number> {
        return prisma.session.count({
            where: {
                userId,
                isValid: true,
                expiresAt: { gt: new Date() },
            },
        });
    }

    /**
     * Delete oldest sessions for a user (FIFO)
     * Used to enforce max concurrent sessions limit
     */
    async deleteOldestSessions(userId: string, keepCount: number): Promise<number> {
        // Get all active sessions ordered by creation date
        const sessions = await prisma.session.findMany({
            where: {
                userId,
                isValid: true,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
        });

        // Calculate how many to delete
        const deleteCount = Math.max(0, sessions.length - keepCount);
        if (deleteCount === 0) return 0;

        // Delete oldest sessions
        const idsToDelete = sessions.slice(0, deleteCount).map(s => s.id);
        const result = await prisma.session.deleteMany({
            where: { id: { in: idsToDelete } },
        });

        return result.count;
    }

    /**
     * Update session token (for token refresh)
     * RACE CONDITION FIX: Keep previous token for grace period
     * SLIDING WINDOW: Extend session expiry on refresh
     */
    async updateToken(id: string, newToken: string, newRefreshToken?: string): Promise<Session> {
        console.log('[Session Repository] Updating session:', id);
        console.log('[Session Repository] New token:', newToken.substring(0, 20) + '...');

        // Get current token before updating
        const currentSession = await prisma.session.findUnique({
            where: { id },
            select: { token: true, refreshToken: true },
        });

        const updateData: any = {
            previousToken: currentSession?.token, // Keep old token for grace period
            token: newToken,
            expiresAt: new Date(Date.now() + parseExpiryToMs(env.SESSION_EXPIRES_IN)), // SLIDING WINDOW: Extend expiry
            previousTokenExpiresAt: new Date(Date.now() + 30 * 1000), // Grace period: 30 seconds
        };

        // REFRESH TOKEN ROTATION: Update refresh token if provided
        if (newRefreshToken) {
            updateData.previousRefreshToken = currentSession?.refreshToken;
            updateData.refreshToken = newRefreshToken;
        }

        const updated = await prisma.session.update({
            where: { id },
            data: updateData,
        });

        console.log('[Session Repository] Session updated with grace period + sliding window');

        return updated;
    }

    /**
     * Invalidate session
     */
    async invalidate(id: string): Promise<Session> {
        return prisma.session.update({
            where: { id },
            data: { isValid: false },
        });
    }

    /**
     * Invalidate all user sessions
     */
    async invalidateAllUserSessions(userId: string): Promise<number> {
        const result = await prisma.session.updateMany({
            where: { userId, isValid: true },
            data: { isValid: false },
        });
        return result.count;
    }

    /**
     * Delete expired sessions in batches for better performance
     */
    async deleteExpired(): Promise<number> {
        let totalDeleted = 0;
        const batchSize = 1000; // Delete in batches of 1000
        
        while (true) {
            const result = await prisma.session.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date(),
                    },
                },
                // Note: Prisma doesn't support LIMIT in deleteMany, 
                // but the index will make this much faster
            });
            
            totalDeleted += result.count;
            
            // If we deleted less than the batch size, we're done
            if (result.count < batchSize) {
                break;
            }
            
            // Small delay between batches to avoid overwhelming the database
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return totalDeleted;
    }

    /**
     * Find active session by user ID (for middleware validation)
     * Returns session with minimal fields for performance
     */
    async findActiveSessionByUserId(userId: string): Promise<{
        id: string;
        token: string;
        previousToken: string | null;
        previousTokenExpiresAt: Date | null;
        userId: string;
    } | null> {
        return prisma.session.findFirst({
            where: {
                userId,
                isValid: true,
                expiresAt: {
                    gt: new Date(),
                },
            },
            select: {
                id: true,
                token: true,
                previousToken: true,
                previousTokenExpiresAt: true,
                userId: true,
            },
        }) as any;
    }

    /**
     * Find active session by Session ID (Preferred method for Auth)
     */
    async findActiveSessionById(sessionId: string): Promise<{
        id: string;
        token: string;
        previousToken: string | null;
        previousTokenExpiresAt: Date | null;
        userId: string;
    } | null> {
        const session = await prisma.session.findFirst({
            where: {
                id: sessionId,
                isValid: true,
                expiresAt: {
                    gt: new Date(),
                },
            },
            select: {
                id: true,
                token: true,
                previousToken: true,
                previousTokenExpiresAt: true,
                userId: true,
            },
        }) as any;

        if (!session) {
            console.log(`[Session Repo] ❌ FindById failed for ${sessionId}`);
        } else {
            console.log(`[Session Repo] ✅ Found active session: ${session.id}`);
        }

        return session;
    }

    /**
     * Log token refresh for audit trail
     */
    async logTokenRefresh(data: {
        userId: string;
        sessionId: string;
        oldAccessToken: string;
        newAccessToken: string;
        oldRefreshToken?: string;
        newRefreshToken?: string;
        ipAddress?: string;
        userAgent?: string;
        refreshReason?: string;
    }): Promise<void> {
        try {
            await prisma.$executeRaw`
                INSERT INTO token_refresh_audit (
                    user_id, session_id, 
                    old_access_token, new_access_token,
                    old_refresh_token, new_refresh_token,
                    ip_address, user_agent, refresh_reason
                ) VALUES (
                    ${data.userId}::uuid, ${data.sessionId}::uuid,
                    ${data.oldAccessToken.substring(0, 50)}, ${data.newAccessToken.substring(0, 50)},
                    ${data.oldRefreshToken?.substring(0, 50) || null}, ${data.newRefreshToken?.substring(0, 50) || null},
                    ${data.ipAddress || null}, ${data.userAgent || null}, ${data.refreshReason || 'USER_INITIATED'}
                )
            `;
        } catch (error) {
            // Don't fail the request if audit logging fails
            console.error('[Session Repository] Failed to log token refresh:', error);
        }
    }

    /**
     * Clean up expired previous tokens (grace period cleanup)
     */
    async cleanupExpiredPreviousTokens(): Promise<number> {
        const result = await prisma.session.updateMany({
            where: {
                previousTokenExpiresAt: {
                    lt: new Date(),
                },
                previousToken: {
                    not: null,
                },
            } as any,
            data: {
                previousToken: null,
                previousTokenExpiresAt: null,
                previousRefreshToken: null,
            } as any,
        });
        return result.count;
    }
}
