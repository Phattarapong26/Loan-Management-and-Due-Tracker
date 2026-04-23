import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { dashboardApi, loansApi } from '@/shared/lib/api-endpoints';
import { apiClient } from '@/shared/lib/api-client';
import { Badge } from '@/shared/components/ui/badge';
import { DashboardSkeleton } from '@/shared/components/skeletons';
import { loanProductsApi, type LoanProduct } from '@/features/approvals/api/loan-products.api';
import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  Users,
  Bell,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  ChevronRight,
  Eye,
  Package,
} from 'lucide-react';

// Alert Item Component
const AlertItem = ({ title, time, type }: { title: string; time: string; type: 'danger' | 'warning' | 'info' }) => {
  const colors = {
    danger: 'bg-rose-50 text-rose-600',
    warning: 'bg-amber-50 text-amber-600',
    info: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colors[type]}`}>
        <AlertTriangle className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
          <Clock className="h-3 w-3" /> {time}
        </p>
      </div>
    </div>
  );
};

export default function BranchManagerDashboard() {
  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch branch manager dashboard data with auto-refresh
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['branchManagerDashboard'],
    queryFn: async () => {
      const result = await dashboardApi.getBranchManagerDashboard();
      return result;
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: false,
  });

  // Fetch high risk loans (overdue > 30 days or DSCR < 1.0) with auto-refresh
  const { data: highRiskLoansData, isLoading: isHighRiskLoading } = useQuery({
    queryKey: ['highRiskLoans'],
    queryFn: async () => {
      const response = await loansApi.list({ status: 'ACTIVE', limit: 100 });
      if (!response.data) return [];
      return response.data.loans.filter((loan: any) => 
        loan.overdueDays >= 30 || (loan.dscr && loan.dscr < 1.0)
      ).slice(0, 3);
    },
    refetchInterval: 60000, // Auto-refresh every 60 seconds
    refetchIntervalInBackground: false,
  });

  // Fetch pending approvals (both PENDING and APPROVED but not disbursed) with auto-refresh
  const { data: pendingApprovalsData, isLoading: isPendingLoading } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: async () => {
      // Get both pending and approved loans
      const [pendingResponse, approvedResponse] = await Promise.all([
        loansApi.list({ status: 'PENDING_APPROVAL', limit: 50 }),
        loansApi.list({ status: 'APPROVED', limit: 50 }),
      ]);
      
      const pendingLoans = pendingResponse.data?.loans || [];
      const approvedLoans = approvedResponse.data?.loans || [];
      
      // Combine and sort by created date (newest first)
      const allLoans = [...pendingLoans, ...approvedLoans].sort((a: any, b: any) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      return { loans: allLoans };
    },
    refetchInterval: 15000, // Auto-refresh every 15 seconds (more frequent for approvals)
    refetchIntervalInBackground: false,
  });

  // Fetch active loan products
  const { data: loanProducts, isLoading: isProductsLoading } = useQuery({
    queryKey: ['activeLoanProducts'],
    queryFn: async () => {
      const products = await loanProductsApi.getAll({ status: 'ACTIVE' });
      return products;
    },
  });

  // Fetch budgets for all active products
  const { data: productBudgets, isLoading: isBudgetsLoading } = useQuery({
    queryKey: ['productBudgets', loanProducts?.map(p => p.id)],
    queryFn: async () => {
      if (!loanProducts || loanProducts.length === 0) return {};
      
      const currentYear = new Date().getFullYear();
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
      
      const response = await apiClient.post('/api/budgets/batch', {
        productIds: loanProducts.map(p => p.id),
        fiscalYear: currentYear,
        quarter: currentQuarter,
      });
      
      if (response.error) {
        console.error('Failed to fetch budgets:', response.error);
        return {};
      }
      
      // The service returns the budget map directly as data
      return (response.data || {}) as Record<string, any>;
    },
    enabled: !!loanProducts && loanProducts.length > 0,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
  });

  // Fetch all loans for trend calculation
  const { data: allLoansData } = useQuery({
    queryKey: ['allLoansForTrends'],
    queryFn: async () => {
      const response = await loansApi.list({ limit: 1000 });
      return response.data?.loans || [];
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
  });

  const isLoading = isDashboardLoading || isHighRiskLoading || isPendingLoading || isProductsLoading || isBudgetsLoading;

  // Format data from API
  const totalLoans = dashboardData?.data?.totalLoans || 0;
  const outstandingBalance = dashboardData?.data?.outstandingBalance || 0;
  const nplRatio = dashboardData?.data?.nplRatio || 0;
  const pendingApprovals = dashboardData?.data?.pendingApprovals || 0;
  const collectionRate = dashboardData?.data?.collectionRate || 0;
  const highRiskCount = dashboardData?.data?.highRiskLoans || 0;

  // Calculate trends from historical data
  const calculateTrend = (currentValue: number, previousValue: number): { percentage: string; isUp: boolean } => {
    if (previousValue === 0) return { percentage: 'N/A', isUp: true };
    const change = ((currentValue - previousValue) / previousValue) * 100;
    return {
      percentage: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
      isUp: change >= 0,
    };
  };

  // Calculate loan count trend (current month vs last month)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthLoans = (allLoansData || []).filter((loan: any) => {
    const loanDate = new Date(loan.createdAt);
    return loanDate.getMonth() === currentMonth && loanDate.getFullYear() === currentYear;
  }).length;

  const lastMonthLoans = (allLoansData || []).filter((loan: any) => {
    const loanDate = new Date(loan.createdAt);
    return loanDate.getMonth() === lastMonth && loanDate.getFullYear() === lastMonthYear;
  }).length;

  const loansTrend = calculateTrend(currentMonthLoans, lastMonthLoans);

  // Calculate outstanding balance trend (current month vs last month)
  const currentMonthBalance = (allLoansData || [])
    .filter((loan: any) => {
      const loanDate = new Date(loan.createdAt);
      return loanDate.getMonth() === currentMonth && loanDate.getFullYear() === currentYear;
    })
    .reduce((sum: number, loan: any) => sum + (loan.outstandingBalance || 0), 0);

  const lastMonthBalance = (allLoansData || [])
    .filter((loan: any) => {
      const loanDate = new Date(loan.createdAt);
      return loanDate.getMonth() === lastMonth && loanDate.getFullYear() === lastMonthYear;
    })
    .reduce((sum: number, loan: any) => sum + (loan.outstandingBalance || 0), 0);

  const balanceTrend = calculateTrend(currentMonthBalance, lastMonthBalance);

  // Calculate SVG circle values
  const circumference = 2 * Math.PI * 80;
  const healthPercentage = 100 - Math.min(nplRatio, 100); // Good loans percentage
  const offset = circumference * (Math.min(nplRatio, 100) / 100); // Show NPL portion

  // KPI Stats
  const stats = [
    {
      title: 'สินเชื่อทั้งหมด',
      value: `${totalLoans} รายการ`,
      icon: <Wallet className="h-5 w-5 text-white" />,
      change: loansTrend.percentage,
      isUp: loansTrend.isUp,
    },
    {
      title: 'ยอดค้างชำระ',
      value: `฿${(outstandingBalance / 1000000).toFixed(2)}M`,
      icon: <TrendingDown className="h-5 w-5 text-white" />,
      change: balanceTrend.percentage,
      isUp: balanceTrend.isUp,
    },
    {
      title: 'อัตราการปล่อยสินเชื่อ',
      value: `${collectionRate.toFixed(1)}%`,
      icon: <TrendingUp className="h-5 w-5 text-white" />,
      change: collectionRate < 10 ? 'ต่ำกว่าเป้า' : `${collectionRate > 80 ? '+' : ''}${(collectionRate - 80).toFixed(1)}%`,
      isUp: collectionRate >= 50, // More realistic threshold
    },
  ];

  // High Risk Loans
  const highRiskLoans = (highRiskLoansData || []).map((loan: any) => ({
    name: loan.customer?.businessName || 'ไม่ระบุ',
    amount: `฿${Number(loan.outstandingBalance || 0).toLocaleString()}`,
    days: `${loan.overdueDays || 0} วัน`,
    dscr: loan.dscr != null && !isNaN(Number(loan.dscr)) ? Number(loan.dscr).toFixed(2) : 'N/A',
  }));

  // Pending Approvals - Show both pending and approved (not disbursed yet)
  const approvals = (pendingApprovalsData?.loans || []).slice(0, 5).map((loan: any) => ({
    type: loan.status === 'PENDING_APPROVAL' ? 'รออนุมัติ' : 'อนุมัติแล้ว (รอเบิกจ่าย)',
    user: loan.customer?.businessName || 'ไม่ระบุ',
    amount: `฿${Number(loan.principal || loan.amount || 0).toLocaleString()}`,
    status: loan.status,
    id: loan.id,
  }));

  // Officer Performance - Use real data from dashboard API
  const performance = dashboardData?.data?.officerPerformance || [];

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handle view product details
  const handleViewProduct = useCallback((product: LoanProduct) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'หน้าหลัก' }, { label: 'Dashboard ผู้จัดการสาขา' }]}>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: 'หน้าหลัก' }, { label: 'Dashboard ผู้จัดการสาขา' }]}>
      {/* Dashboard Content */}
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl text-white font-bold">
            Dashbord Mornitoring
          </h1>
          <p className="text-white">ข้อมูลและภาพรวมสถานะของระบบ</p>
        </div>
        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
            >
              {/* Wave Background */}
              <div className={`absolute bottom-0 ${idx % 2 === 0 ? 'left-0' : 'right-0'} w-full h-full pointer-events-none overflow-hidden select-none`}>
                <svg viewBox="0 0 400 200" className={`absolute bottom-0 ${idx % 2 === 0 ? 'left-0 w-[140%] -translate-x-10' : 'right-0 w-[140%] scale-x-[-1] translate-x-10'} h-full opacity-50 translate-y-6`} preserveAspectRatio="none">
                  <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-10" />
                  <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-20" />
                  <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-40" />
                </svg>
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div className="p-3 rounded-xl bg-primary shadow-lg shadow-[#00A950]/20">
                    {stat.icon}
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                      stat.isUp
                        ? 'text-emerald-600 bg-emerald-50'
                        : 'text-rose-600 bg-rose-50'
                    }`}
                  >
                    {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-slate-500 text-sm font-medium">{stat.title}</p>
                  <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Grid: Risk & Performance */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Risk Management (NPL Gauge) */}
          <div className="xl:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold flex items-center gap-2 text-rose-600">
                <AlertCircle size={18} /> อัตราส่วน NPL
              </h2>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreVertical size={18} />
              </button>
            </div>
            <div className="flex flex-col items-center py-4">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Background circle (light gray) */}
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke="#F1F5F9"
                    strokeWidth="12"
                    fill="transparent"
                  />
                  {/* Health circle - shows "good" percentage (100% - NPL) */}
                  <circle
                    cx="96"
                    cy="96"
                    r="80"
                    stroke={nplRatio > 5 ? '#E53E3E' : nplRatio > 3 ? '#F59E0B' : '#10B981'}
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 80}`}
                    strokeDashoffset={`${2 * Math.PI * 80 * (Math.min(nplRatio, 100) / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold">{nplRatio.toFixed(1)}%</span>
                  <span className="text-xs text-slate-400 font-medium">NPL Ratio</span>
                </div>
              </div>
              <div className="mt-6 flex gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> ดี (&lt;3%)
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> เฝ้าระวัง (3-5%)
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> วิกฤต (&gt;5%)
                </div>
              </div>
            </div>
          </div>

          {/* High Risk Loans List */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center flex-shrink-0">
              <h2 className="font-bold flex items-center gap-2">
                <TrendingUp size={18} className="text-rose-500" /> 
              </h2>
              <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {highRiskLoans.length || highRiskCount} รายการ
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              {highRiskLoans.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">ชื่อบริษัท/ลูกค้า</th>
                      <th className="px-6 py-4">ยอดหนี้</th>
                      <th className="px-6 py-4">ค้างชำระ</th>
                      <th className="px-6 py-4 text-center">DSCR</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {highRiskLoans.map((loan, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-semibold text-sm">{loan.name}</td>
                        <td className="px-6 py-4 text-sm">{loan.amount}</td>
                        <td className="px-6 py-4 text-sm text-rose-500 font-medium">{loan.days}</td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold ${
                              Number(loan.dscr) < 1
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {loan.dscr}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-[#00A950] font-bold text-xs hover:underline">
                            จัดการ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <CheckCircle2 size={48} className="mb-2" />
                  <p className="text-sm font-medium">ไม่มีสินเชื่อความเสี่ยงสูง</p>
                </div>
              )}
            </div>
          </div>

          
        </div>
{/* Product Loan List and Budget */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[400px]">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center flex-shrink-0">
              <h2 className="font-bold flex items-center gap-2">
                <Package size={18} className="text-blue-500" /> สินเชื่อที่เปิดใช้งาน
              </h2>
              <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
                {loanProducts?.length || 0} รายการ
              </span>
            </div>
            <div className="flex-1 overflow-auto">
              {loanProducts && loanProducts.length > 0 ? (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <th className="px-6 py-4">ชื่อสินเชื่อ</th>
                      <th className="px-6 py-4">รหัสสินเชื่อ</th>
                      <th className="px-6 py-4 text-right">งบประมาณ</th>
                      <th className="px-6 py-4 text-right">งบคงเหลือ</th>
                      <th className="px-6 py-4 text-center">สถานะ</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loanProducts.map((product) => {
                      const budget = productBudgets?.[product.id];
                      const totalBudget = budget ? Number(budget.total_budget_amount || 0) : (product.totalProjectBudget || 0);
                      const disbursedAmount = budget ? Number(budget.disbursed_amount || 0) : 0;
                      const committedAmount = budget ? Number(budget.committed_amount || 0) : 0;
                      const availableAmount = budget ? Number(budget.available_amount || 0) : totalBudget;
                      const usagePercent = budget ? Number(budget.utilization_rate || 0) : 0;

                      return (
                        <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-semibold text-sm">{product.productName}</p>
                              <div className="flex gap-2 mt-1">
                                {product.isPopular && (
                                  <Badge className="bg-amber-100 text-amber-700 text-xs">ยอดนิยม</Badge>
                                )}
                                {!budget && (
                                  <Badge variant="destructive" className="text-xs">
                                    ยังไม่กำหนดงบประมาณ
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm text-slate-600">{product.productCode}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-semibold">
                              {budget ? (totalBudget > 0 ? formatCurrency(totalBudget) : 'ไม่จำกัด') : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {budget ? (
                              <div className="space-y-1">
                                <span className={`text-sm font-semibold ${
                                  usagePercent > 90 ? 'text-rose-600' : 
                                  usagePercent > 70 ? 'text-amber-600' : 'text-emerald-600'
                                }`}>
                                  {totalBudget > 0 ? formatCurrency(availableAmount) : 'ไม่จำกัด'}
                                </span>
                                {totalBudget > 0 && (
                                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden ml-auto">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        usagePercent > 90 ? 'bg-rose-500' : 
                                        usagePercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${Math.max(0, 100 - usagePercent)}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600">
                              เปิดใช้งาน
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleViewProduct(product)}
                              className="inline-flex items-center gap-1 text-[#00A950] font-bold text-xs hover:underline"
                            >
                              <Eye size={14} />
                              ดูรายละเอียด
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Package size={48} className="mb-2" />
                  <p className="text-sm font-medium">ไม่มีสินเชื่อที่เปิดใช้งาน</p>
                </div>
              )}
            </div>
          </div>
           {/* Product Loan List and Budget คงเหลือของแต่ละอัน */}
        {/* Bottom Grid: Approvals & Staff */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Approval Queue */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center flex-shrink-0">
              <h2 className="font-bold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#00A950]" /> รายการรออนุมัติ & เบิกจ่าย
              </h2>
              <Badge className="bg-[#00A950]">{approvals.length}</Badge>
            </div>
            <div className="p-2 space-y-1 overflow-auto flex-1">
              {approvals.length > 0 ? (
                approvals.map((item, i) => (
                  <div
                    key={item.id || i}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:bg-white group-hover:shadow-sm ${
                        item.status === 'PENDING_APPROVAL' 
                          ? 'bg-amber-100 text-amber-600' 
                          : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{item.type}</p>
                        <p className="text-xs text-slate-500">{item.user}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div className="hidden sm:block">
                        <p className="text-sm font-semibold">{item.amount}</p>
                        {item.status === 'APPROVED' && (
                          <p className="text-xs text-emerald-600">✓ อนุมัติแล้ว</p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <CheckCircle2 size={48} className="mb-2" />
                  <p className="text-sm font-medium">ไม่มีรายการรออนุมัติหรือเบิกจ่าย</p>
                </div>
              )}
            </div>
            {approvals.length > 0 && (
              <div className="p-4 border-t border-slate-50 text-center flex-shrink-0">
                <button 
                  className="text-sm font-semibold text-[#00A950] hover:text-[#008e43]"
                  onClick={() => window.location.href = '/loans'}
                >
                  ดูทั้งหมด ({approvals.length} รายการ)
                </button>
              </div>
            )}
          </div>

          {/* Performance */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="font-bold flex items-center gap-2 mb-6">
              <Users size={18} className="text-indigo-500" /> ผลงานการปล่อยสินเชื่อของเจ้าหน้าที่
            </h2>
            <div className="space-y-6">
              {performance.length > 0 ? (
                performance.map((staff: any, i: number) => (
                  <div key={staff.id || i} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">0{i + 1}</span>
                        <span className="text-sm font-semibold">{staff.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold">
                          {staff.loanCount || 0} สัญญา
                        </span>
                        <span className="text-xs text-slate-400 mx-1">•</span>
                        <span className="text-xs font-bold">
                          ฿{(staff.current || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#00A950] to-[#5FC48F] rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min(((staff.current || 0) / (staff.target || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">
                        {staff.percentage || 0}% ของเป้าหมาย
                      </span>
                      <span className={`font-bold ${
                        (staff.percentage || 0) >= 100 ? 'text-emerald-600' : 
                        (staff.percentage || 0) >= 80 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {(staff.percentage || 0) >= 100 ? 'เกินเป้า' : 
                         (staff.percentage || 0) >= 80 ? 'ใกล้เป้า' : 'ต่ำกว่าเป้า'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Users size={48} className="mb-2" />
                  <p className="text-sm font-medium">ไม่มีข้อมูลเจ้าหน้าที่</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trend & Alerts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Alerts */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm ">
            <h2 className="font-bold flex items-center gap-2 mb-4">
              <Bell size={18} className="text-amber-500" /> แจ้งเตือนประจำวัน
            </h2>
            <div className="space-y-4">
              {collectionRate < 10 && (
                <AlertItem
                  title={`อัตราการปล่อยสินเชื่อต่ำ (${collectionRate.toFixed(1)}%) - ต้องเร่งดำเนินการ`}
                  time={new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  type="warning"
                />
              )}
              {highRiskCount > 0 && (
                <AlertItem
                  title={`มีสินเชื่อความเสี่ยงสูง ${highRiskCount} รายการ`}
                  time={new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  type="danger"
                />
              )}
              {nplRatio > 5 && (
                <AlertItem
                  title={`อัตราส่วน NPL สูงกว่าเกณฑ์ (${nplRatio.toFixed(1)}%)`}
                  time={new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  type="warning"
                />
              )}
              {pendingApprovals > 0 && (
                <AlertItem
                  title={`มีรายการรออนุมัติ ${pendingApprovals} รายการ`}
                  time={new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  type="info"
                />
              )}
              {highRiskCount === 0 && nplRatio <= 5 && pendingApprovals === 0 && collectionRate >= 10 && (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <CheckCircle2 size={48} className="mb-2 text-emerald-500" />
                  <p className="text-sm font-medium">ไม่มีการแจ้งเตือน</p>
                </div>
              )}
            </div>
          </div>

          {/* Trend Chart (CSS based mock) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold flex items-center gap-2">
                <TrendingUp size={18} className="text-[#00A950]" /> แนวโน้มการปล่อยสินเชื่อ 90 วัน
              </h2>
              <div className="flex gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Jan</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Feb</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Mar</span>
              </div>
            </div>
            <div className="flex-1 min-h-[140px] relative flex items-end justify-between px-2 pb-6 border-b border-slate-100">
              {/* Visual Chart Bars Mockup */}
              {[40, 65, 55, 85, 75, 95, 80, 100, 90, 110, 105, 120].map((h, i) => (
                <div
                  key={i}
                  className="w-full mx-0.5 group relative flex flex-col items-center justify-end h-full"
                >
                  <div
                    className="w-full bg-[#00A950]/10 rounded-t-sm group-hover:bg-[#00A950] transition-all duration-300"
                    style={{ height: `${h}%` }}
                  ></div>
                </div>
              ))}
              {/* Line overlay mock */}
              <div className="absolute inset-0 top-1/2 border-t border-dashed border-slate-200 pointer-events-none"></div>
            </div>
            <div className="mt-4 flex justify-between items-center text-xs">
              <p className="text-slate-400">จำนวนสินเชื่อที่อนุมัติ (รายเดือน)</p>
              <p className="text-sm font-bold text-[#00A950]">
                {collectionRate < 10 
                  ? `ปล่อยได้ ฿${(outstandingBalance * collectionRate / 100 / 1000).toFixed(0)}K` 
                  : `${collectionRate > 80 ? '+' : ''}${(collectionRate - 80).toFixed(1)}% Growth`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-auto py-6 px-8 text-center text-slate-400 text-xs">
        © 2026 SME D BANK System. All rights reserved. Confidential Information.
      </footer>

      {/* Product Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Package className="text-[#00A950]" />
              รายละเอียดสินเชื่อ
            </DialogTitle>
            <DialogDescription>
              ข้อมูลรายละเอียดและเงื่อนไขของสินเชื่อ
            </DialogDescription>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-6 py-4">
              {/* Header Info */}
              <div className="bg-gradient-to-br from-[#00A950] to-[#5FC48F] text-white p-6 rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{selectedProduct.productName}</h3>
                    <p className="text-white/80 text-sm">{selectedProduct.productNameEn}</p>
                    <div className="flex gap-2 mt-3">
                      <Badge className="bg-white/20 text-white border-white/30">
                        {selectedProduct.productCode}
                      </Badge>
                      {selectedProduct.isPopular && (
                        <Badge className="bg-amber-500 text-white">ยอดนิยม</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white/80 text-xs mb-1">งบประมาณทั้งหมด</p>
                    <p className="text-2xl font-bold">
                      {selectedProduct.totalProjectBudget 
                        ? formatCurrency(selectedProduct.totalProjectBudget)
                        : 'ไม่จำกัด'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedProduct.description && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-600 mb-2">รายละเอียด</h4>
                  <p className="text-sm text-slate-700">{selectedProduct.description}</p>
                </div>
              )}

              {/* Loan Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">วงเงินกู้ขั้นต่ำ</p>
                  <p className="font-semibold">
                    {selectedProduct.minLoanAmount 
                      ? formatCurrency(selectedProduct.minLoanAmount)
                      : 'ไม่กำหนด'}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">วงเงินกู้สูงสุด</p>
                  <p className="font-semibold">{formatCurrency(selectedProduct.maxLoanAmount)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">ระยะเวลากู้สูงสุด</p>
                  <p className="font-semibold">{selectedProduct.maxTermMonths} เดือน</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-500 mb-1">ระยะเวลาปลอดชำระ</p>
                  <p className="font-semibold">
                    {selectedProduct.gracePeriodMonths || 0} เดือน
                  </p>
                </div>
              </div>

              {/* Interest Rate */}
              <div>
                <h4 className="font-semibold text-sm text-slate-600 mb-3">อัตราดอกเบี้ย</h4>
                <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">ประเภท:</span>
                    <Badge className="bg-blue-600">
                      {selectedProduct.interestRateType === 'FIXED' ? 'คงที่' :
                       selectedProduct.interestRateType === 'VARIABLE' ? 'ลอยตัว' :
                       selectedProduct.interestRateType === 'MIXED' ? 'ผสม' : 'แบ่งชั้น'}
                    </Badge>
                  </div>
                  {selectedProduct.interestRateYear1_3 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">ปีที่ 1-3:</span>
                      <span className="font-semibold">{selectedProduct.interestRateYear1_3}% ต่อปี</span>
                    </div>
                  )}
                  {selectedProduct.interestRateYear4Plus && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">ปีที่ 4+:</span>
                      <span className="font-semibold">{selectedProduct.interestRateYear4Plus}% ต่อปี</span>
                    </div>
                  )}
                  {selectedProduct.governmentSubsidy && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <Badge className="bg-emerald-500 text-white">มีเงินอุดหนุนจากรัฐ</Badge>
                      {selectedProduct.subsidyDetails && (
                        <p className="text-xs text-slate-600 mt-1">{selectedProduct.subsidyDetails}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Collateral */}
              <div>
                <h4 className="font-semibold text-sm text-slate-600 mb-3">หลักประกัน</h4>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {selectedProduct.collateralRequired ? (
                      <Badge className="bg-amber-500">ต้องมีหลักประกัน</Badge>
                    ) : (
                      <Badge className="bg-emerald-500">ไม่ต้องมีหลักประกัน</Badge>
                    )}
                  </div>
                  {selectedProduct.collateralDetails && (
                    <p className="text-sm text-slate-700 mt-2">{selectedProduct.collateralDetails}</p>
                  )}
                </div>
              </div>

              {/* Target Business */}
              {selectedProduct.targetBusiness && selectedProduct.targetBusiness.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-600 mb-3">กลุ่มธุรกิจเป้าหมาย</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.targetBusiness.map((business, idx) => (
                      <Badge key={idx} className="bg-slate-100 text-slate-700">
                        {business}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits */}
              {selectedProduct.benefits && selectedProduct.benefits.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm text-slate-600 mb-3">สิทธิประโยชน์</h4>
                  <ul className="space-y-2">
                    {selectedProduct.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Project Period */}
              {(selectedProduct.projectStartDate || selectedProduct.projectEndDate) && (
                <div className="bg-amber-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm text-amber-800 mb-2">ระยะเวลาโครงการ</h4>
                  <div className="flex gap-4 text-sm">
                    {selectedProduct.projectStartDate && (
                      <div>
                        <span className="text-amber-600">เริ่ม: </span>
                        <span className="font-semibold">
                          {new Date(selectedProduct.projectStartDate).toLocaleDateString('th-TH')}
                        </span>
                      </div>
                    )}
                    {selectedProduct.projectEndDate && (
                      <div>
                        <span className="text-amber-600">สิ้นสุด: </span>
                        <span className="font-semibold">
                          {new Date(selectedProduct.projectEndDate).toLocaleDateString('th-TH')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
