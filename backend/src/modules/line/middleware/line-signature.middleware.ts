import { FastifyRequest, FastifyReply } from 'fastify';
import { LineWebhookService } from '@line/services/core/line-webhook.service';

/**
 * LINE Webhook Signature Verification Middleware
 * 
 * This middleware verifies the authenticity of incoming webhook requests from LINE Platform
 * by validating the x-line-signature header using HMAC-SHA256.
 * 
 * Security Features:
 * - Validates webhook signature using LINE Channel Secret
 * - Returns 401 Unauthorized for invalid signatures
 * - Logs security alerts for failed verifications
 * - Prevents unauthorized webhook requests
 * 
 * Requirements: 2, 5, 19
 */
export const verifyLineSignature = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        // Extract the x-line-signature header
        const signature = request.headers['x-line-signature'] as string;

        if (!signature) {
            console.error('LINE webhook signature verification failed - no signature provided', {
                timestamp: new Date().toISOString(),
                ip: request.ip,
                path: request.url,
                alert: 'SECURITY_ALERT: Webhook request without signature'
            });
            return reply.status(401).send({
                success: false,
                error: 'Missing signature header'
            });
        }

        // Get the raw request body as string
        // Fastify provides the raw body through request.body after JSON parsing
        // We need to stringify it back for signature verification
        const rawBody = JSON.stringify(request.body);

        // Create webhook service instance and verify signature
        const webhookService = new LineWebhookService();
        const isValidSignature = webhookService.verifySignature(rawBody, signature);

        if (!isValidSignature) {
            // Log security alert for failed verification
            console.error('LINE webhook signature verification failed - invalid signature', {
                timestamp: new Date().toISOString(),
                ip: request.ip,
                path: request.url,
                userAgent: request.headers['user-agent'],
                alert: 'SECURITY_ALERT: Invalid webhook signature detected - possible unauthorized access attempt'
            });

            return reply.status(401).send({
                success: false,
                error: 'Invalid signature'
            });
        }

        // Signature is valid - allow the request to proceed
        // No need to call next() in Fastify, just return without sending a response
    } catch (error) {
        console.error('Error during LINE webhook signature verification:', {
            error,
            timestamp: new Date().toISOString(),
            ip: request.ip,
            alert: 'SECURITY_ALERT: Exception during signature verification'
        });

        return reply.status(401).send({
            success: false,
            error: 'Signature verification failed'
        });
    }
};
