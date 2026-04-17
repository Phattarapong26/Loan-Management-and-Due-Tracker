import { Worker, Job } from 'bullmq';
import { redis } from './src/config/redis';
import { EmailService } from './src/services/email.service';

const emailService = new EmailService();

async function runOneJob() {
    console.log('Worker (one-shot) started...');
    const worker = new Worker('email', async (job: Job) => {
        console.log(`Processing job ${job.id}: ${job.name}`);
        try {
            if (job.name === 'test-email') {
                return await emailService.sendEmail(job.data);
            }
            return { success: false, reason: 'unsupported test job' };
        } catch (e: any) {
            console.error('Error in worker:', e);
            throw e;
        }
    }, { connection: redis });

    worker.on('completed', (job) => console.log(`Job ${job.id} completed!`));
    worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err));

    console.log('Waiting for jobs for 10 seconds...');
    await new Promise(r => setTimeout(r, 10000));
    await worker.close();
}

runOneJob().then(() => redis.quit());
