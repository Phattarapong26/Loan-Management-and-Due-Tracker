import { FastifyInstance } from 'fastify';
import { ConfigController } from '../controllers/config.controller';

export async function configRoutes(fastify: FastifyInstance) {
    const configController = new ConfigController();

    // Register the current frontend URL (called by frontend on startup)
    fastify.post('/config/frontend-url', configController.registerFrontendUrl);

    // Get the current frontend URL
    fastify.get('/config/frontend-url', configController.getFrontendUrl);
}
