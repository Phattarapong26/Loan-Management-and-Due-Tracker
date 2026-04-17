import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Plus, Trash2, BarChart3 } from 'lucide-react';
import { customersApi } from '@/shared/lib/api-endpoints';
import { EditableSection } from '../EditableSection';
import { useEditableData } from '../../hooks/useEditableData';
import type { ParsedBusinessProfile } from '@/features/documents/utils/parsers/excel-parser';

interface FinancialSectionProps {
  aiData?: ParsedBusinessProfile | null;
  hasAIData: boolean;
  customerId: string;
  formatCurrency: (amount: number) => string;
}

export function FinancialSection({ aiData, customerId, formatCurrency }: FinancialSectionProps) {
  const initialData = {
    financialStatements: aiData?.financialStatements || [],
    balanceSheets: aiData?.balanceSheets || [],
  };

  const {
    isEditing,
    editedData,
    isSaving,
    handleEdit,
    handleSave,
    handleCancel,
    updateField,
  } = useEditableData({
    initialData,
    updateFn: (data) => customersApi.updateWithAIData(customerId, data, 100, []),
    queryKey: ['customer', customerId],
  });

  const statements = editedData.financialStatements as ParsedBusinessProfile['financialStatements'];
  const balanceSheets = editedData.balanceSheets as ParsedBusinessProfile['balanceSheets'];

  const addStatement = () => {
    const newItems = [...(statements || []), { lineItem: '', year: '', amount: 0, category: 'other' as const }];
    updateField('financialStatements', newItems);
  };

  const removeStatement = (index: number) => {
    const newItems = [...(statements || [])];
    newItems.splice(index, 1);
    updateField('financialStatements', newItems);
  };

  const updateStatement = (index: number, field: keyof NonNullable<ParsedBusinessProfile['financialStatements']>[number], value: string | number) => {
    const newItems = [...(statements || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    updateField('financialStatements', newItems);
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
    <div className="space-y-6">
      <Card className="overflow-hidden border-none shadow-premium bg-white/80 backdrop-blur-md">
        <CardHeader>
          <EditableSection
            title="งบแสดงฐานะการเงินและผลการดำเนินงาน"
            icon={<BarChart3 className="h-5 w-5" />}
            isEditing={isEditing}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isSaving}
          >
            {null}
          </EditableSection>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* Add Statement Button */}
          {isEditing && (
            <div className="flex justify-end">
              <Button size="sm" onClick={addStatement} className="h-8 bg-primary/5 text-primary hover:bg-primary/10 border-none">
                <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
              </Button>
            </div>
          )}

          {/* Income Statement Section */}
          <div className="space-y-6">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
              <div className="w-2 h-5 bg-green-500 rounded"></div>
              งบกำไรขาดทุน (Income Statement)
            </h3>
            
            {Object.keys(byYear).length > 0 && incomeStatementItems.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.entries(byYear).map(([year, items], groupIdx) => {
                  const yearIncomeItems = items.filter(item => item.category !== 'balance-sheet');
                  if (yearIncomeItems.length === 0) return null;
                  
                  return (
                    <Card key={groupIdx} className="border-2 border-green-100 bg-gradient-to-br from-green-50/50 to-white shadow-lg hover:shadow-xl transition-all">
                      <CardHeader className="pb-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <BarChart3 className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold">{year}</h4>
                              <p className="text-xs text-white/80">{yearIncomeItems.length} รายการ</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-1">
                          {yearIncomeItems.map((item, idx) => (
                            <div key={idx} className="group flex items-center justify-between py-2 px-3 rounded-lg hover:bg-green-50/50 transition-colors">
                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <div className="space-y-1">
                                    <Input 
                                      value={item.lineItem || ''} 
                                      onChange={(e) => updateStatement(item.originalIdx, 'lineItem', e.target.value)}
                                      className="h-8 text-xs bg-white border-green-200"
                                    />
                                    <select
                                      value={item.category || 'other'}
                                      onChange={(e) => updateStatement(item.originalIdx, 'category', e.target.value)}
                                      className="h-7 text-xs bg-white border border-green-200 rounded px-2 w-full"
                                    >
                                      <option value="revenue">รายได้</option>
                                      <option value="cogs">ต้นทุน</option>
                                      <option value="expense">ค่าใช้จ่าย</option>
                                      <option value="profit">กำไร</option>
                                      <option value="other">อื่นๆ</option>
                                      <option value="balance-sheet">งบดุล</option>
                                    </select>
                                  </div>
                                ) : (
                                  <span className={`text-sm truncate block ${
                                    item.category === 'profit' ? 'font-bold text-primary' : 
                                    item.category === 'revenue' ? 'font-semibold text-green-700' : 
                                    'text-foreground/80'
                                  }`}>{item.lineItem}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                {isEditing ? (
                                  <Input 
                                    type="number"
                                    value={item.amount || 0} 
                                    onChange={(e) => updateStatement(item.originalIdx, 'amount', parseFloat(e.target.value) || 0)}
                                    className="h-8 w-32 text-xs text-right bg-white border-green-200"
                                  />
                                ) : (
                                  <span className={`text-sm font-mono whitespace-nowrap ${
                                    item.category === 'profit' ? 'font-bold text-primary text-base' : 
                                    item.category === 'revenue' ? 'font-semibold text-green-700' : 
                                    'text-foreground/70'
                                  }`}>
                                    {formatCurrency(item.amount || 0)}
                                  </span>
                                )}
                                {isEditing && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => removeStatement(item.originalIdx)}
                                    className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/5">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p>ไม่พบข้อมูลงบกำไรขาดทุน</p>
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
              
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {Object.entries(byYear).map(([year, items], groupIdx) => {
                  const yearBalanceItems = items.filter(item => item.category === 'balance-sheet');
                  if (yearBalanceItems.length === 0) return null;
                  
                  return (
                    <Card key={groupIdx} className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white shadow-lg hover:shadow-xl transition-all">
                      <CardHeader className="pb-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <BarChart3 className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold">{year}</h4>
                              <p className="text-xs text-white/80">{yearBalanceItems.length} รายการ</p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-1">
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
                              <div key={idx} className={`group flex items-center justify-between py-2 px-3 rounded-lg transition-colors ${
                                isHeader ? 'bg-blue-100/50 mt-3 mb-1' : 
                                isTotal ? 'bg-blue-50 font-semibold border-t-2 border-blue-200 mt-2' : 
                                'hover:bg-blue-50/30'
                              }`}>
                                <div className="flex-1 min-w-0">
                                  {isEditing ? (
                                    <Input 
                                      value={item.lineItem || ''} 
                                      onChange={(e) => updateStatement(item.originalIdx, 'lineItem', e.target.value)}
                                      className={`h-8 text-xs bg-white border-blue-200 ${
                                        isHeader ? 'font-bold' : ''
                                      }`}
                                    />
                                  ) : (
                                    <span className={`text-sm truncate block ${
                                      isHeader ? 'font-bold text-blue-700 text-base' :
                                      isTotal ? 'font-bold text-primary' : 
                                      'text-foreground/80'
                                    }`}>{item.lineItem}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                  {isEditing ? (
                                    <Input 
                                      type="number"
                                      value={item.amount || 0} 
                                      onChange={(e) => updateStatement(item.originalIdx, 'amount', parseFloat(e.target.value) || 0)}
                                      className="h-8 w-32 text-xs text-right bg-white border-blue-200"
                                    />
                                  ) : (
                                    <span className={`text-sm font-mono whitespace-nowrap ${
                                      isTotal ? 'font-bold text-primary text-base' : 
                                      isHeader ? 'text-transparent' :
                                      'text-foreground/70'
                                    }`}>
                                      {item.amount === 0 && isHeader ? '' : formatCurrency(item.amount || 0)}
                                    </span>
                                  )}
                                  {isEditing && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => removeStatement(item.originalIdx)}
                                      className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legacy Balance Sheet Summary (if exists and no detailed items) */}
          {balanceSheets && balanceSheets.length > 0 && balanceSheetItems.length === 0 && (
            <div className="pt-8 border-t-2 border-border">
              <h4 className="text-sm font-bold text-foreground/80 flex items-center gap-2 mb-4">
                <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                งบดุล (Balance Sheet) - สรุป
              </h4>
              <div className="overflow-x-auto rounded-xl border border-border">
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
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(bs.totalAssets || 0)}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatCurrency(bs.totalLiabilities || 0)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-primary">{formatCurrency(bs.equity || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
