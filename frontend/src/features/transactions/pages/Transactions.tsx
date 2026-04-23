import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { PaginationControls } from '@/shared/components/ui/pagination-controls';
import { usePagination } from '@/shared/hooks/usePagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import {
  Search,
  Wallet,
  CheckCircle,
  MoreHorizontal,
  Eye,
  FileText,
  Send,
  Loader,
  Download,
  Building2,
  LucideIcon,
  History,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { disbursementsApi } from '@/features/disbursements/api/disbursements.api';
import { Disbursement } from '@/features/disbursements/api/disbursements.api';
import { branchesApi, Branch } from '@/shared/lib/api-endpoints';
import { UserAvatar } from '@/shared/components/ui/user-avatar';
import { TransactionExecuteDialog } from '@/features/transactions/components/TransactionExecuteDialog';
import { TransactionDetailDialog } from '@/features/transactions/components/TransactionDetailDialog';
import { TransactionStatsCards } from '@/features/transactions/components/TransactionStatsCards';
import { DisbursementPreviewDialog } from '@/features/transactions/components/DisbursementPreviewDialog';
import { useAlertDialog } from '@/shared/hooks/useAlertDialog';
import { useAuth } from '@/shared/contexts/AuthContext';

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function Transactions() {
  const queryClient = useQueryClient();
  const { page, pageSize, setPage, setPageSize, getPaginationParams } = usePagination();
  const alertDialog = useAlertDialog();
  const { currentRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Disbursement | null>(null);
  const [disbursementData, setDisbursementData] = useState<{
    disbursementMethod: 'TRANSFER' | 'CHECK' | 'CASH';
    referenceNo?: string;
    notes?: string;
  } | null>(null);

  const isAdmin = currentRole === 'admin';

  // Fetch branches for admin filter
  const { data: branchesData } = useQuery({
    queryKey: ['branches', 'all'],
    queryFn: async () => {
      const result = await branchesApi.getAll();
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    enabled: isAdmin,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const branches: Branch[] = Array.isArray(branchesData) ? branchesData : [];

  // Fetch approved disbursements (ready for execution) - optimized
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['transactions', page, pageSize, searchTerm, activeTab, branchFilter],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        ...getPaginationParams(),
        status: activeTab === 'pending' ? 'APPROVED' : 'DISBURSED',
      };
      if (isAdmin && branchFilter !== 'all') {
        params.branchId = branchFilter;
      }
      const response = await disbursementsApi.list(params);
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Fetch stats using proper API call instead of client-side calculation
  const { data: statsData } = useQuery({
    queryKey: ['transaction-stats', activeTab, branchFilter],
    queryFn: async () => {
      try {
        const response = await disbursementsApi.getStats({
          branchId: isAdmin && branchFilter !== 'all' ? branchFilter : undefined,
        });
        const stats = response.data;
        
        // Return appropriate stats based on active tab
        if (activeTab === 'pending') {
          return {
            approved: stats.approved || 0,
            totalAmount: stats.pendingAmount || 0,
            pendingAmount: stats.pendingAmount || 0,
          };
        } else {
          return {
            approved: stats.disbursed || 0,
            totalAmount: stats.disbursedAmount || 0,
            pendingAmount: 0,
          };
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        return { approved: 0, totalAmount: 0, pendingAmount: 0 };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });

  const transactions: Disbursement[] = transactionsData?.disbursements || [];
  const stats = statsData || { approved: 0, totalAmount: 0, pendingAmount: 0 };

  // Local filtering for search
  const filteredTransactions: Disbursement[] = transactions.filter((t: Disbursement) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      t.loan.customer.businessName.toLowerCase().includes(searchLower) ||
      t.loan.customer.customerCode.toLowerCase().includes(searchLower) ||
      t.purpose.toLowerCase().includes(searchLower) ||
      t.id.toLowerCase().includes(searchLower)
    );
  });

  // Execute transaction mutation
  const executeMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      disbursementMethod: 'TRANSFER' | 'CHECK' | 'CASH';
      referenceNo?: string;
      notes?: string;
    }) => {
      const response = await disbursementsApi.disburse(data.id, {
        disbursementMethod: data.disbursementMethod,
        referenceNo: data.referenceNo,
        notes: data.notes,
      });
      return response.data;
    },
    onSuccess: () => {
      alertDialog.success({
        title: 'เบิกจ่ายเงินสำเร็จ!',
        description: 'ระบบได้ดำเนินการเบิกจ่ายเงินและส่งหนังสือแจ้งการเบิกจ่ายให้ลูกค้าเรียบร้อยแล้ว',
        confirmText: 'เสร็จสิ้น',
      });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transaction-stats'] });
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      setIsPreviewDialogOpen(false);
      setIsExecuteDialogOpen(false);
      setSelectedTransaction(null);
      setDisbursementData(null);
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      alertDialog.error({
        title: 'เกิดข้อผิดพลาด',
        description: error.response?.data?.error?.message || 'ไม่สามารถเบิกจ่ายเงินได้',
        confirmText: 'ปิด',
      });
    },
  });

  // Handle execute dialog next button (go to preview)
  const handleExecuteNext = (data: {
    disbursementMethod: 'TRANSFER' | 'CHECK' | 'CASH';
    referenceNo?: string;
    notes?: string;
  }) => {
    setDisbursementData(data);
    setIsExecuteDialogOpen(false);
    setIsPreviewDialogOpen(true);
  };

  // Handle preview back button (return to execute dialog)
  const handlePreviewBack = () => {
    setIsPreviewDialogOpen(false);
    setIsExecuteDialogOpen(true);
  };

  // Handle final confirmation from preview
  const handlePreviewConfirm = () => {
    if (selectedTransaction && disbursementData) {
      executeMutation.mutate({
        id: selectedTransaction.id,
        ...disbursementData,
      });
    }
  };

  // Export to CSV function
  const handleExportToCSV = () => {
    try {
      const headers = activeTab === 'pending' 
        ? [
            'งวดที่',
            'ลูกค้า',
            'รหัสลูกค้า',
            'วัตถุประสงค์',
            'จำนวนเงิน',
            'วันที่ขอเบิก',
            'วงเงินรวม',
            'เบิกไปแล้ว',
            'คงเหลือ',
          ]
        : [
            'งวดที่',
            'ลูกค้า',
            'รหัสลูกค้า',
            'วัตถุประสงค์',
            'จำนวนเงิน',
            'วันที่เบิกจ่าย',
            'วิธีการเบิกจ่าย',
            'เลขที่อ้างอิง',
            'หมายเหตุ',
          ];

      const csvData = filteredTransactions.map((t: Disbursement) => 
        activeTab === 'pending' 
          ? [
              `#${t.disbursementNo}`,
              t.loan.customer.businessName,
              t.loan.customer.customerCode,
              t.purpose,
              t.amount,
              formatDate(t.requestedDate),
              t.loan.principal,
              t.loan.totalDisbursed,
              t.loan.remainingAmount,
            ]
          : [
              `#${t.disbursementNo}`,
              t.loan.customer.businessName,
              t.loan.customer.customerCode,
              t.purpose,
              t.amount,
              t.executedDate ? formatDate(t.executedDate) : '-',
              t.disbursementMethod || '-',
              t.referenceNo || '-',
              t.notes || '-',
            ]
      );

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => {
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      const dateStr = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');

      const fileName = activeTab === 'pending' 
        ? `รายการรอเบิกจ่าย_${dateStr}.csv`
        : `ประวัติการเบิกจ่าย_${dateStr}.csv`;

      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`✅ ส่งออกข้อมูล ${filteredTransactions.length} รายการสำเร็จ`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('❌ ไม่สามารถส่งออกข้อมูลได้');
    }
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'รายการเบิกจ่าย' }]}>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl text-white font-bold">รายการเบิกจ่าย (Transactions)</h1>
          <p className="text-white">
            จัดการรายการเบิกจ่ายเงินและดูประวัติการเบิกจ่าย
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportToCSV}
            disabled={filteredTransactions.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            ส่งออก ({filteredTransactions.length})
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <TransactionStatsCards stats={stats} isLoading={isLoading} activeTab={activeTab} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'pending' | 'history')} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            รายการรอเบิกจ่าย
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            ประวัติการเบิกจ่าย
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาลูกค้า, วัตถุประสงค์..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {isAdmin && (
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="w-[200px] bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90">
                      <Building2 className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="ทุกสาขา" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกสาขา</SelectItem>
                      {branches.map((branch: Branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">ไม่มีรายการรอเบิกจ่าย</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    รายการจะแสดงที่นี่เมื่อมีคำขอเบิกจ่ายที่ผ่านการอนุมัติแล้ว
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>งวดที่</TableHead>
                        <TableHead>ลูกค้า</TableHead>
                        <TableHead>วัตถุประสงค์</TableHead>
                        <TableHead className="text-right">จำนวนเงิน</TableHead>
                        <TableHead>วันที่ขอเบิก</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((t: Disbursement) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">#{t.disbursementNo}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <UserAvatar 
                                src={t.loan.customer.avatar} 
                                name={t.loan.customer.businessName} 
                                size="md" 
                                className="h-10 w-10" 
                              />
                              <div>
                                <p className="font-medium">{t.loan.customer.businessName}</p>
                                <p className="text-xs text-muted-foreground">{t.loan.customer.customerCode}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{t.purpose}</TableCell>
                          <TableCell className="text-right font-medium text-lg text-primary">
                            {formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell>{formatDate(t.requestedDate)}</TableCell>
                          <TableCell>
                            <Badge className="bg-success/10 text-success">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              พร้อมเบิกจ่าย
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedTransaction(t);
                                  setIsDetailDialogOpen(true);
                                }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  ดูรายละเอียด
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-primary font-medium"
                                  onClick={() => {
                                    setSelectedTransaction(t);
                                    setIsExecuteDialogOpen(true);
                                  }}
                                >
                                  <Wallet className="h-4 w-4 mr-2" />
                                  เบิกจ่ายเงิน
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination Controls */}
                  {transactionsData && transactionsData.total > 0 && (
                    <PaginationControls
                      currentPage={page}
                      totalPages={transactionsData.totalPages || 1}
                      pageSize={pageSize}
                      totalItems={transactionsData.total || 0}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาลูกค้า, วัตถุประสงค์..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {isAdmin && (
                  <Select value={branchFilter} onValueChange={setBranchFilter}>
                    <SelectTrigger className="w-[200px] bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90">
                      <Building2 className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="ทุกสาขา" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกสาขา</SelectItem>
                      {branches.map((branch: Branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <Loader className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">ไม่มีประวัติการเบิกจ่าย</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    ประวัติการเบิกจ่ายจะแสดงที่นี่เมื่อมีการเบิกจ่ายเงินแล้ว
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>งวดที่</TableHead>
                        <TableHead>ลูกค้า</TableHead>
                        <TableHead>วัตถุประสงค์</TableHead>
                        <TableHead className="text-right">จำนวนเงิน</TableHead>
                        <TableHead>วันที่เบิกจ่าย</TableHead>
                        <TableHead>วิธีการเบิกจ่าย</TableHead>
                        <TableHead>สถานะ</TableHead>
                        <TableHead className="text-right">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((t: Disbursement) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">#{t.disbursementNo}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <UserAvatar 
                                src={t.loan.customer.avatar} 
                                name={t.loan.customer.businessName} 
                                size="md" 
                                className="h-10 w-10" 
                              />
                              <div>
                                <p className="font-medium">{t.loan.customer.businessName}</p>
                                <p className="text-xs text-muted-foreground">{t.loan.customer.customerCode}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{t.purpose}</TableCell>
                          <TableCell className="text-right font-medium text-lg text-primary">
                            {formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell>
                            {t.disbursedAt ? formatDate(t.disbursedAt) : 
                             t.executedDate ? formatDate(t.executedDate) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {t.disbursementMethod === 'BANK_TRANSFER' && 'โอนเงิน'}
                              {t.disbursementMethod === 'TRANSFER' && 'โอนเงิน'}
                              {t.disbursementMethod === 'CHECK' && 'เช็ค'}
                              {t.disbursementMethod === 'CASH' && 'เงินสด'}
                              {!t.disbursementMethod && '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-500/10 text-blue-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              เบิกจ่ายแล้ว
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedTransaction(t);
                                  setIsDetailDialogOpen(true);
                                }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  ดูรายละเอียด
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <FileText className="h-4 w-4 mr-2" />
                                  ดาวน์โหลดใบเสร็จ
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination Controls */}
                  {transactionsData && transactionsData.total > 0 && (
                    <PaginationControls
                      currentPage={page}
                      totalPages={transactionsData.totalPages || 1}
                      pageSize={pageSize}
                      totalItems={transactionsData.total || 0}
                      onPageChange={setPage}
                      onPageSizeChange={setPageSize}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Execute Dialog */}
      <TransactionExecuteDialog
        open={isExecuteDialogOpen}
        onOpenChange={setIsExecuteDialogOpen}
        selectedTransaction={selectedTransaction}
        onConfirm={handleExecuteNext}
        isLoading={executeMutation.isPending}
        formatCurrency={formatCurrency}
      />

      {/* Preview Dialog */}
      <DisbursementPreviewDialog
        open={isPreviewDialogOpen}
        onOpenChange={setIsPreviewDialogOpen}
        disbursement={selectedTransaction}
        disbursementData={disbursementData || {
          disbursementMethod: 'TRANSFER',
          referenceNo: '',
          notes: ''
        }}
        onConfirm={handlePreviewConfirm}
        onBack={handlePreviewBack}
        isLoading={executeMutation.isPending}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />

      {/* Detail Dialog */}
      <TransactionDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        selectedTransaction={selectedTransaction}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />

      {/* Alert Dialog */}
      <alertDialog.AlertDialog />
      </div>
    </DashboardLayout>
  );
}
