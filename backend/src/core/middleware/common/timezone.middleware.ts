/**
 * Timezone Middleware
 * Ensures all requests use Thailand timezone consistently
 * Reads client timezone from cookie (for CORS caching) with header fallback
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { TimezoneUtil } from '@utils/formatting/timezone.util';
import { logger } from '@utils/common/logger.util';

export interface TimezoneRequest extends FastifyRequest {
  timezone: {
    now: () => Date;
    format: (date: Date | string, format?: string) => string;
    toThailandTime: (date: Date | string) => Date;
    toUTC: (date: Date | string) => Date;
    isBusinessHours: () => boolean;
    startOfDay: (date?: Date) => Date;
    endOfDay: (date?: Date) => Date;
  };
  clientTimezone?: string; // Client's actual timezone for audit logging
}

/**
 * Middleware to inject timezone utilities into request object
 */
export async function timezoneMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Ensure process timezone is set
  if (process.env.TZ !== 'Asia/Bangkok') {
    process.env.TZ = 'Asia/Bangkok';
    logger.warn('Process timezone was not set to Asia/Bangkok, correcting...');
  }

  // ✅ Read client timezone from cookie (preferred) or header (fallback)
  // Cookie enables CORS preflight caching by removing custom header
  const clientTimezone = 
    request.cookies['client-timezone'] || 
    request.headers['x-client-timezone'] as string || 
    'Asia/Bangkok';

  // Store client timezone for audit logging
  (request as TimezoneRequest).clientTimezone = clientTimezone;

  // Inject timezone utilities into request
  (request as TimezoneRequest).timezone = {
    now: () => TimezoneUtil.now(),
    format: (date: Date | string, format?: string) => TimezoneUtil.format(date, format),
    toThailandTime: (date: Date | string) => TimezoneUtil.toThailandTime(date),
    toUTC: (date: Date | string) => TimezoneUtil.toUTC(date),
    isBusinessHours: () => TimezoneUtil.isBusinessHours(),
    startOfDay: (date?: Date) => TimezoneUtil.startOfDay(date),
    endOfDay: (date?: Date) => TimezoneUtil.endOfDay(date),
  };

  // Add timezone info to response headers
  reply.header('X-Server-Timezone', 'Asia/Bangkok');
  reply.header('X-Server-Time', TimezoneUtil.format(new Date()));
}

/**
 * Plugin to register timezone middleware globally
 */
export async function timezonePlugin(fastify: any) {
  fastify.addHook('preHandler', timezoneMiddleware);
  
  // Add timezone route for debugging
  fastify.get('/api/timezone', async (request: FastifyRequest, _reply: FastifyReply) => {
    const now = TimezoneUtil.now();
    const utcNow = new Date();
    const clientTimezone = (request as TimezoneRequest).clientTimezone;
    
    return {
      serverTimezone: 'Asia/Bangkok',
      processTimezone: process.env.TZ,
      clientTimezone, // From cookie or header
      currentTime: {
        thailand: TimezoneUtil.format(now),
        utc: utcNow.toISOString(),
        timestamp: now.getTime(),
      },
      businessHours: TimezoneUtil.isBusinessHours(),
      timezoneOffset: TimezoneUtil.getTimezoneOffset(),
    };
  });
}