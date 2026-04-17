import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { dashboardApi } from '@/shared/lib/api-endpoints';
import { apiClient } from '@/shared/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { DashboardSkeleton } from '@/shared/components/skeletons';
import { loanProductsApi, type LoanProduct } from '@/features/approvals/api/loan-products.api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  AlertCircle,
  Calendar,
  Bell,
  MessageSquare,
  TrendingUp,
  Clock,
  UserCheck,
  ArrowUpRight,
  Filter,
  Inbox,
  CalendarX,
  UserX,
  Package,
  Eye,
  CheckCircle2,
} from 'lucide-react';

// K-Bank Branding Colors
const K_GREEN = "#0065fbff";

// Dashboard data interface matching component expectations
interface DashboardData {
  kpis?: {
    totalBalance?: number;
    totalDebtors?: number;
    monthlyTarget?: number;
    overdueLoans?: number;
    [key: string]: unknown;
  };
  todayTasks?: Array<{ id?: string; name: string; action: string; time: string }>;
  recentActivities?: Array<{ id: number; type: string; message: string; time: string; amount?: string; count?: string }>;
  portfolio?: {
    totalOutstanding?: number;
    total?: number;
    [key: string]: unknown;
  };
  collectionAchieved?: number;
  collectionTarget?: number;
  overdueLoans?: Array<unknown>;
  uncontactedCustomers?: Array<unknown>;
  pendingPayments?: number;
  successRate?: number;
  [key: string]: unknown;
}

export default function LoanOfficerDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch loan officer dashboard data with auto-refresh every 30 seconds
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['loanOfficerDashboard'],
    queryFn: () => dashboardApi.getLoanOfficerDashboard(),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchIntervalInBackground: false, // Only refresh when tab is active
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

  const data = dashboardData?.data as DashboardData | undefined;
  const stats = data?.kpis || null;
  const todayTasks = data?.todayTasks || [];
  const recentActivities = data?.recentActivities || [];

  // Handle both API response formats
  const totalBalance = stats?.totalBalance || data?.portfolio?.totalOutstanding || 0;
  const totalDebtors = stats?.totalDebtors || data?.portfolio?.total || 0;
  const monthlyCollection = data?.collectionAchieved || 0;
  const monthlyGoal = stats?.monthlyTarget || data?.collectionTarget || 500000;
  const overdueCount = stats?.overdueLoans || data?.overdueLoans?.length || 0;
  const notContacted = data?.uncontactedCustomers?.length || 0;
  const pendingPayments = data?.pendingPayments || 0;

  const collectionProgress = monthlyGoal > 0 ? (monthlyCollection / monthlyGoal * 100) : 0;
  const successRate = data?.successRate || 0;

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

  if (isLoading || isProductsLoading || isBudgetsLoading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'หน้าหลัก' }, { label: 'Dashboard เจ้าหน้าที่' }]}>
        <DashboardSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={[{ label: 'หน้าหลัก' }, { label: 'Dashboard เจ้าหน้าที่' }]}>
      <div className="space-y-6 ">
        <div>
          <h1 className="text-2xl text-white font-bold">
            Dashbord Mornitoring
          </h1>
          <p className="text-white">ข้อมูลและภาพรวมของพอร์ตคุณ Real-time | {currentTime.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main Balance Card (Primary Green) */}
          <Card className="md:col-span-8 shadow-sm overflow-hidden relative">
            {/* Wave Background */}
            <div className="absolute bottom-0 left-0 w-3/5 h-full pointer-events-none overflow-hidden select-none">
              <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-10" />
                <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-20" />
                <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-40" />
              </svg>
            </div>
            
            <div className="flex flex-col md:flex-row relative z-10">
              <div className="p-8 md:w-3/5 flex flex-col justify-between">
                <div>
                  <h3 className="text-muted-foreground text-sm font-medium mb-1">ยอดหนี้ทั้งหมดในพอร์ต</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold tracking-tight">฿{totalBalance.toLocaleString()}</span>
                    <Badge variant="default" className="bg-success text-white flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> +2.4%
                    </Badge>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="text-center md:text-left">
                    <p className="text-xs text-muted-foreground mb-1">จำนวนลูกหนี้</p>
                    <p className="text-lg font-bold">{totalDebtors}</p>
                  </div>
                  <div className="text-center md:text-left border-x border-border px-4">
                    <p className="text-xs text-muted-foreground mb-1">ปล่อยแล้ว (เดือนนี้)</p>
                    <p className="text-lg font-bold">฿{monthlyCollection.toLocaleString()}</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-xs text-muted-foreground mb-1">รอการอนุมัติ</p>
                    <p className="text-lg font-bold">{pendingPayments}</p>
                  </div>
                </div>
              </div>
              <div className="p-8 md:w-2/5 flex flex-col justify-center items-center text-white relative bg-primary">
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 w-40 h-40 border-8 border-white rounded-full"></div>
                  <div className="absolute left-10 top-10 w-20 h-20 border-4 border-white rounded-full"></div>
                </div>
                <div className="relative text-center">
                  <p className="text-sm font-medium opacity-80 mb-2">เป้าหมายการปล่อยสินเชื่อ</p>
                  <div className="w-28 h-28 rounded-full border-4 border-white/20 flex items-center justify-center mb-4 mx-auto">
                    <span className="text-2xl font-bold">{Math.round(collectionProgress)}%</span>
                  </div>
                  <p className="text-xs opacity-70">เป้าเดือนนี้: ฿{(monthlyGoal / 1000).toLocaleString()}K</p>
                  <Button variant="secondary" size="sm" className="mt-4 text-xs font-bold" style={{ backgroundColor: 'white', color: K_GREEN }}>
                    ดูรายละเอียดเป้าหมาย
                  </Button>
                </div>
              </div>
            </div>
          </Card>

            <Card className="md:col-span-4 shadow-sm border-destructive/20 relative overflow-hidden">
            {/* Wave Background */}
            <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
              <svg viewBox="0 0 400 200" className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6" preserveAspectRatio="none">
                <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-destructive opacity-10" />
                <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-destructive opacity-20" />
                <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-destructive opacity-40" />
              </svg>
            </div>
            
            <CardContent className="pt-6 flex flex-col justify-between h-full relative z-10">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-destructive/10 rounded-2xl">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                {overdueCount > 0 && <Badge variant="destructive" className="text-[10px] font-bold">URGENT</Badge>}
              </div>
              <div>
                <h3 className="text-2xl font-bold mt-4">{overdueCount} ราย</h3>
                <p className="text-muted-foreground text-sm mt-1">ลูกหนี้ค้างชำระเกินกำหนด (NPL/Warning)</p>
              </div>
              <Button variant="outline" className="mt-6 w-full border-destructive/20 text-destructive hover:bg-destructive/10 flex items-center justify-center gap-2">
                จัดการรายการค้างชำระ
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Action List (Daily Tasks) */}
          <Card className="md:col-span-4 shadow-sm bg-primary text-white overflow-hidden relative group">
            <CardContent className="pt-6 relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-5 h-5 bg-primary" />
                <h3 className="font-bold">งานที่ต้องทำวันนี้</h3>
              </div>

              {todayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CalendarX className="w-16 h-16 text-white/30 mb-4" />
                  <p className="text-sm text-white/70">ไม่มีงานที่ต้องทำวันนี้</p>
                  <p className="text-xs text-white/50 mt-2">สร้างกิจกรรมใหม่ในปฏิทิน</p>
                </div>
              ) : (
                <ScrollArea className="h-[180px]">
                  <div className="space-y-4">
                    {todayTasks.map((task, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 text-white hover:text-white rounded-xl hover:bg-white/10 border border-white/50 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-xs font-bold">{task.name}</p>
                            <p className="text-[10px] text-gray-200">{task.action}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-gray-200">{task.time}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <Button variant="ghost" className="mt-6 w-full text-ms font-bold hover:text-gray-700 text-white ">
                ดูตารางงานทั้งหมด
              </Button>
            </CardContent>
            {/* Abstract background shape */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" style={{ backgroundColor: `${K_GREEN}1A` }}></div>
          </Card>

          {/* Real-time Feed (Notifications) */}
          <Card className="md:col-span-5 shadow-sm flex flex-col">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="w-4 h-4" style={{ color: K_GREEN }} />
                กิจกรรมล่าสุด
              </CardTitle>
              <Filter className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
            </CardHeader>
            <CardContent className="p-4 flex-grow">
              {recentActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[180px] text-center">
                  <Inbox className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground">ยังไม่มีกิจกรรม</p>
                  <p className="text-xs text-muted-foreground/70 mt-2">กิจกรรมจะแสดงที่นี่เมื่อมีการทำรายการ</p>
                </div>
              ) : (
                <ScrollArea className="h-[180px]">
                  <div className="space-y-2">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex gap-4 p-3 hover:bg-muted/50 rounded-2xl transition-all border border-transparent hover:border-border">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${activity.type === 'payment' ? 'bg-success/10' : ''
                          }`} style={activity.type !== 'payment' ? { backgroundColor: `${K_GREEN}1A` } : {}}>
                          {activity.type === 'payment' ? (
                            <MessageSquare className="w-5 h-5 text-success" />
                          ) : (
                            <UserCheck className="w-5 h-5" style={{ color: K_GREEN }} />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold">{activity.message}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {activity.time} {activity.amount && `• ${activity.amount}`} {activity.count && `• ${activity.count}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
            <div className="p-4 pt-0">
              <Button
                variant="secondary"
                className="w-full text-ms font-bold hover:bg-gray-500 hover:text-white bg-primary text-white"
              >
                ประวัติกิจกรรมทั้งหมด
              </Button>
            </div>
          </Card>

          {/* Small Metric Cards */}
          <div className="md:col-span-3 grid grid-rows-2 gap-4">
            <Card className="shadow-sm relative overflow-hidden">
              {/* Wave Background */}
              <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
                <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                  <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-10" />
                  <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-20" />
                  <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-40" />
                </svg>
              </div>
              
              <CardContent className="pt-6 flex items-center gap-4 relative z-10">
                {notContacted === 0 ? (
                  <div className="flex flex-col items-center justify-center w-full text-center py-2">
                    <UserX className="w-12 h-12 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">ไม่มีรายการรอติดต่อ</p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6" style={{ color: K_GREEN }} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">รอการติดต่อ</p>
                      <p className="text-xl font-bold">{notContacted} เคส</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            <Card className="shadow-sm text-white bg-primary relative overflow-hidden">
              {/* Wave Background */}
              <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
                <svg viewBox="0 0 400 200" className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6" preserveAspectRatio="none">
                  <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-white opacity-10" />
                  <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-white opacity-20" />
                  <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-white opacity-40" />
                </svg>
              </div>
              
              <CardContent className="pt-6 flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-white/70 font-medium">อัตราสำเร็จ</p>
                  <p className="text-xl font-bold">
                    {successRate > 0 ? `${successRate}%` : '0%'}
                  </p>
                  {successRate === 0 && (
                    <p className="text-[10px] text-white/60 mt-0.5">ยังไม่มีการชำระในเดือนนี้</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

           
        </div>
{/* Product Loan List and Budget */}
          <div className="md:col-span-12 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
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
                  <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-sm z-10">
                    <tr className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
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
        {/* Footer Status Bar */}
        <Card className="shadow-sm">
          <CardContent className="py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: K_GREEN }}></div>
                SYSTEM ONLINE
              </div>
              <div className="h-4 w-[1px] bg-border hidden sm:block"></div>
              <div>LEDGER ENGINE: STABLE</div>
            </div>
            <p className="text-[10px] text-muted-foreground">© 2026 Kasikorn Ledger Tracking v2.5.0-flash</p>
          </CardContent>
        </Card>
      </div>

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
