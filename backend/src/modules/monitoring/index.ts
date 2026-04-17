/**
 * Security Monitoring Module
 * 
 * ระบบป้องกันและตรวจจับภัยคุกคามความปลอดภัยแบบครอบคลุม
 * - XSS, SQL Injection, LFI, RFI, SSRF, DOS, IDOR, Command Injection, XXE
 * - Rate Limiting, IP Blocking, Payload Size Validation
 * - Auto Cleanup (ป้องกัน database บวม)
 */

// Services
export { SecurityMonitorService, ThreatType, ThreatSeverity } from './services/security-monitor.service';
export { ThreatDetectorService } from './services/threat-detector.service';
export { MonitoringService } from './services/monitoring.service';

// Controllers
export { SecurityController } from './controllers/security.controller';
export { MonitoringController } from './controllers/monitoring.controller';

// Middleware
export { SecurityScannerMiddleware, securityScanner } from './middleware/security-scanner.middleware';

// Routes
export { securityRoutes } from './routes/security.routes';

// Jobs
export { startSecurityCleanupJob } from '@jobs/schedulers/security-cleanup.job';
