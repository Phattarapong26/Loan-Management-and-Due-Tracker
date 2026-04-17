import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { TableSkeleton } from '@/shared/components/skeletons';
import { Progress } from '@/shared/components/ui/progress';
import { EmptyPayments, EmptySearchResults } from '@/shared/components/ui/empty-state';
import { ErrorDisplay } from '@/shared/components/ui/error-display';
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
  MoreHorizontal,
  Eye,
  DollarSign,
  Calendar,
  Download,
  FileText,
  CreditCard,
  Receipt,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { loansApi, paymentsApi, branchesApi, Branch } from '@/shared/lib/api-endpoints';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useAlertDialog } from '@/shared/hooks/useAlertDialog';
import { UserAvatar } from '@/shared/components/ui/user-avatar';
import { CreditGradeBadge } from '@/features/collections/components/CreditGradeBadge';

// Import components
import { PaymentStatsCards } from '../components/PaymentStatsCards';
import { PaymentTableFilters } from '../components/PaymentTableFilters';
import { PaymentTablePagination } from '../components/PaymentTablePagination';
import { LoanViewDialog } from '../components/LoanViewDialog';
import { RecordPaymentDialog } from '../components/RecordPaymentDialog';
import { PaymentHistoryDialog } from '../components/PaymentHistoryDialog';

// Import types and utils
import { ActiveLoan, PaymentFormData, statusConfig, mapLoanStatus } from '../types/payment.types';
import { formatCurrency, formatDate, exportToCSV } from '../utils/payment.utils';

export default function Payments() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const isAdmin = currentRole === 'admin';
  const alertDialog = useAlertDialog();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loanStatusFilter, setLoanStatusFilter] = useState<string>('active'); // 'active', 'closed', 'all'
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentHistoryDialogOpen, setIsPaymentHistoryDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<ActiveLoan | null>(null);

  // Payment form data for recording payments
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'transfer',
    note: '',
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, loanStatusFilter, branchFilter]);

  // Fetch branches for admin filter
  const { data: branchesData } = useQuery({
    queryKey: ['branches', 'all'],
    queryFn: async () => {
      const result = await branchesApi.getAll();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: isAdmin,
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const branches: Branch[] = Array.isArray(branchesData) ? branchesData : [];

  // Fetch loans based on filter (active, closed, or all)
  const { data: loansData, isLoading, error } = useQuery({
    queryKey: ['loans-payment-view', { search: searchTerm, status: statusFilter, loanStatus: loanStatusFilter, branch: branchFilter, page: currentPage, limit: pageSize }],
    queryFn: async () => {
      let statusQuery = '';
      if (loanStatusFilter === 'active') {
        statusQuery = 'ACTIVE,DISBURSED,DEFAULTED,NPL'; // Active loans with outstanding balance (including defaulted and NPL)
      } else if (loanStatusFilter === 'closed') {
        statusQuery = 'CLOSED'; // Closed/paid off loans
      } else {
        statusQuery = 'ACTIVE,DISBURSED,DEFAULTED,NPL,CLOSED'; // All loans
      }

      const result = await loansApi.list({
        page: currentPage,
        limit: pageSize,
        status: statusQuery,
        branchId: isAdmin && branchFilter !== 'all' ? branchFilter : undefined,
      });
      if (result.error) throw result.error;
      return result.data;
    },
  });

  // Fetch loan statistics based on filter
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['loan-statistics', loanStatusFilter, branchFilter],
    queryFn: async () => {
      let statusQuery = '';
      if (loanStatusFilter === 'active') {
        statusQuery = 'ACTIVE,DISBURSED,DEFAULTED,NPL';
      } else if (loanStatusFilter === 'closed') {
        statusQuery = 'CLOSED';
      } else {
        statusQuery = 'ACTIVE,DISBURSED,DEFAULTED,NPL,CLOSED';
      }

      const result = await loansApi.getStatistics({
        status: statusQuery,
        branchId: isAdmin && branchFilter !== 'all' ? branchFilter : undefined,
      });
      if (result.error) throw result.error;
      return result.data;
    },
  });

  // Map backend loans to frontend format
	  const activeLoans: ActiveLoan[] = loansData?.loans?.map((l: any) => {
	    // For closed loans, set status to 'active' with 0 overdue days
	    const isClosed = l.status === 'CLOSED';
	    return {
      id: l.id,
      contractNumber: l.contract_number,
      customerId: l.customerId,
      customerName: l.customer?.businessName || 'Unknown',
      customerAvatar: l.customer?.avatar,
      amount: Number(l.principal || 0),
      outstandingBalance: Number(l.outstandingBalance || 0),
      interestRate: Number(l.interestRate || 0),
      duration: l.termMonths || 0,
      dscr: Number(l.dscr || 0),
      status: isClosed ? 'active' : mapLoanStatus(l.status, l.overdueDays || 0),
      createdAt: l.createdAt,
      disbursementDate: l.disbursementDate,
	      nextPaymentDate: l.nextPaymentDate,
	      nextPaymentAmount: Number(l.nextPaymentAmount || 0),
	      overdueDays: isClosed ? 0 : (l.overdueDays || 0),
	      creditGrade: l.creditGrade,
	      creditScore: l.creditScore,
	      creditReasons: l.creditReasons,
	      creditNextActions: l.creditNextActions,
	    };
	  }) || [];

  // Pagination
  const totalPages = loansData?.totalPages || 1;
  const totalItems = loansData?.total || 0;

  // Use statistics from API instead of calculating from current page
  const totalOutstanding = statsData?.totalOutstanding || 0;
  const totalAmount = statsData?.totalAmount || 0;
  const overdueCount = statsData?.overdueCount || 0;
  const nplCount = statsData?.nplCount || 0;
  const totalLoansCount = statsData?.totalLoans || 0;

  // Filter loans on frontend (only for status filter, search is handled by backend)
  const filteredLoans = useMemo(() => {
    return statusFilter === 'all' 
      ? activeLoans 
      : activeLoans.filter(loan => loan.status === statusFilter);
  }, [activeLoans, statusFilter]);

  // Use backend total for display
  const displayCount = totalItems;

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = await paymentsApi.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });

      // แสดงข้อความสำเร็จที่เข้าใจง่าย
      const amount = parseFloat(paymentFormData.amount);
      const isFullPayment = selectedLoan && amount >= selectedLoan.outstandingBalance;

      if (isFullPayment) {
        alertDialog.success({
          title: 'ชำระเงินครบทั้งหมดแล้ว! 🎉',
          description: 'สัญญานี้เสร็จสิ้นเรียบร้อย',
          confirmText: 'เสร็จสิ้น',
        });
      } else {
        alertDialog.success({
          title: 'บันทึกการชำระเงินสำเร็จ!',
          description: `ชำระเงิน ${formatCurrency(amount)} เรียบร้อยแล้ว`,
          confirmText: 'เสร็จสิ้น',
        });
      }

      setIsRecordDialogOpen(false);
      setPaymentFormData({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'transfer',
        note: '',
      });
    },
    onError: (error: any) => {
      // 🚫 Enhanced Error Handling with User-Friendly Messages
      let userFriendlyMessage = 'ไม่สามารถบันทึกการชำระเงินได้';
      let errorDescription = '';

      // Handle specific error codes
      if (error.code === 'PAYMENT_EXCEEDS_BALANCE') {
        alertDialog.error({
          title: 'ไม่สามารถชำระเกินยอดหนี้ได้!',
          description: 'จำนวนเงินที่ชำระเกินยอดหนี้คงเหลือ',
          confirmText: 'แก้ไข',
          onConfirm: () => {
            // Auto-correct the amount when user clicks "แก้ไข"
            if (selectedLoan) {
              setPaymentFormData({
                ...paymentFormData,
                amount: selectedLoan.outstandingBalance.toString()
              });
            }
          }
        });
        return;
      }

      if (error.code === 'AMOUNT_TOO_HIGH') {
        alertDialog.error({
          title: 'จำนวนเงินสูงผิดปกติ!',
          description: 'จำนวนเงินที่ใส่สูงเกินไป กรุณาตรวจสอบอีกครั้ง',
          confirmText: 'ตกลง',
        });
        return;
      }

      if (error.code === 'INVALID_AMOUNT') {
        alertDialog.error({
          title: 'จำนวนเงินไม่ถูกต้อง',
          description: 'กรุณาใส่จำนวนเงินที่มากกว่า 0 บาท',
          confirmText: 'ตกลง',
        });
        return;
      }

      // Handle validation errors (422)
      if (error.status === 422 || error.statusCode === 422) {
        if (error.details && Array.isArray(error.details)) {
          const fieldErrors = error.details.map((detail: any) => {
            // แปลชื่อฟิลด์เป็นภาษาไทย
            const fieldNames: Record<string, string> = {
              'amount': 'จำนวนเงิน',
              'paymentDate': 'วันที่ชำระ',
              'paymentMethod': 'วิธีการชำระ',
              'loanId': 'เลขที่สัญญา',
              'notes': 'หมายเหตุ'
            };

            if (detail.path && detail.path.length > 0) {
              const fieldName = fieldNames[detail.path[0]] || detail.path[0];

              // แปลข้อความ error เป็นภาษาไทย
              if (detail.message.includes('required')) {
                return `กรุณากรอก${fieldName}`;
              } else if (detail.message.includes('positive') || detail.message.includes('greater than')) {
                return `${fieldName}ต้องมากกว่า 0`;
              } else if (detail.message.includes('invalid') || detail.message.includes('Invalid')) {
                return `${fieldName}ไม่ถูกต้อง`;
              } else if (detail.message.includes('too large') || detail.message.includes('maximum')) {
                return `${fieldName}มีค่ามากเกินไป`;
              } else if (detail.message.includes('datetime')) {
                return `รูปแบบ${fieldName}ไม่ถูกต้อง`;
              }
            }

            return detail.message || 'ข้อมูลไม่ถูกต้อง';
          });

          userFriendlyMessage = fieldErrors.join(' และ ');
        } else if (error.message && error.message !== 'Validation failed') {
          userFriendlyMessage = error.message;
        } else {
          userFriendlyMessage = 'กรุณาตรวจสอบข้อมูลที่กรอกให้ถูกต้อง';
        }
      }
      // Handle other HTTP errors
      else if (error.status === 400) {
        if (error.message) {
          // แปลข้อความ error ทั่วไป
          if (error.message.includes('not found')) {
            userFriendlyMessage = 'ไม่พบข้อมูลสัญญา กรุณาลองใหม่อีกครั้ง';
          } else if (error.message.includes('insufficient')) {
            userFriendlyMessage = 'จำนวนเงินไม่เพียงพอ';
          } else if (error.message.includes('already')) {
            userFriendlyMessage = 'มีการบันทึกข้อมูลนี้แล้ว';
          } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
            userFriendlyMessage = 'คุณไม่มีสิทธิ์ในการทำรายการนี้';
          } else {
            userFriendlyMessage = error.message;
          }
        }
      } else if (error.status === 401) {
        userFriendlyMessage = 'กรุณาเข้าสู่ระบบใหม่';
      } else if (error.status === 403) {
        userFriendlyMessage = 'คุณไม่มีสิทธิ์ในการทำรายการนี้';
      } else if (error.status === 404) {
        userFriendlyMessage = 'ไม่พบข้อมูลสัญญา';
      } else if (error.status >= 500) {
        userFriendlyMessage = 'เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง';
      } else if (error.message) {
        userFriendlyMessage = error.message;
      }

      // Show error alert
      alertDialog.error({
        title: 'ไม่สามารถบันทึกการชำระเงินได้',
        description: userFriendlyMessage,
        confirmText: 'ตกลง',
      });
    },
  });

  const handleViewLoan = (loan: ActiveLoan) => {
    setSelectedLoan(loan);
    setIsViewDialogOpen(true);
  };

  const handleRecordPayment = (loan: ActiveLoan) => {
    // Open payment dialog with pre-filled loan info
    setSelectedLoan(loan);
    setPaymentFormData({
      amount: loan.nextPaymentAmount ? loan.nextPaymentAmount.toString() : '',
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'transfer',
      note: '',
    });
    setIsRecordDialogOpen(true);
  };

  const handleSubmitPayment = async () => {
    if (!selectedLoan || !paymentFormData.amount) {
      alertDialog.error({
        title: 'ข้อมูลไม่ครบถ้วน',
        description: 'กรุณากรอกจำนวนเงินที่ชำระ',
        confirmText: 'ตกลง',
      });
      return;
    }

    const paymentAmount = parseFloat(paymentFormData.amount);

    // ⚠️ Enhanced Frontend Validation with User-Friendly Messages
    if (paymentAmount <= 0) {
      alertDialog.error({
        title: 'จำนวนเงินไม่ถูกต้อง',
        description: 'จำนวนเงินต้องมากกว่า 0 บาท กรุณากรอกจำนวนเงินที่ต้องการชำระ',
        confirmText: 'ตกลง',
      });
      return;
    }

    // 🚫 CRITICAL: Prevent overpayment with clear alert
    if (paymentAmount > selectedLoan.outstandingBalance) {
      // Show K Bank style error alert
      const excess = paymentAmount - selectedLoan.outstandingBalance;

      alertDialog.error({
        title: 'ไม่สามารถชำระเกินยอดหนี้ได้',
        description: `ยอดหนี้คงเหลือ: ${formatCurrency(selectedLoan.outstandingBalance)}\nจำนวนที่พยายามชำระ: ${formatCurrency(paymentAmount)}\nเกินไป: ${formatCurrency(excess)}`,
        confirmText: 'แก้ไขจำนวนเงิน',
        showCancel: true,
        cancelText: 'ยกเลิก',
        onConfirm: () => {
          // Auto-correct the amount when user clicks "แก้ไขจำนวนเงิน"
          setPaymentFormData({
            ...paymentFormData,
            amount: selectedLoan.outstandingBalance.toString()
          });
        }
      });

      return;
    }

    // ตรวจสอบจำนวนเงินที่ผิดปกติ (มากกว่า 10 ล้าน)
    if (paymentAmount > 10000000) {
      alertDialog.warning({
        title: 'จำนวนเงินสูงเกินไป!',
        description: `จำนวน ${formatCurrency(paymentAmount)} สูงผิดปกติ กรุณาตรวจสอบอีกครั้ง`,
        confirmText: 'ตกลง',
      });
      return;
    }

    // แสดงการยืนยันถ้าจ่ายมากกว่า 2 เท่าของยอดงวดปกติ
    if (selectedLoan.nextPaymentAmount && paymentAmount > selectedLoan.nextPaymentAmount * 2) {
      alertDialog.warning({
        title: 'ยืนยันการชำระเงิน',
        description: `จำนวนที่จะชำระ: ${formatCurrency(paymentAmount)}\nยอดงวดปกติ: ${formatCurrency(selectedLoan.nextPaymentAmount)}\nมากกว่าปกติ: ${formatCurrency(paymentAmount - selectedLoan.nextPaymentAmount)}\n\nคุณกำลังจะชำระมากกว่ายอดงวดปกติ ต้องการดำเนินการต่อหรือไม่?`,
        confirmText: 'ยืนยันชำระ',
        showCancel: true,
        cancelText: 'ยกเลิก',
        onConfirm: async () => {
          // Proceed with payment
          await proceedWithPayment();
        }
      });
      return;
    }

    // 💡 ALWAYS show confirmation dialog before payment
    const isFullPayment = paymentAmount >= selectedLoan.outstandingBalance;
    const remainingAfterPayment = Math.max(0, selectedLoan.outstandingBalance - paymentAmount);

    alertDialog.warning({
      title: 'ยืนยันการบันทึกการชำระเงิน',
      description: (
        <div className="space-y-4">
          {/* Contract Info - Simple white background */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-center">
              <h4 className="font-semibold text-lg text-gray-900">{selectedLoan.customerName}</h4>
              <p className="text-sm text-gray-500 mt-1">
                {selectedLoan.contractNumber || selectedLoan.id.slice(0, 8) + '...'}
              </p>
            </div>
          </div>

          {/* Payment Details - Clean layout like K Bank */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">จำนวนเงิน</span>
                <span className="font-bold text-xl text-gray-900">
                  {formatCurrency(paymentAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">วิธีการชำระ</span>
                <span className="text-gray-900 font-medium">
                  {paymentFormData.method === 'cash' && 'เงินสด'}
                  {paymentFormData.method === 'transfer' && 'โอนเงิน'}
                  {paymentFormData.method === 'cheque' && 'เช็ค'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">วันที่</span>
                <span className="text-gray-900 font-medium">
                  {new Date(paymentFormData.paymentDate).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'Asia/Bangkok'
                  })}
                </span>
              </div>
              {paymentFormData.note && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">หมายเหตุ</span>
                  <span className="text-gray-900 font-medium text-right max-w-[200px]">
                    {paymentFormData.note}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Balance Summary - K Bank style */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">ยอดหนี้ปัจจุบัน</span>
                <span className="text-gray-900 font-semibold">{formatCurrency(selectedLoan.outstandingBalance)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">หลังชำระจะเหลือ</span>
                  <span className="font-bold text-xl text-gray-900">
                    {formatCurrency(remainingAfterPayment)}
                  </span>
                </div>
              </div>
              {isFullPayment && (
                <div className="text-center bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                  <p className="text-green-700 font-semibold">ชำระครบทั้งหมดแล้ว</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
      confirmText: 'ยืนยันบันทึก',
      cancelText: 'ยกเลิก',
      showCancel: true,
      onConfirm: async () => {
        // Proceed with payment after confirmation
        await proceedWithPayment();
      }
    });
  };

  const proceedWithPayment = async () => {
    if (!selectedLoan) return;

    const paymentAmount = parseFloat(paymentFormData.amount);

    // Convert date to datetime format (ISO string)
    const paymentDateTime = new Date(paymentFormData.paymentDate + 'T00:00:00.000Z').toISOString();

    const paymentData = {
      loanId: selectedLoan.id,
      amount: paymentAmount,
      paymentDate: paymentDateTime,
      paymentMethod: paymentFormData.method.toUpperCase(),
      notes: paymentFormData.note || undefined,
    };

    await recordPaymentMutation.mutateAsync(paymentData);
  };

  const handleViewDocuments = (loan: ActiveLoan) => {
    // Navigate to documents page with customer filter
    navigate(`/documents?customerId=${loan.customerId}`);
  };

  const handleViewPaymentSchedule = (loan: ActiveLoan) => {
    // Navigate to loan detail page to see payment schedule
    navigate(`/loans/${loan.id}`);
  };

  const handleViewPaymentHistory = (loan: ActiveLoan) => {
    setSelectedLoan(loan);
    setIsPaymentHistoryDialogOpen(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Export to CSV function
  const handleExportToCSV = () => {
    const result = exportToCSV(filteredLoans, loanStatusFilter);
    if (result.success) {
      toast.success(`✅ ส่งออกข้อมูล ${result.count} รายการสำเร็จ`, {
        description: 'ไฟล์ CSV ถูกดาวน์โหลดแล้ว',
        duration: 3000
      });
    } else {
      toast.error('❌ ไม่สามารถส่งออกข้อมูลได้', {
        description: 'กรุณาลองใหม่อีกครั้ง',
        duration: 3000
      });
    }
  };

  return (
    <DashboardLayout breadcrumbs={[{ label: 'Home' }, { label: 'การจัดการสัญญาที่มีหนี้' }]} >
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl text-white font-bold text-foreground">
              {loanStatusFilter === 'active' && 'Active Contracts'}
              {loanStatusFilter === 'closed' && 'Closed Contracts'}
              {loanStatusFilter === 'all' && 'All Contracts'}
            </h1>
            <p className="text-sm sm:text-base text-white mt-1">
              {loanStatusFilter === 'active' && 'รายการสัญญาหนี้ที่ยังใช้งานอยู่ รวมถึงสัญญาที่ผิดนัดและ NPL'}
              {loanStatusFilter === 'closed' && 'รายการสัญญาหนี้ที่ปิดสัญญาแล้ว'}
              {loanStatusFilter === 'all' && 'รายการสัญญาทั้งหมด ทั้งที่มีหนี้และปิดยอดแล้ว'}
            </p>
          </div>
          <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => navigate('/loans')}
              className="w-full xs:w-auto justify-center"
            >
              <FileText className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">คำขอสินเชื่อ</span>
              <span className="xs:hidden">คำขอ</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportToCSV} 
              disabled={filteredLoans.length === 0}
              className="w-full xs:w-auto justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">ส่งออก ({filteredLoans.length})</span>
              <span className="xs:hidden">ส่งออก</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <PaymentStatsCards
        loanStatusFilter={loanStatusFilter}
        activeLoansCount={totalLoansCount}
        totalOutstanding={totalOutstanding}
        totalAmount={totalAmount}
        overdueCount={overdueCount}
        nplCount={nplCount}
        isLoading={isLoading}
        isLoadingStats={isLoadingStats}
      />

      {/* Active Loans Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr,auto] gap-4 xl:gap-6">
            <div className="flex-1 min-w-0 space-y-1.5">
              <CardTitle className="text-lg sm:text-xl leading-tight">
                {loanStatusFilter === 'active' && 'สัญญาที่มีหนี้'}
                {loanStatusFilter === 'closed' && 'สัญญาที่ปิดยอดแล้ว'}
                {loanStatusFilter === 'all' && 'สัญญาทั้งหมด'}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm leading-relaxed">
                แสดง <span className="font-medium">{filteredLoans.length}</span> รายการ จากทั้งหมด <span className="font-medium">{totalItems}</span> รายการ
                <span className="hidden sm:inline"> (หน้า <span className="font-medium">{currentPage}</span> จาก <span className="font-medium">{totalPages}</span>)</span>
              </CardDescription>
            </div>
            <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              {isAdmin && (
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="w-full sm:w-[200px] bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90">
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
              <PaymentTableFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                loanStatusFilter={loanStatusFilter}
                onLoanStatusChange={(value) => {
                  setLoanStatusFilter(value);
                  setCurrentPage(1);
                }}
                statusFilter={statusFilter}
                onStatusChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className=" overflow-hidden">
            <Table>
	              <TableHeader>
	                <TableRow className="bg-white">
	                  <TableHead className="font-semibold">เลขที่สัญญา</TableHead>
	                  <TableHead className="font-semibold">ลูกค้า</TableHead>
	                  <TableHead className="font-semibold">ยอดคงเหลือ</TableHead>
	                  <TableHead className="font-semibold">ชำระครั้งถัดไป</TableHead>
	                  <TableHead className="font-semibold">วันครบกำหนด</TableHead>
	                  <TableHead className="font-semibold">เครดิต</TableHead>
	                  <TableHead className="font-semibold">สถานะ</TableHead>
	                  <TableHead className="text-right font-semibold">การจัดการ</TableHead>
	                </TableRow>
	              </TableHeader>
              <TableBody>
	                {isLoading ? (
	                  <TableRow>
	                    <TableCell colSpan={8} className="p-0">
	                      <TableSkeleton rows={5} columns={8} />
	                    </TableCell>
	                  </TableRow>
	                ) : error ? (
	                  <TableRow>
	                    <TableCell colSpan={8} className="p-0">
	                      <ErrorDisplay
	                        error={error as any}
	                        onRetry={() => queryClient.invalidateQueries({ queryKey: ['loans-payment-view'] })}
	                        className="m-4"
	                      />
	                    </TableCell>
	                  </TableRow>
	                ) : filteredLoans.length === 0 ? (
	                  <TableRow>
	                    <TableCell colSpan={8} className="p-0">
	                      {searchTerm || statusFilter !== 'all' ? (
	                        <EmptySearchResults
	                          searchTerm={searchTerm}
	                          onClear={() => {
                            setSearchTerm('');
                            setStatusFilter('all');
                          }}
                        />
                      ) : loanStatusFilter === 'closed' ? (
                        <EmptyPayments
                          description="ยังไม่มีสัญญาที่ปิดยอดแล้ว สัญญาที่ชำระครบจะแสดงที่นี่"
                        />
                      ) : (
                        <EmptyPayments
                          description="ยังไม่มีสัญญาที่มีหนี้ สัญญาจะแสดงที่นี่เมื่อได้รับการเบิกจ่ายแล้ว (รวมถึงสัญญาที่ผิดนัดและ NPL)"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLoans.map((loan) => {
                    const StatusIcon = statusConfig[loan.status].icon;
                    const progress = ((loan.amount - loan.outstandingBalance) / loan.amount) * 100;
                    const isClosed = loan.outstandingBalance === 0;

                    return (
                      <TableRow key={loan.id} className={`hover:bg-muted/30 ${isClosed ? 'bg-green-50/30' : ''}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <p className="font-mono font-medium">{loan.contractNumber || loan.id.slice(0, 8) + '...'}</p>
                            {isClosed && (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                ปิดยอด
                              </Badge>
                            )}
                          </div>
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
                              <p className="text-xs text-muted-foreground">{loan.customerId.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className={`font-medium ${isClosed ? 'text-green-600' : 'text-primary'}`}>
                              {formatCurrency(loan.outstandingBalance)}
                            </p>
                            <Progress value={progress} className="h-1.5 w-24" />
                            <p className="text-xs text-muted-foreground">{progress.toFixed(0)}% ชำระแล้ว</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">
                              {isClosed ? (
                                <span className="text-green-600">ชำระครบแล้ว</span>
                              ) : (
                                loan.nextPaymentAmount ? formatCurrency(loan.nextPaymentAmount) : '-'
                              )}
                            </p>
                            {loan.overdueDays > 0 && !isClosed && (
                              <p className="text-xs text-destructive">เกิน {loan.overdueDays} วัน</p>
                            )}
                          </div>
                        </TableCell>
	                        <TableCell>
	                          <div className="flex items-center gap-2">
	                            <Calendar className="h-4 w-4 text-muted-foreground" />
	                            <span className="text-sm">
	                              {isClosed ? '-' : (loan.nextPaymentDate ? formatDate(loan.nextPaymentDate) : '-')}
	                            </span>
	                          </div>
	                        </TableCell>
	                        <TableCell>
	                          {isClosed ? (
	                            <span className="text-muted-foreground">-</span>
	                          ) : (
	                            <CreditGradeBadge
	                              grade={loan.creditGrade}
	                              score={loan.creditScore}
	                              reasons={loan.creditReasons}
	                              nextActions={loan.creditNextActions}
	                            />
	                          )}
	                        </TableCell>
	                        <TableCell>
	                          {isClosed ? (
	                            <Badge className="bg-green-100 text-green-800 border-green-200">
	                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              ชำระครบ
                            </Badge>
                          ) : (
                            <Badge className={statusConfig[loan.status].color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[loan.status].label}
                            </Badge>
                          )}
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
                              {!isClosed && (
                                <DropdownMenuItem onClick={() => handleRecordPayment(loan)}>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  บันทึกชำระ
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleViewPaymentHistory(loan)}>
                                <Receipt className="h-4 w-4 mr-2" />
                                ประวัติการชำระ
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewPaymentSchedule(loan)}>
                                <Calendar className="h-4 w-4 mr-2" />
                                ตารางชำระ
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewDocuments(loan)}>
                                <FileText className="h-4 w-4 mr-2" />
                                ดูเอกสาร
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  }))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <PaymentTablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={handlePageChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* View Loan Dialog */}
      <LoanViewDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        loan={selectedLoan}
        onRecordPayment={() => {
          setIsViewDialogOpen(false);
          if (selectedLoan) handleRecordPayment(selectedLoan);
        }}
        onViewPaymentSchedule={() => {
          if (selectedLoan) handleViewPaymentSchedule(selectedLoan);
        }}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={isRecordDialogOpen}
        onOpenChange={setIsRecordDialogOpen}
        loan={selectedLoan}
        formData={paymentFormData}
        onFormDataChange={setPaymentFormData}
        onSubmit={handleSubmitPayment}
        isSubmitting={recordPaymentMutation.isPending}
      />

      {/* Payment History Dialog */}
      <PaymentHistoryDialog
        open={isPaymentHistoryDialogOpen}
        onOpenChange={setIsPaymentHistoryDialogOpen}
        loan={selectedLoan}
        onViewPaymentSchedule={() => {
          setIsPaymentHistoryDialogOpen(false);
          if (selectedLoan) handleViewPaymentSchedule(selectedLoan);
        }}
      />

      {/* Alert Dialog */}
      <alertDialog.AlertDialog />
      </div>
    </DashboardLayout>
  );
}
