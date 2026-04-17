import { TrendingUp, Plus, Trash2, Edit2, BarChart3, DollarSign, Target } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { useEditableData } from '../../hooks/useEditableData';
import { customersApi } from '@/shared/lib/api-endpoints';

interface MonthlyProjection {
  month: number;
  projectedRevenue: number;
  projectedCost: number;
  projectedProfit: number;
}

type RevenueProjectionData = {
  projectionYear: number;
  growthRate: number;
  monthlyProjections: MonthlyProjection[];
  annualTotal: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
  };
} & Record<string, unknown>;

interface RevenueProjectionSectionProps {
  aiData?: {
    revenueProjection?: Partial<RevenueProjectionData>;
  } | null;
  hasAIData: boolean;
  customerId: string;
  formatCurrency: (amount: number) => string;
}

export function RevenueProjectionSection({ aiData, customerId, formatCurrency }: RevenueProjectionSectionProps) {
  const initialData: RevenueProjectionData = {
    projectionYear: aiData?.revenueProjection?.projectionYear || new Date().getFullYear() + 1,
    growthRate: aiData?.revenueProjection?.growthRate || 0,
    monthlyProjections: aiData?.revenueProjection?.monthlyProjections || [],
    annualTotal: aiData?.revenueProjection?.annualTotal || { totalRevenue: 0, totalCost: 0, totalProfit: 0 },
  };

  const {
    isEditing,
    editedData,
    isSaving,
    handleEdit,
    handleSave,
    handleCancel,
    updateField,
  } = useEditableData<RevenueProjectionData>({
    initialData,
    updateFn: (data) => customersApi.updateWithAIData(customerId, { revenueProjection: data }, 100, []),
    queryKey: ['customer', customerId],
  });

  const calculateTotals = (projections: MonthlyProjection[]) => {
    const totalRevenue = projections.reduce((s, m) => s + (Number(m.projectedRevenue) || 0), 0);
    const totalCost = projections.reduce((s, m) => s + (Number(m.projectedCost) || 0), 0);
    const totalProfit = projections.reduce((s, m) => s + (Number(m.projectedProfit) || 0), 0);
    return { totalRevenue, totalCost, totalProfit };
  };

  const updateMonthlyField = (index: number, field: keyof MonthlyProjection, value: number) => {
    const newProjections = [...(editedData.monthlyProjections as MonthlyProjection[])];
    newProjections[index] = { ...newProjections[index], [field]: value };
    
    // Auto-calculate profit if revenue or cost changes
    if (field === 'projectedRevenue' || field === 'projectedCost') {
      newProjections[index].projectedProfit = (Number(newProjections[index].projectedRevenue) || 0) - (Number(newProjections[index].projectedCost) || 0);
    }

    updateField('monthlyProjections', newProjections);
    updateField('annualTotal', calculateTotals(newProjections));
  };

  const addMonth = () => {
    const nextMonth = (editedData.monthlyProjections as MonthlyProjection[]).length + 1;
    if (nextMonth > 12) return;
    const newProjections = [...(editedData.monthlyProjections as MonthlyProjection[]), { month: nextMonth, projectedRevenue: 0, projectedCost: 0, projectedProfit: 0 }];
    updateField('monthlyProjections', newProjections);
  };

  const removeMonth = (index: number) => {
    const newProjections = [...(editedData.monthlyProjections as MonthlyProjection[])];
    newProjections.splice(index, 1);
    updateField('monthlyProjections', newProjections);
    updateField('annualTotal', calculateTotals(newProjections));
  };

  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  const profitMargin = (editedData.annualTotal as RevenueProjectionData['annualTotal']).totalRevenue > 0
    ? ((editedData.annualTotal as RevenueProjectionData['annualTotal']).totalProfit / (editedData.annualTotal as RevenueProjectionData['annualTotal']).totalRevenue) * 100
    : 0;

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white rounded-[24px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-500">
      <CardHeader className="p-8 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-[#E6F6EE] text-[#00A950] shadow-sm">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A1D1F]">ประมาณการรายได้</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F767E]">Revenue Projection & Forecast</span>
                <div className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-[10px] text-[#00A950] font-bold">ปี {editedData.projectionYear}</span>
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
          {/* Main Visual Display */}
          <div className="relative overflow-hidden rounded-[28px] p-8 border bg-gradient-to-br from-[#E6F6EE] to-[#F0FAF4] border-[#CDEBDC]">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-30 rounded-full -mr-20 -mt-20 blur-3xl" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex items-center gap-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-white shadow-xl flex items-center justify-center border-4 border-[#CDEBDC]">
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-[#6F767E] uppercase tracking-wider mb-1">Growth</div>
                      <div className="text-3xl font-black text-[#00A950] tracking-tighter">
                        +{Number(editedData.growthRate).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-4 border-white bg-[#00A950] flex items-center justify-center text-white shadow-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold bg-[#E6F6EE] text-[#00A950] border border-[#CDEBDC]">
                      <Target className="w-3.5 h-3.5 mr-1.5" /> เป้าหมายการเติบโต
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1A1D1F]">อัตราการเติบโตรายได้</h3>
                  <p className="text-sm text-[#6F767E] max-w-xs mt-1">
                    ประมาณการเติบโตของรายได้ในปี {editedData.projectionYear}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 backdrop-blur-md px-5 py-4 rounded-2xl border border-white shadow-sm">
                  <p className="text-[10px] font-bold text-[#6F767E] uppercase tracking-widest mb-1">Profit Margin</p>
                  <p className="text-lg font-black text-[#00A950]">{profitMargin.toFixed(1)}%</p>
                </div>
                <div className="bg-white/80 backdrop-blur-md px-5 py-4 rounded-2xl border border-white shadow-sm">
                  <p className="text-[10px] font-bold text-[#6F767E] uppercase tracking-widest mb-1">Months</p>
                  <p className="text-lg font-black text-[#1A1D1F]">{(editedData.monthlyProjections as MonthlyProjection[]).length}/12</p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border-2 border-gray-100 hover:border-[#00A950] transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#E6F6EE] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-5 h-5 text-[#00A950]" />
                </div>
                <p className="text-xs font-bold text-[#6F767E] uppercase tracking-wider">รายได้รวมทั้งปี</p>
              </div>
              <p className="text-2xl font-black text-[#1A1D1F]">
                {formatCurrency((editedData.annualTotal as RevenueProjectionData['annualTotal']).totalRevenue)}
              </p>
              <p className="text-[10px] text-[#6F767E] mt-1">Total Annual Revenue</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border-2 border-gray-100 hover:border-[#00A950] transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF9E6] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5 text-[#947600]" />
                </div>
                <p className="text-xs font-bold text-[#6F767E] uppercase tracking-wider">ต้นทุนรวมทั้งปี</p>
              </div>
              <p className="text-2xl font-black text-[#1A1D1F]">
                {formatCurrency((editedData.annualTotal as RevenueProjectionData['annualTotal']).totalCost)}
              </p>
              <p className="text-[10px] text-[#6F767E] mt-1">Total Annual Cost</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#00A950] to-[#008F44] text-white shadow-lg shadow-green-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-90">กำไรรวมทั้งปี</p>
              </div>
              <p className="text-2xl font-black">
                {formatCurrency((editedData.annualTotal as RevenueProjectionData['annualTotal']).totalProfit)}
              </p>
              <p className="text-[10px] opacity-75 mt-1">Total Annual Profit</p>
            </div>
          </div>

          {/* Monthly Projections Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-[#1A1D1F]">ตารางประมาณการรายเดือน</h4>
                <p className="text-xs text-[#6F767E]">Monthly Revenue & Cost Projection</p>
              </div>
              {isEditing && (
                <Button 
                  onClick={addMonth} 
                  size="sm" 
                  variant="outline" 
                  className="h-8 gap-1 hover:bg-green-50 hover:border-green-300 hover:text-[#00A950]"
                  disabled={(editedData.monthlyProjections as MonthlyProjection[]).length >= 12}
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มเดือน
                </Button>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border-2 border-gray-100 shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-[#E6F6EE] to-[#F0FAF4] border-b-2 border-[#CDEBDC]">
                  <tr>
                    <th className="text-left py-3 px-4 font-bold text-[#1A1D1F]">เดือน</th>
                    <th className="text-right py-3 px-4 font-bold text-[#1A1D1F]">รายได้</th>
                    <th className="text-right py-3 px-4 font-bold text-[#1A1D1F]">ต้นทุน/ค่าใช้จ่าย</th>
                    <th className="text-right py-3 px-4 font-bold text-[#1A1D1F]">กำไรคาดการณ์</th>
                    {isEditing && <th className="w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(editedData.monthlyProjections as MonthlyProjection[]).map((m, idx) => (
                    <tr key={idx} className="hover:bg-green-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#1A1D1F]">
                          {monthNames[m.month - 1] || `เดือนที่ ${m.month}`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <Input 
                            type="number" 
                            value={m.projectedRevenue} 
                            onChange={(e) => updateMonthlyField(idx, 'projectedRevenue', parseFloat(e.target.value) || 0)} 
                            className="h-8 text-xs text-right font-bold border-2 focus:border-[#00A950]"
                          />
                        ) : (
                          <span className="font-bold text-[#00A950]">{formatCurrency(m.projectedRevenue)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <Input 
                            type="number" 
                            value={m.projectedCost} 
                            onChange={(e) => updateMonthlyField(idx, 'projectedCost', parseFloat(e.target.value) || 0)} 
                            className="h-8 text-xs text-right font-bold border-2 focus:border-[#00A950]"
                          />
                        ) : (
                          <span className="font-bold text-[#6F767E]">{formatCurrency(m.projectedCost)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${m.projectedProfit >= 0 ? 'text-[#00A950]' : 'text-[#E03131]'}`}>
                          {formatCurrency(m.projectedProfit)}
                        </span>
                      </td>
                      {isEditing && (
                        <td className="py-3 px-4 text-right">
                          <Button 
                            onClick={() => removeMonth(idx)} 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 w-7 p-0 text-destructive hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {(editedData.monthlyProjections as MonthlyProjection[]).length === 0 && (
                    <tr>
                      <td colSpan={isEditing ? 5 : 4} className="py-12 text-center text-sm text-[#6F767E]">
                        ไม่มีข้อมูลประมาณการรายเดือน
                      </td>
                    </tr>
                  )}
                </tbody>
                {(editedData.monthlyProjections as MonthlyProjection[]).length > 0 && (
                  <tfoot className="bg-gradient-to-r from-[#E6F6EE] to-[#F0FAF4] border-t-2 border-[#CDEBDC]">
                    <tr>
                      <td className="py-3 px-4 font-bold text-[#1A1D1F]">รวมทั้งหมด</td>
                      <td className="py-3 px-4 text-right font-black text-[#00A950]">
                        {formatCurrency((editedData.annualTotal as RevenueProjectionData['annualTotal']).totalRevenue)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#6F767E]">
                        {formatCurrency((editedData.annualTotal as RevenueProjectionData['annualTotal']).totalCost)}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#00A950]">
                        {formatCurrency((editedData.annualTotal as RevenueProjectionData['annualTotal']).totalProfit)}
                      </td>
                      {isEditing && <td></td>}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Formula Box */}
          <div className="bg-[#1A1D1F] rounded-[24px] p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00A950] opacity-20 blur-[60px] group-hover:opacity-40 transition-opacity" />
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#00A950] flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold">สูตรการคำนวณ</h4>
                  <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full text-gray-400">Standard Formula</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-mono">
                  Projected Profit = <span className="text-white">Revenue</span> - <span className="text-white">Cost</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#00A950]" />
                  <p className="text-[10px] text-gray-500">
                    ประมาณการรายได้ช่วยในการวางแผนการเงินและการลงทุนในอนาคต
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
