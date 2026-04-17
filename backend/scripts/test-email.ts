#!/usr/bin/env tsx
/**
 * Test Email Service
 * ทดสอบการส่ง email ผ่าน SMTP
 */

import { EmailService } from '../src/modules/notifications/channels/email/email.service';
import { env } from '../src/core/config/env.config';

async function testEmail() {
    console.log('📧 Testing Email Service\n');
    
    // Check SMTP configuration
    console.log('🔍 SMTP Configuration:');
    console.log(`   Host: ${env.SMTP_HOST}`);
    console.log(`   Port: ${env.SMTP_PORT}`);
    console.log(`   User: ${env.SMTP_USER ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   Pass: ${env.SMTP_PASS ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`   From: ${env.SMTP_FROM}\n`);
    
    if (!env.SMTP_USER || !env.SMTP_PASS) {
        console.log('❌ SMTP credentials not configured!');
        console.log('💡 Please set SMTP_USER and SMTP_PASS in your .env file or Railway environment variables\n');
        process.exit(1);
    }
    
    const emailService = new EmailService();
    
    // Test 1: Simple email
    console.log('📨 Test 1: Sending simple test email...');
    const result1 = await emailService.sendEmail({
        to: env.SMTP_USER, // Send to yourself
        subject: 'Test Email from SME Bank',
        html: '<h1>Test Email</h1><p>This is a test email from SME Bank system.</p>'
    });
    
    if (result1) {
        console.log('✅ Test 1 passed: Simple email sent successfully\n');
    } else {
        console.log('❌ Test 1 failed: Could not send simple email\n');
    }
    
    // Test 2: Forgot password email
    console.log('📨 Test 2: Sending forgot password email...');
    const result2 = await emailService.sendForgotPasswordLink({
        to: env.SMTP_USER,
        firstName: 'Test',
        lastName: 'User',
        resetUrl: 'https://example.com/reset-password?token=test123'
    });
    
    if (result2) {
        console.log('✅ Test 2 passed: Forgot password email sent successfully\n');
    } else {
        console.log('❌ Test 2 failed: Could not send forgot password email\n');
    }
    
    console.log('✨ Email test completed!');
    console.log(`📬 Check your inbox: ${env.SMTP_USER}`);
}

// Run the test
testEmail().catch((error) => {
    console.error('❌ Fatal error during test:', error);
    process.exit(1);
});
