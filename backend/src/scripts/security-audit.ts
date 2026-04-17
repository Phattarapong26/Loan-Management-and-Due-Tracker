#!/usr/bin/env ts-node
// @ts-nocheck

import { PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '@utils/common/logger.util';

interface SecurityIssue {
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    file: string;
    line?: number;
    description: string;
    recommendation: string;
    cweId?: string;
}

class SecurityAuditor {
    private issues: SecurityIssue[] = [];

    async runAudit(): Promise<SecurityIssue[]> {
        console.log('🔍 Starting comprehensive security audit...\n');

        await this.auditRawSQLQueries();
        await this.auditInputValidation();
        await this.auditAuthenticationSecurity();
        await this.auditDatabaseSecurity();
        await this.auditFileSystemSecurity();
        await this.auditCryptographicSecurity();
        await this.auditConfigurationSecurity();

        return this.issues;
    }

    private addIssue(issue: SecurityIssue) {
        this.issues.push(issue);
        const emoji = {
            CRITICAL: '🚨',
            HIGH: '⚠️',
            MEDIUM: '⚡',
            LOW: '💡'
        }[issue.severity];

        console.log(`${emoji} ${issue.severity}: ${issue.description}`);
        console.log(`   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        console.log(`   Fix: ${issue.recommendation}\n`);
    }

    private async auditRawSQLQueries() {
        console.log('📊 Auditing Raw SQL Queries...');

        // Check for $queryRaw and $executeRaw usage
        const rawSqlFiles = [
            'src/routes/index.ts',
            'src/services/line-webhook.service.ts',
        ];

        for (const file of rawSqlFiles) {
            try {
                const fs = require('fs');
                const path = require('path');
                const content = fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');
                
                // Check for template literal usage in raw SQL
                const templateLiteralMatches = content.match(/\$(?:query|execute)Raw`[^`]*\$\{[^}]+\}[^`]*`/g);
                
                if (templateLiteralMatches) {
                    this.addIssue({
                        severity: 'HIGH',
                        category: 'SQL Injection',
                        file,
                        description: 'Raw SQL queries using template literals found',
                        recommendation: 'Use Prisma.sql tagged template or explicit parameter binding',
                        cweId: 'CWE-89'
                    });
                }

                // Check for string concatenation in SQL
                const concatenationMatches = content.match(/\$(?:query|execute)Raw\([^)]*\+[^)]*\)/g);
                
                if (concatenationMatches) {
                    this.addIssue({
                        severity: 'CRITICAL',
                        category: 'SQL Injection',
                        file,
                        description: 'SQL queries using string concatenation detected',
                        recommendation: 'Never use string concatenation for SQL queries. Use parameterized queries.',
                        cweId: 'CWE-89'
                    });
                }

            } catch (error) {
                console.log(`   ⚠️  Could not read file: ${file}`);
            }
        }
    }

    private async auditInputValidation() {
        console.log('🛡️  Auditing Input Validation...');

        // Test database connection and basic validation
        try {
            // Test if sanitization middleware is properly configured
            const middlewareFiles = [
                'src/middlewares/sanitize.middleware.ts',
                'src/middlewares/validate.middleware.ts',
            ];

            for (const file of middlewareFiles) {
                try {
                    const fs = require('fs');
                    const path = require('path');
                    const content = fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');
                    
                    // Check for SQL injection pattern detection
                    if (!content.includes('SQL') && !content.includes('injection')) {
                        this.addIssue({
                            severity: 'MEDIUM',
                            category: 'Input Validation',
                            file,
                            description: 'Input validation middleware does not explicitly check for SQL injection patterns',
                            recommendation: 'Add SQL injection pattern detection to input validation',
                            cweId: 'CWE-20'
                        });
                    }

                    // Check for XSS protection
                    if (!content.includes('script') && !content.includes('XSS')) {
                        this.addIssue({
                            severity: 'MEDIUM',
                            category: 'Input Validation',
                            file,
                            description: 'Input validation middleware may not have comprehensive XSS protection',
                            recommendation: 'Ensure XSS protection covers all script injection vectors',
                            cweId: 'CWE-79'
                        });
                    }

                } catch (error) {
                    this.addIssue({
                        severity: 'HIGH',
                        category: 'Input Validation',
                        file,
                        description: 'Input validation middleware file not found or not readable',
                        recommendation: 'Ensure input validation middleware exists and is properly configured'
                    });
                }
            }

        } catch (error) {
            this.addIssue({
                severity: 'HIGH',
                category: 'Input Validation',
                file: 'Database Connection',
                description: 'Could not test input validation due to database connection issues',
                recommendation: 'Ensure database is accessible for security testing'
            });
        }
    }

    private async auditAuthenticationSecurity() {
        console.log('🔐 Auditing Authentication Security...');

        try {
            // Check for session security
            const sessions = await prisma.session.findMany({
                take: 1,
                select: {
                    token: true,
                    expiresAt: true,
                    isValid: true,
                }
            });

            if (sessions.length > 0) {
                const session = sessions[0];
                
                // Check token length (should be sufficiently long)
                if (session.token.length < 32) {
                    this.addIssue({
                        severity: 'HIGH',
                        category: 'Authentication',
                        file: 'Session Management',
                        description: 'Session tokens may be too short',
                        recommendation: 'Use tokens with at least 32 characters of entropy',
                        cweId: 'CWE-330'
                    });
                }

                // Check if sessions have expiration
                if (!session.expiresAt) {
                    this.addIssue({
                        severity: 'HIGH',
                        category: 'Authentication',
                        file: 'Session Management',
                        description: 'Sessions without expiration found',
                        recommendation: 'All sessions should have expiration times',
                        cweId: 'CWE-613'
                    });
                }
            }

            // Check for password policies in user table
            const users = await prisma.user.findMany({
                take: 1,
                select: {
                    password: true,
                }
            });

            if (users.length > 0 && users[0].password) {
                // Check if passwords are hashed (should not be plain text)
                if (users[0].password.length < 50) {
                    this.addIssue({
                        severity: 'CRITICAL',
                        category: 'Authentication',
                        file: 'User Management',
                        description: 'Passwords may not be properly hashed',
                        recommendation: 'Ensure all passwords are hashed with bcrypt or similar',
                        cweId: 'CWE-256'
                    });
                }
            }

        } catch (error) {
            this.addIssue({
                severity: 'MEDIUM',
                category: 'Authentication',
                file: 'Database Schema',
                description: 'Could not audit authentication security due to database access issues',
                recommendation: 'Ensure database schema includes proper authentication tables'
            });
        }
    }

    private async auditDatabaseSecurity() {
        console.log('🗄️  Auditing Database Security...');

        try {
            // Check for sensitive data encryption
            const customers = await prisma.customer.findMany({
                take: 1,
                select: {
                    taxId: true,
                    phone: true,
                    email: true,
                }
            });

            if (customers.length > 0) {
                const customer = customers[0];
                
                // Check if tax ID appears to be encrypted
                if (customer.taxId && customer.taxId.length < 20) {
                    this.addIssue({
                        severity: 'HIGH',
                        category: 'Data Protection',
                        file: 'Customer Data',
                        description: 'Tax ID may not be encrypted',
                        recommendation: 'Encrypt sensitive PII data like tax IDs',
                        cweId: 'CWE-311'
                    });
                }

                // Check for email format (should not be obviously fake)
                if (customer.email && customer.email.includes('test')) {
                    console.log('   ℹ️  Test data detected in production database');
                }
            }

            // Check for database constraints
            const schema = await prisma.$queryRaw`
                SELECT table_name, column_name, is_nullable, data_type
                FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name IN ('users', 'customers', 'loans', 'payments')
                LIMIT 10
            `;

            console.log('   ✅ Database schema accessible for security audit');

        } catch (error) {
            // This might fail in some database configurations, which is okay
            console.log('   ⚠️  Could not perform detailed database schema audit');
        }
    }

    private async auditFileSystemSecurity() {
        console.log('📁 Auditing File System Security...');

        const sensitiveFiles = [
            '.env',
            'src/config/env.ts',
            'prisma/schema.prisma',
        ];

        for (const file of sensitiveFiles) {
            try {
                const fs = require('fs');
                const path = require('path');
                const fullPath = path.join(__dirname, '..', '..', file);
                
                if (fs.existsSync(fullPath)) {
                    const stats = fs.statSync(fullPath);
                    
                    // Check file permissions (should not be world-readable for sensitive files)
                    if (file === '.env' && (stats.mode & parseInt('044', 8))) {
                        this.addIssue({
                            severity: 'HIGH',
                            category: 'File Security',
                            file,
                            description: 'Environment file may have overly permissive permissions',
                            recommendation: 'Set .env file permissions to 600 (owner read/write only)',
                            cweId: 'CWE-732'
                        });
                    }

                    // Check for secrets in config files
                    if (file.includes('env') || file.includes('config')) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        
                        if (content.includes('password') && content.includes('123')) {
                            this.addIssue({
                                severity: 'HIGH',
                                category: 'Configuration Security',
                                file,
                                description: 'Weak passwords detected in configuration',
                                recommendation: 'Use strong, randomly generated passwords',
                                cweId: 'CWE-521'
                            });
                        }

                        if (content.includes('localhost') && process.env.NODE_ENV === 'production') {
                            this.addIssue({
                                severity: 'MEDIUM',
                                category: 'Configuration Security',
                                file,
                                description: 'Localhost configuration in production environment',
                                recommendation: 'Use production-appropriate hostnames and URLs'
                            });
                        }
                    }
                }

            } catch (error) {
                console.log(`   ⚠️  Could not audit file: ${file}`);
            }
        }
    }

    private async auditCryptographicSecurity() {
        console.log('🔒 Auditing Cryptographic Security...');

        const cryptoFiles = [
            'src/utils/encryption.util.ts',
            'src/utils/jwt.util.ts',
        ];

        for (const file of cryptoFiles) {
            try {
                const fs = require('fs');
                const path = require('path');
                const content = fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');
                
                // Check for weak encryption algorithms
                if (content.includes('md5') || content.includes('sha1')) {
                    this.addIssue({
                        severity: 'HIGH',
                        category: 'Cryptography',
                        file,
                        description: 'Weak cryptographic algorithms detected',
                        recommendation: 'Use SHA-256 or stronger algorithms',
                        cweId: 'CWE-327'
                    });
                }

                // Check for hardcoded secrets
                if (content.includes('secret') && content.includes('=')) {
                    const lines = content.split('\n');
                    lines.forEach((line, index) => {
                        if (line.includes('secret') && line.includes('=') && !line.includes('process.env')) {
                            this.addIssue({
                                severity: 'CRITICAL',
                                category: 'Cryptography',
                                file,
                                line: index + 1,
                                description: 'Hardcoded secret detected',
                                recommendation: 'Use environment variables for all secrets',
                                cweId: 'CWE-798'
                            });
                        }
                    });
                }

            } catch (error) {
                console.log(`   ⚠️  Could not audit crypto file: ${file}`);
            }
        }
    }

    private async auditConfigurationSecurity() {
        console.log('⚙️  Auditing Configuration Security...');

        // Check environment variables
        const requiredSecureEnvVars = [
            'JWT_SECRET',
            'DATABASE_URL',
            'ENCRYPTION_KEY',
        ];

        for (const envVar of requiredSecureEnvVars) {
            if (!process.env[envVar]) {
                this.addIssue({
                    severity: 'HIGH',
                    category: 'Configuration',
                    file: 'Environment Variables',
                    description: `Required security environment variable ${envVar} not set`,
                    recommendation: `Set ${envVar} environment variable with a secure value`
                });
            } else if (process.env[envVar]!.length < 16) {
                this.addIssue({
                    severity: 'MEDIUM',
                    category: 'Configuration',
                    file: 'Environment Variables',
                    description: `Environment variable ${envVar} may be too short`,
                    recommendation: `Use at least 16 characters for ${envVar}`
                });
            }
        }

        // Check for development settings in production
        if (process.env.NODE_ENV === 'production') {
            if (process.env.DEBUG === 'true') {
                this.addIssue({
                    severity: 'MEDIUM',
                    category: 'Configuration',
                    file: 'Environment Variables',
                    description: 'Debug mode enabled in production',
                    recommendation: 'Disable debug mode in production environments'
                });
            }
        }
    }

    async generateReport(): Promise<string> {
        const issues = await this.runAudit();
        
        const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
        const highCount = issues.filter(i => i.severity === 'HIGH').length;
        const mediumCount = issues.filter(i => i.severity === 'MEDIUM').length;
        const lowCount = issues.filter(i => i.severity === 'LOW').length;

        let report = '\n' + '='.repeat(80) + '\n';
        report += '🔒 SECURITY AUDIT REPORT\n';
        report += '='.repeat(80) + '\n\n';
        
        report += `📊 SUMMARY:\n`;
        report += `   🚨 Critical: ${criticalCount}\n`;
        report += `   ⚠️  High: ${highCount}\n`;
        report += `   ⚡ Medium: ${mediumCount}\n`;
        report += `   💡 Low: ${lowCount}\n`;
        report += `   📋 Total: ${issues.length}\n\n`;

        if (criticalCount > 0) {
            report += '🚨 CRITICAL ISSUES (Fix Immediately):\n';
            report += '-'.repeat(50) + '\n';
            issues.filter(i => i.severity === 'CRITICAL').forEach((issue, index) => {
                report += `${index + 1}. ${issue.description}\n`;
                report += `   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}\n`;
                report += `   Fix: ${issue.recommendation}\n`;
                if (issue.cweId) report += `   CWE: ${issue.cweId}\n`;
                report += '\n';
            });
        }

        if (highCount > 0) {
            report += '⚠️  HIGH PRIORITY ISSUES:\n';
            report += '-'.repeat(50) + '\n';
            issues.filter(i => i.severity === 'HIGH').forEach((issue, index) => {
                report += `${index + 1}. ${issue.description}\n`;
                report += `   File: ${issue.file}${issue.line ? `:${issue.line}` : ''}\n`;
                report += `   Fix: ${issue.recommendation}\n`;
                if (issue.cweId) report += `   CWE: ${issue.cweId}\n`;
                report += '\n';
            });
        }

        report += '\n' + '='.repeat(80) + '\n';
        report += '🛡️  SQL INJECTION PROTECTION RECOMMENDATIONS:\n';
        report += '='.repeat(80) + '\n';
        report += '1. Replace all $queryRaw/$executeRaw template literals with Prisma.sql\n';
        report += '2. Add explicit SQL injection pattern detection to input validation\n';
        report += '3. Implement parameterized query validation in CI/CD pipeline\n';
        report += '4. Add database query monitoring and alerting\n';
        report += '5. Regular security testing with automated tools\n\n';

        return report;
    }
}

// Run the audit if called directly
if (require.main === module) {
    const auditor = new SecurityAuditor();
    auditor.generateReport().then(report => {
        console.log(report);
        
        // Write report to file
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(__dirname, '..', '..', 'security-audit-report.txt');
        fs.writeFileSync(reportPath, report);
        console.log(`📄 Full report saved to: ${reportPath}`);
        
        process.exit(0);
    }).catch(error => {
        console.error('❌ Security audit failed:', error);
        process.exit(1);
    });
}

export { SecurityAuditor };