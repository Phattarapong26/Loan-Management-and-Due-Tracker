import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Calendar } from '@/shared/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  BarChart3,
  Download,
  Calendar as CalendarIcon,
  AlertTriangle,
  Users,
  Building2,
  Printer,
  Loader,
  Receipt,
  FileText,
  Info,
} from 'lucide-react';
import { endOfDay, format, startOfDay, startOfMonth } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/shared/lib/utils';
import { toast } from 'sonner';
import { branchesApi, reportsApi, usersApi, type Branch, type User as ApiUser } from '@/shared/lib/api-endpoints';
import { useAuth } from '@/shared/contexts/AuthContext';
import { loanProductsApi, type LoanProduct } from '@/features/approvals/api/loan-products.api';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';

type ReportType = 'branch_summary' | 'npl_report' | 'officer_performance' | 'loan_register' | 'payment_register';

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ];
  return lines.join('\n');
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const csv = toCsv(rows);
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('branch_summary');
  const { currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';

  const [dateFrom, setDateFrom] = useState<Date>(() => startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(() => new Date());

  // Admin-only filters
  const [branchId, setBranchId] = useState<string>('all');
  const [officerId, setOfficerId] = useState<string>('all');
  const [productId, setProductId] = useState<string>('all');
  const [exportFormat, setExportFormat] = useState<string>('csv');

  const reportParams = useMemo(() => {
    const params: Record<string, string | undefined> = {
      dateFrom: dateFrom ? startOfDay(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? endOfDay(dateTo).toISOString() : undefined,
    };
    if (isAdmin) {
      params.branchId = branchId !== 'all' ? branchId : undefined;
      params.officerId = officerId !== 'all' ? officerId : undefined;
      params.productId = productId !== 'all' ? productId : undefined;
    }
    return params;
  }, [branchId, dateFrom, dateTo, isAdmin, officerId, productId]);

  // Fetch branch summary
  const { data: branchSummaryData, isLoading: isLoadingBranch, refetch: refetchBranch } = useQuery({
    queryKey: ['branchSummary', reportParams],
    queryFn: () => reportsApi.generateBranchSummary(reportParams),
    enabled: reportType === 'branch_summary',
  });

  // Fetch NPL report
  const { data: nplData, isLoading: isLoadingNPL, refetch: refetchNPL } = useQuery({
    queryKey: ['nplReport', reportParams],
    queryFn: () => reportsApi.generateNPLReport(reportParams),
    enabled: reportType === 'npl_report',
  });

  // Fetch officer performance
  const { data: officerData, isLoading: isLoadingOfficer, refetch: refetchOfficer } = useQuery({
    queryKey: ['officerPerformance', reportParams],
    queryFn: () => reportsApi.generateOfficerPerformance(reportParams),
    enabled: reportType === 'officer_performance',
  });

  // Fetch loan register
  const { data: loanRegisterData, isLoading: isLoadingLoanRegister, refetch: refetchLoanRegister } = useQuery({
    queryKey: ['loanRegister', reportParams],
    queryFn: () => reportsApi.getLoanReport(reportParams),
    enabled: reportType === 'loan_register',
  });

  // Fetch payment register
  const { data: paymentRegisterData, isLoading: isLoadingPaymentRegister, refetch: refetchPaymentRegister } = useQuery({
    queryKey: ['paymentRegister', reportParams],
    queryFn: () => reportsApi.getPaymentReport(reportParams),
    enabled: reportType === 'payment_register',
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches', 'all'],
    queryFn: async () => {
      const res = await branchesApi.getAll();
      if (res.error) throw res.error;
      return res.data;
    },
    enabled: isAdmin,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const branches: Branch[] = Array.isArray(branchesData) ? branchesData : [];

  const { data: officersData } = useQuery({
    queryKey: ['report-officers', branchId],
    queryFn: async () => {
      if (branchId !== 'all') {
        const res = await branchesApi.getEmployees(branchId);
        if (res.error) throw res.error;
        return res.data || [];
      }
      const res = await usersApi.list({ page: 1, limit: 200, role: 'OFFICER', status: 'ACTIVE' });
      if (res.error) throw res.error;
      return res.data?.users || [];
    },
    enabled: isAdmin,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const officers: ApiUser[] = Array.isArray(officersData) ? officersData : [];

  const { data: productsData } = useQuery({
    queryKey: ['loan-products', 'active'],
    queryFn: async () => {
      return await loanProductsApi.getAll({ status: 'ACTIVE' });
    },
    enabled: isAdmin,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const products: LoanProduct[] = Array.isArray(productsData) ? productsData : [];

  const handleGenerate = () => {
    if (reportType === 'branch_summary') refetchBranch();
    else if (reportType === 'npl_report') refetchNPL();
    else if (reportType === 'officer_performance') refetchOfficer();
    else if (reportType === 'loan_register') refetchLoanRegister();
    else if (reportType === 'payment_register') refetchPaymentRegister();
    toast.success('กำลังสร้างรายงาน...');
  };

  const handleExport = () => {
    if (exportFormat !== 'csv') {
      toast.error('ตอนนี้รองรับการส่งออกแบบ CSV ก่อน (ใช้งานได้ทันที / เปิดใน Excel ได้)');
      return;
    }

    const dateLabel = `${format(dateFrom, 'yyyyMMdd')}-${format(dateTo, 'yyyyMMdd')}`;

    if (reportType === 'branch_summary' && branchSummaryData?.data) {
      const rows = [{
        ...branchSummaryData.data.summary,
        ...branchSummaryData.data.dpdBuckets,
      }];
      downloadCsv(`report-branch-summary-${dateLabel}.csv`, rows);
      toast.success('ส่งออก CSV สำเร็จ');
      return;
    }

    if (reportType === 'npl_report' && Array.isArray(nplData?.data)) {
      downloadCsv(`report-npl-${dateLabel}.csv`, nplData.data as any);
      toast.success('ส่งออก CSV สำเร็จ');
      return;
    }

    if (reportType === 'officer_performance' && Array.isArray(officerData?.data)) {
      downloadCsv(`report-officer-performance-${dateLabel}.csv`, officerData.data as any);
      toast.success('ส่งออก CSV สำเร็จ');
      return;
    }

    if (reportType === 'loan_register' && Array.isArray(loanRegisterData?.data)) {
      downloadCsv(`report-loan-register-${dateLabel}.csv`, loanRegisterData.data as any);
      toast.success('ส่งออก CSV สำเร็จ');
      return;
    }

    if (reportType === 'payment_register' && paymentRegisterData?.data?.payments) {
      downloadCsv(`report-payment-register-${dateLabel}.csv`, paymentRegisterData.data.payments as any);
      toast.success('ส่งออก CSV สำเร็จ');
      return;
    }

    toast.error('ไม่มีข้อมูลสำหรับส่งออก');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const isLoading = isLoadingBranch || isLoadingNPL || isLoadingOfficer || isLoadingLoanRegister || isLoadingPaymentRegister;

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'รายงาน' }]}>
      <div className="p-6 space-y-6">
        <div className=' bg-white rounded-lg p-1'>
      {/* Header + Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-4 space-y-0">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle>รายงาน</CardTitle>
                <CardDescription>สร้างและส่งออกรายงานต่างๆ</CardDescription>
              </div>
              <Button onClick={handleGenerate} disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                สร้างรายงาน
              </Button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'P', { locale: th }) : 'วันที่เริ่มต้น'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'P', { locale: th }) : 'วันที่สิ้นสุด'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                  </PopoverContent>
                </Popover>

                {isAdmin && (
                  <>
                    <Select
                      value={branchId}
                      onValueChange={(v) => {
                        setBranchId(v);
                        setOfficerId('all');
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="สาขา" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทุกสาขา</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.code} - {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={officerId} onValueChange={setOfficerId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="เจ้าหน้าที่" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทุกเจ้าหน้าที่</SelectItem>
                        {officers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={productId} onValueChange={setProductId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="ผลิตภัณฑ์" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">ทุกผลิตภัณฑ์</SelectItem>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.productCode} - {p.productName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}

                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="รูปแบบ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Excel)</SelectItem>
                    <SelectItem value="excel">Excel (เร็วๆนี้)</SelectItem>
                    <SelectItem value="pdf">PDF (เร็วๆนี้)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Report Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            reportType === 'branch_summary' && "ring-1 ring-primary-200"
          )}
          onClick={() => setReportType('branch_summary')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Branch Summary</p>
                <p className="text-sm text-muted-foreground">ภาพรวมพอร์ต + เก็บหนี้</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            reportType === 'npl_report' && "ring-1 ring-primary-200"
          )}
          onClick={() => setReportType('npl_report')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="font-medium">NPL Report</p>
                <p className="text-sm text-muted-foreground">30+ DPD / NPL / Default</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            reportType === 'officer_performance' && "ring-1 ring-primary-200"
          )}
          onClick={() => setReportType('officer_performance')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-xl">
                <Users className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="font-medium">Officer Performance</p>
                <p className="text-sm text-muted-foreground">ผลงานเจ้าหน้าที่</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            reportType === 'loan_register' && "ring-1 ring-primary-200"
          )}
          onClick={() => setReportType('loan_register')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-xl">
                <FileText className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="font-medium">Loan Register</p>
                <p className="text-sm text-muted-foreground">รายการสินเชื่อ</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            reportType === 'payment_register' && "ring-1 ring-primary-200"
          )}
          onClick={() => setReportType('payment_register')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-xl">
                <Receipt className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="font-medium">Payment Register</p>
                <p className="text-sm text-muted-foreground">รายการรับชำระ</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Content */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>
              {reportType === 'branch_summary' && 'รายงานสรุปผลการดำเนินงานสาขา'}
              {reportType === 'npl_report' && 'รายงานหนี้เสีย (NPL)'}
              {reportType === 'officer_performance' && 'รายงานผลงานเจ้าหน้าที่'}
              {reportType === 'loan_register' && 'รายการสินเชื่อ (Loan Register)'}
              {reportType === 'payment_register' && 'รายการรับชำระ (Payment Register)'}
            </CardTitle>
            <CardDescription>
              ข้อมูล ณ วันที่ {format(new Date(), 'PPP', { locale: th })}
            </CardDescription>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 md:flex-none">
              <Download className="h-4 w-4 mr-2" />
              ส่งออก
            </Button>
            <Button variant="outline" size="sm" className="flex-1 md:flex-none">
              <Printer className="h-4 w-4 mr-2" />
              พิมพ์
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-[92px] w-full" />
                <Skeleton className="h-[92px] w-full" />
                <Skeleton className="h-[92px] w-full" />
                <Skeleton className="h-[92px] w-full" />
                <Skeleton className="h-[92px] w-full" />
                <Skeleton className="h-[92px] w-full" />
              </div>
              <Skeleton className="h-[340px] w-full" />
            </div>
          ) : (
            <>
              {/* Branch Summary Report */}
              {reportType === 'branch_summary' && branchSummaryData?.data && (
                <div className="space-y-6">
                  <TooltipProvider>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">พอร์ตทั้งหมด</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>DISBURSED/ACTIVE/NPL/DEFAULTED (ยังมี exposure)</TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-2xl font-bold mt-1">{branchSummaryData.data.summary.portfolioLoans}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">ยอดคงค้าง</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>รวม outstandingBalance ของพอร์ตทั้งหมด</TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-2xl font-bold mt-1">{formatCurrency(branchSummaryData.data.summary.totalOutstanding)}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">ยอดเบิกจ่าย (ช่วงเวลา)</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>รวม LoanDisbursement.amount (status=DISBURSED) ในช่วงวันที่ที่เลือก</TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-2xl font-bold mt-1">{formatCurrency(branchSummaryData.data.summary.totalDisbursed)}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">ยอดเก็บหนี้ (ช่วงเวลา)</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>รวม Payment.amount ในช่วงวันที่ที่เลือก</TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-2xl font-bold mt-1">{formatCurrency(branchSummaryData.data.summary.totalCollected)}</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">อัตราเก็บหนี้</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>เก็บได้ / ยอดที่ควรเก็บ (ตาม payment_schedules) ในช่วงเวลา</TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-2xl font-bold mt-1">{branchSummaryData.data.summary.collectionRate}%</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">NPL Ratio</p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground">
                                  <Info className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>NPL/DEFAULTED หรือ DPD ≥ 30 วัน</TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-2xl font-bold mt-1">{branchSummaryData.data.summary.nplRatio}%</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TooltipProvider>

                  <div className=" overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Bucket</TableHead>
                          <TableHead className="text-right">จำนวนสัญญา</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>ปกติ (0 วัน)</TableCell>
                          <TableCell className="text-right">{branchSummaryData.data.dpdBuckets.current}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>ใกล้ครบ (1–7 วัน)</TableCell>
                          <TableCell className="text-right">{branchSummaryData.data.dpdBuckets.dpd1to7}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>เกินกำหนด (8–29 วัน)</TableCell>
                          <TableCell className="text-right">{branchSummaryData.data.dpdBuckets.dpd8to29}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>NPL (30–89 วัน)</TableCell>
                          <TableCell className="text-right">{branchSummaryData.data.dpdBuckets.dpd30to89}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>NPL หนัก (90+ วัน)</TableCell>
                          <TableCell className="text-right">{branchSummaryData.data.dpdBuckets.dpd90plus}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* NPL Report */}
              {reportType === 'npl_report' && nplData?.data && (
                <div className=" overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>สัญญา</TableHead>
                        <TableHead>ลูกค้า</TableHead>
                        <TableHead className="text-right">ยอดค้างชำระ</TableHead>
                        <TableHead className="text-center">วันค้างชำระ</TableHead>
                        <TableHead>เจ้าหน้าที่</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(nplData.data || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            ไม่พบข้อมูล NPL
                          </TableCell>
                        </TableRow>
                      ) : (
                        (nplData.data || []).map((item: any) => (
                          <TableRow key={item.loanId}>
                            <TableCell className="font-mono">{item.contractNumber || item.loanId}</TableCell>
                            <TableCell className="font-medium">{item.customerName}</TableCell>
                            <TableCell className="text-right font-medium text-destructive">
                              {formatCurrency(item.outstandingAmount)}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="px-2 py-1 bg-destructive/10 text-destructive rounded-full text-xs">
                                {item.overdueDays} วัน
                              </span>
                            </TableCell>
                            <TableCell>{item.officerName || '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Officer Performance Report */}
              {reportType === 'officer_performance' && officerData?.data && (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>รหัส</TableHead>
                        <TableHead>ชื่อ</TableHead>
                        <TableHead className="text-center">พอร์ต</TableHead>
                        <TableHead className="text-center">NPL</TableHead>
                        <TableHead className="text-center">อัตราเก็บหนี้</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(officerData.data || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            ไม่พบข้อมูลผลงานเจ้าหน้าที่
                          </TableCell>
                        </TableRow>
                      ) : (
                        (officerData.data || []).map((item: any) => (
                          <TableRow key={item.officerId}>
                            <TableCell className="font-mono">{item.officerId}</TableCell>
                            <TableCell className="font-medium">{item.officerName}</TableCell>
                            <TableCell className="text-center">{item.portfolioLoans}</TableCell>
                            <TableCell className="text-center">{item.nplLoans}</TableCell>
                            <TableCell className="text-center">
                              <span className={cn(
                                "px-2 py-1 rounded-full text-xs",
                                item.collectionRate >= 90 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                              )}>
                                {item.collectionRate}%
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Loan Register */}
              {reportType === 'loan_register' && loanRegisterData?.data && (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>สัญญา</TableHead>
                        <TableHead>ลูกค้า</TableHead>
                        <TableHead className="text-right">วงเงิน</TableHead>
                        <TableHead className="text-right">คงค้าง</TableHead>
                        <TableHead className="text-center">DPD</TableHead>
                        <TableHead>สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(loanRegisterData.data || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            ไม่พบข้อมูลสินเชื่อ
                          </TableCell>
                        </TableRow>
                      ) : (
                        (loanRegisterData.data || []).map((row: any) => (
                          <TableRow key={row.loanId}>
                            <TableCell className="font-mono">{row.contractNumber || row.loanId}</TableCell>
                            <TableCell className="font-medium">{row.customerName}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.principal)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(row.outstandingBalance)}</TableCell>
                            <TableCell className="text-center">{row.overdueDays}</TableCell>
                            <TableCell>{row.status}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Payment Register */}
              {reportType === 'payment_register' && paymentRegisterData?.data && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between  p-4">
                    <div className="text-sm text-muted-foreground">
                      รวม {paymentRegisterData.data.summary.totalPayments} รายการ
                    </div>
                    <div className="text-lg font-semibold">
                      {formatCurrency(paymentRegisterData.data.summary.totalCollected)}
                    </div>
                  </div>

                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>วันที่</TableHead>
                          <TableHead>สัญญา</TableHead>
                          <TableHead>ลูกค้า</TableHead>
                          <TableHead className="text-right">จำนวนเงิน</TableHead>
                          <TableHead>ช่องทาง</TableHead>
                          <TableHead>ใบเสร็จ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(paymentRegisterData.data.payments || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              ไม่พบข้อมูลการรับชำระ
                            </TableCell>
                          </TableRow>
                        ) : (
                          (paymentRegisterData.data.payments || []).map((row: any) => (
                            <TableRow key={row.paymentId}>
                              <TableCell className="whitespace-nowrap">
                                {format(new Date(row.paymentDate), 'P', { locale: th })}
                              </TableCell>
                              <TableCell className="font-mono">{row.contractNumber || row.loanId}</TableCell>
                              <TableCell className="font-medium">{row.customerName}</TableCell>
                              <TableCell className="text-right">{formatCurrency(row.amount)}</TableCell>
                              <TableCell>{row.paymentMethod}</TableCell>
                              <TableCell className="font-mono">{row.receiptNumber || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      </div>
      </div>
    </DashboardLayout>
  );
}
