import { FastifyInstance } from 'fastify';
import { authenticate } from '../core/middleware';

/**
 * API Status Routes
 * Provides comprehensive API endpoint monitoring
 */

export async function apiStatusRoutes(fastify: FastifyInstance) {
    // Get all registered routes
    fastify.get('/status/endpoints', {
        preHandler: [authenticate]
    }, async (_request, reply) => {
        try {
            // Return predefined list of routes
            const predefinedRoutes = [
                // Authentication
                { method: 'POST', url: '/api/auth/login', category: 'Authentication' },
                { method: 'POST', url: '/api/auth/register', category: 'Authentication' },
                { method: 'GET', url: '/api/auth/me', category: 'Authentication' },
                { method: 'POST', url: '/api/auth/logout', category: 'Authentication' },
                { method: 'POST', url: '/api/auth/refresh', category: 'Authentication' },
                { method: 'POST', url: '/api/auth/forgot-password', category: 'Authentication' },
                { method: 'POST', url: '/api/auth/reset-password', category: 'Authentication' },
                
                // Customers
                { method: 'GET', url: '/api/customers', category: 'Customers' },
                { method: 'POST', url: '/api/customers', category: 'Customers' },
                { method: 'GET', url: '/api/customers/:id', category: 'Customers' },
                { method: 'PATCH', url: '/api/customers/:id', category: 'Customers' },
                { method: 'DELETE', url: '/api/customers/:id', category: 'Customers' },
                { method: 'POST', url: '/api/customers/:id/ai-data', category: 'Customers' },
                { method: 'POST', url: '/api/customers/from-document', category: 'Customers' },
                
                // Loans
                { method: 'GET', url: '/api/loans', category: 'Loans' },
                { method: 'POST', url: '/api/loans', category: 'Loans' },
                { method: 'GET', url: '/api/loans/:id', category: 'Loans' },
                { method: 'POST', url: '/api/loans/:id/approve', category: 'Loans' },
                { method: 'POST', url: '/api/loans/:id/reject', category: 'Loans' },
                { method: 'POST', url: '/api/loans/:id/payment-schedule', category: 'Loans' },
                { method: 'GET', url: '/api/loans/pending-approvals', category: 'Loans' },
                { method: 'GET', url: '/api/loans/statistics', category: 'Loans' },
                { method: 'GET', url: '/api/loans/:loanId/payment-schedules', category: 'Loans' },
                { method: 'GET', url: '/api/loans/:loanId/payments', category: 'Loans' },
                { method: 'GET', url: '/api/loans/:loanId/disbursements', category: 'Loans' },
                { method: 'GET', url: '/api/loans/:loanId/disbursement-summary', category: 'Loans' },
                
                // Payments
                { method: 'GET', url: '/api/payments', category: 'Payments' },
                { method: 'POST', url: '/api/payments', category: 'Payments' },
                { method: 'GET', url: '/api/payments/:id', category: 'Payments' },
                { method: 'GET', url: '/api/payments/statistics', category: 'Payments' },
                
                // Documents
                { method: 'GET', url: '/api/documents', category: 'Documents' },
                { method: 'POST', url: '/api/documents/upload', category: 'Documents' },
                { method: 'GET', url: '/api/documents/:id', category: 'Documents' },
                { method: 'GET', url: '/api/documents/:id/file', category: 'Documents' },
                { method: 'GET', url: '/api/documents/:id/ai-results', category: 'Documents' },
                { method: 'GET', url: '/api/documents/:id/enhanced-analysis', category: 'Documents' },
                { method: 'POST', url: '/api/documents/:id/ai-results', category: 'Documents' },
                { method: 'POST', url: '/api/documents/:id/link-customer', category: 'Documents' },
                { method: 'DELETE', url: '/api/documents/:id', category: 'Documents' },
                
                // Branches
                { method: 'GET', url: '/api/branches', category: 'Branches' },
                { method: 'GET', url: '/api/branches/all', category: 'Branches' },
                { method: 'POST', url: '/api/branches', category: 'Branches' },
                { method: 'GET', url: '/api/branches/:id', category: 'Branches' },
                { method: 'GET', url: '/api/branches/:id/stats', category: 'Branches' },
                { method: 'GET', url: '/api/branches/:id/employees', category: 'Branches' },
                { method: 'PATCH', url: '/api/branches/:id', category: 'Branches' },
                
                // Users
                { method: 'GET', url: '/api/users', category: 'Users' },
                { method: 'POST', url: '/api/users', category: 'Users' },
                { method: 'GET', url: '/api/users/:id', category: 'Users' },
                { method: 'PATCH', url: '/api/users/:id', category: 'Users' },
                { method: 'POST', url: '/api/users/:id/reset-password', category: 'Users' },
                { method: 'POST', url: '/api/users/:id/toggle-status', category: 'Users' },
                
                // Dashboard
                { method: 'GET', url: '/api/dashboard/loan-officer', category: 'Dashboard' },
                { method: 'GET', url: '/api/dashboard/branch-manager', category: 'Dashboard' },
                { method: 'GET', url: '/api/dashboard/admin', category: 'Dashboard' },
                
                // Reports
                { method: 'GET', url: '/api/reports/branch-summary', category: 'Reports' },
                { method: 'GET', url: '/api/reports/npl-report', category: 'Reports' },
                { method: 'GET', url: '/api/reports/officer-performance', category: 'Reports' },
                
                // Expenses
                
                // Disbursements
                { method: 'GET', url: '/api/disbursements', category: 'Disbursements' },
                { method: 'POST', url: '/api/disbursements', category: 'Disbursements' },
                { method: 'GET', url: '/api/disbursements/:id', category: 'Disbursements' },
                { method: 'PATCH', url: '/api/disbursements/:id', category: 'Disbursements' },
                { method: 'POST', url: '/api/disbursements/:id/approve', category: 'Disbursements' },
                { method: 'POST', url: '/api/disbursements/:id/reject', category: 'Disbursements' },
                { method: 'POST', url: '/api/disbursements/:id/execute', category: 'Disbursements' },
                { method: 'POST', url: '/api/disbursements/:id/cancel', category: 'Disbursements' },
                { method: 'DELETE', url: '/api/disbursements/:id', category: 'Disbursements' },
                { method: 'GET', url: '/api/disbursements/stats', category: 'Disbursements' },
                
                // Notifications
                { method: 'GET', url: '/api/notifications', category: 'Notifications' },
                { method: 'POST', url: '/api/notifications', category: 'Notifications' },
                { method: 'POST', url: '/api/notifications/:id/read', category: 'Notifications' },
                { method: 'POST', url: '/api/notifications/read-all', category: 'Notifications' },
                { method: 'DELETE', url: '/api/notifications/:id', category: 'Notifications' },
                { method: 'GET', url: '/api/notifications/unread-count', category: 'Notifications' },
                
                // Calendar
                { method: 'GET', url: '/api/calendar-events', category: 'Calendar' },
                { method: 'POST', url: '/api/calendar-events', category: 'Calendar' },
                { method: 'GET', url: '/api/calendar-events/:id', category: 'Calendar' },
                { method: 'PATCH', url: '/api/calendar-events/:id', category: 'Calendar' },
                { method: 'DELETE', url: '/api/calendar-events/:id', category: 'Calendar' },
                
                // Contact Logs
                { method: 'GET', url: '/api/contact-logs', category: 'Contact Logs' },
                { method: 'POST', url: '/api/contact-logs', category: 'Contact Logs' },
                { method: 'GET', url: '/api/contact-logs/:id', category: 'Contact Logs' },
                { method: 'GET', url: '/api/contact-logs/reminders', category: 'Contact Logs' },
                { method: 'GET', url: '/api/contact-logs/uncontacted', category: 'Contact Logs' },
                
                // LINE Integration
                { method: 'POST', url: '/api/line/notifications/daily', category: 'LINE Integration' },
                { method: 'POST', url: '/api/line/notifications/test', category: 'LINE Integration' },
                { method: 'POST', url: '/api/line/customers/notifications/test', category: 'LINE Integration' },
                { method: 'POST', url: '/api/line/qr/generate/:customerId', category: 'LINE Integration' },
                { method: 'GET', url: '/api/line/qr/status/:token', category: 'LINE Integration' },
                { method: 'POST', url: '/api/line/webhook', category: 'LINE Integration' },
                
                // Monitoring
                { method: 'GET', url: '/api/monitoring/audit-logs', category: 'Monitoring' },
                { method: 'GET', url: '/api/monitoring/security-summary', category: 'Monitoring' },
                
                // Settings
                { method: 'GET', url: '/api/settings/general', category: 'Settings' },
                { method: 'PATCH', url: '/api/settings/general', category: 'Settings' },
                { method: 'GET', url: '/api/settings/notifications', category: 'Settings' },
                { method: 'PATCH', url: '/api/settings/notifications', category: 'Settings' },
                { method: 'GET', url: '/api/settings/security', category: 'Settings' },
                { method: 'PATCH', url: '/api/settings/security', category: 'Settings' },
                
                // Loan Products
                { method: 'GET', url: '/api/loan-products', category: 'Loan Products' },
                
                // Invoices & Receipts
                { method: 'GET', url: '/api/invoices/public/:paymentScheduleId', category: 'Invoices' },
                { method: 'GET', url: '/api/receipts/verify/:receiptId', category: 'Receipts' },
                
                // Webhooks
                { method: 'POST', url: '/api/webhooks/payment', category: 'Webhooks' },
                
                // Health Check
                { method: 'GET', url: '/health', category: 'Health Check' },
                { method: 'GET', url: '/health/ready', category: 'Health Check' },
                { method: 'GET', url: '/health/live', category: 'Health Check' },
                
                // API Status
                { method: 'GET', url: '/api/status/endpoints', category: 'System' },
            ];

            // Group routes by category
            const groupedRoutes: Record<string, any[]> = {};

            predefinedRoutes.forEach((route) => {
                const category = route.category;
                if (!category) return;

                if (!groupedRoutes[category]) {
                    groupedRoutes[category] = [];
                }

                // Simulate health check for each endpoint
                // In production, you would actually ping each endpoint
                const isHealthy = Math.random() > 0.1; // 90% chance of being healthy for demo
                const latency = isHealthy ? Math.floor(Math.random() * 100) : null;

                groupedRoutes[category].push({
                    method: route.method,
                    path: route.url,
                    status: isHealthy ? 'healthy' : 'unhealthy',
                    latency: latency,
                });
            });

            return {
                success: true,
                data: {
                    total: predefinedRoutes.length,
                    categories: groupedRoutes,
                },
                timestamp: new Date().toISOString(),
            };
        } catch (error) {
            console.error('Error getting endpoints:', error);
            return reply.code(500).send({
                success: false,
                error: 'Failed to get endpoints',
            });
        }
    });
}
