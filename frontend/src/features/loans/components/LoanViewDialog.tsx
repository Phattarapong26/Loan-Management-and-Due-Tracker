import React, { useCallback } from 'react';
import * as VisuallyHiddenPrimitive from '@radix-ui/react-visually-hidden';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';
import {
  FileText, CheckCircle, XCircle, Wallet, TrendingUp, Calendar,
  DollarSign, Percent, Building2, User, Activity, ShieldCheck, PieChart,
  ArrowUpRight, Info, X, Clock, BarChart3, Receipt, History, Eye, Edit, FileCheck,
  LucideIcon, Printer, Edit3, ClipboardCheck, AlertTriangle, UploadCloud, ChevronRight, Loader2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/shared/lib/utils';
import { Branch, Loan as ApiLoan } from '@/shared/lib/api-endpoints';

const VisuallyHidden = VisuallyHiddenPrimitive.Root;

export type LoanStatus = 'pending' | 'approved' | 'active' | 'rejected' | 'closed' | 'npl';

export interface StatusConfigEntry {
  label: string;
  icon: LucideIcon;
  color: string;
}

export type StatusConfig = Record<string, StatusConfigEntry>;

export interface Loan {
  id: string;
  contractNumber?: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  amount: number;
  outstandingBalance: number;
  interestRate: number;
  duration: number;
  dscr: number;
  status: LoanStatus;
  createdAt: string;
  approvedAt?: string;
  disbursementDate?: string;
  nextPaymentDate?: string;
  creditGrade?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'RISKY' | 'CRITICAL';
  creditScore?: number;
  creditReasons?: string[];
  creditNextActions?: string[];
  // Soft delete fields
  deletedAt?: string | null;
  deletedByName?: string | null;
  // Add missing properties
  loanProduct?: LoanProduct;
  branch?: Branch;
  officer?: Officer;
}

interface LoanProduct {
  id: string;
  productName: string;
}

interface Officer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
}

export type LoanDetail = Partial<ApiLoan>;

interface LoanViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLoan: Loan | null;
  loanDetailData: LoanDetail | null;
  isLoadingDetail: boolean;
  statusConfig: StatusConfig;
  canApproveLoan: boolean;
  onApprove: (id: string, approvalData: { notes?: string }) => Promise<void>;
  onReject: (id: string, rejectData: { reason: string }) => Promise<void>;
  onNavigateToDisbursement: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date) => string;
  getDscrColor: (dscr: number) => string;
}

// Helper Components
interface SummaryMetricProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
  badge?: string;
  subValue?: string;
}
const SummaryMetric = ({ icon: Icon, label, value, color, badge, subValue }: SummaryMetricProps) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400 group-hover:text-[#138F3E] transition-colors">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{label}</p>
    </div>
    <div className="flex items-baseline gap-2 flex-wrap">
      <p className={cn("text-xl font-bold tracking-tight", color)}>{value}</p>
      {subValue && <span className="text-[10px] font-semibold text-slate-400">{subValue}</span>}
      {badge && (
        <span className={cn(
          "text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-none",
          badge === 'Passed' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
        )}>
          {badge}
        </span>
      )}
    </div>
  </div>
);

interface DetailItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
  highlight?: string;
}

const DetailItem = ({ icon: Icon, label, value, highlight = "" }: DetailItemProps) => (
  <div className="flex items-start gap-3">
    <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100/50">
      <Icon className="h-4 w-4 text-slate-300" />
    </div>
    <div className="min-w-0">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mb-0.5 leading-none">{label}</p>
      <p className={cn("text-[13px] font-bold text-slate-700 truncate", highlight)}>{value}</p>
    </div>
  </div>
);

interface MiniProgressProps {
  label: string;
  value: number;
  color: string;
}

const MiniProgress = ({ label, value, color }: MiniProgressProps) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
      <span>{label}</span>
      <span className="text-slate-500">{value}%</span>
    </div>
    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all duration-1000", color)} style={{ width: `${value}%` }} />
    </div>
  </div>
);

// Enhanced Audit Log Component with Timeline Style
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: any;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

// Edit Loan Dialog Component
interface EditLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null;
  onSave: (loanId: string, updates: Partial<Loan>) => void;
  formatCurrency: (amount: number) => string;
}

const EditLoanDialog = ({ open, onOpenChange, loan, onSave, formatCurrency }: EditLoanDialogProps) => {
  const [amount, setAmount] = React.useState(loan?.amount || 0);
  const [interestRate, setInterestRate] = React.useState(loan?.interestRate || 0);
  const [duration, setDuration] = React.useState(loan?.duration || 0);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (loan) {
      setAmount(loan.amount);
      setInterestRate(loan.interestRate);
      setDuration(loan.duration);
    }
  }, [loan]);

  const handleSave = async () => {
    if (!loan) return;
    
    setIsSaving(true);
    try {
      await onSave(loan.id, {
        amount,
        interestRate,
        duration,
      });
      onOpenChange(false);
      toast({
        title: "✅ บันทึกสำเร็จ",
        description: "บันทึกการเปลี่ยนแปลงข้อมูลสินเชื่อเรียบร้อยแล้ว",
        className: "bg-green-50 border-green-200 text-green-900",
      });
    } catch (error) {
      console.error('Error saving loan:', error);
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-amber-600" />
            แก้ไขคำขอสินเชื่อ
          </DialogTitle>
          <DialogDescription>
            แก้ไขข้อมูลคำขอสินเชื่อ {loan?.contractNumber || loan?.id}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info - Read Only */}
          <div className="bg-slate-50 p-4 rounded-xl">
            <p className="text-sm font-bold text-slate-600 mb-2">ข้อมูลลูกค้า</p>
            <p className="text-lg font-black text-slate-800">{loan?.customerName}</p>
            <p className="text-sm text-slate-500">รหัสลูกค้า: {loan?.customerId}</p>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount" className="text-sm font-bold text-slate-700">
                วงเงินกู้ (บาท)
              </Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-1.5 text-lg font-bold"
                min={0}
                step={1000}
              />
              <p className="text-xs text-slate-500 mt-1">
                {formatCurrency(amount)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="interestRate" className="text-sm font-bold text-slate-700">
                  อัตราดอกเบี้ย (% ต่อปี)
                </Label>
                <Input
                  id="interestRate"
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="mt-1.5 text-lg font-bold"
                  min={0}
                  max={100}
                  step={0.01}
                />
              </div>

              <div>
                <Label htmlFor="duration" className="text-sm font-bold text-slate-700">
                  ระยะเวลา (เดือน)
                </Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="mt-1.5 text-lg font-bold"
                  min={1}
                  max={360}
                  step={1}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="bg-green-50 border p-4 rounded-2xl">
              <p className="text-xs font-bold text-green-700 uppercase mb-2">สรุปการเปลี่ยนแปลง</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">ค่างวดโดยประมาณ:</span>
                  <span className="font-black text-slate-800">
                    {formatCurrency(amount / duration)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">ดอกเบี้ยรวม (โดยประมาณ):</span>
                  <span className="font-black text-slate-800">
                    {formatCurrency((amount * interestRate * duration) / (12 * 100))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-[#138F3E] to-[#0F7A34] text-white"
          >
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Approve Loan Dialog Component
interface ApproveLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null;
  loanDetailData?: any; // Add loan detail data
  onConfirm: (loanId: string, approvalData: any) => void;
  formatCurrency: (amount: number) => string;
}

const ApproveLoanDialog = ({ open, onOpenChange, loan, loanDetailData, onConfirm, formatCurrency }: ApproveLoanDialogProps) => {
  const [notes, setNotes] = React.useState('');
  const [disbursementDate, setDisbursementDate] = React.useState('');
  const [firstPaymentDate, setFirstPaymentDate] = React.useState('');
  const [paymentDay, setPaymentDay] = React.useState(1);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { toast } = useToast();

  // Set default dates when dialog opens
  React.useEffect(() => {
    if (open && loan) {
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      
      setDisbursementDate(today.toISOString().split('T')[0]);
      setFirstPaymentDate(nextMonth.toISOString().split('T')[0]);
      setPaymentDay(1);
    }
  }, [open, loan]);

  const handleConfirm = async () => {
    if (!loan) return;
    
    setIsProcessing(true);
    try {
      // Create approval data - start simple with just notes
      const approvalData = {
        notes: notes || 'อนุมัติโดยระบบ'
      };
      
      console.log('Sending approval data:', approvalData);
      
      await onConfirm(loan.id, approvalData);
      onOpenChange(false);
      setNotes('');
      toast({
        title: "✅ อนุมัติสำเร็จ",
        description: `อนุมัติสินเชื่อ ${loan.contractNumber || loan.id} เรียบร้อยแล้ว`,
        className: "bg-green-50 border-green-200 text-green-900",
      });
    } catch (error) {
      console.error('Error approving loan:', error);
      toast({
        title: "❌ เกิดข้อผิดพลาด",
        description: "ไม่สามารถอนุมัติสินเชื่อได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            ยืนยันการอนุมัติสินเชื่อ
          </DialogTitle>
          <DialogDescription>
            กรุณาตรวจสอบข้อมูลก่อนอนุมัติ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Loan Summary */}
          <div className="bg-gradient-to-br from-green-50 to-white border-2 border-green-200 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#138F3E] to-[#0F7A34] flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">เลขที่สัญญา</p>
                <p className="text-lg font-black text-slate-800">
                  {loan?.contractNumber || loan?.id}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">ลูกค้า</p>
                <p className="text-base font-black text-slate-800">{loan?.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">วงเงินกู้</p>
                <p className="text-base font-black text-[#138F3E]">
                  {formatCurrency(loan?.amount || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">อัตราดอกเบี้ย</p>
                <p className="text-base font-black text-slate-800">{loan?.interestRate}% ต่อปี</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">ระยะเวลา</p>
                <p className="text-base font-black text-slate-800">{loan?.duration} เดือน</p>
              </div>
            </div>
            
            {/* Additional Contract Information */}
            <div className="mt-4 pt-4 border-t border-green-100">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500 font-bold uppercase">ผลิตภัณฑ์สินเชื่อ</span>
                  <span className="text-sm font-black text-slate-800">
                    {loanDetailData?.loanProduct?.productName || 
                     loan?.loanProduct?.productName || 
                     "ไม่พบข้อมูล"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500 font-bold uppercase">สาขาที่ดูแล</span>
                  <span className="text-sm font-black text-slate-800">
                    {loanDetailData?.branch?.name || 
                     loan?.branch?.name || 
                     "ไม่พบข้อมูล"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500 font-bold uppercase">พนักงานผู้รับผิดชอบ</span>
                  <span className="text-sm font-black text-slate-800">
                    {loanDetailData?.officer ? `${loanDetailData.officer.firstName} ${loanDetailData.officer.lastName}` : 
                     loan?.officer ? `${loan.officer.firstName} ${loan.officer.lastName}` : 
                     "ไม่พบข้อมูล"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* DSCR Score */}
          {loan?.dscr && (
            <div className={cn(
              "p-4 rounded-xl border-2",
              loan.dscr >= 1.25 
                ? "bg-green-50 border-green-200" 
                : "bg-amber-50 border-amber-200"
            )}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-600">DSCR Score</p>
                  <p className="text-2xl font-black text-slate-800">{loan.dscr != null && !isNaN(Number(loan.dscr)) ? Number(loan.dscr).toFixed(2) : 'N/A'}</p>
                </div>
                <Badge className={cn(
                  "text-sm px-3 py-1",
                  loan.dscr >= 1.25 
                    ? "bg-green-100 text-green-700 border-green-300" 
                    : "bg-amber-100 text-amber-700 border-amber-300"
                )}>
                  {loan.dscr >= 1.25 ? 'Low Risk' : 'Medium Risk'}
                </Badge>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="approveNotes" className="text-sm font-bold text-slate-700">
              หมายเหตุการอนุมัติ (ถ้าม)
            </Label>
            <Textarea
              id="approveNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุหมายเหตุหรือเงื่อนไขพิเศษ..."
              className="mt-1.5 min-h-[100px]"
            />
          </div>

          {/* Disbursement Details - Hidden for now */}
          {false && (
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-700">รายละเอียดการเบิกจ่าย</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="disbursementDate" className="text-sm font-medium text-slate-600">
                  วันที่เบิกจ่าย <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="disbursementDate"
                  type="date"
                  value={disbursementDate}
                  onChange={(e) => setDisbursementDate(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="firstPaymentDate" className="text-sm font-medium text-slate-600">
                  วันที่ชำระงวดแรก <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstPaymentDate"
                  type="date"
                  value={firstPaymentDate}
                  onChange={(e) => setFirstPaymentDate(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="paymentDay" className="text-sm font-medium text-slate-600">
                วันที่ชำระประจำเดือน (1-31)
              </Label>
              <Input
                id="paymentDay"
                type="number"
                min="1"
                max="31"
                value={paymentDay}
                onChange={(e) => setPaymentDay(parseInt(e.target.value) || 1)}
                className="mt-1 max-w-[120px]"
              />
            </div>
          </div>
          )}

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">โปรดทราบ</p>
              <p>การอนุมัติสินเชื่อจะไม่สามารถยกเลิกได้ กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนดำเนินการ</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="bg-gradient-to-r from-[#138F3E] to-[#0F7A34] text-white"
          >
            {isProcessing ? 'กำลังดำเนินการ...' : 'ยืนยันการอนุมัติ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Reject Loan Dialog Component
interface RejectLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null;
  onConfirm: (loanId: string, reason: string) => void;
  formatCurrency: (amount: number) => string;
}

const RejectLoanDialog = ({ open, onOpenChange, loan, onConfirm, formatCurrency }: RejectLoanDialogProps) => {
  const [reason, setReason] = React.useState('');
  const [selectedReason, setSelectedReason] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const { toast } = useToast();

  const commonReasons = [
    'ไม่ผ่านเกณฑ์การพิจารณาเครดิต',
    'รายได้ไม่เพียงพอ',
    'ประวัติการชำระหนี้ไม่ดี',
    'หลักประกันไม่เพียงพอ',
    'เอกสารไม่ครบถ้วน',
    'อื่นๆ (ระบุเหตุผล)',
  ];

  const handleConfirm = async () => {
    if (!loan) return;
    
    const finalReason = selectedReason === 'อื่นๆ (ระบุเหตุผล)' ? reason : selectedReason;
    
    if (!finalReason.trim()) {
      toast({
        title: "⚠️ กรุณาระบุเหตุผล",
        description: "กรุณาเลือกหรือระบุเหตุผลในการปฏิเสธสินเชื่อ",
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      await onConfirm(loan.id, finalReason);
      onOpenChange(false);
      setReason('');
      setSelectedReason('');
      // Toast will be shown by handleConfirmReject
    } catch (error: any) {
      console.error('Error rejecting loan:', error);
      // Only show toast if not already shown by handleConfirmReject
      if (!error.message || error.message === 'Error') {
        toast({
          title: "❌ เกิดข้อผิดพลาด",
          description: "ไม่สามารถปฏิเสธสินเชื่อได้ กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            ยืนยันการปฏิเสธสินเชื่อ
          </DialogTitle>
          <DialogDescription>
            กรุณาระบุเหตุผลในการปฏิเสธคำขอสินเชื่อ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Loan Summary */}
          <div className="bg-gradient-to-br from-red-50 to-white border-2 border-red-200 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">เลขที่สัญญา</p>
                <p className="text-lg font-black text-slate-800">
                  {loan?.contractNumber || loan?.id}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">ลูกค้า</p>
                <p className="text-base font-black text-slate-800">{loan?.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">วงเงินกู้</p>
                <p className="text-base font-black text-red-600">
                  {formatCurrency(loan?.amount || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Reason Selection */}
          <div>
            <Label className="text-sm font-bold text-slate-700 mb-3 block">
              เลือกเหตุผลในการปฏิเสธ
            </Label>
            <div className="space-y-2">
              {commonReasons.map((reasonOption) => (
                <label
                  key={reasonOption}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                    selectedReason === reasonOption
                      ? "border-red-500 bg-red-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  )}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reasonOption}
                    checked={selectedReason === reasonOption}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm font-medium text-slate-700">{reasonOption}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Reason */}
          {selectedReason === 'อื่นๆ (ระบุเหตุผล)' && (
            <div>
              <Label htmlFor="customReason" className="text-sm font-bold text-slate-700">
                ระบุเหตุผล
              </Label>
              <Textarea
                id="customReason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="กรุณาระบุเหตุผลในการปฏิเสธ..."
                className="mt-1.5 min-h-[100px]"
                required
              />
            </div>
          )}

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-bold mb-1">คำเตือน</p>
              <p>การปฏิเสธสินเชื่อจะส่งผลให้ลูกค้าไม่สามารถดำเนินการต่อได้ กรุณาตรวจสอบข้อมูลให้ถูกต้อง</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !selectedReason}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700"
          >
            {isProcessing ? 'กำลังดำเนินการ...' : 'ยืนยันการปฏิเสธ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EnhancedAuditLogSection = ({ loanId, formatDate }: { loanId?: string; formatDate: (date: string | Date) => string }) => {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-logs', 'loan', loanId],
    queryFn: async () => {
      if (!loanId) return [];
      try {
        const response = await fetch(`/audit-logs/resource/LOAN/${loanId}`, {
          credentials: 'include',
        });
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        return [];
      }
    },
    enabled: !!loanId,
  });

  const getActionIcon = (action: string) => {
    if (action.includes('VIEW')) return Eye;
    if (action.includes('UPDATE') || action.includes('EDIT')) return Edit;
    if (action.includes('APPROVE')) return FileCheck;
    if (action.includes('CREATE')) return FileText;
    return Activity;
  };

  const getActionColor = (action: string) => {
    if (action.includes('VIEW')) return { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-400' };
    if (action.includes('UPDATE')) return { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-400' };
    if (action.includes('APPROVE')) return { bg: 'bg-green-50', text: 'text-green-600', dot: 'bg-green-400' };
    if (action.includes('CREATE')) return { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-400' };
    return { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' };
  };

  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-100">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <History className="h-5 w-5 text-[#138F3E]" />
          ประวัติการเปลี่ยนแปลง
        </h3>
        {auditLogs && auditLogs.length > 0 && (
          <Badge className="bg-green-50 text-[#138F3E] border-green-100">
            {auditLogs.length} รายการ
          </Badge>
        )}
      </div>
      
      <div className="space-y-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#138F3E]"></div>
            <span className="ml-3 text-sm">กำลังโหลดประวัติ...</span>
          </div>
        ) : !auditLogs || auditLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <History size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm font-medium">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
            <p className="text-xs mt-1">ระบบจะบันทึกการเปลี่ยนแปลงทั้งหมดที่เกิดขึ้นกับสัญญานี้</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#138F3E] via-slate-200 to-transparent"></div>
            
            {/* Timeline Items */}
            <div className="space-y-6">
              {auditLogs.map((log: AuditLog, index: number) => {
                const ActionIcon = getActionIcon(log.action);
                const colors = getActionColor(log.action);
                
                return (
                  <div key={log.id} className="relative pl-16 group">
                    {/* Timeline Dot */}
                    <div className={cn(
                      "absolute left-3 top-2 w-6 h-6 rounded-full flex items-center justify-center z-10 ring-4 ring-white transition-all",
                      colors.bg,
                      "group-hover:scale-110"
                    )}>
                      <div className={cn("w-2 h-2 rounded-full", colors.dot)}></div>
                    </div>
                    
                    {/* Content Card */}
                    <div className={cn(
                      "bg-white border rounded-xl p-4 transition-all",
                      "hover:shadow-md hover:border-[#138F3E]/20",
                      index === 0 ? "border-[#138F3E]/30 shadow-sm" : "border-slate-100"
                    )}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={cn("p-2 rounded-lg", colors.bg)}>
                              <ActionIcon size={16} className={colors.text} />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-slate-800">
                                {log.action.replace(/_/g, ' ')}
                              </h4>
                              {log.user && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                  โดย {log.user.firstName} {log.user.lastName}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {log.details && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-600 font-mono">
                                {typeof log.details === 'string' 
                                  ? log.details 
                                  : JSON.stringify(log.details, null, 2).substring(0, 200)}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock size={12} />
                            <span>{formatDate(log.createdAt)}</span>
                          </div>
                          {index === 0 && (
                            <Badge className="mt-2 bg-[#138F3E] text-white text-[10px]">
                              ล่าสุด
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export function LoanViewDialog({
  open,
  onOpenChange,
  selectedLoan,
  loanDetailData,
  isLoadingDetail,
  statusConfig,
  canApproveLoan,
  onApprove,
  onReject,
  onNavigateToDisbursement,
  formatCurrency,
  formatDate,
}: LoanViewDialogProps) {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'collateral' | 'documents' | 'audit'>('overview');
  const [isEditing, setIsEditing] = React.useState(false);
  
  // Dialog states
  const [showEditDialog, setShowEditDialog] = React.useState(false);
  const [showApproveDialog, setShowApproveDialog] = React.useState(false);
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  
  const currentStatus = statusConfig[selectedLoan?.status || 'pending'];
  const { toast } = useToast();
  const displayContractNumber =
    selectedLoan?.contractNumber ||
    (loanDetailData as any)?.contractNumber ||
    (loanDetailData as any)?.contract_number ||
    undefined;

  // Debug: Log data when dialog opens
  React.useEffect(() => {
    if (open && selectedLoan) {
      console.log('=== LoanViewDialog Debug ===');
      console.log('selectedLoan:', selectedLoan);
      console.log('selectedLoan.loanProduct:', selectedLoan.loanProduct);
      console.log('selectedLoan.branch:', selectedLoan.branch);
      console.log('selectedLoan.officer:', selectedLoan.officer);
      console.log('loanDetailData:', loanDetailData);
      console.log('===============================');
    }
  }, [open, selectedLoan, loanDetailData]);

  // Handler สำหรับปุ่มพิมพ์
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Handler สำหรับปุ่มแก้ไข
  const handleEdit = useCallback(() => {
    setShowEditDialog(true);
  }, []);

  // Handler สำหรับบันทึกการแก้ไข
  const handleSaveEdit = useCallback(async (loanId: string, updates: Partial<Loan>) => {
    try {
      // TODO: Call API to update loan
      console.log('Updating loan:', loanId, updates);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "✅ บันทึกสำเร็จ",
        description: "บันทึกการเปลี่ยนแปลงข้อมูลสินเชื่อเรียบร้อยแล้ว",
        className: "bg-green-50 border-green-200 text-green-900",
      });
      // TODO: Refresh loan data
    } catch (error) {
      throw error;
    }
  }, [toast]);

  // Handler สำหรับปุ่มอัปโหลดเอกสาร
  const handleUploadDocument = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        console.log('Files selected:', Array.from(files).map(f => f.name));
        toast({
          title: "📁 กำลังอัปโหลด",
          description: `เลือกไฟล์ ${files.length} ไฟล์แล้ว กำลังดำเนินการอัปโหลด...`,
          className: "bg-blue-50 border-blue-200 text-blue-900",
        });
        // TODO: Upload files to server
      }
    };
    input.click();
  }, [toast]);

  // Handler สำหรับปุ่มพิมพ์ใบสมัคร
  const handlePrintApplication = useCallback(() => {
    console.log('Print application for loan:', selectedLoan?.id);
    window.print();
  }, [selectedLoan?.id]);

  // Handler สำหรับปุ่มแก้ไขคำขอ
  const handleEditApplication = useCallback(() => {
    setShowEditDialog(true);
  }, []);

  // Handler สำหรับปุ่มอนุมัติ
  const handleApprove = useCallback(() => {
    // Only open approval dialog if we have loan detail data
    if (loanDetailData) {
      setShowApproveDialog(true);
    } else {
      // If no detail data, show a message and don't open dialog
      toast({
        title: "กำลังโหลดข้อมูล",
        description: "กรุณารอสักครู่ ระบบกำลังโหลดข้อมูลสินเชื่อ",
        className: "bg-blue-50 border-blue-200 text-blue-900",
      });
    }
  }, [loanDetailData, toast]);

  // Handler สำหรับยืนยันการอนุมัติ
  const handleConfirmApprove = async (loanId: string, approvalData: any) => {
    try {
      console.log('Approving loan - loanId:', loanId, 'approvalData:', approvalData);
      console.log('Approval data structure:', JSON.stringify(approvalData, null, 2));
      
      // Delegate API + side-effects to parent (prevents double-submit)
      await onApprove(loanId, { notes: approvalData?.notes });

      // Close dialogs (parent handles success UI)
      setShowApproveDialog(false);
    } catch (error: any) {
      console.error('Error in handleConfirmApprove:', error);
      throw error;
    }
  };

  // Handler สำหรับปุ่มปฏิเสธ
  const handleReject = useCallback(() => {
    setShowRejectDialog(true);
  }, []);

  // Handler สำหรับยืนยันการปฏิเสธ
  const handleConfirmReject = useCallback(async (loanId: string, reason: string) => {
    try {
      console.log('Rejecting loan - loanId:', loanId, 'reason:', reason);

      // Delegate API + side-effects to parent (prevents double-submit)
      await onReject(loanId, { reason });

      // Close dialogs (parent handles success UI)
      setShowRejectDialog(false);
    } catch (error: any) {
      console.error('Error in handleConfirmReject:', error);
      throw error;
    }
  }, [onReject]);

  // Handler สำหรับปุ่มไปหน้าเบิกจ่าย
  const handleNavigateToDisbursement = useCallback(() => {
    if (window.confirm('ต้องการไปยังหน้าเบิกจ่ายเงินกู้หรือไม่?')) {
      onNavigateToDisbursement();
      onOpenChange(false);
    }
  }, [onNavigateToDisbursement, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>
            {displayContractNumber || "รายละเอียดสินเชื่อ"}
          </DialogTitle>
          <DialogDescription>
            รายละเอียดข้อมูลสินเชื่อและข้อมูลทางการเงิน
          </DialogDescription>
        </VisuallyHidden>
        {/* Header - Matching Example Style */}
        <header className="bg-white px-8 py-6 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-[#138F3E] to-[#0F7A34] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-green-500/20">
              <ClipboardCheck size={32} strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-black tracking-tight text-slate-800">
                  {displayContractNumber || selectedLoan?.id?.substring(0, 12) || "รายละเอียดสินเชื่อ"}
                </h1>
                <span className={cn(
                  "px-3 py-1 text-xs font-bold rounded-full border flex items-center gap-1",
                  currentStatus?.color
                )}>
                  <Clock size={12} />
                  {currentStatus?.label}
                </span>
                {selectedLoan?.dscr && (
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-100">
                    Internal Grade: {selectedLoan.dscr >= 1.25 ? 'A+' : 'B+'}
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
                <User size={16} className="text-slate-400" /> {selectedLoan?.customerName}
                <span className="text-slate-200 mx-1">|</span>
                <span className="text-sm bg-slate-100 px-2 py-0.5 rounded italic font-bold">
                  วันที่ยื่นคำขอ: {formatDate(selectedLoan?.createdAt || new Date())}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePrint}
              className="p-3 text-slate-400 hover:text-[#138F3E] hover:bg-green-50 rounded-xl transition-all"
              aria-label="พิมพ์"
              title="พิมพ์เอกสาร"
            >
              <Printer size={22} />
            </button>
            <button 
              onClick={handleEdit}
              className="p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
              aria-label="แก้ไข"
              title="แก้ไขข้อมูล"
            >
              <Edit3 size={22} />
            </button>
            <div className="h-8 w-[1px] bg-slate-100 mx-2"></div>
            <button 
              onClick={() => onOpenChange(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
              aria-label="ปิด"
              title="ปิดหน้าต่าง"
            >
              <X size={28} />
            </button>
          </div>
        </header>

        {/* Tab Navigation - Matching Example Style */}
        <nav className="px-8 bg-white border-b border-slate-100 flex gap-10">
          {[
            { id: 'overview', label: 'รายละเอียดคำขอ', icon: PieChart },
            { id: 'collateral', label: 'หลักประกัน/ประเมินราคา', icon: ShieldCheck },
            { id: 'documents', label: 'เอกสารประกอบการยื่นกู้', icon: FileText },
            { id: 'audit', label: 'ประวัติการพิจารณา', icon: History }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "py-5 text-sm font-bold transition-all relative flex items-center gap-2",
                activeTab === tab.id ? 'text-[#138F3E]' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <tab.icon size={18} />
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-[#138F3E] rounded-t-full"></div>
              )}
            </button>
          ))}
        </nav>

        {isLoadingDetail ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white grow">
            <div className="h-10 w-10 border-[3px] border-slate-100 border-t-[#138F3E] rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-y-auto grow bg-[#FAFBFC]">
            <div className="p-8">
              <div className="grid grid-cols-12 gap-8">
                {/* LEFT COLUMN */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <>
                      {/* Section 1: Requested Financials - 3 Cards */}
                      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: วงเงินที่ขอกู้ */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider">วงเงินที่ขอกู้</p>
                      <h3 className="text-3xl font-black text-slate-800">
                        {formatCurrency(loanDetailData?.amount || selectedLoan?.amount || 0)}
                      </h3>
                      <div className="mt-4 flex items-center justify-between text-xs font-bold text-[#138F3E]">
                        <span>ระยะเวลา {loanDetailData?.termMonths || selectedLoan?.duration || 0} เดือน</span>
                      </div>
                    </div>

                    {/* Card 2: อัตราดอกเบี้ยเสนอ */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                      <p className="text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider">อัตราดอกเบี้ยเสนอ</p>
                      <h3 className="text-3xl font-black text-indigo-700">
                        {loanDetailData?.interestRate || selectedLoan?.interestRate || 0}%
                      </h3>
                      <div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                        <span>MLR - 0.50% (โดยประมาณ)</span>
                      </div>
                    </div>

                    {/* Card 3: ค่างวดโดยประมาณ */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm ">
                      <p className="text-slate-400 text-sm font-bold mb-2 uppercase tracking-wider">ค่างวดโดยประมาณ</p>
                      <h3 className="text-3xl font-black text-blue-600">
                        {loanDetailData?.nextPaymentAmount ? formatCurrency(loanDetailData.nextPaymentAmount) : formatCurrency((selectedLoan?.amount || 0) / (selectedLoan?.duration || 1))}
                      </h3>
                      <p className="mt-4 text-[10px] font-black text-slate-400 uppercase leading-none">
                        *คำนวณเบื้องต้น รายละเอียดจะสรุปในสัญญา
                      </p>
                    </div>
                  </section>

                  {/* Section 2: Application Progress & Risk Analysis */}
                  <section className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                      <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <TrendingUp size={24} className="text-[#138F3E]" /> 
                        วิเคราะห์ความเป็นไปได้ (Pre-Approval Analysis)
                      </h4>
                    </div>

                    <div className="space-y-8">
                      {/* Process Visualization */}
                      <div>
                        <div className="flex justify-between text-sm font-bold mb-3">
                          <span className="text-slate-500 uppercase">ขั้นตอนการพิจารณา (Current Progress)</span>
                          <span className="text-[#138F3E] font-black">
                            {selectedLoan?.status === 'pending' ? 'Stage 2: Credit Scoring' : 
                             selectedLoan?.status === 'approved' ? 'Stage 3: อนุมัติเบื้องต้น' : 
                             selectedLoan?.status === 'active' ? 'Stage 4: ทำสัญญา' : 'Stage 1: รับเรื่อง'}
                          </span>
                        </div>
                        <div className="w-full h-4 flex rounded-full bg-slate-100 overflow-hidden shadow-inner">
                          <div 
                            className="bg-[#138F3E] h-full rounded-full shadow-lg shadow-green-200 transition-all duration-1000"
                            style={{ 
                              width: selectedLoan?.status === 'pending' ? '45%' : 
                                     selectedLoan?.status === 'approved' ? '70%' : 
                                     selectedLoan?.status === 'active' ? '100%' : '25%' 
                            }}
                          ></div>
                        </div>
                        <div className="grid grid-cols-4 mt-3 text-[10px] font-black text-slate-400 uppercase text-center">
                          <div className={selectedLoan?.status ? "text-[#138F3E]" : ""}>รับเรื่อง</div>
                          <div className={selectedLoan?.status === 'pending' || selectedLoan?.status === 'approved' || selectedLoan?.status === 'active' ? "text-[#138F3E]" : ""}>วิเคราะห์เครดิต</div>
                          <div className={selectedLoan?.status === 'approved' || selectedLoan?.status === 'active' ? "text-[#138F3E]" : ""}>อนุมัติเบื้องต้น</div>
                          <div className={selectedLoan?.status === 'active' ? "text-[#138F3E]" : ""}>ทำสัญญา</div>
                        </div>
                      </div>

                      {/* Bureau & Scoring + Collateral Feasibility */}
                      <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-50">
                        <div>
                          <h5 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                            <ShieldCheck size={14} className="text-[#138F3E]" />
                            Bureau & Scoring
                          </h5>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-xl border border-green-100/50">
                              <span className="text-sm text-slate-600 font-medium">Credit Score (Internal)</span>
                              <span className="text-sm font-black text-[#138F3E] font-mono">
                                {selectedLoan?.dscr >= 1.25 ? 'A+ (Low Risk)' : selectedLoan?.dscr ? 'B+ (Medium Risk)' : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-sm text-slate-600 font-medium">DSCR Ratio</span>
                              <span className="text-sm font-black text-slate-900">
                                {selectedLoan?.dscr ? selectedLoan.dscr.toFixed(2) : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-sm text-slate-600 font-medium">สถานะการตรวจสอบ</span>
                              <span className="text-sm font-black text-slate-600">
                                {selectedLoan?.status === 'pending' ? 'กำลังตรวจสอบ' : 
                                 selectedLoan?.status === 'approved' ? 'ผ่านการตรวจสอบ' : 
                                 selectedLoan?.status === 'active' ? 'อนุมัติแล้ว' : '-'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h5 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2">
                            <Building2 size={14} className="text-[#138F3E]" />
                            ข้อมูลเพิ่มเติม
                          </h5>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-sm text-slate-600 font-medium">วันที่สร้างคำขอ</span>
                              <span className="text-sm font-black text-slate-900">
                                {selectedLoan?.createdAt ? formatDate(selectedLoan.createdAt) : '-'}
                              </span>
                            </div>
                            {selectedLoan?.approvedAt && (
                              <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-xl border border-green-100/50">
                                <span className="text-sm text-slate-600 font-medium">วันที่อนุมัติ</span>
                                <span className="text-sm font-black text-[#138F3E]">
                                  {formatDate(selectedLoan.approvedAt)}
                                </span>
                              </div>
                            )}
                            {selectedLoan?.disbursementDate && (
                              <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-xl border border-green-100/50">
                                <span className="text-sm text-slate-600 font-medium">วันที่เบิกจ่าย</span>
                                <span className="text-sm font-black text-[#138F3E]">
                                  {formatDate(selectedLoan.disbursementDate)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  
                  
                  {selectedLoan?.status === 'approved' && (
                    <section className="bg-gradient-to-r from-[#138F3E] to-[#0F7A34] rounded-[2rem] p-8 text-white flex items-center justify-between shadow-xl shadow-green-500/20">
                      <div className="flex items-center gap-6">
                        <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                          <CheckCircle size={32} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold">คำขอได้รับการอนุมัติ</h4>
                          <p className="text-green-100 text-sm opacity-90">
                            {selectedLoan.approvedAt && `อนุมัติเมื่อ ${formatDate(selectedLoan.approvedAt)}`}
                          </p>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* Loan Details - Enhanced with Better UX/UI */}
                  <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#138F3E] to-[#0F7A34] flex items-center justify-center shadow-lg shadow-green-500/20">
                          <FileText size={24} className="text-white" />
                        </div>
                        โครงสร้างและเงื่อนไขสัญญา
                      </h3>
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200 px-3 py-1">
                        Contract Terms
                      </Badge>
                    </div>

                    {/* Main Contract Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                      {/* Duration Card */}
                      <div className="group relative overflow-hidden p-5 bg-gradient-to-br from-[#138F3E]/5 via-white to-white rounded-2xl border-2 border-[#138F3E]/10 hover:border-[#138F3E]/30 hover:shadow-lg hover:shadow-[#138F3E]/5 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#138F3E]/5 rounded-full blur-3xl group-hover:bg-[#138F3E]/10 transition-all"></div>
                        <div className="relative flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#138F3E] to-[#0F7A34] flex items-center justify-center shadow-lg shadow-[#138F3E]/20 group-hover:scale-110 transition-transform">
                            <Calendar className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">ระยะเวลาสินเชื่อ</p>
                            <p className="text-2xl font-black text-slate-800 mb-1">{loanDetailData?.termMonths || selectedLoan?.duration || 0} เดือน</p>
                            <p className="text-xs text-slate-500 font-medium">
                              {(loanDetailData?.termMonths || selectedLoan?.duration) ? `≈ ${((loanDetailData?.termMonths || selectedLoan?.duration || 0) / 12).toFixed(1)} ปี` : '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Product Card */}
                      <div className="group relative overflow-hidden p-5 bg-gradient-to-br from-slate-50 via-white to-white rounded-2xl border-2 border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100/50 rounded-full blur-3xl group-hover:bg-slate-200/50 transition-all"></div>
                        <div className="relative flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <PieChart className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">ผลิตภัณฑ์สินเชื่อ</p>
                            <p className="text-lg font-black text-slate-800 leading-tight">
                              {loanDetailData?.loanProduct?.productName || selectedLoan?.loanProduct?.productName || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Branch Card */}
                      <div className="group relative overflow-hidden p-5 bg-gradient-to-br from-slate-50 via-white to-white rounded-2xl border-2 border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100/50 rounded-full blur-3xl group-hover:bg-slate-200/50 transition-all"></div>
                        <div className="relative flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Building2 className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">สาขาที่ดูแล</p>
                            <p className="text-lg font-black text-slate-800 leading-tight">
                              {loanDetailData?.branch?.name || selectedLoan?.branch?.name || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Officer Card */}
                      <div className="group relative overflow-hidden p-5 bg-gradient-to-br from-slate-50 via-white to-white rounded-2xl border-2 border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100/50 rounded-full blur-3xl group-hover:bg-slate-200/50 transition-all"></div>
                        <div className="relative flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <User className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">พนักงานผู้รับผิดชอบ</p>
                            <p className="text-lg font-black text-slate-800 leading-tight">
                              {loanDetailData?.officer ? `${loanDetailData.officer.firstName} ${loanDetailData.officer.lastName}` : 
                               selectedLoan?.officer ? `${selectedLoan.officer.firstName} ${selectedLoan.officer.lastName}` : "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Schedule Section - Only for Active Loans */}
                    {(loanDetailData?.status === 'ACTIVE' || selectedLoan?.status === 'active') && (
                      <>
                        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent my-6"></div>
                        
                        <div className="mb-4">
                          <h4 className="text-sm font-black text-slate-600 uppercase tracking-wider flex items-center gap-2 mb-4">
                            <Receipt size={16} className="text-[#138F3E]" />
                            ตารางการชำระเงิน
                          </h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Next Payment Date Card */}
                          <div className="group relative overflow-hidden p-6 bg-gradient-to-br from-amber-50 via-amber-25 to-white rounded-2xl border-2 border-amber-200/50 hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-amber-200/30 rounded-full blur-3xl group-hover:bg-amber-300/40 transition-all"></div>
                            <div className="relative flex items-start gap-4">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/30 group-hover:scale-110 transition-transform">
                                <Calendar className="h-8 w-8 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-2">งวดถัดไป</p>
                                <p className="text-2xl font-black text-amber-700 mb-1">
                                  {loanDetailData?.nextPaymentDate ? formatDate(loanDetailData.nextPaymentDate) : selectedLoan?.nextPaymentDate ? formatDate(selectedLoan.nextPaymentDate) : "-"}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                  <p className="text-xs text-amber-600 font-bold">กำลังดำเนินการ</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Payment Amount Card */}
                          <div className="group relative overflow-hidden p-6 bg-gradient-to-br from-green-50 via-green-25 to-white rounded-2xl border-2 border-green-200/50 hover:border-[#138F3E] hover:shadow-xl hover:shadow-green-500/10 transition-all duration-300">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-green-200/30 rounded-full blur-3xl group-hover:bg-green-300/40 transition-all"></div>
                            <div className="relative flex items-start gap-4">
                              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#138F3E] to-[#0F7A34] flex items-center justify-center shadow-xl shadow-green-500/30 group-hover:scale-110 transition-transform">
                                <Receipt className="h-8 w-8 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-xs text-[#138F3E] font-bold uppercase tracking-wider mb-2">ยอดต้องชำระ</p>
                                <p className="text-2xl font-black text-[#138F3E] mb-1">
                                  {formatCurrency(loanDetailData?.nextPaymentAmount || 0)}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <ChevronRight size={14} className="text-[#138F3E]" />
                                  <p className="text-xs text-green-600 font-bold">ต่องวด</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Rejection Alert */}
                  {selectedLoan?.status === 'rejected' && (
                    <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 flex gap-4 items-center">
                      <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                        <XCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-red-900 mb-0.5">ไม่อนุมัติคำขอ</p>
                        <p className="text-sm text-red-700">
                          {loanDetailData?.rejectedReason || "ไม่เป็นไปตามเกณฑ์ประเมินความเสี่ยง"}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Collateral Tab */}
              {activeTab === 'collateral' && (
                <div className="bg-white rounded-2xl p-8 border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-[#138F3E]" />
                    หลักประกัน/ประเมินราคา
                  </h3>
                  <div className="text-center py-12 text-slate-400">
                    <ShieldCheck size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">ยังไม่มีข้อมูลหลักประกันในระบบ</p>
                  </div>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="bg-white rounded-2xl p-8 border border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#138F3E]" />
                    เอกสารประกอบสัญญา
                  </h3>
                  <div className="text-center py-12 text-slate-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-sm">ยังไม่มีเอกสารในระบบ</p>
                  </div>
                </div>
              )}

              {/* Audit Tab - Enhanced Timeline Style */}
              {activeTab === 'audit' && (
                <EnhancedAuditLogSection loanId={selectedLoan?.id} formatDate={formatDate} />
              )}
            </div>

            {/* RIGHT COLUMN: Application Command */}
            <div className="col-span-12 lg:col-span-4 space-y-6">

              {/* Risk Alert System */}
              {selectedLoan?.status === 'pending' && (
                <section className="bg-amber-50 border border-amber-100 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 text-amber-700 font-black text-sm uppercase tracking-widest mb-4">
                    <Clock size={18} /> กำลังพิจารณา
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-1 h-auto bg-amber-300 rounded-full"></div>
                      <p className="text-sm text-amber-800 leading-relaxed font-medium">
                        คำขอสินเชื่อของคุณอยู่ระหว่างการตรวจสอบและพิจารณา
                      </p>
                    </div>
                  </div>
                </section>
              )}
              
              {selectedLoan?.status === 'rejected' && (
                <section className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem]">
                  <div className="flex items-center gap-2 text-rose-700 font-black text-sm uppercase tracking-widest mb-4">
                    <AlertTriangle size={18} /> ไม่อนุมัติ
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-1 h-auto bg-rose-300 rounded-full"></div>
                      <p className="text-sm text-rose-800 leading-relaxed font-medium">
                        {loanDetailData?.rejectedReason || "คำขอสินเชื่อไม่ได้รับการอนุมัติ"}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Recent Consideration History - Compact Timeline */}
              <section className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <History size={18} className="text-slate-400" /> บันทึกการพิจารณา
                  </h4>
                </div>
                <div className="relative space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-5 h-5 bg-[#138F3E] rounded-full border-4 border-white shadow-sm"></div>
                    <p className="text-xs font-black text-slate-800">ส่งต่อฝ่ายวิเคราะห์เครดิต</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase">
                      {formatDate(selectedLoan?.createdAt || new Date())} • โดย RM_SYSTEM
                    </p>
                  </div>
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-5 h-5 bg-slate-200 rounded-full border-4 border-white"></div>
                    <p className="text-xs font-bold text-slate-600">รับเรื่องเข้าระบบ (Draft Created)</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase">
                      {formatDate(selectedLoan?.createdAt || new Date())} • โดย SYSTEM_GEN
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('audit')}
                  className="w-full mt-6 py-3 text-xs font-black text-slate-400 hover:text-[#138F3E] hover:bg-green-50 rounded-xl transition-all border border-dashed border-slate-200"
                >
                  ดูบันทึกทั้งหมด
                </button>
              </section>

               {/* Action Center - Focused on Application Workflow */}
              <section className="space-y-3">
                {/* Approve/Reject Buttons - Only for pending loans with permission */}
                {selectedLoan?.status === 'pending' && canApproveLoan && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <button 
                      onClick={handleApprove}
                      className="bg-gradient-to-r from-[#138F3E] to-[#0F7A34] text-white py-5 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                      title="อนุมัติคำขอ"
                    >
                      <CheckCircle size={20} /> อนุมัติ
                    </button>
                    <button 
                      onClick={handleReject}
                      className="bg-gradient-to-r from-red-500 to-red-600 text-white py-5 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                      title="ปฏิเสธคำขอ"
                    >
                      <XCircle size={20} /> ปฏิเสธ
                    </button>
                  </div>
                )}

                {/* Disbursement Button - Only for approved loans */}
                {selectedLoan?.status === 'approved' && (
                  <button 
                    onClick={handleNavigateToDisbursement}
                    className="w-full bg-gradient-to-r from-[#138F3E] to-[#0F7A34] text-white py-5 rounded-xl font-black flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all mb-3"
                    title="ดำเนินการเบิกจ่าย"
                  >
                    <Wallet size={20} /> ดำเนินการเบิกจ่าย
                  </button>
                )}

                <button 
                  onClick={handleUploadDocument}
                  className="w-full bg-slate-900 text-white py-5 rounded-xl font-black flex items-center justify-center gap-3 shadow-lg hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  title="อัปโหลดเอกสารเพิ่มเติม"
                >
                  <UploadCloud size={20} /> อัปโหลดเอกสารเพิ่มเติม
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handlePrintApplication}
                    className="bg-white border border-slate-200 text-slate-700 py-4 rounded-[1.2rem] font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all hover:border-slate-300"
                    title="พิมพ์ใบสมัคร"
                  >
                    <FileText size={18} /> พิมพ์ใบสมัคร
                  </button>
                  <button 
                    onClick={handleEditApplication}
                    className="bg-white border border-slate-200 text-slate-700 py-4 rounded-[1.2rem] font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                    title="แก้ไขคำขอ"
                    disabled={selectedLoan?.status === 'active' || selectedLoan?.status === 'rejected'}
                  >
                    <Edit3 size={18} /> แก้ไขคำขอ
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Footer */}
      <footer className="bg-white px-8 py-4 border-t border-slate-100 flex flex-wrap justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex gap-8">
          <span className="flex items-center gap-1.5">
            <Clock size={12} /> Sync Status: Active
          </span>
          <span className="flex items-center gap-1.5 text-[#138F3E]">
            <ShieldCheck size={12} /> ข้อมูลอยู่ระหว่างการพิจารณาสินเชื่อ
          </span>
        </div>
        <div className="flex gap-6">
          <span>User: SYSTEM (Branch 001)</span>
        </div>
      </footer>
    </DialogContent>

    {/* Edit Loan Dialog */}
    <EditLoanDialog
      open={showEditDialog}
      onOpenChange={setShowEditDialog}
      loan={selectedLoan}
      onSave={handleSaveEdit}
      formatCurrency={formatCurrency}
    />

    {/* Approve Loan Dialog */}
    <ApproveLoanDialog
      open={showApproveDialog}
      onOpenChange={setShowApproveDialog}
      loan={selectedLoan}
      loanDetailData={loanDetailData}
      onConfirm={handleConfirmApprove}
      formatCurrency={formatCurrency}
    />

    {/* Reject Loan Dialog */}
    <RejectLoanDialog
      open={showRejectDialog}
      onOpenChange={setShowRejectDialog}
      loan={selectedLoan}
      onConfirm={handleConfirmReject}
      formatCurrency={formatCurrency}
    />
  </Dialog>
  );
}
