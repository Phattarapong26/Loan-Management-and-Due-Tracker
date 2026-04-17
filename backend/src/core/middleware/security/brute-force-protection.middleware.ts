/**
 * Brute Force Protection Middleware
 * 
 * Features:
 * - Track failed login attempts per IP (using Redis)
 * - Track validation failures (potential scanning)
 * - Auto-block IPs after threshold
 * - Create security alerts
 * - Log all attempts
 * 
 * ✅ FIXED: Moved from in-memory Map to Redis to prevent memory leaks
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@config/database.config';
import redis from '@config/redis.config';
import { SecurityMonitorService, ThreatType, ThreatSeverity } from '@modules/monitoring/services/security-monitor.service';
import { logger } from '@utils/common/logger.util';

const securityMonitor = new SecurityMonitorService();

// Configuration
const MAX_FAILED_ATTEMPTS = 5; // Block after 5 failed login attempts
const MAX_VALIDATION_FAILURES = 20; // Block after 20 validation failures (scanning behavior)
const ATTEMPT_WINDOW_SECONDS = 15 * 60; // 15 minutes
const BLOCK_DURATION_MINUTES = 60; // Block for 1 hour

// Redis key prefixes
const REDIS_PREFIX = {
    FAILED_ATTEMPTS: 'brute_force:failed_attempts:',
    FAILED_EMAILS: 'brute_force:failed_emails:',
    VALIDATION_FAILURES: 'brute_force:validation_failures:',
};

/**
 * ตรวจสอบว่าเป็น load test request ที่ถูกต้องหรือไม่
 */
function isValidLoadTestRequest(request: FastifyRequest, ipAddress: string): boolean {
    // ❌ ห้ามใช้ใน production
    if (process.env.NODE_ENV === 'production') {
        return false;
    }

    // ✅ ต้องมา localhost เท่านั้น
    const isLocalhost = ipAddress === '127.0.0.1' || 
                       ipAddress === '::1' || 
                       ipAddress === 'localhost';
    
    if (!isLocalhost) {
        return false;
    }

    // ✅ ต้องมี secret token ที่ถูกต้อง
    const loadTestSecret = process.env.LOAD_TEST_SECRET;
    if (!loadTestSecret) {
        return false;
    }

    const providedToken = request.headers['x-load-test-token'];
    return providedToken === loadTestSecret;
}

/**
 * Check if IP is blocked
 */
export async function checkIPBlocked(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const ipAddress = request.ip;
    
    // 🔒 SECURITY: Only allow load test bypass in development + localhost + with secret
    const isLoadTest = isValidLoadTestRequest(request, ipAddress);
    if (isLoadTest) {
        logger.debug({ ipAddress }, 'Authorized load test request - skipping IP block check');
        return; // Skip IP block check for authorized load tests only
    }

    try {
        // Check if IP is blocked
        const isBlocked = await securityMonitor.isIPBlocked(ipAddress);

        if (isBlocked) {
            logger.warn({ ipAddress }, 'Blocked IP attempted access');

            // Log security event
            await securityMonitor.logSecurityEvent({
                ipAddress,
                endpoint: request.url,
                method: request.method,
                threat: {
                    type: ThreatType.BRUTE_FORCE,
                    severity: ThreatSeverity.HIGH,
                    description: 'Blocked IP attempted access',
                    blocked: true
                },
                metadata: {
                    userAgent: request.headers['user-agent']
                }
            });

            await reply.code(403).send({
                success: false,
                error: {
                    message: 'Access denied. Your IP has been blocked due to suspicious activity.',
                    code: 'IP_BLOCKED'
                }
            });
            return;
        }

        // If not blocked, continue to next handler
    } catch (error) {
        logger.error({ error, ipAddress }, 'Error checking IP block status');
        // Continue on error to avoid blocking legitimate users
    }
}

/**
 * Track failed login attempt (using Redis)
 */
export async function trackFailedLogin(
    ipAddress: string,
    email: string,
    userAgent?: string
): Promise<void> {
    try {
        const key = `${REDIS_PREFIX.FAILED_ATTEMPTS}${ipAddress}`;
        const emailsKey = `${REDIS_PREFIX.FAILED_EMAILS}${ipAddress}`;

        // Increment attempt count
        const count = await redis.incr(key);

        // Set expiry on first attempt
        if (count === 1) {
            await redis.expire(key, ATTEMPT_WINDOW_SECONDS);
            await redis.expire(emailsKey, ATTEMPT_WINDOW_SECONDS);
        }

        // Add email to set
        await redis.sadd(emailsKey, email);

        logger.warn({
            ipAddress,
            email,
            attemptCount: count,
            threshold: MAX_FAILED_ATTEMPTS
        }, 'Failed login attempt tracked');

        // Log to audit log
        await prisma.auditLog.create({
            data: {
                action: 'LOGIN_FAILED',
                entity: 'auth',
                ipAddress,
                userAgent,
                metadata: {
                    email,
                    attemptCount: count,
                    timestamp: new Date().toISOString()
                }
            }
        });

        // Log security event
        await securityMonitor.logSecurityEvent({
            ipAddress,
            endpoint: '/api/auth/login',
            method: 'POST',
            threat: {
                type: ThreatType.BRUTE_FORCE,
                severity: count >= MAX_FAILED_ATTEMPTS ? ThreatSeverity.CRITICAL : ThreatSeverity.MEDIUM,
                description: `Failed login attempt ${count}/${MAX_FAILED_ATTEMPTS}`,
                payload: email,
                blocked: false
            },
            metadata: {
                userAgent,
                targetEmail: email,
                attemptCount: count
            }
        });

        // Auto-block if threshold reached
        if (count >= MAX_FAILED_ATTEMPTS) {
            const targetEmails = await redis.smembers(emailsKey);
            await autoBlockIP(ipAddress, count, targetEmails, userAgent);
        }

    } catch (error) {
        logger.error({ error, ipAddress, email }, 'Error tracking failed login');
    }
}

/**
 * Auto-block IP after threshold
 */
async function autoBlockIP(
    ipAddress: string,
    attemptCount: number,
    targetEmails: string[],
    userAgent?: string
): Promise<void> {
    try {
        logger.error({
            ipAddress,
            attemptCount,
            targetEmails
        }, '🚨 AUTO-BLOCKING IP - Brute force attack detected');

        // Block IP
        await securityMonitor.autoBlockIP(
            ipAddress,
            `Brute force attack: ${attemptCount} failed login attempts targeting ${targetEmails.length} accounts`,
            BLOCK_DURATION_MINUTES
        );

        // Create critical security alert
        await prisma.securityAlert.create({
            data: {
                type: ThreatType.BRUTE_FORCE,
                severity: ThreatSeverity.CRITICAL,
                title: '🚨 Brute Force Attack Detected',
                description: `IP ${ipAddress} has been automatically blocked after ${attemptCount} failed login attempts`,
                ipAddress,
                endpoint: '/api/auth/login',
                status: 'OPEN',
                metadata: {
                    attemptCount,
                    targetEmails,
                    userAgent,
                    autoBlocked: true,
                    blockDuration: `${BLOCK_DURATION_MINUTES} minutes`,
                    detectedAt: new Date().toISOString()
                }
            }
        });

        // Clear from Redis
        const key = `${REDIS_PREFIX.FAILED_ATTEMPTS}${ipAddress}`;
        const emailsKey = `${REDIS_PREFIX.FAILED_EMAILS}${ipAddress}`;
        await redis.del(key, emailsKey);

        logger.info({ ipAddress }, '✅ IP auto-blocked successfully');

    } catch (error) {
        logger.error({ error, ipAddress }, '❌ Error auto-blocking IP');
    }
}

/**
 * Clear failed attempts on successful login
 */
export async function clearFailedAttempts(ipAddress: string): Promise<void> {
    try {
        const key = `${REDIS_PREFIX.FAILED_ATTEMPTS}${ipAddress}`;
        const emailsKey = `${REDIS_PREFIX.FAILED_EMAILS}${ipAddress}`;
        const validationKey = `${REDIS_PREFIX.VALIDATION_FAILURES}${ipAddress}`;
        
        await redis.del(key, emailsKey, validationKey);
        logger.debug({ ipAddress }, 'Failed attempts cleared after successful login');
    } catch (error) {
        logger.error({ error, ipAddress }, 'Error clearing failed attempts');
    }
}

/**
 * Track validation failure (potential scanning behavior) - using Redis
 */
export async function trackValidationFailure(
    ipAddress: string,
    endpoint: string,
    userAgent?: string
): Promise<void> {
    try {
        const key = `${REDIS_PREFIX.VALIDATION_FAILURES}${ipAddress}`;

        // Increment failure count
        const count = await redis.incr(key);

        // Set expiry on first failure
        if (count === 1) {
            await redis.expire(key, ATTEMPT_WINDOW_SECONDS);
        }

        logger.warn({
            ipAddress,
            endpoint,
            validationFailureCount: count,
            threshold: MAX_VALIDATION_FAILURES
        }, 'Validation failure tracked (potential scanning)');

        // Log security event
        await securityMonitor.logSecurityEvent({
            ipAddress,
            endpoint,
            method: 'POST',
            threat: {
                type: ThreatType.SUSPICIOUS_PATTERN,
                severity: count >= MAX_VALIDATION_FAILURES ? ThreatSeverity.HIGH : ThreatSeverity.LOW,
                description: `Validation failure ${count}/${MAX_VALIDATION_FAILURES} (scanning behavior)`,
                blocked: false
            },
            metadata: {
                userAgent,
                validationFailureCount: count
            }
        });

        // Auto-block if threshold reached
        if (count >= MAX_VALIDATION_FAILURES) {
            await autoBlockIPForScanning(ipAddress, count, userAgent);
        }

    } catch (error) {
        logger.error({ error, ipAddress }, 'Error tracking validation failure');
    }
}

/**
 * Auto-block IP for scanning behavior
 */
async function autoBlockIPForScanning(
    ipAddress: string,
    failureCount: number,
    userAgent?: string
): Promise<void> {
    try {
        logger.error({
            ipAddress,
            validationFailureCount: failureCount
        }, '🚨 AUTO-BLOCKING IP - Scanning behavior detected');

        // Block IP
        await securityMonitor.autoBlockIP(
            ipAddress,
            `Scanning behavior: ${failureCount} validation failures (potential bot/scanner)`,
            BLOCK_DURATION_MINUTES
        );

        // Create high security alert
        await prisma.securityAlert.create({
            data: {
                type: ThreatType.SUSPICIOUS_PATTERN,
                severity: ThreatSeverity.HIGH,
                title: '🤖 Scanning Behavior Detected',
                description: `IP ${ipAddress} has been automatically blocked after ${failureCount} validation failures`,
                ipAddress,
                endpoint: '/api/auth/login',
                status: 'OPEN',
                metadata: {
                    validationFailureCount: failureCount,
                    userAgent,
                    autoBlocked: true,
                    blockDuration: `${BLOCK_DURATION_MINUTES} minutes`,
                    detectedAt: new Date().toISOString(),
                    reason: 'Potential bot or scanner activity'
                }
            }
        });

        // Clear from Redis
        const key = `${REDIS_PREFIX.VALIDATION_FAILURES}${ipAddress}`;
        await redis.del(key);

        logger.info({ ipAddress }, '✅ IP auto-blocked for scanning behavior');

    } catch (error) {
        logger.error({ error, ipAddress }, '❌ Error auto-blocking IP for scanning');
    }
}

/**
 * ✅ No longer needed - Redis handles TTL automatically
 * Cleanup is done by Redis expiration
 */
