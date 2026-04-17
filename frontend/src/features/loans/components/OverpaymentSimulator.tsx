import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Calculator,
  TrendingDown,
  TrendingUp,
  Calendar,
  DollarSign,
  Zap,
  X,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface OverpaymentSimulatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBalance: number;
  monthlyPayment: number;
  interestRate: number;
  remainingMonths: number;
}

interface SimulationResult {
  originalTotalInterest: number;
  originalMonthsRemaining: number;
  newTotalInterest: number;
  newMonthsRemaining: number;
  interestSaved: number;
  monthsSaved: number;
  newMonthlyPayment: number;
  roi: number;
  monthlySavings: number;
  originalTotalPayment: number;
  newTotalPayment: number; // includes extraPayment
  effectiveMonthlyPayment: number; // monthly payment used for simulation
  warning?: string;
}

export function OverpaymentSimulator({
  open,
  onOpenChange,
  currentBalance,
  monthlyPayment,
  interestRate,
  remainingMonths,
}: OverpaymentSimulatorProps) {
  const [extraPayment, setExtraPayment] = useState('');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [validationError, setValidationError] = useState<string>('');
  const [effectiveMonthlyPayment, setEffectiveMonthlyPayment] = useState<number>(monthlyPayment);
  const [paymentWarning, setPaymentWarning] = useState<string>('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateImpliedMonthlyPayment = (principal: number, monthlyRate: number, months: number) => {
    if (principal <= 0 || months <= 0) return 0;
    if (monthlyRate <= 0) return principal / months;
    const r = monthlyRate;
    const n = months;
    const denominator = 1 - Math.pow(1 + r, -n);
    if (denominator <= 0) return 0;
    return (principal * r) / denominator;
  };

  const resolveEffectiveMonthlyPayment = () => {
    const monthlyRate = interestRate / 100 / 12;

    // If no remainingMonths, fall back to given monthlyPayment
    if (!remainingMonths || remainingMonths <= 0) {
      setPaymentWarning('');
      setEffectiveMonthlyPayment(monthlyPayment);
      return;
    }

    const implied = calculateImpliedMonthlyPayment(currentBalance, monthlyRate, remainingMonths);

    // If provided monthlyPayment looks like "ยอดงวดถัดไป" (อาจรวมค้าง/ค่าปรับ) ให้ใช้ implied แทน
    // heuristic: if monthlyPayment differs too much from implied, prefer implied for a sensible simulation
    const isImpliedValid = Number.isFinite(implied) && implied > 0;
    const isProvidedValid = Number.isFinite(monthlyPayment) && monthlyPayment > 0;

    if (!isImpliedValid) {
      setPaymentWarning('');
      setEffectiveMonthlyPayment(monthlyPayment);
      return;
    }

    if (!isProvidedValid) {
      setPaymentWarning('ไม่พบค่างวดที่ใช้ได้ จึงคำนวณค่างวดจากยอดคงเหลือ/งวดที่เหลือแทน');
      setEffectiveMonthlyPayment(implied);
      return;
    }

    const diffRatio = Math.abs(monthlyPayment - implied) / implied;
    if (diffRatio > 0.35) {
      setPaymentWarning('ยอดงวดถัดไปอาจรวมยอดค้าง/ค่าปรับ ระบบจึงใช้ “ค่างวดที่คำนวณจากสัญญา” เพื่อความสมเหตุสมผล');
      setEffectiveMonthlyPayment(implied);
      return;
    }

    setPaymentWarning('');
    setEffectiveMonthlyPayment(monthlyPayment);
  };

  const calculateOverpaymentImpact = () => {
    const extra = parseFloat(extraPayment) || 0;
    
    // Clear previous validation errors
    setValidationError('');
    
    // Input validation
    if (extra <= 0) {
      setResult(null);
      return;
    }

    const monthlyRate = interestRate / 100 / 12;
    
    // Validate inputs
    if (effectiveMonthlyPayment <= 0 || currentBalance <= 0 || remainingMonths <= 0) {
      setValidationError('ข้อมูลสินเชื่อไม่ถูกต้อง กรุณาตรวจสอบข้อมูล');
      setResult(null);
      return;
    }

    // Check if monthly payment is sufficient
    const minimumPayment = currentBalance * monthlyRate;
    if (monthlyRate > 0 && effectiveMonthlyPayment <= minimumPayment) {
      setValidationError('ค่างวดรายเดือนต่ำเกินไป ไม่สามารถชำระหนี้ได้');
      setResult(null);
      return;
    }

    console.log('🧮 Overpayment Calculation:', {
      currentBalance,
      monthlyPayment: effectiveMonthlyPayment,
      interestRate,
      monthlyRate,
      extraPayment: extra,
      remainingMonths
    });

    // Calculate original scenario (current payment schedule)
    const originalScenario = calculateAmortizationSchedule(
      currentBalance,
      effectiveMonthlyPayment,
      monthlyRate,
      remainingMonths
    );

    // payoff now (extra >= currentBalance) => interest becomes 0, months become 0
    if (extra >= currentBalance) {
      const interestSaved = Math.max(0, originalScenario.totalInterest);
      const monthsSaved = Math.max(0, originalScenario.monthsToPayoff);
      const roi = extra > 0 ? (interestSaved / extra) * 100 : 0;

      setResult({
        originalTotalInterest: originalScenario.totalInterest,
        originalMonthsRemaining: originalScenario.monthsToPayoff,
        newTotalInterest: 0,
        newMonthsRemaining: 0,
        interestSaved,
        monthsSaved,
        newMonthlyPayment: effectiveMonthlyPayment,
        roi,
        monthlySavings: monthsSaved > 0 ? interestSaved / monthsSaved : 0,
        originalTotalPayment: originalScenario.totalPayment,
        newTotalPayment: extra, // pay off in one shot
        effectiveMonthlyPayment,
        warning: paymentWarning || undefined,
      });
      return;
    }

    // Calculate new scenario with lump sum overpayment
    const newBalance = currentBalance - extra;
    const newScenario = calculateAmortizationSchedule(
      newBalance,
      effectiveMonthlyPayment,
      monthlyRate,
      remainingMonths
    );

    console.log('📊 Calculation Results:', {
      original: originalScenario,
      new: newScenario
    });

    // Calculate savings
    const interestSaved = Math.max(0, originalScenario.totalInterest - newScenario.totalInterest);
    const monthsSaved = Math.max(0, originalScenario.monthsToPayoff - newScenario.monthsToPayoff);
    const roi = extra > 0 ? (interestSaved / extra) * 100 : 0;
    const monthlySavings = monthsSaved > 0 ? interestSaved / monthsSaved : 0;

    setResult({
      originalTotalInterest: originalScenario.totalInterest,
      originalMonthsRemaining: originalScenario.monthsToPayoff,
      newTotalInterest: newScenario.totalInterest,
      newMonthsRemaining: newScenario.monthsToPayoff,
      interestSaved,
      monthsSaved,
      newMonthlyPayment: effectiveMonthlyPayment,
      roi,
      monthlySavings,
      originalTotalPayment: originalScenario.totalPayment,
      newTotalPayment: extra + newScenario.totalPayment,
      effectiveMonthlyPayment,
      warning: paymentWarning || undefined,
    });
  };

  // Helper function to calculate amortization schedule
  const calculateAmortizationSchedule = (
    principal: number,
    monthlyPayment: number,
    monthlyRate: number,
    maxMonths: number
  ) => {
    let balance = principal;
    let totalInterest = 0;
    let months = 0;
    let totalPayment = 0;
    const maxIterations = Math.min(Math.max(maxMonths, 1), 600); // Safety limit

    // If principal is 0 or negative, no payment needed
    if (principal <= 0) {
      return {
        totalInterest: 0,
        monthsToPayoff: 0,
        finalBalance: 0,
        totalPayment: 0,
      };
    }

    // If 0% interest => simple division
    if (monthlyRate <= 0) {
      const payoffMonths = Math.ceil(principal / monthlyPayment);
      const clampedMonths = Math.min(payoffMonths, maxIterations);
      const lastPayment = principal - monthlyPayment * (clampedMonths - 1);
      totalPayment = monthlyPayment * (clampedMonths - 1) + Math.max(0, lastPayment);
      return {
        totalInterest: 0,
        monthsToPayoff: clampedMonths,
        finalBalance: 0,
        totalPayment: Math.round(totalPayment * 100) / 100,
      };
    }

    // If monthly payment is less than or equal to monthly interest, loan never pays off
    const minimumPayment = principal * monthlyRate;
    if (monthlyPayment <= minimumPayment) {
      return {
        totalInterest: Math.round((principal * monthlyRate * maxMonths) * 100) / 100,
        monthsToPayoff: maxMonths,
        finalBalance: Math.round(balance * 100) / 100,
        totalPayment: Math.round((monthlyPayment * maxMonths) * 100) / 100,
      };
    }

    // Iterative calculation (accurate for integer payments + last smaller payment)
    while (balance > 0.01 && months < maxIterations) {
      const interestPayment = balance * monthlyRate;
      const paymentThisMonth = Math.min(monthlyPayment, balance + interestPayment);
      const principalPayment = Math.max(0, paymentThisMonth - interestPayment);

      totalInterest += interestPayment;
      totalPayment += paymentThisMonth;
      balance = Math.max(0, balance - principalPayment);
      months++;
      
      // If balance is paid off, break
      if (balance <= 0.01) {
        break;
      }
    }

    return {
      totalInterest: Math.round(totalInterest * 100) / 100,
      monthsToPayoff: months,
      finalBalance: Math.round(balance * 100) / 100,
      totalPayment: Math.round(totalPayment * 100) / 100,
    };
  };

  useEffect(() => {
    resolveEffectiveMonthlyPayment();
  }, [currentBalance, monthlyPayment, interestRate, remainingMonths]);

  useEffect(() => {
    if (extraPayment && parseFloat(extraPayment) > 0) {
      // Add debounce to avoid too many calculations
      const timeoutId = setTimeout(() => {
        calculateOverpaymentImpact();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      setResult(null);
    }
  }, [extraPayment, currentBalance, effectiveMonthlyPayment, interestRate, remainingMonths]);

  const quickAmounts = [10000, 20000, 50000, 100000];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col" hideClose>
        <DialogTitle className="sr-only">
          คำนวณผลกระทบจากการจ่ายเกิน
        </DialogTitle>
        <DialogDescription className="sr-only">
          จำลองสถานการณ์การชำระเงินเพิ่มเพื่อดูผลกระทบต่อดอกเบี้ยและระยะเวลา
        </DialogDescription>

        {/* HEADER */}
        <header className="bg-gradient-to-br from-white via-green-50/30 to-white px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-slate-100 flex justify-between items-start sm:items-center gap-3 flex-shrink-0">
          <div className="flex items-start sm:items-center gap-3 sm:gap-5 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br from-[#138F3E] to-[#0F7A34] rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/20 flex-shrink-0">
              <Calculator size={20} className="sm:hidden" strokeWidth={1.5} />
              <Calculator size={28} className="hidden sm:block" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-black tracking-tight text-slate-800 truncate">
                คำนวณผลกระทบจากการจ่ายเกิน
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-none">
                ดูว่าการชำระเงินเพิ่มจะช่วยประหยัดดอกเบี้ยและลดระยะเวลาได้เท่าไหร่
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            aria-label="ปิด"
          >
            <X size={20} className="sm:hidden" />
            <X size={28} className="hidden sm:block" />
          </button>
        </header>

        {/* BODY */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
            {/* LEFT COLUMN - Input */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-6">
              {/* Current Status */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg font-black text-slate-800">
                    สถานะปัจจุบัน
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm sm:text-base text-slate-600">ยอดคงเหลือ</span>
                    <span className="text-base sm:text-xl font-black text-slate-800 text-right">
                      {formatCurrency(currentBalance)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm sm:text-base text-slate-600">ยอดงวดถัดไป</span>
                    <span className="text-base sm:text-lg font-bold text-slate-800 text-right">
                      {formatCurrency(monthlyPayment)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm sm:text-base text-slate-600">ค่างวดที่ใช้คำนวณ</span>
                    <span className="text-base sm:text-lg font-bold text-slate-800 text-right">
                      {formatCurrency(effectiveMonthlyPayment)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm sm:text-base text-slate-600">อัตราดอกเบี้ย</span>
                    <span className="text-base sm:text-lg font-bold text-blue-600 text-right">
                      {interestRate}% ต่อปี
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm sm:text-base text-slate-600">งวดที่เหลือ</span>
                    <span className="text-base sm:text-lg font-bold text-slate-800 text-right">
                      {remainingMonths} เดือน
                    </span>
                  </div>
                  {paymentWarning && (
                    <div className="text-xs sm:text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-3">
                      {paymentWarning}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Extra Payment Input */}
              <Card className="border-[#138F3E]/30 shadow-sm bg-white relative overflow-hidden">
                {/* Wave Background */}
                <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
                  <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                    <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-[#138F3E] opacity-10" />
                    <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-[#138F3E] opacity-20" />
                    <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-[#138F3E] opacity-40" />
                  </svg>
                </div>
                <CardHeader className="border-b border-green-100 bg-gradient-to-r from-green-50/50 to-transparent relative z-10 p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                    <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-[#138F3E]" />
                    จำนวนเงินที่ต้องการจ่ายเพิ่ม
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3 sm:space-y-4 relative z-10">
                  <div className="space-y-2">
                    <Label htmlFor="extra-payment" className="text-sm font-bold text-slate-700">
                      จำนวนเงิน (บาท)
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="extra-payment"
                        type="number"
                        value={extraPayment}
                        onChange={(e) => setExtraPayment(e.target.value)}
                        placeholder="0"
                        className="text-xl sm:text-2xl font-bold h-12 sm:h-16 pl-10 sm:pl-12 border-[#138F3E]/30 focus:border-[#138F3E] focus:ring-[#138F3E]/20"
                        min="0"
                        max={currentBalance}
                        step="1000"
                      />
                    </div>
                    {validationError && (
                      <p className="text-sm text-red-600 font-medium flex items-center gap-2">
                        <X className="h-4 w-4" />
                        {validationError}
                      </p>
                    )}
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">จำนวนเงินแนะนำ</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {quickAmounts.map((amount) => (
                        <Button
                          key={amount}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setExtraPayment(amount.toString())}
                          className="border-[#138F3E]/30 hover:bg-green-50 hover:border-[#138F3E] hover:text-[#138F3E] transition-all"
                        >
                          {formatCurrency(amount)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN - Results */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6">
              {result ? (
                <>
                  {/* Savings Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <Card className="border-emerald-200 bg-white shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden">
                      {/* Wave Background */}
                      <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
                        <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                          <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-emerald-500 opacity-10" />
                          <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-emerald-500 opacity-20" />
                          <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-emerald-500 opacity-40" />
                        </svg>
                      </div>
                      <CardContent className="p-4 sm:p-6 relative z-10">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-100 shadow-sm">
                            <TrendingDown className="h-4 w-4 sm:h-6 sm:w-6 text-emerald-600" />
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-emerald-700 uppercase tracking-wider">
                            ประหยัดดอกเบี้ย
                          </p>
                        </div>
                        <p className="text-2xl sm:text-4xl font-black text-emerald-700 mb-2 break-all">
                          {formatCurrency(result.interestSaved)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-emerald-600">
                          <div className="flex-1 h-1 bg-emerald-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${(result.interestSaved / result.originalTotalInterest) * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold whitespace-nowrap">
                            {((result.interestSaved / result.originalTotalInterest) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-[#138F3E]/30 bg-white shadow-lg hover:shadow-xl transition-shadow relative overflow-hidden">
                      {/* Wave Background */}
                      <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
                        <svg viewBox="0 0 400 200" className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6" preserveAspectRatio="none">
                          <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-[#138F3E] opacity-10" />
                          <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-[#138F3E] opacity-20" />
                          <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-[#138F3E] opacity-40" />
                        </svg>
                      </div>
                      <CardContent className="p-4 sm:p-6 relative z-10">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <div className="p-2 sm:p-2.5 rounded-xl bg-green-100 shadow-sm">
                            <Calendar className="h-4 w-4 sm:h-6 sm:w-6 text-[#138F3E]" />
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-[#138F3E] uppercase tracking-wider">
                            ลดระยะเวลา
                          </p>
                        </div>
                        <p className="text-2xl sm:text-4xl font-black text-[#138F3E] mb-2">
                          {result.monthsSaved} <span className="text-xl sm:text-2xl">เดือน</span>
                        </p>
                        <div className="flex items-center gap-2 text-xs text-[#138F3E]">
                          <div className="flex-1 h-1 bg-green-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#138F3E] transition-all duration-500"
                              style={{ width: `${(result.monthsSaved / result.originalMonthsRemaining) * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold whitespace-nowrap">
                            {((result.monthsSaved / result.originalMonthsRemaining) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Comparison Table */}
                  <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 p-4 sm:p-6">
                      <CardTitle className="text-base sm:text-lg font-black text-slate-800">
                        เปรียบเทียบสถานการณ์
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                        <table className="w-full min-w-[600px]">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                              <th className="text-left p-3 sm:p-4 font-bold text-slate-600 text-xs sm:text-sm whitespace-nowrap"></th>
                              <th className="text-center p-3 sm:p-4 font-bold text-slate-700 text-xs sm:text-sm">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="whitespace-nowrap">แผนปัจจุบัน</span>
                                  <div className="w-8 sm:w-12 h-1 bg-slate-300 rounded-full"></div>
                                </div>
                              </th>
                              <th className="text-center p-3 sm:p-4 font-bold text-[#138F3E] text-xs sm:text-sm">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="whitespace-nowrap">หลังจ่ายเพิ่ม</span>
                                  <div className="w-8 sm:w-12 h-1 bg-[#138F3E] rounded-full"></div>
                                </div>
                              </th>
                              <th className="text-center p-3 sm:p-4 font-bold text-emerald-700 text-xs sm:text-sm">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="whitespace-nowrap">ผลต่าง</span>
                                  <div className="w-8 sm:w-12 h-1 bg-emerald-500 rounded-full"></div>
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b border-slate-50 hover:bg-green-50/30 transition-colors">
                              <td className="p-3 sm:p-4 font-semibold text-slate-700 text-xs sm:text-sm">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500 flex-shrink-0" />
                                  <span>ดอกเบี้ยรวม</span>
                                </div>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-slate-800 text-xs sm:text-sm">
                                <span className="inline-block">{formatCurrency(result.originalTotalInterest)}</span>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-[#138F3E] text-xs sm:text-sm">
                                <span className="inline-block">{formatCurrency(result.newTotalInterest)}</span>
                              </td>
                              <td className="p-3 sm:p-4 text-center">
                                <div className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full bg-emerald-100">
                                  <TrendingDown className="h-3 w-3 text-emerald-700 flex-shrink-0" />
                                  <span className="font-bold text-emerald-700 text-xs sm:text-sm whitespace-nowrap">
                                    {formatCurrency(result.interestSaved)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-b border-slate-50 hover:bg-green-50/30 transition-colors">
                              <td className="p-3 sm:p-4 font-semibold text-slate-700 text-xs sm:text-sm">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-[#138F3E] flex-shrink-0" />
                                  <span>ระยะเวลาคงเหลือ</span>
                                </div>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-slate-800 text-xs sm:text-sm whitespace-nowrap">
                                {result.originalMonthsRemaining} เดือน
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-[#138F3E] text-xs sm:text-sm whitespace-nowrap">
                                {result.newMonthsRemaining} เดือน
                              </td>
                              <td className="p-3 sm:p-4 text-center">
                                <div className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full bg-emerald-100">
                                  <TrendingDown className="h-3 w-3 text-emerald-700 flex-shrink-0" />
                                  <span className="font-bold text-emerald-700 text-xs sm:text-sm whitespace-nowrap">
                                    {result.monthsSaved} เดือน
                                  </span>
                                </div>
                              </td>
                            </tr>
                            <tr className="hover:bg-green-50/30 transition-colors">
                              <td className="p-3 sm:p-4 font-semibold text-slate-700 text-xs sm:text-sm">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-slate-500 flex-shrink-0" />
                                  <span>ค่างวดต่อเดือน</span>
                                </div>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-slate-800 text-xs sm:text-sm">
                                <span className="inline-block">{formatCurrency(result.effectiveMonthlyPayment)}</span>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-[#138F3E] text-xs sm:text-sm">
                                <span className="inline-block">{formatCurrency(result.newMonthlyPayment)}</span>
                              </td>
                              <td className="p-3 sm:p-4 text-center">
                                <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs whitespace-nowrap">
                                  ไม่เปลี่ยนแปลง
                                </Badge>
                              </td>
                            </tr>
                            <tr className="border-b border-slate-50 hover:bg-green-50/30 transition-colors">
                              <td className="p-3 sm:p-4 font-semibold text-slate-700 text-xs sm:text-sm">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500 flex-shrink-0" />
                                  <span>ยอดรวมที่ต้องจ่าย</span>
                                </div>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-slate-800 text-xs sm:text-sm">
                                <span className="inline-block">{formatCurrency(result.originalTotalPayment)}</span>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-[#138F3E] text-xs sm:text-sm">
                                <span className="inline-block">{formatCurrency(result.newTotalPayment)}</span>
                              </td>
                              <td className="p-3 sm:p-4 text-center">
                                <div className="inline-flex items-center gap-1 px-2 sm:px-3 py-1 rounded-full bg-emerald-100">
                                  <TrendingDown className="h-3 w-3 text-emerald-700 flex-shrink-0" />
                                  <span className="font-bold text-emerald-700 text-xs sm:text-sm whitespace-nowrap">
                                    {formatCurrency(result.interestSaved)}
                                  </span>
                                </div>
                              </td>
                            </tr>
                            <tr className="hover:bg-green-50/30 transition-colors">
                              <td className="p-3 sm:p-4 font-semibold text-slate-700 text-xs sm:text-sm">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-orange-500 flex-shrink-0" />
                                  <span>จำนวนเงินที่จ่ายเพิ่ม</span>
                                </div>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-slate-800 text-xs sm:text-sm">
                                <span className="inline-block">-</span>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-[#138F3E] text-xs sm:text-sm">
                                <span className="inline-block">{formatCurrency(parseFloat(extraPayment))}</span>
                              </td>
                              <td className="p-3 sm:p-4 text-center">
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs whitespace-nowrap">
                                  ครั้งเดียว
                                </Badge>
                              </td>
                            </tr>
                            <tr className="hover:bg-green-50/30 transition-colors">
                              <td className="p-3 sm:p-4 font-semibold text-slate-700 text-xs sm:text-sm">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" />
                                  <span>ผลตอบแทนจากการลงทุน (ROI)</span>
                                </div>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-slate-800 text-xs sm:text-sm">
                                <span className="inline-block">-</span>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-[#138F3E] text-xs sm:text-sm">
                                <span className="inline-block">
                                  {result.roi.toFixed(1)}%
                                </span>
                              </td>
                              <td className="p-3 sm:p-4 text-center">
                                <Badge className={`text-xs whitespace-nowrap ${
                                  result.roi > 20 ? 'bg-green-100 text-green-700 border-green-200' :
                                  result.roi > 10 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                                  'bg-red-100 text-red-700 border-red-200'
                                }`}>
                                  {result.roi > 20 ? 'คุ้มค่ามาก' : result.roi > 10 ? 'คุ้มค่า' : 'พิจารณา'}
                                </Badge>
                              </td>
                            </tr>
                            <tr className="hover:bg-green-50/30 transition-colors">
                              <td className="p-3 sm:p-4 font-semibold text-slate-700 text-xs sm:text-sm">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-500 flex-shrink-0" />
                                  <span>ประหยัดเฉลี่ยต่อเดือน</span>
                                </div>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-slate-800 text-xs sm:text-sm">
                                <span className="inline-block">-</span>
                              </td>
                              <td className="p-3 sm:p-4 text-center font-bold text-[#138F3E] text-xs sm:text-sm">
                                <span className="inline-block">{formatCurrency(result.monthlySavings)}</span>
                              </td>
                              <td className="p-3 sm:p-4 text-center">
                                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs whitespace-nowrap">
                                  ต่อเดือน
                                </Badge>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recommendation */}
                  <Card className="border-[#138F3E]/30 bg-white shadow-lg relative overflow-hidden">
                    {/* Wave Background */}
                    <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
                      <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-30 -translate-x-10 translate-y-6" preserveAspectRatio="none">
                        <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-[#138F3E] opacity-10" />
                        <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-[#138F3E] opacity-20" />
                        <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-[#138F3E] opacity-40" />
                      </svg>
                    </div>
                    <CardContent className="p-4 sm:p-6 relative z-10">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-[#138F3E] to-[#0F7A34] shadow-lg shadow-green-500/20 flex-shrink-0">
                          <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-base sm:text-lg text-slate-800 mb-2 flex flex-wrap items-center gap-2">
                            <span>คำแนะนำ</span>
                            <Badge className="bg-[#138F3E]/10 text-[#138F3E] border-[#138F3E]/20 text-xs">
                              แนะนำ
                            </Badge>
                          </h4>
                          <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-3 sm:mb-4">
                            การชำระเงินเพิ่ม <span className="font-bold text-[#138F3E] break-all">{formatCurrency(parseFloat(extraPayment))}</span> จะให้ผลตอบแทน <span className="font-bold text-purple-600">{result.roi.toFixed(1)}%</span> และช่วยให้คุณ:
                          </p>
                          <ul className="space-y-2 sm:space-y-3">
                            <li className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-white border border-green-100">
                              <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-100 mt-0.5 flex-shrink-0">
                                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-800">ประหยัดดอกเบี้ย</p>
                                <p className="text-xs text-slate-600 mt-0.5 break-all">
                                  ลดดอกเบี้ยได้ <span className="font-bold text-emerald-600">{formatCurrency(result.interestSaved)}</span>
                                </p>
                              </div>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-white border border-green-100">
                              <div className="p-1 sm:p-1.5 rounded-lg bg-[#138F3E]/10 mt-0.5 flex-shrink-0">
                                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-[#138F3E]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-800">หมดหนี้เร็วขึ้น</p>
                                <p className="text-xs text-slate-600 mt-0.5">
                                  ลดระยะเวลาได้ <span className="font-bold text-[#138F3E]">{result.monthsSaved} เดือน</span>
                                </p>
                              </div>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-white border border-green-100">
                              <div className="p-1 sm:p-1.5 rounded-lg bg-blue-100 mt-0.5 flex-shrink-0">
                                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-800">ประหยัดเฉลี่ยต่อเดือน</p>
                                <p className="text-xs text-slate-600 mt-0.5 break-all">
                                  ประหยัดได้ <span className="font-bold text-blue-600">{formatCurrency(result.monthlySavings)}</span> ต่อเดือน
                                </p>
                              </div>
                            </li>
                            <li className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-white border border-green-100">
                              <div className="p-1 sm:p-1.5 rounded-lg bg-purple-100 mt-0.5 flex-shrink-0">
                                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-slate-800">
                                  {result.roi > 20 ? 'แนะนำให้ทำ' : result.roi > 10 ? 'คุ้มค่า' : 'พิจารณาอื่น'}
                                </p>
                                <p className="text-xs text-slate-600 mt-0.5">
                                  ผลตอบแทน <span className="font-bold text-purple-600">{result.roi.toFixed(1)}%</span> 
                                  {result.roi > 20 ? ' สูงมาก' : result.roi > 10 ? ' ดี' : ' ต่ำ'}
                                </p>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-6 sm:p-8 lg:p-12">
                    <div className="text-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                        <Calculator className="h-8 w-8 sm:h-10 sm:w-10 text-slate-300" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2">
                        กรอกจำนวนเงินเพื่อดูผลลัพธ์
                      </h3>
                      <p className="text-sm sm:text-base text-slate-500">
                        ใส่จำนวนเงินที่ต้องการจ่ายเพิ่มเพื่อดูว่าจะช่วยประหยัดดอกเบี้ยและลดระยะเวลาได้เท่าไหร่
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-white px-4 sm:px-6 lg:px-8 py-3 sm:py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="text-xs text-slate-500 text-center sm:text-left">
            <span className="font-semibold">หมายเหตุ:</span> การคำนวณนี้เป็นเพียงการประมาณการ ผลลัพธ์จริงอาจแตกต่างกันขึ้นอยู่กับเงื่อนไขสัญญา
          </div>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="font-bold border-slate-200 hover:bg-slate-50 w-full sm:w-auto text-sm sm:text-base"
          >
            ปิด
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
