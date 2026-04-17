import { QueueUtil } from './src/utils/queue.util';
import { redis } from './src/config/redis';

async function testQueue() {
    console.log('Adding test job to email queue...');
    await QueueUtil.addJob('email', {
        name: 'test-email',
        data: {
            to: 'mulamedlab@gmail.com',
            subject: 'Test Queue Job from SME Bank',
            text: 'This email confirms that the background worker is processing jobs correctly.'
        }
    });
    console.log('✅ Job added to queue');
}

testQueue().then(() => redis.quit());
