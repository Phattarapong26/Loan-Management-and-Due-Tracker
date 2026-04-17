
import { BarChart3, AlertCircle, TrendingUp, TrendingDown, CheckCircle2, HelpCircle, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { useEditableData } from '../../hooks/useEditableData';
import { customersApi } from '@/shared/lib/api-endpoints';

type DSCRData = {
  customerName: string;
  analysisYear: number;
  netOperatingIncome: number;
  totalDebtService: number;
  dscrRatio: number;
  dscrStatus: string;
} & Record<string, unknown>;

interface DSCRSectionProps {
  aiData?: {
    dscr?: Partial<DSCRData>;
  } | null;
  hasAIData: boolean;
  customerId: string;
  formatCurrency: (amount: number) => string;
}

export function DSCRSection({ aiData, customerId, formatCurrency }: DSCRSectionProps) {
  const initialData: DSCRData = {
    customerName: aiData?.dscr?.customerName || '',
    analysisYear: aiData?.dscr?.analysisYear || new Date().getFullYear(),
    netOperatingIncome: aiData?.dscr?.netOperatingIncome || 0,
    totalDebtService: aiData?.dscr?.totalDebtService || 0,
    dscrRatio: aiData?.dscr?.dscrRatio || 0,
    dscrStatus: aiData?.dscr?.dscrStatus || 'Unknown',
  };

  const {
    isEditing,
    editedData,
    isSaving,
    handleEdit,
    handleSave,
    handleCancel,
    updateField,
  } = useEditableData<DSCRData>({
    initialData,
    updateFn: (data) => customersApi.updateWithAIData(customerId, { dscr: data }, 100, []),
    queryKey: ['customer', customerId],
  });

  const updateDSCRField = (field: keyof DSCRData, value: string | number) => {
    updateField(field, value);
    
    // Auto-calculate ratio
    if (field === 'netOperatingIncome' || field === 'totalDebtService') {
      const noi = field === 'netOperatingIncome' ? Number(value) : Number(editedData.netOperatingIncome);
      const debt = field === 'totalDebtService' ? Number(value) : Number(editedData.totalDebtService);
      const ratio = noi / (debt || 1);
      updateField('dscrRatio', ratio);
      
      // Update status
      let status = 'Unknown';
      if (ratio >= 1.25) status = 'Pass';
      else if (ratio >= 1.0) status = 'Warning';
      else status = 'Fail';
      updateField('dscrStatus', status);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pass': 
        return {
          bg: 'bg-[#E6F6EE]',
          text: 'text-[#00A950]',
          border: 'border-[#CDEBDC]',
          icon: <TrendingUp className="w-3.5 h-3.5" />,
          label: 'ผ่านเกณฑ์ (Safe)',
          statusBg: 'bg-[#00A950]'
        };
      case 'warning': 
        return {
          bg: 'bg-[#FFF9E6]',
          text: 'text-[#947600]',
          border: 'border-[#F8E8B3]',
          icon: <AlertCircle className="w-3.5 h-3.5" />,
          label: 'เฝ้าระวัง (Warning)',
          statusBg: 'bg-[#FFD324]'
        };
      case 'fail': 
        return {
          bg: 'bg-[#FFF0F0]',
          text: 'text-[#E03131]',
          border: 'border-[#F8D7D7]',
          icon: <TrendingDown className="w-3.5 h-3.5" />,
          label: 'ไม่ผ่านเกณฑ์ (Risk)',
          statusBg: 'bg-[#E03131]'
        };
      default: 
        return { 
          bg: 'bg-gray-100', 
          text: 'text-gray-500', 
          border: 'border-gray-200', 
          icon: <HelpCircle className="w-3.5 h-3.5" />, 
          label: 'Unknown',
          statusBg: 'bg-gray-500'
        };
    }
  };

  const config = getStatusConfig(String(editedData.dscrStatus));

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white rounded-[24px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-500">
      <CardHeader className="p-8 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-[#E6F6EE] text-[#00A950] shadow-sm">
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A1D1F]">การวิเคราะห์ DSCR</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F767E]">Debt Service Coverage Ratio</span>
                <div className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-[10px] text-[#00A950] font-bold">ปีงบประมาณ {editedData.analysisYear}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button 
                onClick={handleEdit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-100 text-sm font-bold hover:bg-gray-50 text-[#1A1D1F] transition-all"
              >
                <Edit2 size={16} className="text-[#00A950]" /> แก้ไขข้อมูล
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={handleCancel}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#6F767E] hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#00A950] text-white text-sm font-bold shadow-lg shadow-green-100 hover:bg-[#008F44] transition-all disabled:opacity-50"
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <div className="space-y-8">
          {/* Main Visual Ratio Display */}
          <div className={`relative overflow-hidden rounded-[28px] p-8 border transition-all duration-700 ${config.bg} ${config.border}`}>
            <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-20 -mt-20 blur-3xl" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex items-center gap-8">
                <div className="relative">
                  <div className={`w-32 h-32 rounded-full bg-white shadow-xl flex items-center justify-center border-4 ${config.border}`}>
                    <span className="text-4xl font-black text-[#1A1D1F] tracking-tighter">
                      {Number(editedData.dscrRatio || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-4 border-white ${config.statusBg} flex items-center justify-center text-white shadow-lg`}>
                    {config.icon}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`${config.bg} ${config.text} border ${config.border} px-4 py-1.5`}>
                      <span className="mr-1.5">{config.icon}</span>
                      {config.label}
                    </Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1A1D1F]">ดัชนีความสามารถชำระหนี้</h3>
                  <p className="text-sm text-[#6F767E] max-w-xs mt-1">
                    สะท้อนศักยภาพของกิจการในการบริหารจัดการภาระหนี้สินคงค้าง
                  </p>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-md px-6 py-5 rounded-2xl border border-white shadow-sm flex flex-col items-center">
                <p className="text-[10px] font-bold text-[#6F767E] uppercase tracking-widest mb-2">เกณฑ์มาตรฐานกสิกร</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-[#00A950]">≥ 1.25</span>
                  <CheckCircle2 size={20} className="text-[#00A950]" />
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* NOI Field */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#6F767E] uppercase tracking-wider">
                  กำไรสุทธิจากการดำเนินงาน (NOI)
                </label>
                <HelpCircle size={14} className="text-gray-300 cursor-pointer hover:text-[#00A950]" />
              </div>
              {isEditing ? (
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 group-focus-within:text-[#00A950]">฿</span>
                  <Input 
                    type="number" 
                    value={Number(editedData.netOperatingIncome)} 
                    onChange={(e) => updateDSCRField('netOperatingIncome', parseFloat(e.target.value) || 0)} 
                    className="w-full h-14 pl-10 pr-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A950] focus:bg-white text-xl font-bold transition-all"
                  />
                </div>
              ) : (
                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] group hover:border-[#00A950] transition-all">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-[#6F767E]">฿</span>
                    <p className="text-2xl font-black text-[#1A1D1F]">{formatCurrency(Number(editedData.netOperatingIncome))}</p>
                  </div>
                  <p className="text-[10px] text-[#6F767E] mt-1 font-medium italic">Net Operating Income</p>
                </div>
              )}
            </div>

            {/* Debt Service Field */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#6F767E] uppercase tracking-wider">
                  ภาระหนี้สินที่ต้องชำระ (Debt Service)
                </label>
                <HelpCircle size={14} className="text-gray-300 cursor-pointer hover:text-[#00A950]" />
              </div>
              {isEditing ? (
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 group-focus-within:text-[#00A950]">฿</span>
                  <Input 
                    type="number" 
                    value={Number(editedData.totalDebtService)} 
                    onChange={(e) => updateDSCRField('totalDebtService', parseFloat(e.target.value) || 0)} 
                    className="w-full h-14 pl-10 pr-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-[#00A950] focus:bg-white text-xl font-bold transition-all"
                  />
                </div>
              ) : (
                <div className="p-5 bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] group hover:border-[#00A950] transition-all">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs font-bold text-[#6F767E]">฿</span>
                    <p className="text-2xl font-black text-[#1A1D1F]">{formatCurrency(Number(editedData.totalDebtService))}</p>
                  </div>
                  <p className="text-[10px] text-[#6F767E] mt-1 font-medium italic">Total Debt Obligation</p>
                </div>
              )}
            </div>
          </div>

          {/* Formula & Insights Box */}
          <div className="bg-[#1A1D1F] rounded-[24px] p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00A950] opacity-20 blur-[60px] group-hover:opacity-40 transition-opacity" />
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#00A950] flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold">สูตรการคำนวณ</h4>
                  <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full text-gray-400">Standard Formula</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-mono">
                  DSCR = <span className="text-white">NOI</span> / <span className="text-white">Debt Service</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#00A950]" />
                  <p className="text-[10px] text-gray-500">
                    อัตราส่วนที่สูงกว่า 1.25 บ่งบอกถึงสภาพคล่องที่แข็งแกร่งและความเสี่ยงต่ำในการผิดนัดชำระหนี้
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
