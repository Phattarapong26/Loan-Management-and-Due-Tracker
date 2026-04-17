import React from 'react';
import { Wallet, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface InvestmentSectionProps {
  data: ParsedBusinessProfile['investmentStructure'];
  onUpdate: (newData: ParsedBusinessProfile['investmentStructure']) => void;
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export function InvestmentSection({ data, onUpdate }: InvestmentSectionProps) {
  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState<string>('');

  const updateField = (field: keyof ParsedBusinessProfile['investmentStructure'], value: string | number) => {
    onUpdate({ ...(data || { totalInvestment: 0, ownerEquity: 0, otherLoans: 0, requestedLoan: 0, debtToEquityRatio: 0, investmentItems: [] }), [field]: value });
  };

  const addItem = () => {
    const items = [...(data?.investmentItems || []), { item: '', amount: 0 }];
    onUpdate({ ...(data || { totalInvestment: 0, ownerEquity: 0, otherLoans: 0, requestedLoan: 0, debtToEquityRatio: 0, investmentItems: [] }), investmentItems: items });
  };

  const removeItem = (idx: number) => {
    const items = [...(data?.investmentItems || [])];
    items.splice(idx, 1);
    onUpdate({ ...(data || { totalInvestment: 0, ownerEquity: 0, otherLoans: 0, requestedLoan: 0, debtToEquityRatio: 0, investmentItems: [] }), investmentItems: items });
  };

  const updateItem = (idx: number, field: keyof NonNullable<ParsedBusinessProfile['investmentStructure']>['investmentItems'][number], value: string | number) => {
    const items = [...(data?.investmentItems || [])];
    items[idx] = { ...items[idx], [field]: value };
    onUpdate({ ...(data || { totalInvestment: 0, ownerEquity: 0, otherLoans: 0, requestedLoan: 0, debtToEquityRatio: 0, investmentItems: [] }), investmentItems: items });
  };

  const handleFieldClick = (fieldId: string, currentValue: number) => {
    setEditingField(fieldId);
    setEditValue(currentValue === 0 ? '' : currentValue.toString());
  };

  const handleFieldBlur = (field: keyof ParsedBusinessProfile['investmentStructure']) => {
    const numValue = parseFloat(editValue) || 0;
    updateField(field, numValue);
    setEditingField(null);
    setEditValue('');
  };

  const handleItemFieldClick = (fieldId: string, currentValue: number) => {
    setEditingField(fieldId);
    setEditValue(currentValue === 0 ? '' : currentValue.toString());
  };

  const handleItemFieldBlur = (idx: number) => {
    const numValue = parseFloat(editValue) || 0;
    updateItem(idx, 'amount', numValue);
    setEditingField(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter') {
      callback();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue('');
    }
  };

  return (
    <div className="space-y-8">
      <SectionTitle icon={Wallet} title="โครงสร้างการลงทุน" />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <div className="space-y-1.5 p-4 rounded-xl bg-primary/5 border border-primary/10">
          <label className="text-[10px] font-bold text-primary/70 uppercase tracking-widest">เงินลงทุนรวม</label>
          {editingField === 'totalInvestment' ? (
            <Input 
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleFieldBlur('totalInvestment')}
              onKeyDown={(e) => handleKeyDown(e, () => handleFieldBlur('totalInvestment'))}
              className="h-10 text-lg font-bold bg-transparent border-none p-0 focus-visible:ring-0"
              autoFocus
            />
          ) : (
            <div 
              className="h-10 text-lg font-bold cursor-pointer hover:bg-primary/10 rounded px-2 flex items-center"
              onClick={() => handleFieldClick('totalInvestment', data?.totalInvestment || 0)}
            >
              {formatNumber(data?.totalInvestment || 0)}
            </div>
          )}
        </div>
        <div className="space-y-1.5 p-4 rounded-xl bg-muted/30 border border-border">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">ทุนเจ้าของ</label>
          {editingField === 'ownerEquity' ? (
            <Input 
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleFieldBlur('ownerEquity')}
              onKeyDown={(e) => handleKeyDown(e, () => handleFieldBlur('ownerEquity'))}
              className="h-10 text-lg font-bold bg-transparent border-none p-0 focus-visible:ring-0"
              autoFocus
            />
          ) : (
            <div 
              className="h-10 text-lg font-bold cursor-pointer hover:bg-muted/50 rounded px-2 flex items-center"
              onClick={() => handleFieldClick('ownerEquity', data?.ownerEquity || 0)}
            >
              {formatNumber(data?.ownerEquity || 0)}
            </div>
          )}
        </div>
        <div className="space-y-1.5 p-4 rounded-xl bg-muted/30 border border-border">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">สินเชื่ออื่นๆ</label>
          {editingField === 'otherLoans' ? (
            <Input 
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleFieldBlur('otherLoans')}
              onKeyDown={(e) => handleKeyDown(e, () => handleFieldBlur('otherLoans'))}
              className="h-10 text-lg font-bold bg-transparent border-none p-0 focus-visible:ring-0"
              autoFocus
            />
          ) : (
            <div 
              className="h-10 text-lg font-bold cursor-pointer hover:bg-muted/50 rounded px-2 flex items-center"
              onClick={() => handleFieldClick('otherLoans', data?.otherLoans || 0)}
            >
              {formatNumber(data?.otherLoans || 0)}
            </div>
          )}
        </div>
        <div className="space-y-1.5 p-4 rounded-xl bg-primary/10 border border-primary/20 shadow-sm">
          <label className="text-[10px] font-bold text-primary uppercase tracking-widest">สินเชื่อที่ขอครั้งนี้</label>
          {editingField === 'requestedLoan' ? (
            <Input 
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleFieldBlur('requestedLoan')}
              onKeyDown={(e) => handleKeyDown(e, () => handleFieldBlur('requestedLoan'))}
              className="h-10 text-lg font-bold bg-transparent border-none p-0 text-primary focus-visible:ring-0"
              autoFocus
            />
          ) : (
            <div 
              className="h-10 text-lg font-bold cursor-pointer hover:bg-primary/20 rounded px-2 flex items-center text-primary"
              onClick={() => handleFieldClick('requestedLoan', data?.requestedLoan || 0)}
            >
              {formatNumber(data?.requestedLoan || 0)}
            </div>
          )}
        </div>
        <div className="space-y-1.5 p-4 rounded-xl bg-muted/30 border border-border">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">D/E Ratio</label>
          {editingField === 'debtToEquityRatio' ? (
            <Input 
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => handleFieldBlur('debtToEquityRatio')}
              onKeyDown={(e) => handleKeyDown(e, () => handleFieldBlur('debtToEquityRatio'))}
              className="h-10 text-lg font-bold bg-transparent border-none p-0 focus-visible:ring-0"
              autoFocus
            />
          ) : (
            <div 
              className="h-10 text-lg font-bold cursor-pointer hover:bg-muted/50 rounded px-2 flex items-center"
              onClick={() => handleFieldClick('debtToEquityRatio', data?.debtToEquityRatio || 0)}
            >
              {formatNumber(data?.debtToEquityRatio || 0)}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-foreground/80 flex items-center gap-2">
            <div className="w-1.5 h-4 bg-primary rounded-full"></div>
            รายละเอียดรายการลงทุน
          </h4>
          <Button size="sm" onClick={addItem} className="h-8 bg-primary/5 text-primary hover:bg-primary/10 border-none">
            <Plus className="w-4 h-4 mr-1" /> เพิ่มรายการ
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left py-2.5 px-3 text-muted-foreground font-medium">รายการลงทุน</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium">จำนวนเงิน (บาท)</th>
                <th className="text-right py-2.5 px-3 text-muted-foreground font-medium w-12"></th>
              </tr>
            </thead>
            <tbody>
              {(data?.investmentItems || []).map((item, idx) => (
                <tr key={idx} className="border-b border-border/50 group hover:bg-muted/10 transition-colors">
                  <td className="py-2 px-1">
                    <Input 
                      value={item.item || ''} 
                      onChange={(e) => updateItem(idx, 'item', e.target.value)}
                      className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                      placeholder="ระบุรายการ..."
                    />
                  </td>
                  <td className="py-2 px-1">
                    {editingField === `item-${idx}` ? (
                      <Input 
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleItemFieldBlur(idx)}
                        onKeyDown={(e) => handleKeyDown(e, () => handleItemFieldBlur(idx))}
                        className="h-8 text-xs text-right bg-transparent border-border font-medium"
                        autoFocus
                      />
                    ) : (
                      <div 
                        className="h-8 text-xs text-right font-medium cursor-pointer hover:bg-muted/30 rounded px-2 flex items-center justify-end"
                        onClick={() => handleItemFieldClick(`item-${idx}`, item.amount || 0)}
                      >
                        {formatNumber(item.amount || 0)}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-1 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeItem(idx)}
                      className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(data?.investmentItems || []).length === 0 && (
                <tr>
                   <td colSpan={3} className="py-8 text-center text-muted-foreground italic">
                     ไม่มีข้อมูลรายละเอียดรายการลงทุน
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
