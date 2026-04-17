import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function testSendLineNotification() {
    try {
        console.log('📱 Testing LINE Notification to Manager...\n');

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

        // Import LINE service
        const { LineService } = await import('../../src/modules/line/services/core/line.service');
        const lineService = new LineService();

        // Create test message
        const message = {
            type: 'flex' as const,
            altText: '📋 คำขออนุมัติสินเชื่อใหม่',
            contents: {
                type: 'bubble' as const,
                header: {
                    type: 'box' as const,
                    layout: 'vertical' as const,
                    contents: [
                        {
                            type: 'text' as const,
                            text: '📋 คำขออนุมัติสินเชื่อใหม่',
                            weight: 'bold' as const,
                            size: 'lg' as const,
                            color: '#FF6B6B',
                            wrap: true,
                        },
                    ],
                    backgroundColor: '#F5F5F5',
                    paddingAll: '15px',
                },
                body: {
                    type: 'box' as const,
                    layout: 'vertical' as const,
                    contents: [
                        {
                            type: 'text' as const,
                            text: '💼 CA BASS ขออนุมัติสินเชื่อสำหรับ Evena Entertainment จำนวน 500,000 บาท',
                            size: 'md' as const,
                            wrap: true,
                            color: '#333333',
                        },
                        {
                            type: 'text' as const,
                            text: new Date().toLocaleString('th-TH'),
                            size: 'xs' as const,
                            color: '#888888',
                            margin: 'md' as const,
                        },
                    ],
                    paddingAll: '15px',
                },
                footer: {
                    type: 'box' as const,
                    layout: 'vertical' as const,
                    contents: [
                        {
                            type: 'button' as const,
                            action: {
                                type: 'uri' as const,
                                label: 'ดูรายละเอียด',
                                uri: `${process.env.FRONTEND_URL || 'https://app.example.com'}/loans/test-loan-id`,
                            },
                            style: 'primary' as const,
                            color: '#1DB954',
                        },
                    ],
                    paddingAll: '10px',
                },
            },
        };

        console.log('📤 Sending LINE notification...\n');

        await lineService.pushMessage(manager.lineUserId, [message]);

        console.log('✅ LINE notification sent successfully!');
        console.log('\n💡 Check your LINE app to see the notification');
        console.log(`   Manager: ${manager.firstName} ${manager.lastName}`);
        console.log(`   LINE User ID: ${manager.lineUserId}`);

    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

testSendLineNotification();
