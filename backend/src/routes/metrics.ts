/**
 * Metrics API Routes
 * Provides real-time performance metrics
 */

import { FastifyInstance } from 'fastify';
import { performanceMetrics } from '../middleware/performance-monitor.js';

export async function metricsRoutes(fastify: FastifyInstance) {
  // Get current metrics
  fastify.get('/metrics', async (_request, reply) => {
    const metrics = performanceMetrics.getMetrics();
    return reply.send({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  });

  // Reset metrics (useful for testing)
  fastify.post('/metrics/reset', async (_request, reply) => {
    performanceMetrics.resetMetrics();
    return reply.send({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString(),
    });
  });

  // Health check with basic metrics
  fastify.get('/health', async (_request, reply) => {
    const metrics = performanceMetrics.getMetrics();
    
    return reply.send({
      status: 'healthy',
      uptime: metrics.summary.uptime,
      tps: metrics.summary.tps,
      successRate: metrics.summary.successRate,
      canHandle2000PerHour: metrics.summary.canHandle2000PerHour,
      timestamp: new Date().toISOString(),
    });
  });

  // Detailed performance report
  fastify.get('/metrics/report', async (_request, reply) => {
    const metrics = performanceMetrics.getMetrics();
    
    // Generate HTML report
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Performance Metrics - SME D BANK</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #00A950; border-bottom: 3px solid #00A950; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric-card { background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #00A950; }
    .metric-label { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 5px; }
    .metric-value { font-size: 24px; font-weight: bold; color: #333; }
    .pass { color: #00A950; }
    .fail { color: #E03131; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #00A950; color: white; font-weight: bold; }
    tr:hover { background: #f5f5f5; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .badge-success { background: #E6F6EE; color: #00A950; }
    .badge-danger { background: #FFF0F0; color: #E03131; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏦 SME D BANK - Performance Metrics</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleString('th-TH')}</p>
    
    <h2>📊 Summary</h2>
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Uptime</div>
        <div class="metric-value">${metrics.summary.uptime}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Total Requests</div>
        <div class="metric-value">${metrics.summary.totalRequests.toLocaleString()}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Success Rate</div>
        <div class="metric-value ${parseFloat(metrics.summary.successRate) >= 99 ? 'pass' : 'fail'}">${metrics.summary.successRate}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">TPS (Transactions/sec)</div>
        <div class="metric-value ${parseFloat(metrics.summary.tps) >= 0.56 ? 'pass' : 'fail'}">${metrics.summary.tps}</div>
      </div>
    </div>

    <h2>⏱️ Response Times</h2>
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Average</div>
        <div class="metric-value">${metrics.responseTimes.avg}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Median (P50)</div>
        <div class="metric-value">${metrics.responseTimes.p50}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">P95</div>
        <div class="metric-value">${metrics.responseTimes.p95}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">P99</div>
        <div class="metric-value">${metrics.responseTimes.p99}</div>
      </div>
    </div>

    <h2>🎯 Performance Assessment</h2>
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Throughput (≥0.56 TPS)</div>
        <div class="metric-value">${metrics.assessment.throughput}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Success Rate (≥99%)</div>
        <div class="metric-value">${metrics.assessment.successRate}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Response Time (P95 <1s)</div>
        <div class="metric-value">${metrics.assessment.responseTime}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Overall</div>
        <div class="metric-value">${metrics.assessment.overall}</div>
      </div>
    </div>

    <h2>📈 Top Endpoints by Traffic</h2>
    <table>
      <thead>
        <tr>
          <th>Endpoint</th>
          <th>Requests</th>
          <th>Avg Time</th>
          <th>Errors</th>
          <th>Error Rate</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.topEndpoints.map(e => `
          <tr>
            <td><code>${e.endpoint}</code></td>
            <td>${e.count.toLocaleString()}</td>
            <td>${e.avgTime.toFixed(2)}ms</td>
            <td>${e.errors}</td>
            <td><span class="badge ${e.errorRate < 1 ? 'badge-success' : 'badge-danger'}">${e.errorRate.toFixed(2)}%</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>🐌 Slowest Endpoints</h2>
    <table>
      <thead>
        <tr>
          <th>Endpoint</th>
          <th>Avg Response Time</th>
          <th>Request Count</th>
        </tr>
      </thead>
      <tbody>
        ${metrics.slowestEndpoints.map(e => `
          <tr>
            <td><code>${e.endpoint}</code></td>
            <td><span class="badge ${e.avgTime < 500 ? 'badge-success' : 'badge-danger'}">${e.avgTime.toFixed(2)}ms</span></td>
            <td>${e.count.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>💡 Can Handle 2000 Transactions/Hour?</h2>
    <div style="padding: 20px; background: ${metrics.summary.canHandle2000PerHour ? '#E6F6EE' : '#FFF0F0'}; border-radius: 8px; border-left: 4px solid ${metrics.summary.canHandle2000PerHour ? '#00A950' : '#E03131'};">
      <h3 style="margin-top: 0; color: ${metrics.summary.canHandle2000PerHour ? '#00A950' : '#E03131'};">
        ${metrics.summary.canHandle2000PerHour ? '✅ YES - System is performing well!' : '❌ NO - Performance improvements needed'}
      </h3>
      <p>
        ${metrics.summary.canHandle2000PerHour 
          ? 'The system is currently meeting all performance targets for handling 2000 transactions per hour.'
          : 'The system is not meeting performance targets. Review the metrics above and implement optimizations.'}
      </p>
    </div>
  </div>
</body>
</html>
    `;
    
    return reply.type('text/html').send(html);
  });
}
