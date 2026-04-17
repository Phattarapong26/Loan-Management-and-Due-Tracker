import { useState } from 'react';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
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
import { Loader2, Wallet, User, DollarSign, Info, FileText, Lock, Eye } from 'lucide-react';
import { Disbursement } from '@/shared/lib/api-endpoints';

interface TransactionExecuteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTransaction: Disbursement | null;
  onConfirm: (data: {
    disbursementMethod: 'TRANSFER' | 'CHECK' | 'CASH';
    referenceNo?: string;
    notes?: string;
  }) => void;
  isLoading: boolean;
  formatCurrency: (amount: number) => string;
}

export function TransactionExecuteDialog({
  open,
  onOpenChange,
  selectedTransaction,
  onConfirm,
  isLoading,
  formatCurrency,
}: TransactionExecuteDialogProps) {
  const [disbursementMethod, setDisbursementMethod] = useState<'TRANSFER' | 'CHECK' | 'CASH'>('TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  const handleNext = () => {
    onConfirm({
      disbursementMethod,
      referenceNo: referenceNo || undefined,
      notes: notes || undefined,
    });
  };

  const handleClose = () => {
    setDisbursementMethod('TRANSFER');
    setReferenceNo('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
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
                ดำเนินการเบิกจ่ายเงินและออกหนังสือแจ้งการเบิกจ่ายให้ลูกค้า
              </p>
            </div>
          </div>
        </div>

        {selectedTransaction && (
          <div className="p-8 space-y-6 bg-[#FAFBFC]">
            {/* Info Card */}
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  ลูกค้า
                </span>
                <span className="font-bold text-slate-900">{selectedTransaction.loan?.customer.businessName}</span>
              </div>
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" />
                  จำนวนเงิน
                </span>
                <span className="font-bold text-2xl text-emerald-600">
                  {formatCurrency(selectedTransaction.amount)}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  วัตถุประสงค์
                </span>
                <span className="font-medium text-slate-900 text-right max-w-[60%]">
                  {selectedTransaction.purpose}
                </span>
              </div>
            </div>

            {/* Disbursement Method */}
            <div className="space-y-3">
              <Label htmlFor="method" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                วิธีการเบิกจ่าย *
              </Label>
              <Select
                value={disbursementMethod}
                onValueChange={(value) => setDisbursementMethod(value as 'TRANSFER' | 'CHECK' | 'CASH')}
              >
                <SelectTrigger className="border-2 border-slate-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRANSFER">โอนเงิน (Transfer)</SelectItem>
                  <SelectItem value="CHECK">เช็ค (Check)</SelectItem>
                  <SelectItem value="CASH">เงินสด (Cash)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reference Number */}
            <div className="space-y-3">
              <Label htmlFor="referenceNo" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                เลขที่อ้างอิง {disbursementMethod === 'TRANSFER' ? '(เลขที่ธุรกรรม)' : disbursementMethod === 'CHECK' ? '(เลขที่เช็ค)' : '(ถ้ามี)'}
              </Label>
              <Input
                id="referenceNo"
                placeholder={
                  disbursementMethod === 'TRANSFER' 
                    ? 'เช่น TXN-20260213-001' 
                    : disbursementMethod === 'CHECK'
                    ? 'เช่น CHK-123456'
                    : 'เลขที่อ้างอิง (ถ้ามี)'
                }
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="border-2 border-slate-200 rounded-xl"
              />
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <Label htmlFor="notes" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                หมายเหตุ (ถ้ามี)
              </Label>
              <Textarea
                id="notes"
                placeholder="หมายเหตุเพิ่มเติม..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="resize-none border-2 border-slate-200 rounded-xl"
              />
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
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 sm:flex-none border-slate-200 hover:bg-slate-50"
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleNext}
              disabled={isLoading}
              className="flex-1 sm:flex-none px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังโหลด...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  ถัดไป: ตรวจสอบข้อมูล
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
