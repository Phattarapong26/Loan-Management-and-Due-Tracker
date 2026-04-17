import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { DonutChart } from '../DonutChart';
import {
  TrendingUp,
  Calendar,
  CheckCircle2,
  Activity,
  CreditCard,
  ChevronRight,
  Clock,
  Smartphone,
  Home,
  PieChart
} from 'lucide-react';

interface CustomerOverviewSectionProps {
  customer?: CustomerOverview | null;
  loans?: LoanOverview[];
  formatCurrency: (amount: number) => string;
  onEditEntity?: () => void;
}

// Types
type LoanOverview = {
  id: string;
  principal?: number | string;
  totalDisbursed?: number | string;
  outstandingBalance?: number | string;
  status?: string;
  loanProduct?: { productName?: string } | null;
  createdAt?: string;
  [key: string]: unknown;
};

type CustomerOverview = {
  id?: string;
  businessName?: string;
  name?: string;
  status?: string;
  phoneNumber?: string;
  address?: string;
  createdAt?: string;
  yearsInBusiness?: number;
  [key: string]: unknown;
};

const K_BLUE = "#0065FB";

export function CustomerOverviewSection({ customer, loans, formatCurrency, onEditEntity }: CustomerOverviewSectionProps) {
  const safeLoans = loans || [];

  // Calculate metrics with safe null checks
  const totalLoanAmount = safeLoans.reduce((sum, loan) => sum + (Number(loan?.principal) || 0), 0);
  const totalDisbursed = safeLoans.reduce((sum, loan) => sum + (Number(loan?.totalDisbursed) || 0), 0);
  const totalOutstanding = safeLoans.reduce((sum, loan) => sum + (Number(loan?.outstandingBalance) || 0), 0);
  // totalPaid = disbursed - outstanding (amount already repaid)
  const totalPaid = Math.max(0, totalDisbursed - totalOutstanding);

  const activeLoans = safeLoans.filter(l => l?.status === 'ACTIVE' || l?.status === 'DISBURSED').length;
  const overdueLoans = safeLoans.filter(l => l?.status === 'OVERDUE' || l?.status === 'NPL').length;

  // Calculate percentages with safe division
  const utilizationPercent = totalLoanAmount > 0 ? Math.min(100, (totalDisbursed / totalLoanAmount) * 100) : 0;
  const repaymentPercent = totalDisbursed > 0 ? Math.min(100, Math.max(0, (totalPaid / totalDisbursed) * 100)) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Financial Overview */}
      <div className="lg:col-span-8 space-y-6">
        {/* Total Balance Summary Card with Donut Chart */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-50 flex flex-col md:flex-row items-center gap-10">
          <div className="shrink-0 flex flex-col items-center">
            <DonutChart
              percentage={utilizationPercent}
              size={160}
              strokeWidth={14}
              primaryColor={K_BLUE}
              label="USED"
            />
            <p className="mt-4 text-sm font-bold text-gray-400 uppercase tracking-widest">Utilization Rate</p>
          </div>

          <div className="w-full">
            <h3 className="text-base font-bold text-gray-400 mb-6 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-[#0065FB]" />
              สรุปวงเงินรวม (Consolidated)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
              <div className="space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">วงเงินรวมทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalLoanAmount)}</p>
                <div className="h-1 w-12 bg-gray-200 rounded-full"></div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">เบิกจ่ายไปแล้ว</p>
                <p className="text-2xl font-bold text-[#0065FB]">{formatCurrency(totalDisbursed)}</p>
                <div className="h-1 w-12 bg-[#0065FB]/20 rounded-full"></div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">ยอดเงินคงเหลือ</p>
                <p className="text-2xl font-bold text-gray-800">{formatCurrency(totalOutstanding)}</p>
                <div className="h-1 w-12 bg-gray-200 rounded-full"></div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">จำนวนสัญญา</p>
                <p className="text-2xl font-bold text-gray-800">{safeLoans.length} <span className="text-sm font-normal text-gray-400">รายการ</span></p>
                <div className="h-1 w-12 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Specific Progress */}
        {safeLoans.length > 0 && (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold">รายละเอียดสินเชื่อตามประเภท</h3>
              <Button variant="ghost" className="text-[#0065FB] text-xs font-bold hover:bg-blue-50 px-4 py-2 rounded-xl">
                ดูรีพอร์ตสรุป
              </Button>
            </div>

            {safeLoans.length > 1 && (
              <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                เลื่อนดูเพิ่มเติม
              </p>
            )}

            <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300">
              <div className="flex gap-6 snap-x snap-mandatory">
                {safeLoans.map((loan, idx) => {
                  const loanDisbursed = Number(loan.totalDisbursed) || 0;
                  const loanPrincipal = Number(loan.principal) || 0;
                  const loanOutstanding = Number(loan.outstandingBalance) || 0;
                  const loanPaid = loanDisbursed - loanOutstanding;

                  const disbursementPercent = loanPrincipal > 0 ? (loanDisbursed / loanPrincipal) * 100 : 0;
                  const repaymentAmount = loanPaid;

                  return (
                    <div key={idx} className="p-8 rounded-3xl border border-gray-100 bg-gray-50/30 min-w-[400px] max-w-[500px] snap-start shrink-0">
                      <div className="flex justify-between items-end mb-6">
                        <div>
                          <p className="text-xs font-bold text-[#0065FB] uppercase mb-1">Product Type</p>
                          <p className="text-lg font-bold">{loan.loanProduct?.productName || 'สินเชื่อ'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-400 uppercase">Usage</p>
                          <p className="text-xl font-bold text-[#0065FB]">{disbursementPercent.toFixed(1)}%</p>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between text-sm font-bold mb-2 text-gray-500">
                            <span>ยอดเบิกใช้ (CURRENT DISBURSED)</span>
                            <span className="text-[#0065FB]">{formatCurrency(loanDisbursed)} / {formatCurrency(loanPrincipal)}</span>
                          </div>
                          <div className="h-3 bg-gray-200/50 rounded-full overflow-hidden p-0.5">
                            <div
                              className="h-full bg-[#0065FB] rounded-full shadow-sm shadow-blue-200 transition-all duration-1000"
                              style={{ width: `${Math.min(disbursementPercent, 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm font-bold mb-2 text-gray-500">
                            <span>ยอดชำระทบต้น (REPAYMENT)</span>
                            <span className="text-gray-800">
                              {repaymentAmount > 0 ? '-' : ''}{formatCurrency(Math.abs(repaymentAmount))}
                            </span>
                          </div>
                          <div className="h-3 bg-gray-200/50 rounded-full overflow-hidden p-0.5">
                            <div
                              className="h-full rounded-full bg-gray-400"
                              style={{ width: `${loanDisbursed > 0 ? Math.min((Math.abs(repaymentAmount) / loanDisbursed) * 100, 100) : 0}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Loan Status List */}
        {safeLoans.length > 0 && (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-50">
            <h3 className="font-bold mb-4">รายการสัญญาที่มีผลบังคับ</h3>
            
            {safeLoans.length > 2 && (
              <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                เลื่อนดูเพิ่มเติม
              </p>
            )}

            <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300">
              <div className="flex gap-3 snap-x snap-mandatory">
                {safeLoans.map((loan, idx) => {
                  const statusColor =
                    loan.status === 'APPROVED' ? 'blue' :
                      loan.status === 'DISBURSED' || loan.status === 'ACTIVE' ? 'blue' :
                        loan.status === 'OVERDUE' ? 'gray' : 'gray';

                  return (
                    <div
                      key={idx}
                      className="flex flex-col justify-between p-5 bg-white border border-gray-100 rounded-3xl hover:border-[#0065FB] hover:shadow-md transition-all group cursor-pointer min-w-[320px] max-w-[380px] snap-start shrink-0"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-gray-50 text-gray-500">
                          <CreditCard className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter whitespace-nowrap">
                              ID: {loan.id.substring(0, 8).toUpperCase()}
                            </p>
                          </div>
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter truncate">
                            {loan.loanProduct?.productName || 'สินเชื่อ'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-400 uppercase font-bold mb-1">วงเงิน</p>
                          <p className="text-xl font-bold tracking-tight text-gray-800">
                            {formatCurrency(Number(loan.principal) || 0)}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <span className="text-xs font-bold px-4 py-1.5 rounded-full border whitespace-nowrap bg-gray-50 text-gray-600 border-gray-200">
                            {loan.status}
                          </span>
                          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0065FB] group-hover:translate-x-0.5 transition-all" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Profile & Info */}
      <div className="lg:col-span-4 space-y-6">
        {/* Business Information Card */}
        <div className="bg-[#1A1A1A] text-white rounded-xl p-8 shadow-xl shadow-gray-200 overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-5 mb-10">
              <div className="w-16 h-16 rounded-[1.5rem] bg-[#0065FB] border-4 border-white/10 flex items-center justify-center text-3xl font-bold shadow-lg shadow-blue-900/40">
                {customer.businessName?.charAt(0) || 'C'}
              </div>
              <div>
                <h4 className="font-bold text-lg">{customer.businessName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-bold text-[#0065FB] uppercase bg-[#0065FB]/10 px-2 py-0.5 rounded">
                    Verified Client
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-7">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                  <TrendingUp className="w-4 h-4 text-[#0065FB]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-widest">Account Status</p>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    {customer?.status?.toUpperCase() === 'ACTIVE' ? 'ACTIVE (ใช้งาน)' : 'INACTIVE (ไม่ใช้งาน)'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                  <Calendar className="w-4 h-4 text-[#0065FB]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-widest">Client Since</p>
                  <p className="text-sm font-medium">
                    {customer.createdAt ? (() => {
                      const d = new Date(customer.createdAt);
                      return isNaN(d.getTime()) ? 'ไม่ระบุ' : d.toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                    })() : 'ไม่ระบุ'}
                  </p>
                  {customer.createdAt && (() => {
                    const d = new Date(customer.createdAt);
                    return !isNaN(d.getTime()) ? (
                      <p className="text-xs text-gray-500 font-mono">
                        {d.toLocaleTimeString('th-TH')} UTC
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>

              {customer.phoneNumber && (
                <div className="flex items-start gap-4 pt-6 border-t border-white/5">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                    <Smartphone className="w-4 h-4 text-[#0065FB]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-widest">Hotline Contact</p>
                    <p className="text-sm font-medium">{customer.phoneNumber}</p>
                  </div>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start gap-4 pt-6 border-t border-white/5">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                    <Home className="w-4 h-4 text-[#0065FB]" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-widest">Business Address</p>
                    <p className="text-sm font-medium leading-relaxed text-gray-300">{customer.address}</p>
                  </div>
                </div>
              )}
            </div>

            <Button
              className="w-full mt-10 py-4 bg-[#0065FB] text-white text-xs font-bold rounded-2xl hover:bg-opacity-90 transition-all shadow-xl shadow-blue-900/30 active:scale-95"
              onClick={onEditEntity}
            >
              แก้ไขข้อมูลนิติบุคคล
            </Button>
          </div>

          {/* Abstract background shape */}
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#0065FB]/5 rounded-full blur-3xl"></div>
        </div>

        {/* System Logs */}
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-50">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0065FB]" />
              บันทึกกิจกรรม
            </h3>
            <button className="text-xs font-bold text-gray-400 hover:text-gray-600">FILTER</button>
          </div>

          <div className="space-y-8 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-gray-100">
            {safeLoans.length > 0 ? (
              safeLoans.slice(0, 3).map((loan, idx) => (
                <div key={idx} className="relative pl-10">
                  <div className={`absolute left-[6px] top-1.5 w-4 h-4 bg-white rounded-full border-2 flex items-center justify-center z-10 shadow-sm ${idx === 0 ? 'border-[#0065FB]' : 'border-gray-200'
                    }`}>
                    {idx === 0 && <div className="w-1.5 h-1.5 bg-[#0065FB] rounded-full"></div>}
                  </div>
                  <p className="text-sm font-bold text-gray-800">
                    {loan.status === 'APPROVED' ? 'อนุมัติสัญญา' :
                      loan.status === 'DISBURSED' ? 'เบิกจ่ายสัญญา' :
                        loan.status === 'ACTIVE' ? 'สัญญาใช้งาน' : 'สร้างสัญญา'} ID: {loan.id.substring(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {loan.createdAt ? new Date(loan.createdAt).toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }) : 'ไม่ระบุ'} • ระบบอัตโนมัติ
                  </p>
                </div>
              ))
            ) : (
              <div className="relative pl-10">
                <div className="absolute left-[8px] top-1.5 w-3 h-3 bg-gray-100 rounded-full border-2 border-white z-10 shadow-sm"></div>
                <p className="text-sm font-bold text-gray-500">ยังไม่มีกิจกรรม</p>
                <p className="text-xs text-gray-400 mt-0.5">รอการสร้างสัญญาแรก</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
