/**
 * Filter Options Controller
 * Handles HTTP requests for filter options
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { filterOptionsService } from '../services/filter-options.service';
import { logger } from '@utils/common/logger.util';
import { ResponseUtil } from '@utils/formatting/response.util';

export class FilterOptionsController {
  /**
   * GET /api/filter-options/branches
   */
  async getBranches(request: FastifyRequest, reply: FastifyReply) {
    try {
      const branches = await filterOptionsService.getBranches();
      return reply.send(branches);
    } catch (error: any) {
      logger.error({ error }, 'Error in getBranches');
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดข้อมูลสาขาได้', 500, 'LOAD_ERROR');
    }
  }

  /**
   * GET /api/filter-options/regions
   */
  async getRegions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const regions = await filterOptionsService.getRegions();
      return reply.send(regions);
    } catch (error: any) {
      logger.error({ error }, 'Error in getRegions');
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดข้อมูลภูมิภาคได้', 500, 'LOAD_ERROR');
    }
  }

  /**
   * GET /api/filter-options/zones
   */
  async getZones(
    request: FastifyRequest<{ Querystring: { region?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { region } = request.query;
      const zones = await filterOptionsService.getZones(region);
      return reply.send(zones);
    } catch (error: any) {
      logger.error({ error }, 'Error in getZones');
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดข้อมูลโซนได้', 500, 'LOAD_ERROR');
    }
  }

  /**
   * GET /api/filter-options/years
   */
  async getYears(request: FastifyRequest, reply: FastifyReply) {
    try {
      const years = await filterOptionsService.getAvailableYears();
      return reply.send(years);
    } catch (error: any) {
      logger.error({ error }, 'Error in getYears');
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดข้อมูลปีได้', 500, 'LOAD_ERROR');
    }
  }
}

export const filterOptionsController = new FilterOptionsController();
