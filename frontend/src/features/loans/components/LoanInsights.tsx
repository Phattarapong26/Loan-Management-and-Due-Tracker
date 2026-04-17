import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Progress } from '@/shared/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface LoanInsightsProps {
  principal: number;
  outstandingBalance: number;
  interestRate: number;
  termMonths: number;
  monthsPaid: number;
  totalInterestPaid: number;
  totalInterestProjected: number;
}

export function LoanInsights({
  principal,
  outstandingBalance,
  interestRate,
  termMonths,
  monthsPaid,
  totalInterestPaid,
  totalInterestProjected,
}: LoanInsightsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const paidAmount = principal - outstandingBalance;
  const paymentProgress = (paidAmount / principal) * 100;
  const timeProgress = (monthsPaid / termMonths) * 100;
  const principalProgress = (paidAmount / principal) * 100;
  const interestProgress = (totalInterestPaid / totalInterestProjected) * 100;

  // Calculate if ahead or behind schedule
  const isAheadOfSchedule = principalProgress > timeProgress;
  const scheduleVariance = Math.abs(principalProgress - timeProgress);

  // Calculate total cost
  const totalCost = principal + totalInterestProjected;
  const interestPercentage = (totalInterestProjected / principal) * 100;

  return (
    <div className="space-y-6">
      {/* Total Cost Summary */}
      <Card className="border-slate-200 shadow-lg">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
          <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#138F3E]" />
            สรุปต้นทุนรวมของสัญญา
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Principal */}
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                เงินต้น
              </p>
              <p className="text-2xl font-black text-blue-700">
                {formatCurrency(principal)}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                100% ของวงเงินกู้
              </p>
            </div>

            {/* Total Interest */}
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-amber-50 to-white border border-amber-100">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">
                ดอกเบี้ยรวม
              </p>
              <p className="text-2xl font-black text-amber-700">
                {formatCurrency(totalInterestProjected)}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                {interestPercentage.toFixed(1)}% ของเงินต้น
              </p>
            </div>

            {/* Total Cost */}
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                ต้นทุนรวมทั้งสิ้น
              </p>
              <p className="text-2xl font-black text-slate-800">
                {formatCurrency(totalCost)}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                เงินต้น + ดอกเบี้ย
              </p>
            </div>
          </div>

          {/* Visual Breakdown */}
          <div className="mt-6">
            <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
              <span>สัดส่วนต้นทุน</span>
              <span>รวม {formatCurrency(totalCost)}</span>
            </div>
            <div className="w-full h-8 flex rounded-lg overflow-hidden shadow-inner">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-full flex items-center justify-center text-xs text-white font-bold"
                style={{ width: `${(principal / totalCost) * 100}%` }}
              >
                เงินต้น
              </div>
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-600 h-full flex items-center justify-center text-xs text-white font-bold"
                style={{ width: `${(totalInterestProjected / totalCost) * 100}%` }}
              >
                ดอกเบี้ย
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>เงินต้น {((principal / totalCost) * 100).toFixed(1)}%</span>
              <span>ดอกเบี้ย {((totalInterestProjected / totalCost) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Comparison and Key Insights - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Comparison - Left */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#138F3E]" />
                ความคืบหน้าการชำระ
              </CardTitle>
              {isAheadOfSchedule ? (
                <Badge className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  ชำระเร็วกว่ากำหนด
                </Badge>
              ) : (
                <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                  <Info className="h-3 w-3 mr-1" />
                  ชำระตามกำหนด
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Time Progress */}
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  ระยะเวลาที่ผ่านไป
                </span>
                <span className="text-blue-600">{timeProgress.toFixed(1)}%</span>
              </div>
              <Progress value={timeProgress} className="h-3 bg-blue-100" />
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>ผ่านไป {monthsPaid} เดือน</span>
                <span>เหลือ {termMonths - monthsPaid} เดือน</span>
              </div>
            </div>

            {/* Principal Progress */}
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  เงินต้นที่ชำระแล้ว
                </span>
                <span className="text-emerald-600">{principalProgress.toFixed(1)}%</span>
              </div>
              <Progress value={principalProgress} className="h-3" />
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>ชำระแล้ว {formatCurrency(paidAmount)}</span>
                <span>คงเหลือ {formatCurrency(outstandingBalance)}</span>
              </div>
            </div>

            {/* Interest Progress */}
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-amber-600" />
                  ดอกเบี้ยที่จ่ายแล้ว
                </span>
                <span className="text-amber-600">{interestProgress.toFixed(1)}%</span>
              </div>
              <Progress value={interestProgress} className="h-3 bg-amber-100" />
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>จ่ายแล้ว {formatCurrency(totalInterestPaid)}</span>
                <span>คาดว่าจะจ่ายรวม {formatCurrency(totalInterestProjected)}</span>
              </div>
            </div>

            {/* Schedule Status */}
            <div className={`p-4 rounded-xl border ${
              isAheadOfSchedule 
                ? 'bg-green-50 border-green-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start gap-3">
                {isAheadOfSchedule ? (
                  <TrendingDown className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className={`font-bold text-sm mb-1 ${
                    isAheadOfSchedule ? 'text-green-700' : 'text-blue-700'
                  }`}>
                    {isAheadOfSchedule 
                      ? `คุณชำระเร็วกว่ากำหนด ${scheduleVariance.toFixed(1)}%` 
                      : 'คุณชำระตามกำหนด'}
                  </h4>
                  <p className={`text-xs ${
                    isAheadOfSchedule ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {isAheadOfSchedule
                      ? 'การชำระเงินของคุณเร็วกว่าแผนที่กำหนด ซึ่งจะช่วยลดดอกเบี้ยรวมได้'
                      : 'การชำระเงินของคุณเป็นไปตามแผนที่กำหนด'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Insights - Right */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
            <CardTitle className="text-lg font-black text-slate-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#138F3E]" />
              ข้อมูลสำคัญที่ควรทราบ
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <div className="p-1.5 rounded-lg bg-blue-100 mt-0.5">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 mb-1">
                    อัตราดอกเบี้ยต่อปี
                  </p>
                  <p className="text-xs text-slate-600">
                    สัญญานี้มีอัตราดอกเบี้ย <span className="font-bold">{interestRate}%</span> ต่อปี 
                    ซึ่งคิดเป็นดอกเบี้ยต่อเดือนประมาณ <span className="font-bold">{(interestRate / 12).toFixed(2)}%</span>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <div className="p-1.5 rounded-lg bg-amber-100 mt-0.5">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 mb-1">
                    ต้นทุนการกู้ยืม
                  </p>
                  <p className="text-xs text-slate-600">
                    คุณจะจ่ายดอกเบี้ยรวมทั้งสิ้น <span className="font-bold">{formatCurrency(totalInterestProjected)}</span> 
                    {' '}คิดเป็น <span className="font-bold">{interestPercentage.toFixed(1)}%</span> ของเงินต้น
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                <div className="p-1.5 rounded-lg bg-green-100 mt-0.5">
                  <TrendingDown className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 mb-1">
                    การชำระก่อนกำหนด
                  </p>
                  <p className="text-xs text-slate-600">
                    การชำระเงินเพิ่มหรือชำระก่อนกำหนดจะช่วยลดดอกเบี้ยรวมและระยะเวลาการผ่อนชำระได้
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
