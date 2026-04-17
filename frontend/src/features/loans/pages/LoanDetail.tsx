import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Progress } from '@/shared/components/ui/progress';
import { TableSkeleton } from '@/shared/components/skeletons';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
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
  Calendar,
  DollarSign,
  FileText,
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Receipt,
  Loader2,
  User,
  Target,
  LucideIcon,
  Calculator,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { loansApi, paymentsApi, Loan as ApiLoan, Payment } from '@/shared/lib/api-endpoints';
import { useAlert } from '@/shared/hooks/useAlert';
import { useState, useCallback } from 'react';
import { useAuth } from '@/shared/contexts/AuthContext';

// Import new components
import { OverpaymentSimulator } from '../components/OverpaymentSimulator';
import { LoanInsights } from '../components/LoanInsights';

interface ApiError {
  message?: string;
  status?: number;
  code?: string;
}

interface PaymentSchedule {
  id: string;
  paymentNumber: number;
  paymentDate: string;
  dueDate?: string;
  totalPayment: number | string;
  totalAmount?: number | string;
  principalAmount: number | string;
  interestAmount: number | string;
  remainingBalance: number | string;
  paidAmount: number | string;
  paidDate?: string;
  status: string;
  isRecalculated?: boolean; // เพิ่ม field นี้
}

const statusConfig: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  UNPAID: { 
    label: 'ยังไม่ชำระ', 
    icon: Clock, 
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  },
  PAID: { 
    label: 'ชำระแล้ว', 
    icon: CheckCircle2, 
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  PARTIAL: { 
    label: 'ชำระบางส่วน', 
    icon: AlertTriangle, 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  OVERDUE: { 
    label: 'เกินกำหนด', 
    icon: XCircle, 
    color: 'bg-red-100 text-red-800 border-red-200'
  },
};

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showConfirm, AlertComponent } = useAlert();
  
  // State for payment modal
  const [isRecordDialogOpen, setIsRecordDialogOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'transfer',
    note: '',
  });

  // Fetch loan details
  const { data: loanData, isLoading: isLoadingLoan } = useQuery({
    queryKey: ['loan-detail', id],
    queryFn: async () => {
      if (!id) throw new Error('Loan ID is required');
      const result = await loansApi.getById(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!id,
  });

  // Fetch payment schedule
  const { data: scheduleData, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ['payment-schedule', id],
    queryFn: async () => {
      if (!id) throw new Error('Loan ID is required');
      const result = await loansApi.getPaymentSchedule(id);
      if (result.error) throw result.error;
      return result.data as unknown as { schedules: PaymentSchedule[]; total: number; loan: { id: string; customerId: string; customerName: string; outstandingBalance: string } };
    },
    enabled: !!id,
  });

  // Derived: next schedule (prefer schedule endpoint; fallback to loan fields in UI)
  const nextSchedule = scheduleData?.schedules?.find(
    (s: PaymentSchedule) => s.status === 'UNPAID' || s.status === 'OVERDUE' || s.status === 'PARTIAL'
  );

  // Fetch payment history
  const { data: paymentHistoryData } = useQuery({
    queryKey: ['payment-history', id],
    queryFn: async () => {
      if (!id) throw new Error('Loan ID is required');
      const result = await paymentsApi.getLoanHistory(id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!id,
  });

  // Record payment mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async (data: Partial<Payment>) => {
      const result = await paymentsApi.create(data);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-detail'] });
      queryClient.invalidateQueries({ queryKey: ['payment-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });

      const amount = parseFloat(paymentFormData.amount);
      const isFullPayment = loanData && amount >= Number(loanData.outstandingBalance);

      if (isFullPayment) {
        toast.success('🎉 ชำระเงินครบทั้งหมดแล้ว! สัญญานี้เสร็จสิ้นเรียบร้อย', { duration: 5000 });
      } else {
        toast.success(`✅ บันทึกการชำระเงิน ${formatCurrency(amount)} สำเร็จ`, { duration: 3000 });
      }

      setIsRecordDialogOpen(false);
      setPaymentFormData({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'transfer',
        note: '',
      });
    },
    onError: (error: ApiError) => {
      console.error('Payment creation error:', error);

      // Enhanced Error Handling with User-Friendly Messages
      if (error.code === 'PAYMENT_EXCEEDS_BALANCE') {
        toast.error('❌ ไม่สามารถชำระเกินยอดหนี้ได้!', {
          description: `ยอดหนี้คงเหลือ: ${formatCurrency(Number(loanData?.outstandingBalance || 0))}`,
          action: {
            label: 'แก้ไขจำนวนเงิน',
            onClick: () => {
              if (loanData) {
                setPaymentFormData({
                  ...paymentFormData,
                  amount: loanData.outstandingBalance.toString()
                });
              }
            }
          },
          duration: 8000,
        });
        return;
      }

      if (error.code === 'AMOUNT_TOO_HIGH') {
        toast.error('⚠️ จำนวนเงินสูงผิดปกติ!', {
          description: 'จำนวนเงินที่ใส่สูงเกินไป กรุณาตรวจสอบอีกครั้ง',
          duration: 6000,
        });
        return;
      }

      if (error.code === 'INVALID_AMOUNT') {
        toast.error('❌ จำนวนเงินไม่ถูกต้อง', {
          description: 'กรุณาใส่จำนวนเงินที่มากกว่า 0 บาท',
          duration: 5000,
        });
        return;
      }

      // Handle network errors
      if (error.status === 0 || error.message?.includes('Network Error')) {
        toast.error('🌐 ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', {
          description: 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่',
          duration: 6000,
        });
        return;
      }

      // Handle server errors
      if (error.status && error.status >= 500) {
        toast.error('🔧 ข้อผิดพลาดจากเซิร์ฟเวอร์', {
          description: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่ภายหลัง',
          duration: 6000,
        });
        return;
      }

      // Handle other errors with better formatting
      let userFriendlyMessage = 'ไม่สามารถบันทึกการชำระเงินได้';
      let description = '';
      
      if (error.message) {
        // Try to extract meaningful info from error message
        if (error.message.includes('validation')) {
          userFriendlyMessage = '❌ ข้อมูลไม่ถูกต้อง';
          description = 'กรุณาตรวจสอบข้อมูลที่กรอกอีกครั้ง';
        } else if (error.message.includes('permission')) {
          userFriendlyMessage = '🚫 ไม่มีสิทธิ์ดำเนินการ';
          description = 'คุณไม่มีสิทธิ์บันทึกการชำระเงินสำหรับสัญญานี้';
        } else {
          userFriendlyMessage = error.message;
        }
      }

      toast.error(userFriendlyMessage, { 
        description: description || undefined,
        duration: 6000 
      });
    },
  });

  const handleRecordPayment = useCallback(() => {
    if (!loanData) return;
    
    setPaymentFormData({
      amount: nextSchedule?.totalPayment !== undefined
        ? Number(nextSchedule.totalPayment).toString()
        : loanData.nextPaymentAmount
          ? loanData.nextPaymentAmount.toString()
          : '',
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'transfer',
      note: '',
    });
    setIsRecordDialogOpen(true);
  }, [loanData, nextSchedule?.totalPayment]);

  // Handler for quick payment from schedule
  const handleQuickPayment = useCallback((schedule: PaymentSchedule) => {
    setPaymentFormData({
      amount: schedule.totalPayment.toString(),
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'transfer',
      note: `ชำระงวดที่ ${schedule.paymentNumber}`,
    });
    setIsRecordDialogOpen(true);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // แสดงแค่วันที่ ไม่ต้องมีเวลา
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'Asia/Bangkok'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  const handleSubmitPayment = async () => {
    if (!loanData || !paymentFormData.amount) {
      toast.error('กรุณากรอกจำนวนเงินที่ชำระ');
      return;
    }

    const paymentAmount = parseFloat(paymentFormData.amount);
    const outstandingBalance = Number(loanData.outstandingBalance);
    
    // Frontend validation
    if (paymentAmount <= 0) {
      toast.error('❌ จำนวนเงินต้องมากกว่า 0 บาท');
      return;
    }
    
    // Prevent overpayment
    if (paymentAmount > outstandingBalance) {
      const excess = paymentAmount - outstandingBalance;
      
      showConfirm(
        {
          title: 'ไม่สามารถชำระเกินยอดหนี้ได้',
          type: 'error',
          showCancel: true,
          confirmText: 'แก้ไขจำนวนเงิน',
          cancelText: 'ยกเลิก',
          children: (
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">ยอดหนี้คงเหลือ</span>
                      <span className="font-semibold text-lg text-slate-900">
                        {formatCurrency(outstandingBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">จำนวนที่พยายามชำระ</span>
                      <span className="font-semibold text-lg text-slate-900">
                        {formatCurrency(paymentAmount)}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">เกินไป</span>
                        <span className="font-bold text-xl text-destructive">
                          {formatCurrency(excess)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        },
        () => {
          setPaymentFormData({
            ...paymentFormData,
            amount: loanData.outstandingBalance.toString()
          });
        }
      );
      return;
    }
    
    // Show confirmation dialog
    const isFullPayment = paymentAmount >= outstandingBalance;
    const remainingAfterPayment = Math.max(0, outstandingBalance - paymentAmount);
    
    showConfirm(
      {
        title: 'ยืนยันการบันทึกการชำระเงิน',
        type: 'info',
        showCancel: true,
        confirmText: 'ยืนยันบันทึก',
        cancelText: 'ยกเลิก',
        children: (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-center">
                <h4 className="font-semibold text-lg text-gray-900">{loanData.customer?.businessName}</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {loanData.contractNumber || loanData.id.slice(0, 8) + '...'}
                </p>
              </div>
            </div>
            
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
                    {formatDate(paymentFormData.paymentDate)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">ยอดหนี้ปัจจุบัน</span>
                  <span className="text-gray-900 font-semibold">{formatCurrency(Number(loanData.outstandingBalance))}</span>
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
        )
      },
      async () => {
        await proceedWithPayment();
      }
    );
  };

  const proceedWithPayment = async () => {
    if (!loanData) return;

    const paymentAmount = parseFloat(paymentFormData.amount);
    const paymentDateTime = new Date(paymentFormData.paymentDate + 'T00:00:00.000Z').toISOString();

    const paymentData = {
      loanId: loanData.id,
      amount: paymentAmount,
      paymentDate: paymentDateTime,
      paymentMethod: paymentFormData.method.toUpperCase(),
      notes: paymentFormData.note || undefined,
    };

    await recordPaymentMutation.mutateAsync(paymentData);
  };

  // Calculate data for insights - moved before early returns to fix hooks order
  const loan = loanData;
  const progress = loan ? ((Number(loan.principal) - Number(loan.outstandingBalance)) / Number(loan.principal)) * 100 : 0;
  const monthsPaid = scheduleData?.schedules?.filter(
    (s: PaymentSchedule) => s.status === 'PAID'
  ).length || 0;
  const remainingMonths = scheduleData?.schedules
    ? scheduleData.schedules.filter((s: PaymentSchedule) => s.status !== 'PAID').length
    : (loan ? loan.termMonths - monthsPaid : 0);
  const totalInterestPaid = scheduleData?.schedules
    ?.filter((s: PaymentSchedule) => s.status === 'PAID')
    .reduce((sum, s) => sum + Number(s.interestAmount || 0), 0) || 0;
  const totalInterestProjected = scheduleData?.schedules?.reduce(
    (sum, s) => sum + Number(s.interestAmount || 0),
    0
  ) || 0;

  if (isLoadingLoan) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'สัญญา', href: '/loans' }, { label: 'รายละเอียด' }]}>
        <div className="p-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-muted animate-pulse rounded" />
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 w-32 bg-muted animate-pulse rounded" />
              <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            </div>
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-32 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress Bar Skeleton */}
          <Card>
            <CardHeader>
              <div className="h-6 w-40 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>

          {/* Payment Schedule Skeleton */}
          <Card>
            <CardHeader>
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={5} columns={7} />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!loanData) {
    return (
      <DashboardLayout breadcrumbs={[{ label: 'สัญญา', href: '/loans' }, { label: 'รายละเอียด' }]}>
        <div className="text-center py-12">
          <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">ไม่พบข้อมูลสัญญา</h2>
          <p className="text-muted-foreground mb-4">สัญญาที่คุณค้นหาไม่พบในระบบ</p>
          <Button onClick={() => navigate('/loans')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับไปหน้าสัญญา
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout breadcrumbs={[
      { label: 'สัญญา', href: '/loans' }, 
      { label: loan.contractNumber || loan.id.slice(0, 8) + '...' }
    ]}>
      <div className="h-[calc(100vh-8rem)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/loans')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับ
          </Button>
          <div>
            <h1 className="text-2xl text-white font-bold">รายละเอียดสัญญา</h1>
            <p className="text-white">{loan.contractNumber || loan.id}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => setIsSimulatorOpen(true)}
            disabled={!loanData || isLoadingLoan}
            className="bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Calculator className="h-4 w-4 mr-2" />
            คำนวณจ่ายเกิน
          </Button>
          <Button variant="outline" onClick={handleRecordPayment}>
            <DollarSign className="h-4 w-4 mr-2" />
            บันทึกชำระ
          </Button>
          <Button 
            variant="outline"
            onClick={() => {
              const historySection = document.getElementById('payment-history');
              historySection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Receipt className="h-4 w-4 mr-2" />
            ประวัติการชำระ
          </Button>
        </div>
      </div>

      {/* Loan Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              ข้อมูลสัญญา
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">ลูกค้า</p>
                <p className="font-semibold">{loan.customer?.businessName || 'ไม่ระบุ'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">จำนวนเงินกู้</p>
                <p className="font-semibold">{formatCurrency(Number(loan.principal))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">อัตราดอกเบี้ย</p>
                <p className="font-semibold">{loan.interestRate}% ต่อปี</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ระยะเวลา</p>
                <p className="font-semibold">{loan.termMonths} เดือน</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">วันที่เบิกจ่าย</p>
                <p className="font-semibold">{loan.disbursementDate ? formatDate(loan.disbursementDate) : '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">งวดถัดไป</p>
                <p className="font-semibold">
                  {nextSchedule?.paymentDate
                    ? formatDate(nextSchedule.paymentDate)
                    : loan.nextPaymentDate
                      ? formatDate(loan.nextPaymentDate)
                      : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">ยอดงวด</p>
                <p className="font-semibold">
                  {nextSchedule?.totalPayment !== undefined
                    ? formatCurrency(Number(nextSchedule.totalPayment))
                    : loan.nextPaymentAmount
                      ? formatCurrency(Number(loan.nextPaymentAmount))
                      : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">สถานะ</p>
                <Badge className={
                  loan.status === 'ACTIVE' ? 'bg-green-100 text-green-800 border-green-200' :
                  loan.status === 'DISBURSED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  loan.status === 'NPL' ? 'bg-red-100 text-red-800 border-red-200' :
                  'bg-gray-100 text-gray-800 border-gray-200'
                }>
                  {loan.status}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              ยอดคงเหลือ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{formatCurrency(Number(loan.outstandingBalance))}</p>
                <p className="text-sm text-muted-foreground">จาก {formatCurrency(Number(loan.principal))}</p>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>ชำระแล้ว {progress.toFixed(1)}%</span>
                <span>คงเหลือ {(100 - progress).toFixed(1)}%</span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">ชำระแล้ว</span>
                  <span className="font-semibold text-success">
                    {formatCurrency(Number(loan.principal) - Number(loan.outstandingBalance))}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loan Insights */}
      <div className="my-6">
        <LoanInsights
          principal={Number(loan.principal)}
          outstandingBalance={Number(loan.outstandingBalance)}
          interestRate={loan.interestRate}
          termMonths={loan.termMonths}
          monthsPaid={monthsPaid}
          totalInterestPaid={totalInterestPaid}
          totalInterestProjected={totalInterestProjected}
        />
      </div>

      {/* Payment Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            ตารางการชำระเงิน
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingSchedule ? (
            <TableSkeleton rows={5} columns={7} />
          ) : !scheduleData?.schedules || scheduleData.schedules.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">ไม่พบข้อมูลตารางการชำระเงิน</p>
              <p className="text-sm text-muted-foreground mt-2">
                กรุณาติดต่อเจ้าหน้าที่เพื่อตั้งค่าตารางการชำระเงิน
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">งวดที่</TableHead>
                    <TableHead className="font-semibold">วันครบกำหนด</TableHead>
                    <TableHead className="font-semibold">เงินงวด</TableHead>
                    <TableHead className="font-semibold">เงินต้น</TableHead>
                    <TableHead className="font-semibold">ดอกเบี้ย</TableHead>
                    <TableHead className="font-semibold">ค่าปรับ</TableHead>
                    <TableHead className="font-semibold">คงเหลือ</TableHead>
                    <TableHead className="font-semibold">สถานะ</TableHead>
                    <TableHead className="font-semibold text-right">การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduleData?.schedules?.map((schedule) => {
                    const statusInfo = statusConfig[schedule.status];
                    const StatusIcon = statusInfo?.icon || Clock;
                    const statusStyle = statusInfo?.color || 'bg-gray-100 text-gray-800 border-gray-200';
                    const statusLabel = statusInfo?.label || schedule.status;
                    
                    // ป้องกัน NaN โดยตรวจสอบและใส่ค่า default
                    const principalAmount = Number(schedule.principalAmount) || 0;
                    const interestAmount = Number(schedule.interestAmount) || 0;
                    const totalPayment = Number(schedule.totalPayment) || 0;
                    const remainingBalance = Number(schedule.remainingBalance) || 0;
                    const paidAmount = Number(schedule.paidAmount) || 0;
                    
                    // 🔍 คำนวณจำนวนที่ตัดไปแล้ว (จาก payment history ของงวดนี้)
                    const schedulePayments = paymentHistoryData?.payments?.filter((p: Payment) => 
                      p.paymentScheduleId === schedule.id
                    ) || [];
                    
                    // คำนวณยอดรวมที่ชำระในงวดนี้
                    let totalPaidInSchedule = 0;
                    let paidInterest = 0;
                    let paidPrincipal = 0;
                    let paidPenalty = 0; // ✅ เพิ่มค่าปรับ
                    
                    schedulePayments.forEach((payment: Payment) => {
                      const paymentAmount = Number(payment.amount) || 0;
                      const penaltyAmount = Number(payment.penaltyAmount) || 0;
                      totalPaidInSchedule += paymentAmount;
                      
                      // รวมค่าปรับ
                      paidPenalty += penaltyAmount;
                      
                      // ตัดดอกเบี้ยก่อน (Banking Standard)
                      const interestToPay = Math.min(paymentAmount, interestAmount - paidInterest);
                      paidInterest += interestToPay;
                      
                      // ส่วนที่เหลือไปตัดเงินต้น
                      const principalToPay = paymentAmount - interestToPay;
                      paidPrincipal += principalToPay;
                    });
                    
                    return (
                      <TableRow 
                        key={schedule.id} 
                        className={`hover:bg-muted/30 ${schedule.isRecalculated ? 'bg-blue-50/50' : ''}`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{schedule.paymentNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(schedule.paymentDate)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(totalPayment)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{formatCurrency(principalAmount)}</div>
                            {paidPrincipal > 0 && (
                              <div className="text-xs text-success">
                                ตัดแล้ว: {formatCurrency(paidPrincipal)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{formatCurrency(interestAmount)}</div>
                            {paidInterest > 0 && (
                              <div className="text-xs text-success">
                                ตัดแล้ว: {formatCurrency(paidInterest)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {/* ค่าปรับที่ค้างอยู่ (จาก penalty calculation) */}
                            {Number(schedule.penaltyAmount) > 0 && (
                              <div className="font-medium text-destructive">
                                {formatCurrency(Number(schedule.penaltyAmount))}
                              </div>
                            )}
                            {/* ค่าปรับทบต้น */}
                            {Number(schedule.compoundInterestAmount) > 0 && (
                              <div className="text-xs text-orange-600">
                                +{formatCurrency(Number(schedule.compoundInterestAmount))} ทบต้น
                              </div>
                            )}
                            {/* ค่าปรับที่ชำระแล้ว */}
                            {paidPenalty > 0 && (
                              <div className="text-xs text-success">
                                ชำระแล้ว: {formatCurrency(paidPenalty)}
                              </div>
                            )}
                            {Number(schedule.penaltyAmount) === 0 && paidPenalty === 0 && (
                              <div className="text-muted-foreground">-</div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="font-semibold text-primary">
                          {formatCurrency(remainingBalance)}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusStyle}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusLabel}
                          </Badge>
                          {schedule.paidDate && (
                            <div className="text-xs text-muted-foreground mt-1">
                              ชำระ: {formatDate(schedule.paidDate)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            // หางวดแรกที่ยังไม่ชำระ
                            const firstUnpaidSchedule = scheduleData?.schedules?.find(
                              (s: PaymentSchedule) => s.status === 'UNPAID' || s.status === 'OVERDUE'
                            );
                            
                            // แสดงปุ่มชำระได้เฉพาะงวดแรกที่ยังไม่ชำระ หรืองวดที่เกินกำหนด
                            const canPay = (schedule.status === 'UNPAID' || schedule.status === 'OVERDUE') && 
                                          firstUnpaidSchedule?.id === schedule.id;
                            
                            if (canPay) {
                              return (
                                <Button
                                  size="sm"
                                  onClick={() => handleQuickPayment(schedule)}
                                  className="bg-[#138F3E] hover:bg-[#0F7A34] text-white"
                                >
                                  <Zap className="h-3 w-3 mr-1" />
                                  ชำระเงิน
                                </Button>
                              );
                            }
                            
                            if (schedule.status === 'PAID') {
                              return (
                                <Badge className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  ชำระแล้ว
                                </Badge>
                              );
                            }
                            
                            // งวดที่ยังไม่ถึงคิว
                            return (
                              <Badge className="bg-slate-50 text-slate-500 border-slate-200">
                                <Clock className="h-3 w-3 mr-1" />
                                รอชำระงวดก่อนหน้า
                              </Badge>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      {paymentHistoryData?.payments && paymentHistoryData.payments.length > 0 && (
        <Card className="mt-6" id="payment-history">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              ประวัติการชำระล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentHistoryData.payments.slice(0, 5).map((payment: Payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold">{formatCurrency(Number(payment.amount))}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(payment.paymentDate)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={
                      payment.paymentType === 'EARLY' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      payment.paymentType === 'ON_TIME' ? 'bg-green-100 text-green-800 border-green-200' :
                      payment.paymentType === 'LATE' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-gray-100 text-gray-800 border-gray-200'
                    }>
                      {payment.paymentType === 'EARLY' && 'ก่อนกำหนด'}
                      {payment.paymentType === 'ON_TIME' && 'ตรงเวลา'}
                      {payment.paymentType === 'LATE' && 'เกินกำหนด'}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">{payment.paymentMethod}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={isRecordDialogOpen} onOpenChange={setIsRecordDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              บันทึกการชำระเงิน
            </DialogTitle>
            <DialogDescription>
              {loanData?.contractNumber || loanData?.id} • {loanData?.customer?.businessName}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            <div className="space-y-6">
            {/* Contract Summary */}
            {loanData && (
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">ยอดคงเหลือ</p>
                      <p className="text-lg font-semibold">{formatCurrency(Number(loanData.outstandingBalance))}</p>
                    </div>
                    <div className="text-center border-x">
                      <p className="text-muted-foreground">งวดปกติ</p>
                      <p className="text-lg font-semibold">
                        {nextSchedule?.totalPayment !== undefined
                          ? formatCurrency(Number(nextSchedule.totalPayment))
                          : loanData.nextPaymentAmount
                            ? formatCurrency(Number(loanData.nextPaymentAmount))
                            : '-'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">กำหนดชำระ</p>
                      <p className="text-lg font-semibold">
                        {nextSchedule?.paymentDate
                          ? formatDate(nextSchedule.paymentDate)
                          : loanData.nextPaymentDate
                            ? formatDate(loanData.nextPaymentDate)
                            : '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Form */}
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">จำนวนเงิน (บาท) *</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    value={paymentFormData.amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (parseFloat(value) < 0) return;
                      setPaymentFormData({ ...paymentFormData, amount: value });
                    }}
                    placeholder="0"
                    className={`text-lg ${
                      loanData && paymentFormData.amount && parseFloat(paymentFormData.amount) > Number(loanData.outstandingBalance)
                        ? 'border-destructive focus:border-destructive' 
                        : ''
                    }`}
                    min="0"
                    step="0.01"
                  />
                  {/* Validation messages */}
                  {loanData && paymentFormData.amount && parseFloat(paymentFormData.amount) > Number(loanData.outstandingBalance) && (
                    <div className="bg-white border border-destructive/30 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">ไม่สามารถชำระเกินยอดหนี้ได้!</span>
                      </div>
                      <div className="bg-muted/30 rounded-md p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ยอดหนี้คงเหลือ</span>
                          <span className="font-semibold">{formatCurrency(Number(loanData.outstandingBalance))}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-muted-foreground">จำนวนที่ใส่</span>
                          <span className="font-semibold">{formatCurrency(parseFloat(paymentFormData.amount))}</span>
                        </div>
                        <div className="flex justify-between mt-2 pt-2 border-t border-border/60">
                          <span className="text-muted-foreground">เกินไป</span>
                          <span className="font-bold text-destructive">
                            {formatCurrency(parseFloat(paymentFormData.amount) - Number(loanData.outstandingBalance))}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPaymentFormData({
                          ...paymentFormData,
                          amount: loanData.outstandingBalance.toString()
                        })}
                        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 bg-white p-8"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        ปรับเป็นยอดหนี้คงเหลือที่ถูกต้อง
                        <br />
                        ({formatCurrency(Number(loanData.outstandingBalance))})
                      </Button>
                    </div>
                  )}
                  {loanData && paymentFormData.amount && parseFloat(paymentFormData.amount) > 0 && parseFloat(paymentFormData.amount) <= Number(loanData.outstandingBalance) && (
                    <div className="bg-success/10 border border-success/20 rounded-lg p-2">
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-medium">จำนวนเงินถูกต้อง</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-date">วันที่ชำระ *</Label>
                  <Input
                    id="payment-date"
                    type="date"
                    value={paymentFormData.paymentDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="space-y-2">
                <Label>จำนวนเงินแนะนำ</Label>
                <div className="flex gap-2">
                  {loanData?.nextPaymentAmount && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentFormData({
                        ...paymentFormData,
                        amount: nextSchedule?.totalPayment !== undefined
                          ? Number(nextSchedule.totalPayment).toString()
                          : loanData.nextPaymentAmount.toString()
                      })}
                      className="flex-1"
                    >
                      งวดปกติ
                    </Button>
                  )}
                  {loanData && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentFormData({
                        ...paymentFormData,
                        amount: loanData.outstandingBalance.toString()
                      })}
                      className="flex-1"
                    >
                      ชำระหมด
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-method">ช่องทางการชำระ *</Label>
                  <Select
                    value={paymentFormData.method}
                    onValueChange={(value) => setPaymentFormData({ ...paymentFormData, method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">เงินสด</SelectItem>
                      <SelectItem value="transfer">โอนเงิน</SelectItem>
                      <SelectItem value="cheque">เช็ค</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ผู้บันทึก</Label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{user?.name || 'ไม่ระบุ'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-note">หมายเหตุ</Label>
                <Textarea
                  id="payment-note"
                  value={paymentFormData.note}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, note: e.target.value })}
                  placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                  rows={2}
                />
              </div>
            </div>

            {/* Payment Summary */}
            {loanData && paymentFormData.amount && parseFloat(paymentFormData.amount) > 0 && (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <h4 className="font-medium">สรุปการชำระ</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">จำนวนที่ชำระ</span>
                        <span className="font-semibold">{formatCurrency(parseFloat(paymentFormData.amount))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">คงเหลือหลังชำระ</span>
                        <span className="font-semibold">
                          {formatCurrency(Math.max(0, Number(loanData.outstandingBalance) - parseFloat(paymentFormData.amount)))}
                        </span>
                      </div>
                      {parseFloat(paymentFormData.amount) >= Number(loanData.outstandingBalance) && (
                        <div className="bg-muted p-2 rounded text-center text-sm font-medium">
                          ชำระครบทั้งหมดแล้ว
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecordDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button 
              onClick={handleSubmitPayment} 
              disabled={
                recordPaymentMutation.isPending || 
                !paymentFormData.amount || 
                parseFloat(paymentFormData.amount) <= 0 ||
                (loanData && parseFloat(paymentFormData.amount) > Number(loanData.outstandingBalance))
              }
              className={
                loanData && paymentFormData.amount && parseFloat(paymentFormData.amount) > Number(loanData.outstandingBalance)
                  ? 'bg-destructive/20 text-destructive border-destructive/20 cursor-not-allowed'
                  : ''
              }
            >
              {recordPaymentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : loanData && paymentFormData.amount && parseFloat(paymentFormData.amount) > Number(loanData.outstandingBalance) ? (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  ไม่สามารถชำระเกินยอดหนี้ได้
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  บันทึกการชำระ
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Overpayment Simulator */}
      {loanData && (
        <OverpaymentSimulator
          open={isSimulatorOpen}
          onOpenChange={setIsSimulatorOpen}
          currentBalance={Number(loanData.outstandingBalance || 0)}
          monthlyPayment={Number(loanData.nextPaymentAmount || 0)}
          interestRate={loanData.interestRate || 0}
          remainingMonths={remainingMonths}
        />
      )}
      
      {/* Custom Alert Component */}
      {AlertComponent}
      </div>
    </DashboardLayout>
  );
}
