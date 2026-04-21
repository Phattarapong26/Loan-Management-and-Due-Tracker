# ระบบ Dashboards แบบละเอียด - DueTracker2026

> เอกสารนี้รวบรวมการวิเคราะห์สถาปัตยกรรมและการทำงานของระบบ Dashboard สำหรับทีมพัฒนาและ Tech Lead

---

## 1. ภาพรวมสถาปัตยกรรม Dashboard

### 1.1 Dashboard Types by Role
```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN DASHBOARD                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ System Health│ │ Data Volume  │ │ Failed Jobs  │            │
│  │   99.9%      │ │  15K Loans   │ │    0         │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Active Users │ │ Security     │ │ Branch       │            │
│  │   45         │ │   Alerts: 2  │ │ Comparison   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   BRANCH MANAGER DASHBOARD                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Total Loans  │ │ Outstanding  │ │ NPL Ratio    │            │
│  │    156       │ │  ฿45M       │ │   3.2%       │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Pending      │ │ Collection   │ │ High Risk    │            │
│  │ Approvals: 8 │ │   Rate: 92%  │ │   Loans: 5   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌─────────────────────────────────────────────────────┐       │
│  │        Officer Performance Chart                    │       │
│  │  Officer A: 95% | Officer B: 87% | Officer C: 78%   │       │
│  └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    LOAN OFFICER DASHBOARD                     │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Portfolio    │ │ Monthly      │ │ Overdue      │            │
│  │  ฿12M       │ │ Target: 85%  │ │   3 Loans    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌─────────────────────────────────────────────────────┐       │
│  │           Today's Tasks (Calendar)                  │       │
│  │  • 09:00 - Meeting with ABC Co.                     │       │
│  │  • 14:00 - Follow up XYZ Ltd (overdue)             │       │
│  └─────────────────────────────────────────────────────┘       │
│  ┌─────────────────────────────────────────────────────┐       │
│  │        Uncontacted Customers (2+ days)              │       │
│  │  • XYZ Ltd - Last: 3 days ago                      │       │
│  └─────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Dashboard Service Architecture

### 2.1 Service Layer Structure
```typescript
/**
 * Dashboard Service - Aggregates data from multiple sources
 * Provides role-specific dashboards with real-time statistics
 */
export class DashboardService {
  private contactLogRepository: ContactLogRepository;
  private calendarEventRepository: CalendarEventRepository;

  // Three main dashboard types
  async getLoanOfficerDashboard(userId, branchId, role): Promise<LoanOfficerDashboard>
  async getBranchManagerDashboard(branchId): Promise<BranchManagerDashboard>
  async getAdminDashboard(): Promise<AdminDashboard>
}
```

### 2.2 Data Aggregation Pattern
```typescript
// Dashboard aggregates data from multiple repositories
class DashboardService {
  async getLoanOfficerDashboard(userId, branchId, role) {
    // 1. Get calendar events (today's tasks)
    const calendarEvents = await this.calendarEventRepository.list({
      dateFrom: todayStart,
      dateTo: todayEnd,
      branchId,
    });

    // 2. Get overdue loans with customer info
    const overdueLoans = await prisma.loan.findMany({
      where: {
        ...officerWhere,  // Officer sees only their loans
        status: { in: ['ACTIVE', 'DISBURSED', 'NPL', 'DEFAULTED'] },
        overdueDays: { gte: 1 },
      },
      include: { customer: { select: { businessName: true } } },
      orderBy: { overdueDays: 'desc' },
      take: 10,
    });

    // 3. Get uncontacted customers
    const uncontactedCustomers = await this.contactLogRepository.getUncontactedCustomers({
      officerId: userId,
      branchId,
      daysWithoutContact: 2,
    });

    // 4. Calculate collection progress
    const collectionAchieved = await this.calculateMonthlyCollection(userId);
    const collectionTarget = await this.getMonthlyTarget(userId);
    const collectionProgress = (collectionAchieved / collectionTarget) * 100;

    // 5. Get portfolio summary
    const portfolio = await this.calculatePortfolioSummary(userId, branchId);

    return {
      kpis: { totalBalance, totalDebtors, monthlyTarget, overdueLoans: overdueCount, todayTasks: tasks.length },
      todayTasks,
      overdueLoans: formattedOverdue,
      recentActivities,
      uncontactedCustomers,
      collectionProgress,
      collectionTarget,
      collectionAchieved,
      pendingPayments,
      successRate,
      portfolio,
    };
  }
}
```

---

## 3. Dashboard Types & Data Models

### 3.1 Loan Officer Dashboard
```typescript
interface LoanOfficerDashboard {
  kpis: {
    totalBalance: number;        // Total outstanding portfolio
    totalDebtors: number;        // Number of active borrowers
    monthlyTarget: number;       // Collection target for month
    overdueLoans: number;        // Count of overdue loans
    todayTasks: number;          // Calendar events today
  };
  todayTasks: Array<{
    id: string;
    name: string;               // Customer business name
    action: string;             // Event type label
    time: string;              // HH:mm format
  }>;
  overdueLoans: Array<{
    id: string;
    customer: string;           // Business name
    days: number;               // Days overdue
    amount: number;             // Outstanding amount
    risk: 'low' | 'medium' | 'high';
  }>;
  recentActivities: Array<{
    id: string;
    type: 'payment' | 'contact' | 'loan';
    message: string;
    time: string;              // Relative time (e.g., "2 hours ago")
    amount?: string;
    count?: string;
  }>;
  uncontactedCustomers: Array<{
    id: string;
    name: string;
    lastContact: string;         // Date or "Never"
    phone: string;
  }>;
  collectionProgress: number;    // Percentage achieved
  collectionTarget: number;
  collectionAchieved: number;
  pendingPayments: number;      // Scheduled but not yet received
  successRate: number;           // Collection success percentage
  portfolio: {
    total: number;
    normal: number;             // On-time payments
    warning: number;            // 1-30 days overdue
    npl: number;               // 90+ days overdue
    totalOutstanding: number;
  };
}
```

### 3.2 Branch Manager Dashboard
```typescript
interface BranchManagerDashboard {
  totalLoans: number;           // All loans in branch
  outstandingBalance: number;   // Total outstanding
  nplRatio: number;             // NPL percentage
  pendingApprovals: number;     // Loans awaiting approval
  collectionRate: number;       // Branch collection percentage
  highRiskLoans: number;        // AI confidence < 40%
  officerPerformance: Array<{
    id: string;
    name: string;
    current: number;           // Collections this month
    target: number;            // Monthly target
    loanCount: number;         // Number of loans managed
    percentage: number;       // Achievement percentage
  }>;
}
```

### 3.3 Admin Dashboard
```typescript
interface AdminDashboard {
  systemHealth: 'healthy' | 'warning' | 'critical';
  activeUsers: number;          // Currently logged in
  failedJobs: number;           // Queue job failures
  securityAlerts: number;        // Failed logins, suspicious activity
  dataVolume: {
    loans: number;
    payments: number;
    customers: number;
    documents: number;
    users: number;
  };
  dataToday: {
    loans: number;              // Loans created today
    payments: number;           // Payments received today
  };
}
```

---

## 4. Real-Time Data Updates

### 4.1 Auto-Refresh Strategy
```typescript
// Frontend React Query configuration
const { data: dashboardData } = useQuery({
  queryKey: ['loanOfficerDashboard'],
  queryFn: () => dashboardApi.getLoanOfficerDashboard(),
  refetchInterval: 30000,        // Refresh every 30 seconds
  refetchIntervalInBackground: false,  // Pause when tab inactive
  refetchOnWindowFocus: true,    // Refresh when user returns
});

// Different refresh intervals by data type
const pendingApprovalsQuery = useQuery({
  queryKey: ['pendingApprovals'],
  queryFn: fetchPendingApprovals,
  refetchInterval: 15000,        // 15 seconds for approvals
});

const budgetsQuery = useQuery({
  queryKey: ['productBudgets'],
  queryFn: fetchBudgets,
  refetchInterval: 30000,        // 30 seconds for budgets
});
```

### 4.2 WebSocket Alternative (Future)
```typescript
// For true real-time updates, WebSocket can push changes
interface DashboardWebSocketEvents {
  'payment.received': { loanId: string; amount: number; officerId: string };
  'loan.approved': { loanId: string; managerId: string };
  'loan.created': { loanId: string; officerId: string };
  'overdue.detected': { loanId: string; days: number };
}
```

---

## 5. Widget Components

### 5.1 Interest Rate Widget
```typescript
// Displays current MLR/MRR rates
interface InterestRateWidgetProps {
  mlr: number;        // Minimum Loan Rate
  mrr: number;        // Minimum Retail Rate
  lastUpdated: Date;
  onUpdate: () => void;  // Admin only
}

// Usage: Shows in all dashboards with different permissions
// - Officer: View only
// - Manager: View only
// - Admin: View + Update
```

### 5.2 Budget Widget
```typescript
// Displays product budget utilization
interface BudgetWidgetProps {
  productId: string;
  productName: string;
  allocated: number;
  utilized: number;
  remaining: number;
  percentage: number;  // utilized / allocated * 100
}

// Shows color indicators:
// - Green: < 70%
// - Yellow: 70-90%
// - Red: > 90%
```

---

## 6. API Endpoints

### 6.1 Dashboard Routes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard` | Any | Returns dashboard based on user role |
| GET | `/api/dashboard/loan-officer` | OFFICER+ | Officer-specific dashboard |
| GET | `/api/dashboard/branch-manager` | MANAGER+ | Manager-specific dashboard |
| GET | `/api/dashboard/admin` | ADMIN | Admin system dashboard |
| GET | `/api/dashboard/stats` | Any | Generic statistics endpoint |
| GET | `/api/dashboard/charts` | Any | Chart data endpoint |
| GET | `/api/dashboard/activities` | Any | Recent activities |

### 6.2 Controller Implementation
```typescript
export class DashboardController {
  /**
   * Generic Get Stats - Dispatches based on user role
   */
  getStats = async (request, reply) => {
    const role = request.user!.role;

    if (role === 'ADMIN') {
      return this.getAdminDashboard(request, reply);
    } else if (role === 'MANAGER') {
      return this.getBranchManagerDashboard(request, reply);
    } else {
      return this.getLoanOfficerDashboard(request, reply);
    }
  };
}
```

---

## 7. Performance Optimization

### 7.1 Database Query Optimization
```typescript
// Use selective fields to reduce data transfer
const overdueLoans = await prisma.loan.findMany({
  where: { /* filters */ },
  select: {
    id: true,
    outstandingBalance: true,
    overdueDays: true,
    customer: {
      select: {
        businessName: true,  // Only get needed fields
      },
    },
  },
  take: 10,  // Limit results
});
```

### 7.2 Caching Strategy
```typescript
// Cache dashboard data for short periods
const CACHE_TTL = 30; // seconds

// For less frequently changing data
const getMonthlyTarget = async (userId) => {
  const cacheKey = `monthly_target:${userId}`;
  let target = await redis.get(cacheKey);
  
  if (!target) {
    target = await calculateMonthlyTarget(userId);
    await redis.setex(cacheKey, 3600, target); // 1 hour cache
  }
  
  return target;
};
```

### 7.3 Lazy Loading
```typescript
// Load heavy components only when needed
const HeavyChart = lazy(() => import('./HeavyChart'));

// Only render when in viewport
const LazyWidget = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? children : <Skeleton height={200} />}
    </div>
  );
};
```

---

## 8. Frontend Dashboard Components

### 8.1 Dashboard Page Structure
```typescript
// Each role has its own dashboard component
const DashboardRouter = () => {
  const { user } = useAuth();

  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'MANAGER':
      return <BranchManagerDashboard />;
    case 'OFFICER':
    default:
      return <LoanOfficerDashboard />;
  }
};
```

### 8.2 Common Widgets
```typescript
// KPI Card Component
interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { percentage: string; isUp: boolean };
  color?: 'blue' | 'green' | 'red' | 'yellow';
}

// Usage in dashboards
<KPICard
  title="Total Loans"
  value={totalLoans}
  icon={<FileText />}
  trend={{ percentage: '+12.5%', isUp: true }}
  color="blue"
/>
```

---

## 9. Security Considerations

### 9.1 Data Scope Enforcement
```typescript
// Officer can only see their own data
const officerWhere: Prisma.LoanWhereInput = isOfficer
  ? { OR: [
      { officerId: userId },
      { customer: { createdBy: userId } }  // Portfolio ownership
    ]}
  : {};

// Manager sees branch data
const branchWhere = !isOfficer && branchId ? { branchId } : {};

// Admin sees all data
const adminWhere = role === 'ADMIN' ? {} : branchWhere;
```

### 9.2 Error Handling
```typescript
// Return empty data instead of errors for better UX
try {
  const result = await dashboardService.getLoanOfficerDashboard(userId);
  return ResponseUtil.success(reply, result);
} catch (error) {
  // Return empty dashboard structure
  const emptyDashboard = {
    kpis: { totalBalance: 0, totalDebtors: 0, /* ... */ },
    todayTasks: [],
    overdueLoans: [],
    recentActivities: [],
    uncontactedCustomers: [],
    // ... empty arrays
  };
  return ResponseUtil.success(reply, emptyDashboard);
}
```

---

## 10. Key Files & Architecture

### Backend
| File | Responsibility |
|------|---------------|
| `dashboard.service.ts` | Business logic for all dashboard types |
| `dashboard.controller.ts` | API endpoints, role-based routing |

### Frontend
| File | Responsibility |
|------|---------------|
| `LoanOfficerDashboard.tsx` | Officer view with portfolio focus |
| `BranchManagerDashboard.tsx` | Manager view with branch metrics |
| `AdminDashboard.tsx` | Admin view with system health |
| `dashboard.api.ts` | API types and functions |
| `InterestRateWidget.tsx` | MLR/MRR display widget |
| `api-endpoints.ts` | Dashboard endpoint definitions |

---

*เอกสารนี้จัดทำเมื่อ: April 2026*
