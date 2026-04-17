import { BarChart3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface RevenueProjectionSectionProps {
  data: ParsedBusinessProfile['revenueProjection'];
  onUpdate: (newData: ParsedBusinessProfile['revenueProjection']) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export function RevenueProjectionSection({ data, onUpdate }: RevenueProjectionSectionProps) {
  const updateField = (field: keyof NonNullable<ParsedBusinessProfile['revenueProjection']>, value: any) => {
    onUpdate({ 
      ...(data || { projectionYear: new Date().getFullYear(), growthRate: 0, monthlyProjections: [], annualTotal: { totalRevenue: 0, totalCost: 0, totalProfit: 0 } }), 
      [field]: value 
    });
  };

  const addMonth = () => {
    const current = data?.monthlyProjections || [];
    const month = current.length + 1;
    if (month > 12) return;
    updateField('monthlyProjections', [...current, { month, projectedRevenue: 0, projectedCost: 0, projectedProfit: 0 }]);
  };

  const removeMonth = (index: number) => {
    const current = data?.monthlyProjections || [];
    updateField('monthlyProjections', current.filter((_, i) => i !== index));
  };

  const updateMonth = (index: number, field: string, value: number) => {
    const current = [...(data?.monthlyProjections || [])];
    current[index] = { ...current[index], [field]: value };
    
    // Recalculate profit for the month
    if (field === 'projectedRevenue' || field === 'projectedCost') {
      current[index].projectedProfit = current[index].projectedRevenue - current[index].projectedCost;
    }
    
    onUpdate({ ...data!, monthlyProjections: current });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle icon={BarChart3} title="ประมาณรายได้ (Revenue Projection)" />
        {!data && (
          <Button variant="outline" size="sm" onClick={() => updateField('growthRate', 0)}>
            <Plus className="w-4 h-4 mr-2" /> เพิ่มข้อมูลประมาณรายได้
          </Button>
        )}
      </div>

      {data && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-muted/10 p-6 rounded-xl border border-border/50">
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ปีที่ประมาณการ</p>
              <Input 
                type="number"
                value={data.projectionYear || ''} 
                onChange={(e) => updateField('projectionYear', parseInt(e.target.value) || 0)}
                className="bg-background border-border/50"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">อัตราการเติบโต (%)</p>
              <div className="flex items-center gap-2">
                <Input 
                  type="number"
                  value={data.growthRate || 0} 
                  onChange={(e) => updateField('growthRate', parseFloat(e.target.value) || 0)}
                  className="bg-background border-border/50 font-mono"
                />
                <span className="text-lg font-bold text-muted-foreground">%</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h4 className="text-sm font-bold text-foreground">ประมาณรายได้รายเดือน</h4>
              <Button variant="ghost" size="sm" onClick={addMonth} className="h-8 text-primary hover:bg-primary/5">
                <Plus className="w-4 h-4 mr-1" /> เพิ่มเดือน
              </Button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border/50">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="text-left py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px] w-24">เดือน</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">รายได้</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">ต้นทุน</th>
                    <th className="text-right py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">กำไร</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 font-mono">
                  {(data.monthlyProjections || []).map((proj, idx) => (
                    <tr key={idx} className="hover:bg-muted/5 transition-colors">
                      <td className="p-2">
                        <Input 
                          type="number"
                          value={proj.month} 
                          onChange={(e) => updateMonth(idx, 'month', parseInt(e.target.value) || 0)}
                          className="h-8 border-transparent text-center bg-transparent"
                        />
                      </td>
                      <td className="p-2">
                        <Input 
                          type="number"
                          value={proj.projectedRevenue} 
                          onChange={(e) => updateMonth(idx, 'projectedRevenue', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right border-transparent bg-transparent"
                        />
                      </td>
                      <td className="p-2">
                        <Input 
                          type="number"
                          value={proj.projectedCost} 
                          onChange={(e) => updateMonth(idx, 'projectedCost', parseFloat(e.target.value) || 0)}
                          className="h-8 text-right border-transparent bg-transparent"
                        />
                      </td>
                      <td className="p-2">
                        <div className={`h-8 flex items-center justify-end px-3 font-bold ${proj.projectedProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatCurrency(proj.projectedProfit)}
                        </div>
                      </td>
                      <td className="p-2 text-center">
                        <Button variant="ghost" size="icon" onClick={() => removeMonth(idx)} className="h-7 w-7 text-muted-foreground hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {(!data.monthlyProjections || data.monthlyProjections.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground italic">คลิกที่ปุ่ม "เพิ่มเดือน" เพื่อเริ่มต้น</td>
                    </tr>
                  )}
                </tbody>
                {data.annualTotal && data.monthlyProjections?.length > 0 && (
                  <tfoot className="bg-primary/5">
                    <tr className="font-bold border-t border-primary/20">
                      <td className="py-3 px-4 text-primary">รวมทั้งปี</td>
                      <td className="py-3 px-4 text-right text-primary">{formatCurrency(data.annualTotal.totalRevenue)}</td>
                      <td className="py-3 px-4 text-right text-primary">{formatCurrency(data.annualTotal.totalCost)}</td>
                      <td className="py-3 px-4 text-right text-primary">{formatCurrency(data.annualTotal.totalProfit)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
