import { Queue } from 'bullmq';
import { redis } from './src/config/redis';

async function inspectCompletedJobs() {
    const queue = new Queue('email', { connection: redis });
    const completedJobs = await queue.getCompleted(0, 10);

    console.log(`Last 10 Completed Jobs:`);
    for (const job of completedJobs) {
        console.log(`- [${job.id}] Name: ${job.name}`);
        console.log(`  Data: ${JSON.stringify(job.data)}`);
        console.log(`  Return: ${JSON.stringify(job.returnvalue)}`);
        console.log(`  Finished at: ${new Date(job.finishedOn!).toLocaleString()}`);
        console.log('---');
    }
}

inspectCompletedJobs().then(() => redis.quit());
