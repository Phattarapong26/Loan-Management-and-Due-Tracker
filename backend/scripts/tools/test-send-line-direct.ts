import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import axios from 'axios';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function testSendLineDirect() {
    try {
        console.log('📱 Testing Direct LINE Notification to Manager...\n');

        // Check LINE credentials
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        if (!channelAccessToken) {
            console.log('❌ LINE_CHANNEL_ACCESS_TOKEN not found in .env');
            return;
        }

        console.log('✅ LINE Channel Access Token found\n');

        // Get manager with LINE ID
        const manager = await prisma.user.findFirst({
            where: {
                role: 'MANAGER',
                status: 'ACTIVE',
                lineUserId: { not: null },
            },
            include: {
                branch: true,
            },
        });

        if (!manager || !manager.lineUserId) {
            console.log('❌ No manager with LINE ID found');
            return;
        }

        console.log(`✅ Manager: ${manager.firstName} ${manager.lastName}`);
        console.log(`   LINE User ID: ${manager.lineUserId}`);
        console.log(`   Branch: ${manager.branch?.name || 'N/A'}\n`);

        // Create test message
        const message = {
            type: 'flex',
            altText: '📋 คำขออนุมัติสินเชื่อใหม่',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '📋 คำขออนุมัติสินเชื่อใหม่',
                            weight: 'bold',
                            size: 'lg',
                            color: '#FF6B6B',
                            wrap: true,
                        },
                    ],
                    backgroundColor: '#F5F5F5',
                    paddingAll: '15px',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '💼 CA BASS ขออนุมัติสินเชื่อสำหรับ Evena Entertainment จำนวน 500,000 บาท',
                            size: 'md',
                            wrap: true,
                            color: '#333333',
                        },
                        {
                            type: 'text',
                            text: new Date().toLocaleString('th-TH'),
                            size: 'xs',
                            color: '#888888',
                            margin: 'md',
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
                                label: 'ดูรายละเอียด',
                                uri: `${process.env.FRONTEND_URL || 'https://app.example.com'}/loans/test-loan-id`,
                            },
                            style: 'primary',
                            color: '#1DB954',
                        },
                    ],
                    paddingAll: '10px',
                },
            },
        };

        console.log('📤 Sending LINE notification via API...\n');

        const response = await axios.post(
            'https://api.line.me/v2/bot/message/push',
            {
                to: manager.lineUserId,
                messages: [message],
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${channelAccessToken}`,
                },
            }
        );

        console.log('✅ LINE notification sent successfully!');
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log('\n💡 Check your LINE app to see the notification');
        console.log(`   Manager: ${manager.firstName} ${manager.lastName}`);
        console.log(`   LINE User ID: ${manager.lineUserId}`);

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
        }
    } finally {
        await prisma.$disconnect();
    }
}

testSendLineDirect();
