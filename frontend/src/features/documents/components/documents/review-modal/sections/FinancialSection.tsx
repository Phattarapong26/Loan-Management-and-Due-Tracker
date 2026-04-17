import { BarChart3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface FinancialSectionProps {
  statements: ParsedBusinessProfile['financialStatements'];
  balanceSheets: ParsedBusinessProfile['balanceSheets'];
  onUpdate: (statements: ParsedBusinessProfile['financialStatements'], balanceSheets: ParsedBusinessProfile['balanceSheets']) => void;
}

export function FinancialSection({ statements, balanceSheets, onUpdate }: FinancialSectionProps) {
  const addStatement = () => {
    const newItems = [...(statements || []), { lineItem: '', year: '', amount: 0, category: 'other' as const }];
    onUpdate(newItems, balanceSheets);
  };

  const removeStatement = (index: number) => {
    const newItems = [...(statements || [])];
    newItems.splice(index, 1);
    onUpdate(newItems, balanceSheets);
  };

  const updateStatement = (index: number, field: keyof NonNullable<ParsedBusinessProfile['financialStatements']>[number], value: string | number) => {
    const newItems = [...(statements || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate(newItems, balanceSheets);
  };

  // Group by year
  const byYear = (statements || []).reduce((acc, item, idx) => {
    const year = item.year || 'ไม่ระบุปี';
    if (!acc[year]) acc[year] = [];
    acc[year].push({ ...item, originalIdx: idx });
    return acc;
  }, {} as Record<string, Array<NonNullable<ParsedBusinessProfile['financialStatements']>[number] & { originalIdx: number }>>);

  // Separate income statement and balance sheet items
  const incomeStatementItems = (statements || []).filter(s => s.category !== 'balance-sheet');
  const balanceSheetItems = (statements || []).filter(s => s.category === 'balance-sheet');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <SectionTitle icon={BarChart3} title="งบการเงิน" />
        <Button size="sm" onClick={addStatement} className="h-8 bg-primary/5 text-primary hover:bg-primary/10 border-none">
          <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
        </Button>
      </div>
      
      {/* Income Statement Section */}
      <div className="space-y-6">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
          <div className="w-2 h-5 bg-green-500 rounded"></div>
          งบกำไรขาดทุน (Income Statement)
        </h3>
        
        {Object.entries(byYear).map(([year, items], groupIdx) => {
          const yearIncomeItems = items.filter(item => item.category !== 'balance-sheet');
          if (yearIncomeItems.length === 0) return null;
          
          return (
            <div key={groupIdx} className="space-y-3">
              <h4 className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-primary/50 rounded-full"></div>
                {year}
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">รายการ</th>
                      <th className="text-left py-2.5 px-3 text-muted-foreground font-medium w-32">หมวดหมู่</th>
                      <th className="text-right py-2.5 px-3 text-muted-foreground font-medium w-40">จำนวนเงิน</th>
                      <th className="text-right py-2.5 px-3 text-muted-foreground font-medium w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearIncomeItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-border/50 group hover:bg-muted/5">
                        <td className="py-2 px-1">
                          <Input 
                            value={item.lineItem || ''} 
                            onChange={(e) => updateStatement(item.originalIdx, 'lineItem', e.target.value)}
                            className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <select
                            value={item.category || 'other'}
                            onChange={(e) => updateStatement(item.originalIdx, 'category', e.target.value)}
                            className="h-8 text-xs bg-transparent border-transparent hover:border-border rounded px-2 w-full"
                          >
                            <option value="revenue">รายได้</option>
                            <option value="cogs">ต้นทุน</option>
                            <option value="expense">ค่าใช้จ่าย</option>
                            <option value="profit">กำไร</option>
                            <option value="other">อื่นๆ</option>
                            <option value="balance-sheet">งบดุล</option>
                          </select>
                        </td>
                        <td className="py-2 px-1">
                          <div className={`h-8 flex items-center justify-end px-2 text-xs font-mono ${
                            item.category === 'profit' ? 'font-bold text-primary' : 
                            item.category === 'revenue' ? 'font-medium text-green-600' : 
                            ''
                          }`}>
                            {(item.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="py-2 px-1 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeStatement(item.originalIdx)}
                            className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {incomeStatementItems.length === 0 && (
          <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/5">
            ไม่พบข้อมูลงบกำไรขาดทุน
          </div>
        )}
      </div>

      {/* Balance Sheet Section */}
      {balanceSheetItems.length > 0 && (
        <div className="space-y-6 pt-8 border-t-2 border-border">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
            <div className="w-2 h-5 bg-blue-500 rounded"></div>
            งบดุล (Balance Sheet)
          </h3>
          
          {Object.entries(byYear).map(([year, items], groupIdx) => {
            const yearBalanceItems = items.filter(item => item.category === 'balance-sheet');
            if (yearBalanceItems.length === 0) return null;
            
            return (
              <div key={groupIdx} className="space-y-3">
                <h4 className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-blue-500/50 rounded-full"></div>
                  {year}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-blue-50/50 dark:bg-blue-950/20">
                        <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">รายการ</th>
                        <th className="text-right py-2.5 px-3 text-muted-foreground font-medium w-40">จำนวนเงิน</th>
                        <th className="text-right py-2.5 px-3 text-muted-foreground font-medium w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {yearBalanceItems.map((item, idx) => {
                        // Determine if this is a header row (section title)
                        const isHeader = item.amount === 0 && (
                          item.lineItem.includes('สินทรัพย์') ||
                          item.lineItem.includes('หนี้สิน') ||
                          item.lineItem.includes('ส่วนของผู้')
                        );
                        
                        // Determine if this is a total row
                        const isTotal = item.lineItem.toLowerCase().includes('รวม');
                        
                        return (
                          <tr key={idx} className={`border-b border-border/50 group ${
                            isHeader ? 'bg-blue-50/30 dark:bg-blue-950/10' : 
                            isTotal ? 'bg-muted/20 font-semibold' : 
                            'hover:bg-muted/5'
                          }`}>
                            <td className="py-2 px-1">
                              <Input 
                                value={item.lineItem || ''} 
                                onChange={(e) => updateStatement(item.originalIdx, 'lineItem', e.target.value)}
                                className={`h-8 text-xs bg-transparent border-transparent hover:border-border ${
                                  isHeader ? 'font-bold text-blue-700 dark:text-blue-400' :
                                  isTotal ? 'font-bold' : ''
                                }`}
                              />
                            </td>
                            <td className="py-2 px-1">
                              <div className={`h-8 flex items-center justify-end px-2 text-xs font-mono ${
                                isTotal ? 'font-bold text-primary' : ''
                              }`}>
                                {(item.amount || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </td>
                            <td className="py-2 px-1 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeStatement(item.originalIdx)}
                                className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legacy Balance Sheet Summary (if exists and no detailed items) */}
      {balanceSheets && balanceSheets.length > 0 && balanceSheetItems.length === 0 && (
        <div className="pt-8 border-t-2 border-border">
          <h4 className="text-sm font-bold text-foreground/80 flex items-center gap-2 mb-4">
            <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
            งบดุล (Balance Sheet) - สรุป
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">งวด</th>
                  <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">สินทรัพย์รวม</th>
                  <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">หนี้สินรวม</th>
                  <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">ส่วนของผู้ถือหุ้น</th>
                </tr>
              </thead>
              <tbody>
                {balanceSheets.map((bs, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/5">
                    <td className="py-2 px-3 font-medium">{bs.period}</td>
                    <td className="py-2 px-3 text-right font-mono">{(bs.totalAssets || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right font-mono">{(bs.totalLiabilities || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-primary">{(bs.equity || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
