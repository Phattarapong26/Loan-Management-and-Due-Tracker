import { useState, useCallback, useMemo, useEffect } from 'react';
import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { TableSkeleton } from '@/shared/components/skeletons';
import { PaginationControls } from '@/shared/components/ui/pagination-controls';
import { EmptyLoans, EmptySearchResults } from '@/shared/components/ui/empty-state';
import { ErrorDisplay } from '@/shared/components/ui/error-display';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Progress } from '@/shared/components/ui/progress';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Building2,
  Download,
  Check,
  ChevronsUpDown,
  Loader2,
  Wallet,
  Users,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { UserAvatar } from '@/shared/components/ui/user-avatar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { toast } from 'sonner';
import { loansApi, customersApi, paymentsApi, disbursementsApi, branchesApi, Customer, Branch, Loan as ApiLoan } from '@/shared/lib/api-endpoints';
import { loanProductsApi, LoanProduct } from '@/features/approvals/api/loan-products.api';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useAlertDialog } from '@/shared/hooks/useAlertDialog';

// Import new K-Bank themed dialog components
import { LoanViewDialog, Loan } from '../components/LoanViewDialog';
import { LoanApproveDialog } from '../components/LoanApproveDialog';
import { LoanRejectDialog } from '../components/LoanRejectDialog';
import { LoanStatsCards } from '../components/LoanStatsCards';


// Map backend loan status to frontend status
const mapLoanStatus = (status: string): Loan['status'] => {
  const statusMap: Record<string, Loan['status']> = {
    'PENDING_APPROVAL': 'pending',
    'APPROVED': 'approved',
    'DISBURSED': 'active',
    'ACTIVE': 'active',
    'REJECTED': 'rejected',
    'CLOSED': 'closed',
    'DEFAULTED': 'npl',
    'NPL': 'npl',
  };
  return statusMap[status] || 'pending';
};

const statusConfig = {
  pending: { label: 'รอพิจารณา', icon: Clock, color: 'bg-warning text-warning-foreground' },
  approved: { label: 'อนุมัติแล้ว', icon: CheckCircle, color: 'bg-info text-info-foreground' },
  active: { label: 'เบิกจ่ายแล้ว', icon: TrendingUp, color: 'bg-success text-success-foreground' },
  rejected: { label: 'ไม่อนุมัติ', icon: XCircle, color: 'bg-destructive text-destructive-foreground' },
  closed: { label: 'ปิดบัญชี', icon: CheckCircle, color: 'bg-muted text-muted-foreground' },
  npl: { label: 'NPL', icon: AlertTriangle, color: 'bg-destructive text-destructive-foreground' },
};

export default function Loans() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createForCustomerId = searchParams.get('createFor') || '';

  // Auto-open create dialog if navigated from customer page
  useEffect(() => {
    if (createForCustomerId) {
      setIsCreateDialogOpen(true);
    }
  }, [createForCustomerId]);
  const alertDialog = useAlertDialog();
  const { user, currentRole } = useAuth(); // Add useAuth hook
  const isAdmin = currentRole === 'admin';
  const isManager = currentRole === 'branch_manager';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [officerFilter, setOfficerFilter] = useState<string>('all'); // manager only
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [isLoanProductOpen, setIsLoanProductOpen] = useState(false);
  const { page, pageSize, setPage, setPageSize, getPaginationParams } = usePagination();

  const [formData, setFormData] = useState({
    customerId: createForCustomerId,
    loanProductId: '',
    amount: '',
    interestRate: '8.5',
    duration: '12',
    revenue: '',
    expenses: '',
    debtPayment: '',
  });

  // Check if user can approve loans (Manager or Admin only)
  const canApproveLoan = currentRole === 'branch_manager' || currentRole === 'admin';

  // Fetch loans (all statuses for loan application management)
  const { data: loansData, isLoading, error } = useQuery({
    queryKey: ['loans', { search: searchTerm, status: statusFilter, branch: isAdmin ? branchFilter : (user?.branchId || 'na'), officer: (isAdmin || isManager) ? (officerFilter !== 'all' ? officerFilter : 'all') : (user?.id || 'na'), page, pageSize }],
    queryFn: async () => {
      const result = await loansApi.list({
        ...getPaginationParams(),
        status: statusFilter !== 'all' ? statusFilter.toUpperCase().replace('_', '_') : undefined,
        branchId: isAdmin ? (branchFilter !== 'all' ? branchFilter : undefined) : user?.branchId,
        officerId: isAdmin ? undefined : isManager ? (officerFilter !== 'all' ? officerFilter : undefined) : user?.id,
      });
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
  });

  // Fetch loan statistics for all loans (not filtered by pagination)
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['loan-statistics', 'all', isAdmin ? branchFilter : (user?.branchId || 'na'), (isAdmin || isManager) ? (officerFilter !== 'all' ? officerFilter : 'all') : (user?.id || 'na')],
    queryFn: async () => {
      const result = await loansApi.getStatistics({
        branchId: isAdmin ? (branchFilter !== 'all' ? branchFilter : undefined) : user?.branchId,
        officerId: isAdmin ? undefined : isManager ? (officerFilter !== 'all' ? officerFilter : undefined) : user?.id,
      });
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
  });

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

  // Fetch officers in manager's branch for filter dropdown
  const { data: filterOfficersData } = useQuery({
    queryKey: ['filter-officers-loans', user?.branchId],
    queryFn: async () => {
      if (!user?.branchId) return [];
      const { usersApi } = await import('@/shared/lib/api-endpoints');
      const result = await usersApi.list({ branchId: user.branchId, role: 'OFFICER', status: 'ACTIVE', limit: 100 });
      return result.data?.users || [];
    },
    enabled: isManager && !!user?.branchId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch customers for dropdown
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: async () => {
      const result = await customersApi.list({ page: 1, limit: 1000 });
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
  });

  // Fetch loan products for dropdown
  const { data: loanProductsData } = useQuery({
    queryKey: ['loan-products', 'active'],
    queryFn: () => loanProductsApi.getAll({ status: 'ACTIVE' }),
  });

  const loanProducts: LoanProduct[] = Array.isArray(loanProductsData) ? loanProductsData : [];

  // Fetch budgets for all products
  const { data: productBudgets } = useQuery({
    queryKey: ['product-budgets', 'batch', loanProducts.map(p => p.id)],
    queryFn: async () => {
      if (!loanProducts || loanProducts.length === 0) return {};
      
      const currentYear = new Date().getFullYear();
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
      
      const { apiClient } = await import('@/shared/lib/api-client');
      const response = await apiClient.post('/api/budgets/batch', {
        productIds: loanProducts.map(p => p.id),
        fiscalYear: currentYear,
        quarter: currentQuarter,
      });
      
      if (response.error) {
        return {};
      }
      
      return response.data || {};
    },
    enabled: loanProducts.length > 0,
  });

  // Fetch detailed loan data when viewing
  const { data: loanDetailData, isLoading: isLoadingDetail, error: detailError } = useQuery({
    queryKey: ['loan', selectedLoanId],
    queryFn: async () => {
      if (!selectedLoanId) return null;
      const result = await loansApi.getById(selectedLoanId);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    enabled: !!selectedLoanId && isViewDialogOpen,
    retry: false,
  });

  // Handle loan detail fetch errors
  React.useEffect(() => {
    if (detailError) {
      toast.error('ไม่พบข้อมูลสินเชื่อ', {
        description: 'สินเชื่อนี้อาจถูกลบหรือไม่มีสิทธิ์เข้าถึง',
        duration: 3000,
      });
      setIsViewDialogOpen(false);
    }
  }, [detailError]);

  interface ApiError {
    message?: string;
    status?: number;
    code?: string;
    details?: Array<{ field?: string; message: string; path?: string[] }>;
    nextSteps?: string[];
  }

  // Create loan mutation
  const createLoanMutation = useMutation({
    mutationFn: async (data: Partial<ApiLoan> & { annualRevenue: number; annualCogs: number; annualOpex: number }) => {
      const result = await loansApi.create(data);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      alertDialog.success({
        title: 'สร้างคำขอสินเชื่อสำเร็จ!',
        description: 'ระบบได้บันทึกคำขอสินเชื่อเรียบร้อยแล้ว',
        confirmText: 'ตกลง',
      });
      setIsCreateDialogOpen(false);
      setFormData({
        customerId: '',
        loanProductId: '',
        amount: '',
        interestRate: '8.5',
        duration: '12',
        revenue: '',
        expenses: '',
        debtPayment: '',
      });
    },
    onError: (error: ApiError) => {
      let userFriendlyMessage = 'ไม่สามารถสร้างคำขอสินเชื่อได้';
      let errorTitle = 'ไม่สามารถสร้างคำขอได้';

      const msg = error.message || '';
      const code = (error as any).code || '';

      if (code === 'BUDGET_EXCEEDED' || msg.includes('BUDGET_EXCEEDED')) {
        errorTitle = 'งบประมาณไม่เพียงพอ';
        userFriendlyMessage = 'วงเงินที่ขอเกินงบประมาณคงเหลือของผลิตภัณฑ์สินเชื่อนี้ กรุณาลดจำนวนเงินกู้หรือเลือกผลิตภัณฑ์อื่น';
      } else if (code === 'CUSTOMER_BLACKLISTED' || msg.includes('CUSTOMER_BLACKLISTED')) {
        errorTitle = 'ลูกค้าถูกระงับ';
        userFriendlyMessage = 'ลูกค้ารายนี้ถูกระงับการใช้งาน ไม่สามารถสร้างคำขอสินเชื่อได้';
      } else if (code === 'DUPLICATE_LOAN_APPLICATION' || msg.includes('DUPLICATE_LOAN_APPLICATION')) {
        errorTitle = 'มีคำขอซ้ำ';
        userFriendlyMessage = 'ลูกค้ารายนี้มีคำขอสินเชื่อที่รอการพิจารณาอยู่แล้ว กรุณารอให้คำขอเดิมได้รับการอนุมัติหรือปฏิเสธก่อน';
      } else if (msg.includes('DSCR')) {
        errorTitle = 'DSCR ไม่ผ่านเกณฑ์';
        const dscrMatch = msg.match(/DSCR ([\d.]+)/);
        const minMatch = msg.match(/minimum threshold ([\d.]+)/);
        const dscr = dscrMatch ? dscrMatch[1] : '?';
        const minDscr = minMatch ? minMatch[1] : '1.2';
        userFriendlyMessage = `อัตราส่วนความสามารถในการชำระหนี้ (DSCR) = ${dscr} ต่ำกว่าเกณฑ์ขั้นต่ำ ${minDscr} กรุณาเพิ่มรายได้หรือลดค่าใช้จ่ายและภาระหนี้`;
      } else if (msg.includes('รายได้สุทธิ') || msg.includes('net income')) {
        errorTitle = 'รายได้สุทธิไม่ผ่านเกณฑ์';
        userFriendlyMessage = 'รายได้สุทธิ (รายได้ - ค่าใช้จ่าย) ต้องมากกว่า 0 กรุณาตรวจสอบข้อมูลทางการเงิน';
      } else if (error.status === 422) {
        errorTitle = 'ข้อมูลไม่ถูกต้อง';
        if (error.details && Array.isArray(error.details)) {
          const fieldNames: Record<string, string> = {
            customerId: 'ลูกค้า', principal: 'จำนวนเงินกู้',
            interestRate: 'อัตราดอกเบี้ย', termMonths: 'ระยะเวลา',
            annualRevenue: 'รายได้ต่อปี', annualCogs: 'ต้นทุนขาย', annualOpex: 'ค่าใช้จ่ายดำเนินงาน',
          };
          const fieldErrors = error.details.map((d: any) => {
            const field = d.path?.[0] ? (fieldNames[d.path[0]] || d.path[0]) : '';
            if (d.message?.includes('positive') || d.message?.includes('tooLow')) return `${field}ต้องมากกว่า 0`;
            if (d.message?.includes('required')) return `กรุณากรอก${field}`;
            return d.message || `${field}ไม่ถูกต้อง`;
          });
          userFriendlyMessage = fieldErrors.join(' | ');
        } else {
          userFriendlyMessage = 'กรุณาตรวจสอบข้อมูลที่กรอกให้ครบถ้วนและถูกต้อง';
        }
      } else if (error.status === 403) {
        errorTitle = 'ไม่มีสิทธิ์';
        userFriendlyMessage = 'คุณไม่มีสิทธิ์สร้างคำขอสินเชื่อสำหรับลูกค้ารายนี้';
      } else if (error.status === 404) {
        userFriendlyMessage = 'ไม่พบข้อมูลลูกค้าหรือผลิตภัณฑ์ที่เลือก กรุณาเลือกใหม่';
      } else if (error.status >= 500) {
        userFriendlyMessage = 'เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง';
      } else if (msg) {
        userFriendlyMessage = msg;
      }

      alertDialog.error({
        title: errorTitle,
        description: userFriendlyMessage,
        confirmText: 'ตกลง',
      });
    },
  });

  // Approve loan mutation
  const approveLoanMutation = useMutation({
    mutationFn: async ({ loanId, notes }: { loanId: string; notes?: string }) => {
      const result = await loansApi.approve(loanId, { notes });
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: async (_approvedLoan, variables) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['loan'] });
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      alertDialog.success({
        title: 'อนุมัติสินเชื่อสำเร็จ!',
        description: 'กรุณาไปที่เมนู "เบิกจ่ายเงินกู้" เพื่อสร้างคำขอเบิกจ่ายและดำเนินการต่อ',
        confirmText: 'ตกลง',
      });
    },
    onError: (error: ApiError) => {
      let userFriendlyMessage = 'ไม่สามารถอนุมัติสินเชื่อได้';

      if (error.status === 403) {
        userFriendlyMessage = error.message || 'คุณไม่มีสิทธิ์ในการอนุมัติสินเชื่อ';
      } else if (error.status === 404) {
        userFriendlyMessage = error.message || 'ไม่พบข้อมูลสินเชื่อที่ต้องการอนุมัติ';
      } else if (error.status === 400) {
        if (error.message?.includes('not pending')) {
          userFriendlyMessage = 'สินเชื่อนี้ไม่ได้อยู่ในสถานะรอการอนุมัติ';
        } else {
          userFriendlyMessage = error.message || 'ไม่สามารถอนุมัติสินเชื่อได้';
        }
      } else if (error.status >= 500) {
        userFriendlyMessage = 'เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง';
      } else if (error.message) {
        userFriendlyMessage = error.message;
      }

      const description = error.nextSteps?.length ? (
        <div className="space-y-2">
          <div>{userFriendlyMessage}</div>
          <div className="text-sm font-medium">สิ่งที่ควรทำต่อ:</div>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {error.nextSteps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ul>
        </div>
      ) : (
        userFriendlyMessage
      );

      alertDialog.error({
        title: 'ไม่สามารถอนุมัติได้',
        description,
        confirmText: 'ตกลง',
      });
    },
  });

  // Reject loan mutation
  const rejectLoanMutation = useMutation({
    mutationFn: async ({ loanId, reason }: { loanId: string; reason: string }) => {
      const result = await loansApi.reject(loanId, { reason });
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['loan'] });
      alertDialog.warning({
        title: 'ปฏิเสธสินเชื่อแล้ว',
        description: 'ระบบได้บันทึกการปฏิเสธเรียบร้อยแล้ว',
        confirmText: 'ตกลง',
      });
    },
    onError: (error: ApiError) => {
      alertDialog.error({
        title: 'ไม่สามารถปฏิเสธได้',
        description: error.message || 'เกิดข้อผิดพลาดในการปฏิเสธสินเชื่อ',
        confirmText: 'ตกลง',
      });
    },
  });

  // Delete loan mutation (All roles with access)
  const deleteLoanMutation = useMutation({
    mutationFn: async (loanId: string) => {
      const result = await loansApi.delete(loanId);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan-statistics'] });
      alertDialog.success({
        title: 'ลบสินเชื่อสำเร็จ',
        description: isAdmin && data?.auditLog
          ? `ลบโดย: ${data.auditLog.deletedBy?.email} (${data.auditLog.deletedBy?.role})`
          : 'ระบบได้บันทึกการลบเรียบร้อยแล้ว',
        confirmText: 'ตกลง',
      });
    },
    onError: (error: ApiError) => {
      alertDialog.error({
        title: 'ไม่สามารถลบได้',
        description: error.message || 'เกิดข้อผิดพลาดในการลบสินเชื่อ',
        confirmText: 'ตกลง',
      });
    },
  });

  // Restore loan mutation (Admin only)
  const restoreLoanMutation = useMutation({
    mutationFn: async (loanId: string) => {
      const result = await loansApi.restore(loanId);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loan-statistics'] });
      alertDialog.success({
        title: 'กู้คืนสินเชื่อสำเร็จ',
        description: 'ระบบได้กู้คืนข้อมูลเรียบร้อยแล้ว',
        confirmText: 'ตกลง',
      });
    },
    onError: (error: ApiError) => {
      alertDialog.error({
        title: 'ไม่สามารถกู้คืนได้',
        description: error.message || 'เกิดข้อผิดพลาดในการกู้คืนสินเชื่อ',
        confirmText: 'ตกลง',
      });
    },
  });

  // Record payment mutation - removed, now handled in /payments page

  // Map backend loans to frontend format
  const loans: Loan[] = (loansData?.loans || []).map((l: ApiLoan) => ({
    id: l.id,
    contractNumber:
      (l as any).contractNumber ||
      (l as any).contract_number ||
      (l as any).loanContractNo ||
      (l as any).loan_number ||
      (l as any).loanNo,
    customerId: l.customerId,
    customerName: l.customer?.businessName || 'Unknown',
    customerAvatar: l.customer?.avatar,
    amount: Number((l as any).principal ?? (l as any).amount ?? 0),
    outstandingBalance: Number(
      (l as any).outstandingBalance ??
      (l as any).outstanding_balance ??
      (l as any).remainingAmount ??
      0
    ),
    interestRate: Number(l.interestRate || 0),
    duration: l.termMonths || 0,
    dscr: Number(l.dscr || 0),
    status: mapLoanStatus(l.status),
    createdAt: l.createdAt,
    approvedAt: (l as any).approvedAt || (l as any).approvedDate,
    disbursementDate: l.disbursementDate,
    nextPaymentDate: l.nextPaymentDate ? String(l.nextPaymentDate) : undefined,
    creditGrade: l.creditGrade,
    creditScore: l.creditScore,
    creditReasons: l.creditReasons,
    creditNextActions: l.creditNextActions,
    loanProduct: (l as any).loanProduct,
    branch: (l as any).branch,
    officer: (l as any).officer,
  }));

  const filteredLoans = useMemo(() => {
    return loans.filter(loan => {
      const matchesSearch = loan.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (loan.contractNumber && loan.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [loans, searchTerm, statusFilter]);

  // Memoize formatters
  const currencyFormatter = useMemo(() => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    });
  }, []);

  const compactNumberFormatter = useMemo(() => {
    return new Intl.NumberFormat('en-US', {
      notation: "compact",
      maximumFractionDigits: 1
    });
  }, []);

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Bangkok'
    });
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return currencyFormatter.format(amount);
  }, [currencyFormatter]);

  const formatCompactNumber = useCallback((number: number) => {
    return compactNumberFormatter.format(number);
  }, [compactNumberFormatter]);

  const formatDate = useCallback((dateValue: string | Date | undefined) => {
    if (!dateValue) return '-';
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      return dateFormatter.format(date);
    } catch (error) {
      return typeof dateValue === 'string' ? dateValue : '-';
    }
  }, [dateFormatter]);

  const getDscrColor = useCallback((dscr: number) => {
    if (dscr >= 1.5) return 'text-success';
    if (dscr >= 1.25) return 'text-success';
    if (dscr >= 1.0) return 'text-warning';
    return 'text-destructive';
  }, []);

  const calculateDSCR = useCallback(() => {
    const revenue = parseFloat(formData.revenue) || 0;
    const expenses = parseFloat(formData.expenses) || 0;
    const debtPayment = parseFloat(formData.debtPayment) || 1;
    const netOperatingIncome = revenue - expenses;
    return netOperatingIncome / debtPayment;
  }, [formData.revenue, formData.expenses, formData.debtPayment]);

  const handleCreateLoan = async () => {
    // Validate required fields
    if (!formData.customerId || !formData.amount || !formData.revenue || !formData.expenses) {
      alertDialog.error({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกข้อมูลให้ครบถ้วน',
        confirmText: 'ตกลง',
      });
      return;
    }

    const revenue = parseFloat(formData.revenue) || 0;   // รายได้ต่อปี
    const expenses = parseFloat(formData.expenses) || 0; // ค่าใช้จ่ายต่อปี
    const debtPayment = parseFloat(formData.debtPayment) || 1; // ภาระหนี้ต่อปี
    const amount = parseFloat(formData.amount) || 0;

    // Validate product limits before submit
    if (formData.loanProductId) {
      const product = loanProducts?.find(p => p.id === formData.loanProductId);
      if (product) {
        const maxAmt = Number(product.maxLoanAmount);
        const minAmt = product.minLoanAmount ? Number(product.minLoanAmount) : null;
        const budget = productBudgets?.[product.id];
        const available = budget ? Number(budget.available_amount) : null;

        if (amount > maxAmt) {
          alertDialog.error({
            title: 'วงเงินเกินที่กำหนด',
            description: `จำนวนเงินกู้ ${amount.toLocaleString('th-TH')} บาท เกินวงเงินสูงสุดของผลิตภัณฑ์ "${product.productName}" ที่กำหนดไว้ ${maxAmt.toLocaleString('th-TH')} บาท`,
            confirmText: 'ตกลง',
          });
          return;
        }
        if (minAmt !== null && amount < minAmt) {
          alertDialog.error({
            title: 'วงเงินต่ำกว่าที่กำหนด',
            description: `จำนวนเงินกู้ ${amount.toLocaleString('th-TH')} บาท ต่ำกว่าวงเงินขั้นต่ำของผลิตภัณฑ์ "${product.productName}" ที่กำหนดไว้ ${minAmt.toLocaleString('th-TH')} บาท`,
            confirmText: 'ตกลง',
          });
          return;
        }
        if (available !== null && amount > available) {
          alertDialog.error({
            title: 'งบประมาณไม่เพียงพอ',
            description: `จำนวนเงินกู้ ${amount.toLocaleString('th-TH')} บาท เกินงบประมาณคงเหลือ ${available.toLocaleString('th-TH')} บาท`,
            confirmText: 'ตกลง',
          });
          return;
        }
        if (product.minRevenue && revenue < Number(product.minRevenue)) {
          alertDialog.error({
            title: 'รายได้ไม่ผ่านเกณฑ์',
            description: `รายได้ต่อปี ${revenue.toLocaleString('th-TH')} บาท ต่ำกว่าเกณฑ์ขั้นต่ำของผลิตภัณฑ์ "${product.productName}" ที่กำหนดไว้ ${Number(product.minRevenue).toLocaleString('th-TH')} บาท/ปี`,
            confirmText: 'ตกลง',
          });
          return;
        }
      }
    }

    if (revenue <= 0) {
      alertDialog.error({ title: 'รายได้ไม่ถูกต้อง', description: 'รายได้ต่อปีต้องมากกว่า 0', confirmText: 'ตกลง' });
      return;
    }

    const netOperatingIncome = revenue - expenses;
    if (netOperatingIncome <= 0) {
      alertDialog.error({
        title: 'รายได้สุทธิไม่ถูกต้อง',
        description: `รายได้สุทธิ (${revenue.toLocaleString('th-TH')} - ${expenses.toLocaleString('th-TH')} = ${netOperatingIncome.toLocaleString('th-TH')} บาท) ต้องมากกว่า 0 กรุณาตรวจสอบรายได้และค่าใช้จ่าย`,
        confirmText: 'ตกลง',
      });
      return;
    }

    const dscr = netOperatingIncome / debtPayment;
    if (dscr < 1.25) {
      alertDialog.info({
        title: 'DSCR ต่ำกว่าเกณฑ์แนะนำ',
        description: `DSCR ${dscr.toFixed(2)} ต่ำกว่าเกณฑ์แนะนำ 1.25 คำขอจะถูกส่งไปรอการพิจารณาจากผู้มีอำนาจอนุมัติ`,
        confirmText: 'เข้าใจแล้ว',
      });
    }

    // ส่งข้อมูลรายปีตรงๆ — backend รับ annualRevenue/annualCogs/annualOpex แล้วหาร 12 เอง
    const annualRevenue = revenue;
    const annualCogs = expenses * 0.6;
    const annualOpex = expenses * 0.4;

    await createLoanMutation.mutateAsync({
      customerId: formData.customerId,
      loanProductId: formData.loanProductId || undefined,
      principal: amount,
      interestRate: formData.loanProductId ? 1 : parseFloat(formData.interestRate),
      termMonths: parseInt(formData.duration, 10),
      annualRevenue,
      annualCogs,
      annualOpex,
    });
  };

  // Remove payment schedule handler - this is now handled in Disbursements.tsx

  const handleViewLoan = useCallback((loan: Loan) => {
    setSelectedLoan(loan);
    setSelectedLoanId(loan.id);
    setIsViewDialogOpen(true);
  }, []);

  const handleApproveLoan = useCallback(async (loanId: string) => {
    setSelectedLoan(loans.find(l => l.id === loanId) || null);
    setSelectedLoanId(loanId);
    setIsViewDialogOpen(true);
  }, [loans]);

  const handleApproveFromView = useCallback(async (loanId: string, approvalData?: { notes?: string }) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    await approveLoanMutation.mutateAsync({
      loanId: loan.id,
      notes: approvalData?.notes || 'อนุมัติโดยระบบ'
    });
    setIsViewDialogOpen(false);
  }, [loans, approveLoanMutation]);

  const handleRejectFromView = useCallback(async (loanId: string, rejectData?: { reason: string }) => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return;

    await rejectLoanMutation.mutateAsync({
      loanId: loan.id,
      reason: rejectData?.reason || 'ไม่เป็นไปตามเกณฑ์ประเมินความเสี่ยง'
    });
    setIsViewDialogOpen(false);
  }, [loans, rejectLoanMutation]);

  const handleRejectLoan = useCallback(async (loanId: string) => {
    setSelectedLoan(loans.find(l => l.id === loanId) || null);
    setSelectedLoanId(loanId);
    setIsViewDialogOpen(true);
  }, [loans]);

  const handleRecordPayment = useCallback((loan: Loan) => {
    // Navigate to payments page for active loans
    navigate(`/payments`);
  }, [navigate]);

  const handleViewDocuments = useCallback((loan: Loan) => {
    // Navigate to documents page with customer filter
    navigate(`/documents?customerId=${loan.customerId}`);
  }, [navigate]);



  // Export to CSV function
  const handleExportToCSV = () => {
    try {
      // Prepare CSV data
      const headers = [
        'เลขที่สัญญา',
        'ลูกค้า',
        'จำนวนเงินกู้',
        'ยอดคงเหลือ',
        'อัตราดอกเบี้ย',
        'ระยะเวลา (เดือน)',
        'DSCR',
        'สถานะ',
        'วันที่สร้าง',
        'วันที่อนุมัติ',
        'วันที่เบิกจ่าย',
        'งวดถัดไป'
      ];

      const csvData = filteredLoans.map(loan => [
        loan.contractNumber || loan.id,
        loan.customerName,
        loan.amount,
        loan.outstandingBalance,
        `${loan.interestRate}%`,
        loan.duration,
        loan.dscr != null && !isNaN(Number(loan.dscr)) ? Number(loan.dscr).toFixed(2) : 'N/A',
        statusConfig[loan.status].label,
        formatDate(loan.createdAt),
        loan.approvedAt ? formatDate(loan.approvedAt) : '-',
        loan.disbursementDate ? formatDate(loan.disbursementDate) : '-',
        loan.nextPaymentDate ? formatDate(loan.nextPaymentDate) : '-'
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => {
          // Escape commas and quotes in cell content
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(','))
      ].join('\n');

      // Add BOM for UTF-8 encoding (for Excel to recognize Thai characters)
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);

      // Generate filename with current date
      const dateStr = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');

      const statusLabel = statusFilter === 'all' ? 'ทั้งหมด' : 
                         statusConfig[statusFilter as keyof typeof statusConfig]?.label || statusFilter;

      link.setAttribute('download', `รายการคำขอสินเชื่อ_${statusLabel}_${dateStr}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`✅ ส่งออกข้อมูล ${filteredLoans.length} รายการสำเร็จ`, {
        description: 'ไฟล์ CSV ถูกดาวน์โหลดแล้ว',
        duration: 3000
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('❌ ไม่สามารถส่งออกข้อมูลได้', {
        description: 'กรุณาลองใหม่อีกครั้ง',
        duration: 3000
      });
    }
  };

  // Use statistics from API instead of calculating from current page
  const totalCount = statsData?.totalLoans || 0;
  const pendingCount = statsData?.pendingCount || 0;
  // Approved card should include post-approval states too (DISBURSED/ACTIVE)
  // รวม NPL/DEFAULTED ด้วย เพราะถือว่า "ผ่านการอนุมัติแล้ว" แต่กลายเป็นหนี้เสียภายหลัง
  const approvedCount =
    (statsData?.approvedCount || 0) +
    (statsData?.activeCount || 0) +
    (statsData?.nplCount || 0) +
    (statsData?.statusCounts?.DEFAULTED || 0);
  const rejectedCount = statsData?.statusCounts?.REJECTED || 0;

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'การจัดการคำขอสินเชื่อ' }]}>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">การจัดการคำขอสินเชื่อ</h1>
          <p className="text-white">สร้าง อนุมัติ และติดตามคำขอสินเชื่อ</p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => navigate('/payments')} className="w-full sm:w-auto">
            <Wallet className="h-4 w-4 mr-2" />
            <span className="truncate">สัญญาที่มีหนี้</span>
          </Button>
          {/* Only Loan Officer and Admin can access disbursement */}
          {(currentRole === 'loan_officer' || currentRole === 'admin') && (
            <Button variant="outline" onClick={() => navigate('/expenses')} className="w-full sm:w-auto">
              <Wallet className="h-4 w-4 mr-2" />
              <span className="truncate">เบิกจ่ายเงินกู้</span>
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleExportToCSV}
            disabled={filteredLoans.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="truncate">ส่งออก ({filteredLoans.length})</span>
          </Button>
          {/* Only Loan Officer and Admin can create loan applications */}
          {(currentRole === 'loan_officer' || currentRole === 'admin') && (
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) setCurrentStep(1); // Reset step when closing
            }}>
            
            <DialogContent className="max-w-[95vw] sm:max-w-[800px] max-h-[90vh] overflow-hidden border rounded-lg">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">สร้างคำขอสินเชื่อใหม่</DialogTitle>
                <DialogDescription className="text-sm">
                  กรอกข้อมูลสินเชื่อและข้อมูลทางการเงินเพื่อคำนวณ DSCR
                </DialogDescription>
              </DialogHeader>
              
              {/* Step Indicator */}
              <div className="flex items-center justify-center gap-2 py-4 border-b">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                      currentStep === step 
                        ? 'border-primary bg-primary text-white' 
                        : currentStep > step
                        ? 'border-success bg-success text-white'
                        : 'border-muted-foreground text-muted-foreground'
                    }`}>
                      {currentStep > step ? <Check className="h-4 w-4" /> : step}
                    </div>
                    {step < 3 && (
                      <div className={`w-12 sm:w-20 h-0.5 mx-1 ${
                        currentStep > step ? 'bg-success' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              <div className="overflow-y-auto max-h-[calc(90vh-250px)] py-4">
                {/* Step 1: Customer & Product Selection */}
                {currentStep === 1 && (
                  <div className="space-y-4 px-1">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-900">📋 ขั้นตอนที่ 1: เลือกลูกค้าและผลิตภัณฑ์</p>
                      <p className="text-xs text-blue-700 mt-1">เลือกลูกค้าที่ต้องการสร้างคำขอสินเชื่อ และผลิตภัณฑ์ที่เหมาะสม</p>
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="customer" className="text-sm font-medium">เลือกลูกค้า *</Label>
                        <Popover open={isCustomerOpen} onOpenChange={setIsCustomerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={isCustomerOpen}
                              className="w-full justify-between h-auto min-h-[44px]"
                            >
                              <span className="truncate">
                                {formData.customerId ? (() => {
                                  const c = customersData?.customers?.find((customer: Customer) => customer.id === formData.customerId);
                                  return c ? (
                                    <span className="flex flex-col items-start text-left">
                                      <span>{c.businessName}</span>
                                      {c.createdByName && (
                                        <span className="text-xs text-muted-foreground font-normal">
                                          เจ้าหน้าที่: {c.createdByName}
                                        </span>
                                      )}
                                    </span>
                                  ) : 'เลือกลูกค้า';
                                })() : "เลือกลูกค้า"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="ค้นหาลูกค้า..." />
                              <CommandList>
                                <CommandEmpty>ไม่พบลูกค้า</CommandEmpty>
                                <CommandGroup>
                                  {customersData?.customers?.map((customer: Customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      value={`${customer.businessName} ${customer.createdByName || ''} ${customer.customerCode || ''}`}
                                      onSelect={() => {
                                        setFormData({ ...formData, customerId: customer.id });
                                        setIsCustomerOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4 shrink-0",
                                          formData.customerId === customer.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col min-w-0">
                                        <span className="font-medium truncate">{customer.businessName}</span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-2">
                                          {customer.createdByName && (
                                            <span>👤 {customer.createdByName}</span>
                                          )}
                                          {customer.customerCode && (
                                            <span className="text-slate-400">{customer.customerCode}</span>
                                          )}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="loanProduct" className="text-sm font-medium">เลือกผลิตภัณฑ์สินเชื่อ (แนะนำ)</Label>
                        <Popover open={isLoanProductOpen} onOpenChange={setIsLoanProductOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={isLoanProductOpen}
                              className="w-full justify-between h-auto min-h-[44px]"
                            >
                              <span className="truncate">
                                {formData.loanProductId
                                  ? loanProducts?.find((p) => p.id === formData.loanProductId)?.productName
                                  : "เลือกผลิตภัณฑ์สินเชื่อ (ไม่บังคับ)"}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="ค้นหาผลิตภัณฑ์สินเชื่อ..." />
                              <CommandList>
                                <CommandEmpty>ไม่พบผลิตภัณฑ์สินเชื่อ</CommandEmpty>
                                <CommandGroup>
                                  {loanProducts?.map((product) => {
                                    const budget = productBudgets?.[product.id];
                                    const hasBudget = budget && Number(budget.available_amount || 0) > 0;
                                    
                                    return (
                                      <CommandItem
                                        key={product.id}
                                        value={`${product.productName} ${product.productCode}`}
                                        onSelect={() => {
                                          if (!hasBudget) {
                                            toast.error('ไม่สามารถเลือกได้', {
                                              description: 'ผลิตภัณฑ์นี้ยังไม่มีงบประมาณหรืองบประมาณหมดแล้ว',
                                            });
                                            return;
                                          }
                                          setFormData({
                                            ...formData,
                                            loanProductId: product.id,
                                            interestRate: product?.interestRateYear1_3?.toString() || formData.interestRate,
                                          });
                                          setIsLoanProductOpen(false);
                                        }}
                                        disabled={!hasBudget}
                                        className={cn(!hasBudget && "opacity-50 cursor-not-allowed")}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            formData.loanProductId === product.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col flex-1">
                                          <div className="flex items-center gap-2">
                                            <span>{product.productName}</span>
                                            {!hasBudget && (
                                              <Badge variant="destructive" className="text-xs">
                                                ไม่มีงบประมาณ
                                              </Badge>
                                            )}
                                          </div>
                                          <span className="text-xs text-muted-foreground">
                                            {product.interestRateYear1_3 && `${product.interestRateYear1_3}%`}
                                            {product.interestRateFormula && ` (${product.interestRateFormula})`}
                                            {' • '}
                                            สูงสุด {(product.maxLoanAmount / 1000000).toFixed(1)}M
                                            {product.maxTermMonths && ` • สูงสุด ${product.maxTermMonths} เดือน`}
                                            {hasBudget && budget && (
                                              <>
                                                {' • '}
                                                งบคงเหลือ {(Number(budget.available_amount) / 1000000).toFixed(2)}M
                                              </>
                                            )}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {formData.loanProductId && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <p className="text-sm font-medium text-blue-900">
                              💡 อัตราดอกเบี้ยจะถูกคำนวณอัตโนมัติจากผลิตภัณฑ์ที่เลือก
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Loan Details */}
                {currentStep === 2 && (
                  <div className="space-y-4 px-1">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-green-900">💰 ขั้นตอนที่ 2: รายละเอียดสินเชื่อ</p>
                      <p className="text-xs text-green-700 mt-1">กำหนดจำนวนเงิน อัตราดอกเบี้ย และระยะเวลาผ่อนชำระ</p>
                    </div>

                    {/* Product limits info box */}
                    {formData.loanProductId && (() => {
                      const product = loanProducts?.find(p => p.id === formData.loanProductId);
                      if (!product) return null;
                      const budget = productBudgets?.[product.id];
                      const minAmt = product.minLoanAmount ? Number(product.minLoanAmount) : null;
                      const maxAmt = Number(product.maxLoanAmount);
                      const available = budget ? Number(budget.available_amount) : null;
                      const enteredAmt = parseFloat(formData.amount) || 0;
                      const overMax = enteredAmt > maxAmt;
                      const underMin = minAmt !== null && enteredAmt > 0 && enteredAmt < minAmt;
                      const overBudget = available !== null && enteredAmt > available;
                      return (
                        <div className={`rounded-lg border p-3 space-y-1 ${overMax || underMin || overBudget ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                          <p className={`text-sm font-semibold ${overMax || underMin || overBudget ? 'text-red-800' : 'text-blue-800'}`}>
                            📋 เงื่อนไขวงเงิน: {product.productName}
                          </p>
                          <div className="text-xs space-y-0.5">
                            {minAmt !== null && (
                              <p className={underMin ? 'text-red-700 font-medium' : 'text-blue-700'}>
                                {underMin ? '⚠️' : '•'} วงเงินขั้นต่ำ: {minAmt.toLocaleString('th-TH')} บาท
                              </p>
                            )}
                            <p className={overMax ? 'text-red-700 font-medium' : 'text-blue-700'}>
                              {overMax ? '⚠️' : '•'} วงเงินสูงสุด: {maxAmt.toLocaleString('th-TH')} บาท
                            </p>
                            {product.maxTermMonths && (
                              <p className="text-blue-700">• ระยะเวลาสูงสุด: {product.maxTermMonths} เดือน ({Math.round(product.maxTermMonths / 12)} ปี)</p>
                            )}
                            {available !== null && (
                              <p className={overBudget ? 'text-red-700 font-medium' : 'text-blue-700'}>
                                {overBudget ? '⚠️' : '•'} งบประมาณคงเหลือ: {available.toLocaleString('th-TH')} บาท
                              </p>
                            )}
                            {product.minRevenue && (
                              <p className="text-blue-700">• รายได้ขั้นต่ำ: {Number(product.minRevenue).toLocaleString('th-TH')} บาท/ปี</p>
                            )}
                            {product.minYearsInBusiness && (
                              <p className="text-blue-700">• ธุรกิจต้องดำเนินการมาแล้ว: {product.minYearsInBusiness} ปีขึ้นไป</p>
                            )}
                          </div>
                          {(overMax || underMin || overBudget) && (
                            <p className="text-xs text-red-700 font-medium mt-1">
                              {overMax && 'จำนวนเงินเกินวงเงินสูงสุดที่กำหนด '}
                              {underMin && 'จำนวนเงินต่ำกว่าวงเงินขั้นต่ำที่กำหนด '}
                              {overBudget && 'จำนวนเงินเกินงบประมาณคงเหลือ'}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="amount" className="text-sm font-medium">จำนวนเงินกู้ (บาท) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={formData.amount}
                          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                          placeholder="1,000,000"
                          className="text-base h-11"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="rate" className="text-sm font-medium">อัตราดอกเบี้ย (% ต่อปี) *</Label>
                        {formData.loanProductId ? (
                          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-blue-900">
                                {(() => {
                                  const product = loanProducts?.find(p => p.id === formData.loanProductId);
                                  if (!product) return 'กำลังโหลด...';

                                  if (product.interestRateType === 'FIXED') {
                                    return `${product.interestRateYear1_3}% (คงที่)`;
                                  } else if (product.interestRateType === 'VARIABLE') {
                                    return `${product.interestRateFormula || 'ลอยตัว'}`;
                                  } else if (product.interestRateType === 'MIXED') {
                                    return `ปีที่ 1-3: ${product.interestRateYear1_3}%, ปีที่ 4+: ${product.interestRateYear4Plus || product.interestRateFormula}`;
                                  } else if (product.interestRateType === 'TIERED') {
                                    return 'หลาย Tier (ขึ้นอยู่กับระยะเวลาและจำนวน)';
                                  }
                                  return 'ตามผลิตภัณฑ์';
                                })()}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                ระบบจะคำนวณอัตราจริงตามระยะเวลาและจำนวนเงินกู้
                              </p>
                            </div>
                          </div>
                        ) : (
                          <Input
                            id="rate"
                            type="number"
                            step="0.1"
                            value={formData.interestRate}
                            onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                            placeholder="เช่น 8.5"
                            className="text-base h-11"
                          />
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="duration" className="text-sm font-medium">ระยะเวลา (เดือน) *</Label>
                        <Select
                          value={formData.duration}
                          onValueChange={(value) => setFormData({ ...formData, duration: value })}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 เดือน</SelectItem>
                            <SelectItem value="6">6 เดือน</SelectItem>
                            <SelectItem value="9">9 เดือน</SelectItem>
                            <SelectItem value="12">12 เดือน (1 ปี)</SelectItem>
                            <SelectItem value="18">18 เดือน (1.5 ปี)</SelectItem>
                            <SelectItem value="24">24 เดือน (2 ปี)</SelectItem>
                            <SelectItem value="36">36 เดือน (3 ปี)</SelectItem>
                            <SelectItem value="48">48 เดือน (4 ปี)</SelectItem>
                            <SelectItem value="60">60 เดือน (5 ปี)</SelectItem>
                            <SelectItem value="72">72 เดือน (6 ปี)</SelectItem>
                            <SelectItem value="84">84 เดือน (7 ปี)</SelectItem>
                            <SelectItem value="96">96 เดือน (8 ปี)</SelectItem>
                            <SelectItem value="120">120 เดือน (10 ปี)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Financial Data & DSCR */}
                {currentStep === 3 && (
                  <div className="space-y-4 px-1">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-purple-900">📊 ขั้นตอนที่ 3: ข้อมูลทางการเงิน</p>
                      <p className="text-xs text-purple-700 mt-1">กรอกข้อมูลรายได้และค่าใช้จ่าย<strong>ต่อปี</strong>เพื่อคำนวณ DSCR</p>
                    </div>

                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="revenue" className="text-sm font-medium">รายได้ต่อปี (บาท) *</Label>
                        <Input
                          id="revenue"
                          type="number"
                          value={formData.revenue}
                          onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                          placeholder="6,000,000"
                          className="text-base h-11"
                        />
                        {formData.revenue && (
                          <p className="text-xs text-muted-foreground">≈ {(parseFloat(formData.revenue)/12).toLocaleString('th-TH', {maximumFractionDigits:0})} บาท/เดือน</p>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="expenses" className="text-sm font-medium">ค่าใช้จ่ายต่อปี (บาท) *</Label>
                        <Input
                          id="expenses"
                          type="number"
                          value={formData.expenses}
                          onChange={(e) => setFormData({ ...formData, expenses: e.target.value })}
                          placeholder="4,200,000"
                          className="text-base h-11"
                        />
                        {formData.expenses && (
                          <p className="text-xs text-muted-foreground">≈ {(parseFloat(formData.expenses)/12).toLocaleString('th-TH', {maximumFractionDigits:0})} บาท/เดือน</p>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="debt" className="text-sm font-medium">ภาระหนี้ต่อปี (บาท) *</Label>
                        <Input
                          id="debt"
                          type="number"
                          value={formData.debtPayment}
                          onChange={(e) => setFormData({ ...formData, debtPayment: e.target.value })}
                          placeholder="1,200,000"
                          className="text-base h-11"
                        />
                        {formData.debtPayment && (
                          <p className="text-xs text-muted-foreground">≈ {(parseFloat(formData.debtPayment)/12).toLocaleString('th-TH', {maximumFractionDigits:0})} บาท/เดือน</p>
                        )}
                      </div>
                    </div>

                    {/* DSCR Display */}
                    <Card className={`border-2 ${
                      calculateDSCR() >= 1.25 
                        ? 'border-success bg-success/5' 
                        : calculateDSCR() >= 1.0 
                        ? 'border-warning bg-warning/5' 
                        : 'border-destructive bg-destructive/5'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground mb-1">DSCR (แนะนำ ≥ 1.25)</p>
                            <p className={`text-4xl font-bold ${getDscrColor(calculateDSCR())}`}>
                              {calculateDSCR().toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              สูตร: (รายได้ - ค่าใช้จ่าย) ÷ ภาระหนี้ (รายปี)
                            </p>
                          </div>
                          <div className={`p-4 rounded-xl ${
                            calculateDSCR() >= 1.25 
                              ? 'bg-success/20' 
                              : calculateDSCR() >= 1.0 
                              ? 'bg-warning/20' 
                              : 'bg-destructive/20'
                          }`}>
                            {calculateDSCR() >= 1.25 ? (
                              <CheckCircle className="h-12 w-12 text-success" />
                            ) : calculateDSCR() >= 1.0 ? (
                              <Clock className="h-12 w-12 text-warning" />
                            ) : (
                              <AlertTriangle className="h-12 w-12 text-destructive" />
                            )}
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t space-y-2">
                          {calculateDSCR() >= 1.25 && (
                            <p className="text-sm text-success flex items-center gap-2">
                              <CheckCircle className="h-4 w-4" />
                              DSCR ผ่านเกณฑ์แนะนำ มีโอกาสได้รับอนุมัติสูง
                            </p>
                          )}
                          {calculateDSCR() >= 1.0 && calculateDSCR() < 1.25 && (
                            <p className="text-sm text-warning flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              DSCR ต่ำกว่าเกณฑ์แนะนำ ต้องการการพิจารณาพิเศษ
                            </p>
                          )}
                          {calculateDSCR() < 1.0 && (
                            <p className="text-sm text-destructive flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              DSCR ต่ำมาก ต้องการเอกสารเพิ่มเติมและการพิจารณาอย่างรอบคอบ
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-row justify-between gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (currentStep === 1) {
                      setIsCreateDialogOpen(false);
                      setCurrentStep(1);
                    } else {
                      setCurrentStep(currentStep - 1);
                    }
                  }}
                  className="w-auto"
                >
                  {currentStep === 1 ? 'ยกเลิก' : 'ย้อนกลับ'}
                </Button>
                
                {currentStep < 3 ? (
                  <Button
                    onClick={() => {
                      // Validate current step before proceeding
                      if (currentStep === 1 && !formData.customerId) {
                        toast.error('กรุณาเลือกลูกค้า');
                        return;
                      }
                      if (currentStep === 2 && (!formData.amount || !formData.duration)) {
                        toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
                        return;
                      }
                      setCurrentStep(currentStep + 1);
                    }}
                    className="w-auto"
                  >
                    ถัดไป
                  </Button>
                ) : (
                  <Button
                    onClick={handleCreateLoan}
                    disabled={createLoanMutation.isPending}
                    className="w-auto"
                  >
                    {createLoanMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        กำลังสร้าง...
                      </>
                    ) : (
                      'ยืนยันคำขอ'
                    )}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="truncate">สร้างคำขอ</span>
              </Button>
            </DialogTrigger>
          </Dialog >
          )}
        </div >
      </div >

      {/* Stats Cards */}
      <LoanStatsCards
        totalCount={totalCount}
        approvedCount={approvedCount}
        pendingCount={pendingCount}
        rejectedCount={rejectedCount}
        isLoading={isLoadingStats}
      />


      <Card>
        <CardHeader className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 pb-4">
          <div>
            <CardTitle>รายการสินเชื่อ</CardTitle>
            <CardDescription>แสดง {filteredLoans.length} จาก {loans.length} รายการ</CardDescription>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto md:flex-row md:items-center md:gap-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อลูกค้า, เลขสัญญา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            {isAdmin && (
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full md:w-[180px] bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90">
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
            {isManager && (
              <Select value={officerFilter} onValueChange={setOfficerFilter}>
                <SelectTrigger className="w-full md:w-[180px] bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="พนักงานทั้งหมด" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">พนักงานทั้งหมด</SelectItem>
                  {(filterOfficersData || []).map((officer: any) => (
                    <SelectItem key={officer.id} value={officer.id}>
                      {officer.firstName} {officer.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px] bg-primary text-white border-primary hover:bg-primary/90">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="สถานะทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                <SelectItem value="pending">รอพิจารณา</SelectItem>
                <SelectItem value="approved">อนุมัติแล้ว</SelectItem>
                <SelectItem value="active">เบิกจ่ายแล้ว</SelectItem>
                <SelectItem value="closed">ปิดบัญชี</SelectItem>
                <SelectItem value="rejected">ไม่อนุมัติ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden">
            <Table>
	              <TableHeader>
	                <TableRow className="bg-white">
	                  <TableHead className="font-semibold">เลขที่สัญญา</TableHead>
	                  <TableHead className="font-semibold">ลูกค้า</TableHead>
	                  <TableHead className="font-semibold">จำนวนเงิน</TableHead>
	                  <TableHead className="font-semibold">คงเหลือ</TableHead>
	                  <TableHead className="font-semibold">DSCR</TableHead>
	                  <TableHead className="font-semibold">สถานะ</TableHead>
	                  <TableHead className="text-right font-semibold">การจัดการ</TableHead>
	                </TableRow>
	              </TableHeader>
              <TableBody>
	                {isLoading ? (
	                  <TableRow>
	                    <TableCell colSpan={7} className="p-0">
	                      <TableSkeleton rows={5} columns={7} />
	                    </TableCell>
	                  </TableRow>
	                ) : error ? (
	                  <TableRow>
	                    <TableCell colSpan={7} className="p-0">
	                      <ErrorDisplay
	                        error={error as any}
	                        onRetry={() => queryClient.invalidateQueries({ queryKey: ['loans'] })}
	                        className="m-4"
	                      />
	                    </TableCell>
	                  </TableRow>
	                ) : filteredLoans.length === 0 ? (
	                  <TableRow>
	                    <TableCell colSpan={7} className="p-0">
	                      {searchTerm || statusFilter !== 'all' ? (
	                        <EmptySearchResults
	                          searchTerm={searchTerm}
	                          onClear={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }}
                        />
                      ) : (
                        <EmptyLoans
                          onAction={() => setIsCreateDialogOpen(true)}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLoans.map((loan) => {
                    const StatusIcon = statusConfig[loan.status].icon;
                    const progress = ((loan.amount - loan.outstandingBalance) / loan.amount) * 100;

                    return (
                      <TableRow key={loan.id} className="hover:bg-muted/30">
                        <TableCell>
                          <p className="font-mono font-medium">{loan.contractNumber || loan.id}</p>
                          <p className="text-xs text-muted-foreground">
                            {loan.duration} เดือน @ {loan.interestRate}%
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar 
                              src={loan.customerAvatar} 
                              name={loan.customerName} 
                              size="md" 
                              className="h-10 w-10" 
                            />
                            <div>
                              <p className="font-medium">{loan.customerName}</p>
                              <p className="text-xs text-muted-foreground">{loan.customerId}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(loan.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{formatCurrency(loan.outstandingBalance)}</p>
                            <Progress value={progress} className="h-1.5 w-24" />
                            <p className="text-xs text-muted-foreground">{progress.toFixed(0)}% ชำระแล้ว</p>
                          </div>
                        </TableCell>
	                        <TableCell>
	                          <span className={`font-bold ${getDscrColor(loan.dscr)}`}>
	                            {loan.dscr != null && !isNaN(Number(loan.dscr)) ? Number(loan.dscr).toFixed(2) : 'N/A'}
	                          </span>
	                        </TableCell>
	                        <TableCell>
	                          <Badge className={statusConfig[loan.status].color}>
	                            <StatusIcon className="h-3 w-3 mr-1" />
	                            {statusConfig[loan.status].label}
	                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleViewLoan(loan)}>
                                <Eye className="h-4 w-4 mr-2" />
                                ดูรายละเอียด
                              </DropdownMenuItem>
                              {loan.status === 'pending' && canApproveLoan && (
                                <>
                                  <DropdownMenuItem
                                    className="text-success"
                                    onClick={() => handleApproveLoan(loan.id)}
                                    disabled={approveLoanMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    อนุมัติ
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => handleRejectLoan(loan.id)}
                                    disabled={rejectLoanMutation.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    ไม่อนุมัติ
                                  </DropdownMenuItem>
                                </>
                              )}
                              {/* Only Loan Officer and Admin can access disbursement */}
                              {(loan.status === 'approved' || loan.status === 'active') && (currentRole === 'loan_officer' || currentRole === 'admin') && (
                                <DropdownMenuItem onClick={() => navigate('/expenses')}>
                                  <Wallet className="h-4 w-4 mr-2" />
                                  เบิกจ่าย
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleViewDocuments(loan)}>
                                <FileText className="h-4 w-4 mr-2" />
                                ดูเอกสาร
                              </DropdownMenuItem>
                              {/* All roles with loan access can delete */}
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  alertDialog.confirm({
                                    title: 'ยืนยันการลบสินเชื่อ',
                                    description: isAdmin
                                      ? `คุณต้องการลบสินเชื่อนี้ใช่หรือไม่? (Admin mode - มีสิทธิ์กู้คืน)`
                                      : 'คุณต้องการลบสินเชื่อนี้ใช่หรือไม่? ข้อมูลจะถูกซ่อนและแจ้ง Admin',
                                    confirmText: 'ลบ',
                                    cancelText: 'ยกเลิก',
                                    onConfirm: () => deleteLoanMutation.mutate(loan.id),
                                  });
                                }}
                                disabled={deleteLoanMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                ลบสินเชื่อ
                              </DropdownMenuItem>
                              {/* Admin can see deleted loans and restore */}
                              {isAdmin && loan.deletedAt && (
                                <DropdownMenuItem
                                  className="text-warning"
                                  onClick={() => {
                                    alertDialog.confirm({
                                      title: 'กู้คืนสินเชื่อ',
                                      description: `สินเชื่อนี้ถูกลบโดย ${loan.deletedByName || 'ไม่ระบุ'} เมื่อ ${loan.deletedAt ? new Date(loan.deletedAt).toLocaleString('th-TH') : 'ไม่ระบุ'}`,
                                      confirmText: 'กู้คืน',
                                      cancelText: 'ยกเลิก',
                                      onConfirm: () => restoreLoanMutation.mutate(loan.id),
                                    });
                                  }}
                                  disabled={restoreLoanMutation.isPending}
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  กู้คืนสินเชื่อ
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {loansData && loansData.total > 0 && (
              <PaginationControls
                currentPage={page}
                totalPages={loansData.totalPages}
                pageSize={pageSize}
                totalItems={loansData.total}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Dialog - K-Bank Theme */}
      <LoanViewDialog
        open={isViewDialogOpen}
        onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) {
            setSelectedLoanId(null);
            setSelectedLoan(null);
          }
        }}
        selectedLoan={selectedLoan}
        loanDetailData={loanDetailData}
        isLoadingDetail={isLoadingDetail}
        statusConfig={statusConfig}
        canApproveLoan={canApproveLoan}
        onApprove={handleApproveFromView}
        onReject={handleRejectFromView}
        onNavigateToDisbursement={() => navigate('/expenses')}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getDscrColor={getDscrColor}
      />

      {/* Alert Dialog */}
      <alertDialog.AlertDialog />
      </div>
    </DashboardLayout >
  );
}
