import axios from 'axios';
import crypto from 'crypto';
import { env } from '@config/env.config';
import { LineMessagesService } from '@line/services/messaging/line-messages.service';
import { LineRegistrationService } from '@line/services/registration/line-registration.service';
import { ConversationStateService } from '@core-services/services/conversation-state.service';
import { prisma } from '@config/database.config';
import { ConfigService } from '@modules/config/services/config.service';
import { 
    sanitizeLineMessage, 
    sanitizeLinePostbackData, 
    sanitizeLineUserId,
    isDangerousLineMessage,
    logLineSanitizationEvent
} from '@line/utils/line-sanitization.util';
import { logger } from '@utils/common/logger.util';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';

interface LineEvent {
    type: string;
    replyToken?: string;
    source: { userId: string; type: string };
    message?: { type: string; text?: string };
    follow?: boolean;
    postback?: { data: string };
}

interface LineWebhookBody {
    events: LineEvent[];
}

export class LineWebhookService {
    private accessToken: string;
    private channelSecret: string;
    private registrationService: LineRegistrationService;
    private conversationStateService: ConversationStateService;
    private configService: ConfigService;
    private cachedFrontendUrl: string | null = null;
    private cachedFrontendUrlAt: number = 0;

    constructor() {
        this.accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
        this.channelSecret = env.LINE_CHANNEL_SECRET || '';
        this.registrationService = new LineRegistrationService();
        this.conversationStateService = new ConversationStateService();
        this.configService = ConfigService.getInstance();
    }

    private async getFrontendUrl(): Promise<string> {
        const now = Date.now();
        // Cache for 60 seconds to reduce Redis traffic
        if (this.cachedFrontendUrl && now - this.cachedFrontendUrlAt < 60_000) {
            return this.cachedFrontendUrl;
        }

        const defaultUrl = env.FRONTEND_URL || 'http://localhost:8080';
        const url = await this.configService.getFrontendUrl(defaultUrl);
        this.cachedFrontendUrl = url;
        this.cachedFrontendUrlAt = now;
        return url;
    }

    /**
     * Verify webhook signature using HMAC-SHA256
     * @param body - Raw request body as string
     * @param signature - x-line-signature header value
     * @returns boolean indicating if signature is valid
     */
    verifySignature(body: string, signature: string): boolean {
        try {
            if (!this.channelSecret) {
                console.error('LINE_CHANNEL_SECRET is not configured');
                return false;
            }

            if (!signature) {
                console.error('No signature provided in request');
                return false;
            }

            // Compute HMAC-SHA256 hash
            const hash = crypto
                .createHmac('SHA256', this.channelSecret)
                .update(body)
                .digest('base64');

            // Compare computed hash with provided signature
            const isValid = hash === signature;

            if (!isValid) {
                console.error('Webhook signature verification failed', {
                    timestamp: new Date().toISOString(),
                    expectedSignature: hash.substring(0, 10) + '...',
                    receivedSignature: signature.substring(0, 10) + '...',
                    alert: 'SECURITY_ALERT: Invalid webhook signature detected'
                });
            }

            return isValid;
        } catch (error) {
            console.error('Error during signature verification:', error);
            return false;
        }
    }

    async handleWebhook(body: LineWebhookBody) {
        console.log('LINE Webhook received:', JSON.stringify(body, null, 2));
        
        const startTime = Date.now(); // Track webhook processing time

        for (const event of body.events) {
            const { type, replyToken, source } = event;

            if (!replyToken) continue;

            // Sanitize LINE user ID
            const sanitizedUserId = sanitizeLineUserId(source.userId);
            if (!sanitizedUserId) {
                logger.error(
                    { userId: source.userId },
                    'Invalid LINE user ID received in webhook'
                );
                continue;
            }

            let messages: any[] = [];

            try {
                switch (type) {
                    case 'follow':
                        // Extract QR token from follow event if present
                        // LINE sends this in the webhook params when user follows via QR
                        const qrToken = (event as any).params?.token || null;
                        messages = await this.handleFollowEvent(sanitizedUserId, qrToken);
                        console.log(`New follower: ${sanitizedUserId}${qrToken ? ' (via QR)' : ''}`);
                        break;

                    case 'unfollow':
                        await this.handleUnfollowEvent(sanitizedUserId);
                        console.log(`User unfollowed: ${sanitizedUserId}`);
                        
                        // Track metrics
                        const { MonitoringService: MonitoringService1 } = await import('@shared/services/monitoring.service');
                        const monitoringService1 = new MonitoringService1();
                        await monitoringService1.trackRequest();
                        await monitoringService1.trackWebhookProcessingTime(Date.now() - startTime);
                        
                        continue; // No reply needed for unfollow

                    case 'message':
                        if (event.message?.type === 'text' && event.message.text) {
                            // Sanitize message text
                            const originalText = event.message.text;
                            
                            // Check if message is dangerous and should be blocked
                            if (isDangerousLineMessage(originalText)) {
                                logLineSanitizationEvent(
                                    sanitizedUserId,
                                    'text',
                                    originalText,
                                    '',
                                    true
                                );
                                messages = [{
                                    type: 'text',
                                    text: '⚠️ ข้อความของคุณมีเนื้อหาที่ไม่เหมาะสม กรุณาส่งข้อความใหม่'
                                }];
                                break;
                            }
                            
                            const sanitizedText = sanitizeLineMessage(originalText, sanitizedUserId);
                            
                            // Log if sanitization occurred
                            if (sanitizedText !== originalText) {
                                logLineSanitizationEvent(
                                    sanitizedUserId,
                                    'text',
                                    originalText,
                                    sanitizedText,
                                    false
                                );
                            }
                            
                            messages = await this.handleTextMessage(sanitizedText, sanitizedUserId);
                        } else {
                            messages = [{ type: 'text', text: 'ขอโทษค่ะ รองรับเฉพาะข้อความตัวอักษรเท่านั้น' }];
                        }
                        break;

                    case 'postback':
                        messages = await this.handlePostback(event, sanitizedUserId);
                        break;

                    default:
                        console.log(`Unhandled event type: ${type}`);
                        
                        // Track metrics for unhandled events
                        const { MonitoringService: MonitoringService2 } = await import('@shared/services/monitoring.service');
                        const monitoringService2 = new MonitoringService2();
                        await monitoringService2.trackRequest();
                        await monitoringService2.trackWebhookProcessingTime(Date.now() - startTime);
                        
                        continue;
                }

                if (messages.length > 0) {
                    const lineApiStart = Date.now();
                    const success = await this.replyMessage(replyToken, messages);
                    
                    // Track LINE API response time and delivery
                    const { MonitoringService } = await import('@shared/services/monitoring.service');
                    const monitoringService = new MonitoringService();
                    await monitoringService.trackLineAPIResponseTime(Date.now() - lineApiStart);
                    await monitoringService.trackRequest();
                    await monitoringService.trackNotificationDelivery(success);
                }
            } catch (error) {
                logger.error({ error, event }, 'Error handling webhook event');
                
                // Track error
                const { MonitoringService } = await import('@shared/services/monitoring.service');
                const monitoringService = new MonitoringService();
                await monitoringService.trackError();
                
                messages = [{ type: 'text', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }];
                
                if (replyToken) {
                    await this.replyMessage(replyToken, messages);
                }
            }
        }
        
        // Track total webhook processing time
        const { MonitoringService } = await import('@shared/services/monitoring.service');
        const monitoringService = new MonitoringService();
        await monitoringService.trackWebhookProcessingTime(Date.now() - startTime);

        return { success: true };
    }

    private async replyMessage(replyToken: string, messages: any[]): Promise<boolean> {
        try {
            await axios.post(
                `${LINE_MESSAGING_API}/message/reply`,
                { replyToken, messages },
                { headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' } }
            );
            return true;
        } catch (error) {
            console.error('LINE Reply Error:', error);
            return false;
        }
    }

    /**
     * Handle follow event - send welcome message
     * Updated: Use registration code instead of web URL
     */
    private async handleFollowEvent(lineUserId: string, qrToken?: string): Promise<any[]> {
        try {
            // Check if this is a QR code registration (token provided)
            if (qrToken) {
                const { LineQRRegistrationService } = await import('@line/services/registration/line-qr-registration.service');
                const qrService = new LineQRRegistrationService();
                
                const success = await qrService.linkCustomerToLine(qrToken, lineUserId);
                
                if (success) {
                    return [
                        {
                            type: 'text',
                            text: '✅ เชื่อมต่อบัญชีสำเร็จ!\n\nบัญชีของคุณถูกเชื่อมต่อกับ LINE แล้ว\n\nพิมพ์ "เมนู" เพื่อดูคำสั่งที่ใช้ได้',
                        },
                    ];
                } else {
                    return [
                        {
                            type: 'text',
                            text: '❌ ไม่สามารถเชื่อมต่อบัญชีได้\n\nรหัสอาจหมดอายุหรือถูกใช้งานแล้ว\nกรุณาติดต่อเจ้าหน้าที่เพื่อขอรหัสใหม่',
                        },
                    ];
                }
            }
            
            // Check if user is already registered (refollow case)
            const registrationStatus = await this.registrationService.getRegistrationStatus(lineUserId);
            
            if (registrationStatus) {
                // User is refollowing - reactivate account
                await this.registrationService.handleRefollow(lineUserId);
                
                return [
                    {
                        type: 'text',
                        text: `ยินดีต้อนรับกลับมา! 🎉\n\nบัญชีของคุณถูกเปิดใช้งานอีกครั้งแล้ว\n\nพิมพ์ "เมนู" เพื่อดูคำสั่งที่ใช้ได้`,
                    },
                ];
            }
            
            // New user - send welcome message with instructions
            return [
                {
                    type: 'flex',
                    altText: 'ยินดีต้อนรับสู่ระบบ SME Bank',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { 
                                    type: 'text', 
                                    text: '🎉 ยินดีต้อนรับ!', 
                                    weight: 'bold', 
                                    size: 'xl', 
                                    color: '#FFFFFF' 
                                },
                                { 
                                    type: 'text', 
                                    text: 'SME Bank LINE Official Account', 
                                    size: 'sm', 
                                    color: '#FFFFFF',
                                    margin: 'sm'
                                },
                            ],
                            backgroundColor: '#06C755',
                            paddingAll: '20px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { 
                                    type: 'text', 
                                    text: 'ขอบคุณที่เพิ่มเราเป็นเพื่อน! 🙏', 
                                    size: 'md', 
                                    wrap: true,
                                    weight: 'bold',
                                    margin: 'none'
                                },
                                { 
                                    type: 'text', 
                                    text: 'เพื่อใช้งานระบบ กรุณาเชื่อมต่อบัญชีของคุณ', 
                                    size: 'sm', 
                                    wrap: true,
                                    color: '#666666',
                                    margin: 'md'
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg'
                                },
                                { 
                                    type: 'text', 
                                    text: '📋 วิธีการลงทะเบียน:', 
                                    size: 'sm', 
                                    wrap: true,
                                    weight: 'bold',
                                    margin: 'lg'
                                },
                                { 
                                    type: 'text', 
                                    text: '1. ติดต่อเจ้าหน้าที่เพื่อขอรหัสลงทะเบียน (8 ตัวอักษร)\n\n2. ส่งรหัสที่ได้รับมาในแชทนี้\n\n3. ระบบจะเชื่อมต่อบัญชีอัตโนมัติ\n\n4. เริ่มใช้งานได้ทันที!', 
                                    size: 'xs', 
                                    wrap: true,
                                    color: '#666666',
                                    margin: 'sm'
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg'
                                },
                                { 
                                    type: 'text', 
                                    text: '💡 ตัวอย่างรหัส: ABC12345', 
                                    size: 'xs', 
                                    wrap: true,
                                    color: '#999999',
                                    margin: 'md',
                                    align: 'center'
                                },
                                { 
                                    type: 'text', 
                                    text: '⏰ รหัสจะหมดอายุใน 24 ชั่วโมง', 
                                    size: 'xxs', 
                                    wrap: true,
                                    color: '#FF6B6B',
                                    margin: 'sm',
                                    align: 'center'
                                },
                            ],
                            paddingAll: '20px',
                        },
                        footer: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { 
                                    type: 'text', 
                                    text: 'พิมพ์ "เมนู" เพื่อดูคำสั่งทั้งหมด', 
                                    size: 'xs', 
                                    color: '#999999',
                                    align: 'center'
                                },
                            ],
                            paddingAll: '15px',
                        },
                    },
                },
            ];
        } catch (error) {
            logger.error({ error, lineUserId }, 'Error handling follow event');
            return LineMessagesService.createWelcomeMessage();
        }
    }

    /**
     * Handle unfollow event - mark user as inactive
     * Task 3.2.2: Update handleUnfollowEvent() to call LineRegistrationService
     */
    private async handleUnfollowEvent(lineUserId: string): Promise<void> {
        try {
            await this.registrationService.handleUnfollow(lineUserId);
        } catch (error) {
            logger.error({ error, lineUserId }, 'Error handling unfollow event');
        }
    }

    private async handleTextMessage(text: string, userId: string): Promise<any[]> {
        const lowerText = text.toLowerCase().trim();
        
        // Task 3.2.4-3.2.6: Check for active conversation state first
        const conversationState = await this.conversationStateService.getState(userId);
        
        // Handle cancel command in any conversation
        if (conversationState && ['ยกเลิก', 'cancel', 'หยุด', 'stop'].includes(lowerText)) {
            await this.conversationStateService.clearState(userId);
            return [
                {
                    type: 'text',
                    text: this.conversationStateService.getCancelMessage(),
                },
            ];
        }
        
        // If user is in a conversation flow, continue that flow
        if (conversationState) {
            return await this.handleConversationFlow(userId, text, conversationState);
        }
        
        // Check if message is a registration token (8 characters hex)
        const tokenPattern = /^[A-F0-9]{8}$/i;
        if (tokenPattern.test(text.trim().toUpperCase())) {
            const token = text.trim().toUpperCase();
            
            console.log(`[Webhook] Received registration token from user ${userId}: ${token}`);
            
            try {
                const { LineQRRegistrationService } = await import('@line/services/registration/line-qr-registration.service');
                const qrService = new LineQRRegistrationService();
                
                const success = await qrService.linkCustomerToLine(token, userId);
                
                console.log(`[Webhook] Token linking result for ${token}: ${success ? 'SUCCESS' : 'FAILED'}`);
                
                if (success) {
                    return [
                        {
                            type: 'text',
                            text: '✅ เชื่อมต่อบัญชีสำเร็จ!\n\nบัญชีของคุณถูกเชื่อมต่อกับ LINE แล้ว\n\nพิมพ์ "เมนู" เพื่อดูคำสั่งที่ใช้ได้',
                        },
                    ];
                } else {
                    return [
                        {
                            type: 'text',
                            text: '❌ รหัสลงทะเบียนไม่ถูกต้อง\n\nรหัสอาจหมดอายุหรือถูกใช้งานแล้ว\nกรุณาติดต่อเจ้าหน้าที่เพื่อขอรหัสใหม่',
                        },
                    ];
                }
            } catch (error) {
                console.error('[Webhook] Error processing registration token:', error);
                logger.error({ error, userId, token }, 'Error processing registration token');
                return [
                    {
                        type: 'text',
                        text: '❌ เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง',
                    },
                ];
            }
        }
        
        // Validate LINE user ID format
        const { SQLSecurityUtil } = await import('@utils/security/sql-security.util');
        if (!SQLSecurityUtil.validateLineUserId(userId)) {
            logger.warn({
                message: 'Invalid LINE user ID format',
                userId: userId?.substring(0, 10)
            });
            return [{ type: 'text', text: 'กรุณาลงทะเบียนก่อนใช้งาน พิมพ์ "ลงทะเบียน"' }];
        }
        
        // Get user from database using ORM - safer and more maintainable
        const user = await prisma.user.findFirst({
            where: { lineUserId: userId },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true
            }
        });

        // Registration command - for staff (admin/manager/officer) to get registration link
        if (['ลงทะเบียน', 'register', 'สมัคร'].includes(lowerText)) {
            if (!user) {
                // User not registered yet - provide registration instructions
                const frontendUrl = await this.getFrontendUrl();
                
                // Create a safer URL without special characters
                const safeUserId = encodeURIComponent(userId);
                const registrationUrl = `${frontendUrl}/line-registration?lineUserId=${safeUserId}`;
                
                console.log(`[Registration] Generated URL for ${userId}: ${registrationUrl}`);
                
                return [
                    {
                        type: 'flex',
                        altText: 'วิธีการลงทะเบียน',
                        contents: {
                            type: 'bubble',
                            header: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { 
                                        type: 'text', 
                                        text: '📋 วิธีการลงทะเบียน', 
                                        weight: 'bold', 
                                        size: 'lg', 
                                        color: '#FFFFFF',
                                        wrap: true,
                                    },
                                ],
                                backgroundColor: '#00AA5B',
                                paddingAll: '15px',
                            },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { 
                                        type: 'text', 
                                        text: 'สำหรับเจ้าหน้าที่ (Admin/Manager/Officer):', 
                                        weight: 'bold',
                                        size: 'sm', 
                                        wrap: true,
                                        margin: 'none',
                                    },
                                    { 
                                        type: 'text', 
                                        text: '1. กดปุ่ม "เปิดหน้าลงทะเบียน" ด้านล่าง\n\n2. Login ด้วยบัญชีของคุณ\n\n3. ระบบจะเชื่อมต่อบัญชีอัตโนมัติ\n\n4. เริ่มใช้งานได้ทันที!', 
                                        size: 'xs', 
                                        wrap: true,
                                        color: '#666666',
                                        margin: 'md',
                                    },
                                    {
                                        type: 'separator',
                                        margin: 'lg',
                                    },
                                    { 
                                        type: 'text', 
                                        text: 'หรือคัดลอก LINE User ID ของคุณ:', 
                                        weight: 'bold',
                                        size: 'xs', 
                                        wrap: true,
                                        margin: 'lg',
                                    },
                                    { 
                                        type: 'text', 
                                        text: userId, 
                                        size: 'xxs', 
                                        wrap: true,
                                        color: '#999999',
                                        margin: 'sm',
                                    },
                                    {
                                        type: 'separator',
                                        margin: 'lg',
                                    },
                                    { 
                                        type: 'text', 
                                        text: '⚠️ หากปุ่มไม่ทำงาน ให้คัดลอก URL ด้านล่าง:', 
                                        weight: 'bold',
                                        size: 'xxs', 
                                        wrap: true,
                                        margin: 'md',
                                        color: '#FF6B6B',
                                    },
                                    { 
                                        type: 'text', 
                                        text: registrationUrl, 
                                        size: 'xxs', 
                                        wrap: true,
                                        color: '#999999',
                                        margin: 'sm',
                                    },
                                ],
                                paddingAll: '15px',
                            },
                            footer: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'button',
                                        action: {
                                            type: 'uri',
                                            label: '🔗 เปิดหน้าลงทะเบียน',
                                            uri: registrationUrl,
                                        },
                                        style: 'primary',
                                        color: '#00AA5B',
                                    },
                                ],
                                paddingAll: '10px',
                            },
                        },
                    },
                ];
            } else {
                // User already registered
                return [
                    {
                        type: 'text',
                        text: `✅ คุณลงทะเบียนเรียบร้อยแล้ว\n\nชื่อ: ${user.firstName} ${user.lastName}\nบทบาท: ${this.getRoleDisplayName(user.role)}\n\nพิมพ์ "เมนู" เพื่อดูคำสั่งที่ใช้ได้`,
                    },
                ];
            }
        }

        // Alternative registration method - send direct link as text
        if (['ลิงค์', 'link', 'url'].includes(lowerText)) {
            if (!user) {
                const frontendUrl = await this.getFrontendUrl();
                const safeUserId = encodeURIComponent(userId);
                const registrationUrl = `${frontendUrl}/line-registration?lineUserId=${safeUserId}`;
                
                return [
                    {
                        type: 'text',
                        text: `🔗 ลิงค์ลงทะเบียน:\n\n${registrationUrl}\n\n📋 วิธีใช้:\n1. คัดลอกลิงค์ด้านบน\n2. เปิดในเบราว์เซอร์\n3. Login ด้วยบัญชีของคุณ\n4. ระบบจะเชื่อมต่อบัญชีอัตโนมัติ`,
                    },
                ];
            } else {
                return [
                    {
                        type: 'text',
                        text: `✅ คุณลงทะเบียนเรียบร้อยแล้ว\n\nชื่อ: ${user.firstName} ${user.lastName}\nบทบาท: ${this.getRoleDisplayName(user.role)}`,
                    },
                ];
            }
        }

        // Check if user is registered
        if (!user) {
            return [
                {
                    type: 'text',
                    text: '⚠️ คุณยังไม่ได้ลงทะเบียนเชื่อมต่อบัญชี\n\nพิมพ์ "ลงทะเบียน" เพื่อเชื่อมต่อบัญชีของคุณ',
                },
            ];
        }

        // Menu commands - Direct users to use Rich Menu instead of text menu
        if (['เมนู', 'menu', 'help', 'ช่วย'].includes(lowerText)) {
            if (!user) {
                return [
                    {
                        type: 'text',
                        text: '⚠️ คุณยังไม่ได้ลงทะเบียนเชื่อมต่อบัญชี\n\nพิมพ์ "ลงทะเบียน" เพื่อเชื่อมต่อบัญชีของคุณ',
                    },
                ];
            }

            try {
                const { RichMenuManager } = await import('@line/services/rich-menu/line-rich-menu-manager.service');
                const richMenuManager = new RichMenuManager();
                await richMenuManager.ensureRichMenu(userId, user.role);
            } catch (error) {
                logger.error({ error, userId }, 'Failed to ensure Rich Menu on menu command');
            }

            // Show Rich Menu guidance instead of text menu
            const roleText = this.getRoleDisplayName(user.role);
            return [
                {
                    type: 'flex',
                    altText: 'วิธีใช้เมนู',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { 
                                    type: 'text', 
                                    text: '📱 เมนูใหม่!', 
                                    weight: 'bold', 
                                    size: 'xl', 
                                    color: '#FFFFFF' 
                                },
                                { 
                                    type: 'text', 
                                    text: `สำหรับ ${roleText}`, 
                                    size: 'sm', 
                                    color: '#FFFFFF',
                                    margin: 'sm'
                                },
                            ],
                            backgroundColor: '#00AA5B',
                            paddingAll: '20px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { 
                                    type: 'text', 
                                    text: '🎉 ตอนนี้คุณมีเมนูปุ่มกดแล้ว!', 
                                    size: 'md', 
                                    wrap: true,
                                    weight: 'bold',
                                    margin: 'none'
                                },
                                { 
                                    type: 'text', 
                                    text: 'ดูที่ด้านล่างหน้าจอ จะเห็นปุ่มเมนู 6 ปุ่ม', 
                                    size: 'sm', 
                                    wrap: true,
                                    color: '#666666',
                                    margin: 'md'
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg'
                                },
                                { 
                                    type: 'text', 
                                    text: '✨ ข้อดี:', 
                                    size: 'sm', 
                                    wrap: true,
                                    weight: 'bold',
                                    margin: 'lg'
                                },
                                { 
                                    type: 'text', 
                                    text: '• ไม่ต้องพิมพ์คำสั่ง\n• กดปุ่มง่าย ๆ\n• เห็นตัวเลือกทั้งหมด\n• ใช้งานเร็วขึ้น', 
                                    size: 'xs', 
                                    wrap: true,
                                    color: '#666666',
                                    margin: 'sm'
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg'
                                },
                                { 
                                    type: 'text', 
                                    text: '👆 ลองกดปุ่มเมนูด้านล่างดูสิ!', 
                                    size: 'sm', 
                                    wrap: true,
                                    color: '#00AA5B',
                                    weight: 'bold',
                                    margin: 'md',
                                    align: 'center'
                                },
                            ],
                            paddingAll: '20px',
                        },
                        footer: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                { 
                                    type: 'text', 
                                    text: '💡 หากไม่เห็นปุ่ม ลองปิดแล้วเปิด LINE ใหม่', 
                                    size: 'xxs', 
                                    color: '#999999',
                                    align: 'center'
                                },
                            ],
                            paddingAll: '15px',
                        },
                    },
                },
            ];
        }

        // Balance commands (for customers/users only)
        if (['ยอด', 'ยอดคงเหลือ', 'balance', 'คงเหลือ'].includes(lowerText)) {
            if (this.isCustomerRole(user.role)) {
                return await LineMessagesService.createBalanceMessage(userId);
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
            }
        }

        // Due date commands (for customers/users only)
        if (['กำหนด', 'กำหนดชำระ', 'due', 'ครบกำหนด'].includes(lowerText)) {
            if (this.isCustomerRole(user.role)) {
                return await LineMessagesService.createNextDueMessage(userId);
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
            }
        }

        // History commands (for customers/users only)
        if (['ประวัติ', 'ประวัติการชำระ', 'history', 'การชำระ'].includes(lowerText)) {
            if (this.isCustomerRole(user.role)) {
                return await LineMessagesService.createHistoryMessage(userId);
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
            }
        }

        // Invoice commands (for customers/users only)
        if (['ใบแจ้งหนี้', 'invoice', 'บิล', 'bill'].includes(lowerText)) {
            if (this.isCustomerRole(user.role)) {
                const { LineInvoiceService } = await import('@line/services/messaging/line-invoice.service');
                const invoiceService = new LineInvoiceService();
                return await invoiceService.createInvoiceListMessage(userId);
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
            }
        }

        // PDF Invoice commands (for customers/users only)
        if (['pdf', 'ดาวน์โหลด', 'download'].includes(lowerText)) {
            if (this.isCustomerRole(user.role)) {
                return [
                    {
                        type: 'text',
                        text: '📄 สำหรับดาวน์โหลด PDF กรุณาเลือกใบแจ้งหนี้ที่ต้องการจากเมนู "ใบแจ้งหนี้" ก่อน',
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
            }
        }

        // Contact commands
        if (['สัญญา', 'contract', 'สัญญาเงินกู้', 'สัญญาสินเชื่อ'].includes(lowerText)) {
            if (this.isCustomerRole(user.role)) {
                return await LineMessagesService.createContractsMessage(user.id);
            }
            return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
        }

        // Overpayment calculation command
        if (['คำนวณการจ่ายเกิน', 'คำนวณจ่ายเกิน', 'จ่ายเกิน', 'overpayment', 'คำนวณ'].includes(lowerText)) {
            if (this.isCustomerRole(user.role)) {
                logger.info({ 
                    userId: user.id,
                    command: lowerText 
                }, 'Processing overpayment calculation text command');
                
                return await LineMessagesService.createContractsMessage(user.id);
            }
            return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
        }

        if (['ติดต่อ', 'contact', 'โทร', 'เจ้าหน้าที่'].includes(lowerText)) {
            if (this.isCustomerRole(user.role)) {
                return await LineMessagesService.createContractsMessage(user.id);
            }
            return LineMessagesService.createContactMessage(user.role);
        }
        
        // Dashboard/Summary commands (for staff only)
        if (['สรุป', 'dashboard', 'รายงาน', 'summary', 'แดชบอร์ด'].includes(lowerText)) {
            if (['ADMIN', 'MANAGER', 'OFFICER'].includes(user.role)) {
                return await LineMessagesService.createDashboardMessage(user.role, user.id);
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่เท่านั้น' }];
            }
        }

        // Task commands (for loan officers only)
        if (['งาน', 'งานวันนี้', 'tasks', 'todo', 'ติดตาม'].includes(lowerText)) {
            if (user.role === 'OFFICER') {
                const { LoanOfficerTaskService } = await import('@shared/services/loan-officer-task.service');
                const taskService = new LoanOfficerTaskService();
                const tasks = await taskService.getTasksForOfficer(user.id);
                return LineMessagesService.createTaskListMessage(tasks);
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];
            }
        }

        // Contact logging commands (for loan officers only)
        if (['บันทึก', 'บันทึกการติดต่อ', 'log', 'contact-log'].includes(lowerText)) {
            if (user.role === 'OFFICER') {
                return [
                    {
                        type: 'text',
                        text: '📝 บันทึกการติดต่อลูกค้า\n\nฟีเจอร์นี้กำลังพัฒนา\nกรุณาใช้ผ่านเว็บไซต์ในขณะนี้',
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];
            }
        }

        // Approval commands (for managers only)
        if (['อนุมัติ', 'รออนุมัติ', 'approval', 'pending'].includes(lowerText)) {
            if (user.role === 'MANAGER') {
                const { DatabaseQueryService } = await import('@core-services/services/database-query.service');
                const dbService = new DatabaseQueryService();
                
                const pendingApprovals = await dbService.getPendingApprovals(user.id, user.role);
                
                if (pendingApprovals.length === 0) {
                    return [
                        {
                            type: 'text',
                            text: '✅ ไม่มีสินเชื่อรออนุมัติในขณะนี้',
                        },
                    ];
                }

                return [
                    {
                        type: 'text',
                        text: `📋 สินเชื่อรออนุมัติ: ${pendingApprovals.length} รายการ\n\nกรุณาใช้เว็บไซต์เพื่ออนุมัติสินเชื่อ`,
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้จัดการเท่านั้น' }];
            }
        }

        // KPI commands (for managers only)
        if (['kpi', 'เคพีไอ'].includes(lowerText)) {
            if (user.role === 'MANAGER') {
                return await LineMessagesService.createDashboardMessage(user.role, user.id);
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้จัดการเท่านั้น' }];
            }
        }

        // NPL commands (for managers only)
        if (['npl', 'หนี้เสีย', 'หนี้'].includes(lowerText)) {
            if (user.role === 'MANAGER') {
                const { NPLAlertService } = await import('@collections/services/npl-alert.service');
                const nplService = new NPLAlertService();
                
                // Get user's branch ID
                const userWithBranch = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: { branchId: true },
                });

                if (!userWithBranch || !userWithBranch.branchId) {
                    return [
                        {
                            type: 'text',
                            text: '❌ ไม่พบข้อมูลสาขาของคุณ กรุณาติดต่อเจ้าหน้าที่',
                        },
                    ];
                }

                const nplLoans = await nplService.getNPLLoans(userWithBranch.branchId);
                const highRiskLoans = await nplService.getHighRiskLoans(userWithBranch.branchId);
                
                return [
                    {
                        type: 'text',
                        text: `🚨 สรุป NPL และ High-risk\n\nNPL (>90 วัน): ${nplLoans.length} รายการ\nHigh-risk (60-89 วัน): ${highRiskLoans.length} รายการ\n\nกรุณาใช้เว็บไซต์เพื่อดูรายละเอียด`,
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้จัดการเท่านั้น' }];
            }
        }

        // System commands (for admin only)
        if (['ระบบ', 'สถานะ', 'system', 'status', 'สถานะระบบ'].includes(lowerText)) {
            if (user.role === 'ADMIN') {
                try {
                    // Get comprehensive system status
                    const { DashboardService } = await import('@reports/services/dashboard.service');
                    const dashboardService = new DashboardService();
                    const adminData = await dashboardService.getAdminDashboard();
                    
                    const { MonitoringService } = await import('@shared/services/monitoring.service');
                    const monitoringService = new MonitoringService();
                    const { health, metrics } = await monitoringService.getMonitoringDashboard();
                    
                    const statusEmoji = adminData.systemHealth === 'healthy' ? '✅' : adminData.systemHealth === 'warning' ? '⚠️' : '❌';
                    const statusText = adminData.systemHealth === 'healthy' ? 'ปกติ' : adminData.systemHealth === 'warning' ? 'เฝ้าระวัง' : 'วิกฤต';
                    
                    // Format helpers - show only real data
                    const formatMs = (ms: number) => {
                        if (ms === 0) return '-';
                        return `${Math.round(ms)} ms`;
                    };
                    
                    const formatPercent = (value: number) => {
                        if (value === 0) return '-';
                        return `${value.toFixed(1)}%`;
                    };
                    
                    // Color helpers
                    const getResponseTimeColor = (ms: number) => {
                        if (ms === 0) return '#999999';
                        if (ms < 1000) return '#00AA5B';
                        if (ms < 3000) return '#FF9800';
                        return '#F44336';
                    };
                    
                    const getErrorRateColor = (rate: number) => {
                        if (rate === 0) return '#999999';
                        if (rate < 2) return '#FF9800';
                        return '#F44336';
                    };
                    
                    const getDeliveryRateColor = (rate: number) => {
                        if (rate === 0) return '#999999';
                        if (rate >= 95) return '#00AA5B';
                        if (rate >= 90) return '#FF9800';
                        return '#F44336';
                    };
                    
                    // Build performance metrics section only if we have data
                    const performanceContents: any[] = [];
                    
                    if (metrics.lineAPIResponseTime > 0) {
                        performanceContents.push({
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'LINE API Response', size: 'sm', color: '#666666', flex: 2 },
                                { 
                                    type: 'text', 
                                    text: formatMs(metrics.lineAPIResponseTime), 
                                    size: 'sm', 
                                    align: 'end', 
                                    flex: 1,
                                    color: getResponseTimeColor(metrics.lineAPIResponseTime),
                                    weight: 'bold'
                                },
                            ],
                            margin: performanceContents.length > 0 ? 'sm' : 'none',
                        });
                    }
                    
                    if (metrics.databaseQueryTime > 0) {
                        performanceContents.push({
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'Database Query', size: 'sm', color: '#666666', flex: 2 },
                                { 
                                    type: 'text', 
                                    text: formatMs(metrics.databaseQueryTime), 
                                    size: 'sm', 
                                    align: 'end', 
                                    flex: 1,
                                    color: getResponseTimeColor(metrics.databaseQueryTime),
                                    weight: 'bold'
                                },
                            ],
                            margin: performanceContents.length > 0 ? 'sm' : 'none',
                        });
                    }
                    
                    if (metrics.webhookProcessingTime > 0) {
                        performanceContents.push({
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'Webhook Processing', size: 'sm', color: '#666666', flex: 2 },
                                { 
                                    type: 'text', 
                                    text: formatMs(metrics.webhookProcessingTime), 
                                    size: 'sm', 
                                    align: 'end', 
                                    flex: 1,
                                    color: getResponseTimeColor(metrics.webhookProcessingTime),
                                    weight: 'bold'
                                },
                            ],
                            margin: performanceContents.length > 0 ? 'sm' : 'none',
                        });
                    }
                    
                    if (metrics.errorRate > 0) {
                        performanceContents.push({
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'Error Rate', size: 'sm', color: '#666666', flex: 2 },
                                { 
                                    type: 'text', 
                                    text: formatPercent(metrics.errorRate), 
                                    size: 'sm', 
                                    align: 'end', 
                                    flex: 1,
                                    color: getErrorRateColor(metrics.errorRate),
                                    weight: 'bold'
                                },
                            ],
                            margin: performanceContents.length > 0 ? 'sm' : 'none',
                        });
                    }
                    
                    if (metrics.notificationDeliveryRate > 0) {
                        performanceContents.push({
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'Delivery Rate', size: 'sm', color: '#666666', flex: 2 },
                                { 
                                    type: 'text', 
                                    text: formatPercent(metrics.notificationDeliveryRate), 
                                    size: 'sm', 
                                    align: 'end', 
                                    flex: 1,
                                    color: getDeliveryRateColor(metrics.notificationDeliveryRate),
                                    weight: 'bold'
                                },
                            ],
                            margin: performanceContents.length > 0 ? 'sm' : 'none',
                        });
                    }
                    
                    // If no performance data, show message
                    if (performanceContents.length === 0) {
                        performanceContents.push({
                            type: 'text',
                            text: 'ยังไม่มีข้อมูล (รอการใช้งาน)',
                            size: 'sm',
                            color: '#999999',
                            align: 'center',
                            margin: 'md',
                        });
                    }
                    
                    // Build body contents array
                    const bodyContents: any[] = [
                        // Infrastructure Status
                        { 
                            type: 'text', 
                            text: '🔧 โครงสร้างพื้นฐาน', 
                            weight: 'bold', 
                            size: 'md',
                            color: '#333333',
                            margin: 'none'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'Database', size: 'sm', color: '#666666', flex: 2 },
                                        { type: 'text', text: health.database ? '✅ ปกติ' : '❌ ขัดข้อง', size: 'sm', align: 'end', flex: 1, color: health.database ? '#00AA5B' : '#F44336', weight: 'bold' },
                                    ],
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'Redis Cache', size: 'sm', color: '#666666', flex: 2 },
                                        { type: 'text', text: health.redis ? '✅ ปกติ' : '❌ ขัดข้อง', size: 'sm', align: 'end', flex: 1, color: health.redis ? '#00AA5B' : '#F44336', weight: 'bold' },
                                    ],
                                    margin: 'sm',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'LINE API', size: 'sm', color: '#666666', flex: 2 },
                                        { type: 'text', text: health.lineAPI ? '✅ ปกติ' : '❌ ขัดข้อง', size: 'sm', align: 'end', flex: 1, color: health.lineAPI ? '#00AA5B' : '#F44336', weight: 'bold' },
                                    ],
                                    margin: 'sm',
                                },
                            ],
                            margin: 'md',
                            paddingAll: '10px',
                            backgroundColor: '#F5F5F5',
                            cornerRadius: '8px',
                        },
                        { type: 'separator', margin: 'lg' },
                        // Performance Metrics
                        { 
                            type: 'text', 
                            text: '⚡ ประสิทธิภาพ', 
                            weight: 'bold', 
                            size: 'md',
                            color: '#333333',
                            margin: 'lg'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: performanceContents,
                            margin: 'md',
                            paddingAll: '10px',
                            backgroundColor: '#F5F5F5',
                            cornerRadius: '8px',
                        },
                        { type: 'separator', margin: 'lg' },
                    ];
                    
                    // Add remaining sections
                    bodyContents.push(
                        // User Activity
                        { 
                            type: 'text', 
                            text: '👥 กิจกรรมผู้ใช้', 
                            weight: 'bold', 
                            size: 'md',
                            color: '#333333',
                            margin: 'lg'
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'ผู้ใช้งานวันนี้', size: 'sm', color: '#666666', flex: 2 },
                                { type: 'text', text: `${adminData.activeUsers} ราย`, size: 'sm', weight: 'bold', align: 'end', flex: 1 },
                            ],
                            margin: 'md',
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'ผู้ใช้ทั้งหมด', size: 'sm', color: '#666666', flex: 2 },
                                { type: 'text', text: `${adminData.dataVolume.users} ราย`, size: 'sm', weight: 'bold', align: 'end', flex: 1 },
                            ],
                            margin: 'sm',
                        },
                        { type: 'separator', margin: 'lg' },
                        // Security
                        { 
                            type: 'text', 
                            text: '🔒 ความปลอดภัย', 
                            weight: 'bold', 
                            size: 'md',
                            color: '#333333',
                            margin: 'lg'
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'แจ้งเตือนวันนี้', size: 'sm', color: '#666666', flex: 2 },
                                { 
                                    type: 'text', 
                                    text: `${adminData.securityAlerts} รายการ`, 
                                    size: 'sm', 
                                    weight: 'bold', 
                                    align: 'end', 
                                    flex: 1,
                                    color: adminData.securityAlerts > 5 ? '#F44336' : adminData.securityAlerts > 2 ? '#FF9800' : '#00AA5B'
                                },
                            ],
                            margin: 'md',
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'งานล้มเหลว', size: 'sm', color: '#666666', flex: 2 },
                                { 
                                    type: 'text', 
                                    text: `${adminData.failedJobs} งาน`, 
                                    size: 'sm', 
                                    weight: 'bold', 
                                    align: 'end', 
                                    flex: 1,
                                    color: adminData.failedJobs > 10 ? '#F44336' : adminData.failedJobs > 5 ? '#FF9800' : '#00AA5B'
                                },
                            ],
                            margin: 'sm',
                        },
                        { type: 'separator', margin: 'lg' },
                        // Data Volume
                        { 
                            type: 'text', 
                            text: '📊 ข้อมูลในระบบ', 
                            weight: 'bold', 
                            size: 'md',
                            color: '#333333',
                            margin: 'lg'
                        },
                        {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'สินเชื่อ', size: 'sm', color: '#666666', flex: 2 },
                                        { type: 'text', text: `${adminData.dataVolume.loans.toLocaleString()} รายการ`, size: 'sm', align: 'end', flex: 1 },
                                    ],
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'ลูกค้า', size: 'sm', color: '#666666', flex: 2 },
                                        { type: 'text', text: `${adminData.dataVolume.customers.toLocaleString()} ราย`, size: 'sm', align: 'end', flex: 1 },
                                    ],
                                    margin: 'sm',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'การชำระ', size: 'sm', color: '#666666', flex: 2 },
                                        { type: 'text', text: `${adminData.dataVolume.payments.toLocaleString()} รายการ`, size: 'sm', align: 'end', flex: 1 },
                                    ],
                                    margin: 'sm',
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'เอกสาร', size: 'sm', color: '#666666', flex: 2 },
                                        { type: 'text', text: `${adminData.dataVolume.documents.toLocaleString()} ไฟล์`, size: 'sm', align: 'end', flex: 1 },
                                    ],
                                    margin: 'sm',
                                },
                            ],
                            margin: 'md',
                        },
                        { type: 'separator', margin: 'lg' },
                        // Today's Activity
                        { 
                            type: 'text', 
                            text: '📅 กิจกรรมวันนี้', 
                            weight: 'bold', 
                            size: 'md',
                            color: '#333333',
                            margin: 'lg'
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'สินเชื่อใหม่', size: 'sm', color: '#666666', flex: 2 },
                                { type: 'text', text: `${adminData.dataToday.loans} รายการ`, size: 'sm', weight: 'bold', align: 'end', flex: 1, color: '#00AA5B' },
                            ],
                            margin: 'md',
                        },
                        {
                            type: 'box',
                            layout: 'horizontal',
                            contents: [
                                { type: 'text', text: 'การชำระใหม่', size: 'sm', color: '#666666', flex: 2 },
                                { type: 'text', text: `${adminData.dataToday.payments} รายการ`, size: 'sm', weight: 'bold', align: 'end', flex: 1, color: '#00AA5B' },
                            ],
                            margin: 'sm',
                        },
                    );
                    
                    // Return the complete flex message
                    return [
                        {
                            type: 'flex',
                            altText: '🖥️ สถานะระบบ',
                            contents: {
                                type: 'bubble',
                                header: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        { 
                                            type: 'text', 
                                            text: '🖥️ สถานะระบบ', 
                                            weight: 'bold', 
                                            size: 'xl', 
                                            color: '#FFFFFF' 
                                        },
                                        { 
                                            type: 'text', 
                                            text: `สถานะ: ${statusEmoji} ${statusText}`, 
                                            size: 'sm', 
                                            color: '#FFFFFF',
                                            margin: 'sm'
                                        },
                                    ],
                                    backgroundColor: adminData.systemHealth === 'healthy' ? '#00AA5B' : adminData.systemHealth === 'warning' ? '#FF9800' : '#F44336',
                                    paddingAll: '15px',
                                },
                                body: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: bodyContents,
                                    paddingAll: '15px',
                                },
                                footer: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        { 
                                            type: 'text', 
                                            text: `อัพเดท: ${new Date().toLocaleString('th-TH', { 
                                                year: 'numeric', 
                                                month: 'short', 
                                                day: 'numeric', 
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}`, 
                                            size: 'xs', 
                                            color: '#999999', 
                                            align: 'center' 
                                        },
                                    ],
                                    paddingAll: '10px',
                                },
                            },
                        },
                    ];
                } catch (error) {
                    console.error('Error getting system status:', error);
                    return [
                        {
                            type: 'text',
                            text: '❌ เกิดข้อผิดพลาดในการดึงข้อมูลสถานะระบบ กรุณาลองใหม่อีกครั้ง',
                        },
                    ];
                }
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น' }];
            }
        }

        // === NEW RICH MENU COMMANDS ===

        // Customer Menu Commands
        if (['ตารางชำระ', 'payment-schedule', 'ตาราง'].includes(lowerText)) {
            if (this.isCustomerRole(user.role)) {
                return await LineMessagesService.createScheduleMessage(user.id);
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
            }
        }

        if (['เอกสาร', 'documents', 'เอกสารสินเชื่อ'].includes(lowerText)) {
            if (this.isCustomerRole(user.role)) {
                const frontendUrl = await this.getFrontendUrl();
                return [
                    {
                        type: 'text',
                        text: `📄 เอกสารสินเชื่อ\n\n🔗 เข้าสู่ระบบเพื่อดาวน์โหลดเอกสาร:\n${frontendUrl}/documents`,
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
            }
        }

        if (['แจ้งเตือน', 'notifications', 'การแจ้งเตือน'].includes(lowerText)) {
            if (['USER', 'CUSTOMER', 'MANAGER'].includes(user.role)) {
                const frontendUrl = await this.getFrontendUrl();
                return [
                    {
                        type: 'text',
                        text: `🔔 การแจ้งเตือน\n\n🔗 ตั้งค่าการแจ้งเตือน:\n${frontendUrl}/notifications`,
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าหรือผู้จัดการเท่านั้น' }];
            }
        }

        // Officer Menu Commands
        if (['ลูกค้า', 'customers', 'รายชื่อลูกค้า'].includes(lowerText)) {
            if (user.role === 'OFFICER') {
                const frontendUrl = await this.getFrontendUrl();
                return [
                    {
                        type: 'text',
                        text: `👥 รายชื่อลูกค้า\n\n🔗 เข้าสู่ระบบเพื่อดูรายชื่อลูกค้า:\n${frontendUrl}/customers`,
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];
            }
        }

        if (['สินเชื่อ', 'loans', 'จัดการสินเชื่อ'].includes(lowerText)) {
            if (user.role === 'OFFICER') {
                const frontendUrl = await this.getFrontendUrl();
                return [
                    {
                        type: 'text',
                        text: `💳 จัดการสินเชื่อ\n\n🔗 เข้าสู่ระบบเพื่อจัดการสินเชื่อ:\n${frontendUrl}/loans`,
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];
            }
        }

        if (['ติดตาม', 'collections', 'ติดตามหนี้'].includes(lowerText)) {
            if (user.role === 'OFFICER') {
                const frontendUrl = await this.getFrontendUrl();
                return [
                    {
                        type: 'text',
                        text: `💰 ติดตามหนี้\n\n🔗 เข้าสู่ระบบเพื่อติดตามการชำระหนี้:\n${frontendUrl}/collections`,
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];
            }
        }

        // Manager Menu Commands
        if (['ผลงานทีม', 'team-performance', 'ทีม'].includes(lowerText)) {
            if (user.role === 'MANAGER') {
                const frontendUrl = await this.getFrontendUrl();
                return [
                    {
                        type: 'text',
                        text: `👥 ผลงานทีม\n\n🔗 เข้าสู่ระบบเพื่อดูผลงานทีม:\n${frontendUrl}/team-performance`,
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้จัดการเท่านั้น' }];
            }
        }

        if (['รายงานสาขา', 'branch-reports', 'สาขา'].includes(lowerText)) {
            if (user.role === 'MANAGER') {
                const frontendUrl = await this.getFrontendUrl();
                return [
                    {
                        type: 'text',
                        text: `📋 รายงานสาขา\n\n🔗 เข้าสู่ระบบเพื่อดูรายงานสาขา:\n${frontendUrl}/branch-reports`,
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้จัดการเท่านั้น' }];
            }
        }

        // Admin Menu Commands
        if (['ตั้งค่า', 'config', 'ตั้งค่าระบบ'].includes(lowerText)) {
            if (user.role === 'ADMIN') {
                const frontendUrl = await this.getFrontendUrl();
                return [
                    {
                        type: 'text',
                        text: `🔧 ตั้งค่าระบบ\n\n🔗 เข้าสู่ระบบเพื่อตั้งค่าระบบ:\n${frontendUrl}/admin/config`,
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น' }];
            }
        }

        if (['จัดการผู้ใช้', 'user-management', 'ผู้ใช้'].includes(lowerText)) {
            if (user.role === 'ADMIN') {
                const frontendUrl = await this.getFrontendUrl();
                return [
                    {
                        type: 'text',
                        text: `👤 จัดการผู้ใช้\n\n🔗 เข้าสู่ระบบเพื่อจัดการผู้ใช้:\n${frontendUrl}/admin/users`,
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น' }];
            }
        }

        if (['รายชื่อติดต่อ', 'contacts', 'ติดต่อ', 'รายชื่อ'].includes(lowerText)) {
            if (user.role === 'ADMIN') {
                const frontendUrl = await this.getFrontendUrl();
                return [
                    {
                        type: 'text',
                        text: `📞 รายชื่อติดต่อ\n\n🔗 เข้าสู่ระบบเพื่อดูรายชื่อติดต่อ:\n${frontendUrl}/contacts`,
                    },
                ];
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น' }];
            }
        }

        // Enhanced existing commands
        if (['งานวันนี้', 'tasks-today', 'งาน'].includes(lowerText)) {
            if (user.role === 'OFFICER') {
                const { LoanOfficerTaskService } = await import('@shared/services/loan-officer-task.service');
                const taskService = new LoanOfficerTaskService();
                const tasks = await taskService.getTasksForOfficer(user.id);
                return LineMessagesService.createTaskListMessage(tasks);
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];
            }
        }

        if (['บันทึกการติดต่อ', 'contact-log-new', 'บันทึกใหม่'].includes(lowerText)) {
            if (user.role === 'OFFICER') {
                const { LineContactLoggingEnhancedService } = await import('@collections/services/line-contact-logging-enhanced.service');
                const contactService = new LineContactLoggingEnhancedService();
                return await contactService.startContactLogging(user.id);
            } else {
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];
            }
        }

        // Default response
        return [
            {
                type: 'text',
                text: 'ขอโทษค่ะ ไม่เข้าใจคำสั่ง\n\nพิมพ์ "เมนู" เพื่อดูคำสั่งที่ใช้ได้ทั้งหมด\nพิมพ์ "ลงทะเบียน" เพื่อเชื่อมต่อบัญชี',
            },
        ];
    }

    private async handlePostback(event: LineEvent, sanitizedUserId: string): Promise<any[]> {
        const data = event.postback?.data || '';
        
        // Sanitize postback data
        const originalData = data;
        const sanitizedData = sanitizeLinePostbackData(data, sanitizedUserId);
        
        if (sanitizedData !== originalData) {
            logLineSanitizationEvent(
                sanitizedUserId,
                'postback',
                originalData,
                sanitizedData,
                false
            );
        }
        
        const params = new URLSearchParams(sanitizedData);
        const action = params.get('action');
        
        // Validate LINE user ID format for postback
        const { SQLSecurityUtil } = await import('@utils/security/sql-security.util');
        if (!SQLSecurityUtil.validateLineUserId(sanitizedUserId)) {
            logger.warn({
                message: 'Invalid LINE user ID in postback',
                originalLength: sanitizedUserId?.length
            });
            return [{ type: 'text', text: 'กรุณาลงทะเบียนก่อนใช้งาน พิมพ์ "ลงทะเบียน"' }];
        }
        
        // Get user from database using ORM - safer and cleaner
        const user = await prisma.user.findFirst({
            where: { lineUserId: sanitizedUserId },
            select: {
                id: true,
                role: true
            }
        });
        
        if (!user) {
            return [{ type: 'text', text: 'กรุณาลงทะเบียนก่อนใช้งาน พิมพ์ "ลงทะเบียน"' }];
        }

        switch (action) {
            case 'balance':
                if (this.isCustomerRole(user.role)) {
                    return await LineMessagesService.createBalanceMessage(sanitizedUserId);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
                
            case 'next_due':
                if (this.isCustomerRole(user.role)) {
                    return await LineMessagesService.createNextDueMessage(sanitizedUserId);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];

            case 'history':
                if (this.isCustomerRole(user.role)) {
                    return await LineMessagesService.createHistoryMessage(sanitizedUserId);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];

            case 'contracts':
                if (this.isCustomerRole(user.role)) {
                    return await LineMessagesService.createContractsMessage(sanitizedUserId);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];

            case 'overpayment_options':
                if (this.isCustomerRole(user.role)) {
                    const loanId = params.get('loan_id');
                    const contractNumber = params.get('contract_number') || 'สัญญา';

                    logger.info({ 
                        loanId, 
                        contractNumber, 
                        userId: user.id,
                        userRole: user.role 
                    }, 'Processing overpayment options request');

                    if (!loanId) {
                        logger.warn({ loanId, contractNumber }, 'Missing loan_id for overpayment options');
                        return [{ type: 'text', text: '❌ ข้อมูลไม่ครบถ้วน กรุณาลองใหม่อีกครั้ง' }];
                    }

                    // Get loan details with all necessary information
                    // Security: ensure the loan belongs to this LINE customer
                    const loan = await prisma.loan.findFirst({
                        where: {
                            id: loanId,
                            OR: [
                                { customer: { lineUserId: sanitizedUserId } },
                                { customer: { user: { lineUserId: sanitizedUserId } } },
                            ],
                        },
                        select: {
                            id: true,
                            contract_number: true,
                            outstandingBalance: true,
                            remainingAmount: true,
                            nextPaymentAmount: true,
                            monthlyPayment: true,
                            interestRate: true,
                            interestCalculationMethod: true,
                            termMonths: true,
                            principal: true,
                            allow_early_payment: true,
                            early_payment_penalty_rate: true,
                            customer: {
                                select: {
                                    id: true,
                                    businessName: true,
                                },
                            },
                        },
                    });

                    if (!loan) {
                        logger.warn({ loanId }, 'Loan not found for overpayment options');
                        return [{ type: 'text', text: '❌ ไม่พบข้อมูลสัญญา (หรือคุณไม่มีสิทธิ์เข้าถึง) กรุณาลองใหม่อีกครั้ง' }];
                    }

                    const monthsPaid = await prisma.paymentSchedule.count({
                        where: {
                            loanId: loan.id,
                            status: 'PAID',
                        },
                    });

                    // Calculate remaining months
                    const remainingMonths = Math.max(0, loan.termMonths - monthsPaid);

                    // Prefer schedule-derived values (more consistent with production)
                    // NOTE: the calculator page now fetches the full context via signed token,
                    // so we only keep this here for future UI/analytics needs.

                    // Get frontend URL
                    const frontendUrl = await this.getFrontendUrl();
                    
                    // Create short signed link (avoids very long URLs and ensures ownership)
                    const { OverpaymentLinkTokenService } = await import('@line/services/overpayment-link-token.service');
                    const token = OverpaymentLinkTokenService.createToken(
                        { loanId: loan.id, lineUserId: sanitizedUserId },
                        7 * 24 * 60 * 60 * 1000 // 7 days
                    );
                    // Include backend base for environments without Vite proxy (e.g. tunneled static hosting)
                    let apiBase = '';
                    try {
                        const backendUrl = env.BACKEND_URL || '';
                        if (backendUrl) {
                            const host = new URL(backendUrl).hostname;
                            if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
                                apiBase = backendUrl;
                            }
                        }
                    } catch {
                        apiBase = '';
                    }

                    const safeUrl2 = frontendUrl?.startsWith('http') ? frontendUrl : `https://${frontendUrl}`;
                    const calculatorUrl = `${safeUrl2}/overpayment-calculator?t=${encodeURIComponent(token)}${
                        apiBase ? `&apiBase=${encodeURIComponent(apiBase)}` : ''
                    }`;
                    
                    logger.info({ 
                        loanId, 
                        contractNumber,
                        calculatorUrl: calculatorUrl.substring(0, 100) + '...'
                    }, 'Overpayment calculator URL created');
                    
                    return [
                        {
                            type: 'flex',
                            altText: 'คำนวณการจ่ายเกิน',
                            contents: {
                                type: 'bubble',
                                header: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: '🧮 คำนวณการจ่ายเกิน',
                                            weight: 'bold',
                                            size: 'xl',
                                            color: '#FFFFFF',
                                        },
                                        {
                                            type: 'text',
                                            text: loan.contract_number || 'สัญญา',
                                            size: 'xs',
                                            color: '#FFFFFF',
                                            margin: 'sm',
                                        },
                                    ],
                                    paddingAll: '20px',
                                    backgroundColor: '#138F3E',
                                },
                                body: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        {
                                            type: 'text',
                                            text: 'ข้อมูลสัญญาของคุณ',
                                            size: 'md',
                                            weight: 'bold',
                                            color: '#333333',
                                        },
                                        {
                                            type: 'box',
                                            layout: 'vertical',
                                            contents: [
                                                {
                                                    type: 'box',
                                                    layout: 'horizontal',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: 'ยอดคงเหลือ:',
                                                            size: 'sm',
                                                            color: '#666666',
                                                            flex: 2,
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: `${Number(loan.outstandingBalance).toLocaleString()} บาท`,
                                                            size: 'sm',
                                                            weight: 'bold',
                                                            color: '#333333',
                                                            flex: 3,
                                                            align: 'end',
                                                        },
                                                    ],
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'horizontal',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: 'ค่างวดรายเดือน:',
                                                            size: 'sm',
                                                            color: '#666666',
                                                            flex: 2,
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: `${Number(loan.nextPaymentAmount || 0).toLocaleString()} บาท`,
                                                            size: 'sm',
                                                            weight: 'bold',
                                                            color: '#333333',
                                                            flex: 3,
                                                            align: 'end',
                                                        },
                                                    ],
                                                    margin: 'sm',
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'horizontal',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: 'อัตราดอกเบี้ย:',
                                                            size: 'sm',
                                                            color: '#666666',
                                                            flex: 2,
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: `${Number(loan.interestRate)}% ต่อปี`,
                                                            size: 'sm',
                                                            weight: 'bold',
                                                            color: '#333333',
                                                            flex: 3,
                                                            align: 'end',
                                                        },
                                                    ],
                                                    margin: 'sm',
                                                },
                                                {
                                                    type: 'box',
                                                    layout: 'horizontal',
                                                    contents: [
                                                        {
                                                            type: 'text',
                                                            text: 'งวดที่เหลือ:',
                                                            size: 'sm',
                                                            color: '#666666',
                                                            flex: 2,
                                                        },
                                                        {
                                                            type: 'text',
                                                            text: `${remainingMonths} เดือน`,
                                                            size: 'sm',
                                                            weight: 'bold',
                                                            color: '#333333',
                                                            flex: 3,
                                                            align: 'end',
                                                        },
                                                    ],
                                                    margin: 'sm',
                                                },
                                            ],
                                            backgroundColor: '#F8F9FA',
                                            paddingAll: '15px',
                                            cornerRadius: '8px',
                                            margin: 'md',
                                        },
                                        {
                                            type: 'text',
                                            text: '💡 กดปุ่มด้านล่างเพื่อเปิดเครื่องคำนวณการจ่ายเกิน',
                                            size: 'sm',
                                            color: '#666666',
                                            wrap: true,
                                            margin: 'lg',
                                            align: 'center',
                                        },
                                    ],
                                    paddingAll: '20px',
                                },
                                footer: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        {
                                            type: 'button',
                                            action: {
                                                type: 'uri',
                                                label: '🧮 เปิดเครื่องคำนวณ',
                                                uri: calculatorUrl,
                                            },
                                            style: 'primary',
                                            color: '#138F3E',
                                            height: 'sm',
                                        },
                                    ],
                                    paddingAll: '12px',
                                },
                            },
                        }
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];

            case 'calculate_overpayment':
                if (this.isCustomerRole(user.role)) {
                    const loanId = params.get('loan_id');
                    const amount = params.get('amount');

                    logger.info({ 
                        loanId, 
                        amount, 
                        userId: user.id,
                        userRole: user.role 
                    }, 'Processing overpayment calculation request');

                    if (!loanId || !amount) {
                        logger.warn({ loanId, amount }, 'Missing required parameters for overpayment calculation');
                        return [{ type: 'text', text: '❌ ข้อมูลไม่ครบถ้วน กรุณาลองใหม่อีกครั้ง' }];
                    }

                    // Get loan details
                    const loan = await prisma.loan.findFirst({
                        where: { id: loanId },
                        select: {
                            id: true,
                            contract_number: true,
                            outstandingBalance: true,
                            nextPaymentAmount: true,
                            interestRate: true,
                            termMonths: true,
                            paymentSchedule: {
                                where: { status: 'PAID' },
                                select: { id: true },
                            },
                        },
                    });

                    if (!loan) {
                        logger.warn({ loanId }, 'Loan not found for overpayment calculation');
                        return [{ type: 'text', text: '❌ ไม่พบข้อมูลสัญญา กรุณาลองใหม่อีกครั้ง' }];
                    }

                    const monthsPaid = loan.paymentSchedule.length;
                    const remainingMonths = loan.termMonths - monthsPaid;

                    const calculationInput = {
                        currentBalance: Number(loan.outstandingBalance),
                        monthlyPayment: Number(loan.nextPaymentAmount || 0),
                        interestRate: Number(loan.interestRate),
                        remainingMonths,
                        extraPayment: Number(amount),
                    };

                    logger.info({ 
                        loanId,
                        calculationInput,
                        monthsPaid,
                        remainingMonths 
                    }, 'Overpayment calculation input data');

                    const { OverpaymentSimulatorService } = await import('../overpayment-simulator.service');
                    const result = OverpaymentSimulatorService.calculateOverpaymentImpact(calculationInput);

                    if (!result) {
                        logger.warn({ 
                            loanId, 
                            calculationInput 
                        }, 'Overpayment calculation returned null result');
                        return [{ 
                            type: 'text', 
                            text: `❌ ไม่สามารถคำนวณได้\n\nรายละเอียด:\n• ยอดคงเหลือ: ${calculationInput.currentBalance.toLocaleString()} บาท\n• จำนวนที่จ่ายเพิ่ม: ${calculationInput.extraPayment.toLocaleString()} บาท\n• อัตราดอกเบี้ย: ${calculationInput.interestRate}%\n\nกรุณาตรวจสอบจำนวนเงิน` 
                        }];
                    }

                    logger.info({ 
                        loanId, 
                        result 
                    }, 'Overpayment calculation successful');

                    return [
                        OverpaymentSimulatorService.createSimulationMessage(
                            result,
                            Number(amount),
                            loan.contract_number || 'สัญญา'
                        ),
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];

            case 'contract':
                if (this.isCustomerRole(user.role)) {
                    const loanId = params.get('loan_id');
                    const customerId = params.get('customer_id');

                    if (!loanId || !customerId) {
                        return [{ type: 'text', text: '❌ ข้อมูลไม่ครบถ้วน กรุณาลองใหม่อีกครั้ง' }];
                    }

                    // Safety: ensure loan belongs to this customer
                    const loan = await prisma.loan.findFirst({
                        where: {
                            id: loanId,
                            customerId,
                        },
                        select: {
                            id: true,
                            contract_number: true,
                            productConfig: true,
                        },
                    });

                    if (!loan) {
                        return [{ type: 'text', text: '❌ ไม่พบข้อมูลสัญญา กรุณาลองใหม่อีกครั้ง' }];
                    }

                    const productConfig = loan.productConfig as any;
                    
                    // Check if PDF exists (either disbursementPdfUrl or contractPdfUrl)
                    const pdfUrl = productConfig?.disbursementPdfUrl || productConfig?.contractPdfUrl;
                    
                    logger.info({ 
                        loanId, 
                        customerId, 
                        hasDisbursementPdfUrl: !!productConfig?.disbursementPdfUrl,
                        hasContractPdfUrl: !!productConfig?.contractPdfUrl,
                        pdfUrl,
                        productConfig 
                    }, 'Checking PDF availability');
                    
                    // If no PDF exists, trigger generation and notify user
                    if (!pdfUrl) {
                        // Trigger PDF generation in background
                        const contractNumber = loan.contract_number || 'ของคุณ';
                        
                        // Send immediate response
                        const immediateResponse = [{
                            type: 'text',
                            text: `⏳ กำลังดำเนินการสร้างใบสัญญาเงินกู้ ${contractNumber}\n\nกรุณารอสักครู่ ระบบจะส่งเอกสารให้คุณโดยอัตโนมัติ`
                        }];

                        // Trigger PDF generation asynchronously (don't wait)
                        (async () => {
                            try {
                                logger.info({ loanId, customerId }, 'Triggering PDF generation from LINE request');
                                
                                // Import and call regenerate service
                                const { DisbursementService } = await import('@disbursements/services/disbursement.service');
                                const disbursementService = new DisbursementService();
                                
                                // Get user ID (use system user for LINE-triggered generation)
                                const systemUserId = 'system-line-webhook';
                                
                                await disbursementService.regenerateContractPdfForLoan(loanId, systemUserId);
                                
                                logger.info({ loanId, customerId }, 'PDF generation triggered successfully from LINE');
                            } catch (error) {
                                logger.error({ loanId, customerId, error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error) }, 'Failed to trigger PDF generation from LINE');
                            }
                        })();

                        return immediateResponse;
                    }

                    // PDF exists - proceed with secure link
                    logger.info({ loanId, customerId, pdfUrl }, 'PDF exists, sending secure link');

                    const { SecureDocumentService } = await import('@documents/services/secure-document.service');
                    const secureDocumentService = new SecureDocumentService();
                    const secureToken = await secureDocumentService.generateSecureToken('contract', loan.id, customerId);
                    const secureUrl = await secureDocumentService.getSecureDocumentUrl(secureToken);

                    return [
                        {
                            type: 'flex',
                            altText: `สัญญา ${loan.contract_number || ''}`,
                            contents: {
                                type: 'bubble',
                                header: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        { type: 'text', text: '📄 สัญญาสินเชื่อ', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                                        { type: 'text', text: loan.contract_number || '-', size: 'xs', color: '#FFFFFF', margin: 'sm' },
                                    ],
                                    paddingAll: '15px',
                                    backgroundColor: '#00AA5B',
                                },
                                body: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        { type: 'text', text: '🔒 กรุณายืนยันตัวตนก่อนเปิดดูเอกสาร', size: 'sm', color: '#333333', wrap: true },
                                    ],
                                    paddingAll: '15px',
                                },
                                footer: {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        {
                                            type: 'button',
                                            action: { type: 'uri', label: 'เปิดสัญญา', uri: secureUrl },
                                            style: 'primary',
                                            color: '#00AA5B',
                                            height: 'sm',
                                        },
                                    ],
                                    paddingAll: '12px',
                                },
                            },
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
                
            case 'request_invoice':
                if (this.isCustomerRole(user.role)) {
                    const scheduleId = params.get('schedule_id');
                    const customerId = params.get('customer_id');
                    
                    if (!scheduleId || !customerId) {
                        return [{ type: 'text', text: '❌ ข้อมูลไม่ครบถ้วน กรุณาลองใหม่อีกครั้ง' }];
                    }
                    
                    try {
                        // Generate invoice for this payment schedule
                        const { NextPaymentInvoiceService } = await import('@invoices/services/next-payment-invoice.service');
                        const invoiceService = new NextPaymentInvoiceService();
                        
                        // Get payment schedule to find loan ID
                        const schedule = await prisma.paymentSchedule.findUnique({
                            where: { id: scheduleId },
                            select: { loanId: true },
                        });
                        
                        if (!schedule) {
                            return [{ type: 'text', text: '❌ ไม่พบข้อมูลงวดชำระ กรุณาลองใหม่อีกครั้ง' }];
                        }
                        
                        // Generate invoice using user.id as generator
                        const invoiceData = await invoiceService.generateNextPaymentInvoice(
                            schedule.loanId,
                            user.id
                        );
                        
                        // Generate secure token
                        const { SecureDocumentService } = await import('@documents/services/secure-document.service');
                        const secureDocumentService = new SecureDocumentService();
                        
                        const secureToken = await secureDocumentService.generateSecureToken(
                            'invoice',
                            invoiceData.invoiceId,
                            customerId
                        );
                        const secureUrl = await secureDocumentService.getSecureDocumentUrl(secureToken);
                        
                        // Send invoice message
                        return [
                            {
                                type: 'flex',
                                altText: `ใบแจ้งหนี้ ${invoiceData.invoiceNumber}`,
                                contents: {
                                    type: 'bubble',
                                    header: {
                                        type: 'box',
                                        layout: 'vertical',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: '✅ ใบแจ้งหนี้พร้อมแล้ว',
                                                weight: 'bold',
                                                size: 'xl',
                                                color: '#FFFFFF',
                                            },
                                            {
                                                type: 'text',
                                                text: invoiceData.invoiceNumber,
                                                size: 'sm',
                                                color: '#FFFFFF',
                                                margin: 'sm',
                                            },
                                        ],
                                        paddingAll: '20px',
                                        backgroundColor: '#1DB446',
                                    },
                                    body: {
                                        type: 'box',
                                        layout: 'vertical',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'ใบแจ้งหนี้ของคุณถูกสร้างเรียบร้อยแล้ว',
                                                wrap: true,
                                                size: 'sm',
                                                color: '#666666',
                                            },
                                            {
                                                type: 'separator',
                                                margin: 'lg',
                                            },
                                            {
                                                type: 'box',
                                                layout: 'horizontal',
                                                contents: [
                                                    { type: 'text', text: 'งวดที่:', size: 'sm', color: '#666666', flex: 1 },
                                                    { 
                                                        type: 'text', 
                                                        text: `${invoiceData.nextPayment.installmentNo}/${invoiceData.nextPayment.totalInstallments}`, 
                                                        size: 'sm', 
                                                        weight: 'bold', 
                                                        color: '#333333', 
                                                        flex: 2,
                                                    },
                                                ],
                                                margin: 'lg',
                                            },
                                            {
                                                type: 'box',
                                                layout: 'horizontal',
                                                contents: [
                                                    { type: 'text', text: 'จำนวนเงิน:', size: 'sm', color: '#666666', flex: 1 },
                                                    { 
                                                        type: 'text', 
                                                        text: `${invoiceData.nextPayment.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท`, 
                                                        size: 'lg', 
                                                        weight: 'bold', 
                                                        color: '#1DB446', 
                                                        flex: 2,
                                                        align: 'end',
                                                    },
                                                ],
                                                margin: 'md',
                                            },
                                            {
                                                type: 'box',
                                                layout: 'horizontal',
                                                contents: [
                                                    { type: 'text', text: 'ครบกำหนด:', size: 'sm', color: '#666666', flex: 1 },
                                                    { 
                                                        type: 'text', 
                                                        text: new Date(invoiceData.nextPayment.dueDate).toLocaleDateString('th-TH'),
                                                        size: 'sm', 
                                                        weight: 'bold', 
                                                        color: '#FF5551', 
                                                        flex: 2,
                                                        align: 'end',
                                                    },
                                                ],
                                                margin: 'md',
                                            },
                                        ],
                                        paddingAll: '20px',
                                    },
                                    footer: {
                                        type: 'box',
                                        layout: 'vertical',
                                        contents: [
                                            {
                                                type: 'box',
                                                layout: 'vertical',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: '🔒 เอกสารได้รับการปกป้อง',
                                                        size: 'xs',
                                                        color: '#1DB446',
                                                        weight: 'bold',
                                                        align: 'center',
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: 'ต้องกรอกเลขบัตรประชาชน 4 ตัวท้ายเพื่อเข้าถึง',
                                                        size: 'xxs',
                                                        color: '#666666',
                                                        align: 'center',
                                                        margin: 'xs',
                                                        wrap: true,
                                                    },
                                                ],
                                                margin: 'none',
                                            },
                                            {
                                                type: 'separator',
                                                margin: 'md',
                                            },
                                            {
                                                type: 'button',
                                                action: {
                                                    type: 'uri',
                                                    label: '🔐 ดูใบแจ้งหนี้ (ต้องยืนยันตัวตน)',
                                                    uri: secureUrl,
                                                },
                                                style: 'primary',
                                                color: '#1DB446',
                                                height: 'sm',
                                                margin: 'md',
                                            },
                                            {
                                                type: 'text',
                                                text: '💡 ลิงก์นี้หมดอายุใน 7 วัน',
                                                size: 'xxs',
                                                color: '#999999',
                                                align: 'center',
                                                wrap: true,
                                                margin: 'md',
                                            },
                                        ],
                                        paddingAll: '12px',
                                    },
                                },
                            },
                        ];
                    } catch (error) {
                        logger.error({ error, scheduleId, customerId }, 'Error generating invoice from postback');
                        return [{ type: 'text', text: '❌ เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้ กรุณาลองใหม่อีกครั้ง' }];
                    }
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];

            case 'request_invoice_next':
                if (this.isCustomerRole(user.role)) {
                    const loanId = params.get('loan_id');
                    const customerId = params.get('customer_id');
                    if (!loanId || !customerId) return [{ type: 'text', text: '❌ ข้อมูลไม่ครบถ้วน' }];
                    try {
                        // หา schedule ถัดไปหลังจาก schedule ปัจจุบัน
                        const currentSchedule = await prisma.paymentSchedule.findFirst({
                            where: { loanId, status: { in: ['UNPAID', 'OVERDUE', 'PARTIAL'] } },
                            orderBy: { paymentDate: 'asc' },
                        });
                        const nextSchedule = await prisma.paymentSchedule.findFirst({
                            where: { loanId, status: 'UNPAID', paymentDate: { gt: currentSchedule?.paymentDate || new Date() } },
                            orderBy: { paymentDate: 'asc' },
                        });
                        if (!nextSchedule) return [{ type: 'text', text: '✅ ไม่มีงวดล่วงหน้าที่สามารถขอใบแจ้งหนี้ได้' }];
                        const { NextPaymentInvoiceService } = await import('@invoices/services/next-payment-invoice.service');
                        const invoiceService = new NextPaymentInvoiceService();
                        const invoiceData = await invoiceService.generateNextPaymentInvoice(loanId, user.id);
                        const { SecureDocumentService } = await import('@documents/services/secure-document.service');
                        const svc = new SecureDocumentService();
                        const token = await svc.generateSecureToken('invoice', invoiceData.invoiceId, customerId);
                        const url = await svc.getSecureDocumentUrl(token);
                        return [{ type: 'text', text: `✅ ใบแจ้งหนี้ล่วงหน้างวดที่ ${invoiceData.nextPayment.installmentNo} พร้อมแล้ว\n\n🔗 ${url}\n\n🔒 ใช้ 4 ตัวท้ายบัตรประชาชนเพื่อเปิด` }];
                    } catch (err) {
                        logger.error({ err }, 'Error generating next invoice');
                        return [{ type: 'text', text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่' }];
                    }
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];

            case 'request_overdue_invoices':
                if (this.isCustomerRole(user.role)) {
                    const loanId = params.get('loan_id');
                    const customerId = params.get('customer_id');
                    if (!loanId || !customerId) return [{ type: 'text', text: '❌ ข้อมูลไม่ครบถ้วน' }];
                    try {
                        const today = new Date();
                        const PENALTY_RATE_DAILY = 0.03 / 365;
                        const overdueSchedules = await prisma.paymentSchedule.findMany({
                            where: { loanId, status: { in: ['OVERDUE', 'PARTIAL'] } },
                            orderBy: { paymentDate: 'asc' },
                            take: 5,
                        });
                        if (overdueSchedules.length === 0) return [{ type: 'text', text: '✅ ไม่มีงวดค้างชำระ' }];

                        const fmt = (n: number) => Math.round(n).toLocaleString('th-TH');
                        const fmtDate = (d: Date) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

                        const sp = overdueSchedules.map(sc => {
                            const days = Math.max(0, Math.floor((today.getTime() - new Date(sc.paymentDate).getTime()) / 86400000));
                            const penalty = Number(sc.totalPayment) * PENALTY_RATE_DAILY * days;
                            return { ...sc, daysOverdue: days, penalty, totalWithPenalty: Number(sc.totalPayment) + penalty };
                        });
                        const grandTotal = sp.reduce((s, sc) => s + sc.totalWithPenalty, 0);

                        const lines = sp.map((sc, i) =>
                            `${i + 1}. งวด${sc.paymentNumber} (${fmtDate(sc.paymentDate)})\n   ${fmt(Number(sc.totalPayment))}฿ + ปรับ ${fmt(sc.penalty)}฿ = ${fmt(sc.totalWithPenalty)}฿`
                        ).join('\n\n');

                        const quickItems = [
                            ...sp.map(sc => ({
                                type: 'action',
                                action: { type: 'postback', label: `งวด ${sc.paymentNumber}`, data: `action=request_invoice&schedule_id=${sc.id}&customer_id=${customerId}`, displayText: `ใบแจ้งหนี้งวด ${sc.paymentNumber}` },
                            })),
                            { type: 'action', action: { type: 'postback', label: '📋 รวมทุกงวด', data: `action=request_invoice_all_overdue&loan_id=${loanId}&customer_id=${customerId}`, displayText: 'ใบแจ้งหนี้รวมทุกงวดค้าง' } },
                        ];

                        return [{ type: 'text', text: `📋 งวดค้าง (${sp.length} งวด)\n\n${lines}\n\n💰 รวม: ${fmt(grandTotal)}฿\n\n👇 เลือกงวดที่ต้องการใบแจ้งหนี้`, quickReply: { items: quickItems } }];
                    } catch (err) {
                        logger.error({ err }, 'Error generating overdue invoices');
                        return [{ type: 'text', text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่' }];
                    }
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];

            case 'request_invoice_all_overdue':
                if (this.isCustomerRole(user.role)) {
                    const loanId = params.get('loan_id');
                    const customerId = params.get('customer_id');
                    if (!loanId || !customerId) return [{ type: 'text', text: '❌ ข้อมูลไม่ครบถ้วน' }];
                    try {
                        const today = new Date();
                        const PENALTY_RATE_DAILY = 0.03 / 365;
                        const overdueSchedules = await prisma.paymentSchedule.findMany({
                            where: { loanId, status: { in: ['OVERDUE', 'PARTIAL'] } },
                            orderBy: { paymentDate: 'asc' },
                        });
                        if (overdueSchedules.length === 0) return [{ type: 'text', text: '✅ ไม่มีงวดค้างชำระ' }];

                        const totalPrincipal = overdueSchedules.reduce((s, sc) => s + Number(sc.totalPayment), 0);
                        const totalPenalty = overdueSchedules.reduce((s, sc) => {
                            const days = Math.max(0, Math.floor((today.getTime() - new Date(sc.paymentDate).getTime()) / 86400000));
                            return s + Number(sc.totalPayment) * PENALTY_RATE_DAILY * days;
                        }, 0);
                        const grandTotal = totalPrincipal + totalPenalty;
                        const fmt = (n: number) => Math.round(n).toLocaleString('th-TH');

                        // Generate invoice for first overdue schedule
                        const { NextPaymentInvoiceService } = await import('@invoices/services/next-payment-invoice.service');
                        const invoiceService = new NextPaymentInvoiceService();
                        const invoiceData = await invoiceService.generateNextPaymentInvoice(loanId, user.id);
                        const { SecureDocumentService } = await import('@documents/services/secure-document.service');
                        const svc = new SecureDocumentService();
                        const token = await svc.generateSecureToken('invoice', invoiceData.invoiceId, customerId);
                        const url = await svc.getSecureDocumentUrl(token);

                        return [{
                            type: 'flex',
                            altText: `ใบแจ้งหนี้รวม ${overdueSchedules.length} งวด — ${fmt(grandTotal)} บาท`,
                            contents: {
                                type: 'bubble',
                                header: {
                                    type: 'box', layout: 'vertical', backgroundColor: '#FF4444', paddingAll: '15px',
                                    contents: [
                                        { type: 'text', text: 'ใบแจ้งหนี้รวมทุกงวดค้าง', weight: 'bold', size: 'lg', color: '#FFFFFF' },
                                        { type: 'text', text: `${overdueSchedules.length} งวด`, size: 'sm', color: '#FFFFFF', margin: 'xs' },
                                    ],
                                },
                                body: {
                                    type: 'box', layout: 'vertical', paddingAll: '15px', spacing: 'md',
                                    contents: [
                                        { type: 'box', layout: 'horizontal', contents: [
                                            { type: 'text', text: 'ยอดงวดรวม:', size: 'sm', color: '#666', flex: 1 },
                                            { type: 'text', text: `${fmt(totalPrincipal)} ฿`, size: 'sm', flex: 2, align: 'end' },
                                        ]},
                                        { type: 'box', layout: 'horizontal', contents: [
                                            { type: 'text', text: 'ดอกเบี้ยปรับรวม:', size: 'sm', color: '#FF4444', flex: 1 },
                                            { type: 'text', text: `${fmt(totalPenalty)} ฿`, size: 'sm', color: '#FF4444', flex: 2, align: 'end' },
                                        ]},
                                        { type: 'separator' },
                                        { type: 'box', layout: 'horizontal', contents: [
                                            { type: 'text', text: 'ยอดรวมทั้งหมด:', size: 'lg', weight: 'bold', flex: 1 },
                                            { type: 'text', text: `${fmt(grandTotal)} ฿`, size: 'lg', weight: 'bold', color: '#FF4444', flex: 2, align: 'end' },
                                        ]},
                                        { type: 'text', text: 'กดปุ่มด้านล่างเพื่อเปิดใบแจ้งหนี้ ใช้ 4 ตัวท้ายบัตรประชาชน', size: 'xs', color: '#999', wrap: true, margin: 'md' },
                                    ],
                                },
                                footer: {
                                    type: 'box', layout: 'vertical', paddingAll: '12px',
                                    contents: [{
                                        type: 'button', style: 'primary', color: '#FF4444',
                                        action: { type: 'uri', label: 'เปิดใบแจ้งหนี้', uri: url },
                                    }],
                                },
                            },
                        }];
                    } catch (err) {
                        logger.error({ err }, 'Error generating all overdue invoice');
                        return [{ type: 'text', text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่' }];
                    }
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];

            case 'schedule':
                if (this.isCustomerRole(user.role)) {
                    const loanId = params.get('loan_id');
                    const customerId = params.get('customer_id');

                    if (loanId && customerId) {
                        const { CustomerMessages } = await import('@line/messages/customer.messages');
                        return await CustomerMessages.createScheduleDetailMessage(loanId, customerId);
                    }
                    return await LineMessagesService.createScheduleMessage(user.id);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
                
            case 'invoice':
                if (this.isCustomerRole(user.role)) {
                    const { LineInvoiceService } = await import('@line/services/messaging/line-invoice.service');
                    const invoiceService = new LineInvoiceService();
                    return await invoiceService.createInvoiceListMessage(sanitizedUserId);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
                
            case 'invoices':
                if (this.isCustomerRole(user.role)) {
                    const { LineInvoiceService } = await import('@line/services/messaging/line-invoice.service');
                    const invoiceService = new LineInvoiceService();
                    return await invoiceService.createInvoiceListMessage(sanitizedUserId);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
            
            case 'view_invoice':
                if (this.isCustomerRole(user.role)) {
                    const paymentScheduleId = params.get('scheduleId');
                    if (!paymentScheduleId) {
                        return [{ type: 'text', text: '❌ ไม่พบข้อมูลใบแจ้งหนี้' }];
                    }
                    
                    const { LineInvoiceService } = await import('@line/services/messaging/line-invoice.service');
                    const invoiceService = new LineInvoiceService();
                    return [await invoiceService.createInvoiceMessage(paymentScheduleId, sanitizedUserId)];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
            
            case 'download_invoice_pdf':
                if (this.isCustomerRole(user.role)) {
                    const paymentScheduleId = params.get('scheduleId');
                    if (!paymentScheduleId) {
                        return [{ type: 'text', text: '❌ ไม่พบข้อมูลใบแจ้งหนี้' }];
                    }
                    
                    const { LineInvoiceService } = await import('@line/services/messaging/line-invoice.service');
                    const invoiceService = new LineInvoiceService();
                    
                    // Send PDF asynchronously (don't wait for reply)
                    invoiceService.sendInvoicePDF(paymentScheduleId, sanitizedUserId).catch(error => {
                        logger.error({ error, paymentScheduleId, sanitizedUserId }, 'Error sending PDF invoice');
                    });
                    
                    // Return immediate response - just acknowledge, PDF will be sent separately
                    return [
                        {
                            type: 'text',
                            text: '✅ กำลังดำเนินการ เมื่อเสร็จแล้วจะส่งให้',
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
                
            case 'contact':
                return LineMessagesService.createContactMessage(user?.role);
                
            case 'dashboard':
            case 'summary':
                if (['ADMIN', 'MANAGER', 'OFFICER'].includes(user.role)) {
                    return await LineMessagesService.createDashboardMessage(user.role, user.id);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่เท่านั้น' }];
            
            // Officer actions
            case 'tasks':
                if (user.role === 'OFFICER') {
                    const { LoanOfficerTaskService } = await import('@shared/services/loan-officer-task.service');
                    const taskService = new LoanOfficerTaskService();
                    const tasks = await taskService.getTasksForOfficer(user.id);
                    return LineMessagesService.createTaskListMessage(tasks);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];
            
            // Enhanced Contact Logging Actions
            case 'start_contact_log':
                if (user.role === 'OFFICER') {
                    const { LineContactLoggingEnhancedService } = await import('@collections/services/line-contact-logging-enhanced.service');
                    const contactService = new LineContactLoggingEnhancedService();
                    
                    const taskId = params.get('taskId') || undefined;
                    const customerId = params.get('customerId') || undefined;
                    const loanId = params.get('loanId') || undefined;
                    
                    return await contactService.startContactLogging(user.id, taskId, customerId, loanId);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];
            
            case 'log_contact':
                if (user.role === 'OFFICER') {
                    // Legacy support - redirect to new system
                    const taskId = params.get('taskId');
                    const loanId = params.get('loanId');
                    
                    if (!taskId || !loanId) {
                        const { LineContactLoggingEnhancedService } = await import('@collections/services/line-contact-logging-enhanced.service');
                        const contactService = new LineContactLoggingEnhancedService();
                        return await contactService.startContactLogging(user.id);
                    }
                    
                    // Get customer info from loan
                    const loan = await prisma.loan.findUnique({
                        where: { id: loanId },
                        include: {
                            customer: {
                                select: { id: true, businessName: true }
                            }
                        }
                    });
                    
                    if (!loan) {
                        return [{ type: 'text', text: '❌ ไม่พบข้อมูลสินเชื่อ' }];
                    }
                    
                    const { LineContactLoggingEnhancedService } = await import('@collections/services/line-contact-logging-enhanced.service');
                    const contactService = new LineContactLoggingEnhancedService();
                    return await contactService.startContactLogging(user.id, taskId, loan.customer.id, loanId);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];

            // Contact logging postback handlers
            case 'contact_type':
                if (user.role === 'OFFICER') {
                    const contactType = params.get('contact_type') || sanitizedData.replace('contact_type=', '');
                    const { LineContactLoggingEnhancedService } = await import('@collections/services/line-contact-logging-enhanced.service');
                    const contactService = new LineContactLoggingEnhancedService();
                    return await contactService.handleContactTypeSelection(user.id, contactType);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];

            case 'contact_outcome':
                if (user.role === 'OFFICER') {
                    const outcome = params.get('outcome') || sanitizedData.replace('contact_outcome=', '');
                    const { LineContactLoggingEnhancedService } = await import('@collections/services/line-contact-logging-enhanced.service');
                    const contactService = new LineContactLoggingEnhancedService();
                    return await contactService.handleOutcomeSelection(user.id, outcome);
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];

            case 'save_contact_log':
                if (user.role === 'OFFICER') {
                    const { LineContactLoggingEnhancedService } = await import('@collections/services/line-contact-logging-enhanced.service');
                    const contactService = new LineContactLoggingEnhancedService();
                    return await contactService.handleNotesAndSave(user.id, '');
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];
            
            // Manager actions
            case 'approvals':
                if (['MANAGER', 'ADMIN'].includes(user.role)) {
                    const frontendUrl = await this.getFrontendUrl();
                    return [
                        {
                            type: 'text',
                            text: `📋 รายการรออนุมัติ\n\n🔗 เข้าสู่ระบบเพื่อดูรายละเอียด:\n${frontendUrl}/approvals`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้จัดการเท่านั้น' }];

            // New Customer Menu Actions
            case 'payment_schedule':
                if (this.isCustomerRole(user.role)) {
                    return [
                        {
                            type: 'text',
                            text: '📅 ตารางการชำระเงิน\n\nกรุณาระบุหมายเลขสินเชื่อ:\nเช่น: ตารางชำระ L001',
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];

            case 'documents':
                if (this.isCustomerRole(user.role)) {
                    const frontendUrl = await this.getFrontendUrl();
                    return [
                        {
                            type: 'text',
                            text: `📄 เอกสารสินเชื่อ\n\n🔗 เข้าสู่ระบบเพื่อดาวน์โหลดเอกสาร:\n${frontendUrl}/documents`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];

            case 'notifications':
                if (['USER', 'CUSTOMER', 'MANAGER'].includes(user.role)) {
                    const frontendUrl = await this.getFrontendUrl();
                    return [
                        {
                            type: 'text',
                            text: `🔔 การแจ้งเตือน\n\n🔗 ตั้งค่าการแจ้งเตือน:\n${frontendUrl}/notifications`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าหรือผู้จัดการเท่านั้น' }];

            // New Officer Menu Actions
            case 'customers':
                if (user.role === 'OFFICER') {
                    const frontendUrl = await this.getFrontendUrl();
                    return [
                        {
                            type: 'text',
                            text: `👥 รายชื่อลูกค้า\n\n🔗 เข้าสู่ระบบเพื่อดูรายชื่อลูกค้า:\n${frontendUrl}/customers`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];

            case 'loans':
                if (user.role === 'OFFICER') {
                    const frontendUrl = await this.getFrontendUrl();
                    return [
                        {
                            type: 'text',
                            text: `💳 จัดการสินเชื่อ\n\n🔗 เข้าสู่ระบบเพื่อจัดการสินเชื่อ:\n${frontendUrl}/loans`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];

            case 'collections':
                if (user.role === 'OFFICER') {
                    const frontendUrl = await this.getFrontendUrl();
                    return [
                        {
                            type: 'text',
                            text: `💰 ติดตามหนี้\n\n🔗 เข้าสู่ระบบเพื่อติดตามการชำระหนี้:\n${frontendUrl}/collections`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่สินเชื่อเท่านั้น' }];

            case 'reports':
                if (['OFFICER', 'MANAGER'].includes(user.role)) {
                    const frontendUrl = await this.getFrontendUrl();
                    return [
                        {
                            type: 'text',
                            text: `📈 รายงาน\n\n🔗 เข้าสู่ระบบเพื่อดูรายงาน:\n${frontendUrl}/reports`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับเจ้าหน้าที่หรือผู้จัดการเท่านั้น' }];

            // New Manager Menu Actions
            case 'team_performance':
                if (user.role === 'MANAGER') {
                    const frontendUrl = await this.getFrontendUrl();
                    return [
                        {
                            type: 'text',
                            text: `👥 ผลงานทีม\n\n🔗 เข้าสู่ระบบเพื่อดูผลงานทีม:\n${frontendUrl}/team-performance`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้จัดการเท่านั้น' }];

            case 'branch_reports':
                if (user.role === 'MANAGER') {
                    const frontendUrl = await this.getFrontendUrl();
                    return [
                        {
                            type: 'text',
                            text: `📋 รายงานสาขา\n\n🔗 เข้าสู่ระบบเพื่อดูรายงานสาขา:\n${frontendUrl}/branch-reports`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้จัดการเท่านั้น' }];

            // New Admin Menu Actions
            case 'system_config':
                if (user.role === 'ADMIN') {
                    const frontendUrl = await this.getFrontendUrl();
                    return [
                        {
                            type: 'text',
                            text: `🔧 ตั้งค่าระบบ\n\n🔗 เข้าสู่ระบบเพื่อตั้งค่าระบบ:\n${frontendUrl}/admin/config`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น' }];

            case 'user_management':
                if (user.role === 'ADMIN') {
                    const frontendUrl = await this.getFrontendUrl();
                    return [
                        {
                            type: 'text',
                            text: `👤 จัดการผู้ใช้\n\n🔗 เข้าสู่ระบบเพื่อจัดการผู้ใช้:\n${frontendUrl}/admin/users`,
                        },
                    ];
                }
                
                if (user && user.role === 'MANAGER') {
                    const { DatabaseQueryService } = await import('@core-services/services/database-query.service');
                    const dbService = new DatabaseQueryService();
                    
                    const pendingApprovals = await dbService.getPendingApprovals(user.id, user.role);
                    
                    if (pendingApprovals.length === 0) {
                        return [
                            {
                                type: 'text',
                                text: '✅ ไม่มีสินเชื่อรออนุมัติในขณะนี้',
                            },
                        ];
                    }

                    return [
                        {
                            type: 'text',
                            text: `📋 สินเชื่อรออนุมัติ: ${pendingApprovals.length} รายการ\n\nกรุณาใช้เว็บไซต์เพื่ออนุมัติสินเชื่อ`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้จัดการเท่านั้น' }];
            
            case 'npl':
                if (user.role === 'MANAGER') {
                    const { NPLAlertService } = await import('@collections/services/npl-alert.service');
                    const nplService = new NPLAlertService();
                    
                    // Get user's branch ID
                    const userWithBranch = await prisma.user.findUnique({
                        where: { id: user.id },
                        select: { branchId: true },
                    });

                    if (!userWithBranch || !userWithBranch.branchId) {
                        return [
                            {
                                type: 'text',
                                text: '❌ ไม่พบข้อมูลสาขาของคุณ กรุณาติดต่อเจ้าหน้าที่',
                            },
                        ];
                    }

                    const nplLoans = await nplService.getNPLLoans(userWithBranch.branchId);
                    const highRiskLoans = await nplService.getHighRiskLoans(userWithBranch.branchId);
                    
                    return [
                        {
                            type: 'text',
                            text: `🚨 สรุป NPL และ High-risk\n\nNPL (>90 วัน): ${nplLoans.length} รายการ\nHigh-risk (60-89 วัน): ${highRiskLoans.length} รายการ\n\nกรุณาใช้เว็บไซต์เพื่อดูรายละเอียด`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้จัดการเท่านั้น' }];
            
            // Admin actions
            case 'system_status':
                if (user.role === 'ADMIN') {
                    const { MonitoringService } = await import('@shared/services/monitoring.service');
                    const monitoringService = new MonitoringService();
                    const health = await monitoringService.checkSystemHealth();
                    
                    const statusEmoji = health.status === 'healthy' ? '✅' : health.status === 'degraded' ? '⚠️' : '❌';
                    const statusText = health.status === 'healthy' ? 'ปกติ' : health.status === 'degraded' ? 'เฝ้าระวัง' : 'วิกฤต';
                    
                    return [
                        {
                            type: 'text',
                            text: `🖥️ สถานะระบบ\n\nสถานะ: ${statusEmoji} ${statusText}\nDatabase: ${health.database ? '✅' : '❌'}\nRedis: ${health.redis ? '✅' : '❌'}\nLINE API: ${health.lineAPI ? '✅' : '❌'}\n\nเวลา: ${health.timestamp.toLocaleString('th-TH')}`,
                        },
                    ];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับผู้ดูแลระบบเท่านั้น' }];
            
            // Task 7.3.3: Loan selection for detail view
            case 'loan_detail':
                if (this.isCustomerRole(user.role)) {
                    const loanId = params.get('loanId');
                    if (!loanId) {
                        return [{ type: 'text', text: '❌ ไม่พบข้อมูลสินเชื่อ' }];
                    }
                    
                    // Get loan details
                    const loan = await prisma.loan.findUnique({
                        where: { id: loanId },
                        include: {
                            customer: true,
                            disbursements: {
                                where: { status: 'DISBURSED' },
                                orderBy: { disbursedAt: 'asc' },
                                take: 1,
                            },
                            paymentSchedule: {
                                where: {
                                    status: {
                                        in: ['UNPAID', 'OVERDUE'],
                                    },
                                },
                                orderBy: { paymentDate: 'asc' },
                                take: 1,
                            },
                        },
                    });
                    
                    if (!loan || loan.customer.userId !== user.id) {
                        return [{ type: 'text', text: '❌ ไม่พบข้อมูลสินเชื่อหรือคุณไม่มีสิทธิ์เข้าถึง' }];
                    }
                    
                    // Calculate outstanding balance and interest
                    const payments = await prisma.payment.findMany({
                        where: { loanId: loan.id },
                    });
                    
                    const totalPaid = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
                    const outstandingBalance = loan.principal.toNumber() - totalPaid;
                    
                    // Calculate accrued interest (simplified)
                    const monthsSinceDisbursement = loan.disbursements[0]
                        ? Math.floor((Date.now() - loan.disbursements[0].disbursedAt!.getTime()) / (1000 * 60 * 60 * 24 * 30))
                        : 0;
                    const accruedInterest = (outstandingBalance * (loan.interestRate.toNumber() / 100) * monthsSinceDisbursement) / 12;
                    
                    const nextPayment = loan.paymentSchedule[0];
                    
                    return [LineMessagesService.createLoanDetailMessage({
                        loanNumber: loan.id,
                        principal: loan.principal.toNumber(),
                        outstandingBalance,
                        accruedInterest,
                        fees: 0, // TODO: Calculate fees
                        totalAmountDue: outstandingBalance + accruedInterest,
                        disbursementDate: loan.disbursements[0]?.disbursedAt || loan.createdAt,
                        interestRate: loan.interestRate.toNumber(),
                        termMonths: loan.termMonths,
                        status: loan.status,
                        nextPaymentDate: nextPayment?.paymentDate || null,
                        nextPaymentAmount: nextPayment?.totalPayment.toNumber() || null,
                    })];
                }
                return [{ type: 'text', text: 'คำสั่งนี้สำหรับลูกค้าเท่านั้น' }];
                
            default:
                return [{ type: 'text', text: 'ไม่พบคำสั่งที่ต้องการ กรุณาลองใหม่อีกครั้ง' }];
        }
    }

    /**
     * Task 3.2.5: Handle multi-step conversation flows
     * 
     * @param userId - LINE User ID
     * @param text - User message
     * @param state - Current conversation state
     * @returns Response messages
     */
    private async handleConversationFlow(
        userId: string,
        text: string,
        state: { type: string; data: Record<string, any>; expiresAt: Date }
    ): Promise<any[]> {
        try {
            // Check if conversation has timed out
            if (new Date() > state.expiresAt) {
                await this.conversationStateService.clearState(userId);
                return [
                    {
                        type: 'text',
                        text: this.conversationStateService.getTimeoutMessage(),
                    },
                ];
            }

            // Route to appropriate flow handler
            switch (state.type) {
                case 'contact_logging':
                    return await this.handleContactLoggingFlow(userId, text, state);
                
                default:
                    // Unknown flow - clear state
                    await this.conversationStateService.clearState(userId);
                    return [
                        {
                            type: 'text',
                            text: '❌ เกิดข้อผิดพลาด กรุณาเริ่มใหม่อีกครั้ง',
                        },
                    ];
            }
        } catch (error) {
            logger.error({ error, userId, state }, 'Error handling conversation flow');
            await this.conversationStateService.clearState(userId);
            return [
                {
                    type: 'text',
                    text: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง\n\nพิมพ์ "เมนู" เพื่อดูคำสั่งที่ใช้ได้',
                },
            ];
        }
    }

    /**
     * Handle contact logging conversation flow
     */
    private async handleContactLoggingFlow(
        userId: string,
        text: string,
        state: { type: string; data: Record<string, any> }
    ): Promise<any[]> {
        const { LineContactLoggingEnhancedService } = await import('@collections/services/line-contact-logging-enhanced.service');
        const contactService = new LineContactLoggingEnhancedService();

        // Handle different steps in the contact logging flow
        if (state.data.step === 'add_notes') {
            // User is adding notes or additional info
            if (state.data.outcome && ['PROMISED', 'EXTENSION', 'PARTIAL_PAYMENT'].includes(state.data.outcome) && !state.data.additionalInfo) {
                // Handle additional info input
                return await contactService.handleAdditionalInfo(userId, text);
            } else {
                // Handle notes input and save
                return await contactService.handleNotesAndSave(userId, text);
            }
        } else {
            // Unknown step - clear state and restart
            await this.conversationStateService.clearState(userId);
            return await contactService.startContactLogging(userId);
        }
    }

    /**
     * Get display name for user role
     */
    private getRoleDisplayName(role: string): string {
        const roleMap: Record<string, string> = {
            'ADMIN': 'ผู้ดูแลระบบ',
            'MANAGER': 'ผู้จัดการสาขา',
            'OFFICER': 'เจ้าหน้าที่สินเชื่อ',
            'USER': 'ลูกค้า',
            'CUSTOMER': 'ลูกค้า',
        };
        return roleMap[role] || role;
    }

    private isCustomerRole(role: string): boolean {
        return role === 'USER' || role === 'CUSTOMER';
    }
}
