/**
 * Secure Document Routes
 * 
 * Routes for password-protected document access
 */

import { FastifyInstance } from 'fastify';
import { SecureDocumentService } from '@documents/services/secure-document.service';
import { prisma } from '@config/database.config';
import { env } from '@config/env.config';
import { logger } from '@utils/common/logger.util';
import { z } from 'zod';

const validatePasswordSchema = z.object({
    token: z.string().min(1),
    password: z.string().length(4, 'รหัสผ่านต้องเป็นตัวเลข 4 หลัก'),
});

type ValidatePasswordBody = z.infer<typeof validatePasswordSchema>;

export async function secureDocumentRoutes(app: FastifyInstance) {
    const secureDocumentService = new SecureDocumentService();

    function getRequestOrigin(request: any): string {
        const protoHeader = request.headers['x-forwarded-proto'];
        const hostHeader = request.headers['x-forwarded-host'] || request.headers.host;
        const proto = (Array.isArray(protoHeader) ? protoHeader[0] : protoHeader) || 'http';
        const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
        return `${proto}://${host}`;
    }

    function isLocalHostname(hostname: string): boolean {
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    }

    function getPreferredUploadsBaseUrl(request: any): string {
        const derivedOrigin = getRequestOrigin(request);
        try {
            const derivedHost = new URL(derivedOrigin).hostname;
            // If the request arrives via a local reverse proxy (e.g. Vite proxy / cloudflared),
            // the Host header can be `localhost:*` which would create broken public URLs.
            if (isLocalHostname(derivedHost)) {
                return env.BACKEND_URL || derivedOrigin;
            }
            return derivedOrigin;
        } catch {
            return env.BACKEND_URL || derivedOrigin;
        }
    }

    function rewriteUploadsUrlToPreferredBase(documentUrl: string, preferredBaseUrl: string): string {
        try {
            const preferred = new URL(preferredBaseUrl);

            // Relative uploads path -> absolutize using preferred base URL
            if (documentUrl.startsWith('/uploads/') || documentUrl.startsWith('uploads/')) {
                const cleanPath = documentUrl.startsWith('/') ? documentUrl : `/${documentUrl}`;
                const absolutized = new URL(cleanPath, preferred).toString();
                logger.info(
                    { originalUrl: documentUrl, rewrittenUrl: absolutized, preferredBaseUrl },
                    'Absolutized uploads URL'
                );
                return absolutized;
            }

            const parsed = new URL(documentUrl);
            if (!parsed.pathname.startsWith('/uploads/')) {
                return documentUrl;
            }

            // Never rewrite to localhost; customers can't reach it.
            if (isLocalHostname(preferred.hostname)) {
                return documentUrl;
            }

            // Only rewrite host/protocol when it actually changes.
            if (parsed.hostname === preferred.hostname && parsed.protocol === preferred.protocol) {
                return documentUrl;
            }

            parsed.protocol = preferred.protocol;
            parsed.host = preferred.host;
            
            logger.info({ 
                originalUrl: documentUrl, 
                rewrittenUrl: parsed.toString(),
                preferredBaseUrl 
            }, 'Rewriting uploads URL to preferred base');
            
            return parsed.toString();
        } catch (error) {
            logger.error({ error, documentUrl, preferredBaseUrl }, 'Error rewriting URL');
            return documentUrl;
        }
    }

    /**
     * Validate password and get document URL
     * POST /api/secure-documents/validate
     */
    app.post<{
        Body: ValidatePasswordBody;
    }>(
        '/api/secure-documents/validate',
        async (request, reply) => {
            try {
                // Validate input
                const validation = validatePasswordSchema.safeParse(request.body);
                if (!validation.success) {
                    return reply.code(400).send({
                        success: false,
                        error: validation.error.errors[0]?.message || 'Invalid input',
                    });
                }

                const { token, password } = validation.data;

                // Validate password and get document URL
                const result = await secureDocumentService.validateAndGrantAccess(
                    token,
                    password
                );

                if (!result.success) {
                    return reply.code(401).send(result);
                }

                if (result.success && result.documentUrl) {
                    const preferredBaseUrl = getPreferredUploadsBaseUrl(request);
                    const rewrittenUrl = rewriteUploadsUrlToPreferredBase(result.documentUrl, preferredBaseUrl);
                    return reply.send({ ...result, documentUrl: rewrittenUrl });
                }

                return reply.send(result);
            } catch (error) {
                logger.error({ error }, 'Error validating secure document access');
                return reply.code(500).send({
                    success: false,
                    error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
                });
            }
        }
    );

    /**
     * Get token info (without sensitive data)
     * GET /api/secure-documents/:token/info
     */
    app.get<{
        Params: {
            token: string;
        };
    }>(
        '/api/secure-documents/:token/info',
        async (request, reply) => {
            try {
                const { token } = request.params;

                const tokenRecord = await prisma.secureDocumentToken.findUnique({
                    where: { token },
                    select: {
                        documentType: true,
                        expiresAt: true,
                        customer: {
                            select: {
                                businessName: true,
                            },
                        },
                    },
                });

                if (!tokenRecord) {
                    return reply.code(404).send({
                        error: 'ลิงก์ไม่ถูกต้องหรือหมดอายุ',
                    });
                }

                // Check if expired
                if (new Date() > tokenRecord.expiresAt) {
                    return reply.code(410).send({
                        error: 'ลิงก์หมดอายุแล้ว',
                    });
                }

                return reply.send({
                    documentType: tokenRecord.documentType,
                    businessName: tokenRecord.customer.businessName,
                    expiresAt: tokenRecord.expiresAt,
                });
            } catch (error) {
                logger.error({ error }, 'Error getting token info');
                return reply.code(500).send({
                    error: 'เกิดข้อผิดพลาด',
                });
            }
        }
    );

    /**
     * View document directly with token and password
     * GET /api/secure-documents/:token/view?password=xxxx
     * This endpoint serves the PDF directly for LINE browser compatibility
     */
    app.get<{
        Params: {
            token: string;
        };
        Querystring: {
            password: string;
        };
    }>(
        '/api/secure-documents/:token/view',
        async (request, reply) => {
            try {
                const { token } = request.params;
                const { password } = request.query;

                if (!password || password.length !== 4) {
                    return reply.code(400).send({
                        success: false,
                        error: 'รหัสผ่านไม่ถูกต้อง',
                    });
                }

                // Validate password and get document URL
                const result = await secureDocumentService.validateAndGrantAccess(
                    token,
                    password
                );

                if (!result.success || !result.documentUrl) {
                    return reply.code(401).send({
                        success: false,
                        error: result.error || 'ไม่สามารถเข้าถึงเอกสารได้',
                    });
                }

                // Fix stale stored URLs: rewrite /uploads/* to the current request origin
                const preferredBaseUrl = getPreferredUploadsBaseUrl(request);
                const documentUrl = rewriteUploadsUrlToPreferredBase(result.documentUrl, preferredBaseUrl);

                // Try to serve PDF directly if it's a local uploads path
                // This avoids redirect validation issues and works better in LINE browser
                try {
                    const urlObj = new URL(documentUrl);
                    if (urlObj.pathname.startsWith('/uploads/')) {
                        const fs = await import('fs/promises');
                        const path = await import('path');
                        const filePath = path.join(process.cwd(), urlObj.pathname);
                        const fileBuffer = await fs.readFile(filePath);
                        return reply
                            .header('Content-Type', 'application/pdf')
                            .header('Content-Disposition', `inline; filename="document.pdf"`)
                            .header('Cache-Control', 'private, no-cache')
                            .send(fileBuffer);
                    }
                } catch (serveErr) {
                    logger.warn({ serveErr, documentUrl }, 'Could not serve PDF directly, falling back to redirect');
                }

                // ✅ SECURITY FIX: Validate URL before redirect (prevent open redirect)
                const { isValidRedirectUrl } = await import('@utils/security/url-validator.util');
                if (!isValidRedirectUrl(documentUrl)) {
                    // Try adding current host to make it valid
                    logger.warn({ documentUrl }, 'URL not in whitelist, attempting to serve via proxy');
                    try {
                        const urlObj = new URL(documentUrl);
                        const fs = await import('fs/promises');
                        const path = await import('path');
                        const filePath = path.join(process.cwd(), urlObj.pathname);
                        const fileBuffer = await fs.readFile(filePath);
                        return reply
                            .header('Content-Type', 'application/pdf')
                            .header('Content-Disposition', `inline; filename="document.pdf"`)
                            .send(fileBuffer);
                    } catch {
                        logger.warn({ documentUrl }, 'Invalid redirect URL detected');
                        return reply.code(400).send({
                            success: false,
                            error: 'ไม่สามารถเข้าถึงเอกสารได้ กรุณาติดต่อเจ้าหน้าที่',
                        });
                    }
                }

                // Redirect to the document URL
                return reply.redirect(documentUrl, 302);
            } catch (error) {
                logger.error({ error }, 'Error viewing secure document');
                return reply.code(500).send({
                    success: false,
                    error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
                });
            }
        }
    );
}
