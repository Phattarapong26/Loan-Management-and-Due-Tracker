import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { 
  DollarSign, 
  User, 
  Loader, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  CreditCard,
  FileText,
  Banknote,
  Zap,
  X,
  AlertCircle
} from 'lucide-react';
import { ActiveLoan, PaymentFormData } from '../types/payment.types';
import { formatCurrency, formatDate } from '../utils/payment.utils';
import { useAuth } from '@/shared/contexts/AuthContext';

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: ActiveLoan | null;
  formData: PaymentFormData;
  onFormDataChange: (data: PaymentFormData) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  loan,
  formData,
  onFormDataChange,
  onSubmit,
  isSubmitting,
}: RecordPaymentDialogProps) {
  const { user } = useAuth();
  
  if (!loan) return null;

  const paymentAmount = parseFloat(formData.amount) || 0;
  const isOverpayment = paymentAmount > loan.outstandingBalance;
  const remainingBalance = Math.max(0, loan.outstandingBalance - paymentAmount);
  const isFullPayment = paymentAmount >= loan.outstandingBalance;

  const handleSubmit = () => {
    if (!formData.amount || paymentAmount <= 0 || isOverpayment) return;
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 flex flex-col" hideClose>
        <DialogTitle className="sr-only">
          บันทึกการชำระเงิน - {loan.contractNumber || loan.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          บันทึกการชำระเงินสำหรับสัญญา {loan.contractNumber || loan.id} ของ {loan.customerName}
        </DialogDescription>

        {/* HEADER */}
        <header className="bg-gradient-to-br from-white via-green-50/30 to-white px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-[#138F3E] to-[#0F7A34] rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
              <CreditCard size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800">
                บันทึกการชำระเงิน
              </h2>
              <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
                <FileText size={16} className="text-slate-400" /> 
                {loan.contractNumber || loan.id} • {loan.customerName}
              </p>
            </div>
          </div>
          <button 
            onClick={() => onOpenChange(false)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="ปิด"
          >
            <X size={28} />
          </button>
        </header>

        {/* BODY */}
        <main className="flex-1 overflow-y-auto bg-white p-8 min-h-0">
          <div className="grid grid-cols-12 gap-8">
            {/* LEFT COLUMN - Form */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              {/* Payment Amount Card */}
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-lg bg-green-50 text-[#138F3E]">
                      <Banknote size={20} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800">จำนวนเงินที่ชำระ</h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="payment-amount" className="text-sm font-bold text-slate-700 mb-2 block">
                        จำนวนเงิน (บาท) *
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <Input
                          id="payment-amount"
                          type="number"
                          value={formData.amount}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (parseFloat(value) < 0) return;
                            onFormDataChange({ ...formData, amount: value });
                          }}
                          placeholder="0.00"
                          className={`text-2xl font-bold h-16 pl-12 ${
                            isOverpayment 
                              ? 'border-rose-300 focus:border-rose-500 bg-rose-50' 
                              : 'border-slate-200 focus:border-[#138F3E]'
                          }`}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      {isOverpayment && (
                        <div className="flex items-center gap-2 mt-2 text-rose-600 text-sm">
                          <AlertCircle size={16} />
                          <span>จำนวนเงินเกินยอดคงเหลือ</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-3 gap-3">
                      {loan.nextPaymentAmount && (
                        <button
                          type="button"
                          onClick={() => onFormDataChange({
                            ...formData,
                            amount: loan.nextPaymentAmount!.toString()
                          })}
                          className="p-4 rounded-xl border-2 border-slate-200 hover:border-[#138F3E] hover:bg-green-50 transition-all group"
                        >
                          <Zap size={20} className="mx-auto mb-2 text-slate-400 group-hover:text-[#138F3E]" />
                          <p className="text-xs font-bold text-slate-500 group-hover:text-[#138F3E]">งวดปกติ</p>
                          <p className="text-sm font-black text-slate-800 mt-1">
                            {formatCurrency(loan.nextPaymentAmount)}
                          </p>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onFormDataChange({
                          ...formData,
                          amount: (loan.outstandingBalance / 2).toFixed(2)
                        })}
                        className="p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                      >
                        <div className="text-2xl mb-2">½</div>
                        <p className="text-xs font-bold text-slate-500 group-hover:text-blue-600">ครึ่งหนึ่ง</p>
                        <p className="text-sm font-black text-slate-800 mt-1">
                          {formatCurrency(loan.outstandingBalance / 2)}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => onFormDataChange({
                          ...formData,
                          amount: loan.outstandingBalance.toString()
                        })}
                        className="p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-500 hover:bg-emerald-100 transition-all group"
                      >
                        <CheckCircle2 size={20} className="mx-auto mb-2 text-emerald-600" />
                        <p className="text-xs font-bold text-emerald-700">ชำระหมด</p>
                        <p className="text-sm font-black text-emerald-800 mt-1">
                          {formatCurrency(loan.outstandingBalance)}
                        </p>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Details Card */}
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-black text-slate-800 mb-6">รายละเอียดการชำระ</h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="payment-date" className="text-sm font-bold text-slate-700">
                        วันที่ชำระ *
                      </Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="payment-date"
                          type="date"
                          value={formData.paymentDate}
                          onChange={(e) => onFormDataChange({ ...formData, paymentDate: e.target.value })}
                          className="pl-10 h-12 border-slate-200 focus:border-[#138F3E]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="payment-method" className="text-sm font-bold text-slate-700">
                        ช่องทางการชำระ *
                      </Label>
                      <Select
                        value={formData.method}
                        onValueChange={(value) => onFormDataChange({ ...formData, method: value })}
                      >
                        <SelectTrigger className="h-12 border-slate-200 focus:border-[#138F3E]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">
                            <div className="flex items-center gap-2">
                              <Banknote size={16} />
                              <span>เงินสด</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="transfer">
                            <div className="flex items-center gap-2">
                              <CreditCard size={16} />
                              <span>โอนเงิน</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="cheque">
                            <div className="flex items-center gap-2">
                              <FileText size={16} />
                              <span>เช็ค</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <Label htmlFor="payment-note" className="text-sm font-bold text-slate-700">
                      หมายเหตุ
                    </Label>
                    <Textarea
                      id="payment-note"
                      value={formData.note}
                      onChange={(e) => onFormDataChange({ ...formData, note: e.target.value })}
                      placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
                      rows={3}
                      className="border-slate-200 focus:border-[#138F3E] resize-none"
                    />
                  </div>

                  <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="text-sm font-bold text-slate-600">ผู้บันทึก</span>
                      </div>
                      <span className="text-sm font-black text-slate-800">
                        {user ? `${user.firstName} ${user.lastName}` : 'ไม่ระบุ'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN - Summary */}
            <div className="col-span-12 lg:col-span-5 space-y-6">
              {/* Contract Summary */}
              <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-black text-slate-800 mb-6">ข้อมูลสัญญา</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                      <span className="text-sm text-slate-600">ยอดคงเหลือ</span>
                      <span className="text-xl font-black text-[#138F3E]">
                        {formatCurrency(loan.outstandingBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                      <span className="text-sm text-slate-600">งวดปกติ</span>
                      <span className="text-lg font-bold text-slate-800">
                        {loan.nextPaymentAmount ? formatCurrency(loan.nextPaymentAmount) : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">กำหนดชำระ</span>
                      <div className="text-right">
                        <span className="text-lg font-bold text-slate-800 block">
                          {loan.nextPaymentDate ? formatDate(loan.nextPaymentDate) : '-'}
                        </span>
                        {loan.overdueDays > 0 && (
                          <span className="text-xs text-rose-600 font-bold">
                            เกิน {loan.overdueDays} วัน
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Summary */}
              {paymentAmount > 0 && (
                <Card className={`border-2 shadow-sm ${
                  isFullPayment 
                    ? 'border-emerald-200 bg-white' 
                    : 'bg-white'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                      <div className={`p-2 rounded-lg ${
                        isFullPayment ? 'bg-white text-emerald-700' : 'bg-white text-blue-700'
                      }`}>
                        <CheckCircle2 size={20} />
                      </div>
                      <h3 className="text-lg font-black text-slate-800">สรุปการชำระ</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">จำนวนที่ชำระ</span>
                        <span className="text-2xl font-black text-slate-900">
                          {formatCurrency(paymentAmount)}
                        </span>
                      </div>
                      <div className="h-px bg-slate-200"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">คงเหลือหลังชำระ</span>
                        <span className={`text-xl font-black ${
                          isFullPayment ? 'text-emerald-600' : 'text-blue-600'
                        }`}>
                          {formatCurrency(remainingBalance)}
                        </span>
                      </div>
                      
                      {isFullPayment && (
                        <div className="mt-4 p-4 bg-emerald-100 rounded-xl text-center">
                          <CheckCircle2 className="mx-auto mb-2 text-emerald-600" size={32} />
                          <p className="text-sm font-black text-emerald-800">
                            ชำระครบทั้งหมดแล้ว
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.amount || paymentAmount <= 0 || isOverpayment}
                  className="w-full h-14 bg-gradient-to-r from-[#138F3E] to-[#0F7A34] text-white font-black text-lg shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader className="h-5 w-5 mr-2 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : isOverpayment ? (
                    <>
                      <XCircle className="h-5 w-5 mr-2" />
                      ไม่สามารถชำระเกินยอดหนี้ได้
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      บันทึกการชำระเงิน
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="w-full h-12 border-slate-200 hover:bg-slate-50 font-bold"
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          </div>
        </main>
      </DialogContent>
    </Dialog>
  );
}
