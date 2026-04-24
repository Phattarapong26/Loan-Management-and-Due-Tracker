import { FastifyRequest, FastifyReply } from 'fastify';
import { LineWebhookService } from '@line/services/core/line-webhook.service';
import { LineDailyNotificationService } from '@line/services/messaging/line-daily-notification.service';
import { LineRichMenuService } from '@line/services/rich-menu/line-rich-menu.service';
import { LineRegistrationService } from '@line/services/registration/line-registration.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { lineNotificationQueue } from '@line/services/messaging/line-notification-queue.service';
import { LineMessagesService } from '@line/services/messaging/line-messages.service';
import { TimezoneUtil } from '@utils/formatting/timezone.util';

const webhookService = new LineWebhookService();
const notificationService = new LineDailyNotificationService();
const richMenuService = new LineRichMenuService();
const registrationService = new LineRegistrationService();

export const lineController = {
    // Handle LINE webhook events
    // Note: Signature verification is handled by the verifyLineSignature middleware
    async webhook(request: FastifyRequest, reply: FastifyReply) {
        try {
            const body = request.body as any;
            const result = await webhookService.handleWebhook(body);
            return reply.send(result);
        } catch (error: any) {
            console.error('Webhook processing error:', error);
            return ResponseUtil.error(reply, 'เกิดข้อผิดพลาดในการประมวลผล webhook', 500, 'WEBHOOK_ERROR');
        }
    },

    // Send daily notifications
    async sendDailyNotification(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { role, lineUserId, testMode } = request.body as any;
            // Get userId from authenticated user
            const userId = (request as any).user?.userId || '';
            const result = await notificationService.sendNotification(role, lineUserId, userId, testMode);
            return reply.send(result);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถส่งการแจ้งเตือนได้', 500, 'NOTIFICATION_ERROR');
        }
    },

    /**
     * Admin-only: send "daily notification" test to a target user,
     * using the target user's role + branch context (เหมือนระบบส่งตอนเช้า)
     */
    async sendTestDailyNotification(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { targetUserId, targetLineUserId } = request.body as any;

            if (!targetUserId && !targetLineUserId) {
                return ResponseUtil.error(
                    reply,
                    'กรุณาเลือกผู้รับ หรือกรอก LINE User ID ของผู้รับ',
                    400,
                    'REQUIRED_FIELD'
                );
            }

            const { prisma } = await import('@config/database.config');

            const targetUser = targetUserId
                ? await prisma.user.findUnique({
                      where: { id: String(targetUserId) },
                      select: {
                          id: true,
                          firstName: true,
                          lastName: true,
                          email: true,
                          role: true,
                          branchId: true,
                          lineUserId: true,
                      },
                  })
                : await prisma.user.findFirst({
                      where: { lineUserId: String(targetLineUserId) },
                      select: {
                          id: true,
                          firstName: true,
                          lastName: true,
                          email: true,
                          role: true,
                          branchId: true,
                          lineUserId: true,
                      },
                  });

            if (!targetUser) {
                return ResponseUtil.notFound(reply, 'ไม่พบผู้รับที่ต้องการทดสอบ');
            }

            if (!targetUser.lineUserId) {
                return ResponseUtil.error(
                    reply,
                    'ผู้รับรายนี้ยังไม่ได้เชื่อมต่อ LINE กับระบบ',
                    400,
                    'LINE_NOT_LINKED',
                    {
                        targetUserId: targetUser.id,
                        email: targetUser.email,
                    }
                );
            }

            const roleMap: Record<string, 'officer' | 'manager' | 'admin' | null> = {
                OFFICER: 'officer',
                MANAGER: 'manager',
                ADMIN: 'admin',
                CUSTOMER: null,
            };

            const targetRole = roleMap[String(targetUser.role)];
            if (!targetRole) {
                return ResponseUtil.error(
                    reply,
                    'Role ของผู้รับไม่รองรับการแจ้งเตือนประเภทนี้',
                    400,
                    'ROLE_NOT_SUPPORTED',
                    { role: targetUser.role }
                );
            }

            const result = await notificationService.sendNotification(
                targetRole,
                targetUser.lineUserId,
                targetUser.id,
                true
            );

            if (!result?.success) {
                return ResponseUtil.error(
                    reply,
                    'ส่งข้อความทดสอบไปยัง LINE ไม่สำเร็จ',
                    502,
                    'LINE_PUSH_FAILED',
                    { targetUserId: targetUser.id }
                );
            }

            return ResponseUtil.success(reply, {
                ...result,
                target: {
                    id: targetUser.id,
                    name: `${targetUser.firstName} ${targetUser.lastName}`.trim(),
                    email: targetUser.email,
                    role: targetUser.role,
                    branchId: targetUser.branchId,
                    lineUserId: targetUser.lineUserId,
                },
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถส่งการแจ้งเตือนทดสอบได้ กรุณาลองใหม่อีกครั้ง', 500, 'INTERNAL_ERROR');
        }
    },

    /**
     * Admin-only: test customer notifications (e.g., payment reminder)
     * Sends a real customer-style flex message using current DB data.
     */
    async sendTestCustomerNotification(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { loanId, contractNumber, customerId, customerLineUserId } = request.body as any;

            if (!loanId && !contractNumber && !customerId && !customerLineUserId) {
                return ResponseUtil.error(
                    reply,
                    'กรุณาระบุเลขสัญญา (contract number) หรือ Loan ID หรือ Customer ID หรือ LINE User ID ของลูกค้า',
                    400,
                    'REQUIRED_FIELD'
                );
            }

            const { prisma } = await import('@config/database.config');

            // 1) Resolve loan + customer + next/overdue schedule
            const loan =
                loanId || contractNumber
                    ? await prisma.loan.findFirst({
                          where: loanId
                              ? { id: String(loanId) }
                              : { contract_number: String(contractNumber) },
                          include: { customer: true },
                      })
                    : null;

            // If loan not provided, resolve a schedule by customer
            const scheduleByLoan = loan
                ? await prisma.paymentSchedule.findFirst({
                      where: {
                          loanId: loan.id,
                          status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
                      },
                      orderBy: [{ paymentDate: 'asc' }, { paymentNumber: 'asc' }],
                  })
                : null;

            const scheduleByCustomer =
                !loan && (customerId || customerLineUserId)
                    ? await prisma.paymentSchedule.findFirst({
                          where: {
                              status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
                              loan: {
                                  customer: customerId
                                      ? { id: String(customerId) }
                                      : { lineUserId: String(customerLineUserId) },
                              },
                          },
                          orderBy: [{ paymentDate: 'asc' }, { paymentNumber: 'asc' }],
                          include: {
                              loan: { include: { customer: true } },
                          },
                      })
                    : null;

            const resolvedLoan = loan || scheduleByCustomer?.loan || null;
            const resolvedSchedule = scheduleByLoan || scheduleByCustomer || null;

            if (!resolvedLoan || !(resolvedLoan as any).customer) {
                return ResponseUtil.notFound(reply, 'ไม่พบสัญญาที่ใช้ทดสอบ');
            }
            if (!resolvedSchedule) {
                return ResponseUtil.notFound(reply, 'ไม่พบงวดที่ค้าง/รอชำระสำหรับใช้ทดสอบ');
            }

            const customer = (resolvedLoan as any).customer as any;
            if (!customer?.lineUserId) {
                return ResponseUtil.error(
                    reply,
                    'ลูกค้ารายนี้ยังไม่ได้เชื่อมต่อ LINE กับระบบ',
                    400,
                    'CUSTOMER_LINE_NOT_LINKED',
                    { customerId: customer?.id }
                );
            }

            // 2) Compute due/overdue context in Thailand timezone
            const today = TimezoneUtil.now();
            const startOfToday = new Date(today);
            startOfToday.setHours(0, 0, 0, 0);

            const due = TimezoneUtil.toThailandTime(resolvedSchedule.paymentDate);
            const startOfDue = new Date(due);
            startOfDue.setHours(0, 0, 0, 0);

            const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
            const isOverdue = diffDays < 0 || resolvedSchedule.status === 'OVERDUE' || Number(resolvedSchedule.daysOverdue || 0) > 0;
            const daysOverdue = isOverdue
                ? Math.max(Number(resolvedSchedule.daysOverdue || 0), Math.abs(diffDays))
                : 0;
            const daysUntilDue = isOverdue ? 0 : Math.max(0, diffDays);

            const loanNumber = (resolvedLoan as any).contract_number || (resolvedLoan as any).contractNumber || (resolvedLoan as any).id;
            const principal = Number(resolvedSchedule.principalAmount || 0);
            const interest = Number(resolvedSchedule.interestAmount || 0);
            const fees = Number(resolvedSchedule.penaltyAmount || 0);
            const baseAmount = Number(resolvedSchedule.totalPayment || 0);
            const amount = Math.max(0, baseAmount + fees);

            // 3) Create customer-style reminder flex
            const message = LineMessagesService.createPaymentReminderMessage({
                loanNumber,
                dueDate: resolvedSchedule.paymentDate,
                amount,
                principal,
                interest,
                fees,
                daysUntilDue,
                isOverdue,
                daysOverdue,
            });

            // 4) Enqueue sending (rate-limit safe)
            await lineNotificationQueue.enqueue(customer.lineUserId, message, 'high');

            return ResponseUtil.success(reply, {
                success: true,
                type: 'CUSTOMER_PAYMENT_REMINDER',
                target: {
                    customerId: customer.id,
                    businessName: customer.businessName,
                    lineUserId: customer.lineUserId,
                },
                loan: {
                    id: (resolvedLoan as any).id,
                    contractNumber: (resolvedLoan as any).contract_number || null,
                },
                paymentSchedule: {
                    id: resolvedSchedule.id,
                    paymentNumber: resolvedSchedule.paymentNumber,
                    paymentDate: resolvedSchedule.paymentDate,
                    status: resolvedSchedule.status,
                },
                computed: {
                    isOverdue,
                    daysOverdue,
                    daysUntilDue,
                },
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถส่งข้อความทดสอบได้', 500, 'INTERNAL_ERROR');
        }
    },

    // Rich Menu management
    async manageRichMenu(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { action, richMenuId, imageUrl } = request.body as any;
            const result = await richMenuService.handleAction(action, richMenuId, imageUrl);
            return reply.send(result);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถจัดการ Rich Menu ได้', 500, 'RICH_MENU_ERROR');
        }
    },

    /**
     * Task 3.3.1: Initiate LINE registration
     * Generate registration token for LINE linking
     */
    async initiateRegistration(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { lineUserId } = request.body as any;

            if (!lineUserId) {
                return reply.status(400).send({
                    success: false,
                    error: 'LINE User ID is required'
                });
            }

            // Check if already registered
            const existingUser = await registrationService.getRegistrationStatus(lineUserId);
            if (existingUser) {
                return reply.status(400).send({
                    success: false,
                    error: 'This LINE account is already registered'
                });
            }

            const tokenData = await registrationService.generateRegistrationToken(lineUserId);

            return reply.send({
                success: true,
                token: tokenData.token,
                expiresAt: tokenData.expiresAt
            });
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถสร้างรหัสลงทะเบียนได้', 500, 'REGISTRATION_ERROR');
        }
    },

    /**
     * Task 3.3.2: Verify OTP for LINE registration
     * Generate and send OTP to user
     */
    async verifyOTP(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { userId, lineUserId, otp } = request.body as any;

            if (!userId || !lineUserId || !otp) {
                return reply.status(400).send({
                    success: false,
                    error: 'User ID, LINE User ID, and OTP are required'
                });
            }

            const isValid = await registrationService.verifyOTPAndLink(userId, lineUserId, otp);

            if (!isValid) {
                return reply.status(400).send({
                    success: false,
                    error: 'Invalid or expired OTP'
                });
            }

            return reply.send({
                success: true,
                message: 'LINE account linked successfully'
            });
        } catch (error: any) {
            if (error.message?.includes('already linked')) {
                return ResponseUtil.error(reply, 'บัญชี LINE นี้เชื่อมต่อกับผู้ใช้อื่นแล้ว', 400, 'ALREADY_LINKED');
            }
            return ResponseUtil.error(reply, 'ไม่สามารถยืนยันรหัส OTP ได้', 500, 'OTP_VERIFICATION_ERROR');
        }
    },

    /**
     * Task 3.3.3: Complete LINE registration
     * Generate OTP and send via email
     */
    async completeRegistration(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { userId, lineUserId, token } = request.body as any;

            if (!userId || !lineUserId || !token) {
                return reply.status(400).send({
                    success: false,
                    error: 'User ID, LINE User ID, and token are required'
                });
            }

            // Validate registration token
            const isValidToken = await registrationService.validateRegistrationToken(token, lineUserId);
            if (!isValidToken) {
                return reply.status(400).send({
                    success: false,
                    error: 'Invalid or expired registration token'
                });
            }

            // Lookup user email for OTP delivery
            const { prisma } = await import('@config/database.config');
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, email: true, firstName: true, lastName: true },
            });

            if (!user || !user.email) {
                return reply.status(400).send({
                    success: false,
                    error: 'User not found or email not configured'
                });
            }

            // Generate OTP
            const otp = await registrationService.generateOTP(userId, lineUserId);

            // Send OTP via email (queue job)
            const { QueueUtil } = await import('@utils/common/queue.util');
            await QueueUtil.addJob('email', {
                name: 'send-otp',
                data: {
                    to: user.email,
                    data: {
                        firstName: user.firstName,
                        lastName: user.lastName,
                        otp,
                        expiryMinutes: 5,
                    },
                },
            });

            return reply.send({
                success: true,
                message: 'ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว'
            });
        } catch (error: any) {
            if (error.message?.includes('rate limit')) {
                return reply.status(429).send({
                    success: false,
                    error: 'คุณส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
                });
            }
            return reply.status(500).send({
                success: false,
                error: 'ไม่สามารถส่งรหัส OTP ได้'
            });
        }
    },

    /**
     * Task 4.3.4: Get LINE configuration including QR code URL
     * Returns LINE OA information for frontend display
     */
    async getLineConfig(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const { LineService } = await import('@line/services/core/line.service');
            const lineService = new LineService();

            return reply.send({
                success: true,
                data: {
                    qrCodeUrl: lineService.getLineQRCodeURL(),
                    addFriendUrl: lineService.getLineAddFriendURL(),
                    lineOaId: process.env.LINE_OA_ID,
                },
            });
        } catch (error: any) {
            return reply.status(500).send({
                success: false,
                error: 'ไม่สามารถโหลดการตั้งค่า LINE ได้',
            });
        }
    },

    /**
     * Generate QR code for customer LINE registration
     * Officer generates QR code for specific customer
     */
    async generateCustomerQR(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { customerId } = request.params as any;
            const user = (request as any).user;

            if (!user) {
                return reply.status(401).send({
                    success: false,
                    error: 'กรุณาเข้าสู่ระบบใหม่',
                });
            }

            const { LineQRRegistrationService } = await import('@line/services/registration/line-qr-registration.service');
            const qrService = new LineQRRegistrationService();

            const qrData = await qrService.generateCustomerQRCode(customerId, user.id);

            return reply.send({
                success: true,
                data: qrData,
            });
        } catch (error: any) {
            console.error('Error generating customer QR:', error);
            return reply.status(500).send({
                success: false,
                error: 'ไม่สามารถสร้าง QR Code ได้',
            });
        }
    },

    /**
     * Check QR code registration status
     * Frontend polls this endpoint to check if customer has scanned QR
     */
    async checkQRStatus(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { token } = request.params as any;

            const { LineQRRegistrationService } = await import('@line/services/registration/line-qr-registration.service');
            const qrService = new LineQRRegistrationService();

            const status = await qrService.getQRStatus(token);

            return reply.send({
                success: true,
                data: status,
            });
        } catch (error: any) {
            console.error('Error checking QR status:', error);
            return reply.status(500).send({
                success: false,
                error: 'ไม่สามารถตรวจสอบสถานะ QR Code ได้',
            });
        }
    },

    /**
     * Link LINE account manually
     */
    async linkAccount(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { userId, lineUserId, token } = request.body as any;
            const authUser = (request as any).user;

            if (!authUser || authUser.userId !== userId) {
                return reply.status(403).send({
                    success: false,
                    error: 'คุณไม่มีสิทธิ์เข้าถึง'
                });
            }

            if (token) {
                const isValidToken = await registrationService.validateRegistrationToken(token, lineUserId);
                if (!isValidToken) {
                    return reply.status(400).send({
                        success: false,
                        error: 'รหัสลงทะเบียนหมดอายุหรือไม่ถูกต้อง'
                    });
                }
            }

            await registrationService.linkAccountManual(userId, lineUserId);

            return reply.send({
                success: true,
                message: 'เชื่อมต่อบัญชี LINE สำเร็จ'
            });
        } catch (error: any) {
            return reply.status(500).send({
                success: false,
                error: 'ไม่สามารถเชื่อมต่อบัญชี LINE ได้'
            });
        }
    },

    /**
     * Unlink LINE account
     */
    async unlinkAccount(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { userId } = request.params as any;
            const authUser = (request as any).user;

            if (!authUser || (authUser.userId !== userId && authUser.role !== 'ADMIN')) {
                return reply.status(403).send({
                    success: false,
                    error: 'คุณไม่มีสิทธิ์เข้าถึง'
                });
            }

            await registrationService.unlinkAccount(userId);

            return reply.send({
                success: true,
                message: 'ยกเลิกการเชื่อมต่อ LINE สำเร็จ'
            });
        } catch (error: any) {
            return reply.status(500).send({
                success: false,
                error: 'ไม่สามารถยกเลิกการเชื่อมต่อบัญชี LINE ได้'
            });
        }
    },

    /**
     * Check if user is linked to LINE
     */
    async checkLinkStatus(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { userId } = request.params as any;
            const result = await registrationService.getCheckStatus(userId);

            return reply.send({
                success: true,
                data: result
            });
        } catch (error: any) {
            return reply.status(500).send({
                success: false,
                error: 'ไม่สามารถตรวจสอบสถานะการเชื่อมต่อได้'
            });
        }
    },

    /**
     * Send test message to LINE user
     */
    async sendTestMessage(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { lineUserId, message } = request.body as any;

            // Re-use push logic from notification service or use common messaging service
            // For now, simple implementation
            const { env } = await import('@config/env.config');
            const axios = (await import('axios')).default;

            await axios.post(
                'https://api.line.me/v2/bot/message/push',
                {
                    to: lineUserId,
                    messages: [{ type: 'text', text: message }],
                },
                {
                    headers: {
                        'Authorization': `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return reply.send({ success: true, message: 'Test message sent' });
        } catch (error: any) {
            console.error('Error sending test message:', error);
            return ResponseUtil.error(reply, 'ไม่สามารถส่งข้อความทดสอบได้', 500, 'TEST_MESSAGE_ERROR');
        }
    }
};
