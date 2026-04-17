import crypto from 'crypto';
import { env } from '@config/env.config';

export interface OverpaymentLinkTokenPayload {
    loanId: string;
    lineUserId: string;
    exp: number; // unix ms
}

export class OverpaymentLinkTokenService {
    private static getSecret(): string {
        // Use a stable server-only secret. LINE channel secret is already required in env.
        return env.LINE_CHANNEL_SECRET || env.JWT_SECRET;
    }

    static createToken(payload: Omit<OverpaymentLinkTokenPayload, 'exp'>, ttlMs: number): string {
        const fullPayload: OverpaymentLinkTokenPayload = {
            ...payload,
            exp: Date.now() + ttlMs,
        };

        const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
        const signature = crypto
            .createHmac('sha256', this.getSecret())
            .update(encodedPayload)
            .digest('base64url');

        return `${encodedPayload}.${signature}`;
    }

    static verifyToken(token: string): OverpaymentLinkTokenPayload | null {
        const [encodedPayload, signature] = token.split('.');
        if (!encodedPayload || !signature) return null;

        const expectedSignature = crypto
            .createHmac('sha256', this.getSecret())
            .update(encodedPayload)
            .digest('base64url');

        // Constant-time compare
        const sigOk =
            expectedSignature.length === signature.length &&
            crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
        if (!sigOk) return null;

        try {
            const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as OverpaymentLinkTokenPayload;
            if (!payload?.loanId || !payload?.lineUserId || !payload?.exp) return null;
            if (Date.now() > payload.exp) return null;
            return payload;
        } catch {
            return null;
        }
    }
}

