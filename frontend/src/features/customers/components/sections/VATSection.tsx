import { Receipt, Plus, Trash2, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { useEditableData } from '../../hooks/useEditableData';
import { customersApi } from '@/shared/lib/api-endpoints';

interface VATRecord {
  period: string;
  companyName: string;
  taxId: string;
  salesAmount: number;
  salesTax?: number;
  cashSales?: number;
  creditSales?: number;
  purchaseAmount: number;
  purchaseTax?: number;
  taxWithheld: number;
  tableName?: string;
  originalIdx?: number;
}

type VATData = {
  vatRecords: VATRecord[];
} & Record<string, unknown>;

interface VATSectionProps {
  aiData?: {
    vatRecords?: VATRecord[];
  } | null;
  hasAIData: boolean;
  customerId: string;
  formatCurrency: (amount: number) => string;
}

export function VATSection({ aiData, customerId, formatCurrency }: VATSectionProps) {
  const initialData: VATData = {
    vatRecords: aiData?.vatRecords || [],
  };

  const {
    isEditing,
    editedData,
    isSaving,
    handleEdit,
    handleSave,
    handleCancel,
    updateField,
  } = useEditableData<VATData>({
    initialData,
    updateFn: (data) => customersApi.updateWithAIData(customerId, data, 100, []),
    queryKey: ['customer', customerId],
  });

  const updateVATRecord = (index: number, field: keyof VATRecord, value: string | number) => {
    const newData = [...(editedData.vatRecords as VATRecord[])];
    newData[index] = { ...newData[index], [field]: value };
    updateField('vatRecords', newData);
  };

  const addRecord = () => {
    updateField('vatRecords', [...(editedData.vatRecords as VATRecord[]), {
      period: '',
      companyName: '',
      taxId: '',
      salesAmount: 0,
      salesTax: 0,
      purchaseAmount: 0,
      purchaseTax: 0,
      taxWithheld: 0,
      tableName: 'เพิ่มใหม่'
    }]);
  };

  const removeRecord = (index: number) => {
    const newData = [...(editedData.vatRecords as VATRecord[])];
    newData.splice(index, 1);
    updateField('vatRecords', newData);
  };

  // Group by table name
  const groupedData = (editedData.vatRecords as VATRecord[] || []).reduce((acc: Record<string, VATRecord[]>, curr: VATRecord, idx: number) => {
    const key = curr.tableName || 'อื่นๆ';
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...curr, originalIdx: idx });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-none shadow-sm bg-white rounded-[24px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-500">
        <CardHeader className="p-8 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-[#FFF9E6] text-[#947600] shadow-sm">
                <Receipt size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1A1D1F]">ภาษีมูลค่าเพิ่ม (ภพ.30)</h2>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6F767E] mt-0.5">Value Added Tax Records</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <button 
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-100 text-sm font-bold hover:bg-gray-50 text-[#1A1D1F] transition-all"
                >
                  <Edit2 size={16} className="text-[#947600]" /> แก้ไขข้อมูล
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
                    className="px-6 py-2.5 rounded-xl bg-[#FFD324] text-[#1A1D1F] text-sm font-bold shadow-lg shadow-yellow-100 hover:bg-[#E6BE20] transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-0 space-y-8">
          {/* Add Record Button */}
          {isEditing && (
            <div className="flex justify-end">
              <Button size="sm" onClick={addRecord} className="h-8 bg-amber-50 text-amber-600 hover:bg-amber-100 border-none">
                <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
              </Button>
            </div>
          )}

          {/* VAT Records Tables */}
          {Object.keys(groupedData).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedData).map(([tableName, records], groupIdx) => {
                // Check if this group has cash/credit data
                const groupHasCashCredit = records.some(r => 
                  (r.cashSales !== undefined && r.cashSales > 0) || 
                  (r.creditSales !== undefined && r.creditSales > 0)
                );
                
                // Calculate summary rows
                const dataRecords = records.filter(r => {
                  const period = String(r.period || '').toLowerCase();
                  return !period.includes('รวม') && !period.includes('เฉลี่ย') && !period.includes('ต่อปี');
                });
                
                const totalSales = dataRecords.reduce((sum, r) => sum + (r.salesAmount || 0), 0);
                const totalCashSales = dataRecords.reduce((sum, r) => sum + (r.cashSales || 0), 0);
                const totalCreditSales = dataRecords.reduce((sum, r) => sum + (r.creditSales || 0), 0);
                const totalSalesTax = dataRecords.reduce((sum, r) => sum + (r.salesTax || 0), 0);
                const totalPurchase = dataRecords.reduce((sum, r) => sum + (r.purchaseAmount || 0), 0);
                const totalPurchaseTax = dataRecords.reduce((sum, r) => sum + (r.purchaseTax || 0), 0);
                const totalTaxWithheld = dataRecords.reduce((sum, r) => sum + (r.taxWithheld || 0), 0);
                
                const avgSales = dataRecords.length > 0 ? totalSales / dataRecords.length : 0;
                const avgCashSales = dataRecords.length > 0 ? totalCashSales / dataRecords.length : 0;
                const avgCreditSales = dataRecords.length > 0 ? totalCreditSales / dataRecords.length : 0;
                const avgSalesTax = dataRecords.length > 0 ? totalSalesTax / dataRecords.length : 0;
                const avgPurchase = dataRecords.length > 0 ? totalPurchase / dataRecords.length : 0;
                const avgPurchaseTax = dataRecords.length > 0 ? totalPurchaseTax / dataRecords.length : 0;
                const avgTaxWithheld = dataRecords.length > 0 ? totalTaxWithheld / dataRecords.length : 0;
                
                const yearlyMultiplier = 2; // Assuming 6 months data * 2 = yearly
                
                return (
                  <div key={groupIdx} className="space-y-3">
                    <h4 className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                      <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                      {tableName}
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-amber-50/30">
                            <th className="text-left py-2.5 px-3 text-muted-foreground font-medium w-28">งวด</th>
                            {groupHasCashCredit ? (
                              <>
                                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">ขายเงินสด</th>
                                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">ขายเครดิต</th>
                                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">ยอดขายรวม</th>
                              </>
                            ) : (
                              <>
                                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">ยอดขาย</th>
                                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">ภาษีขาย</th>
                                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">ยอดซื้อ</th>
                                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">ภาษีซื้อ</th>
                                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">ภาษีชำระ</th>
                              </>
                            )}
                            {isEditing && <th className="text-right py-2.5 px-3 text-muted-foreground font-medium w-12"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((vat, idx: number) => {
                            const period = String(vat.period || '').toLowerCase();
                            const isSummaryRow = period.includes('รวม') || period.includes('เฉลี่ย') || period.includes('ต่อปี');
                            
                            if (isSummaryRow) return null; // Skip summary rows from data
                            
                            return (
                              <tr key={idx} className="border-b border-border/50 group hover:bg-muted/5">
                                <td className="py-2 px-1">
                                  {isEditing ? (
                                    <Input 
                                      value={vat.period || ''} 
                                      onChange={(e) => updateVATRecord(vat.originalIdx!, 'period', e.target.value)}
                                      className="h-8 text-xs bg-transparent border-transparent hover:border-border font-medium"
                                    />
                                  ) : (
                                    <span className="font-medium px-2">{vat.period}</span>
                                  )}
                                </td>
                                {groupHasCashCredit ? (
                                  <>
                                    <td className="py-2 px-1">
                                      {isEditing ? (
                                        <Input 
                                          type="number"
                                          value={vat.cashSales || 0} 
                                          onChange={(e) => updateVATRecord(vat.originalIdx!, 'cashSales', parseFloat(e.target.value) || 0)}
                                          className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                                        />
                                      ) : (
                                        <div className="h-8 flex items-center justify-end px-2 text-xs font-mono">
                                          {formatCurrency(vat.cashSales || 0)}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2 px-1">
                                      {isEditing ? (
                                        <Input 
                                          type="number"
                                          value={vat.creditSales || 0} 
                                          onChange={(e) => updateVATRecord(vat.originalIdx!, 'creditSales', parseFloat(e.target.value) || 0)}
                                          className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                                        />
                                      ) : (
                                        <div className="h-8 flex items-center justify-end px-2 text-xs font-mono">
                                          {formatCurrency(vat.creditSales || 0)}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2 px-1">
                                      {isEditing ? (
                                        <Input 
                                          type="number"
                                          value={vat.salesAmount || 0} 
                                          onChange={(e) => updateVATRecord(vat.originalIdx!, 'salesAmount', parseFloat(e.target.value) || 0)}
                                          className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border font-medium"
                                        />
                                      ) : (
                                        <div className="h-8 flex items-center justify-end px-2 text-xs font-mono font-medium">
                                          {formatCurrency(vat.salesAmount || 0)}
                                        </div>
                                      )}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2 px-1">
                                      {isEditing ? (
                                        <Input 
                                          type="number"
                                          value={vat.salesAmount || 0} 
                                          onChange={(e) => updateVATRecord(vat.originalIdx!, 'salesAmount', parseFloat(e.target.value) || 0)}
                                          className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                                        />
                                      ) : (
                                        <div className="h-8 flex items-center justify-end px-2 text-xs font-mono">
                                          {formatCurrency(vat.salesAmount || 0)}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2 px-1">
                                      {isEditing ? (
                                        <Input 
                                          type="number"
                                          value={vat.salesTax || 0} 
                                          onChange={(e) => updateVATRecord(vat.originalIdx!, 'salesTax', parseFloat(e.target.value) || 0)}
                                          className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                                        />
                                      ) : (
                                        <div className="h-8 flex items-center justify-end px-2 text-xs font-mono">
                                          {formatCurrency(vat.salesTax || 0)}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2 px-1">
                                      {isEditing ? (
                                        <Input 
                                          type="number"
                                          value={vat.purchaseAmount || 0} 
                                          onChange={(e) => updateVATRecord(vat.originalIdx!, 'purchaseAmount', parseFloat(e.target.value) || 0)}
                                          className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                                        />
                                      ) : (
                                        <div className="h-8 flex items-center justify-end px-2 text-xs font-mono">
                                          {formatCurrency(vat.purchaseAmount || 0)}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2 px-1">
                                      {isEditing ? (
                                        <Input 
                                          type="number"
                                          value={vat.purchaseTax || 0} 
                                          onChange={(e) => updateVATRecord(vat.originalIdx!, 'purchaseTax', parseFloat(e.target.value) || 0)}
                                          className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                                        />
                                      ) : (
                                        <div className="h-8 flex items-center justify-end px-2 text-xs font-mono">
                                          {formatCurrency(vat.purchaseTax || 0)}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-2 px-1">
                                      {isEditing ? (
                                        <Input 
                                          type="number"
                                          value={vat.taxWithheld || 0} 
                                          onChange={(e) => updateVATRecord(vat.originalIdx!, 'taxWithheld', parseFloat(e.target.value) || 0)}
                                          className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border font-bold"
                                        />
                                      ) : (
                                        <div className="h-8 flex items-center justify-end px-2 text-xs font-mono font-bold text-primary">
                                          {formatCurrency(vat.taxWithheld || 0)}
                                        </div>
                                      )}
                                    </td>
                                  </>
                                )}
                                {isEditing && (
                                  <td className="py-2 px-1 text-right">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => removeRecord(vat.originalIdx!)}
                                      className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                          
                          {/* Summary Rows */}
                          {dataRecords.length > 0 && (
                            <>
                              <tr className="border-t-2 border-border bg-amber-50/50 font-semibold">
                                <td className="py-2 px-3 text-xs">รวม</td>
                                {groupHasCashCredit ? (
                                  <>
                                    <td className="py-2 px-3 text-xs text-right font-mono">{formatCurrency(totalCashSales)}</td>
                                    <td className="py-2 px-3 text-xs text-right font-mono">{formatCurrency(totalCreditSales)}</td>
                                    <td className="py-2 px-3 text-xs text-right font-mono font-bold text-amber-700">{formatCurrency(totalSales)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2 px-3 text-xs text-right font-mono">{formatCurrency(totalSales)}</td>
                                    <td className="py-2 px-3 text-xs text-right font-mono">{formatCurrency(totalSalesTax)}</td>
                                    <td className="py-2 px-3 text-xs text-right font-mono">{formatCurrency(totalPurchase)}</td>
                                    <td className="py-2 px-3 text-xs text-right font-mono">{formatCurrency(totalPurchaseTax)}</td>
                                    <td className="py-2 px-3 text-xs text-right font-mono font-bold text-primary">{formatCurrency(totalTaxWithheld)}</td>
                                  </>
                                )}
                                {isEditing && <td></td>}
                              </tr>
                              <tr className="border-b border-border bg-amber-50/30">
                                <td className="py-2 px-3 text-xs text-muted-foreground">รายได้เฉลี่ย/เดือน</td>
                                {groupHasCashCredit ? (
                                  <>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono">{formatCurrency(avgCashSales)}</td>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono">{formatCurrency(avgCreditSales)}</td>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono font-medium">{formatCurrency(avgSales)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono">{formatCurrency(avgSales)}</td>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono">{formatCurrency(avgSalesTax)}</td>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono">{formatCurrency(avgPurchase)}</td>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono">{formatCurrency(avgPurchaseTax)}</td>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono font-medium">{formatCurrency(avgTaxWithheld)}</td>
                                  </>
                                )}
                                {isEditing && <td></td>}
                              </tr>
                              <tr className="border-b-2 border-border bg-amber-50/30">
                                <td className="py-2 px-3 text-xs text-muted-foreground">รายได้ต่อปี</td>
                                {groupHasCashCredit ? (
                                  <>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono">{formatCurrency(totalCashSales * yearlyMultiplier)}</td>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono">{formatCurrency(totalCreditSales * yearlyMultiplier)}</td>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono font-medium">{formatCurrency(totalSales * yearlyMultiplier)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono">{formatCurrency(totalSales * yearlyMultiplier)}</td>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono">{formatCurrency(totalSalesTax * yearlyMultiplier)}</td>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono">{formatCurrency(totalPurchase * yearlyMultiplier)}</td>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono">{formatCurrency(totalPurchaseTax * yearlyMultiplier)}</td>
                                    <td className="py-2 px-3 text-xs text-right text-muted-foreground font-mono font-medium">{formatCurrency(totalTaxWithheld * yearlyMultiplier)}</td>
                                  </>
                                )}
                                {isEditing && <td></td>}
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/5">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-20" />
              <p>ไม่พบข้อมูล ภพ.30</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
