import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { TableSkeleton } from '@/shared/components/skeletons';
import { useAuth } from '@/shared/contexts/AuthContext';
import { PaginationControls } from '@/shared/components/ui/pagination-controls';
import { usePagination } from '@/shared/hooks/usePagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  ArrowLeft,
  Building2,
  Users,
  FileText,
  TrendingUp,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { FormattedAmount } from '@/shared/components/FormattedAmount';
import { branchesApi, customersApi, loansApi } from '@/shared/lib/api-endpoints';
import { cn } from '@/shared/lib/utils';

// Backend types
type BackendBranch = {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  status: string;
  users?: BackendUser[];
  [key: string]: unknown;
};

type BackendUser = {
  id: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  email?: string;
  status?: string;
  _count?: { customers?: number; createdLoans?: number } | null;
  [key: string]: unknown;
};

type BackendLoan = {
  id: string;
  status?: string;
  outstandingBalance?: number | string;
  principal?: number | string;
  amount?: number | string; // legacy alias
  contractNumber?: string;
  contract_number?: string;
  customerName?: string;
  customer?: { businessName?: string } | null;
  officer?: { firstName?: string; lastName?: string } | null;
  [key: string]: unknown;
};

type BackendCustomer = {
  id: string;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  createdByName?: string;
  thaiId?: string;
  nationalId?: string; // alias
  phone?: string;
  mobilePhone?: string; // alias
  status?: string;
  _count?: { loans?: number };
  [key: string]: unknown;
};

export default function BranchProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentRole = user?.role;

  // Internal StatCard component for premium look
  const StatCard = ({
    title,
    value,
    icon: Icon,
    gradient,
    iconBg,
    iconColor,
    trend,
    trendUp,
  }: {
    title: string;
    value: React.ReactNode;
    icon: React.ElementType;
    gradient: string;
    iconBg: string;
    iconColor: string;
    trend?: string;
    trendUp?: boolean;
  }) => (
    <div className={`relative overflow-hidden rounded-2xl ${gradient} p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border border-white/20`}>
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
      </div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`${iconBg} p-3 rounded-xl shadow-lg`}>
            <Icon className={`h-6 w-6 ${iconColor}`} strokeWidth={2} />
          </div>
          {trend && (
            <div className="flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-lg">
              {trendUp ? (
                <ArrowUpRight className="h-3 w-3 text-white" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-white" />
              )}
              <span className="text-xs font-semibold text-white">{trend}</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-white/80 tracking-wide">{title}</p>
          <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
        </div>
      </div>
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
    </div>
  );
  const [activeTab, setActiveTab] = useState('overview');
  const customersPagination = usePagination({ initialPageSize: 20 });
  const loansPagination = usePagination({ initialPageSize: 20 });

  // Check permissions
  const canViewAllBranches = currentRole?.toUpperCase() === 'ADMIN';
  const canViewOwnBranch = currentRole?.toUpperCase() === 'MANAGER' && user?.branchId === id;
  const canViewOwnPortfolio = currentRole?.toUpperCase() === 'OFFICER' && user?.branchId === id;

  // Redirect if no permission (useEffect to avoid conditional hooks)
  useEffect(() => {
    if (!canViewAllBranches && !canViewOwnBranch && !canViewOwnPortfolio) {
      navigate('/dashboard');
    }
  }, [canViewAllBranches, canViewOwnBranch, canViewOwnPortfolio, navigate]);

  // Fetch branch details with stats
  const { data: branchResponse, isLoading, error: branchError } = useQuery({
    queryKey: ['branch', id],
    queryFn: async () => {
      if (!id) throw new Error('Branch ID is required');
      const result = await branchesApi.getWithStats(id);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    enabled: !!id,
  });

  // Stats type
  type BranchStats = {
    collectionRate?: number;
    nplRatio?: number;
    totalAmount?: number;
    [key: string]: unknown;
  };

  const branchData = branchResponse?.branch;
  const stats = (branchResponse?.stats || {}) as BranchStats;

  // Fetch branch employees
  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ['branch-employees', id],
    queryFn: async () => {
      if (!id) throw new Error('Branch ID is required');
      const result = await branchesApi.getEmployees(id);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    enabled: !!id && (canViewAllBranches || canViewOwnBranch),
  });

  // Fetch branch customers (filtered by officer if loan_officer role)
  const { data: customersData, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['branch-customers', id, user?.id, customersPagination.page, customersPagination.pageSize],
    queryFn: async () => {
      if (!id) throw new Error('Branch ID is required');
      
      const filters: Record<string, string | number | undefined> = { branchId: String(id), ...customersPagination.getPaginationParams() };
      if (currentRole?.toUpperCase() === 'OFFICER') {
        filters.officerId = String(user?.id || '');
      }
      
      const result = await customersApi.list(filters);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    enabled: !!id,
  });

  // Fetch branch loans (filtered by officer if loan_officer role)
  const { data: loansData, isLoading: isLoadingLoans } = useQuery({
    queryKey: ['branch-loans', id, user?.id, loansPagination.page, loansPagination.pageSize],
    queryFn: async () => {
      if (!id) throw new Error('Branch ID is required');
      
      const filters: Record<string, string | number | undefined> = { branchId: String(id), ...loansPagination.getPaginationParams() };
      if (currentRole?.toUpperCase() === 'OFFICER') {
        filters.officerId = String(user?.id || '');
      }
      
      const result = await loansApi.list(filters);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    enabled: !!id,
  });

  // Loan statistics for accurate counts (avoid relying on paginated lists)
  const { data: loanStatsData } = useQuery({
    queryKey: ['branch-loan-stats', id, user?.id, currentRole],
    queryFn: async () => {
      if (!id) throw new Error('Branch ID is required');
      const params: Record<string, string | undefined> = {
        branchId: String(id),
        status: 'ACTIVE,DISBURSED,DEFAULTED,NPL',
      };
      if (currentRole?.toUpperCase() === 'OFFICER') {
        params.officerId = String(user?.id || '');
      }
      const result = await loansApi.getStatistics(params);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      ACTIVE: { label: 'ใช้งาน', className: 'bg-success/10 text-success' },
      INACTIVE: { label: 'ปิดใช้งาน', className: 'bg-muted text-muted-foreground' },
      PENDING: { label: 'รอดำเนินการ', className: 'bg-warning/10 text-warning' },
      APPROVED: { label: 'อนุมัติ', className: 'bg-success/10 text-success' },
      REJECTED: { label: 'ปฏิเสธ', className: 'bg-destructive/10 text-destructive' },
      DISBURSED: { label: 'เบิกจ่ายแล้ว', className: 'bg-info/10 text-info' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-muted text-muted-foreground' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'สาขา' }, { label: 'กำลังโหลด...' }]}>
        <TableSkeleton rows={5} columns={4} />
      </DashboardLayout>
    );
  }

  if (branchError || !branchData) {
    console.error('Branch Error:', branchError);
    return (
      <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'สาขา', href: '/branches' }]}>
        <div className="flex flex-col items-center justify-center py-12 ">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground mb-2">ไม่พบข้อมูลสาขา</p>
          <p className="text-sm text-muted-foreground mb-4">
            {branchError ? String(branchError) : 'ไม่สามารถโหลดข้อมูลสาขาได้'}
          </p>
          <Button onClick={() => navigate('/branches')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับไปหน้าสาขา
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  const branch = branchData as BackendBranch;
  const usersList = (branch?.users || []) as unknown as BackendUser[];
  const manager = usersList.find((u) => u.role === 'MANAGER');
  const officers = (employeesData || []) as unknown as BackendUser[];

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'Home' },
        { label: 'สาขา', href: '/branches' },
        { label: branch.name },
      ]} 
    >
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200/60">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 ">
          <Button variant="ghost" size="icon" onClick={() => navigate('/branches')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 ">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{branch?.name}</h1>
                <p className="text-sm text-muted-foreground">รหัสสาขา: {branch?.code}</p>
              </div>
            </div>
          </div>
          {getStatusBadge(branch?.status?.toUpperCase() || 'ACTIVE')}
        </div>

        {/* Branch Info Card */}
        <Card className="mb-8 border-slate-100 bg-slate-50/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">ที่อยู่</p>
                  <p className="font-medium">{branch?.address || '-'}</p>
                  {(branch as any)?.province && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {(branch as any)?.subdistrict ? `ต.${(branch as any)?.subdistrict} ` : ''}
                      {(branch as any)?.district ? `อ.${(branch as any)?.district} ` : ''}
                      {(branch as any)?.province ? `จ.${(branch as any)?.province} ` : ''}
                      {(branch as any)?.postalCode ? String((branch as any)?.postalCode) : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">เบอร์โทรศัพท์</p>
                  <p className="font-medium">{branch?.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">ผู้จัดการสาขา</p>
                  <p className="font-medium">
                    {manager ? `${manager.firstName} ${manager.lastName}` : '-'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={currentRole?.toUpperCase() === 'OFFICER' ? 'ลูกค้าของฉัน' : 'ลูกค้าทั้งหมด'}
            value={currentRole?.toUpperCase() === 'OFFICER' ? (customersData?.total || 0) : (stats.totalCustomers as number) || (customersData?.total || 0)}
            icon={Users}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            iconBg="bg-white/20 backdrop-blur-sm"
            iconColor="text-white"
            trend="+5%"
            trendUp={true}
          />
          <StatCard
            title={currentRole?.toUpperCase() === 'OFFICER' ? 'สัญญาของฉัน' : 'สัญญาทั้งหมด'}
            value={loanStatsData?.totalLoans || loansData?.total || 0}
            icon={FileText}
            gradient="bg-gradient-to-br from-emerald-500 to-emerald-600"
            iconBg="bg-white/20 backdrop-blur-sm"
            iconColor="text-white"
            trend="+12%"
            trendUp={true}
          />
          <StatCard
            title="สัญญาที่ใช้งาน"
            value={loanStatsData?.activeCount || (stats.activeLoans as number) || 0}
            icon={TrendingUp}
            gradient="bg-gradient-to-br from-cyan-500 to-cyan-600"
            iconBg="bg-white/20 backdrop-blur-sm"
            iconColor="text-white"
            trend="+18%"
            trendUp={true}
          />
          <StatCard
            title="ยอดคงค้าง"
            value={
              <FormattedAmount 
                amount={loanStatsData?.totalOutstanding || (stats.totalOutstanding as number) || 0}
                className="text-white border-none hover:border-none p-0 h-auto"
                showFullOnHover={false}
              />
            }
            icon={DollarSign}
            gradient="bg-gradient-to-br from-amber-500 to-amber-600"
            iconBg="bg-white/20 backdrop-blur-sm"
            iconColor="text-white"
            trend="+8%"
            trendUp={true}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-slate-100/50 p-1">
            <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
            {(canViewAllBranches || canViewOwnBranch) && <TabsTrigger value="employees">พนักงาน ({officers.length})</TabsTrigger>}
            <TabsTrigger value="customers">ลูกค้า ({customersData?.total || 0})</TabsTrigger>
            <TabsTrigger value="loans">สัญญา ({loansData?.total || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-xl overflow-hidden relative">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                </div>
                <CardHeader className="relative z-10 border-b border-white/10 pb-4">
                  <CardTitle className="text-white">สถิติสัญญา</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">สัญญาทั้งหมด</span>
                      <span className="font-bold text-white">{loansData?.total || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">กำลังใช้งาน</span>
                      <span className="font-bold text-emerald-400">{((loansData?.loans as unknown as BackendLoan[] || []).filter((l) => l.status === 'ACTIVE' || l.status === 'DISBURSED').length) || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">รอดำเนินการ</span>
                      <span className="font-bold text-amber-400">{((loansData?.loans as unknown as BackendLoan[] || []).filter((l) => l.status === 'PENDING').length) || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">ปิดแล้ว</span>
                      <span className="font-bold text-slate-500">{((loansData?.loans as unknown as BackendLoan[] || []).filter((l) => l.status === 'CLOSED').length) || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-xl overflow-hidden relative">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>
                <CardHeader className="relative z-10 border-b border-white/10 pb-4">
                  <CardTitle className="text-white">ประสิทธิภาพการทำงาน</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">อัตราการชำระ</span>
                      <span className="font-bold text-emerald-400">{stats.collectionRate || 0}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">NPL Ratio</span>
                      <span className={cn("font-bold", (Number(stats.nplRatio) || 0) < 3 ? "text-emerald-400" : "text-rose-400")}>
                        {stats.nplRatio || 0}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">ยอดเบิกจ่ายรวม</span>
                      <span className="font-bold text-white">
                        <FormattedAmount 
                          amount={stats.totalAmount || 0} 
                          className="text-white border-none hover:border-none p-0 h-auto"
                          showFullOnHover={false}
                        />
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {(canViewAllBranches || canViewOwnBranch) && (
            <TabsContent value="employees">
              <Card className="border-slate-100">
                <CardHeader>
                  <CardTitle>พนักงานในสาขา</CardTitle>
                  <CardDescription>รายชื่อพนักงานทั้งหมด</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-slate-100 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/50">
                          <TableHead>ชื่อ-นามสกุล</TableHead>
                          <TableHead>อีเมล</TableHead>
                          <TableHead>ตำแหน่ง</TableHead>
                          <TableHead className="text-center">ลูกค้า</TableHead>
                          <TableHead className="text-center">สัญญา</TableHead>
                          <TableHead className="text-center">สถานะ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingEmployees ? (
                          <TableRow>
                            <TableCell colSpan={6} className="p-0">
                              <TableSkeleton rows={5} columns={6} />
                            </TableCell>
                          </TableRow>
                        ) : officers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              ไม่พบข้อมูลพนักงาน
                            </TableCell>
                          </TableRow>
                        ) : (
                          officers.map((officer: BackendUser) => (
                            <TableRow key={officer.id}>
                              <TableCell>
                                <div className="font-medium">
                                  {officer.firstName} {officer.lastName}
                                </div>
                              </TableCell>
                              <TableCell>{officer.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {officer.role === 'MANAGER' ? 'ผู้จัดการ' : 'เจ้าหน้าที่'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">{(officer._count?.customers as number) || 0}</TableCell>
                              <TableCell className="text-center">{(officer._count?.createdLoans as number) || 0}</TableCell>
                              <TableCell className="text-center">{getStatusBadge(officer.status || '')}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="customers">
            <Card className="border-slate-100">
              <CardHeader>
                <CardTitle>{currentRole?.toUpperCase() === 'OFFICER' ? 'ลูกค้าของฉัน' : 'ลูกค้าในสาขา'}</CardTitle>
                <CardDescription>
                  {currentRole?.toUpperCase() === 'OFFICER' ? 'รายชื่อลูกค้าที่อยู่ภายใต้การดูแลของคุณ' : 'รายชื่อลูกค้าทั้งหมดในสาขา'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead>ชื่อ-นามสกุล</TableHead>
                        <TableHead>เลขบัตรประชาชน</TableHead>
                        <TableHead>เบอร์โทร</TableHead>
                        {(canViewAllBranches || canViewOwnBranch) && <TableHead>เจ้าหน้าที่</TableHead>}
                        <TableHead className="text-center">สัญญา</TableHead>
                        <TableHead className="text-center">สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingCustomers ? (
                        <TableRow>
                          <TableCell colSpan={6} className="p-0">
                            <TableSkeleton rows={5} columns={6} />
                          </TableCell>
                        </TableRow>
                      ) : (customersData?.customers as unknown as BackendCustomer[] || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">ไม่พบข้อมูลลูกค้า</TableCell>
                        </TableRow>
                      ) : (
                        (customersData?.customers as unknown as BackendCustomer[] || []).map((customer) => (
                          <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/customers/${customer.id}`)}>
                            <TableCell className="font-medium">
                              {customer.businessName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || '-'}
                            </TableCell>
                            <TableCell>{customer.thaiId || customer.nationalId || '-'}</TableCell>
                            <TableCell>{customer.phone || customer.mobilePhone || '-'}</TableCell>
                            {(canViewAllBranches || canViewOwnBranch) && (
                              <TableCell>
                                {customer.createdByName || '-'}
                              </TableCell>
                            )}
                            <TableCell className="text-center">{(customer._count?.loans as number) || 0}</TableCell>
                            <TableCell className="text-center">{getStatusBadge(String(customer.status || ''))}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {customersData && customersData.total > 0 && (
                  <PaginationControls
                    currentPage={customersPagination.page}
                    totalPages={customersData.totalPages || 1}
                    pageSize={customersPagination.pageSize}
                    totalItems={customersData.total || 0}
                    onPageChange={customersPagination.setPage}
                    onPageSizeChange={customersPagination.setPageSize}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loans">
            <Card className="border-slate-100">
              <CardHeader>
                <CardTitle>{currentRole?.toUpperCase() === 'OFFICER' ? 'สัญญาของฉัน' : 'สัญญาในสาขา'}</CardTitle>
                <CardDescription>{currentRole?.toUpperCase() === 'OFFICER' ? 'รายการสัญญาที่อยู่ภายใต้การดูแลของคุณ' : 'รายการสัญญาทั้งหมดในสาขา'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-slate-100 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead>เลขที่สัญญา</TableHead>
                        <TableHead>ลูกค้า</TableHead>
                        {(canViewAllBranches || canViewOwnBranch) && <TableHead>เจ้าหน้าที่</TableHead>}
                        <TableHead className="text-right">วงเงิน</TableHead>
                        <TableHead className="text-right">คงเหลือ</TableHead>
                        <TableHead className="text-center">สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingLoans ? (
                        <TableRow>
                          <TableCell colSpan={6} className="p-0">
                            <TableSkeleton rows={5} columns={6} />
                          </TableCell>
                        </TableRow>
                      ) : ((loansData?.loans as unknown as BackendLoan[] || []).length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">ไม่พบข้อมูลสัญญา</TableCell>
                        </TableRow>
                      ) : (
                        (loansData?.loans as unknown as BackendLoan[] || []).map((loan) => (
                          <TableRow key={loan.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/loans/${loan.id}`)}>
                            <TableCell className="font-medium">{loan.contractNumber || loan.contract_number || '-'}</TableCell>
                            <TableCell>{loan.customer?.businessName || loan.customerName || '-'}</TableCell>
                            {(canViewAllBranches || canViewOwnBranch) && <TableCell>{loan.officer ? `${loan.officer.firstName} ${loan.officer.lastName}` : '-'}</TableCell>}
                            <TableCell className="text-right">{formatCurrency(Number(loan.principal ?? loan.amount ?? 0))}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(loan.outstandingBalance || 0))}</TableCell>
                            <TableCell className="text-center">{getStatusBadge(String(loan.status))}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {loansData && loansData.total > 0 && (
                  <PaginationControls
                    currentPage={loansPagination.page}
                    totalPages={loansData.totalPages || 1}
                    pageSize={loansPagination.pageSize}
                    totalItems={loansData.total || 0}
                    onPageChange={loansPagination.setPage}
                    onPageSizeChange={loansPagination.setPageSize}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
