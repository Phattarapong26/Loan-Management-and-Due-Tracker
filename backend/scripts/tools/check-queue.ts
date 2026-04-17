import { Queue } from 'bullmq';
import { redis } from './src/config/redis';

async function checkQueue() {
    const queue = new Queue('email', { connection: redis });

    const waiting = await queue.getWaitingCount();
    const active = await queue.getActiveCount();
    const completed = await queue.getCompletedCount();
    const failed = await queue.getFailedCount();

    console.log(`Queue: email`);
    console.log(`- Waiting: ${waiting}`);
    console.log(`- Active: ${active}`);
    console.log(`- Completed: ${completed}`);
    console.log(`- Failed: ${failed}`);

    if (waiting > 0) {
        const jobs = await queue.getWaiting(0, 5);
        console.log('\nTop 5 Waiting Jobs:');
        jobs.forEach(job => {
            console.log(`- [${job.id}] ${job.name}: ${JSON.stringify(job.data)}`);
        });
    }

    if (failed > 0) {
        const jobs = await queue.getFailed(0, 5);
        console.log('\nTop 5 Failed Jobs:');
        jobs.forEach(job => {
            console.log(`- [${job.id}] ${job.name} (Reason: ${job.failedReason})`);
        });
    }
}

checkQueue().then(() => redis.quit());
