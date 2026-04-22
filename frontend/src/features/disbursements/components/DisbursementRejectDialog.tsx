import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Loader2, XCircle, DollarSign, User, X, Info, AlertTriangle } from 'lucide-react';

import { Disbursement } from '@/shared/lib/api-endpoints';

interface DisbursementRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDisbursement: Disbursement | null;
  rejectReason: string;
  onRejectReasonChange: (reason: string) => void;
  onConfirm: () => void;
  isLoading: boolean;
  formatCurrency: (amount: number) => string;
}

export function DisbursementRejectDialog({
  open,
  onOpenChange,
  selectedDisbursement,
  rejectReason,
  onRejectReasonChange,
  onConfirm,
  isLoading,
  formatCurrency,
}: DisbursementRejectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-br from-red-50 to-rose-50">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-200">
              <XCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-red-700 tracking-tight">
                ปฏิเสธคำขอเบิกจ่าย
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                กรุณาระบุเหตุผลที่ชัดเจน
              </p>
            </div>
          </div>
        </div>

        {selectedDisbursement && (
          <div className="p-8 space-y-6 bg-[#FAFBFC]">
            {/* Info Card */}
            <div className="bg-white rounded-2xl p-6 border-2 border-red-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  ลูกค้า
                </span>
                <span className="font-bold text-slate-900">{selectedDisbursement.loan?.customer.businessName}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" />
                  จำนวนเงิน
                </span>
                <span className="font-bold text-2xl text-red-600">
                  {formatCurrency(selectedDisbursement.amount)}
                </span>
              </div>
            </div>

            {/* Reason Input */}
            <div className="space-y-3">
              <label htmlFor="reject-reason" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                เหตุผลในการปฏิเสธ <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => onRejectReasonChange(e.target.value)}
                placeholder="กรุณาระบุเหตุผลในการปฏิเสธ เช่น&#10;• เอกสารไม่ครบถ้วน&#10;• ข้อมูลไม่ถูกต้อง&#10;• ไม่เป็นไปตามเงื่อนไขสัญญา"
                rows={5}
                className=""
              />
              <p className="text-xs text-slate-400 font-medium">
                ควรระบุเหตุผลอย่างละเอียดเพื่อให้ลูกค้าเข้าใจและสามารถแก้ไขได้
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <Info className="h-4 w-4" />
            <span className="text-xs font-medium">การปฏิเสธไม่สามารถยกเลิกได้</span>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1 sm:flex-none border-slate-200 hover:bg-slate-50"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading || !rejectReason.trim()}
              className="flex-1 sm:flex-none px-8 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังปฏิเสธ...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  ยืนยันปฏิเสธ
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
