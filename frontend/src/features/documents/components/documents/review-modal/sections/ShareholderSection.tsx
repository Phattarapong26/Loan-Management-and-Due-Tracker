/**
 * Shareholder Section Component
 */

import { useState } from "react";
import { Users, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface ShareholderSectionProps {
  data: ParsedBusinessProfile['shareholders'];
  onUpdate: (newData: ParsedBusinessProfile['shareholders']) => void;
}

export function ShareholderSection({ data, onUpdate }: ShareholderSectionProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addRow = () => {
    const newItems = [...(data || []), { name: '', sharePercentage: 0, shareValue: 0, hasSigningAuthority: false, conditions: '' }];
    onUpdate(newItems);
    setEditingIndex(newItems.length - 1);
  };

  const removeRow = (index: number) => {
    const newItems = [...(data || [])];
    newItems.splice(index, 1);
    onUpdate(newItems);
  };

  const updateRow = (index: number, field: keyof NonNullable<ParsedBusinessProfile['shareholders']>[number], value: string | number | boolean) => {
    const newItems = [...(data || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate(newItems);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <SectionTitle icon={Users} title="ผู้ถือหุ้น" />
        <Button size="sm" onClick={addRow} className="bg-primary/10 text-primary hover:bg-primary/20">
          <Plus className="w-4 h-4 mr-1" /> เพิ่มรายชื่อ
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">ชื่อ</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">สัดส่วน (%)</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium">มูลค่า</th>
              <th className="text-center py-2 px-3 text-muted-foreground font-medium w-24">อำนาจลงนาม</th>
              <th className="text-left py-2 px-3 text-muted-foreground font-medium">เงื่อนไข</th>
              <th className="text-right py-2 px-3 text-muted-foreground font-medium w-20">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((shareholder, idx) => (
              <tr key={idx} className="border-b border-border/50 group">
                <td className="py-2 px-3">
                  <Input 
                    value={shareholder.name || ''} 
                    onChange={(e) => updateRow(idx, 'name', e.target.value)}
                    className="h-8 text-xs bg-transparent border-transparent hover:border-border focus:bg-card"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <Input 
                    type="number"
                    value={shareholder.sharePercentage || 0} 
                    onChange={(e) => updateRow(idx, 'sharePercentage', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border focus:bg-card"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <Input 
                    type="number"
                    value={shareholder.shareValue || 0} 
                    onChange={(e) => updateRow(idx, 'shareValue', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border focus:bg-card"
                  />
                </td>
                <td className="py-2 px-3 text-center">
                  <input 
                    type="checkbox"
                    checked={shareholder.hasSigningAuthority || false}
                    onChange={(e) => updateRow(idx, 'hasSigningAuthority', e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20"
                  />
                </td>
                <td className="py-2 px-3">
                  <Input 
                    value={shareholder.conditions || ''} 
                    onChange={(e) => updateRow(idx, 'conditions', e.target.value)}
                    className="h-8 text-xs bg-transparent border-transparent hover:border-border focus:bg-card"
                  />
                </td>
                <td className="py-2 px-3 text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeRow(idx)}
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
          <div className="py-8 text-center text-muted-foreground border-b border-border/50">
            ไม่พบข้อมูลผู้ถือหุ้น
          </div>
        )}
      </div>
    </div>
  );
}
