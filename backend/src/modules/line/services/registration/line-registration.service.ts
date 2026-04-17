import { prisma } from '@config/database.config';
import crypto from 'crypto';

/**
 * LINE Registration Service
 * 
 * Purpose: Handle complete user registration and LINE linking flow
 * Features:
 * - Registration token generation (15-min expiry)
 * - OTP generation and verification (6-digit, 5-min expiry)
 * - LINE account linking
 * - Unfollow/Refollow handling
 * - Rate limiting and security
 * 
 * Requirements: Requirement 3 - Complete User Registration and LINE Linking Flow
 */

interface RegistrationToken {
    token: string;
    expiresAt: Date;
}

export class LineRegistrationService {
    private readonly TOKEN_EXPIRY_MINUTES = 15;
    private readonly OTP_EXPIRY_MINUTES = 5;
    private readonly MAX_OTP_REQUESTS_PER_HOUR = 3;

    /**
     * Generate registration token for LINE linking
     * 
     * @param lineUserId - LINE User ID
     * @returns Registration token with expiry
     */
    async generateRegistrationToken(lineUserId: string): Promise<RegistrationToken> {
        try {
            // Generate secure random token
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + this.TOKEN_EXPIRY_MINUTES);

            // Store token in database
            await prisma.registrationToken.create({
                data: {
                    lineUserId,
                    token,
                    expiresAt,
                    used: false,
                },
            });

            return { token, expiresAt };
        } catch (error) {
            console.error('Error generating registration token:', error);
            throw new Error('Failed to generate registration token');
        }
    }

    /**
     * Validate registration token
     * 
     * @param token - Registration token
     * @param lineUserId - LINE User ID
     * @returns True if valid, false otherwise
     */
    async validateRegistrationToken(token: string, lineUserId: string): Promise<boolean> {
        try {
            const registrationToken = await prisma.registrationToken.findFirst({
                where: {
                    token,
                    lineUserId,
                    used: false,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            });

            return registrationToken !== null;
        } catch (error) {
            console.error('Error validating registration token:', error);
            return false;
        }
    }

    /**
     * Generate OTP for LINE linking verification
     * 
     * @param userId - User ID
     * @param lineUserId - LINE User ID
     * @returns OTP code
     */
    async generateOTP(userId: string, lineUserId: string): Promise<string> {
        try {
            // Check rate limiting
            const oneHourAgo = new Date();
            oneHourAgo.setHours(oneHourAgo.getHours() - 1);

            const recentOTPs = await prisma.registrationToken.count({
                where: {
                    lineUserId,
                    createdAt: {
                        gte: oneHourAgo,
                    },
                },
            });

            if (recentOTPs >= this.MAX_OTP_REQUESTS_PER_HOUR) {
                throw new Error('OTP rate limit exceeded. Please try again later.');
            }

            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

            // Store OTP in database (using RegistrationToken table with userId)
            await prisma.registrationToken.create({
                data: {
                    lineUserId,
                    token: otp,
                    userId,
                    expiresAt,
                    used: false,
                },
            });

            return otp;
        } catch (error) {
            console.error('Error generating OTP:', error);
            throw error;
        }
    }

    /**
     * Verify OTP and complete LINE linking
     * 
     * @param userId - User ID
     * @param lineUserId - LINE User ID
     * @param otp - OTP code
     * @returns True if successful, false otherwise
     */
    async verifyOTPAndLink(userId: string, lineUserId: string, otp: string): Promise<boolean> {
        try {
            // Find valid OTP
            const otpRecord = await prisma.registrationToken.findFirst({
                where: {
                    token: otp,
                    lineUserId,
                    userId,
                    used: false,
                    expiresAt: {
                        gt: new Date(),
                    },
                },
            });

            if (!otpRecord) {
                return false;
            }

            // Check for duplicate linking
            const existingLink = await prisma.user.findFirst({
                where: {
                    lineUserId,
                    id: {
                        not: userId,
                    },
                },
            });

            if (existingLink) {
                throw new Error('This LINE account is already linked to another user');
            }

            // Update user with LINE linking
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    lineUserId,
                    lineLinkedAt: new Date(),
                    lineActive: true,
                    lineNotificationsEnabled: true,
                },
                select: {
                    id: true,
                    role: true,
                    lineUserId: true,
                },
            });

            // Mark OTP as used
            await prisma.registrationToken.update({
                where: { id: otpRecord.id },
                data: { used: true },
            });

            // Setup Rich Menu after successful LINE linking
            try {
                const { LineRichMenuEnhancedService } = await import('@line/services/rich-menu/line-rich-menu-enhanced.service');
                const richMenuService = new LineRichMenuEnhancedService();

                await richMenuService.setupRichMenuForUser(lineUserId, updatedUser.role);
                console.log(`Rich menu set for user ${userId} with role ${updatedUser.role}`);
            } catch (error) {
                console.error('Error assigning Rich Menu after registration:', error);
                // Don't fail the registration if Rich Menu assignment fails
            }

            return true;
        } catch (error) {
            console.error('Error verifying OTP and linking:', error);
            throw error;
        }
    }

    /**
     * Link account manually (after token validation or for authenticated users)
     */
    async linkAccountManual(userId: string, lineUserId: string): Promise<boolean> {
        try {
            // Check for duplicate linking
            const existingLink = await prisma.user.findFirst({
                where: {
                    lineUserId,
                    id: {
                        not: userId,
                    },
                },
            });

            if (existingLink) {
                throw new Error('This LINE account is already linked to another user');
            }

            // Update user with LINE linking
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    lineUserId,
                    lineLinkedAt: new Date(),
                    lineActive: true,
                    lineNotificationsEnabled: true,
                },
                select: {
                    id: true,
                    role: true,
                    lineUserId: true,
                },
            });

            // Setup Rich Menu after successful LINE linking
            try {
                const { LineRichMenuEnhancedService } = await import('@line/services/rich-menu/line-rich-menu-enhanced.service');
                const richMenuService = new LineRichMenuEnhancedService();

                await richMenuService.setupRichMenuForUser(lineUserId, updatedUser.role);
            } catch (error) {
                console.error('Error assigning Rich Menu after linking:', error);
            }

            return true;
        } catch (error) {
            console.error('Error in linkAccountManual:', error);
            throw error;
        }
    }

    /**
     * Unlink LINE account from user
     */
    async unlinkAccount(userId: string): Promise<void> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { lineUserId: true }
            });

            if (user?.lineUserId) {
                // Remove rich menu if possible
                try {
                    const { LineRichMenuEnhancedService } = await import('@line/services/rich-menu/line-rich-menu-enhanced.service');
                    const richMenuService = new LineRichMenuEnhancedService();
                    await richMenuService.removeRichMenuFromUser(user.lineUserId);
                } catch (e) {
                    console.error('Error removing rich menu during unlink:', e);
                }
            }

            await prisma.user.update({
                where: { id: userId },
                data: {
                    lineUserId: null,
                    lineLinkedAt: null,
                    lineActive: false,
                    lineNotificationsEnabled: false,
                },
            });
        } catch (error) {
            console.error('Error unlinking account:', error);
            throw error;
        }
    }

    /**
     * Check if a specific user ID is linked to LINE
     */
    async getCheckStatus(userId: string): Promise<{ linked: boolean; lineUserId?: string }> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    lineUserId: true,
                    lineActive: true,
                },
            });

            return {
                linked: !!(user?.lineUserId && user.lineActive),
                lineUserId: user?.lineUserId || undefined,
            };
        } catch (error) {
            console.error('Error checking status:', error);
            return { linked: false };
        }
    }

    /**
     * Handle LINE unfollow event
     * 
     * @param lineUserId - LINE User ID
     */
    async handleUnfollow(lineUserId: string): Promise<void> {
        try {
            // Mark user as inactive but preserve linking
            await prisma.user.updateMany({
                where: { lineUserId },
                data: {
                    lineActive: false,
                },
            });

            // Clear conversation state (in-memory)
            // Note: ConversationStateService handles this internally
            console.log(`User unfollowed: ${lineUserId}`);
        } catch (error) {
            console.error('Error handling unfollow:', error);
            throw error;
        }
    }

    /**
     * Handle LINE refollow event
     * 
     * @param lineUserId - LINE User ID
     */
    async handleRefollow(lineUserId: string): Promise<void> {
        try {
            // Check if this is a user or customer
            const user = await prisma.user.findFirst({
                where: { lineUserId },
            });

            const customer = await prisma.customer.findFirst({
                where: { lineUserId },
            });

            if (user) {
                // Reactivate user account
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        lineActive: true,
                    },
                });

                // Setup Rich Menu on refollow
                try {
                    const { RichMenuManager } = await import('@line/services/rich-menu/line-rich-menu-manager.service');
                    const richMenuManager = new RichMenuManager();
                    await richMenuManager.assignRichMenu(lineUserId, user.role);
                    console.log(`✅ Rich menu restored for user ${user.id} (${user.firstName} ${user.lastName}) with role ${user.role}`);
                } catch (error) {
                    console.error('❌ Error assigning Rich Menu on refollow:', error);
                    // Don't fail the refollow if Rich Menu assignment fails
                }

                console.log(`User refollowed: ${lineUserId}`);
            } else if (customer) {
                // Customer refollow - assign USER role Rich Menu
                try {
                    const { RichMenuManager } = await import('@line/services/rich-menu/line-rich-menu-manager.service');
                    const richMenuManager = new RichMenuManager();
                    await richMenuManager.assignRichMenu(lineUserId, 'USER');
                    console.log(`✅ Rich menu restored for customer ${customer.id} (${customer.businessName})`);
                } catch (error) {
                    console.error('❌ Error assigning Rich Menu on customer refollow:', error);
                    // Don't fail the refollow if Rich Menu assignment fails
                }

                console.log(`Customer refollowed: ${lineUserId}`);
            } else {
                console.log(`New user followed: ${lineUserId}`);
            }
        } catch (error) {
            console.error('Error handling refollow:', error);
            throw error;
        }
    }

    /**
     * Check if user is admin (for admin whitelist)
     * 
     * @param userId - User ID
     * @returns True if admin, false otherwise
     */
    async isAdminWhitelisted(userId: string): Promise<boolean> {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });

            // Check if user has admin role
            return user?.role === 'ADMIN';
        } catch (error) {
            console.error('Error checking admin whitelist:', error);
            return false;
        }
    }

    /**
     * Cleanup expired registration tokens
     * Should be run periodically (e.g., daily)
     */
    async cleanupExpiredTokens(): Promise<number> {
        try {
            const result = await prisma.registrationToken.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date(),
                    },
                },
            });

            console.log(`Cleaned up ${result.count} expired tokens`);
            return result.count;
        } catch (error) {
            console.error('Error cleaning up expired tokens:', error);
            return 0;
        }
    }

    /**
     * Get registration status for a LINE user
     * 
     * @param lineUserId - LINE User ID
     * @returns User if linked, null otherwise
     */
    async getRegistrationStatus(lineUserId: string) {
        try {
            const user = await prisma.user.findFirst({
                where: { lineUserId },
                select: {
                    id: true,
                    role: true,
                    lineActive: true,
                    lineLinkedAt: true,
                    lineNotificationsEnabled: true,
                },
            });

            return user;
        } catch (error) {
            console.error('Error getting registration status:', error);
            return null;
        }
    }
}
