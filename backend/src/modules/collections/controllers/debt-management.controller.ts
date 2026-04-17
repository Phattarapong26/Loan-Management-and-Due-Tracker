/**
 * Debt Management Controller
 * Handles HTTP requests for debt management analytics
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { debtManagementService } from '../services/debt-management.service';
import { DebtManagementQuery } from '../models/debt-management.model';
import { ResponseUtil } from '@utils/formatting/response.util';
import { logger } from '@utils/common/logger.util';

export class DebtManagementController {
  /**
   * GET /api/debt-management/summary
   * Get comprehensive debt management summary
   */
  async getSummary(
    request: FastifyRequest<{ Querystring: DebtManagementQuery }>,
    reply: FastifyReply
  ) {
    try {
      const query = request.query;
      const result = await debtManagementService.getDebtManagementSummary(query);
      return ResponseUtil.success(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Error in getSummary');
      return ResponseUtil.error(reply, error.message, 500);
    }
  }

  /**
   * GET /api/debt-management/contract-size-distribution
   * Get detailed contract size distribution
   */
  async getContractSizeDistribution(
    request: FastifyRequest<{ Querystring: DebtManagementQuery }>,
    reply: FastifyReply
  ) {
    try {
      const query = request.query;
      const result = await debtManagementService.getContractSizeDistribution(query);
      return ResponseUtil.success(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Error in getContractSizeDistribution');
      return ResponseUtil.error(reply, error.message, 500);
    }
  }

  /**
   * GET /api/debt-management/loan-type-distribution
   * Get loan type distribution by product
   */
  async getLoanTypeDistribution(
    request: FastifyRequest<{ Querystring: DebtManagementQuery }>,
    reply: FastifyReply
  ) {
    try {
      const query = request.query;
      const result = await debtManagementService.getLoanTypeDistribution(query);
      return ResponseUtil.success(reply, result);
    } catch (error: any) {
      logger.error({ error }, 'Error in getLoanTypeDistribution');
      return ResponseUtil.error(reply, error.message, 500);
    }
  }
}

export const debtManagementController = new DebtManagementController();
