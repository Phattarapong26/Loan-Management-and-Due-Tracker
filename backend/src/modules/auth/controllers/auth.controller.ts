import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { JWTUtil } from '@utils/security/jwt.util';
import { LoginInput, RegisterInput, RefreshTokenInput, ForgotPasswordInput, ResetPasswordWithTokenInput, ChangePasswordInput } from '../models/auth.model';
import { UserRepository } from '@users/repositories/user.repository';

/**
 * Auth Controller - Request/Response ONLY
 * NO business logic, NO conditionals
 * Just pipe data to services
 */
export class AuthController {
    private authService: AuthService;
    private userRepository: UserRepository;

    constructor() {
        this.authService = new AuthService();
        this.userRepository = new UserRepository();
    }

    /**
     * Register new user
     */
    register = async (
        request: FastifyRequest<{ Body: RegisterInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.authService.register(request, request.body);

            JWTUtil.setAccessTokenCookie(reply, result.accessToken);
            JWTUtil.setRefreshTokenCookie(reply, result.refreshToken);

            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Login user
     */
    login = async (
        request: FastifyRequest<{ Body: LoginInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.authService.login(request, request.body);

            JWTUtil.setAccessTokenCookie(reply, result.accessToken);
            JWTUtil.setRefreshTokenCookie(reply, result.refreshToken);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 401);
        }
    };

    /**
     * Logout user
     * FIX: Support both Cookie and Authorization Header
     */
    logout = async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // Get token from cookie OR header (for mobile/API clients)
            const authHeader = request.headers.authorization;
            const token = request.cookies.accessToken ||
                (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '');

            if (!token) {
                return ResponseUtil.error(reply, 'No token provided', 400);
            }

            await this.authService.logout(token);

            JWTUtil.clearAuthCookies(reply);

            return ResponseUtil.success(reply, { message: 'Logged out successfully' });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Refresh access token
     * TOKEN ROTATION: Returns both new access token AND new refresh token
     */
    refreshToken = async (
        request: FastifyRequest<{ Body: RefreshTokenInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.authService.refreshToken(
                request,
                request.body.refreshToken
            );

            // Set both tokens in cookies (TOKEN ROTATION)
            JWTUtil.setAccessTokenCookie(reply, result.accessToken);
            JWTUtil.setRefreshTokenCookie(reply, result.refreshToken);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 401);
        }
    };

    /**
     * Get current user
     */
    me = async (request: FastifyRequest, reply: FastifyReply) => {
        const userId = (request.user as any).userId;
        const user = await this.userRepository.findById(userId);
        return ResponseUtil.success(reply, user);
    };

    /**
     * Debug current auth context (JWT payload + minimal DB user fields)
     * Helpful for diagnosing missing branchId/role mismatches in dashboards.
     */
    meDebug = async (request: FastifyRequest, reply: FastifyReply) => {
        const payload = request.user as any;
        const userId = payload?.userId;

        const user = userId ? await this.userRepository.findById(userId) : null;

        return ResponseUtil.success(reply, {
            jwt: payload
                ? {
                      userId: payload.userId,
                      email: payload.email,
                      role: payload.role,
                      branchId: payload.branchId || null,
                  }
                : null,
            user: user
                ? {
                      id: user.id,
                      email: user.email,
                      role: user.role,
                      status: user.status,
                      branchId: user.branchId || null,
                      branch: user.branch
                          ? { id: user.branch.id, code: user.branch.code, name: user.branch.name }
                          : null,
                  }
                : null,
        });
    };

    /**
     * Request password reset link
     */
    forgotPassword = async (
        request: FastifyRequest<{ Body: ForgotPasswordInput }>,
        reply: FastifyReply
    ) => {
        try {
            await this.authService.forgotPassword(request, request.body.email);
            return ResponseUtil.success(reply, { message: 'Reset link sent to email if account exists' });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Reset password using token
     */
    resetPasswordWithToken = async (
        request: FastifyRequest<{ Body: ResetPasswordWithTokenInput }>,
        reply: FastifyReply
    ) => {
        try {
            await this.authService.resetPasswordWithToken(
                request,
                request.body.token,
                request.body.password
            );
            return ResponseUtil.success(reply, { message: 'Password reset successfully' });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Change password (authenticated, requires current password)
     */
    changePassword = async (
        request: FastifyRequest<{ Body: ChangePasswordInput }>,
        reply: FastifyReply
    ) => {
        try {
            const userId = (request.user as any).userId;
            await this.authService.changePassword(userId, request.body.currentPassword, request.body.newPassword);
            return ResponseUtil.success(reply, { message: 'Password changed successfully' });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}
