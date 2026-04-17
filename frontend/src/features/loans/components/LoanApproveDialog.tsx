import React from 'react';
import * as VisuallyHiddenPrimitive from '@radix-ui/react-visually-hidden';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Loader2, CheckCircle, DollarSign, User, TrendingUp, X, ShieldCheck, Info } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

import { Loan } from './LoanViewDialog';

const VisuallyHidden = VisuallyHiddenPrimitive.Root;

// Helper functions for loan calculations
const calculateMonthlyPayment = (principal: number, annualRate: number, termMonths: number): number => {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  
  const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths);
  const denominator = Math.pow(1 + monthlyRate, termMonths) - 1;
  return numerator / denominator;
};

const calculateTotalInterest = (principal: number, annualRate: number, termMonths: number): number => {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termMonths);
  return (monthlyPayment * termMonths) - principal;
};

interface LoanApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLoan: Loan | null;
  loanDetailData?: any; // Add loan detail data with related information
  onConfirm: () => void;
  isLoading: boolean;
  formatCurrency: (amount: number) => string;
  getDscrColor: (dscr: number) => string;
}

export function LoanApproveDialog({
  open,
  onOpenChange,
  selectedLoan,
  loanDetailData,
  onConfirm,
  isLoading,
  formatCurrency,
  getDscrColor,
}: LoanApproveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>
            ยืนยันการอนุมัติสินเชื่อ
          </DialogTitle>
          <DialogDescription>
            ตรวจสอบข้อมูลสินเชื่อและยืนยันการอนุมัติ
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
                ยืนยันการอนุมัติสินเชื่อ
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                กรุณาตรวจสอบข้อมูลก่อนอนุมัติ
              </p>
            </div>
          </div>
        </div>

        {selectedLoan && (
          <div className="p-8 space-y-6 bg-[#FAFBFC]">
            {/* Info Card */}
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">เลขที่สัญญา</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {selectedLoan.contractNumber || selectedLoan.id}
                </span>
              </div>
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  ลูกค้า
                </span>
                <span className="font-bold text-slate-900">{selectedLoan.customerName}</span>
              </div>
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" />
                  วงเงินกู้
                </span>
                <span className="font-bold text-2xl text-emerald-600">
                  {formatCurrency(selectedLoan.amount)}
                </span>
              </div>
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  อัตราดอกเบี้ย
                </span>
                <span className="font-bold text-lg text-slate-900">
                  {selectedLoan.interestRate.toFixed(2)}% ต่อปี
                </span>
              </div>
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  ระยะเวลา
                </span>
                <span className="font-bold text-lg text-slate-900">
                  {selectedLoan.duration} เดือน
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" />
                  DSCR Score
                </span>
                <div className="text-right">
                  <span className={cn("font-bold text-2xl", getDscrColor(selectedLoan.dscr))}>
                    {selectedLoan.dscr != null && !isNaN(Number(selectedLoan.dscr)) ? Number(selectedLoan.dscr).toFixed(2) : 'N/A'}
                  </span>
                  <p className={cn(
                    "text-[10px] font-bold uppercase mt-1 tracking-wide",
                    selectedLoan.dscr >= 1.25 ? 'text-emerald-600' : 'text-amber-600'
                  )}>
                    {selectedLoan.dscr >= 1.25 ? '✓ ผ่านเกณฑ์' : '⚠ ต่ำกว่าเกณฑ์'}
                  </p>
                </div>
              </div>
            </div>

            {/* Contract Terms & Conditions */}
            <div className="bg-white rounded-2xl p-6 border-2 border-blue-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                โครงสร้างและเงื่อนไขสัญญา
              </h3>
              
              <div className="space-y-4">
                {/* Missing Fields Section */}
                <div className="grid grid-cols-1 gap-3 pb-4 border-b border-slate-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">ผลิตภัณฑ์สินเชื่อ:</span>
                    <span className="font-medium text-slate-900">
                      {loanDetailData?.loanProduct?.productName || selectedLoan?.loanProduct?.productName || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">สาขาที่ดูแล:</span>
                    <span className="font-medium text-slate-900">
                      {loanDetailData?.branch?.name || selectedLoan?.branch?.name || "-"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">พนักงานผู้รับผิดชอบ:</span>
                    <span className="font-medium text-slate-900">
                      {loanDetailData?.officer ? `${loanDetailData.officer.firstName} ${loanDetailData.officer.lastName}` : 
                       selectedLoan?.officer ? `${selectedLoan.officer.firstName} ${selectedLoan.officer.lastName}` : "-"}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500">ค่างวดต่อเดือน (โดยประมาณ)</span>
                    <div className="font-bold text-lg text-slate-900">
                      {formatCurrency(calculateMonthlyPayment(selectedLoan.amount, selectedLoan.interestRate, selectedLoan.duration))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500">ดอกเบี้ยรวมทั้งสิ้น</span>
                    <div className="font-bold text-lg text-slate-900">
                      {formatCurrency(calculateTotalInterest(selectedLoan.amount, selectedLoan.interestRate, selectedLoan.duration))}
                    </div>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-slate-100">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">วิธีการชำระ:</span>
                      <span className="font-medium">รายเดือน (เงินต้น + ดอกเบี้ย)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">การคำนวณดอกเบี้ย:</span>
                      <span className="font-medium">ลดต้นลดดอก</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">ค่าธรรมเนียมการจัดการ:</span>
                      <span className="font-medium">1% ของวงเงิน (ครั้งเดียว)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">ค่าปรับชำระล่าช้า:</span>
                      <span className="font-medium">18% ต่อปี</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">การชำระก่อนกำหนด:</span>
                      <span className="font-medium text-green-600">อนุญาต (ไม่มีค่าปรับ)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning if DSCR is low */}
            {selectedLoan.dscr < 1.25 ? (
              <div className="bg-amber-50/80 border-2 border-amber-200 rounded-2xl p-5 flex gap-4 items-start">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <span className="text-xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-900 mb-1">
                    DSCR ต่ำกว่าเกณฑ์มาตรฐาน (1.25)
                  </p>
                  <p className="text-xs text-amber-700">
                    กรุณาพิจารณาอย่างรอบคอบก่อนอนุมัติสินเชื่อนี้
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50/80 border-2 border-emerald-200 rounded-2xl p-5 flex gap-4 items-start">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-900 mb-1">
                    ผ่านเกณฑ์การประเมิน
                  </p>
                  <p className="text-xs text-emerald-700">
                    สินเชื่อนี้มีคุณสมบัติเหมาะสมสำหรับการอนุมัติ
                  </p>
                </div>
              </div>
            )}
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
              onClick={onConfirm} 
              disabled={isLoading}
              className="flex-1 sm:flex-none px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
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
