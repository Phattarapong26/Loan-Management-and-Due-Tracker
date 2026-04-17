import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Separator } from '@/shared/components/ui/separator';
import { Calculator, TrendingDown, Clock, DollarSign } from 'lucide-react';

interface LoanData {
  loanId: string;
  contractNumber: string;
  currentBalance: number;
  monthlyPayment: number;
  interestRate: number;
  remainingMonths: number;
  principal: number;
  customerName: string;
  allowEarlyPayment: boolean;
  earlyPaymentPenaltyRate: number;
  interestCalculationMethod?: string;
}

interface CalculationResult {
  originalTotalInterest: number;
  originalMonthsRemaining: number;
  newTotalInterest: number;
  newMonthsRemaining: number;
  interestSaved: number;
  monthsSaved: number;
  penaltyAmount: number;
  effectiveExtraPrincipal: number;
}

export default function OverpaymentCalculator() {
  const [searchParams] = useSearchParams();
  const [loanData, setLoanData] = useState<LoanData | null>(null);
  const [extraPayment, setExtraPayment] = useState<number>(0);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const token = searchParams.get('t');
    if (token) {
      // Fetch context securely from backend using signed token
      const sameOriginUrl = `/api/public/overpayment-context?t=${encodeURIComponent(token)}`;
      const apiBase = searchParams.get('apiBase');
      const crossOriginUrl = apiBase
        ? `${apiBase.replace(/\/$/, '')}/api/public/overpayment-context?t=${encodeURIComponent(token)}`
        : null;

      fetch(sameOriginUrl)
        .then(async (res) => {
          if (res.status === 404 && crossOriginUrl) {
            // Some environments (tunneled static hosting) don't proxy /api -> backend
            const res2 = await fetch(crossOriginUrl);
            const json2 = await res2.json().catch(() => null);
            if (!res2.ok || !json2?.success) {
              throw new Error(json2?.error || 'Failed to load loan context');
            }
            return json2.data as LoanData;
          }

          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.success) {
            throw new Error(json?.error || 'Failed to load loan context');
          }
          return json.data as LoanData;
        })
        .then((data) => setLoanData(data))
        .catch(() => setLoanData(null));
      return;
    }

    // Parse URL parameters
    const data: LoanData = {
      loanId: searchParams.get('loanId') || '',
      contractNumber: searchParams.get('contractNumber') || '',
      currentBalance: Number(searchParams.get('currentBalance')) || 0,
      monthlyPayment: Number(searchParams.get('monthlyPayment')) || 0,
      interestRate: Number(searchParams.get('interestRate')) || 0,
      remainingMonths: Number(searchParams.get('remainingMonths')) || 0,
      principal: Number(searchParams.get('principal')) || 0,
      customerName: searchParams.get('customerName') || '',
      allowEarlyPayment: (searchParams.get('allowEarlyPayment') ?? 'true') === 'true',
      earlyPaymentPenaltyRate: Number(searchParams.get('earlyPaymentPenaltyRate')) || 0,
      interestCalculationMethod: searchParams.get('interestCalculationMethod') || undefined,
    };

    setLoanData(data);
  }, [searchParams]);

  const calculateOverpayment = () => {
    if (!loanData || extraPayment <= 0) return;

    setIsCalculating(true);

    // Simulate calculation (same logic as backend)
    const { currentBalance, monthlyPayment, interestRate, remainingMonths } = loanData;

    if (!loanData.allowEarlyPayment) {
      alert('สัญญานี้ไม่อนุญาตให้ชำระก่อนกำหนด/จ่ายเพิ่ม กรุณาติดต่อเจ้าหน้าที่');
      setIsCalculating(false);
      return;
    }

    const penaltyAmount =
      loanData.earlyPaymentPenaltyRate > 0
        ? (extraPayment * loanData.earlyPaymentPenaltyRate) / 100
        : 0;
    const effectiveExtraPrincipal = extraPayment - penaltyAmount;

    if (effectiveExtraPrincipal <= 0) {
      alert('จำนวนเงินที่จ่ายเพิ่มน้อยเกินไปเมื่อหักค่าปรับแล้ว');
      setIsCalculating(false);
      return;
    }
    
    if (effectiveExtraPrincipal >= currentBalance) {
      alert('จำนวนเงินที่จ่ายเพิ่ม (หลังหักค่าปรับ) ไม่สามารถเกินยอดคงเหลือได้');
      setIsCalculating(false);
      return;
    }

    const monthlyRate = interestRate / 100 / 12;

    // Calculate original scenario
    let originalBalance = currentBalance;
    let originalTotalInterest = 0;
    let originalMonths = 0;

    while (originalBalance > 0.01 && originalMonths < remainingMonths) {
      const interestPayment = originalBalance * monthlyRate;
      const principalPayment = Math.min(monthlyPayment - interestPayment, originalBalance);
      
      if (principalPayment <= 0) break;
      
      originalTotalInterest += interestPayment;
      originalBalance -= principalPayment;
      originalMonths++;
    }

    // Calculate new scenario with extra payment (principal reduced after penalty, if any)
    let newBalance = currentBalance - effectiveExtraPrincipal;
    let newTotalInterest = 0;
    let newMonths = 0;

    while (newBalance > 0.01 && newMonths < remainingMonths) {
      const interestPayment = newBalance * monthlyRate;
      const principalPayment = Math.min(monthlyPayment - interestPayment, newBalance);
      
      if (principalPayment <= 0) break;
      
      newTotalInterest += interestPayment;
      newBalance -= principalPayment;
      newMonths++;
    }

    const calculationResult: CalculationResult = {
      originalTotalInterest: Math.round(originalTotalInterest),
      originalMonthsRemaining: originalMonths,
      newTotalInterest: Math.round(newTotalInterest),
      newMonthsRemaining: newMonths,
      interestSaved: Math.round(originalTotalInterest - newTotalInterest),
      monthsSaved: originalMonths - newMonths,
      penaltyAmount: Math.round(penaltyAmount),
      effectiveExtraPrincipal: Math.round(effectiveExtraPrincipal),
    };

    setResult(calculationResult);
    setIsCalculating(false);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('th-TH', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const quickAmounts = [10000, 20000, 50000, 100000];

  if (!loanData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <Calculator className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">ไม่สามารถโหลดข้อมูลสัญญาได้</h3>
              <p className="text-sm text-gray-500">ลิงก์อาจหมดอายุ กรุณากดใหม่จาก LINE อีกครั้ง</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Calculator className="h-8 w-8 text-green-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">เครื่องคำนวณการจ่ายเกิน</h1>
          </div>
          <p className="text-lg text-gray-600">คำนวณผลประหยัดจากการชำระเงินเพิ่มเติม</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Loan Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                ข้อมูลสัญญา
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">เลขที่สัญญา</Label>
                <p className="text-lg font-semibold">{loanData.contractNumber}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700">ชื่อลูกค้า</Label>
                <p className="text-lg">{loanData.customerName}</p>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">วงเงินเดิม</Label>
                  <p className="text-lg font-semibold text-blue-600">
                    {formatCurrency(loanData.principal)} บาท
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">ยอดคงเหลือ</Label>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(loanData.currentBalance)} บาท
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">ค่างวดรายเดือน</Label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(loanData.monthlyPayment)} บาท
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">อัตราดอกเบี้ย</Label>
                  <p className="text-lg font-semibold">
                    {loanData.interestRate}% ต่อปี
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">งวดที่เหลือ</Label>
                <p className="text-lg font-semibold">
                  {loanData.remainingMonths} เดือน
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">อนุญาตชำระก่อนกำหนด</Label>
                  <p className={`text-sm font-semibold ${loanData.allowEarlyPayment ? 'text-green-600' : 'text-red-600'}`}>
                    {loanData.allowEarlyPayment ? 'อนุญาต' : 'ไม่อนุญาต'}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">ค่าปรับชำระก่อนกำหนด</Label>
                  <p className="text-sm font-semibold">
                    {loanData.earlyPaymentPenaltyRate > 0 ? `${loanData.earlyPaymentPenaltyRate}%` : 'ไม่มี'}
                  </p>
                </div>
                {loanData.interestCalculationMethod && (
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-gray-700">วิธีคิดดอกเบี้ย</Label>
                    <p className="text-sm font-semibold">{loanData.interestCalculationMethod}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                คำนวณการจ่ายเกิน
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="extraPayment" className="text-sm font-medium text-gray-700">
                  จำนวนเงินที่ต้องการจ่ายเพิ่ม (บาท)
                </Label>
                <Input
                  id="extraPayment"
                  type="number"
                  value={extraPayment || ''}
                  onChange={(e) => setExtraPayment(Number(e.target.value))}
                  placeholder="ใส่จำนวนเงิน"
                  className="mt-1"
                  disabled={!loanData.allowEarlyPayment}
                />
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  จำนวนเงินแนะนำ
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {quickAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setExtraPayment(amount)}
                      className="text-sm"
                      disabled={!loanData.allowEarlyPayment}
                    >
                      {formatCurrency(amount)} บาท
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={calculateOverpayment}
                disabled={!extraPayment || extraPayment <= 0 || isCalculating || !loanData.allowEarlyPayment}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isCalculating ? 'กำลังคำนวณ...' : 'คำนวณผลประหยัด'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {result && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <TrendingDown className="h-5 w-5 mr-2" />
                ผลการคำนวณ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(result.penaltyAmount > 0 || result.effectiveExtraPrincipal > 0) && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">รายละเอียดเงินที่จ่ายเพิ่ม</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>
                      จำนวนที่จ่ายเพิ่ม: <strong>{formatCurrency(extraPayment)} บาท</strong>
                    </p>
                    {result.penaltyAmount > 0 && (
                      <p>
                        ค่าปรับประมาณการ: <strong>{formatCurrency(result.penaltyAmount)} บาท</strong>
                      </p>
                    )}
                    <p>
                      เงินต้นที่ลดจริง (หลังหักค่าปรับ):{' '}
                      <strong>{formatCurrency(result.effectiveExtraPrincipal)} บาท</strong>
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Interest Saved */}
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">ประหยัดดอกเบี้ย</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(result.interestSaved)} บาท
                  </p>
                </div>

                {/* Months Saved */}
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-1">ลดระยะเวลา</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {result.monthsSaved} เดือน
                  </p>
                </div>

                {/* Original vs New Interest */}
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">ดอกเบี้ยรวม (เดิม)</p>
                  <p className="text-lg font-semibold text-orange-600 line-through">
                    {formatCurrency(result.originalTotalInterest)} บาท
                  </p>
                  <p className="text-sm text-gray-600 mb-1 mt-2">ดอกเบี้ยรวม (ใหม่)</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(result.newTotalInterest)} บาท
                  </p>
                </div>

                {/* Original vs New Duration */}
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">ระยะเวลา (เดิม)</p>
                  <p className="text-lg font-semibold text-purple-600 line-through">
                    {result.originalMonthsRemaining} เดือน
                  </p>
                  <p className="text-sm text-gray-600 mb-1 mt-2">ระยะเวลา (ใหม่)</p>
                  <p className="text-lg font-bold text-green-600">
                    {result.newMonthsRemaining} เดือน
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 สรุปผลประโยชน์</h4>
                <p className="text-sm text-yellow-700">
                  หากคุณจ่ายเงินเพิ่ม <strong>{formatCurrency(extraPayment)} บาท</strong> ในงวดนี้ 
                  {result.penaltyAmount > 0 && (
                    <>
                      {' '}(มีค่าปรับประมาณการ <strong>{formatCurrency(result.penaltyAmount)} บาท</strong>)
                    </>
                  )}
                  คุณจะประหยัดดอกเบี้ย <strong>{formatCurrency(result.interestSaved)} บาท</strong> 
                  และลดระยะเวลาการผ่อนได้ <strong>{result.monthsSaved} เดือน</strong>
                </p>
              </div>

              {/* Disclaimer */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 text-center">
                  ⚠️ การคำนวณนี้เป็นเพียงการประมาณการ ผลลัพธ์จริงอาจแตกต่างขึ้นอยู่กับเงื่อนไขสัญญา
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
