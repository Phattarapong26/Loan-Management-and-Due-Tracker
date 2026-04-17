import { Shield, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface CollateralSectionProps {
  data: ParsedBusinessProfile['collaterals'];
  onUpdate: (newData: ParsedBusinessProfile['collaterals']) => void;
}

export function CollateralSection({ data, onUpdate }: CollateralSectionProps) {
  const addCollateral = () => {
    const newItems = [...(data || []), { type: '', description: '', estimatedValue: 0 }];
    onUpdate(newItems);
  };

  const removeCollateral = (index: number) => {
    const newItems = [...(data || [])];
    newItems.splice(index, 1);
    onUpdate(newItems);
  };

  const updateCollateral = (index: number, field: keyof NonNullable<ParsedBusinessProfile['collaterals']>[number], value: string | number) => {
    const newItems = [...(data || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate(newItems);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Shield} title="หลักประกัน" />
        <Button size="sm" onClick={addCollateral} className="h-8 bg-primary/10 text-primary hover:bg-primary/20">
          <Plus className="w-4 h-4 mr-1" /> เพิ่มหลักประกัน
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">ประเภท</th>
              <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">รายละเอียด</th>
              <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">มูลค่าประเมิน</th>
              <th className="text-right py-2.5 px-3 text-muted-foreground font-medium w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((collateral, idx) => (
              <tr key={idx} className="border-b border-border/50 group hover:bg-muted/5 transition-colors">
                <td className="py-2 px-1">
                  <Input 
                    value={collateral.type || ''} 
                    onChange={(e) => updateCollateral(idx, 'type', e.target.value)}
                    className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                  />
                </td>
                <td className="py-2 px-1">
                  <Input 
                    value={collateral.description || ''} 
                    onChange={(e) => updateCollateral(idx, 'description', e.target.value)}
                    className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                  />
                </td>
                <td className="py-2 px-1">
                  <Input 
                    type="number"
                    value={collateral.estimatedValue || 0} 
                    onChange={(e) => updateCollateral(idx, 'estimatedValue', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border font-medium"
                  />
                </td>
                <td className="py-2 px-1 text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeCollateral(idx)}
                    className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(data || []).length === 0 && (
          <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/5">
            ไม่พบข้อมูลหลักประกัน
          </div>
        )}
      </div>
    </div>
  );
}
