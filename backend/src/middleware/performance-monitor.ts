/**
 * Performance Monitoring Middleware
 * Tracks request metrics for load testing and production monitoring
 */

import { FastifyRequest, FastifyReply } from 'fastify';

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  responseTimes: number[];
  endpointMetrics: Map<string, {
    count: number;
    totalTime: number;
    errors: number;
  }>;
  startTime: number;
}

const metrics: PerformanceMetrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  endpointMetrics: new Map(),
  startTime: Date.now(),
};

// Keep only last 1000 response times to prevent memory issues
const MAX_RESPONSE_TIMES = 1000;

export async function performanceMonitor(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const startTime = Date.now();
  const endpoint = `${request.method} ${request.url}`;

  // Track request
  metrics.totalRequests++;

  // Initialize endpoint metrics if not exists
  if (!metrics.endpointMetrics.has(endpoint)) {
    metrics.endpointMetrics.set(endpoint, {
      count: 0,
      totalTime: 0,
      errors: 0,
    });
  }

  const endpointMetric = metrics.endpointMetrics.get(endpoint)!;
  endpointMetric.count++;

  // Measure response time when request completes
  reply.raw.on('finish', () => {
    const responseTime = Date.now() - startTime;

    // Update metrics
    endpointMetric.totalTime += responseTime;

    if (reply.statusCode >= 200 && reply.statusCode < 400) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
      endpointMetric.errors++;
    }

    // Store response time (keep only last N)
    metrics.responseTimes.push(responseTime);
    if (metrics.responseTimes.length > MAX_RESPONSE_TIMES) {
      metrics.responseTimes.shift();
    }
  });

  // Add performance header
  reply.header('X-Response-Time-Start', startTime.toString());
}

export function getMetrics() {
  const uptime = (Date.now() - metrics.startTime) / 1000;
  const tps = metrics.totalRequests / uptime;
  const successRate = metrics.totalRequests > 0
    ? (metrics.successfulRequests / metrics.totalRequests) * 100
    : 0;

  // Calculate percentiles
  const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.50)] || 0;
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;
  const avg = sortedTimes.length > 0
    ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length
    : 0;

  // Top endpoints by request count
  const topEndpoints = Array.from(metrics.endpointMetrics.entries())
    .map(([endpoint, data]) => ({
      endpoint,
      count: data.count,
      avgTime: data.count > 0 ? data.totalTime / data.count : 0,
      errors: data.errors,
      errorRate: data.count > 0 ? (data.errors / data.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Slowest endpoints
  const slowestEndpoints = Array.from(metrics.endpointMetrics.entries())
    .map(([endpoint, data]) => ({
      endpoint,
      avgTime: data.count > 0 ? data.totalTime / data.count : 0,
      count: data.count,
    }))
    .filter(e => e.count > 10) // Only consider endpoints with significant traffic
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 10);

  return {
    summary: {
      uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      successRate: successRate.toFixed(2) + '%',
      tps: tps.toFixed(2),
      canHandle2000PerHour: tps >= 0.56 && successRate >= 99,
    },
    responseTimes: {
      avg: avg.toFixed(2) + 'ms',
      p50: p50.toFixed(2) + 'ms',
      p95: p95.toFixed(2) + 'ms',
      p99: p99.toFixed(2) + 'ms',
      min: sortedTimes[0]?.toFixed(2) + 'ms' || '0ms',
      max: sortedTimes[sortedTimes.length - 1]?.toFixed(2) + 'ms' || '0ms',
    },
    topEndpoints,
    slowestEndpoints,
    assessment: {
      throughput: tps >= 0.56 ? '✅ PASS' : '❌ FAIL',
      successRate: successRate >= 99 ? '✅ PASS' : '❌ FAIL',
      responseTime: p95 < 1000 ? '✅ PASS' : '❌ FAIL',
      overall: tps >= 0.56 && successRate >= 99 && p95 < 1000 ? '✅ PASS' : '❌ FAIL',
    },
  };
}

export function resetMetrics() {
  metrics.totalRequests = 0;
  metrics.successfulRequests = 0;
  metrics.failedRequests = 0;
  metrics.responseTimes = [];
  metrics.endpointMetrics.clear();
  metrics.startTime = Date.now();
}

// Export for use in routes
export const performanceMetrics = {
  getMetrics,
  resetMetrics,
};
