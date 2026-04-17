import { FastifyInstance } from 'fastify';
import { prisma } from '@config/database.config';
import * as os from 'os';
import * as fs from 'fs';

/**
 * Health Check Routes
 */

interface DependencyStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency?: number;
    message?: string;
    details?: Record<string, unknown>;
}

interface HealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    checks: {
        database: DependencyStatus;
        redis: DependencyStatus;
        queue: DependencyStatus;
        disk: DependencyStatus;
        memory: DependencyStatus;
    };
}

async function checkDatabase(): Promise<DependencyStatus> {
    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - start;

        if (latency > 1000) {
            return { status: 'degraded', latency, message: 'Database response is slow' };
        }

        return { status: 'healthy', latency, message: 'Database is reachable' };
    } catch (err) {
        return {
            status: 'unhealthy',
            message: err instanceof Error ? err.message : 'Database check failed',
        };
    }
}

async function checkRedis(): Promise<DependencyStatus> {
    // Skip Redis check when no host is configured (optional dependency)
    if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
        return { status: 'healthy', message: 'Redis not configured — skipped' };
    }

    try {
        // Dynamically import to avoid crashing when Redis is unavailable at startup
        const { default: redis } = await import('@config/redis.config');
        const start = Date.now();
        await redis.ping();
        const latency = Date.now() - start;

        if (latency > 1000) {
            return { status: 'degraded', latency, message: 'Redis response is slow' };
        }

        return { status: 'healthy', latency, message: 'Redis is reachable' };
    } catch (err) {
        // Redis is treated as non-critical — degrade rather than mark unhealthy
        return {
            status: 'degraded',
            message: err instanceof Error ? err.message : 'Redis check failed',
        };
    }
}

function overallStatus(checks: HealthResponse['checks']): HealthResponse['status'] {
    const statuses = Object.values(checks).map((c) => c.status);
    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
}

async function checkQueue(): Promise<DependencyStatus> {
    try {
        // Check if Redis (used as queue backend) is reachable
        if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
            return { status: 'healthy', message: 'Queue not configured — skipped' };
        }
        const { default: redis } = await import('@config/redis.config');
        const queueLength = await redis.llen('bull:jobs:waiting').catch(() => 0);
        return {
            status: 'healthy',
            message: 'Job queue is operational',
            details: { pendingJobs: queueLength },
        };
    } catch (err) {
        return {
            status: 'degraded',
            message: err instanceof Error ? err.message : 'Queue check failed',
        };
    }
}

async function checkDisk(): Promise<DependencyStatus> {
    try {
        const uploadPath = process.env.UPLOAD_PATH || '/app/uploads';
        const rootPath = '/';

        // Check if path is accessible
        let accessible = true;
        try { fs.accessSync(uploadPath); } catch { accessible = false; }

        // Get disk stats from /proc/mounts or fallback
        let usedPercent = 0;
        let freeGB = 0;
        let totalGB = 0;

        try {
            const stats = fs.statfsSync(rootPath);
            totalGB = (stats.blocks * stats.bsize) / (1024 ** 3);
            freeGB = (stats.bfree * stats.bsize) / (1024 ** 3);
            usedPercent = Math.round(((totalGB - freeGB) / totalGB) * 100);
        } catch {
            // statfsSync not available — estimate from os
            usedPercent = 50; // safe default
        }

        const status = usedPercent >= 90 ? 'degraded' : 'healthy';
        return {
            status,
            message: accessible ? `Disk usage: ${usedPercent}%` : 'Upload path not accessible',
            details: {
                usedPercent,
                freeGB: Math.round(freeGB * 10) / 10,
                totalGB: Math.round(totalGB * 10) / 10,
                uploadPathAccessible: accessible,
            },
        };
    } catch (err) {
        return {
            status: 'degraded',
            message: err instanceof Error ? err.message : 'Disk check failed',
        };
    }
}

async function checkMemory(): Promise<DependencyStatus> {
    try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const usedPercent = Math.round((usedMem / totalMem) * 100);

        // Also check Node.js heap
        const heapUsed = process.memoryUsage().heapUsed;
        const heapTotal = process.memoryUsage().heapTotal;
        const heapPercent = Math.round((heapUsed / heapTotal) * 100);

        const status = usedPercent >= 90 ? 'degraded' : 'healthy';
        return {
            status,
            message: `Memory usage: ${usedPercent}%`,
            details: {
                usedPercent,
                usedMB: Math.round(usedMem / (1024 ** 2)),
                totalMB: Math.round(totalMem / (1024 ** 2)),
                freeMB: Math.round(freeMem / (1024 ** 2)),
                heapUsedMB: Math.round(heapUsed / (1024 ** 2)),
                heapPercent,
            },
        };
    } catch (err) {
        return {
            status: 'degraded',
            message: err instanceof Error ? err.message : 'Memory check failed',
        };
    }
}

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
    /**
     * GET /health
     *
     * Comprehensive health check used by Railway's deployment probe.
     * Always returns HTTP 200 — status details are in the JSON body.
     * Returning a non-200 here would cause Railway to mark the replica
     * as unhealthy and restart it in a loop.
     */
    fastify.get('/health', async (_request, reply) => {
        const [database, redis, queue, disk, memory] = await Promise.all([
            checkDatabase(),
            checkRedis(),
            checkQueue(),
            checkDisk(),
            checkMemory(),
        ]);

        const checks = { database, redis, queue, disk, memory };
        const body: HealthResponse = {
            status: overallStatus(checks),
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks,
        };

        return reply.code(200).send(body);
    });

    /**
     * GET /health/ready
     *
     * Readiness probe — returns 200 only when the database is reachable.
     * Used by orchestrators to decide whether to route traffic here.
     */
    fastify.get('/health/ready', async (_request, reply) => {
        const database = await checkDatabase();
        const isReady = database.status !== 'unhealthy';

        return reply.code(isReady ? 200 : 503).send({
            status: isReady ? 'ready' : 'not ready',
            timestamp: new Date().toISOString(),
            database,
        });
    });

    /**
     * GET /health/live
     *
     * Liveness probe — confirms the process is alive and the event loop
     * is not blocked. No external I/O; always returns 200.
     */
    fastify.get('/health/live', async (_request, reply) => {
        return reply.code(200).send({
            status: 'alive',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    });
}
