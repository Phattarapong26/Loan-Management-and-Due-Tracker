import { FastifyRequest, FastifyReply } from 'fastify';
import { ConfigService } from '../services/config.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { z } from 'zod';

const registerFrontendUrlSchema = z.object({
    url: z.string().url('Invalid URL format'),
});

/**
 * Config Controller - Configuration management
 */
export class ConfigController {
    private configService: ConfigService;

    constructor() {
        this.configService = ConfigService.getInstance();
    }

    /**
     * Register the current frontend URL
     * Frontend calls this on startup to ensure password reset links use the correct URL
     */
    registerFrontendUrl = async (
        request: FastifyRequest<{ Body: { url: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const { url } = registerFrontendUrlSchema.parse(request.body);
            
            await this.configService.setFrontendUrl(url);
            
            return ResponseUtil.success(reply, { 
                message: 'Frontend URL registered successfully',
                url 
            });
        } catch (error: any) {
            if (error.name === 'ZodError') {
                return ResponseUtil.error(reply, 'Invalid URL format', 400);
            }
            return ResponseUtil.error(reply, error.message, 500);
        }
    };

    /**
     * Get the current frontend URL
     */
    getFrontendUrl = async (_request: FastifyRequest, reply: FastifyReply) => {
        try {
            const defaultUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
            const url = await this.configService.getFrontendUrl(defaultUrl);
            
            return ResponseUtil.success(reply, { url });
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 500);
        }
    };
}
