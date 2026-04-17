/**
 * Thai Address Controller
 * Handles HTTP requests for Thai address data
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { thaiAddressService } from '../services/thai-address.service';
import { logger } from '@utils/common/logger.util';

export class ThaiAddressController {
  /**
   * GET /api/thai-address/provinces
   * Get all provinces
   */
  async getProvinces(request: FastifyRequest, reply: FastifyReply) {
    try {
      const provinces = thaiAddressService.getProvinces();
      return reply.send(provinces);
    } catch (error: any) {
      logger.error({ error }, 'Error in getProvinces');
      return reply.code(500).send({ error: error.message });
    }
  }

  /**
   * GET /api/thai-address/districts?province=xxx
   * Get districts by province name
   */
  async getDistricts(
    request: FastifyRequest<{ Querystring: { province?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { province } = request.query;
      
      if (!province) {
        return reply.code(400).send({ error: 'Province parameter is required' });
      }

      const districts = thaiAddressService.getDistrictsByProvinceName(province);
      return reply.send(districts);
    } catch (error: any) {
      logger.error({ error }, 'Error in getDistricts');
      return reply.code(500).send({ error: error.message });
    }
  }

  /**
   * GET /api/thai-address/subdistricts?province=xxx&district=xxx
   * Get subdistricts by province and district name
   */
  async getSubdistricts(
    request: FastifyRequest<{ Querystring: { province?: string; district?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { province, district } = request.query;
      
      if (!province || !district) {
        return reply.code(400).send({ error: 'Province and district parameters are required' });
      }

      const subdistricts = thaiAddressService.getSubdistrictsByDistrictName(district, province);
      return reply.send(subdistricts);
    } catch (error: any) {
      logger.error({ error }, 'Error in getSubdistricts');
      return reply.code(500).send({ error: error.message });
    }
  }

  /**
   * GET /api/thai-address/postal-code?province=xxx&district=xxx&subdistrict=xxx
   * Get postal code
   */
  async getPostalCode(
    request: FastifyRequest<{ 
      Querystring: { province?: string; district?: string; subdistrict?: string } 
    }>,
    reply: FastifyReply
  ) {
    try {
      const { province, district, subdistrict } = request.query;
      
      if (!province || !district || !subdistrict) {
        return reply.code(400).send({ 
          error: 'Province, district, and subdistrict parameters are required' 
        });
      }

      const postalCode = thaiAddressService.getPostalCode(subdistrict, district, province);
      
      if (!postalCode) {
        return reply.code(404).send({ error: 'Postal code not found' });
      }

      return reply.send({ postalCode });
    } catch (error: any) {
      logger.error({ error }, 'Error in getPostalCode');
      return reply.code(500).send({ error: error.message });
    }
  }
}

export const thaiAddressController = new ThaiAddressController();
