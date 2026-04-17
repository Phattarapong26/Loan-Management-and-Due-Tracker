/**
 * Cache Strategy Configuration
 * 
 * กำหนดกลยุทธ์การ cache สำหรับแต่ละประเภทข้อมูล
 * เพื่อรักษาความเป็น Real-time
 */

export interface CacheStrategy {
    ttl: number; // seconds
    tags: string[];
    description: string;
}

/**
 * Cache Strategies
 * 
 * หลักการ:
 * - ข้อมูลที่เปลี่ยนไม่บ่อย → TTL นาน (10-30 นาที)
 * - ข้อมูล Real-time → TTL สั้น (1-5 นาที) หรือไม่ cache
 * - ข้อมูล Static → TTL นานมาก (1 ชั่วโมง)
 */
export const CACHE_STRATEGIES = {
    // ========================================
    // STATIC DATA (เปลี่ยนน้อยมาก)
    // ========================================
    
    /**
     * Loan Products - เปลี่ยนไม่บ่อย
     * TTL: 30 นาที
     */
    LOAN_PRODUCTS: {
        ttl: 1800, // 30 minutes
        tags: ['loan-products'],
        description: 'Loan products list (rarely changes)',
    } as CacheStrategy,

    /**
     * System Config - เปลี่ยนน้อยมาก
     * TTL: 1 ชั่วโมง
     */
    SYSTEM_CONFIG: {
        ttl: 3600, // 1 hour
        tags: ['system-config'],
        description: 'System configuration (rarely changes)',
    } as CacheStrategy,

    /**
     * Branches - เปลี่ยนน้อยมาก
     * TTL: 30 นาที
     */
    BRANCHES: {
        ttl: 1800, // 30 minutes
        tags: ['branches'],
        description: 'Branch list (rarely changes)',
    } as CacheStrategy,

    /**
     * Interest Rate Tiers - เปลี่ยนไม่บ่อย
     * TTL: 30 นาที
     */
    INTEREST_RATES: {
        ttl: 1800, // 30 minutes
        tags: ['interest-rates'],
        description: 'Interest rate tiers (rarely changes)',
    } as CacheStrategy,

    // ========================================
    // SEMI-STATIC DATA (เปลี่ยนบ้าง แต่ไม่บ่อย)
    // ========================================

    /**
     * Customer List - เปลี่ยนบ้าง
     * TTL: 10 นาที
     */
    CUSTOMERS_LIST: {
        ttl: 600, // 10 minutes
        tags: ['customers'],
        description: 'Customer list (changes occasionally)',
    } as CacheStrategy,

    /**
     * Customer Detail - เปลี่ยนบ้าง
     * TTL: 5 นาที
     */
    CUSTOMER_DETAIL: {
        ttl: 300, // 5 minutes
        tags: ['customers'],
        description: 'Customer detail (changes occasionally)',
    } as CacheStrategy,

    /**
     * Loan List (by status) - เปลี่ยนบ้าง
     * TTL: 5 นาที
     */
    LOANS_LIST: {
        ttl: 300, // 5 minutes
        tags: ['loans'],
        description: 'Loan list filtered by status',
    } as CacheStrategy,

    // ========================================
    // REAL-TIME DATA (เปลี่ยนบ่อย - Cache สั้นมาก)
    // ========================================

    /**
     * Dashboard Stats - Real-time
     * TTL: 2 นาที (เพื่อลด load แต่ยังค่อนข้าง real-time)
     */
    DASHBOARD_STATS: {
        ttl: 120, // 2 minutes
        tags: ['dashboard', 'stats'],
        description: 'Dashboard statistics (real-time)',
    } as CacheStrategy,

    /**
     * Loan Detail - Real-time
     * TTL: 2 นาที
     */
    LOAN_DETAIL: {
        ttl: 120, // 2 minutes
        tags: ['loans'],
        description: 'Loan detail (real-time)',
    } as CacheStrategy,

    /**
     * Payment Schedule - Real-time
     * TTL: 3 นาที
     */
    PAYMENT_SCHEDULE: {
        ttl: 180, // 3 minutes
        tags: ['payments'],
        description: 'Payment schedule (real-time)',
    } as CacheStrategy,

    // ========================================
    // NO CACHE (ไม่ควร cache เลย)
    // ========================================
    
    /**
     * ข้อมูลที่ไม่ควร cache:
     * - Payments (การชำระเงิน) - ต้อง real-time 100%
     * - Disbursements (การเบิกจ่าย) - ต้อง real-time 100%
     * - Notifications - ต้อง real-time 100%
     * - Audit Logs - ต้อง real-time 100%
     * - User Sessions - ต้อง real-time 100%
     */
} as const;

/**
 * Cache Key Builders
 * สร้าง cache key ที่มี pattern ชัดเจน
 */
export const CACHE_KEYS = {
    // Loan Products
    loanProducts: (status?: string) => 
        status ? `loan-products:status:${status}` : 'loan-products:all',
    
    loanProductDetail: (id: string) => 
        `loan-product:${id}`,

    // Customers
    customersList: (branchId?: string, status?: string) => 
        `customers:branch:${branchId || 'all'}:status:${status || 'all'}`,
    
    customerDetail: (id: string) => 
        `customer:${id}`,

    // Loans
    loansList: (filters: { branchId?: string; status?: string; officerId?: string; customerId?: string }) => {
        const parts = ['loans'];
        if (filters.customerId) parts.push(`customer:${filters.customerId}`);
        if (filters.branchId) parts.push(`branch:${filters.branchId}`);
        if (filters.status) parts.push(`status:${filters.status}`);
        if (filters.officerId) parts.push(`officer:${filters.officerId}`);
        return parts.join(':');
    },

    loanDetail: (id: string) => 
        `loan:${id}`,

    // Dashboard
    dashboardStats: (userId: string, role: string) => 
        `dashboard:${role}:${userId}`,

    branchDashboard: (branchId: string) => 
        `dashboard:branch:${branchId}`,

    // System
    systemConfig: (key?: string) => 
        key ? `system-config:${key}` : 'system-config:all',

    branches: () => 
        'branches:all',

    // Interest Rates
    interestRates: (productId?: string) => 
        productId ? `interest-rates:product:${productId}` : 'interest-rates:all',
} as const;

/**
 * Cache Invalidation Rules
 * กำหนดว่าเมื่อมีการอัพเดทอะไร ต้อง invalidate cache อะไรบ้าง
 */
export const CACHE_INVALIDATION = {
    // เมื่อมี Loan ใหม่หรืออัพเดท
    onLoanChange: ['loans', 'dashboard', 'stats'],
    
    // เมื่อมี Customer ใหม่หรืออัพเดท
    onCustomerChange: ['customers', 'dashboard'],
    
    // เมื่อมี Payment ใหม่
    onPaymentChange: ['loans', 'payments', 'dashboard', 'stats'],
    
    // เมื่อมี Disbursement ใหม่
    onDisbursementChange: ['loans', 'dashboard', 'stats'],
    
    // เมื่อมี Loan Product อัพเดท
    onLoanProductChange: ['loan-products'],
    
    // เมื่อมี System Config อัพเดท
    onSystemConfigChange: ['system-config'],
} as const;
