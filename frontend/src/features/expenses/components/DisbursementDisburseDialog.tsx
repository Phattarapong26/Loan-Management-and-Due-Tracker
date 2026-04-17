import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Loader2, Wallet, DollarSign, User, X, Info, CheckCircle } from 'lucide-react';

import { Disbursement } from '@/shared/lib/api-endpoints';

interface DisbursementDisburseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDisbursement: Disbursement | null;
  disbursementMethod: 'TRANSFER' | 'CHECK' | 'CASH';
  onDisbursementMethodChange: (method: 'TRANSFER' | 'CHECK' | 'CASH') => void;
  referenceNo: string;
  onReferenceNoChange: (refNo: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onConfirm: () => void;
  isLoading: boolean;
  formatCurrency: (amount: number) => string;
}

export function DisbursementDisburseDialog({
  open,
  onOpenChange,
  selectedDisbursement,
  disbursementMethod,
  onDisbursementMethodChange,
  referenceNo,
  onReferenceNoChange,
  notes,
  onNotesChange,
  onConfirm,
  isLoading,
  formatCurrency,
}: DisbursementDisburseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-br from-emerald-50 to-green-50">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <Wallet className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-700 tracking-tight">
                เบิกจ่ายเงินกู้
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                ดำเนินการเบิกจ่ายเงินให้ลูกค้า
              </p>
            </div>
          </div>
        </div>

        {selectedDisbursement && (
          <div className="p-8 space-y-6 bg-[#FAFBFC]">
            {/* Info Card */}
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm space-y-4">
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
                <span className="font-bold text-2xl text-emerald-600">
                  {formatCurrency(selectedDisbursement.amount)}
                </span>
              </div>
            </div>

            {/* Method Selection */}
            <div className="space-y-3">
              <label htmlFor="method" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                วิธีการเบิกจ่าย <span className="text-red-500">*</span>
              </label>
              <Select value={disbursementMethod} onValueChange={onDisbursementMethodChange}>
                <SelectTrigger id="method" className="w-full border-2 border-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFER">โอนเงิน</SelectItem>
                  <SelectItem value="CHECK">เช็ค</SelectItem>
                  <SelectItem value="CASH">เงินสด</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reference Number */}
            <div className="space-y-3">
              <label htmlFor="refNo" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                เลขที่อ้างอิง
                <span className="text-xs text-slate-400 ml-2 normal-case">(ไม่บังคับ)</span>
              </label>
              <Input
                id="refNo"
                placeholder="ระบบจะสร้างให้อัตโนมัติ"
                value={referenceNo}
                onChange={(e) => onReferenceNoChange(e.target.value)}
                className="border-2 border-slate-200 rounded-xl"
              />
              <p className="text-xs text-slate-400 font-medium">
                💡 หากไม่กรอก ระบบจะสร้างเลขที่อ้างอิงให้อัตโนมัติ
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <label htmlFor="disburseNotes" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                หมายเหตุ
              </label>
              <Textarea
                id="disburseNotes"
                placeholder="หมายเหตุการเบิกจ่าย..."
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                rows={3}
                className="resize-none border-2 border-slate-200 rounded-xl"
              />
            </div>

            {/* Success Message */}
            <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-2xl p-5 flex gap-4 items-start">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-900 mb-1">
                  พร้อมเบิกจ่าย
                </p>
                <p className="text-xs text-emerald-700">
                  ระบบจะบันทึกการเบิกจ่ายและสร้างตารางการชำระเงินให้อัตโนมัติ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-2 text-slate-400">
            <Info className="h-4 w-4" />
            <span className="text-xs font-medium">การเบิกจ่ายไม่สามารถยกเลิกได้</span>
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
              disabled={isLoading}
              className="flex-1 sm:flex-none px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังเบิกจ่าย...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  เบิกจ่ายเงิน
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
