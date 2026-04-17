import { CreditCard, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface LoanSummarySectionProps {
  data: ParsedBusinessProfile['loanSummary'];
  onUpdate: (newData: ParsedBusinessProfile['loanSummary']) => void;
}

export function LoanSummarySection({ data, onUpdate }: LoanSummarySectionProps) {
  const addLoan = (type: 'existing' | 'new') => {
    const key = type === 'existing' ? 'existingLoans' : 'newLoans';
    const newItems = [...(data?.[key] || []), { order: (data?.[key]?.length || 0) + 1, loanType: '', productName: '', amount: 0, outstandingDebt: 0, interestRate: '', loanTerm: '', collateral: '' }];
    onUpdate({ ...data, [key]: newItems });
  };

  const removeLoan = (type: 'existing' | 'new', index: number) => {
    const key = type === 'existing' ? 'existingLoans' : 'newLoans';
    const newItems = [...(data?.[key] || [])];
    newItems.splice(index, 1);
    onUpdate({ ...data, [key]: newItems });
  };

  const updateLoan = (type: 'existing' | 'new', index: number, field: string, value: string | number) => {
    const key = type === 'existing' ? 'existingLoans' : 'newLoans';
    const newItems = [...(data?.[key] || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate({ ...data, [key]: newItems });
  };

  const renderLoanTable = (loans: NonNullable<ParsedBusinessProfile['loanSummary']>['existingLoans' | 'newLoans'], type: 'existing' | 'new', title: string) => (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-foreground/80 flex items-center gap-2">
          <div className="w-1.5 h-4 bg-primary rounded-full"></div>
          {title}
        </h4>
        <Button size="sm" onClick={() => addLoan(type)} className="h-8 bg-primary/5 text-primary hover:bg-primary/10 border-none">
          <Plus className="w-4 h-4 mr-1" /> เพิ่มวงเงิน
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left py-2.5 px-3 text-muted-foreground font-medium w-12">ลำดับ</th>
              <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">ประเภท</th>
              <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">ผลิตภัณฑ์</th>
              <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">วงเงิน</th>
              <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">ภาระหนี้</th>
              <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">อัตราดอกเบี้ย</th>
              <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">ระยะเวลา</th>
              <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">หลักประกัน</th>
              <th className="text-right py-2.5 px-3 text-muted-foreground font-medium w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(loans || []).map((loan, idx) => (
              <tr key={idx} className="border-b border-border/50 group hover:bg-muted/10 transition-colors">
                <td className="py-2 px-1">
                  <Input 
                    value={loan.order || idx + 1} 
                    onChange={(e) => updateLoan(type, idx, 'order', e.target.value)}
                    className="h-8 text-xs bg-transparent border-transparent hover:border-border text-center"
                  />
                </td>
                <td className="py-2 px-1">
                  <Input 
                    value={loan.loanType || ''} 
                    onChange={(e) => updateLoan(type, idx, 'loanType', e.target.value)}
                    className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                  />
                </td>
                <td className="py-2 px-1">
                  <Input 
                    value={loan.productName || ''} 
                    onChange={(e) => updateLoan(type, idx, 'productName', e.target.value)}
                    className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                  />
                </td>
                <td className="py-2 px-1">
                  <Input 
                    type="number"
                    value={loan.amount || 0} 
                    onChange={(e) => updateLoan(type, idx, 'amount', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                  />
                </td>
                <td className="py-2 px-1">
                  <Input 
                    type="number"
                    value={loan.outstandingDebt || 0} 
                    onChange={(e) => updateLoan(type, idx, 'outstandingDebt', parseFloat(e.target.value) || 0)}
                    className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                  />
                </td>
                <td className="py-2 px-1">
                  <Input 
                    value={loan.interestRate || ''} 
                    onChange={(e) => updateLoan(type, idx, 'interestRate', e.target.value)}
                    className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                  />
                </td>
                <td className="py-2 px-1">
                  <Input 
                    value={loan.loanTerm || ''} 
                    onChange={(e) => updateLoan(type, idx, 'loanTerm', e.target.value)}
                    className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                  />
                </td>
                <td className="py-2 px-1">
                  <Input 
                    value={loan.collateral || ''} 
                    onChange={(e) => updateLoan(type, idx, 'collateral', e.target.value)}
                    className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                  />
                </td>
                <td className="py-2 px-1 text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeLoan(type, idx)}
                    className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(loans || []).length === 0 && (
          <div className="py-10 text-center text-muted-foreground border-b border-border/50 bg-muted/5 rounded-b-lg">
            ไม่พบข้อมูล{title}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      <SectionTitle icon={CreditCard} title="สรุปวงเงินสินเชื่อ" />
      
      {renderLoanTable(data?.existingLoans || [], 'existing', "สินเชื่อเดิม")}
      {renderLoanTable(data?.newLoans || [], 'new', "สินเชื่อใหม่")}
      
      <div className="grid grid-cols-3 gap-6 mt-6 p-6 bg-primary/5 rounded-2xl border border-primary/10">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">รวมสินเชื่อเดิม</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">
              <Input 
                type="number"
                value={data?.totalExisting || 0} 
                onChange={(e) => onUpdate({ ...data, totalExisting: parseFloat(e.target.value) || 0 })}
                className="h-9 w-full bg-transparent border-none focus-visible:ring-0 p-0 text-xl font-bold"
              />
            </span>
            <span className="text-xs text-muted-foreground font-medium">บาท</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">รวมสินเชื่อใหม่</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">
              <Input 
                type="number"
                value={data?.totalNew || 0} 
                onChange={(e) => onUpdate({ ...data, totalNew: parseFloat(e.target.value) || 0 })}
                className="h-9 w-full bg-transparent border-none focus-visible:ring-0 p-0 text-xl font-bold text-primary"
              />
            </span>
            <span className="text-xs text-primary font-medium">บาท</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">รวมทั้งหมด</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-foreground">
              <Input 
                type="number"
                value={data?.totalAll || 0} 
                onChange={(e) => onUpdate({ ...data, totalAll: parseFloat(e.target.value) || 0 })}
                className="h-9 w-full bg-transparent border-none focus-visible:ring-0 p-0 text-xl font-black"
              />
            </span>
            <span className="text-xs text-muted-foreground font-medium">บาท</span>
          </div>
        </div>
      </div>
    </div>
  );
}
