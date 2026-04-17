/**
 * Monitoring Routes
 * 
 * Provides endpoints for monitoring application performance
 */

import { FastifyInstance } from 'fastify';
import { queryLogger } from '@/core/monitoring/query-logger';
import { isRedisAvailable } from '@/core/cache/redis.config';
import { prisma } from '@config/database.config';

export async function monitoringRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get('/health', async (request, reply) => {
    try {
      // Check database
      await prisma.$queryRaw`SELECT 1`;
      
      // Check Redis
      const redisAvailable = await isRedisAvailable();

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'up',
          redis: redisAvailable ? 'up' : 'down',
        },
      };
    } catch (error) {
      return reply.status(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Query statistics
  fastify.get('/monitoring/queries', async (request, reply) => {
    const stats = queryLogger.getStats();
    const slowQueries = queryLogger.getSlowQueries();

    return {
      stats,
      slowQueries: slowQueries.slice(0, 10), // Last 10 slow queries
    };
  });

  // Database statistics
  fastify.get('/monitoring/database', async (request, reply) => {
    try {
      // Get database size
      const dbSize = await prisma.$queryRaw<any[]>`
        SELECT 
          pg_size_pretty(pg_database_size(current_database())) as size
      `;

      // Get table sizes
      const tableSizes = await prisma.$queryRaw<any[]>`
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
          pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY size_bytes DESC
        LIMIT 10
      `;

      // Get connection count
      const connections = await prisma.$queryRaw<any[]>`
        SELECT count(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;

      return {
        databaseSize: dbSize[0]?.size,
        topTables: tableSizes,
        activeConnections: connections[0]?.count,
      };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Cache statistics
  fastify.get('/monitoring/cache', async (request, reply) => {
    try {
      const available = await isRedisAvailable();
      
      if (!available) {
        return {
          status: 'unavailable',
          message: 'Redis is not available',
        };
      }

      // Get Redis info (basic stats)
      return {
        status: 'available',
        message: 'Redis is running',
      };
    } catch (error) {
      return reply.status(500).send({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Clear query logs
  fastify.post('/monitoring/queries/clear', async (request, reply) => {
    queryLogger.clear();
    return { message: 'Query logs cleared' };
  });
}

