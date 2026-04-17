import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { 
  FileText, 
  Calendar, 
  TrendingUp, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle,
  CreditCard,
  ArrowUpRight,
  Info,
  Printer,
  X,
  Percent,
  Activity,
  History,
  Eye,
  Edit,
  FileCheck
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { ActiveLoan, statusConfig } from '../types/payment.types';
import { formatCurrency, formatDate } from '../utils/payment.utils';

// Audit Log interface
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface LoanViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: ActiveLoan | null;
  onRecordPayment: () => void;
  onViewPaymentSchedule: () => void;
}

export function LoanViewDialog({
  open,
  onOpenChange,
  loan,
  onRecordPayment,
  onViewPaymentSchedule,
}: LoanViewDialogProps) {
  const loanId = loan?.id;

  // Fetch audit logs for this loan
  const { data: auditLogs, isLoading: isLoadingAuditLogs } = useQuery({
    queryKey: ['audit-logs', 'loan', loanId ?? 'no-loan'],
    queryFn: async () => {
      try {
        if (!loanId) return [];
        const response = await fetch(`/audit-logs/resource/LOAN/${loanId}`, {
          credentials: 'include',
        });
        if (!response.ok) return [];
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch audit logs:', error);
        return [];
      }
    },
    enabled: open && !!loanId,
  });

  if (!loan) return null;

  const paidAmount = loan.amount - loan.outstandingBalance;
  const paymentProgress = (paidAmount / loan.amount) * 100;
  const principalPercent = (loan.outstandingBalance / loan.amount) * 100;

  // Get action icon and color
  const getActionIcon = (action: string) => {
    if (action.includes('VIEW') || action.includes('READ')) return Eye;
    if (action.includes('UPDATE') || action.includes('EDIT')) return Edit;
    if (action.includes('CREATE') || action.includes('APPROVE')) return FileCheck;
    if (action.includes('PAYMENT')) return CreditCard;
    return Activity;
  };

  const getActionColor = (action: string) => {
    if (action.includes('VIEW') || action.includes('READ')) return 'text-blue-600 bg-blue-50';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-amber-600 bg-amber-50';
    if (action.includes('CREATE') || action.includes('APPROVE')) return 'text-green-600 bg-green-50';
    if (action.includes('PAYMENT')) return 'text-emerald-600 bg-emerald-50';
    return 'text-slate-600 bg-slate-50';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden" hideClose>
        <DialogTitle className="sr-only">
          {loan.contractNumber || loan.id} - รายละเอียดสัญญา
        </DialogTitle>
        <DialogDescription className="sr-only">
          รายละเอียดข้อมูลสัญญาและข้อมูลการชำระเงินของ {loan.customerName}
        </DialogDescription>
        
        {/* TOP HEADER - K-Bank Green Theme */}
        <header className="bg-gradient-to-br from-white via-green-50/30 to-white px-8 py-6 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-[#138F3E] to-[#0F7A34] rounded-xl flex items-center justify-center text-white shadow-xl shadow-green-500/20">
              <FileText size={32} strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-black tracking-tight text-slate-800">
                  {loan.contractNumber || loan.id}
                </h2>
                <Badge className={`${statusConfig[loan.status].color} flex items-center gap-1`}>
                  <CheckCircle2 size={12} /> {statusConfig[loan.status].label}
                </Badge>
                {loan.overdueDays > 0 && (
                  <Badge className="bg-rose-50 text-rose-600 border-rose-100 flex items-center gap-1 animate-pulse">
                    <AlertTriangle size={12} /> เกิน {loan.overdueDays} วัน
                  </Badge>
                )}
              </div>
              <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
                <User size={16} className="text-slate-400" /> {loan.customerName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => window.print()}
              className="p-3 text-slate-400 hover:text-[#138F3E] hover:bg-green-50 rounded-xl transition-all"
              aria-label="พิมพ์เอกสาร"
            >
              <Printer size={22} />
            </button>
            <div className="h-8 w-[1px] bg-slate-100 mx-2"></div>
            <button 
              onClick={() => onOpenChange(false)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="ปิด"
            >
              <X size={28} />
            </button>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
          <div className="grid grid-cols-12 gap-8">
            {/* LEFT COLUMN */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              {/* Financial Dashboard Cards - Enhanced with 4 cards */}
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: วงเงินอนุมัติ */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400 group-hover:text-[#138F3E] transition-colors">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                      วงเงินอนุมัติ
                    </p>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">
                    {formatCurrency(loan.amount)}
                  </h3>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-500">อัตราดอกเบี้ย</span>
                    <span className="text-[#138F3E] font-bold">{loan.interestRate}% ต่อปี</span>
                  </div>
                </div>

                {/* Card 2: ยอดคงเหลือ */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3">
                    <ArrowUpRight size={20} className="text-green-100 group-hover:text-green-200 transition-colors" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-slate-50 text-slate-400 group-hover:text-[#138F3E] transition-colors">
                      <Activity className="h-4 w-4" />
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                      ยอดคงเหลือ
                    </p>
                  </div>
                  <h3 className="text-2xl font-black text-[#138F3E]">
                    {formatCurrency(loan.outstandingBalance)}
                  </h3>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#138F3E] transition-all duration-500" 
                        style={{ width: `${principalPercent}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                      {principalPercent.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Card 3: ค่างวดถัดไป */}
                <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-white/80 text-emerald-600 group-hover:text-emerald-700 transition-colors">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                      ค่างวดถัดไป
                    </p>
                  </div>
                  <h3 className="text-2xl font-black text-emerald-600">
                    {loan.nextPaymentAmount ? formatCurrency(loan.nextPaymentAmount) : '-'}
                  </h3>
                  <p className="mt-3 text-xs font-bold text-slate-500 flex items-center gap-1">
                    <Clock size={14} className="text-blue-500" /> 
                    {loan.nextPaymentDate ? formatDate(loan.nextPaymentDate) : 'ไม่ระบุ'}
                  </p>
                </div>

                {/* Card 4: ชำระแล้ว */}
                <div className=" p-6 rounded-xl bg-white shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-white/80 text-emerald-600 group-hover:text-emerald-700 transition-colors">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider">
                      ชำระแล้ว
                    </p>
                  </div>
                  <h3 className="text-2xl font-black text-emerald-700">
                    {formatCurrency(paidAmount)}
                  </h3>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-emerald-600">ความคืบหน้า</span>
                    <span className="text-emerald-700 font-bold">{paymentProgress.toFixed(1)}%</span>
                  </div>
                </div>
              </section>

              {/* Advanced Analytics Section - Enhanced */}
              <section className="bg-white rounded-xl p-8 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <TrendingUp size={24} className="text-[#138F3E]" /> 
                    ข้อมูลวิเคราะห์หนี้ (Debt Analysis)
                  </h4>
                  <Badge className="bg-green-50 text-[#138F3E] border-green-100">
                    <Percent size={12} className="mr-1" />
                    {paymentProgress.toFixed(1)}% Complete
                  </Badge>
                </div>

                <div className="space-y-8">
                  {/* Payment Progress */}
                  <div>
                    <div className="flex justify-between text-sm font-bold mb-3">
                      <span className="text-slate-500 uppercase">ความคืบหน้าการชำระ</span>
                      <span className="text-slate-800 font-black">
                        {paymentProgress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-8 flex rounded-xl overflow-hidden shadow-inner">
                      <div 
                        className="bg-emerald-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500"
                        style={{ width: `${paymentProgress}%` }}
                      >
                        {paymentProgress > 10 && 'ชำระแล้ว'}
                      </div>
                      <div 
                        className="bg-slate-200 h-full flex items-center justify-center text-[10px] text-slate-500 font-bold"
                        style={{ width: `${100 - paymentProgress}%` }}
                      >
                        {100 - paymentProgress > 10 && 'คงเหลือ'}
                      </div>
                    </div>
                    <div className="flex gap-4 mt-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div> 
                        ชำระแล้ว {formatCurrency(paidAmount)}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <div className="w-3 h-3 rounded-full bg-slate-200"></div> 
                        คงเหลือ {formatCurrency(loan.outstandingBalance)}
                      </div>
                    </div>
                  </div>

                  {/* Loan Details Grid */}
                  <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-50">
                    <div>
                      <h5 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">
                        ข้อมูลสัญญา
                      </h5>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">ระยะเวลา</span>
                          <span className="text-sm font-black text-slate-900">
                            {loan.duration} เดือน
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">วันที่เบิกจ่าย</span>
                          <span className="text-sm font-black text-slate-900">
                            {loan.disbursementDate ? formatDate(loan.disbursementDate) : '-'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">วันครบกำหนด</span>
                          <span className="text-sm font-black text-slate-900">
                            {loan.nextPaymentDate ? formatDate(loan.nextPaymentDate) : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">
                        สถานะการชำระ
                      </h5>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">ชำระแล้ว</span>
                          <span className="text-sm font-black text-emerald-600">
                            {formatCurrency(paidAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">คงเหลือ</span>
                          <span className="text-sm font-black text-blue-600">
                            {formatCurrency(loan.outstandingBalance)}
                          </span>
                        </div>
                        {loan.overdueDays > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-600">เกินกำหนด</span>
                            <span className="text-sm font-black text-rose-600">
                              {loan.overdueDays} วัน
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Info Banner - K-Bank Green Theme */}
              {loan.nextPaymentDate && (
                <section className="bg-gradient-to-r from-[#138F3E] to-[#0F7A34] rounded-xl p-8 text-white flex items-center justify-between shadow-xl shadow-green-500/20">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Info size={32} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold">ข้อมูลการชำระงวดถัดไป</h4>
                      <p className="text-green-100 text-sm opacity-90">
                        กำหนดชำระ: {formatDate(loan.nextPaymentDate)} | 
                        จำนวน: {loan.nextPaymentAmount ? formatCurrency(loan.nextPaymentAmount) : '-'}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              {/* Action Center - Enhanced with K-Bank theme */}
              <section className="space-y-3">
                <button 
                  onClick={onRecordPayment}
                  className="w-full bg-gradient-to-r from-[#138F3E] to-[#0F7A34] text-white py-5 rounded-xl font-black flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 transition-all hover:scale-[1.02]"
                >
                  <CreditCard size={20} /> บันทึกการชำระเงิน
                </button>
                <div className="grid ">
                  <button 
                    onClick={onViewPaymentSchedule}
                    className="bg-white border border-slate-200 text-slate-700 py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-50 hover:border-green-200 hover:text-[#138F3E] transition-all"
                  >
                    <Calendar size={18} /> ตารางงวด
                  </button>
                </div>
              </section>

              {/* Alert System */}
              {loan.overdueDays > 0 && (
                <section className="bg-rose-50 border border-rose-100 p-6 rounded-xl">
                  <div className="flex items-center gap-2 text-rose-700 font-black text-sm uppercase tracking-widest mb-4">
                    <AlertTriangle size={18} /> แจ้งเตือน
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-1 h-auto bg-rose-300 rounded-full"></div>
                      <p className="text-sm text-rose-800 leading-relaxed">
                        สัญญานี้มียอดค้างชำระเกินกำหนด {loan.overdueDays} วัน 
                        กรุณาติดตามการชำระเงินโดยเร็ว
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Quick Stats */}
              <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h4 className="font-black text-slate-800 mb-6">สรุปข้อมูลด่วน</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <span className="text-sm text-slate-600">เลขที่สัญญา</span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {loan.contractNumber || loan.id.substring(0, 12)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <span className="text-sm text-slate-600">ลูกค้า</span>
                    <span className="text-sm font-black text-slate-900">
                      {loan.customerName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <span className="text-sm text-slate-600">สถานะ</span>
                    <Badge className={statusConfig[loan.status].color}>
                      {statusConfig[loan.status].label}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">อัตราดอกเบี้ย</span>
                    <span className="text-sm font-black text-[#138F3E]">
                      {loan.interestRate}% ต่อปี
                    </span>
                  </div>
                </div>
              </section>

              {/* Audit Log Section */}
              <section className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-black text-slate-800 flex items-center gap-2">
                    <History size={20} className="text-[#138F3E]" />
                    ประวัติการเปลี่ยนแปลง
                  </h4>
                  {auditLogs && auditLogs.length > 0 && (
                    <Badge className="bg-slate-100 text-slate-600">
                      {auditLogs.length} รายการ
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {isLoadingAuditLogs ? (
                    <div className="flex items-center justify-center py-8 text-slate-400">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#138F3E]"></div>
                      <span className="ml-2 text-sm">กำลังโหลด...</span>
                    </div>
                  ) : !auditLogs || auditLogs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <History size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">ยังไม่มีประวัติการเปลี่ยนแปลง</p>
                    </div>
                  ) : (
                    auditLogs.slice(0, 10).map((log: AuditLog) => {
                      const ActionIcon = getActionIcon(log.action);
                      const actionColor = getActionColor(log.action);
                      
                      return (
                        <div 
                          key={log.id} 
                          className="flex gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-slate-50"
                        >
                          <div className={`p-2 rounded-lg ${actionColor} shrink-0`}>
                            <ActionIcon size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-bold text-slate-800 truncate">
                                {log.action.replace(/_/g, ' ')}
                              </p>
                              <span className="text-xs text-slate-400 whitespace-nowrap">
                                {formatDate(log.createdAt)}
                              </span>
                            </div>
                            {log.user && (
                              <p className="text-xs text-slate-500 mt-1">
                                โดย {log.user.firstName} {log.user.lastName}
                              </p>
                            )}
                            {log.details && (
                              <p className="text-xs text-slate-400 mt-1 truncate">
                                {typeof log.details === 'string' 
                                  ? log.details 
                                  : JSON.stringify(log.details).substring(0, 50)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {auditLogs && auditLogs.length > 10 && (
                  <div className="mt-4 text-center">
                    <button className="text-xs text-[#138F3E] hover:text-[#0F7A34] font-bold">
                      ดูทั้งหมด ({auditLogs.length} รายการ)
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-white px-8 py-4 border-t border-slate-100 flex flex-wrap justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <div className="flex gap-8">
            <span className="flex items-center gap-1.5">
              <Clock size={12} /> อัพเดทล่าสุด: {new Date().toLocaleString('th-TH')}
            </span>
          </div>
          <div className="flex gap-6">
            <span>Contract ID: {loan.id.substring(0, 8)}</span>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
