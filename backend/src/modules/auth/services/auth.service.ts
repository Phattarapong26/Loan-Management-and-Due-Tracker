import { FastifyRequest } from 'fastify';
import { UserRepository } from '@users/repositories/user.repository';
import { SessionRepository } from '@auth/repositories/session.repository';
import { EncryptionUtil } from '@utils/security/encryption.util';
import { JWTUtil } from '@utils/security/jwt.util';
import { LoginInput, RegisterInput, AuthResponse } from '../models/auth.model';
import { env, parseExpiryToMs } from '@config/env.config';
import { QueueUtil } from '@utils/common/queue.util';
import { logger } from '@utils/common/logger.util';
import { ConfigService } from '@modules/config/services/config.service';
import { trackFailedLogin, clearFailedAttempts } from '@core/middleware/security/brute-force-protection.middleware';

/**
 * Auth Service - Business logic ONLY
 * Orchestrates repositories and handles business rules
 */
export class AuthService {
    private userRepository: UserRepository;
    private sessionRepository: SessionRepository;

    constructor() {
        this.userRepository = new UserRepository();
        this.sessionRepository = new SessionRepository();
    }

    private normalizeEmail(email: string): string {
        return String(email || '').trim().toLowerCase();
    }

    /**
     * Calculate session expiry date from config
     */
    private getSessionExpiryDate(): Date {
        const expiryMs = parseExpiryToMs(env.SESSION_EXPIRES_IN);
        return new Date(Date.now() + expiryMs);
    }

    /**
     * Enforce max concurrent sessions per user (FIFO)
     */
    private async enforceSessionLimit(userId: string): Promise<void> {
        const activeCount = await this.sessionRepository.countActiveSessionsByUserId(userId);

        if (activeCount >= env.MAX_SESSIONS_PER_USER) {
            // Delete oldest sessions to make room
            const deleted = await this.sessionRepository.deleteOldestSessions(
                userId,
                env.MAX_SESSIONS_PER_USER - 1 // Keep one less to make room for new session
            );
            logger.info({ userId, deleted }, 'Session limit enforced — oldest sessions deleted (FIFO)');
        }
    }

    /**
     * Register new user
     */
    async register(
        request: FastifyRequest,
        input: RegisterInput
    ): Promise<AuthResponse> {
        const email = this.normalizeEmail(input.email);

        // Check if user exists
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('User already exists');
        }

        // Hash password
        const passwordHash = await EncryptionUtil.hashPassword(input.password);

        // Encrypt sensitive data
        const nationalId = input.nationalId
            ? EncryptionUtil.encrypt(input.nationalId)
            : undefined;

        // Create user
        const user = await this.userRepository.create({
            email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            phoneNumber: input.phoneNumber,
            nationalId,
        });

        // Get user with branch
        const userWithBranch = await this.userRepository.findById(user.id);

        // Generate Session ID explicitly
        const sessionId = EncryptionUtil.generateUUID();

        // Generate tokens
        const accessToken = await JWTUtil.generateAccessToken(request, {
            userId: user.id,
            email: user.email,
            role: user.role,
            branchId: userWithBranch?.branchId || undefined,
            sessionId, // ✅ Add sessionId to payload
        });

        const refreshToken = await JWTUtil.generateRefreshToken(request, {
            userId: user.id,
            sessionId,
        });

        // SESSION LIMIT: Enforce max concurrent sessions (FIFO)
        await this.enforceSessionLimit(user.id);

        // Create session with explicit ID
        await this.sessionRepository.create({
            id: sessionId, // ✅ Use generated ID
            userId: user.id,
            token: accessToken,
            refreshToken,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            expiresAt: this.getSessionExpiryDate(), // Use config-based expiry
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * Login user
     */
    async login(request: FastifyRequest, input: LoginInput): Promise<AuthResponse> {
        const ipAddress = request.ip;
        const userAgent = request.headers['user-agent'];
        const email = this.normalizeEmail(input.email);

        // Find user
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            // Track failed attempt
            await trackFailedLogin(ipAddress, email, userAgent);
            throw new Error('Invalid credentials');
        }

        // Verify password
        const isValidPassword = await EncryptionUtil.verifyPassword(
            input.password,
            user.passwordHash
        );
        if (!isValidPassword) {
            // Track failed attempt
            await trackFailedLogin(ipAddress, email, userAgent);
            throw new Error('Invalid credentials');
        }

        // Check user status
        if (user.status !== 'ACTIVE') {
            throw new Error('Account is not active');
        }

        // ✅ Clear failed attempts on successful login
        clearFailedAttempts(ipAddress);

        // Get user with branch
        const userWithBranch = await this.userRepository.findById(user.id);

        // Generate Session ID explicitly
        const sessionId = EncryptionUtil.generateUUID();

        // Generate tokens
        const accessToken = await JWTUtil.generateAccessToken(request, {
            userId: user.id,
            email: user.email,
            role: user.role,
            branchId: userWithBranch?.branchId || undefined,
            sessionId, // ✅ Add sessionId to payload
        });

        const refreshToken = await JWTUtil.generateRefreshToken(request, {
            userId: user.id,
            sessionId,
        });

        // SESSION LIMIT: Enforce max concurrent sessions (FIFO)
        await this.enforceSessionLimit(user.id);

        // Create session with sliding window expiry
        await this.sessionRepository.create({
            id: sessionId, // ✅ Use generated ID
            userId: user.id,
            token: accessToken,
            refreshToken,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            expiresAt: this.getSessionExpiryDate(), // Use config-based expiry
        });

        // Update last login
        await this.userRepository.updateLastLogin(user.id);

        // Log successful login
        logger.info({ userId: user.id, email: user.email, ipAddress }, '✅ Successful login');

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                branch: userWithBranch?.branch,
            },
            accessToken,
            refreshToken,
        };
    }

    /**
     * Logout user
     */
    async logout(token: string): Promise<void> {
        const session = await this.sessionRepository.findByToken(token);
        if (session) {
            await this.sessionRepository.invalidate(session.id);
        }
    }

    /**
     * Refresh access token
     * IMPROVEMENTS:
     * 1. Refresh Token Rotation - สร้าง refresh token ใหม่ทุกครั้ง
     * 2. Grace Period - เก็บ token เก่าไว้ชั่วคราวป้องกัน race condition
     * 3. Audit Logging - บันทึกทุกครั้งที่ refresh เพื่อ security investigation
     */
    async refreshToken(
        request: FastifyRequest,
        refreshToken: string
    ): Promise<{ accessToken: string; refreshToken: string }> {
        // Verify refresh token
        const payload = await JWTUtil.verifyRefreshToken(request, refreshToken);

        // Find session by refresh token (check both current and previous for grace period)
        const session = await this.sessionRepository.findByRefreshToken(refreshToken);

        // If not found in current, check previous (grace period)
        let isUsingPreviousToken = false;
        let validSession = session;

        if (!session || !session.isValid) {
            // Check if this is a previous refresh token (within grace period)
            const sessionByPrevious = await this.sessionRepository.findByPreviousRefreshToken(refreshToken);

            if (sessionByPrevious) {
                validSession = sessionByPrevious;
                isUsingPreviousToken = true;
                logger.debug({ sessionId: sessionByPrevious.id }, 'Using previous refresh token (grace period)');
            } else {
                throw new Error('Invalid refresh token');
            }
        }

        if (!validSession) {
            throw new Error('Invalid refresh token');
        }

        // Find user
        const user = await this.userRepository.findById(payload.userId);
        if (!user || user.status !== 'ACTIVE') {
            throw new Error('User not found or inactive');
        }

        // Store old tokens for audit
        const oldAccessToken = validSession.token;
        const oldRefreshToken = validSession.refreshToken || refreshToken;

        // Generate new access token with branch
        const newAccessToken = await JWTUtil.generateAccessToken(request, {
            userId: user.id,
            email: user.email,
            role: user.role,
            branchId: user.branchId || undefined,
            sessionId: validSession.id, // ✅ Keep existing session link
        });

        // REFRESH TOKEN ROTATION: Generate new refresh token
        const newRefreshToken = await JWTUtil.generateRefreshToken(request, {
            userId: user.id,
            sessionId: validSession.id,
        });

        // Update session with both new tokens and keep old ones for grace period
        logger.debug({ sessionId: validSession.id }, 'Updating session with token rotation');

        await this.sessionRepository.updateToken(
            validSession.id,
            newAccessToken,
            newRefreshToken
        );

        // AUDIT LOGGING: Log token refresh for security investigation
        await this.sessionRepository.logTokenRefresh({
            userId: user.id,
            sessionId: validSession.id,
            oldAccessToken,
            newAccessToken,
            oldRefreshToken,
            newRefreshToken,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            refreshReason: isUsingPreviousToken ? 'GRACE_PERIOD' : 'USER_INITIATED',
        });

        logger.debug({ sessionId: validSession.id }, 'Session updated successfully with rotation');

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken, // Return new refresh token
        };
    }

    /**
     * Forgot password - Send reset link to email
     */
    async forgotPassword(request: FastifyRequest, email: string): Promise<void> {
        const normalizedEmail = this.normalizeEmail(email);
        const user = await this.userRepository.findByEmail(normalizedEmail);
        if (!user) {
            // Logic: Don't reveal if user exists or not for security, 
            // but for this internal system, maybe just return success anyway
            return;
        }

        // Generate reset token
        const resetToken = await JWTUtil.generateResetToken(request, {
            userId: user.id,
            email: user.email,
        });

        // Get the current frontend URL (dynamic or fallback to configured)
        const configService = ConfigService.getInstance();
        const frontendUrl = await configService.getFrontendUrl(env.FRONTEND_URL);

        // Construct reset URL
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

        logger.info({ frontendUrl, resetUrl }, 'Sending password reset email');

        // Queue email job
        await QueueUtil.addJob('email', {
            name: 'send-forgot-password-link',
            data: {
                to: user.email,
                data: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    resetUrl,
                },
            },
        });
    }

    /**
     * Reset password using token
     */
    async resetPasswordWithToken(request: FastifyRequest, token: string, newPassword: string): Promise<void> {
        // Verify token
        let payload;
        try {
            payload = await JWTUtil.verifyResetToken(request, token);
        } catch (error) {
            throw new Error('Invalid or expired reset token');
        }

        // Hash new password
        const passwordHash = await EncryptionUtil.hashPassword(newPassword);

        // Update user password and clear mustChangePassword
        await this.userRepository.update(payload.userId, {
            passwordHash,
            mustChangePassword: false,
            passwordChangedAt: new Date(),
        });

        // Get user for notification
        const user = await this.userRepository.findById(payload.userId);
        if (user) {
            // Queue confirmation email
            await QueueUtil.addJob('email', {
                name: 'send-password-reset-notification',
                data: {
                    to: user.email,
                    subject: 'รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว',
                    template: 'password-reset',
                    data: {
                        firstName: user.firstName,
                        lastName: user.lastName,
                        isSelfDefined: true,
                    },
                },
            });
        }
    }

    /**
     * Change password (authenticated user, requires current password)
     */
    async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
        // Use findByEmail-style query that includes passwordHash
        const user = await this.userRepository.findById(userId);
        if (!user) throw new Error('User not found');

        const passwordHash = (user as any).passwordHash;
        if (!passwordHash) throw new Error('User account error');

        const isValid = await EncryptionUtil.verifyPassword(currentPassword, passwordHash);
        if (!isValid) throw new Error('รหัสผ่านปัจจุบันไม่ถูกต้อง');

        const newPasswordHash = await EncryptionUtil.hashPassword(newPassword);
        await this.userRepository.update(userId, {
            passwordHash: newPasswordHash,
            mustChangePassword: false,
            passwordChangedAt: new Date(),
        });
    }
}
