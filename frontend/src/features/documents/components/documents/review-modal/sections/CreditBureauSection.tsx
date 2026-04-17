import { Shield, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface CreditBureauSectionProps {
  data: ParsedBusinessProfile['creditBureauReports'];
  onUpdate: (newData: ParsedBusinessProfile['creditBureauReports']) => void;
}

export function CreditBureauSection({ data, onUpdate }: CreditBureauSectionProps) {
  // Debug: Log credit bureau data
  console.log('[CreditBureauSection] Credit Bureau Reports:', data);
  console.log('[CreditBureauSection] Number of reports:', (data || []).length);
  
  const addReport = () => {
    const newItems = [...(data || []), { borrowerName: '', reportDate: '', totalCreditLimit: 0, totalOutstanding: 0, creditUtilization: 0, nplAccounts: 0, accounts: [] }];
    onUpdate(newItems);
  };

  const removeReport = (index: number) => {
    const newItems = [...(data || [])];
    newItems.splice(index, 1);
    onUpdate(newItems);
  };

  const updateReport = (index: number, field: keyof NonNullable<ParsedBusinessProfile['creditBureauReports']>[number], value: string | number) => {
    const newItems = [...(data || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate(newItems);
  };

  const addAccount = (reportIdx: number) => {
    const newItems = [...(data || [])];
    const report = { ...newItems[reportIdx] };
    report.accounts = [...(report.accounts || []), { bank: '', accountType: '', openDate: '', creditLimit: 0, outstanding: 0, monthlyPayment: 0, paymentStatus: '' }];
    newItems[reportIdx] = report;
    onUpdate(newItems);
  };

  const removeAccount = (reportIdx: number, accIdx: number) => {
    const newItems = [...(data || [])];
    const report = { ...newItems[reportIdx] };
    const newAccounts = [...(report.accounts || [])];
    newAccounts.splice(accIdx, 1);
    report.accounts = newAccounts;
    newItems[reportIdx] = report;
    onUpdate(newItems);
  };

  const updateAccount = (reportIdx: number, accIdx: number, field: keyof NonNullable<NonNullable<ParsedBusinessProfile['creditBureauReports']>[number]['accounts']>[number], value: string | number) => {
    const newItems = [...(data || [])];
    const report = { ...newItems[reportIdx] };
    const newAccounts = [...(report.accounts || [])];
    newAccounts[accIdx] = { ...newAccounts[accIdx], [field]: value };
    report.accounts = newAccounts;
    newItems[reportIdx] = report;
    onUpdate(newItems);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Shield} title="รายงานการตรวจสอบเครดิตบูโร (Credit Bureau) ของผู้กู้และกรรมการ/ผู้ค้ำประกัน" />
        <Button size="sm" onClick={addReport} className="h-8 bg-primary/10 text-primary hover:bg-primary/20">
          <Plus className="w-4 h-4 mr-1" /> เพิ่มรายงาน
        </Button>
      </div>
      
      {(data || []).map((report, idx) => (
        <div key={idx} className="relative p-6 border-2 border-border rounded-2xl bg-muted/5 group hover:bg-muted/10 transition-colors">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => removeReport(idx)}
            className="absolute top-4 right-4 h-8 w-8 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </Button>

          {/* Borrower Header */}
          <div className="mb-6 pb-4 border-b-2 border-primary/20">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary uppercase tracking-wider">ชื่อผู้กู้/กรรมการ/ผู้ค้ำประกัน</label>
                <Input 
                  value={report.borrowerName || ''} 
                  onChange={(e) => updateReport(idx, 'borrowerName', e.target.value)}
                  className="h-10 bg-background border-border font-semibold text-base"
                  placeholder="เช่น บริษัท เพชรเกษมฐิติพร จำกัด"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-primary uppercase tracking-wider">ตรวจสอบ ณ วันที่</label>
                <Input 
                  value={report.reportDate || ''} 
                  onChange={(e) => updateReport(idx, 'reportDate', e.target.value)}
                  className="h-10 bg-background border-border font-semibold"
                  placeholder="เช่น 25 ส.ค. 68"
                />
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">วงเงินรวม</label>
              <div className="text-lg font-bold text-foreground">
                {report.totalCreditLimit?.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ภาระหนี้รวม</label>
              <div className="text-lg font-bold text-foreground">
                {report.totalOutstanding?.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">อัตราการใช้วงเงิน</label>
              <div className="text-lg font-bold text-foreground">
                {report.creditUtilization?.toFixed(2) || '0.00'}%
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">บัญชี NPL</label>
              <div className="text-lg font-bold text-destructive">
                {report.nplAccounts || 0}
              </div>
            </div>
          </div>
          
          {/* Accounts Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-bold text-foreground uppercase tracking-widest">ประวัติการติดต่อกับสถาบันการเงิน</h5>
              <Button size="sm" variant="ghost" onClick={() => addAccount(idx)} className="h-7 text-xs text-primary hover:bg-primary/5">
                <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่มบัญชี
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-center py-3 px-2 text-muted-foreground font-bold text-xs">ลำดับ</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-bold text-xs">ชื่อสถาบันการเงิน</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-bold text-xs">ประเภทสินเชื่อ</th>
                    <th className="text-left py-3 px-3 text-muted-foreground font-bold text-xs">วันที่เปิดบัญชี</th>
                    <th className="text-right py-3 px-3 text-muted-foreground font-bold text-xs">วงเงิน</th>
                    <th className="text-right py-3 px-3 text-muted-foreground font-bold text-xs">ภาระหนี้</th>
                    <th className="text-right py-3 px-3 text-muted-foreground font-bold text-xs">ยอดผ่อนชำระต่อเดือน</th>
                    <th className="text-center py-3 px-3 text-muted-foreground font-bold text-xs">สถานะปัจจุบัน</th>
                    <th className="text-right py-3 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {(report.accounts || []).map((acc, accIdx) => (
                    <tr key={accIdx} className="border-b border-border/50 group/acc hover:bg-background/50 transition-colors">
                      <td className="py-2 px-2 text-center text-muted-foreground font-medium">
                        {accIdx + 1}
                      </td>
                      <td className="py-2 px-1">
                        <Input 
                          value={acc.bank || ''} 
                          onChange={(e) => updateAccount(idx, accIdx, 'bank', e.target.value)}
                          className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                          placeholder="ธนาคาร..."
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input 
                          value={acc.accountType || ''} 
                          onChange={(e) => updateAccount(idx, accIdx, 'accountType', e.target.value)}
                          className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                          placeholder="ประเภท..."
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input 
                          value={acc.openDate || ''} 
                          onChange={(e) => updateAccount(idx, accIdx, 'openDate', e.target.value)}
                          className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                          placeholder="วันที่..."
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input 
                          type="number"
                          value={acc.creditLimit || 0} 
                          onChange={(e) => updateAccount(idx, accIdx, 'creditLimit', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input 
                          type="number"
                          value={acc.outstanding || 0} 
                          onChange={(e) => updateAccount(idx, accIdx, 'outstanding', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border font-medium"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input 
                          type="number"
                          value={acc.monthlyPayment || 0} 
                          onChange={(e) => updateAccount(idx, accIdx, 'monthlyPayment', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                        />
                      </td>
                      <td className="py-2 px-1">
                        <Input 
                          value={acc.paymentStatus || ''} 
                          onChange={(e) => updateAccount(idx, accIdx, 'paymentStatus', e.target.value)}
                          className="h-8 text-xs text-center bg-transparent border-transparent hover:border-border"
                          placeholder="ปกติ"
                        />
                      </td>
                      <td className="py-2 px-1 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeAccount(idx, accIdx)}
                          className="h-7 w-7 p-0 text-destructive opacity-0 group-hover/acc:opacity-100 transition-opacity"
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
        </div>
      ))}
      
      {(data || []).length === 0 && (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/5">
          ไม่พบข้อมูลเครดิตบูโร
        </div>
      )}
    </div>
  );
}
