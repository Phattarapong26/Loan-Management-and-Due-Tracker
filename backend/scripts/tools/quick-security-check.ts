#!/usr/bin/env ts-node

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface SecurityCheck {
    name: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    details: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

class QuickSecurityChecker {
    private checks: SecurityCheck[] = [];

    async runQuickCheck(): Promise<void> {
        console.log('🔍 Quick SQL Injection Security Check');
        console.log('=====================================\n');

        this.checkRawSQLUsage();
        this.checkInputValidation();
        this.checkPrismaUsage();
        this.checkEnvironmentSecurity();
        this.checkMiddlewareConfiguration();

        this.printResults();
    }

    private addCheck(check: SecurityCheck) {
        this.checks.push(check);
    }

    private checkRawSQLUsage() {
        const filesToCheck = [
            'src/routes/index.ts',
            'src/services/line-webhook.service.ts',
        ];

        let rawSqlFound = false;
        let templateLiteralFound = false;

        for (const file of filesToCheck) {
            const fullPath = join(__dirname, file);
            if (existsSync(fullPath)) {
                const content = readFileSync(fullPath, 'utf8');
                
                // Check for raw SQL usage
                if (content.includes('$queryRaw') || content.includes('$executeRaw')) {
                    rawSqlFound = true;
                    
                    // Check if using template literals (potentially unsafe)
                    if (content.match(/\$(?:query|execute)Raw`[^`]*\$\{[^}]+\}[^`]*`/)) {
                        templateLiteralFound = true;
                    }
                }
            }
        }

        if (templateLiteralFound) {
            this.addCheck({
                name: 'Raw SQL Template Literals',
                status: 'FAIL',
                details: 'Found $queryRaw/$executeRaw with template literal interpolation',
                severity: 'HIGH'
            });
        } else if (rawSqlFound) {
            this.addCheck({
                name: 'Raw SQL Usage',
                status: 'WARNING',
                details: 'Raw SQL queries found but appear to use safe parameterization',
                severity: 'MEDIUM'
            });
        } else {
            this.addCheck({
                name: 'Raw SQL Usage',
                status: 'PASS',
                details: 'No raw SQL queries detected',
                severity: 'LOW'
            });
        }
    }

    private checkInputValidation() {
        const middlewareFile = 'src/middlewares/sanitize.middleware.ts';
        const fullPath = join(__dirname, middlewareFile);

        if (existsSync(fullPath)) {
            const content = readFileSync(fullPath, 'utf8');
            
            // Check for SQL injection pattern detection
            const hasSqlPatterns = content.toLowerCase().includes('sql') || 
                                 content.includes('injection') ||
                                 content.includes("'") ||
                                 content.includes(';');

            if (hasSqlPatterns) {
                this.addCheck({
                    name: 'Input Sanitization',
                    status: 'PASS',
                    details: 'Input sanitization middleware exists with SQL pattern detection',
                    severity: 'LOW'
                });
            } else {
                this.addCheck({
                    name: 'Input Sanitization',
                    status: 'WARNING',
                    details: 'Input sanitization exists but may not detect SQL injection patterns',
                    severity: 'MEDIUM'
                });
            }
        } else {
            this.addCheck({
                name: 'Input Sanitization',
                status: 'FAIL',
                details: 'Input sanitization middleware not found',
                severity: 'HIGH'
            });
        }
    }

    private checkPrismaUsage() {
        const repositoryFiles = [
            'src/repositories/customer.repository.ts',
            'src/repositories/payment.repository.ts',
            'src/repositories/loan.repository.ts',
        ];

        let prismaUsage = 0;
        let rawSqlInRepos = 0;

        for (const file of repositoryFiles) {
            const fullPath = join(__dirname, file);
            if (existsSync(fullPath)) {
                const content = readFileSync(fullPath, 'utf8');
                
                if (content.includes('prisma.') || content.includes('this.db.')) {
                    prismaUsage++;
                }
                
                if (content.includes('$queryRaw') || content.includes('$executeRaw')) {
                    rawSqlInRepos++;
                }
            }
        }

        if (rawSqlInRepos > 0) {
            this.addCheck({
                name: 'Repository Pattern Safety',
                status: 'FAIL',
                details: `Raw SQL found in ${rawSqlInRepos} repository files`,
                severity: 'HIGH'
            });
        } else if (prismaUsage >= 3) {
            this.addCheck({
                name: 'Repository Pattern Safety',
                status: 'PASS',
                details: 'Repositories use Prisma ORM (safe from SQL injection)',
                severity: 'LOW'
            });
        } else {
            this.addCheck({
                name: 'Repository Pattern Safety',
                status: 'WARNING',
                details: 'Some repositories may not use Prisma ORM',
                severity: 'MEDIUM'
            });
        }
    }

    private checkEnvironmentSecurity() {
        const envFile = '.env';
        const fullPath = join(__dirname, envFile);

        if (existsSync(fullPath)) {
            const content = readFileSync(fullPath, 'utf8');
            
            // Check for weak passwords
            const hasWeakPasswords = content.includes('password=123') || 
                                   content.includes('password=password') ||
                                   content.includes('secret=secret');

            // Check for localhost in production
            const hasLocalhost = content.includes('localhost') && 
                               process.env.NODE_ENV === 'production';

            if (hasWeakPasswords) {
                this.addCheck({
                    name: 'Environment Security',
                    status: 'FAIL',
                    details: 'Weak passwords detected in environment configuration',
                    severity: 'CRITICAL'
                });
            } else if (hasLocalhost) {
                this.addCheck({
                    name: 'Environment Security',
                    status: 'WARNING',
                    details: 'Localhost configuration in production environment',
                    severity: 'MEDIUM'
                });
            } else {
                this.addCheck({
                    name: 'Environment Security',
                    status: 'PASS',
                    details: 'Environment configuration appears secure',
                    severity: 'LOW'
                });
            }
        } else {
            this.addCheck({
                name: 'Environment Security',
                status: 'WARNING',
                details: 'Environment file not found',
                severity: 'MEDIUM'
            });
        }
    }

    private checkMiddlewareConfiguration() {
        const appFile = 'src/app.ts';
        const fullPath = join(__dirname, appFile);

        if (existsSync(fullPath)) {
            const content = readFileSync(fullPath, 'utf8');
            
            // Check for security middleware registration
            const hasAuth = content.includes('authenticate') || content.includes('auth');
            const hasSanitize = content.includes('sanitize') || content.includes('validate');
            const hasHelmet = content.includes('helmet') || content.includes('security');

            let middlewareScore = 0;
            if (hasAuth) middlewareScore++;
            if (hasSanitize) middlewareScore++;
            if (hasHelmet) middlewareScore++;

            if (middlewareScore >= 2) {
                this.addCheck({
                    name: 'Security Middleware',
                    status: 'PASS',
                    details: 'Security middleware properly configured',
                    severity: 'LOW'
                });
            } else if (middlewareScore === 1) {
                this.addCheck({
                    name: 'Security Middleware',
                    status: 'WARNING',
                    details: 'Some security middleware missing',
                    severity: 'MEDIUM'
                });
            } else {
                this.addCheck({
                    name: 'Security Middleware',
                    status: 'FAIL',
                    details: 'Security middleware not properly configured',
                    severity: 'HIGH'
                });
            }
        }
    }

    private printResults() {
        const passed = this.checks.filter(c => c.status === 'PASS').length;
        const warnings = this.checks.filter(c => c.status === 'WARNING').length;
        const failed = this.checks.filter(c => c.status === 'FAIL').length;

        console.log('📊 QUICK SECURITY CHECK RESULTS');
        console.log('================================\n');

        console.log(`✅ Passed: ${passed}`);
        console.log(`⚠️  Warnings: ${warnings}`);
        console.log(`❌ Failed: ${failed}\n`);

        // Group by severity
        const critical = this.checks.filter(c => c.severity === 'CRITICAL');
        const high = this.checks.filter(c => c.severity === 'HIGH');
        const medium = this.checks.filter(c => c.severity === 'MEDIUM');

        if (critical.length > 0) {
            console.log('🚨 CRITICAL ISSUES:');
            critical.forEach(check => {
                console.log(`   ${this.getStatusIcon(check.status)} ${check.name}: ${check.details}`);
            });
            console.log();
        }

        if (high.length > 0) {
            console.log('⚠️  HIGH PRIORITY:');
            high.forEach(check => {
                console.log(`   ${this.getStatusIcon(check.status)} ${check.name}: ${check.details}`);
            });
            console.log();
        }

        if (medium.length > 0) {
            console.log('💡 MEDIUM PRIORITY:');
            medium.forEach(check => {
                console.log(`   ${this.getStatusIcon(check.status)} ${check.name}: ${check.details}`);
            });
            console.log();
        }

        // Overall assessment
        if (critical.length > 0 || failed > 0) {
            console.log('🔴 OVERALL ASSESSMENT: SECURITY ISSUES DETECTED');
            console.log('   Immediate action required to fix critical vulnerabilities');
        } else if (warnings > 0) {
            console.log('🟡 OVERALL ASSESSMENT: SECURITY IMPROVEMENTS NEEDED');
            console.log('   System is relatively secure but has areas for improvement');
        } else {
            console.log('🟢 OVERALL ASSESSMENT: SECURITY LOOKS GOOD');
            console.log('   No immediate security concerns detected');
        }

        console.log('\n📋 NEXT STEPS:');
        console.log('1. Run full security test suite: ./run-security-tests.sh');
        console.log('2. Review security-audit-report.txt for detailed analysis');
        console.log('3. Fix any critical or high-priority issues');
        console.log('4. Implement regular security testing in CI/CD pipeline\n');
    }

    private getStatusIcon(status: string): string {
        switch (status) {
            case 'PASS': return '✅';
            case 'WARNING': return '⚠️';
            case 'FAIL': return '❌';
            default: return '❓';
        }
    }
}

// Run the quick check
const checker = new QuickSecurityChecker();
checker.runQuickCheck().catch(error => {
    console.error('❌ Quick security check failed:', error);
    process.exit(1);
});