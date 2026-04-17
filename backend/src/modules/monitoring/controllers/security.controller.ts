// @ts-nocheck
import { FastifyRequest, FastifyReply } from 'fastify';
import { SecurityMonitorService, ThreatType, ThreatSeverity } from '../services/security-monitor.service';
import { ResponseUtil } from '../../../core/utils/formatting/response.util';

export class SecurityController {
    private securityMonitor: SecurityMonitorService;

    constructor() {
        this.securityMonitor = new SecurityMonitorService();
    }

    /**
     * ดึง security events
     */
    getSecurityEvents = async (
        request: FastifyRequest<{
            Querystring: {
                page?: string;
                limit?: string;
                threatType?: ThreatType;
                severity?: ThreatSeverity;
                ipAddress?: string;
                userId?: string;
                startDate?: string;
                endDate?: string;
                blocked?: string;
            };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { page, limit, threatType, severity, ipAddress, userId, startDate, endDate, blocked } = request.query;

            const result = await this.securityMonitor.getSecurityEvents({
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                threatType,
                severity,
                ipAddress,
                userId,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                blocked: blocked ? blocked === 'true' : undefined
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * ดึง security alerts
     */
    getSecurityAlerts = async (
        request: FastifyRequest<{
            Querystring: {
                page?: string;
                limit?: string;
                status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
                severity?: ThreatSeverity;
            };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { page, limit, status, severity } = request.query;

            const result = await this.securityMonitor.getSecurityAlerts({
                page: page ? parseInt(page) : undefined,
                limit: limit ? parseInt(limit) : undefined,
                status,
                severity
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * อัพเดทสถานะ alert
     */
    updateAlertStatus = async (
        request: FastifyRequest<{
            Params: { id: string };
            Body: {
                status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
                notes?: string;
            };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { id } = request.params;
            const { status, notes } = request.body;

            const result = await this.securityMonitor.updateAlertStatus(id, status, notes);

            return ResponseUtil.success(reply, result, 'Alert status updated successfully');
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * ดึง security dashboard
     */
    getSecurityDashboard = async (
        request: FastifyRequest<{
            Querystring: { hours?: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const hours = request.query.hours ? parseInt(request.query.hours) : 24;
            const result = await this.securityMonitor.getSecurityDashboard(hours);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * ดึง suspicious IPs
     */
    getSuspiciousIPs = async (
        request: FastifyRequest<{
            Querystring: { threshold?: string; hours?: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const threshold = request.query.threshold ? parseInt(request.query.threshold) : 50;
            const hours = request.query.hours ? parseInt(request.query.hours) : 1;

            const result = await this.securityMonitor.getSuspiciousIPs(threshold, hours);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Block IP (Manual)
     */
    blockIP = async (
        request: FastifyRequest<{
            Body: {
                ipAddress: string;
                reason: string;
                duration?: number; // minutes
            };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { ipAddress, reason, duration } = request.body;
            const user = (request as any).user;

            // Use autoBlockIP if duration is provided, otherwise permanent block
            if (duration) {
                await this.securityMonitor.autoBlockIP(ipAddress, `[MANUAL] ${reason}`, duration);
            } else {
                await this.securityMonitor.blockIP(ipAddress, `[MANUAL] ${reason}`, user?.id);
            }

            return ResponseUtil.success(
                reply, 
                null, 
                `IP ${ipAddress} blocked successfully ${duration ? `for ${duration} minutes` : 'permanently'}`
            );
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Unblock IP
     */
    unblockIP = async (
        request: FastifyRequest<{
            Params: { ipAddress: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { ipAddress } = request.params;

            await this.securityMonitor.unblockIP(ipAddress);

            return ResponseUtil.success(reply, null, 'IP unblocked successfully');
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * ดึงรายการ blocked IPs
     */
    getBlockedIPs = async (
        _request: FastifyRequest,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.securityMonitor.getBlockedIPs();

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * ทำความสะอาด old events (manual trigger)
     */
    cleanupOldEvents = async (
        _request: FastifyRequest,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.securityMonitor.cleanupOldEvents();

            return ResponseUtil.success(reply, result, `Cleaned up ${result.deleted} old events`);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * 🆕 ตรวจจับ IP Anomaly
     */
    detectAnomalousIPs = async (
        request: FastifyRequest<{
            Querystring: { hours?: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const hours = request.query.hours ? parseInt(request.query.hours) : 1;
            const result = await this.securityMonitor.detectAnomalousIPBehavior(hours);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * 🆕 ตรวจจับการทำงานนอกเวลา
     */
    detectOffHoursActivity = async (
        _request: FastifyRequest,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.securityMonitor.detectOffHoursActivity();

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * 🆕 ตรวจจับการเข้าถึงข้อมูลจำนวนมาก
     */
    detectMassDataAccess = async (
        request: FastifyRequest<{
            Querystring: { hours?: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const hours = request.query.hours ? parseInt(request.query.hours) : 1;
            const result = await this.securityMonitor.detectMassDataAccess(hours);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * 🆕 ตรวจจับ Brute Force Attempts
     */
    detectBruteForce = async (
        request: FastifyRequest<{
            Querystring: { minutes?: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const minutes = request.query.minutes ? parseInt(request.query.minutes) : 15;
            const result = await this.securityMonitor.detectBruteForceAttempts(minutes);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * 🆕 Auto-block IP
     */
    autoBlockIP = async (
        request: FastifyRequest<{
            Body: {
                ipAddress: string;
                reason: string;
                duration?: number; // minutes
            };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const { ipAddress, reason, duration } = request.body;

            await this.securityMonitor.autoBlockIP(ipAddress, reason, duration);

            return ResponseUtil.success(
                reply, 
                null, 
                `IP ${ipAddress} auto-blocked ${duration ? `for ${duration} minutes` : 'permanently'}`
            );
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * 🆕 Get comprehensive security report
     */
    getSecurityReport = async (
        request: FastifyRequest<{
            Querystring: { hours?: string };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const hours = request.query.hours ? parseInt(request.query.hours) : 24;
            const result = await this.securityMonitor.getSecurityReport(hours);

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}
