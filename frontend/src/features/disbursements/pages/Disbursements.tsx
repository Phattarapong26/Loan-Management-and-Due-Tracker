import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Progress } from '@/shared/components/ui/progress';
import {
  Plus,
  Search,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Eye,
  Edit,
  ThumbsUp,
  ThumbsDown,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Loader,
  Download,
  Building2,
  LucideIcon,
  RefreshCw,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';
import { disbursementsApi, customersApi, branchesApi, loansApi, Disbursement, Customer, Branch, Loan } from '@/shared/lib/api-endpoints';
import { UserAvatar } from '@/shared/components/ui/user-avatar';
import { DisbursementRejectDialog } from '../components/DisbursementRejectDialog';
import { DisbursementDisburseDialog } from '../components/DisbursementDisburseDialog';
import { DisbursementDetailDialog } from '../components/DisbursementDetailDialog';
import { DisbursementApproveDialog } from '../components/DisbursementApproveDialog';
import { DisbursementSuccessDialog } from '../components/DisbursementSuccessDialog';
import { DisbursementStatsCards } from '../components/DisbursementStatsCards';
import { useAlertDialog } from '@/shared/hooks/useAlertDialog';
import { useAuth } from '@/shared/contexts/AuthContext';

type DisbursementStatus = Disbursement['status'];

interface CreateDisbursementInput {
  loanId: string;
  amount: number;
  purpose: string;
  requestedDate: string;
  firstPaymentDate?: string;
  paymentDay?: number;
  notes?: string;
}

interface DisburseInput {
  id: string;
  disbursementMethod: string;
  referenceNo?: string;
  notes?: string;
}

const statusConfig: Record<DisbursementStatus, { label: string; icon: LucideIcon; color: string }> = {
  PENDING: { label: 'รออนุมัติ', icon: Clock, color: 'bg-warning/10 text-warning' },
  APPROVED: { label: 'อนุมัติแล้ว', icon: CheckCircle, color: 'bg-info/10 text-info' },
  DISBURSED: { label: 'เบิกจ่ายแล้ว', icon: Wallet, color: 'bg-success/10 text-success' },
  REJECTED: { label: 'ไม่อนุมัติ', icon: XCircle, color: 'bg-destructive/10 text-destructive' },
  CANCELLED: { label: 'ยกเลิก', icon: AlertCircle, color: 'bg-muted text-muted-foreground' },
};

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

const formatCompactNumber = (number: number): string => {
  return new Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(number);
};

export default function Disbursements() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { page, pageSize, setPage, setPageSize, getPaginationParams } = usePagination();
  const alertDialog = useAlertDialog();
  const { user, currentRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const isApproveFlowRef = useRef(false); // Skip updateMutation success dialog in approve flow
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isDisburseDialogOpen, setIsDisburseDialogOpen] = useState(false);
  const [selectedDisbursement, setSelectedDisbursement] = useState<Disbursement | null>(null);

  // Check if user is admin
  const isAdmin = currentRole === 'admin';
  
  // Check if user can manage disbursements (create, edit, disburse)
  const canManageDisbursements = currentRole === 'loan_officer' || currentRole === 'admin';
  
  // Check if user can approve/reject (Manager or Admin)
  const canApproveDisbursements = currentRole === 'branch_manager' || currentRole === 'admin';

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [amount, setAmount] = useState('');
  const [firstPaymentDate, setFirstPaymentDate] = useState('');
  const [paymentDay, setPaymentDay] = useState('1');
  const [requestedDate, setRequestedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [disbursementMethod, setDisbursementMethod] = useState<'TRANSFER' | 'CHECK' | 'CASH'>('TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [isPaymentDayManuallyChanged, setIsPaymentDayManuallyChanged] = useState(false);
  const [showPaymentDayConfirm, setShowPaymentDayConfirm] = useState(false);
  const [pendingPaymentDay, setPendingPaymentDay] = useState<string>('');
  const [showSuccessDialog, setShowSuccessDialog] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<{
    customerName: string;
    amount: number;
    disbursementNo?: number;
    referenceNo: string;
    disbursementMethod: string;
  } | null>(null);

  // Fetch disbursements
  const { data: disbursementsData, isLoading } = useQuery({
    queryKey: ['disbursements', page, pageSize, statusFilter, branchFilter, searchTerm],
    queryFn: async () => {
      const params: Record<string, string | number> = getPaginationParams() as Record<string, string | number>;
      if (statusFilter !== 'all') params.status = statusFilter;
      // Admin can filter by branch, others see only their branch
      if (isAdmin && branchFilter !== 'all') {
        params.branchId = branchFilter;
      }
      const response = await disbursementsApi.list(params);
      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds - disbursements change frequently
    refetchOnMount: true, // Always refetch on mount to get latest data
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['disbursement-stats', branchFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      // Admin can filter stats by branch
      if (isAdmin && branchFilter !== 'all') {
        params.branchId = branchFilter;
      }
      const response = await disbursementsApi.getStats(params);
      return response.data;
    },
    staleTime: 60 * 1000, // 1 minute - stats don't change as frequently
  });

  // Fetch branches for admin filter
  const { data: branchesData } = useQuery({
    queryKey: ['branches', 'all'],
    queryFn: async () => {
      const result = await branchesApi.getAll();
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    enabled: isAdmin, // Only fetch if user is admin
    staleTime: 15 * 60 * 1000, // 15 minutes - branches rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes cache (formerly cacheTime)
  });

  // Fetch customers for dropdown
  const { data: customersData } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: async () => {
      const response = await customersApi.list({ limit: 100 });
      return response.data.customers;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - customer list doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes cache (formerly cacheTime)
  });

  // Fetch loans for dropdown - only approved loans
  const { data: loansData } = useQuery({
    queryKey: ['loans-for-disbursement', selectedCustomerId],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: 1, limit: 100 };
      if (selectedCustomerId) {
        params.customerId = selectedCustomerId;
      }
      const response = await loansApi.list(params);
      return response.data;
    },
    enabled: !!selectedCustomerId, // Only fetch when customer is selected
  });

  const disbursements: Disbursement[] = disbursementsData?.disbursements || [];
  const stats = statsData || { pending: 0, approved: 0, disbursed: 0, rejected: 0, totalAmount: 0, disbursedAmount: 0, pendingAmount: 0 };
  const branches = branchesData || [];

  // Filter loans to only show APPROVED status (ready for disbursement)
  const allLoans: Array<Loan> = (loansData?.loans as Array<Loan>) || [];
  const loans: Array<Loan> = allLoans.filter((loan: Loan) =>
    loan.status === 'APPROVED' && Number(loan.remainingAmount || loan.principal) > 0
  );

  // Get customers list
  const customers: Array<Customer> = Array.isArray(customersData) ? customersData : [];

  // Local filtering for search
  const filteredDisbursements: Disbursement[] = disbursements.filter((d: Disbursement) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      d.loan.customer.businessName.toLowerCase().includes(searchLower) ||
      d.loan.customer.customerCode.toLowerCase().includes(searchLower) ||
      d.purpose.toLowerCase().includes(searchLower) ||
      d.id.toLowerCase().includes(searchLower)
    );
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateDisbursementInput) => {
      const response = await disbursementsApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      alertDialog.success({
        title: 'สร้างคำขอเบิกจ่ายสำเร็จ!',
        description: 'ระบบได้บันทึกคำขอเบิกจ่ายเรียบร้อยแล้ว รอการอนุมัติจากผู้จัดการ',
        confirmText: 'เสร็จสิ้น',
      });
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      queryClient.invalidateQueries({ queryKey: ['disbursement-stats'] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      const errorMessage = error.response?.data?.error?.message || 'ไม่สามารถสร้างคำขอเบิกจ่ายได้';
      
      alertDialog.error({
        title: '⚠️ ไม่สามารถสร้างคำขอเบิกจ่ายได้',
        description: errorMessage,
        confirmText: 'ตกลง',
      });
    },
  });

  // Update mutation for editing draft disbursements
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateDisbursementInput> }) => {
      const response = await disbursementsApi.update(id, {
        amount: data.amount,
        purpose: data.purpose,
        requestedDate: data.requestedDate,
        notes: data.notes,
        firstPaymentDate: data.firstPaymentDate,
        paymentDay: data.paymentDay,
      });
      return response.data;
    },
    onSuccess: (_data, _vars, context: any) => {
      // Skip success dialog when called from approve flow (context.skipSuccessDialog = true)
      if (context?.skipSuccessDialog) return;
      if (isApproveFlowRef.current) return;
      alertDialog.success({
        title: 'แก้ไขคำขอเบิกจ่ายสำเร็จ!',
        description: 'ระบบได้บันทึกการแก้ไขเรียบร้อยแล้ว พร้อมสำหรับการอนุมัติ',
        confirmText: 'เสร็จสิ้น',
      });
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      queryClient.invalidateQueries({ queryKey: ['disbursement-stats'] });
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      const errorMessage = error.response?.data?.error?.message || 'ไม่สามารถแก้ไขคำขอเบิกจ่ายได้';
      
      alertDialog.error({
        title: '⚠️ ไม่สามารถบันทึกการแก้ไขได้',
        description: errorMessage,
        confirmText: 'ตกลง',
      });
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const response = await disbursementsApi.approve(id, notes);
      return response.data;
    },
    onSuccess: () => {
      alertDialog.success({
        title: 'อนุมัติเบิกจ่ายสำเร็จ!',
        description: 'รายการถูกส่งไปยังหน้า "รายการรอเบิกจ่าย" แล้ว พร้อมสำหรับการเบิกจ่ายเงิน',
        confirmText: 'ไปหน้ารอเบิกจ่าย',
        onConfirm: () => {
          navigate('/transactions');
        },
        cancelText: 'อยู่หน้านี้',
      });
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      queryClient.invalidateQueries({ queryKey: ['disbursement-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] }); // Refresh transactions page
      setIsApproveDialogOpen(false);
      setIsApproving(false);
      setNotes('');
    },
    onError: (error: any) => {
      // api-client returns error as { message, status, code, details }
      const errorMessage = error?.message || error?.response?.data?.error?.message || 'เกิดข้อผิดพลาดในการอนุมัติ';
      
      // Check if error is about missing or invalid data
      const isMissingData = 
        errorMessage.includes('ข้อมูลรอบการชำระเงินไม่ครบถ้วน') ||
        errorMessage.includes('วันที่เบิกจ่าย') ||
        errorMessage.includes('วันชำระงวดแรก') ||
        errorMessage.includes('payment') || 
        errorMessage.includes('schedule') || 
        errorMessage.includes('firstPaymentDate');

      // Check if error is about exceeding remaining amount
      const isExceedingAmount = errorMessage.includes('จำนวนเงินเกินกว่ายอดคงเหลือ');

      if (isExceedingAmount) {
        alertDialog.error({
          title: '❌ วงเงินไม่เพียงพอ',
          description: `${errorMessage}\n\nสัญญานี้ได้รับการเบิกจ่ายครบวงเงินแล้ว ไม่สามารถอนุมัติการเบิกจ่ายเพิ่มเติมได้`,
          confirmText: 'ปิด',
        });
      } else if (isMissingData) {
        alertDialog.error({
          title: '⚠️ ข้อมูลไม่ครบถ้วนหรือไม่ถูกต้อง',
          description: errorMessage,
          confirmText: 'แก้ไขข้อมูล',
          onConfirm: () => {
            // Auto-open edit dialog
            setIsApproveDialogOpen(false);
            if (selectedDisbursement) {
              setTimeout(() => {
                handleEdit(selectedDisbursement);
              }, 300);
            }
          }
        });
      } else {
        alertDialog.error({
          title: 'ไม่สามารถอนุมัติได้',
          description: errorMessage,
          confirmText: 'ปิด',
        });
      }
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const response = await disbursementsApi.reject(id, reason);
      return response.data;
    },
    onSuccess: () => {
      alertDialog.warning({
        title: 'ปฏิเสธคำขอเบิกจ่าย',
        description: 'ระบบได้บันทึกการปฏิเสธเรียบร้อยแล้ว',
        confirmText: 'เสร็จสิ้น',
      });
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      queryClient.invalidateQueries({ queryKey: ['disbursement-stats'] });
      setIsRejectDialogOpen(false);
      setRejectReason('');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      alertDialog.error({
        title: 'ไม่สามารถปฏิเสธได้',
        description: error.response?.data?.error?.message || 'เกิดข้อผิดพลาดในการปฏิเสธ',
        confirmText: 'ปิด',
      });
    },
  });

  // Disburse mutation
  const disburseMutation = useMutation({
    mutationFn: async (data: DisburseInput) => {
      const response = await disbursementsApi.disburse(data.id, {
        disbursementMethod: data.disbursementMethod as 'TRANSFER' | 'CHECK' | 'CASH',
        referenceNo: data.referenceNo,
        notes: data.notes,
      });
      return response.data as { referenceNo?: string };
    },
    onSuccess: (data: { referenceNo?: string }) => {
      // Show success dialog instead of toast
      setSuccessData({
        customerName: selectedDisbursement?.loan.customer.businessName || '',
        amount: selectedDisbursement?.amount || 0,
        disbursementNo: selectedDisbursement?.disbursementNo,
        referenceNo: data?.referenceNo || referenceNo,
        disbursementMethod: disbursementMethod,
      });
      setShowSuccessDialog(true);
      
      queryClient.invalidateQueries({ queryKey: ['disbursements'] });
      queryClient.invalidateQueries({ queryKey: ['disbursement-stats'] });
      setIsDisburseDialogOpen(false);
      setReferenceNo('');
      setNotes('');
    },
    onError: (error: { response?: { data?: { error?: { message?: string } } } }) => {
      toast.error(error.response?.data?.error?.message || 'เกิดข้อผิดพลาด');
    },
  });

  const resetForm = () => {
    setSelectedCustomerId('');
    setSelectedLoanId('');
    setAmount('');
    setFirstPaymentDate('');
    setPaymentDay('1');
    setRequestedDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsPaymentDayManuallyChanged(false);
    setShowPaymentDayConfirm(false);
    setPendingPaymentDay('');
  };

  // Handle first payment date change - auto-set payment day
  const handleFirstPaymentDateChange = (dateString: string) => {
    setFirstPaymentDate(dateString);
    
    if (dateString && !isPaymentDayManuallyChanged) {
      // Auto-set payment day based on first payment date
      const date = new Date(dateString);
      const day = date.getDate();
      
      // Map to closest available option
      let closestDay = '1';
      if (day >= 1 && day <= 3) closestDay = '1';
      else if (day >= 4 && day <= 7) closestDay = '5';
      else if (day >= 8 && day <= 12) closestDay = '10';
      else if (day >= 13 && day <= 17) closestDay = '15';
      else if (day >= 18 && day <= 22) closestDay = '20';
      else if (day >= 23 && day <= 27) closestDay = '25';
      else closestDay = '30';
      
      setPaymentDay(closestDay);
    }
  };

  // Handle payment day change with confirmation
  const handlePaymentDayChange = (newDay: string) => {
    if (firstPaymentDate && !isPaymentDayManuallyChanged) {
      // First time changing - show confirmation
      setPendingPaymentDay(newDay);
      setShowPaymentDayConfirm(true);
    } else {
      // Already confirmed or no first payment date set
      setPaymentDay(newDay);
      if (firstPaymentDate) {
        setIsPaymentDayManuallyChanged(true);
      }
    }
  };

  // Confirm payment day change
  const confirmPaymentDayChange = () => {
    setPaymentDay(pendingPaymentDay);
    setIsPaymentDayManuallyChanged(true);
    setShowPaymentDayConfirm(false);
    setPendingPaymentDay('');
  };

  // Cancel payment day change
  const cancelPaymentDayChange = () => {
    setShowPaymentDayConfirm(false);
    setPendingPaymentDay('');
  };

  // Get minimum date (today)
  const getMinDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  // Get minimum first payment date (7 days from disbursement date)
  const getMinFirstPaymentDate = () => {
    if (!requestedDate) {
      // If no disbursement date set, use 7 days from today
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    }
    
    // Use 7 days from disbursement date
    const date = new Date(requestedDate);
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };

  // Export to CSV function
  const handleExportToCSV = () => {
    try {
      // Prepare CSV data
      const headers = [
        'งวดที่',
        'ลูกค้า',
        'รหัสลูกค้า',
        'วัตถุประสงค์',
        'จำนวนเงิน',
        'วันที่ขอเบิก',
        'สถานะ',
        'วิธีการเบิกจ่าย',
        'เลขที่อ้างอิง',
        'วงเงินรวม',
        'เบิกไปแล้ว',
        'คงเหลือ',
        'หมายเหตุ',
        'เหตุผลที่ปฏิเสธ'
      ];

      const csvData = filteredDisbursements.map((d: Disbursement) => [
        `#${d.disbursementNo}`,
        d.loan.customer.businessName,
        d.loan.customer.customerCode,
        d.purpose,
        d.amount,
        formatDate(d.requestedDate),
        statusConfig[d.status].label,
        d.disbursementMethod || '-',
        d.referenceNo || '-',
        d.loan.principal,
        d.loan.totalDisbursed,
        d.loan.remainingAmount,
        d.notes || '-',
        d.rejectedReason || '-'
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

      const statusLabel = statusFilter === 'all' ? 'ทั้งหมด' : statusConfig[statusFilter as DisbursementStatus]?.label || statusFilter;

      link.setAttribute('download', `รายการเบิกจ่ายเงินกู้_${statusLabel}_${dateStr}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`✅ ส่งออกข้อมูล ${filteredDisbursements.length} รายการสำเร็จ`, {
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

  const handleCreate = () => {
    // Validate required fields
    if (!selectedLoanId || !amount || !firstPaymentDate || !requestedDate) {
      alertDialog.error({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณาตรวจสอบข้อมูลที่จำเป็นทั้งหมด',
        confirmText: 'ตกลง',
      });
      return;
    }

    // Validate dates
    const disbursementDate = new Date(requestedDate);
    const firstPayment = new Date(firstPaymentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    disbursementDate.setHours(0, 0, 0, 0);
    firstPayment.setHours(0, 0, 0, 0);

    // Check if disbursement date is not in the past
    if (disbursementDate < today) {
      alertDialog.error({
        title: 'วันที่เบิกจ่ายไม่ถูกต้อง',
        description: 'วันที่เบิกจ่ายต้องเป็นวันนี้หรืออนาคต',
        confirmText: 'ตกลง',
      });
      return;
    }

    // Check if first payment date is at least 7 days after disbursement date
    const minFirstPaymentDate = new Date(disbursementDate);
    minFirstPaymentDate.setDate(minFirstPaymentDate.getDate() + 7);
    
    if (firstPayment < minFirstPaymentDate) {
      alertDialog.error({
        title: 'วันชำระงวดแรกไม่ถูกต้อง',
        description: `วันชำระงวดแรกต้องมากกว่าวันเบิกจ่ายอย่างน้อย 7 วัน (${minFirstPaymentDate.toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })})`,
        confirmText: 'ตกลง',
      });
      return;
    }

    const selectedLoan = loans.find((l: Loan) => l.id === selectedLoanId);
    if (!selectedLoan) {
      alertDialog.error({
        title: 'ไม่พบข้อมูลสินเชื่อ',
        description: 'กรุณาเลือกสินเชื่อใหม่อีกครั้ง',
        confirmText: 'ตกลง',
      });
      return;
    }

    // Validate amount
    const requestAmount = parseFloat(amount);
    if (isNaN(requestAmount) || requestAmount <= 0) {
      alertDialog.error({
        title: 'จำนวนเงินไม่ถูกต้อง',
        description: 'กรุณาระบุจำนวนเงินที่มากกว่า 0',
        confirmText: 'ตกลง',
      });
      return;
    }

    const remaining = Number(selectedLoan.remainingAmount || selectedLoan.principal);
    if (requestAmount > remaining) {
      alertDialog.error({
        title: 'จำนวนเงินเกินกว่ายอดคงเหลือ',
        description: `ยอดคงเหลือ: ${formatCurrency(remaining)}`,
        confirmText: 'ตกลง',
      });
      return;
    }

    // ✅ All validations passed - create disbursement
    createMutation.mutate({
      loanId: selectedLoanId,
      amount: requestAmount,
      purpose: `เบิกจ่ายเงินกู้ตามสัญญา ${selectedLoan?.customer?.businessName || ''}`,
      requestedDate: new Date(requestedDate).toISOString(),
      notes: notes || undefined,
      // ✅ ส่ง payment schedule parameters ไปด้วย
      firstPaymentDate: new Date(firstPaymentDate).toISOString(),
      paymentDay: parseInt(paymentDay, 10),
    });
  };

  const handleEdit = (disbursement: Disbursement) => {
    // Pre-fill form with existing data
    setSelectedDisbursement(disbursement);
    // Don't set selectedCustomerId - we don't need to fetch loans since we already have the loan
    setSelectedLoanId(disbursement.loanId);
    setAmount(disbursement.amount.toString());
    setRequestedDate(new Date(disbursement.requestedDate).toISOString().split('T')[0]);
    setNotes(disbursement.notes || '');
    
    // Extract payment schedule info if available from loan's payment schedule
    const loan = disbursement.loan;
    if (loan.paymentSchedule && loan.paymentSchedule.length > 0) {
      const firstSchedule = loan.paymentSchedule[0];
      setFirstPaymentDate(new Date(firstSchedule.dueDate).toISOString().split('T')[0]);
      
      // Extract payment day from first schedule
      const firstDueDate = new Date(firstSchedule.dueDate);
      const day = firstDueDate.getDate();
      
      // Map to closest available option
      let closestDay = '1';
      if (day >= 1 && day <= 3) closestDay = '1';
      else if (day >= 4 && day <= 7) closestDay = '5';
      else if (day >= 8 && day <= 12) closestDay = '10';
      else if (day >= 13 && day <= 17) closestDay = '15';
      else if (day >= 18 && day <= 22) closestDay = '20';
      else if (day >= 23 && day <= 27) closestDay = '25';
      else closestDay = '30';
      
      setPaymentDay(closestDay);
    } else {
      // No payment schedule yet - need to be filled by user
      setFirstPaymentDate('');
      setPaymentDay('1');
    }
    
    setIsPaymentDayManuallyChanged(false);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedDisbursement) return;

    // Validate required fields
    if (!amount || !requestedDate || !firstPaymentDate || !paymentDay) {
      alertDialog.error({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกข้อมูลที่จำเป็นทั้งหมด รวมถึงรอบการชำระเงิน',
        confirmText: 'ตกลง',
      });
      return;
    }

    // Validate dates
    const disbursementDate = new Date(requestedDate);
    const firstPayment = new Date(firstPaymentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    disbursementDate.setHours(0, 0, 0, 0);
    firstPayment.setHours(0, 0, 0, 0);

    // Check if disbursement date is not in the past
    if (disbursementDate < today) {
      alertDialog.error({
        title: 'วันที่เบิกจ่ายไม่ถูกต้อง',
        description: 'วันที่เบิกจ่ายต้องเป็นวันนี้หรืออนาคต',
        confirmText: 'ตกลง',
      });
      return;
    }

    // Check if first payment date is at least 7 days after disbursement date
    const minFirstPaymentDate = new Date(disbursementDate);
    minFirstPaymentDate.setDate(minFirstPaymentDate.getDate() + 7);
    
    if (firstPayment < minFirstPaymentDate) {
      alertDialog.error({
        title: 'วันชำระงวดแรกไม่ถูกต้อง',
        description: `วันชำระงวดแรกต้องมากกว่าวันเบิกจ่ายอย่างน้อย 7 วัน (${minFirstPaymentDate.toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })})`,
        confirmText: 'ตกลง',
      });
      return;
    }

    // Validate amount
    const requestAmount = parseFloat(amount);
    if (isNaN(requestAmount) || requestAmount <= 0) {
      alertDialog.error({
        title: 'จำนวนเงินไม่ถูกต้อง',
        description: 'กรุณาระบุจำนวนเงินที่มากกว่า 0',
        confirmText: 'ตกลง',
      });
      return;
    }

    // Update disbursement with payment schedule
    updateMutation.mutate({
      id: selectedDisbursement.id,
      data: {
        amount: requestAmount,
        purpose: `เบิกจ่ายเงินกู้ตามสัญญา ${selectedDisbursement.loan.customer.businessName}`,
        requestedDate: new Date(requestedDate).toISOString(),
        notes: notes || undefined,
        firstPaymentDate: new Date(firstPaymentDate).toISOString(),
        paymentDay: parseInt(paymentDay, 10),
      },
    });
  };

  // Regenerate PDF handler
  const handleRegeneratePDF = async (loanId: string) => {
    try {
      await disbursementsApi.regenerateContractPdf(loanId);

      alertDialog.success({
        title: 'สร้าง PDF สำเร็จ',
        description: 'ระบบได้สร้างหนังสือแจ้งการเบิกจ่ายใหม่เรียบร้อยแล้ว',
        confirmText: 'ตกลง',
      });

      // Force immediate refresh of all related data with exact query keys
      await Promise.all([
        // Invalidate the exact disbursements query with current parameters
        queryClient.invalidateQueries({ 
          queryKey: ['disbursements', page, pageSize, statusFilter, branchFilter, searchTerm],
          exact: true 
        }),
        // Also invalidate all disbursements queries (for other parameter combinations)
        queryClient.invalidateQueries({ queryKey: ['disbursements'] }),
        // Invalidate disbursement stats with current parameters
        queryClient.invalidateQueries({ 
          queryKey: ['disbursement-stats', branchFilter],
          exact: true 
        }),
        // Invalidate all disbursement stats
        queryClient.invalidateQueries({ queryKey: ['disbursement-stats'] }),
        // Invalidate any loan-related queries
        queryClient.invalidateQueries({ queryKey: ['loans'] }),
      ]);

      // Force immediate refetch of current data
      queryClient.refetchQueries({ 
        queryKey: ['disbursements', page, pageSize, statusFilter, branchFilter, searchTerm] 
      });
    } catch (error) {
      alertDialog.error({
        title: 'ไม่สามารถสร้าง PDF ได้',
        description: 'กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ',
        confirmText: 'ตกลง',
      });
    }
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'เบิกจ่ายเงินกู้' }]}>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl text-white font-bold">เบิกจ่ายเงินกู้</h1>
          <p className="text-white">จัดการการเบิกจ่ายเงินกู้ให้ลูกค้าตามสัญญาที่อนุมัติแล้ว</p>
        </div>
        <div className="flex gap-2">
          {/* Quick link to Transactions page */}
          {statsData && statsData.approved > 0 && (
            <Button
              variant="default"
              onClick={() => navigate('/transactions')}
              className="bg-success hover:bg-success/90"
            >
              <Receipt className="h-4 w-4 mr-2" />
              รอเบิกจ่าย ({statsData.approved})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExportToCSV}
            disabled={filteredDisbursements.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            ส่งออก ({filteredDisbursements.length})
          </Button>
          {/* Only Loan Officer and Admin can create disbursement requests */}
          {canManageDisbursements && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              เบิกจ่ายเงินกู้
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <DisbursementStatsCards stats={stats} isLoading={isLoading} />

      {/* Table */}
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
                <SelectTrigger className="w-[180px] bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-primary text-white border-primary hover:bg-primary/90">
                <SelectValue placeholder="สถานะทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                <SelectItem value="PENDING">รออนุมัติ</SelectItem>
                <SelectItem value="APPROVED">อนุมัติแล้ว</SelectItem>
                <SelectItem value="DISBURSED">เบิกจ่ายแล้ว</SelectItem>
                <SelectItem value="REJECTED">ไม่อนุมัติ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredDisbursements.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">ยังไม่มีรายการเบิกจ่าย</p>
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
                  {filteredDisbursements.map((d: Disbursement) => {
                    const StatusIcon = statusConfig[d.status].icon;
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">#{d.disbursementNo}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar 
                              src={d.loan.customer.avatar} 
                              name={d.loan.customer.businessName} 
                              size="md" 
                              className="h-10 w-10" 
                            />
                            <div>
                              <p className="font-medium">{d.loan.customer.businessName}</p>
                              <p className="text-xs text-muted-foreground">{d.loan.customer.customerCode}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p>{d.purpose}</p>
                            {d.notes?.includes('สร้างอัตโนมัติ') && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                🤖 สร้างอัตโนมัติ กรุณาตรวจสอบข้อมูลก่อนอนุมัติ
                              </Badge>
                            )}
                            {/* Warning if payment schedule is missing */}
                            {d.status === 'PENDING' && (!d.loan.paymentSchedule || d.loan.paymentSchedule.length === 0) && (
                              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                ⚠️ ยังไม่มีข้อมูลรอบการชำระ
                              </Badge>
                            )}
                            {/* PDF Status for disbursed loans */}
                            {d.status === 'DISBURSED' && (
                              <>
                                {(d.loan?.productConfig as any)?.disbursementPdfStatus === 'success' && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    ✓ PDF พร้อมแล้ว
                                  </Badge>
                                )}
                                {(d.loan?.productConfig as any)?.disbursementPdfStatus === 'generating' && (
                                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    <Loader className="h-3 w-3 mr-1 animate-spin" />
                                    กำลังสร้าง PDF...
                                  </Badge>
                                )}
                                {(d.loan?.productConfig as any)?.disbursementPdfStatus === 'failed' && (
                                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                    ⚠️ PDF ล้มเหลว - คลิกเพื่อสร้างใหม่
                                  </Badge>
                                )}
                                {!d.loan?.productConfig?.disbursementPdfUrl && 
                                 !(d.loan?.productConfig as any)?.disbursementPdfStatus && (
                                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                                    ⚠️ ยังไม่มี PDF
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(d.amount)}</TableCell>
                        <TableCell>{formatDate(d.requestedDate)}</TableCell>
                        <TableCell>
                          <Badge className={statusConfig[d.status].color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig[d.status].label}
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
                                setSelectedDisbursement(d);
                                setIsDetailDialogOpen(true);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                ดูรายละเอียด
                              </DropdownMenuItem>
                              {/* Only Loan Officer and Admin can edit draft disbursements */}
                              {d.status === 'PENDING' && canManageDisbursements && (
                                <DropdownMenuItem onClick={() => handleEdit(d)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  แก้ไขข้อมูล
                                </DropdownMenuItem>
                              )}
                              {/* Manager and Admin can approve/reject */}
                              {d.status === 'PENDING' && canApproveDisbursements && (
                                <>
                                  {/* Show edit option for Manager if payment schedule is missing */}
                                  {(!d.loan.paymentSchedule || d.loan.paymentSchedule.length === 0) && (
                                    <DropdownMenuItem onClick={() => handleEdit(d)} className="text-amber-600">
                                      <AlertCircle className="h-4 w-4 mr-2" />
                                      เพิ่มข้อมูลรอบชำระ
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedDisbursement(d);
                                    setIsApproveDialogOpen(true);
                                  }}>
                                    <ThumbsUp className="h-4 w-4 mr-2" />
                                    อนุมัติ
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedDisbursement(d);
                                    setIsRejectDialogOpen(true);
                                  }}>
                                    <ThumbsDown className="h-4 w-4 mr-2" />
                                    ปฏิเสธ
                                  </DropdownMenuItem>
                                </>
                              )}
                              {/* Only Loan Officer and Admin can disburse money */}
                              {d.status === 'APPROVED' && canManageDisbursements && (
                                <DropdownMenuItem onClick={() => {
                                  setSelectedDisbursement(d);
                                  setIsDisburseDialogOpen(true);
                                }}>
                                  <Wallet className="h-4 w-4 mr-2" />
                                  เบิกจ่ายเงิน
                                </DropdownMenuItem>
                              )}
                              {/* PDF Management for disbursed loans */}
                              {d.status === 'DISBURSED' && canManageDisbursements && (
                                <>
                                  {/* Show regenerate button if PDF failed or missing */}
                                  {(!d.loan?.productConfig?.disbursementPdfUrl || 
                                    (d.loan?.productConfig as any)?.disbursementPdfStatus === 'failed') && (
                                    <DropdownMenuItem 
                                      onClick={() => handleRegeneratePDF(d.loan.id)}
                                      className="text-amber-600"
                                    >
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      สร้าง PDF ใหม่
                                    </DropdownMenuItem>
                                  )}
                                  {/* Show download button if PDF exists */}
                                  {d.loan?.productConfig?.disbursementPdfUrl && (
                                    <DropdownMenuItem 
                                      onClick={() => window.open(String(d.loan.productConfig.disbursementPdfUrl), '_blank')}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      ดาวน์โหลด PDF
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {disbursementsData && disbursementsData.total > 0 && (
                <PaginationControls
                  currentPage={page}
                  totalPages={disbursementsData.totalPages || 1}
                  pageSize={pageSize}
                  totalItems={disbursementsData.total || 0}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Disbursement Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-lg border">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">เบิกจ่ายเงินกู้ให้ลูกค้า</DialogTitle>
            <DialogDescription className="text-sm">
              เลือกลูกค้าและสัญญาสินเชื่อที่อนุมัติแล้ว พร้อมกำหนดรอบการชำระเงิน
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 sm:py-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label htmlFor="customer" className="text-sm">เลือกลูกค้า *</Label>
              <Select value={selectedCustomerId} onValueChange={(value) => {
                setSelectedCustomerId(value);
                setSelectedLoanId(''); // Reset loan selection when customer changes
                setAmount('');
              }}>
                <SelectTrigger id="customer" className="w-full">
                  <SelectValue placeholder="เลือกลูกค้า..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] sm:max-h-[300px]">
                  {customers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      ไม่พบข้อมูลลูกค้า
                    </div>
                  ) : (
                    customers.map((customer: Customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{customer.businessName}</span>
                          <span className="text-xs text-muted-foreground">
                            {customer.customerCode}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Loan Selection */}
            <div className="space-y-2">
              <Label htmlFor="loan" className="text-sm">เลือกสัญญาสินเชื่อ *</Label>
              <Select
                value={selectedLoanId}
                onValueChange={(value) => {
                  setSelectedLoanId(value);
                  const loan = loans.find((l: Loan) => l.id === value);
                  if (loan) {
                    // Auto-fill max amount based on remaining
                    const remaining = Number(loan.remainingAmount || loan.principal);
                    setAmount(remaining.toString());
                  }
                }}
                disabled={!selectedCustomerId}
              >
                <SelectTrigger id="loan" className="h-auto min-h-[40px] py-2 w-full">
                  <SelectValue placeholder={selectedCustomerId ? "เลือกสัญญาสินเชื่อ..." : "เลือกลูกค้าก่อน"}>
                    {selectedLoanId && (() => {
                      const loan = loans.find((l: Loan) => l.id === selectedLoanId);
                      if (!loan) return null;
                      const remaining = Number(loan.remainingAmount || loan.principal);
                      return (
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium text-sm truncate max-w-[250px]">สัญญา: {loan.id.substring(0, 8)}...</span>
                          <span className="text-xs text-muted-foreground">
                            คงเหลือ: {formatCurrency(remaining)}
                          </span>
                        </div>
                      );
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[200px] sm:max-h-[300px]">
                  {!selectedCustomerId ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      กรุณาเลือกลูกค้าก่อน
                    </div>
                  ) : loans.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      ไม่พบสัญญาสินเชื่อที่อนุมัติแล้วสำหรับลูกค้านี้
                    </div>
                  ) : (
                    loans.map((loan: Loan) => {
                      // If remainingAmount is 0 or null, use principal (for newly approved loans)
                      const remaining = Number(loan.remainingAmount) || Number(loan.principal);
                      const disbursed = Number(loan.totalDisbursed || 0);
                      const principal = Number(loan.principal);
                      const percentage = principal > 0 ? (disbursed / principal) * 100 : 0;

                      return (
                        <SelectItem key={loan.id} value={loan.id} className="py-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-sm truncate">สัญญา: {loan.id.substring(0, 12)}...</span>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div className="flex justify-between gap-2">
                                <span>วงเงิน:</span>
                                <span className="font-medium">{formatCurrency(principal)}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span>เบิกแล้ว:</span>
                                <span>{formatCurrency(disbursed)} ({percentage.toFixed(0)}%)</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-primary">คงเหลือ:</span>
                                <span className="font-medium text-primary">{formatCurrency(remaining)}</span>
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {selectedLoanId && (() => {
                const loan = loans.find((l: Loan) => l.id === selectedLoanId);
                if (!loan) return null;
                // If remainingAmount is 0 or null, use principal (for newly approved loans)
                const remaining = Number(loan.remainingAmount) || Number(loan.principal);
                const disbursed = Number(loan.totalDisbursed || 0);
                const principal = Number(loan.principal);
                const percentage = principal > 0 ? (disbursed / principal) * 100 : 0;

                return (
                  <div className="mt-2 p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">ความคืบหน้าการเบิกจ่าย</span>
                      <span className="font-medium">{percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">วงเงินรวม</p>
                        <p className="font-medium truncate">{formatCurrency(principal)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">เบิกแล้ว</p>
                        <p className="font-medium text-info truncate">{formatCurrency(disbursed)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">คงเหลือ</p>
                        <p className="font-medium text-success truncate">{formatCurrency(remaining)}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm">จำนวนเงินที่เบิกจ่าย (บาท) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="text-base"
              />
              {selectedLoanId && amount && (() => {
                const loan = loans.find((l: Loan) => l.id === selectedLoanId);
                if (!loan) return null;
                const remaining = Number(loan.remainingAmount || loan.principal);
                const requestAmount = parseFloat(amount);
                if (requestAmount > remaining) {
                  return (
                    <p className="text-xs text-destructive">
                      ⚠️ จำนวนเงินเกินกว่ายอดคงเหลือ ({formatCurrency(remaining)})
                    </p>
                  );
                }
              })()}
            </div>

            {/* Requested Date */}
            <div className="space-y-2">
              <Label htmlFor="requestedDate" className="text-sm">วันที่เบิกจ่าย *</Label>
              <Input
                id="requestedDate"
                type="date"
                value={requestedDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setRequestedDate(newDate);
                  
                  // If first payment date is set and is less than 7 days from new disbursement date, reset it
                  if (firstPaymentDate) {
                    const minFirstPayment = new Date(newDate);
                    minFirstPayment.setDate(minFirstPayment.getDate() + 7);
                    
                    if (new Date(firstPaymentDate) < minFirstPayment) {
                      setFirstPaymentDate('');
                      alertDialog.info({
                        title: 'กรุณาเลือกวันชำระงวดแรกใหม่',
                        description: 'วันชำระงวดแรกต้องมากกว่าวันเบิกจ่ายอย่างน้อย 7 วัน',
                        confirmText: 'ตกลง',
                      });
                    }
                  }
                }}
                min={getMinDate()}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                📅 วันที่ดำเนินการเบิกจ่ายเงินให้ลูกค้า (วันนี้หรืออนาคต)
              </p>
            </div>

            {/* Payment Schedule Setup */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm sm:text-base">กำหนดรอบการชำระเงิน</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="firstPaymentDate" className="text-sm">วันที่ลูกค้าชำระงวดแรก *</Label>
                  <Input
                    id="firstPaymentDate"
                    type="date"
                    value={firstPaymentDate}
                    onChange={(e) => handleFirstPaymentDateChange(e.target.value)}
                    min={getMinFirstPaymentDate()}
                    disabled={!requestedDate}
                    className="text-base"
                  />
                  {!requestedDate ? (
                    <p className="text-xs text-amber-600 font-medium">
                      ⚠️ กรุณาเลือกวันที่เบิกจ่ายก่อน
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      📅 อย่างน้อย 7 วันหลังจากวันเบิกจ่าย ({new Date(getMinFirstPaymentDate()).toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })})
                    </p>
                  )}
                  {firstPaymentDate && (
                    <p className="text-xs text-emerald-600 font-medium">
                      ✓ งวดแรก: {new Date(firstPaymentDate).toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDay" className="text-sm">
                    วันที่ชำระประจำทุกเดือน *
                    {isPaymentDayManuallyChanged && (
                      <span className="ml-2 text-xs text-amber-600">(ปรับแต่งแล้ว)</span>
                    )}
                  </Label>
                  <Select
                    value={paymentDay}
                    onValueChange={handlePaymentDayChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">วันที่ 1</SelectItem>
                      <SelectItem value="5">วันที่ 5</SelectItem>
                      <SelectItem value="10">วันที่ 10</SelectItem>
                      <SelectItem value="15">วันที่ 15</SelectItem>
                      <SelectItem value="20">วันที่ 20</SelectItem>
                      <SelectItem value="25">วันที่ 25</SelectItem>
                      <SelectItem value="30">วันที่ 30 (สิ้นเดือน)</SelectItem>
                    </SelectContent>
                  </Select>
                  {!isPaymentDayManuallyChanged && firstPaymentDate && (
                    <p className="text-xs text-blue-600 font-medium">
                      💡 ตั้งค่าอัตโนมัติตามวันที่งวดแรก
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    🔄 ตั้งแต่งวดที่ 2 เป็นต้นไป จะชำระทุกวันที่ {paymentDay} ของทุกเดือน
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm">หมายเหตุ</Label>
              <Textarea
                id="notes"
                placeholder="หมายเหตุเพิ่มเติม..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-base resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !selectedLoanId || !amount || !firstPaymentDate}
              className="w-full sm:w-auto"
            >
              {createMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  กำลังดำเนินการ...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  เบิกจ่ายเงิน
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Disbursement Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-lg border">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Edit className="h-5 w-5" />
              แก้ไขคำขอเบิกจ่าย
            </DialogTitle>
            <DialogDescription className="text-sm">
              แก้ไขข้อมูลคำขอเบิกจ่ายก่อนส่งอนุมัติ (การแก้ไขจะถูกบันทึกใน Audit Log)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 sm:py-4">
            {/* Display Customer and Loan Info (Read-only) */}
            {selectedDisbursement && (
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <UserAvatar 
                    src={selectedDisbursement.loan.customer.avatar} 
                    name={selectedDisbursement.loan.customer.businessName} 
                    size="md" 
                    className="h-10 w-10" 
                  />
                  <div>
                    <p className="font-medium">{selectedDisbursement.loan.customer.businessName}</p>
                    <p className="text-xs text-muted-foreground">{selectedDisbursement.loan.customer.customerCode}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                  <div>
                    <p className="text-muted-foreground">วงเงินรวม</p>
                    <p className="font-medium">{formatCurrency(selectedDisbursement.loan.principal)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">เบิกแล้ว</p>
                    <p className="font-medium text-info">{formatCurrency(selectedDisbursement.loan.totalDisbursed)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">คงเหลือ</p>
                    <p className="font-medium text-success">
                      {formatCurrency(
                        Number(selectedDisbursement.loan.remainingAmount) || 
                        Number(selectedDisbursement.loan.principal)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="edit-amount" className="text-sm">จำนวนเงินที่เบิกจ่าย (บาท) *</Label>
              <Input
                id="edit-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="text-base"
              />
              {selectedDisbursement && amount && (() => {
                const remaining = Number(selectedDisbursement.loan.remainingAmount) || Number(selectedDisbursement.loan.principal);
                const requestAmount = parseFloat(amount);
                if (requestAmount > remaining) {
                  return (
                    <p className="text-xs text-destructive">
                      ⚠️ จำนวนเงินเกินกว่ายอดคงเหลือ ({formatCurrency(remaining)})
                    </p>
                  );
                }
              })()}
            </div>

            {/* Requested Date */}
            <div className="space-y-2">
              <Label htmlFor="edit-requestedDate" className="text-sm">วันที่เบิกจ่าย *</Label>
              <Input
                id="edit-requestedDate"
                type="date"
                value={requestedDate}
                onChange={(e) => {
                  const newDate = e.target.value;
                  setRequestedDate(newDate);
                  
                  if (firstPaymentDate) {
                    const minFirstPayment = new Date(newDate);
                    minFirstPayment.setDate(minFirstPayment.getDate() + 7);
                    
                    if (new Date(firstPaymentDate) < minFirstPayment) {
                      setFirstPaymentDate('');
                      alertDialog.info({
                        title: 'กรุณาเลือกวันชำระงวดแรกใหม่',
                        description: 'วันชำระงวดแรกต้องมากกว่าวันเบิกจ่ายอย่างน้อย 7 วัน',
                        confirmText: 'ตกลง',
                      });
                    }
                  }
                }}
                min={getMinDate()}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                📅 วันที่ดำเนินการเบิกจ่ายเงินให้ลูกค้า
              </p>
            </div>

            {/* Payment Schedule Setup */}
            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium text-sm sm:text-base">กำหนดรอบการชำระเงิน</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-firstPaymentDate" className="text-sm">วันที่ลูกค้าชำระงวดแรก *</Label>
                  <Input
                    id="edit-firstPaymentDate"
                    type="date"
                    value={firstPaymentDate}
                    onChange={(e) => handleFirstPaymentDateChange(e.target.value)}
                    min={getMinFirstPaymentDate()}
                    disabled={!requestedDate}
                    className="text-base"
                  />
                  {!requestedDate ? (
                    <p className="text-xs text-amber-600 font-medium">
                      ⚠️ กรุณาเลือกวันที่เบิกจ่ายก่อน
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      📅 อย่างน้อย 7 วันหลังจากวันเบิกจ่าย
                    </p>
                  )}
                  {firstPaymentDate && (
                    <p className="text-xs text-emerald-600 font-medium">
                      ✓ งวดแรก: {new Date(firstPaymentDate).toLocaleDateString('th-TH', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-paymentDay" className="text-sm">
                    วันที่ชำระประจำทุกเดือน *
                  </Label>
                  <Select
                    value={paymentDay}
                    onValueChange={handlePaymentDayChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">วันที่ 1</SelectItem>
                      <SelectItem value="5">วันที่ 5</SelectItem>
                      <SelectItem value="10">วันที่ 10</SelectItem>
                      <SelectItem value="15">วันที่ 15</SelectItem>
                      <SelectItem value="20">วันที่ 20</SelectItem>
                      <SelectItem value="25">วันที่ 25</SelectItem>
                      <SelectItem value="30">วันที่ 30 (สิ้นเดือน)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes" className="text-sm">หมายเหตุ</Label>
              <Textarea
                id="edit-notes"
                placeholder="หมายเหตุเพิ่มเติม..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-base resize-none"
              />
            </div>

            {/* Audit Warning */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                การแก้ไขข้อมูลจะถูกบันทึกใน Audit Log เพื่อการตรวจสอบย้อนหลัง
              </p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !amount || !requestedDate || !firstPaymentDate || !paymentDay}
              className="w-full sm:w-auto"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  บันทึกการแก้ไข
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      {/* Approve Dialog */}
      <DisbursementApproveDialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
        selectedDisbursement={selectedDisbursement}
        notes={notes}
        onNotesChange={setNotes}
        onConfirm={(firstPaymentDate: string, paymentDay: number) => {
          if (!selectedDisbursement || isApproving) return;
          setIsApproving(true);
          isApproveFlowRef.current = true; // Tell updateMutation to skip success dialog
          
          // Update disbursement with payment schedule before approving
          updateMutation.mutate({
            id: selectedDisbursement.id,
            data: {
              firstPaymentDate: new Date(firstPaymentDate).toISOString(),
              paymentDay: paymentDay,
            }
          }, {
            onSuccess: () => {
              // After updating payment schedule, approve the disbursement
              approveMutation.mutate({
                id: selectedDisbursement.id,
                notes
              }, {
                onSettled: () => {
                  setIsApproving(false);
                  isApproveFlowRef.current = false;
                },
              });
            },
            onError: () => {
              setIsApproving(false);
              isApproveFlowRef.current = false;
            },
          });
        }}
        isLoading={approveMutation.isPending || updateMutation.isPending || isApproving}
        formatCurrency={formatCurrency}
      />

      {/* Reject Dialog */}
      <DisbursementRejectDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        selectedDisbursement={selectedDisbursement}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onConfirm={() => selectedDisbursement && rejectMutation.mutate({
          id: selectedDisbursement.id,
          reason: rejectReason
        })}
        isLoading={rejectMutation.isPending}
        formatCurrency={formatCurrency}
      />

      {/* Disburse Dialog */}
      <DisbursementDisburseDialog
        open={isDisburseDialogOpen}
        onOpenChange={setIsDisburseDialogOpen}
        selectedDisbursement={selectedDisbursement}
        disbursementMethod={disbursementMethod}
        onDisbursementMethodChange={setDisbursementMethod}
        referenceNo={referenceNo}
        onReferenceNoChange={setReferenceNo}
        notes={notes}
        onNotesChange={setNotes}
        onConfirm={() => selectedDisbursement && disburseMutation.mutate({
          id: selectedDisbursement.id,
          disbursementMethod,
          referenceNo: referenceNo || undefined,
          notes
        })}
        isLoading={disburseMutation.isPending}
        formatCurrency={formatCurrency}
      />

      {/* Detail Dialog */}
      <DisbursementDetailDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        selectedDisbursement={selectedDisbursement}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
      />

      {/* Success Dialog */}
      <DisbursementSuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        disbursementData={successData}
        formatCurrency={formatCurrency}
      />

      {/* Payment Day Change Confirmation Dialog */}
      <Dialog open={showPaymentDayConfirm} onOpenChange={setShowPaymentDayConfirm}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              ยืนยันการเปลี่ยนวันที่ชำระ
            </DialogTitle>
            <DialogDescription>
              คุณกำลังเปลี่ยนวันที่ชำระประจำเดือนที่แตกต่างจากงวดแรก
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-amber-900">
                📅 สรุปรอบการชำระ:
              </p>
              <div className="space-y-1 text-sm text-amber-800">
                <p>
                  • <strong>งวดแรก:</strong> {firstPaymentDate && new Date(firstPaymentDate).toLocaleDateString('th-TH', { 
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })} (วันที่ {new Date(firstPaymentDate).getDate()})
                </p>
                <p>
                  • <strong>งวดที่ 2 เป็นต้นไป:</strong> ทุกวันที่ {pendingPaymentDay} ของทุกเดือน
                </p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                💡 <strong>ตัวอย่าง:</strong> ถ้างวดแรกชำระวันที่ 15 มี.ค. แต่กำหนดวันชำระประจำเป็นวันที่ 5 
                งวดถัดไปจะเป็นวันที่ 5 เม.ย., 5 พ.ค., 5 มิ.ย. เป็นต้น
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelPaymentDayChange}>
              ยกเลิก
            </Button>
            <Button onClick={confirmPaymentDayChange} className="bg-amber-600 hover:bg-amber-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              ยืนยันการเปลี่ยนแปลง
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <alertDialog.AlertDialog />
      </div>
    </DashboardLayout>
  );
}
