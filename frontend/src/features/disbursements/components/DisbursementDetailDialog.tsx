import { Dialog, DialogContent } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import {
  FileText,
  X,
  Clock,
  CheckCircle,
  Wallet,
  XCircle,
  AlertCircle,
  LucideIcon,
} from "lucide-react";

import { Disbursement } from '@/shared/lib/api-endpoints';

type DisbursementStatus = Disbursement['status'];

interface DisbursementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDisbursement: Disbursement | null;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

const statusConfig: Record<
  DisbursementStatus,
  { label: string; icon: LucideIcon; color: string }
> = {
  PENDING: {
    label: "รออนุมัติ",
    icon: Clock,
    color: "bg-warning/10 text-warning",
  },
  APPROVED: {
    label: "อนุมัติแล้ว",
    icon: CheckCircle,
    color: "bg-info/10 text-info",
  },
  DISBURSED: {
    label: "เบิกจ่ายแล้ว",
    icon: Wallet,
    color: "bg-success/10 text-success",
  },
  REJECTED: {
    label: "ไม่อนุมัติ",
    icon: XCircle,
    color: "bg-destructive/10 text-destructive",
  },
  CANCELLED: {
    label: "ยกเลิก",
    icon: AlertCircle,
    color: "bg-muted text-muted-foreground",
  },
};

export function DisbursementDetailDialog({
  open,
  onOpenChange,
  selectedDisbursement,
  formatCurrency,
  formatDate,
}: DisbursementDetailDialogProps): JSX.Element | null {
  if (!selectedDisbursement) return null;

  const StatusIcon = statusConfig[selectedDisbursement.status].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                  รายละเอียดการเบิกจ่าย #{selectedDisbursement.disbursementNo || '-'}
                </h2>
                <Badge
                  className={statusConfig[selectedDisbursement.status].color}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[selectedDisbursement.status].label}
                </Badge>
              </div>
              <p className="text-sm text-slate-400 font-medium">
                {selectedDisbursement.loan?.customer.businessName || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto grow bg-[#FAFBFC]">
          <div className="p-8 space-y-6">
            {/* Main Info Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    ลูกค้า
                  </p>
                  <p className="font-bold text-slate-900">
                    {selectedDisbursement.loan?.customer.businessName || '-'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selectedDisbursement.loan?.customer.customerCode || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    จำนวนเงิน
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(selectedDisbursement.amount)}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  วัตถุประสงค์
                </p>
                <p className="text-slate-900">{selectedDisbursement.purpose}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    วันที่ขอเบิก
                  </p>
                  <p className="text-slate-900">
                    {formatDate(selectedDisbursement.requestedDate)}
                  </p>
                </div>
                {selectedDisbursement.nextDisbursementDate && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      รอบถัดไป
                    </p>
                    <p className="text-slate-900">
                      {formatDate(selectedDisbursement.nextDisbursementDate)}
                    </p>
                  </div>
                )}
              </div>

              {selectedDisbursement.disbursementMethod && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      วิธีการเบิกจ่าย
                    </p>
                    <p className="text-slate-900">
                      {selectedDisbursement.disbursementMethod}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      เลขที่อ้างอิง
                    </p>
                    <p className="text-slate-900 font-mono text-sm">
                      {selectedDisbursement.referenceNo}
                    </p>
                  </div>
                </div>
              )}

              {selectedDisbursement.notes && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    หมายเหตุ
                  </p>
                  <p className="text-slate-900">{selectedDisbursement.notes}</p>
                </div>
              )}

              {selectedDisbursement.rejectedReason && (
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    เหตุผลที่ปฏิเสธ
                  </p>
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-red-700">
                      {selectedDisbursement.rejectedReason}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Loan Progress */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                ความคืบหน้าการเบิกจ่ายสินเชื่อ
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">ความคืบหน้า</span>
                  <span className="text-sm font-bold text-slate-900">
                    {selectedDisbursement.loan ? (
                      ((selectedDisbursement.loan.totalDisbursed /
                        selectedDisbursement.loan.principal) *
                      100).toFixed(1)
                    ) : '0.0'}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    selectedDisbursement.loan ? (
                      (selectedDisbursement.loan.totalDisbursed /
                        selectedDisbursement.loan.principal) *
                      100
                    ) : 0
                  }
                  className="h-2"
                />
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      วงเงินรวม
                    </p>
                    <p className="font-bold text-slate-900">
                      {selectedDisbursement.loan ? formatCurrency(selectedDisbursement.loan.principal) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      เบิกแล้ว
                    </p>
                    <p className="font-bold text-blue-600">
                      {selectedDisbursement.loan ? formatCurrency(selectedDisbursement.loan.totalDisbursed) : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      คงเหลือ
                    </p>
                    <p className="font-bold text-emerald-600">
                      {selectedDisbursement.loan ? formatCurrency(selectedDisbursement.loan.remainingAmount) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 shrink-0 flex justify-end">
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto px-8"
          >
            ปิด
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
