import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { usersApi, loansApi, paymentsApi, User, Loan, Payment } from '@/shared/lib/api-endpoints';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card';
import {
  Users,
  TrendingUp,
  Target,
  Wallet,
  FileText,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Edit,
  DollarSign,
  Percent,
  Calendar,
} from 'lucide-react';

type Officer = User;

interface OfficerStats {
  officerId: string;
  totalLoans: number;
  activeLoans: number;
  approvedLoans: number; // สินเชื่อที่อนุมัติในเดือนนี้
  totalDisbursed: number;
  disbursedThisMonth: number; // มูลค่าที่ปล่อยในเดือนนี้
  outstandingBalance: number;
  paymentsCollected: number;
  collectionRate: number;
  nplCount: number;
  overdueCount: number;
  monthlyTarget: number;
  targetAchievement: number;
}

export default function OfficerPerformance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedOfficer, setSelectedOfficer] = useState<Officer | null>(null);
  const [isTargetDialogOpen, setIsTargetDialogOpen] = useState(false);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [targetAmount, setTargetAmount] = useState('');

  // Fetch officers in the branch
  const { data: officersData, isLoading: isLoadingOfficers } = useQuery({
    queryKey: ['branchOfficers', user?.branchId],
    queryFn: async () => {
      const result = await usersApi.list({
        branchId: user?.branchId,
        role: 'OFFICER',
        status: 'ACTIVE',
        limit: 100,
      });
      return result.data;
    },
    enabled: !!user?.branchId,
  });

  // Fetch stats for each officer
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['officerStats', user?.branchId],
    queryFn: async () => {
      const officers = officersData?.users || [];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const statsPromises = officers.map(async (officer: Officer) => {
        // Get loans
        const loansResult = await loansApi.list({
          officerId: officer.id,
          limit: 1000,
        });
        const loans = loansResult.data?.loans || [];

        // Calculate stats
        const activeLoans = loans.filter((l: Loan) => l.status === 'ACTIVE');
        const totalDisbursed = loans
          .filter((l: Loan) => ['ACTIVE', 'DISBURSED', 'PAID_OFF'].includes(l.status))
          .reduce((sum: number, l: Loan) => sum + Number(l.principal || 0), 0);
        const outstandingBalance = activeLoans.reduce(
          (sum: number, l: Loan) => sum + Number(l.outstandingBalance || 0),
          0
        );
        const nplCount = loans.filter(
          (l: Loan) => l.status === 'NPL' || (l.status === 'ACTIVE' && (l.overdueDays || 0) >= 90)
        ).length;
        const overdueCount = loans.filter(
          (l: Loan) => l.status === 'ACTIVE' && (l.overdueDays || 0) > 0
        ).length;

        // Get approved loans this month (นับสินเชื่อที่อนุมัติในเดือนนี้)
        const approvedThisMonth = loans.filter((l: Loan) => {
          // Use disbursementDate if available, otherwise use createdAt
          const dateToCheck = l.disbursementDate || l.createdAt;
          if (!dateToCheck) return false;
          const approvedDate = new Date(dateToCheck);
          return approvedDate >= monthStart && approvedDate <= monthEnd &&
                 ['APPROVED', 'DISBURSED', 'ACTIVE'].includes(l.status);
        });
        
        const approvedLoansCount = approvedThisMonth.length;
        const disbursedThisMonth = approvedThisMonth.reduce(
          (sum: number, l: Loan) => sum + Number(l.principal || 0),
          0
        );

        // Get payments this month (for reference)
        const paymentsResult = await paymentsApi.list({
          loanId: loans.map((l: Loan) => l.id).join(','),
          startDate: monthStart.toISOString(),
          endDate: monthEnd.toISOString(),
          limit: 1000,
        });
        const payments = paymentsResult.data?.payments || [];
        const paymentsCollected = payments.reduce(
          (sum: number, p: Payment) => sum + Number(p.amount || 0),
          0
        );

        // Default target from user profile or 500,000 (for loan disbursement)
        const monthlyTarget = officer.monthlyTarget ? Number(officer.monthlyTarget) : 500000;
        const targetAchievement = monthlyTarget > 0 ? (disbursedThisMonth / monthlyTarget) * 100 : 0;
        const collectionRate = outstandingBalance > 0 ? (paymentsCollected / outstandingBalance) * 100 : 0;

        return {
          officerId: officer.id,
          totalLoans: loans.length,
          activeLoans: activeLoans.length,
          approvedLoans: approvedLoansCount,
          totalDisbursed,
          disbursedThisMonth,
          outstandingBalance,
          paymentsCollected,
          collectionRate: Math.min(collectionRate, 100),
          nplCount,
          overdueCount,
          monthlyTarget,
          targetAchievement: Math.round(targetAchievement),
        };
      });

      return Promise.all(statsPromises);
    },
    enabled: !!officersData?.users && officersData.users.length > 0,
  });

  const handleSetTarget = (officer: Officer) => {
    setSelectedOfficer(officer);
    const currentStats = statsData?.find((s: OfficerStats) => s.officerId === officer.id);
    setTargetAmount(currentStats?.monthlyTarget.toString() || '500000');
    setIsTargetDialogOpen(true);
  };

  const handleViewProfile = (officer: Officer) => {
    setSelectedOfficer(officer);
    setIsProfileDialogOpen(true);
  };

  const handleSaveTarget = async () => {
    if (!selectedOfficer || !targetAmount || Number(targetAmount) <= 0) {
      toast({
        title: 'ข้อมูลไม่ถูกต้อง',
        description: 'กรุณาระบุเป้าหมายที่ถูกต้อง',
        variant: 'destructive',
      });
      return;
    }

    try {
      await usersApi.update(selectedOfficer.id, {
        monthlyTarget: Number(targetAmount),
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['officerStats'] });
      queryClient.invalidateQueries({ queryKey: ['branchManagerDashboard'] });

      toast({
        title: 'บันทึกเป้าหมายสำเร็จ',
        description: `กำหนดเป้าหมาย ฿${Number(targetAmount).toLocaleString()} สำเร็จ`,
      });
      
      setIsTargetDialogOpen(false);
      setSelectedOfficer(null);
      setTargetAmount('');
    } catch (error: unknown) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: (error as Error).message || 'ไม่สามารถบันทึกเป้าหมายได้',
        variant: 'destructive',
      });
    }
  };

  const officers = officersData?.users || [];
  const isLoading = isLoadingOfficers || isLoadingStats;

  const getPerformanceBadge = (achievement: number) => {
    if (achievement >= 100) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          เกินเป้า
        </Badge>
      );
    } else if (achievement >= 80) {
      return (
        <Badge className="bg-amber-100 text-amber-700">
          <TrendingUp className="h-3 w-3 mr-1" />
          ใกล้เป้า
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-rose-100 text-rose-700">
          <AlertCircle className="h-3 w-3 mr-1" />
          ต่ำกว่าเป้า
        </Badge>
      );
    }
  };

  const selectedOfficerStats = selectedOfficer
    ? statsData?.find((s: OfficerStats) => s.officerId === selectedOfficer.id)
    : null;

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: 'หน้าหลัก', href: '/' },
        { label: 'ผลงานเจ้าหน้าที่' },
      ]}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl text-white font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-white" />
              จัดการพนักงาน
            </h1>
            <p className="text-white mt-1">
              ติดตามและจัดการผลงานของเจ้าหน้าที่ในสาขา ({officers.length} คน)
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        {!isLoading && statsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="relative overflow-hidden">
              {/* Wave Background */}
              <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
                <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                  <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-10" />
                  <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-20" />
                  <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-40" />
                </svg>
              </div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm font-medium text-slate-600">
                  สินเชื่อทั้งหมด
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold">
                  {statsData.reduce((sum: number, s: OfficerStats) => sum + s.totalLoans, 0)} รายการ
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              {/* Wave Background */}
              <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
                <svg viewBox="0 0 400 200" className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6" preserveAspectRatio="none">
                  <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-blue-500 opacity-10" />
                  <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-blue-500 opacity-20" />
                  <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-blue-500 opacity-40" />
                </svg>
              </div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm font-medium text-slate-600">
                  มูลค่าคงค้าง
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold">
                  ฿
                  {(
                    statsData.reduce((sum: number, s: OfficerStats) => sum + s.outstandingBalance, 0) /
                    1000000
                  ).toFixed(2)}
                  M
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              {/* Wave Background */}
              <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
                <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                  <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-emerald-500 opacity-10" />
                  <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-emerald-500 opacity-20" />
                  <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-emerald-500 opacity-40" />
                </svg>
              </div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm font-medium text-slate-600">
                  ปล่อยสินเชื่อเดือนนี้
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-emerald-600">
                  ฿
                  {(
                    statsData.reduce((sum: number, s: OfficerStats) => sum + s.disbursedThisMonth, 0) /
                    1000000
                  ).toFixed(2)}
                  M
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {statsData.reduce((sum: number, s: OfficerStats) => sum + s.approvedLoans, 0)} สัญญา
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              {/* Wave Background */}
              <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
                <svg viewBox="0 0 400 200" className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6" preserveAspectRatio="none">
                  <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-rose-500 opacity-10" />
                  <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-rose-500 opacity-20" />
                  <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-rose-500 opacity-40" />
                </svg>
              </div>
              <CardHeader className="pb-3 relative z-10">
                <CardTitle className="text-sm font-medium text-slate-600">
                  NPL ทั้งหมด
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-rose-600">
                  {statsData.reduce((sum: number, s: OfficerStats) => sum + s.nplCount, 0)} รายการ
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Officers Performance List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 animate-pulse text-slate-400" />
              <p className="text-slate-500">กำลังโหลดข้อมูล...</p>
            </div>
          ) : officers.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-500">ไม่มีเจ้าหน้าที่ในสาขา</p>
            </div>
          ) : (
            officers.map((officer: Officer) => {
              const stats = statsData?.find((s: OfficerStats) => s.officerId === officer.id);
              if (!stats) return null;

              return (
                <Card key={officer.id} className="hover:shadow-md transition-shadow relative overflow-hidden">
                  {/* Wave Background */}
                  <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
                    <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                      <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-10" />
                      <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-20" />
                      <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-primary opacity-40" />
                    </svg>
                  </div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-bold text-lg">
                            {officer.firstName?.charAt(0)}
                            {officer.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold">
                            {officer.firstName} {officer.lastName}
                          </h3>
                          <p className="text-sm text-slate-500">{officer.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPerformanceBadge(stats.targetAchievement)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewProfile(officer)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          ดูรายละเอียด
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetTarget(officer)}
                        >
                          <Target className="h-4 w-4 mr-1" />
                          กำหนดเป้า
                        </Button>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <FileText className="h-5 w-5 mx-auto mb-1 text-slate-600" />
                        <p className="text-xs text-slate-600 mb-1">สินเชื่อทั้งหมด</p>
                        <p className="text-lg font-bold">{stats.totalLoans}</p>
                      </div>

                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <Wallet className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                        <p className="text-xs text-blue-600 mb-1">มูลค่าคงค้าง</p>
                        <p className="text-lg font-bold text-blue-600">
                          ฿{(stats.outstandingBalance / 1000).toFixed(0)}K
                        </p>
                      </div>

                      <div className="text-center p-3 bg-emerald-50 rounded-lg">
                        <DollarSign className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
                        <p className="text-xs text-emerald-600 mb-1">เก็บได้เดือนนี้</p>
                        <p className="text-lg font-bold text-emerald-600">
                          ฿{(stats.paymentsCollected / 1000).toFixed(0)}K
                        </p>
                      </div>

                      <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <Percent className="h-5 w-5 mx-auto mb-1 text-amber-600" />
                        <p className="text-xs text-amber-600 mb-1">อัตราเก็บเงิน</p>
                        <p className="text-lg font-bold text-amber-600">
                          {stats.collectionRate.toFixed(1)}%
                        </p>
                      </div>

                      <div className="text-center p-3 bg-rose-50 rounded-lg">
                        <AlertCircle className="h-5 w-5 mx-auto mb-1 text-rose-600" />
                        <p className="text-xs text-rose-600 mb-1">NPL</p>
                        <p className="text-lg font-bold text-rose-600">{stats.nplCount}</p>
                      </div>
                    </div>

                    {/* Target Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-600">
                          เป้าหมายเดือนนี้: ฿{stats.monthlyTarget.toLocaleString()}
                        </span>
                        <span className="font-bold">
                          {stats.targetAchievement}% (฿{stats.paymentsCollected.toLocaleString()})
                        </span>
                      </div>
                      <Progress value={Math.min(stats.targetAchievement, 100)} className="h-3" />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Set Target Dialog */}
      <Dialog open={isTargetDialogOpen} onOpenChange={setIsTargetDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              กำหนดเป้าหมายรายเดือน
            </DialogTitle>
            <DialogDescription>
              กำหนดเป้าหมายการเก็บเงินรายเดือนสำหรับ{' '}
              {selectedOfficer?.firstName} {selectedOfficer?.lastName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="target">เป้าหมาย (บาท)</Label>
              <Input
                id="target"
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="100000"
              />
              <p className="text-xs text-slate-500">
                เป้าหมายปัจจุบัน: ฿{Number(targetAmount || 0).toLocaleString()}
              </p>
            </div>

            {selectedOfficerStats && (
              <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                <p className="text-sm font-semibold">ผลงานเดือนนี้</p>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">เก็บเงินได้:</span>
                  <span className="font-bold">
                    ฿{selectedOfficerStats.paymentsCollected.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">ความสำเร็จ:</span>
                  <span className="font-bold text-primary">
                    {selectedOfficerStats.targetAchievement}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTargetDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSaveTarget} disabled={!targetAmount || Number(targetAmount) <= 0}>
              บันทึกเป้าหมาย
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Officer Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              โปรไฟล์เจ้าหน้าที่
            </DialogTitle>
            <DialogDescription>
              รายละเอียดและผลงานของ {selectedOfficer?.firstName} {selectedOfficer?.lastName}
            </DialogDescription>
          </DialogHeader>

          {selectedOfficer && selectedOfficerStats && (
            <div className="space-y-6 py-4">
              {/* Personal Info */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-2xl">
                    {selectedOfficer.firstName.charAt(0)}
                    {selectedOfficer.lastName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">
                    {selectedOfficer.firstName} {selectedOfficer.lastName}
                  </h3>
                  <p className="text-sm text-slate-600">{selectedOfficer.email}</p>
                  {selectedOfficer.phoneNumber && (
                    <p className="text-sm text-slate-600">{selectedOfficer.phoneNumber}</p>
                  )}
                </div>
                {getPerformanceBadge(selectedOfficerStats.targetAchievement)}
              </div>

              {/* Performance Overview */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  ภาพรวมผลงาน
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">สินเชื่อทั้งหมด</p>
                    <p className="text-2xl font-bold">{selectedOfficerStats.totalLoans}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      กำลังดำเนินการ: {selectedOfficerStats.activeLoans}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">มูลค่าปล่อยทั้งหมด</p>
                    <p className="text-2xl font-bold text-blue-600">
                      ฿{(selectedOfficerStats.totalDisbursed / 1000000).toFixed(2)}M
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">มูลค่าคงค้าง</p>
                    <p className="text-2xl font-bold text-amber-600">
                      ฿{(selectedOfficerStats.outstandingBalance / 1000000).toFixed(2)}M
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-slate-600 mb-1">เก็บเงินได้เดือนนี้</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      ฿{(selectedOfficerStats.paymentsCollected / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>
              </div>

              {/* Target Progress */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  ความคืบหน้าเป้าหมาย
                </h4>
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">เป้าหมายเดือนนี้</span>
                    <span className="font-bold">
                      ฿{selectedOfficerStats.monthlyTarget.toLocaleString()}
                    </span>
                  </div>
                  <Progress value={Math.min(selectedOfficerStats.targetAchievement, 100)} className="h-4" />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">ความสำเร็จ</span>
                    <span className="text-lg font-bold text-primary">
                      {selectedOfficerStats.targetAchievement}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk Indicators */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  ตัวชี้วัดความเสี่ยง
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-sm text-slate-600 mb-1">NPL</p>
                    <p className="text-2xl font-bold text-rose-600">
                      {selectedOfficerStats.nplCount}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-sm text-slate-600 mb-1">ค้างชำระ</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {selectedOfficerStats.overdueCount}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg text-center">
                    <p className="text-sm text-slate-600 mb-1">อัตราเก็บเงิน</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {selectedOfficerStats.collectionRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigate(`/loans?officerId=${selectedOfficer.id}`);
                    setIsProfileDialogOpen(false);
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  ดูสินเชื่อทั้งหมด
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigate(`/customers?officerId=${selectedOfficer.id}`);
                    setIsProfileDialogOpen(false);
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  ดูลูกค้าทั้งหมด
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)}>
              ปิด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
