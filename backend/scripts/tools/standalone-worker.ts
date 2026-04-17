import { emailWorker } from './src/workers/email.worker';
import { logger } from './src/utils/logger.util';

console.log('Standalone Email Worker started. Checking for jobs...');

// Stay alive
setInterval(() => { }, 1000);
