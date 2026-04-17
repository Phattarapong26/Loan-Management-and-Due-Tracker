import { EmailService } from './src/services/email.service';
import { logger } from './src/utils/logger.util';

async function test() {
    const emailService = new EmailService();
    console.log('Sending test email...');
    const result = await emailService.sendEmail({
        to: 'mulamedlab@gmail.com',
        subject: 'Test Email from SME Bank',
        text: 'This is a test email to verify SMTP configuration.'
    });

    if (result) {
        console.log('✅ Test email sent successfully');
    } else {
        console.log('❌ Failed to send test email');
    }
}

test().catch(err => {
    console.error('Fatal error during test:', err);
});
