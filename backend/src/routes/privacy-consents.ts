import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { privacyConsentService } from '../modules/customers/services/privacy-consent.service';

interface CreateConsentBody {
  customerId: string;
  consentType: string;
  consentVersion: string;
  consentText: string;
  granted: boolean;
  ipAddress?: string;
  userAgent?: string;
}

interface UpdateConsentBody {
  granted: boolean;
  revokedReason?: string;
}

interface ConsentParams {
  id: string;
}

interface CustomerParams {
  customerId: string;
}

interface ConsentQuery {
  consentType?: string;
}

export default async function privacyConsentRoutes(fastify: FastifyInstance) {
  // Create new consent
  fastify.post<{ Body: CreateConsentBody }>(
    '/privacy-consents',
    async (request: FastifyRequest<{ Body: CreateConsentBody }>, reply: FastifyReply) => {
      try {
        const consent = await privacyConsentService.createConsent(request.body);
        return reply.code(201).send(consent);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to create consent' });
      }
    }
  );

  // Get customer consents
  fastify.get<{ Params: CustomerParams }>(
    '/privacy-consents/customer/:customerId',
    async (request: FastifyRequest<{ Params: CustomerParams }>, reply: FastifyReply) => {
      try {
        const consents = await privacyConsentService.getCustomerConsents(request.params.customerId);
        return reply.send(consents);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch consents' });
      }
    }
  );

  // Get consent history
  fastify.get<{ Params: CustomerParams; Querystring: ConsentQuery }>(
    '/privacy-consents/customer/:customerId/history',
    async (request: FastifyRequest<{ Params: CustomerParams; Querystring: ConsentQuery }>, reply: FastifyReply) => {
      try {
        const { customerId } = request.params;
        const { consentType } = request.query;
        const history = await privacyConsentService.getConsentHistory(customerId, consentType);
        return reply.send(history);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to fetch consent history' });
      }
    }
  );

  // Check if customer has consent
  fastify.get<{ Params: CustomerParams; Querystring: ConsentQuery }>(
    '/privacy-consents/customer/:customerId/check',
    async (request: FastifyRequest<{ Params: CustomerParams; Querystring: ConsentQuery }>, reply: FastifyReply) => {
      try {
        const { customerId } = request.params;
        const { consentType } = request.query;
        
        if (!consentType) {
          return reply.code(400).send({ error: 'consentType is required' });
        }

        const hasConsent = await privacyConsentService.hasConsent(customerId, consentType);
        return reply.send({ hasConsent });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to check consent' });
      }
    }
  );

  // Update consent
  fastify.put<{ Params: ConsentParams; Body: UpdateConsentBody }>(
    '/privacy-consents/:id',
    async (request: FastifyRequest<{ Params: ConsentParams; Body: UpdateConsentBody }>, reply: FastifyReply) => {
      try {
        const consent = await privacyConsentService.updateConsent(
          request.params.id,
          request.body
        );
        return reply.send(consent);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to update consent' });
      }
    }
  );

  // Revoke consent
  fastify.post<{ Params: ConsentParams; Body: { reason?: string } }>(
    '/privacy-consents/:id/revoke',
    async (request: FastifyRequest<{ Params: ConsentParams; Body: { reason?: string } }>, reply: FastifyReply) => {
      try {
        const consent = await privacyConsentService.revokeConsent(
          request.params.id,
          request.body.reason
        );
        return reply.send(consent);
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to revoke consent' });
      }
    }
  );

  // Get consent statistics
  fastify.get('/privacy-consents/stats', async (_request, reply) => {
    try {
      const stats = await privacyConsentService.getConsentStats();
      return reply.send(stats);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to fetch consent stats' });
    }
  });

  // Bulk create consents
  fastify.post<{ Body: { customerId: string; consents: any[] } }>(
    '/privacy-consents/bulk',
    async (request: FastifyRequest<{ Body: { customerId: string; consents: any[] } }>, reply: FastifyReply) => {
      try {
        const { customerId, consents } = request.body;
        await privacyConsentService.createBulkConsents(customerId, consents);
        return reply.code(201).send({ message: 'Consents created successfully' });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Failed to create bulk consents' });
      }
    }
  );
}
