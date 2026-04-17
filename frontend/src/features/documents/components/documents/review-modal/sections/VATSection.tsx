import { Receipt, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface VATSectionProps {
  data: ParsedBusinessProfile['vatRecords'];
  onUpdate: (newData: ParsedBusinessProfile['vatRecords']) => void;
}

export function VATSection({ data, onUpdate }: VATSectionProps) {
  const addRecord = () => {
    const newItems = [...(data || []), { 
      period: '', 
      companyName: '',
      taxId: '',
      salesAmount: 0, 
      salesTax: 0, 
      purchaseAmount: 0, 
      purchaseTax: 0, 
      taxWithheld: 0,
      tableName: 'เพิ่มใหม่' 
    }];
    onUpdate(newItems);
  };

  const removeRecord = (index: number) => {
    const newItems = [...(data || [])];
    newItems.splice(index, 1);
    onUpdate(newItems);
  };

  const updateRecord = (index: number, field: keyof NonNullable<ParsedBusinessProfile['vatRecords']>[number], value: string | number) => {
    const newItems = [...(data || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate(newItems);
  };

  // Group by table name
  const groupedData = (data || []).reduce((acc, curr, originalIdx) => {
    const key = curr.tableName || 'อื่นๆ';
    if (!acc[key]) acc[key] = [];
    acc[key].push({ ...curr, originalIdx });
    return acc;
  }, {} as Record<string, Array<NonNullable<ParsedBusinessProfile['vatRecords']>[number] & { originalIdx: number }>>);

  // Check if any record has cash/credit breakdown
  const hasCashCreditData = (data || []).some(record => 
    (record.cashSales !== undefined && record.cashSales > 0) || 
    (record.creditSales !== undefined && record.creditSales > 0)
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Receipt} title="ภพ.30" />
        <Button size="sm" onClick={addRecord} className="h-8 bg-primary/10 text-primary hover:bg-primary/20">
          <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
        </Button>
      </div>
      
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
            <div className="w-1.5 h-4 bg-primary/50 rounded-full"></div>
            {tableName}
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
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
                  <th className="text-right py-2.5 px-3 text-muted-foreground font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {records.map((vat, idx: number) => (
                  <tr key={idx} className="border-b border-border/50 group hover:bg-muted/5">
                    <td className="py-2 px-1">
                      <Input 
                        value={vat.period || ''} 
                        onChange={(e) => updateRecord(vat.originalIdx, 'period', e.target.value)}
                        className="h-8 text-xs bg-transparent border-transparent hover:border-border font-medium"
                      />
                    </td>
                    {groupHasCashCredit ? (
                      <>
                        <td className="py-2 px-1">
                          <Input 
                            type="number"
                            value={vat.cashSales || 0} 
                            onChange={(e) => updateRecord(vat.originalIdx, 'cashSales', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <Input 
                            type="number"
                            value={vat.creditSales || 0} 
                            onChange={(e) => updateRecord(vat.originalIdx, 'creditSales', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <Input 
                            type="number"
                            value={vat.salesAmount || 0} 
                            onChange={(e) => updateRecord(vat.originalIdx, 'salesAmount', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border font-medium"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 px-1">
                          <Input 
                            type="number"
                            value={vat.salesAmount || 0} 
                            onChange={(e) => updateRecord(vat.originalIdx, 'salesAmount', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <Input 
                            type="number"
                            value={vat.salesTax || 0} 
                            onChange={(e) => updateRecord(vat.originalIdx, 'salesTax', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <Input 
                            type="number"
                            value={vat.purchaseAmount || 0} 
                            onChange={(e) => updateRecord(vat.originalIdx, 'purchaseAmount', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <Input 
                            type="number"
                            value={vat.purchaseTax || 0} 
                            onChange={(e) => updateRecord(vat.originalIdx, 'purchaseTax', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                          />
                        </td>
                        <td className="py-2 px-1">
                          <Input 
                            type="number"
                            value={vat.taxWithheld || 0} 
                            onChange={(e) => updateRecord(vat.originalIdx, 'taxWithheld', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border font-bold"
                          />
                        </td>
                      </>
                    )}
                    <td className="py-2 px-1 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeRecord(vat.originalIdx)}
                        className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
                
                {/* Summary Rows */}
                {dataRecords.length > 0 && (
                  <>
                    <tr className="border-t-2 border-border bg-muted/20 font-semibold">
                      <td className="py-2 px-3 text-xs">รวม</td>
                      {groupHasCashCredit ? (
                        <>
                          <td className="py-2 px-3 text-xs text-right">{totalCashSales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right">{totalCreditSales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right font-bold">{totalSales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3 text-xs text-right">{totalSales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right">{totalSalesTax.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right">{totalPurchase.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right">{totalPurchaseTax.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right font-bold">{totalTaxWithheld.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </>
                      )}
                      <td></td>
                    </tr>
                    <tr className="border-b border-border bg-muted/10">
                      <td className="py-2 px-3 text-xs text-muted-foreground">รายได้เฉลี่ย/เดือน</td>
                      {groupHasCashCredit ? (
                        <>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground">{avgCashSales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground">{avgCreditSales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground font-medium">{avgSales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground">{avgSales.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground">{avgSalesTax.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground">{avgPurchase.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground">{avgPurchaseTax.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground font-medium">{avgTaxWithheld.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </>
                      )}
                      <td></td>
                    </tr>
                    <tr className="border-b-2 border-border bg-muted/10">
                      <td className="py-2 px-3 text-xs text-muted-foreground">รายได้ต่อปี</td>
                      {groupHasCashCredit ? (
                        <>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground">{(totalCashSales * yearlyMultiplier).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground">{(totalCreditSales * yearlyMultiplier).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground font-medium">{(totalSales * yearlyMultiplier).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground">{(totalSales * yearlyMultiplier).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground">{(totalSalesTax * yearlyMultiplier).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground">{(totalPurchase * yearlyMultiplier).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground">{(totalPurchaseTax * yearlyMultiplier).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 px-3 text-xs text-right text-muted-foreground font-medium">{(totalTaxWithheld * yearlyMultiplier).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </>
                      )}
                      <td></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
        );
      })}
      {(data || []).length === 0 && (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/5">
          ไม่พบข้อมูล ภพ.30
        </div>
      )}
    </div>
  );
}
