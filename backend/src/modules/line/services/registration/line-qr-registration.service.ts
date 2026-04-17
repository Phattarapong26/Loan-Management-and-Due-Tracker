/**
 * LINE QR Registration Service
 * 
 * Purpose: Generate QR codes for customer LINE registration
 * Features:
 * - Generate unique QR codes with customer ID
 * - Track QR code usage and expiry
 * - Link LINE user ID to customer after scan
 * 
 * Flow:
 * 1. Officer generates QR code for customer
 * 2. Customer scans QR code with LINE app
 * 3. Customer follows LINE OA
 * 4. System links LINE user ID to customer automatically
 */

import { prisma } from '@config/database.config';
import { env } from '@config/env.config';
import crypto from 'crypto';
import { UserRole } from '@prisma/client';

export interface QRRegistrationToken {
    token: string;
    customerId: string;
    expiresAt: Date;
    qrCodeUrl: string;
}

export class LineQRRegistrationService {
    private normalizeToken(rawToken: string): string {
        const token = (rawToken || '').trim().toUpperCase();
        const match = token.match(/[A-F0-9]{8}/);
        return match?.[0] ?? token;
    }

    /**
     * Generate QR code for customer LINE registration
     * 
     * @param customerId - Customer ID to link
     * @param generatedBy - User ID who generated the QR
     * @returns QR registration token with URL
     */
    async generateCustomerQRCode(
        customerId: string,
        generatedBy: string
    ): Promise<QRRegistrationToken> {
        try {
            // Verify customer exists
            const customer = await prisma.customer.findUnique({
                where: { id: customerId },
                select: { id: true, businessName: true },
            });

            if (!customer) {
                throw new Error('Customer not found');
            }

            // Generate unique token (8 characters for easy typing)
            const token = crypto.randomBytes(4).toString('hex').toUpperCase();
            
            // Token expires in 10 minutes
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + 10);

            console.log(`[QR Generation] Current time: ${new Date().toISOString()}, Expires at: ${expiresAt.toISOString()}`);

            // Store token in database
            await prisma.registrationToken.create({
                data: {
                    token,
                    lineUserId: customerId, // Store customer ID temporarily
                    expiresAt,
                    used: false,
                },
            });

            // Generate LINE OA URL with auto-send message
            // Format: https://line.me/R/oaMessage/@{OA_ID}/?{encoded_message}
            const lineOAId = env.LINE_OA_ID || '';
            const registrationMessage = token; // Send only the token
            const encodedMessage = encodeURIComponent(registrationMessage);
            
            // This URL will:
            // 1. Open LINE app
            // 2. Add friend (if not already added)
            // 3. Auto-send the registration code to OA
            const qrCodeUrl = `https://line.me/R/oaMessage/${lineOAId}/?${encodedMessage}`;

            console.log(`QR code generated for customer ${customerId} (${customer.businessName}) by user ${generatedBy}, token: ${token}`);
            console.log(`QR URL: ${qrCodeUrl}`);

            return {
                token,
                customerId,
                expiresAt,
                qrCodeUrl, // Return the LINE URL with auto-send message
            };
        } catch (error) {
            console.error('Error generating customer QR code:', error);
            throw error;
        }
    }

    /**
     * Validate QR token and get customer ID
     * 
     * @param token - QR token from scan
     * @returns Customer ID if valid
     */
    async validateQRToken(token: string): Promise<string | null> {
        try {
            const normalizedToken = this.normalizeToken(token);
            console.log(`[QR Validation] Checking token: ${normalizedToken}`);
            
            const registrationToken = await prisma.registrationToken.findUnique({
                where: { token: normalizedToken },
            });

            if (!registrationToken) {
                console.log(`[QR Validation] Token not found in database: ${normalizedToken}`);
                
                // Debug: List recent tokens
                const recentTokens = await prisma.registrationToken.findMany({
                    take: 5,
                    orderBy: { expiresAt: 'desc' },
                    select: { token: true, expiresAt: true, used: true },
                });
                console.log('[QR Validation] Recent tokens:', recentTokens);
                
                return null;
            }

            console.log(`[QR Validation] Token found:`, {
                token: registrationToken.token,
                expiresAt: registrationToken.expiresAt,
                used: registrationToken.used,
                customerId: registrationToken.lineUserId,
            });

            // Check if expired
            if (new Date() > registrationToken.expiresAt) {
                console.log(`[QR Validation] Token expired: ${normalizedToken}`);
                return null;
            }

            // Check if already used
            if (registrationToken.used) {
                console.log(`[QR Validation] Token already used: ${normalizedToken}`);
                return null;
            }

            console.log(`[QR Validation] Token valid! Customer ID: ${registrationToken.lineUserId}`);
            
            // Return customer ID (stored in lineUserId field temporarily)
            return registrationToken.lineUserId;
        } catch (error) {
            console.error('[QR Validation] Error validating token:', error);
            return null;
        }
    }

    /**
     * Link LINE user ID to customer after QR scan
     * 
     * @param token - QR token
     * @param lineUserId - LINE user ID from follow event
     * @returns Success status
     */
    async linkCustomerToLine(token: string, lineUserId: string): Promise<boolean> {
        try {
            const normalizedToken = this.normalizeToken(token);
            console.log(`[Link Customer] Starting link process - Token: ${normalizedToken}, LINE User: ${lineUserId}`);
            
            // Validate token and get customer ID
            const customerId = await this.validateQRToken(normalizedToken);
            
            if (!customerId) {
                console.log(`[Link Customer] Token validation failed for: ${normalizedToken}`);
                return false;
            }

            console.log(`[Link Customer] Token valid, Customer ID: ${customerId}`);

            // Check if LINE user ID is already linked to another customer
            const existingUser = await prisma.user.findFirst({
                where: { lineUserId },
            });

            if (existingUser) {
                console.log(`[Link Customer] LINE user ${lineUserId} already linked to user ${existingUser.id}`);
                // If already linked, consider it a success (re-registration case)
                // Mark token as used
                await prisma.registrationToken.update({
                    where: { token: normalizedToken },
                    data: { used: true },
                });
                return true;
            }

            // Find user associated with this customer
            const customer = await prisma.customer.findUnique({
                where: { id: customerId },
                select: { 
                    userId: true, 
                    email: true, 
                    businessName: true,
                    branchId: true,
                },
            });

            if (!customer) {
                console.log(`[Link Customer] Customer ${customerId} not found`);
                return false;
            }

            console.log(`[Link Customer] Found customer: ${customer.businessName}`);

            // If customer doesn't have a user, create one
            let userId = customer.userId;
            
            if (!userId) {
                console.log(`[Link Customer] Customer has no user account, creating one...`);
                
                // Check if user with this email already exists
                let user = customer.email ? await prisma.user.findUnique({
                    where: { email: customer.email },
                }) : null;

                if (!user) {
                    // Create new user for this customer
                    const nameParts = customer.businessName.split(' ');
                    const customerUserRole: UserRole = ((UserRole as any).CUSTOMER ?? (UserRole as any).USER) as UserRole;
                    user = await prisma.user.create({
                        data: {
                            email: customer.email || `customer-${customerId}@temp.local`,
                            passwordHash: '$2b$10$defaulthash', // Temporary password
                            firstName: nameParts[0] || 'Customer',
                            lastName: nameParts.slice(1).join(' ') || '',
                            role: customerUserRole,
                            status: 'ACTIVE',
                            branchId: customer.branchId,
                            lineUserId,
                            lineActive: true,
                            lineNotificationsEnabled: true,
                        },
                    });
                    
                    console.log(`[Link Customer] Created new user ${user.id} for customer`);
                } else {
                    console.log(`[Link Customer] Found existing user ${user.id} with email ${customer.email}`);
                    
                    // Update existing user with LINE info
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            lineUserId,
                            lineActive: true,
                            lineNotificationsEnabled: true,
                        },
                    });
                }

                // Link customer to user
                await prisma.customer.update({
                    where: { id: customerId },
                    data: { userId: user.id },
                });

                userId = user.id;
                console.log(`[Link Customer] Linked customer ${customerId} to user ${userId}`);
            } else {
                console.log(`[Link Customer] Customer already has user ${userId}`);
                
                // Update user with LINE user ID
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        lineUserId,
                        lineActive: true,
                        lineNotificationsEnabled: true,
                    },
                });
                
                console.log(`[Link Customer] Updated user ${userId} with LINE user ID`);
            }

            // Mark token as used (use uppercase for consistency)
            await prisma.registrationToken.update({
                where: { token: normalizedToken },
                data: { used: true },
            });

            // Assign Rich Menu based on user role
            try {
                const { RichMenuManager } = await import('@line/services/rich-menu/line-rich-menu-manager.service');
                const richMenuManager = new RichMenuManager();
                
                const user = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { role: true },
                });
                
                if (user) {
                    await richMenuManager.assignRichMenu(lineUserId, user.role);
                    console.log(`[Link Customer] Assigned ${user.role} Rich Menu to LINE user ${lineUserId}`);
                }
            } catch (error) {
                console.error('[Link Customer] Failed to assign Rich Menu:', error);
                // Don't fail the whole registration if Rich Menu assignment fails
            }

            console.log(`[Link Customer] ✅ Successfully linked customer ${customerId} (${customer.businessName}) to LINE user ${lineUserId}`);
            return true;
        } catch (error) {
            console.error('[Link Customer] ❌ Error linking customer to LINE:', error);
            return false;
        }
    }

    /**
     * Get QR registration status
     * 
     * @param token - QR token
     * @returns Registration status
     */
    async getQRStatus(token: string): Promise<{
        status: 'pending' | 'used' | 'expired' | 'not_found';
        valid: boolean;
        used: boolean;
        expired: boolean;
        customerId?: string;
    }> {
        try {
            const normalizedToken = this.normalizeToken(token);
            const registrationToken = await prisma.registrationToken.findUnique({
                where: { token: normalizedToken },
            });

            if (!registrationToken) {
                return { 
                    status: 'not_found',
                    valid: false, 
                    used: false, 
                    expired: false 
                };
            }

            const expired = new Date() > registrationToken.expiresAt;
            const used = registrationToken.used;

            let status: 'pending' | 'used' | 'expired' = 'pending';
            if (used) status = 'used';
            else if (expired) status = 'expired';

            return {
                status,
                valid: !expired && !used,
                used,
                expired,
                customerId: registrationToken.lineUserId,
            };
        } catch (error) {
            console.error('Error getting QR status:', error);
            return { 
                status: 'not_found',
                valid: false, 
                used: false, 
                expired: false 
            };
        }
    }

    /**
     * Cleanup expired QR tokens
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

            console.log(`Cleaned up ${result.count} expired QR tokens`);
            return result.count;
        } catch (error) {
            console.error('Error cleaning up expired tokens:', error);
            return 0;
        }
    }
}


export const lineQRRegistration = new LineQRRegistrationService();
