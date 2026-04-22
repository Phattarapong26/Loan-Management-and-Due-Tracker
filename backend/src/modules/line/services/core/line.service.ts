import axios from 'axios';
import { env } from '@config/env.config';

const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';

interface LineMessage {
    type: string;
    [key: string]: any;
}

export class LineService {
    private accessToken: string;

    constructor() {
        this.accessToken = env.LINE_CHANNEL_ACCESS_TOKEN || '';
    }

    // Send reply message
    async replyMessage(replyToken: string, messages: LineMessage[]): Promise<boolean> {
        try {
            // Validate message size before sending (LINE limit ~5KB per message)
            const msgJson = JSON.stringify(messages);
            if (msgJson.length > 5000) {
                console.warn(`[LINE] Reply message too large: ${msgJson.length} bytes — truncating to text fallback`);
                messages = [{ type: 'text', text: '⚠️ ข้อมูลมีขนาดใหญ่เกินไป กรุณาลองใหม่อีกครั้ง' } as any];
            }
            await axios.post(
                `${LINE_MESSAGING_API}/message/reply`,
                { replyToken, messages },
                { headers: { Authorization: `Bearer ${this.accessToken}` } }
            );
            return true;
        } catch (error: any) {
            const details = error.response?.data?.details;
            console.error('[LINE] Reply Error:', {
                status: error.response?.status,
                message: error.response?.data?.message,
                details: details ? JSON.stringify(details) : undefined,
                msgSize: JSON.stringify(messages).length,
            });
            return false;
        }
    }

    // Send push message
    async pushMessage(userId: string, messages: LineMessage[]): Promise<boolean> {
        try {
            const response = await axios.post(
                `${LINE_MESSAGING_API}/message/push`,
                { to: userId, messages },
                { headers: { Authorization: `Bearer ${this.accessToken}` } }
            );
            console.log('✅ LINE Push Success:', { userId, messageCount: messages.length, status: response.status });
            return true;
        } catch (error: any) {
            console.error('❌ LINE Push Error:', {
                userId,
                error: error.response?.data || error.message,
                status: error.response?.status,
            });
            throw error; // Throw error so queue can retry
        }
    }

    // Create welcome message for new followers
    createWelcomeMessage(): LineMessage[] {
        return [
            {
                type: 'flex',
                altText: 'ยินดีต้อนรับ',
                contents: {
                    type: 'bubble',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: '🎉 ยินดีต้อนรับ', weight: 'bold', size: 'xl', color: '#1DB954' },
                        ],
                        backgroundColor: '#F5F5F5',
                        paddingAll: '15px',
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: 'ขอบคุณที่เพิ่มเราเป็นเพื่อน!', size: 'md', wrap: true },
                            { type: 'text', text: 'คุณสามารถใช้บริการดังนี้:', size: 'sm', color: '#666666', margin: 'md', wrap: true },
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: '📊 ดูยอดคงเหลือ', size: 'sm', margin: 'sm' },
                                    { type: 'text', text: '📅 ดูกำหนดชำระ', size: 'sm', margin: 'sm' },
                                    { type: 'text', text: '📝 ประวัติการชำระ', size: 'sm', margin: 'sm' },
                                    { type: 'text', text: '📞 ติดต่อเจ้าหน้าที่', size: 'sm', margin: 'sm' },
                                ],
                                margin: 'lg',
                            },
                        ],
                        paddingAll: '15px',
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: 'พิมพ์ "เมนู" เพื่อดูคำสั่งทั้งหมด', size: 'xs', color: '#888888', align: 'center' },
                        ],
                        paddingAll: '10px',
                    },
                },
            },
        ];
    }

    /**
     * Task 4.3.2-4.3.3: Get LINE Official Account QR Code URL
     * 
     * @returns QR code URL for adding the LINE Official Account
     */
    getLineQRCodeURL(): string {
        const lineOaId = env.LINE_OA_ID;
        
        // Remove @ prefix if present for URL
        const cleanId = lineOaId.startsWith('@') ? lineOaId.substring(1) : lineOaId;
        
        // Format: https://qr-official.line.me/sid/L/{LINE_OA_ID}.png
        return `https://qr-official.line.me/sid/L/${cleanId}.png`;
    }

    /**
     * Get LINE Official Account add friend URL
     * 
     * @returns URL for adding the LINE Official Account
     */
    getLineAddFriendURL(): string {
        return `https://line.me/R/ti/p/${env.LINE_OA_ID}`;
    }
}
