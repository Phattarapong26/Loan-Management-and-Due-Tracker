import { Building2, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface BusinessHistorySectionProps {
  data: ParsedBusinessProfile['businessHistory'];
  onUpdate: (newData: ParsedBusinessProfile['businessHistory']) => void;
}

export function BusinessHistorySection({ data, onUpdate }: BusinessHistorySectionProps) {
  const updateField = (field: keyof NonNullable<ParsedBusinessProfile['businessHistory']>, value: any) => {
    onUpdate({ 
      ...(data || { 
        establishmentYear: 0, 
        founder: '', 
        businessEvolution: '', 
        majorMilestones: [], 
        productsServices: [], 
        targetMarket: '', 
        mainCustomers: [], 
        competitors: [] 
      }), 
      [field]: value 
    });
  };

  const addItem = (field: 'majorMilestones' | 'productsServices' | 'mainCustomers' | 'competitors') => {
    const current = data?.[field] || [];
    let newItem: any;
    if (field === 'majorMilestones') newItem = { year: new Date().getFullYear(), event: '' };
    else newItem = '';
    
    updateField(field, [...current, newItem]);
  };

  const removeItem = (field: 'majorMilestones' | 'productsServices' | 'mainCustomers' | 'competitors', index: number) => {
    const current = data?.[field] || [];
    updateField(field, current.filter((_, i) => i !== index));
  };

  const updateArrayItem = (field: 'majorMilestones' | 'productsServices' | 'mainCustomers' | 'competitors', index: number, value: any, subfield?: string) => {
    const current = [...(data?.[field] || [])];
    if (subfield && typeof current[index] === 'object') {
      current[index] = { ...current[index], [subfield]: value };
    } else {
      current[index] = value;
    }
    updateField(field, current);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Building2} title="ประวัติธุรกิจ" />
        {!data && (
          <Button variant="outline" size="sm" onClick={() => updateField('founder', '')}>
            <Plus className="w-4 h-4 mr-2" /> เพิ่มข้อมูลประวัติธุรกิจ
          </Button>
        )}
      </div>

      {data && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-muted/10 p-6 rounded-xl border border-border/50">
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ปีที่ก่อตั้ง</p>
              <Input 
                type="number"
                value={data.establishmentYear || ''} 
                onChange={(e) => updateField('establishmentYear', parseInt(e.target.value) || 0)}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ผู้ก่อตั้ง</p>
              <Input 
                value={data.founder || ''} 
                onChange={(e) => updateField('founder', e.target.value)}
                className="bg-background"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">วิวัฒนาการธุรกิจ</p>
              <Textarea 
                value={data.businessEvolution || ''} 
                onChange={(e) => updateField('businessEvolution', e.target.value)}
                className="bg-background min-h-[100px]"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ตลาดเป้าหมาย</p>
              <Input 
                value={data.targetMarket || ''} 
                onChange={(e) => updateField('targetMarket', e.target.value)}
                className="bg-background"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Major Milestones */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  เหตุการณ์สำคัญ
                </h4>
                <Button variant="ghost" size="sm" onClick={() => addItem('majorMilestones')} className="h-7 text-primary hover:text-primary hover:bg-primary/5">
                  <Plus className="w-4 h-4 mr-1" /> เพิ่ม
                </Button>
              </div>
              <div className="space-y-3">
                {(data.majorMilestones || []).map((milestone, idx) => (
                  <div key={idx} className="flex gap-2 group items-start">
                    <Input 
                      type="number"
                      className="w-20 h-9 bg-background"
                      value={milestone.year}
                      onChange={(e) => updateArrayItem('majorMilestones', idx, parseInt(e.target.value) || 0, 'year')}
                    />
                    <Input 
                      className="flex-1 h-9 bg-background"
                      value={milestone.event}
                      onChange={(e) => updateArrayItem('majorMilestones', idx, e.target.value, 'event')}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem('majorMilestones', idx)} className="h-9 w-9 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {(!data.majorMilestones || data.majorMilestones.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-4 bg-muted/5 rounded-lg border border-dashed">ยังไม่มีข้อมูลเหตุการณ์สำคัญ</p>
                )}
              </div>
            </div>

            {/* Products & Services */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  สินค้า/บริการ
                </h4>
                <Button variant="ghost" size="sm" onClick={() => addItem('productsServices')} className="h-7 text-primary hover:text-primary hover:bg-primary/5">
                  <Plus className="w-4 h-4 mr-1" /> เพิ่ม
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(data.productsServices || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-background border border-border rounded-full group hover:border-primary/30 transition-colors">
                    <input 
                      className="bg-transparent border-none focus:ring-0 text-sm py-0 w-auto min-w-[60px]"
                      value={item}
                      onChange={(e) => updateArrayItem('productsServices', idx, e.target.value)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem('productsServices', idx)} className="h-4 w-4 p-0 text-muted-foreground hover:text-red-500">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {(!data.productsServices || data.productsServices.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-4 w-full bg-muted/5 rounded-lg border border-dashed">ยังไม่มีข้อมูลสินค้า/บริการ</p>
                )}
              </div>
            </div>

            {/* Main Customers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  ลูกค้าหลัก
                </h4>
                <Button variant="ghost" size="sm" onClick={() => addItem('mainCustomers')} className="h-7 text-primary hover:text-primary hover:bg-primary/5">
                  <Plus className="w-4 h-4 mr-1" /> เพิ่ม
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(data.mainCustomers || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-background border border-border rounded-full group hover:border-primary/30 transition-colors">
                    <input 
                      className="bg-transparent border-none focus:ring-0 text-sm py-0 w-auto min-w-[60px]"
                      value={item}
                      onChange={(e) => updateArrayItem('mainCustomers', idx, e.target.value)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem('mainCustomers', idx)} className="h-4 w-4 p-0 text-muted-foreground hover:text-red-500">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {(!data.mainCustomers || data.mainCustomers.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-4 w-full bg-muted/5 rounded-lg border border-dashed">ยังไม่มีข้อมูลลูกค้าหลัก</p>
                )}
              </div>
            </div>

            {/* Competitors */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  คู่แข่ง
                </h4>
                <Button variant="ghost" size="sm" onClick={() => addItem('competitors')} className="h-7 text-primary hover:text-primary hover:bg-primary/5">
                  <Plus className="w-4 h-4 mr-1" /> เพิ่ม
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {(data.competitors || []).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-background border border-border rounded-full group hover:border-primary/30 transition-colors">
                    <input 
                      className="bg-transparent border-none focus:ring-0 text-sm py-0 w-auto min-w-[60px]"
                      value={item}
                      onChange={(e) => updateArrayItem('competitors', idx, e.target.value)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeItem('competitors', idx)} className="h-4 w-4 p-0 text-muted-foreground hover:text-red-500">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                {(!data.competitors || data.competitors.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-4 w-full bg-muted/5 rounded-lg border border-dashed">ยังไม่มีข้อมูลคู่แข่ง</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
