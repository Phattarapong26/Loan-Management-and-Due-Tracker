/**
 * Business Profile Routes
 * 
 * API endpoints for managing customer business profiles
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { 
  saveBusinessProfile, 
  getLatestBusinessProfile,
  getBusinessProfileVersions,
  updateProfileReviewStatus 
} from '../modules/customers/services/business-profile.service';
import type { ParsedBusinessProfile } from '../modules/customers/types/business-profile.types';

interface CreateProfileBody {
  customerId: string;
  parsedData: ParsedBusinessProfile;
  documentId?: string;
  action: 'create' | 'link';
  existingCustomerId?: string;
}

interface UpdateReviewBody {
  reviewStatus: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';
  reviewedBy: string;
  reviewNotes?: string;
}

interface CustomerIdParams {
  customerId: string;
}

interface ProfileIdParams {
  id: string;
}

export async function businessProfileRoutes(fastify: FastifyInstance) {
  /**
   * POST /business-profiles
   * Create a new business profile
   */
  fastify.post<{ Body: CreateProfileBody }>(
    '/business-profiles',
    async (request: FastifyRequest<{ Body: CreateProfileBody }>, reply: FastifyReply) => {
      try {
        // console.log('[BusinessProfile] Create request received:', {
        //   customerId: request.body.customerId,
        //   action: request.body.action,
        //   documentId: request.body.documentId,
        //   existingCustomerId: request.body.existingCustomerId,
        //   hasParsedData: !!request.body.parsedData,
        // });

        const { customerId, parsedData, documentId, action, existingCustomerId } = request.body;

        if (!customerId || !parsedData) {
          // console.error('[BusinessProfile] Missing required fields:', { customerId: !!customerId, parsedData: !!parsedData });
          return reply.status(400).send({
            success: false,
            error: 'Missing required fields: customerId, parsedData',
          });
        }

        if (action === 'link' && !existingCustomerId) {
          // console.error('[BusinessProfile] Missing existingCustomerId for link action');
          return reply.status(400).send({
            success: false,
            error: 'existingCustomerId is required when action is "link"',
          });
        }

        // console.log('[BusinessProfile] Calling saveBusinessProfile...');
        const profile = await saveBusinessProfile({
          customerId: action === 'link' ? (existingCustomerId || customerId) : customerId,
          parsedData: parsedData as ParsedBusinessProfile,
          documentId,
          action: action || 'create',
          existingCustomerId,
        });

        // console.log('[BusinessProfile] Profile saved successfully:', profile.id);
        return reply.send({
          success: true,
          data: profile,
        });
      } catch (error) {
        // console.error('[BusinessProfile] Create error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create business profile',
        });
      }
    }
  );

  /**
   * GET /business-profiles/:customerId
   * Get latest business profile for customer
   */
  fastify.get<{ Params: CustomerIdParams }>(
    '/business-profiles/:customerId',
    async (request: FastifyRequest<{ Params: CustomerIdParams }>, reply: FastifyReply) => {
      try {
        const { customerId } = request.params;

        const profile = await getLatestBusinessProfile(customerId);

        if (!profile) {
          return reply.status(404).send({
            success: false,
            error: 'Business profile not found',
          });
        }

        return reply.send({
          success: true,
          data: profile,
        });
      } catch (error) {
        // console.error('[BusinessProfile] Get error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get business profile',
        });
      }
    }
  );

  /**
   * GET /business-profiles/:customerId/versions
   * Get all versions of business profile for customer
   */
  fastify.get<{ Params: CustomerIdParams }>(
    '/business-profiles/:customerId/versions',
    async (request: FastifyRequest<{ Params: CustomerIdParams }>, reply: FastifyReply) => {
      try {
        const { customerId } = request.params;

        const versions = await getBusinessProfileVersions(customerId);

        return reply.send({
          success: true,
          data: versions,
        });
      } catch (error) {
        // console.error('[BusinessProfile] Get versions error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get profile versions',
        });
      }
    }
  );

  /**
   * PATCH /business-profiles/:id/review
   * Update profile review status
   */
  fastify.patch<{ Params: ProfileIdParams; Body: UpdateReviewBody }>(
    '/business-profiles/:id/review',
    async (request: FastifyRequest<{ Params: ProfileIdParams; Body: UpdateReviewBody }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const { reviewStatus, reviewedBy, reviewNotes } = request.body;

        if (!reviewStatus || !reviewedBy) {
          return reply.status(400).send({
            success: false,
            error: 'Missing required fields: reviewStatus, reviewedBy',
          });
        }

        if (!['APPROVED', 'REJECTED', 'NEEDS_REVISION'].includes(reviewStatus)) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid reviewStatus. Must be APPROVED, REJECTED, or NEEDS_REVISION',
          });
        }

        await updateProfileReviewStatus(id, reviewStatus, reviewedBy, reviewNotes);

        return reply.send({
          success: true,
          message: 'Review status updated successfully',
        });
      } catch (error) {
        // console.error('[BusinessProfile] Update review error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update review status',
        });
      }
    }
  );

  /**
   * PUT /business-profiles/:id
   * Update business profile data
   */
  fastify.put<{ Params: ProfileIdParams; Body: { parsedData: ParsedBusinessProfile } }>(
    '/business-profiles/:id',
    async (request: FastifyRequest<{ Params: ProfileIdParams; Body: { parsedData: ParsedBusinessProfile } }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const { parsedData } = request.body;

        if (!parsedData) {
          return reply.status(400).send({
            success: false,
            error: 'Missing required field: parsedData',
          });
        }

        const { updateBusinessProfile } = await import('../modules/customers/services/business-profile.service');
        const profile = await updateBusinessProfile(id, parsedData);

        return reply.send({
          success: true,
          data: profile,
        });
      } catch (error) {
        // console.error('[BusinessProfile] Update error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update business profile',
        });
      }
    }
  );

  /**
   * DELETE /business-profiles/:id
   * Delete business profile
   */
  fastify.delete<{ Params: ProfileIdParams }>(
    '/business-profiles/:id',
    async (request: FastifyRequest<{ Params: ProfileIdParams }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;

        const { deleteBusinessProfile } = await import('../modules/customers/services/business-profile.service');
        await deleteBusinessProfile(id);

        return reply.send({
          success: true,
          message: 'Business profile deleted successfully',
        });
      } catch (error) {
        // console.error('[BusinessProfile] Delete error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete business profile',
        });
      }
    }
  );

  /**
   * GET /business-profiles/:id/shareholders
   * Get shareholders for a profile
   */
  fastify.get<{ Params: ProfileIdParams }>(
    '/business-profiles/:id/shareholders',
    async (request: FastifyRequest<{ Params: ProfileIdParams }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const { PrismaClient } = await import('@prisma/client');
        const client = new PrismaClient();

        const shareholders = await client.customerShareholder.findMany({
          where: { profileId: id },
          orderBy: { order: 'asc' },
        });

        await client.$disconnect();

        return reply.send({
          success: true,
          data: shareholders,
        });
      } catch (error) {
        // console.error('[BusinessProfile] Get shareholders error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get shareholders',
        });
      }
    }
  );

  /**
   * GET /business-profiles/:id/collaterals
   * Get collaterals for a profile
   */
  fastify.get<{ Params: ProfileIdParams }>(
    '/business-profiles/:id/collaterals',
    async (request: FastifyRequest<{ Params: ProfileIdParams }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const { PrismaClient } = await import('@prisma/client');
        const client = new PrismaClient();

        const collaterals = await client.customerCollateral.findMany({
          where: { profileId: id },
          orderBy: { order: 'asc' },
        });

        await client.$disconnect();

        return reply.send({
          success: true,
          data: collaterals,
        });
      } catch (error) {
        // console.error('[BusinessProfile] Get collaterals error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get collaterals',
        });
      }
    }
  );

  /**
   * GET /business-profiles/:id/dscr
   * Get DSCR analysis for a profile
   */
  fastify.get<{ Params: ProfileIdParams }>(
    '/business-profiles/:id/dscr',
    async (request: FastifyRequest<{ Params: ProfileIdParams }>, reply: FastifyReply) => {
      try {
        const { id } = request.params;
        const { PrismaClient } = await import('@prisma/client');
        const client = new PrismaClient();

        const dscrAnalysis = await client.customerDSCRAnalysis.findMany({
          where: { profileId: id },
          orderBy: { analysisYear: 'desc' },
        });

        await client.$disconnect();

        return reply.send({
          success: true,
          data: dscrAnalysis,
        });
      } catch (error) {
        // console.error('[BusinessProfile] Get DSCR error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get DSCR analysis',
        });
      }
    }
  );

  /**
   * GET /business-profiles/:customerId/stats
   * Get statistics for customer's business profiles
   */
  fastify.get<{ Params: CustomerIdParams }>(
    '/business-profiles/:customerId/stats',
    async (request: FastifyRequest<{ Params: CustomerIdParams }>, reply: FastifyReply) => {
      try {
        const { customerId } = request.params;
        const { PrismaClient } = await import('@prisma/client');
        const client = new PrismaClient();

        const [
          totalProfiles,
          latestProfile,
          shareholderCount,
          collateralCount,
          loanRequestCount,
        ] = await Promise.all([
          client.customerBusinessProfile.count({
            where: { customerId },
          }),
          client.customerBusinessProfile.findFirst({
            where: { customerId, isLatest: true },
            select: {
              id: true,
              version: true,
              status: true,
              reviewStatus: true,
              matchConfidence: true,
              createdAt: true,
            },
          }),
          client.customerShareholder.count({
            where: {
              profile: {
                customerId,
                isLatest: true,
              },
            },
          }),
          client.customerCollateral.count({
            where: {
              profile: {
                customerId,
                isLatest: true,
              },
            },
          }),
          client.customerLoanRequest.count({
            where: {
              profile: {
                customerId,
                isLatest: true,
              },
            },
          }),
        ]);

        await client.$disconnect();

        return reply.send({
          success: true,
          data: {
            totalProfiles,
            latestProfile,
            shareholderCount,
            collateralCount,
            loanRequestCount,
          },
        });
      } catch (error) {
        // console.error('[BusinessProfile] Get stats error:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get statistics',
        });
      }
    }
  );
}

export default businessProfileRoutes;

