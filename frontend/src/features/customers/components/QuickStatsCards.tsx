import { CreditCard, Calendar, FileText } from 'lucide-react';

interface QuickStatsCardsProps {
  totalLoanAmount: number;
  paidInstallments: number;
  totalInstallments: number;
  completedDocs: number;
  totalDocs: number;
  formatCurrency: (amount: number) => string;
}

export function QuickStatsCards({
  totalLoanAmount,
  paidInstallments,
  totalInstallments,
  completedDocs,
  totalDocs,
  formatCurrency,
}: QuickStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Loan Limit Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0065FB] to-[#0047B3] p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
        {/* Wave Background */}
        <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
          <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
            <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-white opacity-10" />
            <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-white opacity-20" />
            <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-white opacity-40" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl shadow-lg shadow-primary/20">
              <CreditCard className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-white/70 tracking-wide">
              วงเงินสินเชื่อรวม
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {formatCurrency(totalLoanAmount)}
              </h3>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
      </div>

      {/* Paid Installments Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-rose-600 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
        {/* Wave Background */}
        <div className="absolute bottom-0 right-0 w-full h-full pointer-events-none overflow-hidden select-none">
          <svg viewBox="0 0 400 200" className="absolute bottom-0 right-0 w-[140%] h-full opacity-50 scale-x-[-1] translate-x-10 translate-y-6" preserveAspectRatio="none">
            <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-white opacity-10" />
            <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-white opacity-20" />
            <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-white opacity-40" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl shadow-lg shadow-primary/20">
              <Calendar className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-white/70 tracking-wide">
              งวดที่ชำระไปแล้ว
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {paidInstallments} / {totalInstallments}
              </h3>
              <span className="text-sm font-semibold text-white/60">
                งวด
              </span>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
      </div>

      {/* Completed Docs Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-700 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group border border-slate-100">
        {/* Wave Background */}
        <div className="absolute bottom-0 left-0 w-full h-full pointer-events-none overflow-hidden select-none">
          <svg viewBox="0 0 400 200" className="absolute bottom-0 left-0 w-[140%] h-full opacity-50 -translate-x-10 translate-y-6" preserveAspectRatio="none">
            <path d="M0,130 C120,50 280,230 400,110 L400,200 L0,200 Z" fill="currentColor" className="text-white opacity-10" />
            <path d="M0,155 C150,80 250,250 400,140 L400,200 L0,200 Z" fill="currentColor" className="text-white opacity-20" />
            <path d="M0,180 C100,140 300,210 400,165 L400,200 L0,200 Z" fill="currentColor" className="text-white opacity-40" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="bg-white/20 p-3 rounded-xl shadow-lg shadow-primary/20">
              <FileText className="h-6 w-6 text-white" strokeWidth={2} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-white/70 tracking-wide">
              ความสมบูรณ์เอกสาร
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-white tracking-tight">
                {completedDocs} / {totalDocs}
              </h3>
              <span className="text-sm font-semibold text-white/60">
                ฉบับ
              </span>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-300" />
      </div>
    </div>
  );
}
