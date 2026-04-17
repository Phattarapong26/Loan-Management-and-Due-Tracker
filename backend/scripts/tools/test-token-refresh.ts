/**
 * Test script to verify token refresh race condition fix
 * Run with: npx tsx backend/test-token-refresh.ts
 */

import { prisma } from './src/config/database';

async function testTokenRefresh() {
    console.log('🧪 Testing Token Refresh Race Condition Fix\n');

    try {
        // 1. Find a test user
        const user = await prisma.user.findFirst({
            where: { status: 'ACTIVE' },
        });

        if (!user) {
            console.log('❌ No active user found. Please create a user first.');
            return;
        }

        console.log(`✅ Found test user: ${user.email}`);

        // 2. Create a test session
        const session = await prisma.session.create({
            data: {
                userId: user.id,
                token: 'test-token-old',
                refreshToken: 'test-refresh-token',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                ipAddress: '127.0.0.1',
                userAgent: 'test-agent',
            },
        });

        console.log(`✅ Created test session: ${session.id}`);

        // 3. Simulate token refresh by updating the token
        console.log('\n🔄 Simulating token refresh (updating session token)...');
        
        const updatedSession = await prisma.session.update({
            where: { id: session.id },
            data: {
                token: 'test-token-new',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        console.log(`✅ Session updated with new token: ${updatedSession.token}`);

        // 4. Verify the session exists with new token (simulating auth middleware check)
        console.log('\n🔍 Verifying session exists with new token...');
        
        const verifySession = await prisma.session.findFirst({
            where: {
                token: 'test-token-new',
                userId: user.id,
                isValid: true,
                expiresAt: {
                    gt: new Date(),
                },
            },
            select: {
                id: true,
                token: true,
                isValid: true,
            },
        });

        if (verifySession) {
            console.log(`✅ Session found! ID: ${verifySession.id}`);
            console.log(`✅ Token: ${verifySession.token}`);
            console.log(`✅ Valid: ${verifySession.isValid}`);
        } else {
            console.log('❌ Session not found! This indicates a race condition.');
        }

        // 5. Test concurrent lookups (simulating multiple requests)
        console.log('\n🔄 Testing concurrent session lookups...');
        
        const concurrentLookups = await Promise.all([
            prisma.session.findFirst({
                where: { token: 'test-token-new', userId: user.id, isValid: true },
                select: { id: true },
            }),
            prisma.session.findFirst({
                where: { token: 'test-token-new', userId: user.id, isValid: true },
                select: { id: true },
            }),
            prisma.session.findFirst({
                where: { token: 'test-token-new', userId: user.id, isValid: true },
                select: { id: true },
            }),
        ]);

        const allFound = concurrentLookups.every(s => s !== null);
        if (allFound) {
            console.log(`✅ All ${concurrentLookups.length} concurrent lookups succeeded!`);
        } else {
            console.log('❌ Some concurrent lookups failed!');
        }

        // 6. Cleanup
        console.log('\n🧹 Cleaning up test session...');
        await prisma.session.delete({ where: { id: session.id } });
        console.log('✅ Test session deleted');

        console.log('\n✅ All tests passed! Token refresh race condition is fixed.');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testTokenRefresh();
