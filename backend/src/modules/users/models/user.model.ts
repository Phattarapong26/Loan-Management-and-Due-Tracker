import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';

/**
 * Create user schema
 */
export const createUserSchema = z.object({
    email: z.string().email('Invalid email format'),
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    phoneNumber: z.string().max(20).optional(),
    role: z.nativeEnum(UserRole).default('OFFICER'),
    branchId: z.string().uuid().optional(),
    nationalId: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * Update user schema
 */
export const updateUserSchema = z.object({
    email: z.string().email('Invalid email format').optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    phoneNumber: z.string().max(20).optional(),
    avatar: z.string().url('Invalid avatar URL').max(500).optional().nullable(),
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    branchId: z.string().uuid().optional().nullable(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/**
 * List users query schema
 */
export const listUsersQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    role: z.nativeEnum(UserRole).optional(),
    status: z.nativeEnum(UserStatus).optional(),
    branchId: z.string().uuid().optional(),
    search: z.string().optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

/**
 * Reset password schema
 */
export const resetPasswordSchema = z.object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters').optional(),
    temporaryPassword: z.boolean().default(true),
    sendResetLink: z.boolean().default(false).optional(),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
