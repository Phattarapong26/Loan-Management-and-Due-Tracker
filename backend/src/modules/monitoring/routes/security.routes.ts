import { FastifyInstance } from 'fastify';
import { SecurityController } from '../controllers/security.controller';
import { authenticate, authorize } from '../../../core/middleware/security/auth.middleware';

export async function securityRoutes(fastify: FastifyInstance) {
    const controller = new SecurityController();

    // ต้อง authenticate และเป็น ADMIN หรือ MANAGER เท่านั้น
    const adminOnly = { preHandler: [authenticate, authorize('ADMIN', 'MANAGER')] };

    // Security Events
    fastify.get('/security/events', adminOnly, controller.getSecurityEvents as any);

    // Security Alerts
    fastify.get('/security/alerts', adminOnly, controller.getSecurityAlerts as any);
    fastify.patch('/security/alerts/:id', adminOnly, controller.updateAlertStatus as any);

    // Security Dashboard
    fastify.get('/security/dashboard', adminOnly, controller.getSecurityDashboard as any);

    // Suspicious IPs
    fastify.get('/security/suspicious-ips', adminOnly, controller.getSuspiciousIPs as any);

    // IP Blocking
    fastify.post('/security/block-ip', adminOnly, controller.blockIP as any);
    fastify.delete('/security/unblock-ip/:ipAddress', adminOnly, controller.unblockIP as any);
    fastify.get('/security/blocked-ips', adminOnly, controller.getBlockedIPs as any);

    // Manual cleanup (admin only)
    fastify.post('/security/cleanup', adminOnly, controller.cleanupOldEvents as any);

    // 🆕 Advanced Threat Detection
    fastify.get('/security/detect/anomalous-ips', adminOnly, controller.detectAnomalousIPs as any);
    fastify.get('/security/detect/off-hours', adminOnly, controller.detectOffHoursActivity as any);
    fastify.get('/security/detect/mass-access', adminOnly, controller.detectMassDataAccess as any);
    fastify.get('/security/detect/brute-force', adminOnly, controller.detectBruteForce as any);

    // 🆕 Auto-blocking
    fastify.post('/security/auto-block', adminOnly, controller.autoBlockIP as any);

    // 🆕 Comprehensive Security Report
    fastify.get('/security/report', adminOnly, controller.getSecurityReport as any);
}
