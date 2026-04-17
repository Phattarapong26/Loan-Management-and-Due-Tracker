import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Receipt,
  Calendar,
  X,
  TrendingUp,
  DollarSign,
  Percent,
  FileText,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi, receiptsApi } from '@/shared/lib/api-endpoints';
import { ActiveLoan } from '../types/payment.types';
import { formatCurrency, formatDate } from '../utils/payment.utils';
import { PaymentHistoryTable } from './PaymentHistoryTable';

interface PaymentHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: ActiveLoan | null;
  onViewPaymentSchedule: () => void;
}

export function PaymentHistoryDialog({
  open,
  onOpenChange,
  loan,
  onViewPaymentSchedule,
}: PaymentHistoryDialogProps) {
  // Fetch payment history for selected loan
  const { data: paymentHistoryData, isLoading: isLoadingPaymentHistory } = useQuery({
    queryKey: ['payment-history', loan?.id],
    queryFn: async () => {
      if (!loan?.id) return null;
      const result = await paymentsApi.getLoanHistory(loan.id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!loan?.id && open,
  });

  const { data: loanReceiptsData, isLoading: isLoadingReceipts } = useQuery({
    queryKey: ['loan-receipts', loan?.id],
    queryFn: async () => {
      if (!loan?.id) return null;
      const result = await receiptsApi.getLoanReceipts(loan.id);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: !!loan?.id && open,
  });

  if (!loan) return null;

  const paidAmount = loan.amount - loan.outstandingBalance;
  const paymentProgress = (paidAmount / loan.amount) * 100;

  const receiptsByPaymentId = (loanReceiptsData || []).reduce<Record<string, { receiptId: string; receiptNumber: string; pdfUrl?: string }>>(
    (acc, receipt) => {
      if (receipt?.paymentId) {
        acc[receipt.paymentId] = {
          receiptId: receipt.receiptId,
          receiptNumber: receipt.receiptNumber,
          pdfUrl: receipt.pdfUrl,
        };
      }
      return acc;
    },
    {}
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 gap-0 flex flex-col" hideClose>
        <DialogTitle className="sr-only">
          ประวัติการชำระเงิน - {loan.contractNumber || loan.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          ประวัติการชำระเงินของสัญญา {loan.contractNumber || loan.id} ของ {loan.customerName}
        </DialogDescription>

        {/* HEADER */}
        <header className="bg-gradient-to-br from-white via-green-50/30 to-white px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-[#138F3E] to-[#0F7A34] rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
              <Receipt size={28} strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-800">
                ประวัติการชำระเงิน
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
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-8 min-h-0">
          <div className="space-y-6">
            {/* Loan Summary Card */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-slate-800">สรุปข้อมูลสัญญา</h3>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                    <Percent className="h-4 w-4 text-[#138F3E]" />
                    <span className="text-sm font-bold text-[#138F3E]">
                      {paymentProgress.toFixed(1)}% ชำระแล้ว
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-6">
                  {/* Total Loan Amount */}
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-100">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-slate-500" />
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        วงเงินกู้
                      </p>
                    </div>
                    <p className="text-2xl font-black text-slate-800">
                      {formatCurrency(loan.amount)}
                    </p>
                  </div>

                  {/* Outstanding Balance */}
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                        ยอดคงเหลือ
                      </p>
                    </div>
                    <p className="text-2xl font-black text-blue-700">
                      {formatCurrency(loan.outstandingBalance)}
                    </p>
                  </div>

                  {/* Paid Amount */}
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Receipt className="h-4 w-4 text-emerald-600" />
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                        ชำระแล้ว
                      </p>
                    </div>
                    <p className="text-2xl font-black text-emerald-700">
                      {formatCurrency(paidAmount)}
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-white border border-green-100">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Percent className="h-4 w-4 text-[#138F3E]" />
                      <p className="text-xs font-bold text-[#138F3E] uppercase tracking-wider">
                        ความคืบหน้า
                      </p>
                    </div>
                    <p className="text-2xl font-black text-[#138F3E]">
                      {paymentProgress.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                    <span>ความคืบหน้าการชำระ</span>
                    <span>{paymentProgress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-4 flex rounded-lg overflow-hidden shadow-inner bg-slate-100">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-[#138F3E] h-full flex items-center justify-center text-[10px] text-white font-bold transition-all duration-500"
                      style={{ width: `${paymentProgress}%` }}
                    >
                      {paymentProgress > 15 && `${paymentProgress.toFixed(0)}%`}
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>ชำระแล้ว {formatCurrency(paidAmount)}</span>
                    <span>คงเหลือ {formatCurrency(loan.outstandingBalance)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment History Table */}
            <PaymentHistoryTable
              payments={paymentHistoryData?.payments || []}
              isLoading={isLoadingPaymentHistory || isLoadingReceipts}
              receiptsByPaymentId={receiptsByPaymentId}
            />
          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-white px-8 py-4 border-t border-slate-100 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            <span className="font-semibold">สัญญาเลขที่:</span>{' '}
            <span className="font-mono">{loan.contractNumber || loan.id.substring(0, 12)}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="font-bold">
              ปิด
            </Button>
            <Button
              onClick={onViewPaymentSchedule}
              className="bg-gradient-to-r from-[#138F3E] to-[#0F7A34] text-white font-bold shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30"
            >
              <Calendar className="h-4 w-4 mr-2" />
              ดูตารางชำระ
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
