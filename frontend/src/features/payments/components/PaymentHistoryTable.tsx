import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Calendar,
  CreditCard,
  FileText,
  Banknote,
  Receipt,
  Loader2,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/payment.utils';
import { receiptsApi } from '@/shared/lib/api-endpoints';
import { Button } from '@/shared/components/ui/button';
import { toast } from 'sonner';

interface Payment {
  id: string;
  paymentDate: string;
  amount: number | string;
  paymentMethod: string;
  paymentType?: string;
  reference?: string;
  notes?: string;
  interestSaved?: number | string;
  penaltyAmount?: number | string;
}

interface PaymentHistoryTableProps {
  payments: Payment[];
  isLoading?: boolean;
  receiptsByPaymentId?: Record<string, { receiptId: string; receiptNumber: string; pdfUrl?: string }>;
}

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case 'CASH':
      return Banknote;
    case 'TRANSFER':
      return CreditCard;
    case 'CHEQUE':
      return FileText;
    default:
      return DollarSign;
  }
};

const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'CASH':
      return 'เงินสด';
    case 'TRANSFER':
      return 'โอนเงิน';
    case 'CHEQUE':
      return 'เช็ค';
    default:
      return method;
  }
};

const getPaymentTypeConfig = (type: string) => {
  switch (type) {
    case 'EARLY':
      return {
        label: 'ก่อนกำหนด',
        icon: CheckCircle2,
        className: 'bg-blue-50 text-blue-700 border-blue-200',
        iconColor: 'text-blue-600',
      };
    case 'ON_TIME':
      return {
        label: 'ตรงเวลา',
        icon: CheckCircle2,
        className: 'bg-green-50 text-green-700 border-green-200',
        iconColor: 'text-green-600',
      };
    case 'LATE':
      return {
        label: 'เกินกำหนด',
        icon: AlertCircle,
        className: 'bg-red-50 text-red-700 border-red-200',
        iconColor: 'text-red-600',
      };
    default:
      return {
        label: type,
        icon: Clock,
        className: 'bg-gray-50 text-gray-700 border-gray-200',
        iconColor: 'text-gray-600',
      };
  }
};

export function PaymentHistoryTable({ payments, isLoading, receiptsByPaymentId }: PaymentHistoryTableProps) {
  if (isLoading) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
          <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#138F3E]" />
            รายการการชำระเงิน
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-[#138F3E] mb-4" />
            <p className="text-slate-500 font-medium">กำลังโหลดประวัติการชำระ...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
          <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#138F3E]" />
            รายการการชำระเงิน
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <Receipt className="h-10 w-10 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium text-lg mb-2">ยังไม่มีประวัติการชำระเงิน</p>
            <p className="text-slate-400 text-sm">ประวัติการชำระจะแสดงที่นี่เมื่อมีการบันทึกการชำระเงิน</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary statistics
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalInterestSaved = payments.reduce(
    (sum, p) => sum + (Number(p.interestSaved) || 0),
    0
  );
  const totalPenalty = payments.reduce((sum, p) => sum + (Number(p.penaltyAmount) || 0), 0);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#138F3E]" />
            รายการการชำระเงิน
          </CardTitle>
          <Badge className="bg-[#138F3E]/10 text-[#138F3E] border-[#138F3E]/20 font-bold">
            {payments.length} รายการ
          </Badge>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
              ชำระทั้งหมด
            </p>
            <p className="text-lg font-black text-emerald-700">{formatCurrency(totalPaid)}</p>
          </div>
          {totalInterestSaved > 0 && (
            <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                ประหยัดดอกเบี้ย
              </p>
              <p className="text-lg font-black text-blue-700">
                {formatCurrency(totalInterestSaved)}
              </p>
            </div>
          )}
          {totalPenalty > 0 && (
            <div className="text-center p-3 rounded-lg bg-rose-50 border border-rose-100">
              <p className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">
                ค่าปรับ
              </p>
              <p className="text-lg font-black text-rose-700">{formatCurrency(totalPenalty)}</p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="font-bold text-slate-700">วันที่ชำระ</TableHead>
                <TableHead className="font-bold text-slate-700">จำนวนเงิน</TableHead>
                <TableHead className="font-bold text-slate-700">วิธีการชำระ</TableHead>
                <TableHead className="font-bold text-slate-700">ประเภท</TableHead>
                <TableHead className="font-bold text-slate-700">เลขที่อ้างอิง</TableHead>
                <TableHead className="font-bold text-slate-700">ใบเสร็จ</TableHead>
                <TableHead className="font-bold text-slate-700">หมายเหตุ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment, index) => {
                const PaymentMethodIcon = getPaymentMethodIcon(payment.paymentMethod);
                const paymentTypeConfig = getPaymentTypeConfig(payment.paymentType || 'UNKNOWN');
                const TypeIcon = paymentTypeConfig.icon;
                const receipt = receiptsByPaymentId?.[payment.id];

                return (
                  <TableRow
                    key={payment.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    {/* Date */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100">
                          <Calendar className="h-4 w-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {formatDate(payment.paymentDate)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(payment.paymentDate).toLocaleDateString('th-TH', {
                              weekday: 'short',
                            })}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-emerald-600" />
                          <span className="font-bold text-lg text-emerald-700">
                            {formatCurrency(Number(payment.amount))}
                          </span>
                        </div>
                        {payment.interestSaved && Number(payment.interestSaved) > 0 && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md w-fit">
                            <TrendingDown className="h-3 w-3" />
                            <span className="font-semibold">
                              ประหยัด {formatCurrency(Number(payment.interestSaved))}
                            </span>
                          </div>
                        )}
                        {payment.penaltyAmount && Number(payment.penaltyAmount) > 0 && (
                          <div className="flex items-center gap-1 text-xs text-rose-600 bg-rose-50 px-2 py-1 rounded-md w-fit">
                            <AlertCircle className="h-3 w-3" />
                            <span className="font-semibold">
                              ค่าปรับ {formatCurrency(Number(payment.penaltyAmount))}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Payment Method */}
                    <TableCell>
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg w-fit">
                        <PaymentMethodIcon className="h-4 w-4 text-slate-600" />
                        <span className="text-sm font-semibold text-slate-700">
                          {getPaymentMethodLabel(payment.paymentMethod)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Payment Type */}
                    <TableCell>
                      <Badge className={`${paymentTypeConfig.className} flex items-center gap-1 w-fit`}>
                        <TypeIcon className={`h-3 w-3 ${paymentTypeConfig.iconColor}`} />
                        <span className="font-semibold">{paymentTypeConfig.label}</span>
                      </Badge>
                    </TableCell>

                    {/* Reference */}
                    <TableCell>
                      {payment.reference ? (
                        <div className="px-3 py-1.5 bg-slate-100 rounded-md">
                          <span className="font-mono text-sm font-semibold text-slate-700">
                            {payment.reference}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </TableCell>

                    {/* Receipt */}
                    <TableCell>
                      {receipt ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-bold"
                          onClick={async () => {
                            try {
                              const maybeUrl = receipt.pdfUrl;
                              if (maybeUrl) {
                                window.open(maybeUrl, '_blank', 'noopener,noreferrer');
                                return;
                              }

                              const result = await receiptsApi.getReceiptPdfUrl(receipt.receiptId);
                              if (result.error || !result.data?.pdfUrl) {
                                throw new Error((result.error as any)?.message ?? 'ไม่พบลิงก์ใบเสร็จ');
                              }
                              window.open(result.data.pdfUrl, '_blank', 'noopener,noreferrer');
                            } catch (error: any) {
                              toast.error('เปิดใบเสร็จไม่สำเร็จ', {
                                description: error?.message || 'กรุณาลองใหม่อีกครั้ง',
                              });
                            }
                          }}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          ดูใบเสร็จ
                        </Button>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </TableCell>

                    {/* Notes */}
                    <TableCell>
                      {payment.notes ? (
                        <p className="text-sm text-slate-600 max-w-xs truncate" title={payment.notes}>
                          {payment.notes}
                        </p>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
