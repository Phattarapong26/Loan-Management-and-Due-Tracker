import React, { useState, useEffect } from 'react';
import * as VisuallyHiddenPrimitive from '@radix-ui/react-visually-hidden';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Loader2, CheckCircle, DollarSign, User, Info, Calendar, AlertTriangle } from 'lucide-react';

import { Disbursement } from '@/shared/lib/api-endpoints';

const VisuallyHidden = VisuallyHiddenPrimitive.Root;

interface DisbursementApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDisbursement: Disbursement | null;
  notes: string;
  onNotesChange: (notes: string) => void;
  onConfirm: (firstPaymentDate: string, paymentDay: number) => void;
  isLoading: boolean;
  formatCurrency: (amount: number) => string;
}

export function DisbursementApproveDialog({
  open,
  onOpenChange,
  selectedDisbursement,
  notes,
  onNotesChange,
  onConfirm,
  isLoading,
  formatCurrency,
}: DisbursementApproveDialogProps) {
  const [firstPaymentDate, setFirstPaymentDate] = useState('');
  const [paymentDay, setPaymentDay] = useState('1');
  const [validationError, setValidationError] = useState('');

  // Initialize form when dialog opens or disbursement changes
  useEffect(() => {
    if (open && selectedDisbursement) {
      // Try to get existing payment schedule from loan
      const loan = selectedDisbursement.loan;
      if (loan?.paymentSchedule && loan.paymentSchedule.length > 0) {
        const firstSchedule = loan.paymentSchedule[0];
        setFirstPaymentDate(new Date(firstSchedule.dueDate).toISOString().split('T')[0]);
        
        const day = new Date(firstSchedule.dueDate).getDate();
        let closestDay = '1';
        if (day >= 1 && day <= 3) closestDay = '1';
        else if (day >= 4 && day <= 7) closestDay = '5';
        else if (day >= 8 && day <= 12) closestDay = '10';
        else if (day >= 13 && day <= 17) closestDay = '15';
        else if (day >= 18 && day <= 22) closestDay = '20';
        else if (day >= 23 && day <= 27) closestDay = '25';
        else closestDay = '30';
        setPaymentDay(closestDay);
      } else if (loan?.firstPaymentDate) {
        setFirstPaymentDate(new Date(loan.firstPaymentDate).toISOString().split('T')[0]);
        setPaymentDay(loan.paymentDay?.toString() || '1');
      } else {
        // No payment schedule - need to be filled
        setFirstPaymentDate('');
        setPaymentDay('1');
      }
      setValidationError('');
    }
  }, [open, selectedDisbursement]);

  // Get minimum first payment date (7 days from disbursement date)
  const getMinFirstPaymentDate = () => {
    if (!selectedDisbursement?.requestedDate) {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    }
    
    const date = new Date(selectedDisbursement.requestedDate);
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };

  // Validate and confirm
  const handleConfirm = () => {
    // Validate required fields
    if (!firstPaymentDate) {
      setValidationError('กรุณาระบุวันชำระงวดแรก');
      return;
    }

    if (!paymentDay) {
      setValidationError('กรุณาระบุวันที่ชำระประจำเดือน');
      return;
    }

    // Validate dates
    const disbursementDate = new Date(selectedDisbursement?.requestedDate || '');
    const firstPayment = new Date(firstPaymentDate);
    disbursementDate.setHours(0, 0, 0, 0);
    firstPayment.setHours(0, 0, 0, 0);

    const minFirstPaymentDate = new Date(disbursementDate);
    minFirstPaymentDate.setDate(minFirstPaymentDate.getDate() + 7);
    
    if (firstPayment < minFirstPaymentDate) {
      setValidationError(
        `วันชำระงวดแรกต้องมากกว่าวันเบิกจ่ายอย่างน้อย 7 วัน (${minFirstPaymentDate.toLocaleDateString('th-TH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })})`
      );
      return;
    }

    setValidationError('');
    // Guard: prevent double-submit
    if (isLoading) return;
    onConfirm(firstPaymentDate, parseInt(paymentDay, 10));
  };

  // Check if payment schedule is missing
  const isMissingPaymentSchedule = selectedDisbursement && 
    (!selectedDisbursement.loan?.paymentSchedule || selectedDisbursement.loan.paymentSchedule.length === 0) &&
    !selectedDisbursement.loan?.firstPaymentDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>
            อนุมัติคำขอเบิกจ่าย
          </DialogTitle>
          <DialogDescription>
            ยืนยันการอนุมัติคำขอเบิกจ่ายเงินกู้
          </DialogDescription>
        </VisuallyHidden>
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-br from-emerald-50 to-green-50">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-700 tracking-tight">
                อนุมัติคำขอเบิกจ่าย
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                ยืนยันการอนุมัติคำขอเบิกจ่ายเงินกู้
              </p>
            </div>
          </div>
        </div>

        {selectedDisbursement && (
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#FAFBFC] min-h-0">
            {/* Info Card */}
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  ลูกค้า
                </span>
                <span className="font-bold text-slate-900">{selectedDisbursement.loan?.customer.businessName}</span>
              </div>
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" />
                  จำนวนเงิน
                </span>
                <span className="font-bold text-2xl text-emerald-600">
                  {formatCurrency(selectedDisbursement.amount)}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  วัตถุประสงค์
                </span>
                <span className="font-medium text-slate-900 text-right max-w-[60%]">
                  {selectedDisbursement.purpose}
                </span>
              </div>
            </div>

            {/* Success Message */}
            <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-2xl p-5 flex gap-4 items-start">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-900 mb-1">
                  พร้อมอนุมัติ
                </p>
                <p className="text-xs text-emerald-700">
                  หลังจากอนุมัติแล้ว สามารถดำเนินการเบิกจ่ายเงินให้ลูกค้าได้ทันที
                </p>
              </div>
            </div>

            {/* Warning for missing payment schedule */}
            {isMissingPaymentSchedule && (
              <div className="bg-amber-50/80 border-2 border-amber-200 rounded-2xl p-5 flex gap-4 items-start">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900 mb-1">
                    ⚠️ ต้องระบุรอบการชำระเงิน
                  </p>
                  <p className="text-xs text-amber-700">
                    กรุณากรอกข้อมูลรอบการชำระเงินด้านล่างก่อนอนุมัติ (วันชำระงวดแรกและวันที่ชำระประจำเดือน)
                  </p>
                </div>
              </div>
            )}

            {/* Payment Schedule Section */}
            <div className="space-y-4 bg-white rounded-2xl p-6 border-2 border-slate-200">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                <Calendar className="h-4 w-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                  รอบการชำระเงิน
                </h3>
              </div>

              <div className="space-y-4">
                {/* First Payment Date */}
                <div className="space-y-2">
                  <Label htmlFor="firstPaymentDate" className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    วันชำระงวดแรก <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstPaymentDate"
                    type="date"
                    value={firstPaymentDate}
                    onChange={(e) => setFirstPaymentDate(e.target.value)}
                    min={getMinFirstPaymentDate()}
                    className="border-2 border-slate-200 rounded-xl"
                    required
                  />
                  <p className="text-xs text-slate-500">
                    ต้องมากกว่าวันเบิกจ่ายอย่างน้อย 7 วัน
                  </p>
                </div>

                {/* Payment Day */}
                <div className="space-y-2">
                  <Label htmlFor="paymentDay" className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    วันที่ชำระประจำเดือน <span className="text-red-500">*</span>
                  </Label>
                  <Select value={paymentDay} onValueChange={setPaymentDay}>
                    <SelectTrigger id="paymentDay" className="border-2 border-slate-200 rounded-xl">
                      <SelectValue placeholder="เลือกวันที่ชำระ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">วันที่ 1</SelectItem>
                      <SelectItem value="5">วันที่ 5</SelectItem>
                      <SelectItem value="10">วันที่ 10</SelectItem>
                      <SelectItem value="15">วันที่ 15</SelectItem>
                      <SelectItem value="20">วันที่ 20</SelectItem>
                      <SelectItem value="25">วันที่ 25</SelectItem>
                      <SelectItem value="30">วันสุดท้ายของเดือน</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    วันที่ลูกค้าจะชำระเงินทุกเดือน
                  </p>
                </div>
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 flex gap-2 items-start">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-medium">{validationError}</p>
                </div>
              )}
            </div>

            {/* Notes Input */}
            <div className="space-y-3">
              <label htmlFor="approveNotes" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                หมายเหตุ (ถ้ามี)
              </label>
              <Textarea
                id="approveNotes"
                placeholder="หมายเหตุการอนุมัติ..."
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
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
            <span className="text-xs font-medium">การอนุมัติไม่สามารถยกเลิกได้</span>
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
              onClick={handleConfirm}
              disabled={isLoading || !firstPaymentDate || !paymentDay}
              className="flex-1 sm:flex-none px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  กำลังอนุมัติ...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  ยืนยันอนุมัติ
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
