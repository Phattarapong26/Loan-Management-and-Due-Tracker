import { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '@config/env.config';
import crypto from 'crypto';

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
    branchId?: string; // Branch ID for branch-level isolation
    sessionId: string; // ✅ Link JWT to specific session
    jti?: string; // JWT ID for uniqueness
}

export interface RefreshTokenPayload {
    userId: string;
    sessionId: string;
    jti?: string; // JWT ID for uniqueness
}

export interface ResetTokenPayload {
    userId: string;
    email: string;
    jti?: string;
}

/**
 * JWT Utility for token generation and verification
 */
export class JWTUtil {
    /**
     * Convert JWT expiry string to seconds
     * Examples: "1h" -> 3600, "7d" -> 604800, "15m" -> 900
     */
    private static parseExpiryToSeconds(expiry: string): number {
        const match = expiry.match(/^(\d+)([smhd])$/);
        if (!match || !match[1] || !match[2]) {
            console.warn(`[JWT] Invalid expiry format: ${expiry}, defaulting to 1 hour`);
            return 3600;
        }

        const value = parseInt(match[1], 10);
        const unit = match[2] as string;

        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 24 * 60 * 60;
            default: return 3600;
        }
    }

    /**
     * Generate access token
     */
    /**
     * Generate access token
     */
    static async generateAccessToken(
        request: FastifyRequest,
        payload: JWTPayload
    ): Promise<string> {
        // Add random JTI (JWT ID) to ensure uniqueness even if generated in same second
        const jti = crypto.randomUUID();
        return request.server.jwt.sign({ ...payload, jti }, {
            expiresIn: env.JWT_EXPIRES_IN,
        });
    }

    /**
     * Generate refresh token
     */
    static async generateRefreshToken(
        request: FastifyRequest,
        payload: RefreshTokenPayload
    ): Promise<string> {
        const jti = crypto.randomUUID();
        return request.server.jwt.sign({ ...payload, jti }, {
            expiresIn: env.JWT_REFRESH_EXPIRES_IN,
            secret: env.JWT_REFRESH_SECRET,
        } as any);
    }

    /**
     * Verify access token
     */
    static async verifyAccessToken(
        request: FastifyRequest,
        token: string
    ): Promise<JWTPayload> {
        const payload = await request.server.jwt.verify<JWTPayload>(token);
        
        // ✅ SECURITY FIX: Check token blacklist (for emergency revocation)
        if (payload.jti) {
            const { default: redis } = await import('@config/redis.config');
            const isBlacklisted = await redis.get(`blacklist:${payload.jti}`);
            if (isBlacklisted) {
                throw new Error('Token has been revoked');
            }
        }
        
        return payload;
    }

    /**
     * Decode token without verification (to check expiry)
     */
    static decodeToken(token: string): any {
        try {
            const parts = token.split('.');
            if (parts.length !== 3 || !parts[1]) return null;
            const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
            return JSON.parse(payload);
        } catch {
            return null;
        }
    }

    /**
     * Check if token is about to expire (within 5 minutes)
     */
    static isTokenExpiringSoon(token: string): boolean {
        const decoded = this.decodeToken(token);
        if (!decoded || !decoded.exp) return false;

        const expiryTime = decoded.exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        return (expiryTime - now) < fiveMinutes;
    }

    /**
     * Verify refresh token
     */
    static async verifyRefreshToken(
        request: FastifyRequest,
        token: string
    ): Promise<RefreshTokenPayload> {
        return request.server.jwt.verify<RefreshTokenPayload>(token, {
            secret: env.JWT_REFRESH_SECRET,
        } as any);
    }

    /**
     * Set access token cookie
     * Uses same expiry as JWT token to prevent ghost logout
     */
    static setAccessTokenCookie(reply: FastifyReply, token: string): void {
        const maxAge = this.parseExpiryToSeconds(env.JWT_EXPIRES_IN);

        reply.setCookie('accessToken', token, {
            httpOnly: true,
            secure: env.isProduction,
            sameSite: 'strict',
            path: '/',
            maxAge, // Synced with JWT expiry
        });
    }

    /**
     * Set refresh token cookie
     * Uses same expiry as refresh JWT token
     */
    static setRefreshTokenCookie(reply: FastifyReply, token: string): void {
        const maxAge = this.parseExpiryToSeconds(env.JWT_REFRESH_EXPIRES_IN);

        reply.setCookie('refreshToken', token, {
            httpOnly: true,
            secure: env.isProduction,
            sameSite: 'strict',
            path: '/',
            maxAge, // Synced with refresh JWT expiry
        });
    }

    /**
     * Clear authentication cookies
     */
    static clearAuthCookies(reply: FastifyReply): void {
        reply.clearCookie('accessToken', { path: '/' });
        reply.clearCookie('refreshToken', { path: '/' });
    }

    /**
     * Generate password reset token
     */
    static async generateResetToken(
        request: FastifyRequest,
        payload: ResetTokenPayload
    ): Promise<string> {
        const jti = crypto.randomUUID();
        return request.server.jwt.sign({ ...payload, jti } as any, {
            expiresIn: '1h', // Reset token expires in 1 hour
        });
    }

    /**
     * Verify password reset token
     */
    static async verifyResetToken(
        request: FastifyRequest,
        token: string
    ): Promise<ResetTokenPayload> {
        return request.server.jwt.verify<ResetTokenPayload>(token);
    }

    /**
     * ✅ SECURITY FIX: Revoke token (emergency use)
     * Adds token to blacklist until it expires
     */
    static async revokeToken(token: string): Promise<void> {
        const decoded = this.decodeToken(token);
        if (!decoded || !decoded.exp || !decoded.jti) return;
        
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
            const { default: redis } = await import('@config/redis.config');
            // Store in blacklist until token expires
            await redis.setex(`blacklist:${decoded.jti}`, ttl, '1');
        }
    }
}
