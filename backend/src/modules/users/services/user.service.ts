import { FastifyRequest } from 'fastify';
import { UserRepository } from '../repositories/user.repository';
import { BranchRepository } from '@branches/repositories/branch.repository';
import { CreateUserInput, UpdateUserInput, ResetPasswordInput } from '../models/user.model';
import { env } from '@config/env.config';
import { EncryptionUtil } from '@utils/security/encryption.util';
import { JWTUtil } from '@utils/security/jwt.util';
import { QueueUtil } from '@utils/common/queue.util';
import { UserRole, UserStatus } from '@prisma/client';
import { UserWithBranch } from '../repositories/user.repository';

/**
 * User Service - Business logic ONLY
 * Orchestrates repositories and handles business rules
 */
export class UserService {
    private userRepository: UserRepository;
    private branchRepository: BranchRepository;

    constructor() {
        this.userRepository = new UserRepository();
        this.branchRepository = new BranchRepository();
    }

    /**
     * Create user with validation
     */
    async createUser(_request: FastifyRequest, input: CreateUserInput) {
        // Check if email already exists
        const emailExists = await this.userRepository.emailExists(input.email);
        if (emailExists) {
            throw new Error('Email already exists');
        }

        // Validate branch if provided
        if (input.branchId) {
            const branch = await this.branchRepository.findById(input.branchId);
            if (!branch) {
                throw new Error('Branch not found');
            }
        }

        // Generate temporary password
        const temporaryPassword = EncryptionUtil.generateRandomPassword(12);
        const passwordHash = await EncryptionUtil.hashPassword(temporaryPassword);

        // Encrypt national ID if provided
        const nationalId = input.nationalId
            ? EncryptionUtil.encrypt(input.nationalId)
            : undefined;

        // Create user
        const user = await this.userRepository.create({
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            phoneNumber: input.phoneNumber,
            nationalId,
            role: input.role,
            branchId: input.branchId,
        });

        // Queue email job to send temporary password
        await QueueUtil.addJob('email', {
            name: 'send-temporary-password',
            data: {
                to: user.email,
                subject: 'Welcome - Temporary Password',
                template: 'temporary-password',
                data: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    temporaryPassword,
                },
            },
        });

        // Return user without sensitive data
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: user.status,
            branchId: user.branchId,
            branch: user.branch,
            mustChangePassword: true,
            createdAt: user.createdAt,
        };
    }

    /**
     * Get user by ID
     */
    async getUser(userId: string) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        return this.sanitizeUser(user);
    }

    /**
     * List users
     */
    async listUsers(params: {
        page: number;
        limit: number;
        role?: string;
        status?: string;
        branchId?: string;
        search?: string;
    }) {
        const result = await this.userRepository.list({
            ...params,
            role: params.role as UserRole,
            status: params.status as UserStatus,
        });

        // Sanitize all users
        const users = result.users.map((user) => this.sanitizeUser(user));

        return {
            users,
            total: result.total,
            page: params.page,
            limit: params.limit,
            totalPages: Math.ceil(result.total / params.limit),
        };
    }

    /**
     * Update user
     */
    async updateUser(_request: FastifyRequest, userId: string, input: UpdateUserInput) {
        // Check if user exists
        const existingUser = await this.userRepository.findById(userId);
        if (!existingUser) {
            throw new Error('User not found');
        }

        // Check if email is being changed and if it already exists
        if (input.email && input.email !== existingUser.email) {
            const emailExists = await this.userRepository.emailExists(input.email, userId);
            if (emailExists) {
                throw new Error('Email already exists');
            }
        }

        // Validate branch if provided
        if (input.branchId !== undefined && input.branchId !== null) {
            const branch = await this.branchRepository.findById(input.branchId);
            if (!branch) {
                throw new Error('Branch not found');
            }
        }

        // Update user
        const user = await this.userRepository.update(userId, input);

        return this.sanitizeUser(user);
    }

    /**
     * Reset user password
     */
    async resetPassword(request: FastifyRequest, userId: string, input: ResetPasswordInput) {
        // Check if user exists
        const existingUser = await this.userRepository.findById(userId);
        if (!existingUser) {
            throw new Error('User not found');
        }

        // Handle sending reset link if requested
        if (input.sendResetLink) {
            const resetToken = await JWTUtil.generateResetToken(request, {
                userId: existingUser.id,
                email: existingUser.email,
            });

            const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

            await QueueUtil.addJob('email', {
                name: 'send-forgot-password-link',
                data: {
                    to: existingUser.email,
                    data: {
                        firstName: existingUser.firstName,
                        lastName: existingUser.lastName,
                        resetUrl,
                    },
                },
            });

            return {
                success: true,
                message: 'ลิงก์รีเซ็ตรหัสผ่านถูกส่งไปยังอีเมลของผู้ใช้แล้ว',
            };
        }

        // Use provided password or generate random one
        const isSelfDefined = !!input.newPassword;
        const newPassword = input.newPassword || EncryptionUtil.generateRandomPassword(12);

        // Hash new password
        const passwordHash = await EncryptionUtil.hashPassword(newPassword);

        // Update password
        // If it's self-defined (user entered it), it shouldn't be temporary
        const mustChangePassword = input.temporaryPassword ?? !isSelfDefined;

        const user = await this.userRepository.update(userId, {
            passwordHash,
            mustChangePassword,
            passwordChangedAt: new Date(),
        });

        // Queue email job to notify password change
        await QueueUtil.addJob('email', {
            name: 'send-password-reset-notification',
            data: {
                to: user.email,
                subject: mustChangePassword
                    ? 'รีเซ็ตรหัสผ่าน - รหัสผ่านชั่วคราว'
                    : 'รหัสผ่านของคุณถูกเปลี่ยนเรียบร้อยแล้ว',
                template: 'password-reset',
                data: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    temporaryPassword: mustChangePassword ? newPassword : undefined,
                    isSelfDefined,
                },
            },
        });

        return {
            success: true,
            message: mustChangePassword
                ? 'รีเซ็ตรหัสผ่านสำเร็จ รหัสผ่านชั่วคราวถูกส่งไปยังอีเมล'
                : 'เปลี่ยนรหัสผ่านสำเร็จ',
        };
    }

    /**
     * Toggle user status
     */
    async toggleUserStatus(_request: FastifyRequest, userId: string) {
        // Check if user exists
        const existingUser = await this.userRepository.findById(userId);
        if (!existingUser) {
            throw new Error('User not found');
        }

        // Prevent deactivating own account
        if (existingUser.id === _request.user?.userId) {
            throw new Error('Cannot deactivate your own account');
        }

        // Toggle status
        const newStatus = existingUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const user = await this.userRepository.update(userId, {
            status: newStatus,
        });

        return this.sanitizeUser(user);
    }

    /**
     * Sanitize user data (remove sensitive information)
     */
    private sanitizeUser(user: UserWithBranch) {
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            role: user.role,
            status: user.status,
            branchId: user.branchId,
            branch: user.branch,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
