/**
 * Thai Address Controller
 * Handles HTTP requests for Thai address data
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { thaiAddressService } from '../services/thai-address.service';
import { logger } from '@utils/common/logger.util';
import { ResponseUtil } from '@utils/formatting/response.util';

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
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดข้อมูลจังหวัดได้', 500, 'LOAD_ERROR');
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
        return ResponseUtil.error(reply, 'กรุณาระบุจังหวัด', 400, 'REQUIRED_FIELD');
      }

      const districts = thaiAddressService.getDistrictsByProvinceName(province);
      return reply.send(districts);
    } catch (error: any) {
      logger.error({ error }, 'Error in getDistricts');
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดข้อมูลอำเภอ/เขตได้', 500, 'LOAD_ERROR');
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
        return ResponseUtil.error(reply, 'กรุณาระบุจังหวัดและอำเภอ/เขต', 400, 'REQUIRED_FIELD');
      }

      const subdistricts = thaiAddressService.getSubdistrictsByDistrictName(district, province);
      return reply.send(subdistricts);
    } catch (error: any) {
      logger.error({ error }, 'Error in getSubdistricts');
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดข้อมูลตำบล/แขวงได้', 500, 'LOAD_ERROR');
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
        return ResponseUtil.error(
          reply, 
          'กรุณาระบุจังหวัด อำเภอ/เขต และตำบล/แขวง', 
          400, 
          'REQUIRED_FIELD'
        );
      }

      const postalCode = thaiAddressService.getPostalCode(subdistrict, district, province);
      
      if (!postalCode) {
        return ResponseUtil.notFound(reply, 'ไม่พบรหัสไปรษณีย์');
      }

      return reply.send({ postalCode });
    } catch (error: any) {
      logger.error({ error }, 'Error in getPostalCode');
      return ResponseUtil.error(reply, 'ไม่สามารถค้นหารหัสไปรษณีย์ได้', 500, 'LOAD_ERROR');
    }
  }
}

export const thaiAddressController = new ThaiAddressController();
