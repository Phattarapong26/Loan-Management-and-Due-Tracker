import { ThreatType, ThreatSeverity } from './security-monitor.service';

interface DetectionResult {
    detected: boolean;
    threats: Array<{
        type: ThreatType;
        severity: ThreatSeverity;
        description: string;
        pattern?: string;
    }>;
}

export class ThreatDetectorService {
    // XSS Patterns
    private readonly XSS_PATTERNS = [
        /<script[^>]*>.*?<\/script>/i,
        /javascript:/i,
        /on\w+\s*=/i, // onclick, onerror, etc.
        /<iframe/i,
        /<object/i,
        /<embed/i,
        /eval\(/i,
        /expression\(/i,
        /vbscript:/i,
        /data:text\/html/i
    ];

    // SQL Injection Patterns
    private readonly SQL_PATTERNS = [
        /(\bUNION\b.*\bSELECT\b)/i,
        /(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i,
        /(\bINSERT\b.*\bINTO\b.*\bVALUES\b)/i,
        /(\bUPDATE\b.*\bSET\b)/i,
        /(\bDELETE\b.*\bFROM\b)/i,
        /(\bDROP\b.*\bTABLE\b)/i,
        /(\bEXEC\b|\bEXECUTE\b)/i,
        /(\bOR\b.*=.*)/i,
        /(\bAND\b.*=.*)/i,
        /'.*OR.*'.*=.*'/i,
        /1=1/i,
        /1' OR '1'='1/i
    ];

    // Path Traversal / LFI Patterns
    private readonly PATH_TRAVERSAL_PATTERNS = [
        /\.\.\//,
        /\.\.\\/,
        /%2e%2e%2f/i,
        /%2e%2e\\/i,
        /\.\.%2f/i,
        /\.\.%5c/i,
        /\/etc\/passwd/i,
        /\/etc\/shadow/i,
        /\/proc\/self/i,
        /\/windows\/system32/i,
        /c:\\windows/i
    ];

    // RFI Patterns
    private readonly RFI_PATTERNS = [
        /https?:\/\//i,
        /ftp:\/\//i,
        /file:\/\//i,
        /php:\/\//i,
        /data:\/\//i,
        /expect:\/\//i,
        /zip:\/\//i
    ];

    // SSRF Patterns
    private readonly SSRF_PATTERNS = [
        /localhost/i,
        /127\.0\.0\.1/,
        /0\.0\.0\.0/,
        /::1/,
        /169\.254\./, // AWS metadata
        /192\.168\./,
        /10\.\d+\.\d+\.\d+/,
        /172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /@[^:]*:/ // URL with credentials
    ];

    // Command Injection Patterns
    private readonly COMMAND_INJECTION_PATTERNS = [
        /[|`]/,
        /\$\{.*\}/,
        /\$\(.*\)/,
        /`.*`/,
        /\|\|/,
        /&&/
    ];

    // XXE Patterns (not used in main detection but kept for reference)
    // private readonly XXE_PATTERNS = [
    //     /<!DOCTYPE/gi,
    //     /<!ENTITY/gi,
    //     /SYSTEM/gi,
    //     /PUBLIC/gi
    // ];

    /**
     * ตรวจสอบ input ทั้งหมด
     */
    detectThreats(input: string): DetectionResult {
        const threats: DetectionResult['threats'] = [];

        // ตรวจสอบ XSS
        if (this.detectXSS(input)) {
            threats.push({
                type: ThreatType.XSS,
                severity: ThreatSeverity.HIGH,
                description: 'Cross-Site Scripting (XSS) attempt detected',
                pattern: 'XSS_PATTERN'
            });
        }

        // ตรวจสอบ SQL Injection
        if (this.detectSQLInjection(input)) {
            threats.push({
                type: ThreatType.SQL_INJECTION,
                severity: ThreatSeverity.CRITICAL,
                description: 'SQL Injection attempt detected',
                pattern: 'SQL_PATTERN'
            });
        }

        // ตรวจสอบ Path Traversal / LFI
        if (this.detectPathTraversal(input)) {
            threats.push({
                type: ThreatType.LFI,
                severity: ThreatSeverity.HIGH,
                description: 'Local File Inclusion (LFI) or Path Traversal attempt detected',
                pattern: 'PATH_TRAVERSAL'
            });
        }

        // ตรวจสอบ RFI
        if (this.detectRFI(input)) {
            threats.push({
                type: ThreatType.RFI,
                severity: ThreatSeverity.HIGH,
                description: 'Remote File Inclusion (RFI) attempt detected',
                pattern: 'RFI_PATTERN'
            });
        }

        // ตรวจสอบ SSRF
        if (this.detectSSRF(input)) {
            threats.push({
                type: ThreatType.SSRF,
                severity: ThreatSeverity.HIGH,
                description: 'Server-Side Request Forgery (SSRF) attempt detected',
                pattern: 'SSRF_PATTERN'
            });
        }

        // ตรวจสอบ Command Injection
        if (this.detectCommandInjection(input)) {
            threats.push({
                type: ThreatType.COMMAND_INJECTION,
                severity: ThreatSeverity.CRITICAL,
                description: 'Command Injection attempt detected',
                pattern: 'COMMAND_INJECTION'
            });
        }

        // ตรวจสอบ XXE
        if (this.detectXXE(input)) {
            threats.push({
                type: ThreatType.XXE,
                severity: ThreatSeverity.HIGH,
                description: 'XML External Entity (XXE) attempt detected',
                pattern: 'XXE_PATTERN'
            });
        }

        return {
            detected: threats.length > 0,
            threats
        };
    }

    /**
     * ตรวจสอบ XSS
     */
    private detectXSS(input: string): boolean {
        return this.XSS_PATTERNS.some(pattern => pattern.test(input));
    }

    /**
     * ตรวจสอบ SQL Injection
     */
    private detectSQLInjection(input: string): boolean {
        // ตรวจสอบ pattern ที่น่าสงสัย
        const suspiciousPatterns = this.SQL_PATTERNS.filter(pattern => pattern.test(input));
        
        // ถ้าเจอมากกว่า 1 pattern หรือเจอ pattern ที่อันตรายมาก
        if (suspiciousPatterns.length > 1) return true;
        
        // ตรวจสอบ pattern เฉพาะที่อันตรายมาก
        const criticalPatterns = [
            /(\bUNION\b.*\bSELECT\b)/i,
            /(\bDROP\b.*\bTABLE\b)/i,
            /1' OR '1'='1/i
        ];
        
        return criticalPatterns.some(pattern => pattern.test(input));
    }

    /**
     * ตรวจสอบ Path Traversal / LFI
     */
    private detectPathTraversal(input: string): boolean {
        return this.PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(input));
    }

    /**
     * ตรวจสอบ RFI
     */
    private detectRFI(input: string): boolean {
        // ตรวจสอบว่ามี URL scheme ที่น่าสงสัยหรือไม่
        const hasScheme = this.RFI_PATTERNS.some(pattern => pattern.test(input));
        
        // ถ้ามี scheme และมี path traversal ด้วย = น่าสงสัยมาก
        const hasTraversal = this.PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(input));
        
        return hasScheme && hasTraversal;
    }

    /**
     * ตรวจสอบ SSRF
     */
    private detectSSRF(input: string): boolean {
        return this.SSRF_PATTERNS.some(pattern => pattern.test(input));
    }

    /**
     * ตรวจสอบ Command Injection
     */
    private detectCommandInjection(input: string): boolean {
        return this.COMMAND_INJECTION_PATTERNS.some(pattern => pattern.test(input));
    }

    /**
     * ตรวจสอบ XXE
     */
    private detectXXE(input: string): boolean {
        // ต้องมีทั้ง DOCTYPE และ ENTITY
        const hasDoctype = /<!DOCTYPE/gi.test(input);
        const hasEntity = /<!ENTITY/gi.test(input);
        const hasSystem = /SYSTEM/gi.test(input);
        
        return hasDoctype && hasEntity && hasSystem;
    }

    /**
     * Sanitize input (ลบ/escape อักขระที่อันตราย)
     */
    sanitizeInput(input: string): string {
        let sanitized = input;

        // HTML encode
        sanitized = sanitized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');

        // ลบ null bytes
        sanitized = sanitized.replace(/\0/g, '');

        // ลบ control characters
        // eslint-disable-next-line no-control-regex
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

        return sanitized;
    }

    /**
     * Validate file path (ป้องกัน path traversal)
     */
    validateFilePath(path: string): boolean {
        // ห้ามมี ../ หรือ ..\
        if (path.includes('..')) return false;
        
        // ห้ามมี absolute path
        if (path.startsWith('/') || /^[a-zA-Z]:/.test(path)) return false;
        
        // ห้ามมี null bytes
        if (path.includes('\0')) return false;
        
        return true;
    }

    /**
     * Validate URL (ป้องกัน SSRF)
     */
    validateURL(url: string): boolean {
        try {
            const parsed = new URL(url);
            
            // อนุญาตเฉพาะ http และ https
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return false;
            }
            
            // ห้าม localhost และ private IPs
            const hostname = parsed.hostname.toLowerCase();
            if (
                hostname === 'localhost' ||
                hostname === '127.0.0.1' ||
                hostname === '::1' ||
                hostname.startsWith('192.168.') ||
                hostname.startsWith('10.') ||
                /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
                hostname.startsWith('169.254.')
            ) {
                return false;
            }
            
            return true;
        } catch {
            return false;
        }
    }

    /**
     * ตรวจสอบ payload size (ป้องกัน DOS)
     */
    validatePayloadSize(data: unknown, maxSizeKB: number = 1024): boolean {
        const size = JSON.stringify(data).length;
        const sizeKB = size / 1024;
        return sizeKB <= maxSizeKB;
    }
}
