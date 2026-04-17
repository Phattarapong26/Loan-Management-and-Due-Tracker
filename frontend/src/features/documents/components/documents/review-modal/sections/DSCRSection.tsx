import { BarChart3, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface DSCRSectionProps {
  data: ParsedBusinessProfile['dscr'];
  onUpdate: (newData: ParsedBusinessProfile['dscr']) => void;
}

export function DSCRSection({ data, onUpdate }: DSCRSectionProps) {
  const updateField = (field: keyof NonNullable<ParsedBusinessProfile['dscr']>, value: string | number) => {
    onUpdate({ 
      ...(data || { 
        customerName: '', 
        analysisYear: new Date().getFullYear(), 
        netOperatingIncome: 0, 
        totalDebtService: 0, 
        dscrRatio: 0, 
        dscrStatus: 'ปกติ' 
      }), 
      [field]: value 
    });
  };

  return (
    <div className="space-y-6">
      <SectionTitle icon={BarChart3} title="DSCR (Debt Service Coverage Ratio)" />
      {!data && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => updateField('customerName', '')}
          className="mb-4"
        >
          <Plus className="w-4 h-4 mr-2" /> เพิ่มข้อมูล DSCR
        </Button>
      )}
      
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-muted/20 p-6 rounded-xl border border-border/50">
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ชื่อลูกค้า</p>
            <Input 
              value={data.customerName || ''} 
              onChange={(e) => updateField('customerName', e.target.value)}
              className="bg-background border-border/50 focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ปีที่วิเคราะห์</p>
            <Input 
              type="number"
              value={data.analysisYear || ''} 
              onChange={(e) => updateField('analysisYear', parseInt(e.target.value) || 0)}
              className="bg-background border-border/50 focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">รายได้ดำเนินงานสุทธิ</p>
            <Input 
              type="number"
              value={data.netOperatingIncome || 0} 
              onChange={(e) => updateField('netOperatingIncome', parseFloat(e.target.value) || 0)}
              className="bg-background border-border/50 focus:border-primary/50 transition-colors font-mono"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ภาระหนี้รวม</p>
            <Input 
              type="number"
              value={data.totalDebtService || 0} 
              onChange={(e) => updateField('totalDebtService', parseFloat(e.target.value) || 0)}
              className="bg-background border-border/50 focus:border-primary/50 transition-colors font-mono"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">อัตราส่วน DSCR</p>
            <Input 
              type="number"
              step="0.01"
              value={data.dscrRatio || 0} 
              onChange={(e) => updateField('dscrRatio', parseFloat(e.target.value) || 0)}
              className="bg-primary/5 border-primary/20 text-primary font-bold transition-colors font-mono"
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">สถานะ</p>
            <Input 
              value={data.dscrStatus || ''} 
              onChange={(e) => updateField('dscrStatus', e.target.value)}
              className="bg-background border-border/50 focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
