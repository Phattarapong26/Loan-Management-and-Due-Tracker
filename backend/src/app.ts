import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { env } from '@config/env.config';
import { errorHandler } from '@middlewares/logging/error.middleware';
import { auditLog } from '@middlewares/logging/audit.middleware';
import { sanitizeInputMiddleware } from '@middlewares/security/sanitize.middleware';
import { correlationIdMiddleware } from '@core/middleware/common/correlation-id.middleware';
import { securityScanner } from './modules/monitoring/middleware/security-scanner.middleware';
import { timezonePlugin } from '@middlewares/common/timezone.middleware';
import { registerRoutes } from './routes';

export async function buildApp() {
    const app = Fastify({
        logger: {
            level: env.LOG_LEVEL || 'info',
            transport: env.isDevelopment ? {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                }
            } : undefined,
        },
        requestIdHeader: 'x-request-id',
        requestIdLogLabel: 'requestId',
        disableRequestLogging: false,
        trustProxy: true,
        bodyLimit: 10 * 1024 * 1024, // 10MB
    });

    // Security plugins
    await app.register(helmet, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            }
        },
        // Enable HSTS (Strict-Transport-Security)
        hsts: {
            maxAge: 31536000, // 1 year in seconds
            includeSubDomains: true,
            preload: true,
        },
        // Enable X-Frame-Options (Anti-clickjacking)
        frameguard: {
            action: 'deny',
        },
        // Hide X-Powered-By header
        hidePoweredBy: true,
        // Enable other helmet protections
        crossOriginEmbedderPolicy: env.isProduction,
        crossOriginOpenerPolicy: env.isProduction,
        crossOriginResourcePolicy: env.isProduction,
        // Prevent MIME type sniffing
        noSniff: true,
        // Enable XSS filter
        xssFilter: true,
    });

    await app.register(cors, {
        origin: (origin, cb) => {
            const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
            // Allow if no origin (e.g. server-to-server or local tools)
            if (!origin) {
                cb(null, true);
                return;
            }

            // Allow if matches configured origins
            if (allowedOrigins.includes(origin)) {
                cb(null, true);
                return;
            }

            // Allow Railway domains dynamically
            if (origin.endsWith('.up.railway.app')) {
                cb(null, true);
                return;
            }

            // Block otherwise
            cb(new Error("Not allowed by CORS"), false);
        },
        credentials: true,
        // Cache preflight requests for 24 hours to reduce OPTIONS calls
        preflightContinue: false, // Let fastify-cors handle OPTIONS
        optionsSuccessStatus: 204,
        maxAge: 86400, // 24 hours in seconds
        // ✅ Removed X-Client-Timezone to enable CORS caching
        // Timezone is now sent via cookie instead of custom header
        allowedHeaders: [
            'Content-Type', 
            'Authorization', 
            'X-Request-ID', 
            'X-Correlation-ID',
        ],
        exposedHeaders: ['X-Request-ID', 'X-Correlation-ID'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    });

    await app.register(rateLimit, {
        max: env.RATE_LIMIT_MAX,
        timeWindow: env.RATE_LIMIT_TIME_WINDOW,
        keyGenerator: (request) => {
            // ✅ SECURITY FIX: Rate limit by user ID if authenticated, otherwise by IP
            // This prevents users from bypassing rate limits using multiple IPs
            return (request as any).user?.userId || request.ip;
        },
        errorResponseBuilder: () => ({
            success: false,
            error: {
                message: 'Too many requests, please try again later',
                code: 'RATE_LIMIT_EXCEEDED',
            },
        }),
    });

    // JWT plugin
    await app.register(jwt, {
        secret: env.JWT_SECRET,
        cookie: {
            cookieName: 'accessToken',
            signed: false,
        },
    });

    // Cookie plugin
    await app.register(cookie, {
        secret: env.SESSION_SECRET,
    });

    // Multipart plugin for file uploads
    await app.register(multipart, {
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
        },
    });

    // Static file serving for uploads (PDFs, etc.)
    await app.register(fastifyStatic, {
        root: path.join(process.cwd(), 'uploads'),
        prefix: '/uploads/',
    });

    // Global hooks - correlation ID first, then security scanner, sanitize, and audit
    app.addHook('onRequest', correlationIdMiddleware);
    
    // Add additional security headers
    app.addHook('onRequest', async (request, reply) => {
        // Remove server identification headers
        reply.removeHeader('Server');
        reply.removeHeader('X-Powered-By');
        
        // Add additional security headers
        reply.header('X-Content-Type-Options', 'nosniff');
        reply.header('X-Frame-Options', 'DENY');
        reply.header('X-XSS-Protection', '1; mode=block');
        reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
        reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
        
        // Add HSTS header for production
        if (env.isProduction) {
            reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }
    });
    
    // ✅ Optimize: Skip security scan for health/metrics endpoints
    app.addHook('preHandler', async (request, reply) => {
        const skipPaths = ['/api/health', '/api/metrics', '/uploads', '/api/config'];
        const shouldSkip = skipPaths.some(path => request.url.startsWith(path));
        if (!shouldSkip) {
            await securityScanner.scanRequest(request, reply);
        }
    });
    
    app.addHook('onRequest', sanitizeInputMiddleware);
    
    // ✅ Optimize: Skip audit log for read-only GET requests to list endpoints
    app.addHook('onRequest', async (request, reply) => {
        const skipAuditPaths = ['/api/health', '/api/metrics'];
        const isListEndpoint = request.method === 'GET' && 
                              (request.url.includes('/api/customers?') || 
                               request.url.includes('/api/loans?'));
        
        if (!skipAuditPaths.some(path => request.url.startsWith(path)) && !isListEndpoint) {
            await auditLog(request, reply);
        }
    });

    // Register timezone plugin
    await app.register(timezonePlugin);

    // Error handler
    app.setErrorHandler(errorHandler);

    // Register routes
    await registerRoutes(app);

    return app;
}
