import { Landmark, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface BankStatementSectionProps {
  data: ParsedBusinessProfile['bankStatements'];
  onUpdate: (newData: ParsedBusinessProfile['bankStatements']) => void;
}

export function BankStatementSection({ data, onUpdate }: BankStatementSectionProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());

  // Debug: Log the data received
  console.log('[BankStatementSection] Received data:', data);
  if (data && data.length > 0) {
    console.log('[BankStatementSection] First statement:', {
      totalWithdrawals: data[0].totalWithdrawals,
      totalDeposits: data[0].totalDeposits,
      monthlyTransactions: data[0].monthlyTransactions?.length,
      firstTransaction: data[0].monthlyTransactions?.[0],
    });
  }

  const addStatement = () => {
    const newItems = [...(data || []), { 
      accountName: '', 
      bank: '', 
      accountNumber: '', 
      accountType: '',
      creditLimit: 0,
      period: '', 
      openingBalance: 0, 
      closingBalance: 0, 
      totalDeposits: 0, 
      totalWithdrawals: 0, 
      averageBalance: 0, 
      turnover: 0,
      monthlyTransactions: []
    }];
    onUpdate(newItems);
  };

  const removeStatement = (index: number) => {
    const newItems = [...(data || [])];
    newItems.splice(index, 1);
    onUpdate(newItems);
  };

  const updateStatement = (index: number, field: keyof NonNullable<ParsedBusinessProfile['bankStatements']>[number], value: string | number) => {
    const newItems = [...(data || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    onUpdate(newItems);
  };

  const updateMonthlyTransaction = (
    stmtIndex: number,
    transIndex: number,
    field: keyof NonNullable<ParsedBusinessProfile['bankStatements']>[number]['monthlyTransactions'][number],
    value: string | number
  ) => {
    const newItems = [...(data || [])];
    const stmt = { ...newItems[stmtIndex] };
    const transactions = [...(stmt.monthlyTransactions || [])];
    transactions[transIndex] = { ...transactions[transIndex], [field]: value };
    stmt.monthlyTransactions = transactions;
    
    // Recalculate totals
    stmt.totalWithdrawals = transactions.reduce((sum, t) => sum + t.withdrawalAmount, 0);
    stmt.totalDeposits = transactions.reduce((sum, t) => sum + t.depositAmount, 0);
    stmt.turnover = stmt.totalWithdrawals + stmt.totalDeposits;
    
    // Update closing balance (last transaction's balance)
    if (transactions.length > 0) {
      stmt.closingBalance = transactions[transactions.length - 1].balance;
    }
    
    // Recalculate average balance
    const balanceSum = transactions.reduce((sum, t) => sum + Math.abs(t.balance), 0);
    stmt.averageBalance = transactions.length > 0 ? balanceSum / transactions.length : 0;
    
    newItems[stmtIndex] = stmt;
    onUpdate(newItems);
  };

  const addMonthlyTransaction = (stmtIndex: number) => {
    const newItems = [...(data || [])];
    const stmt = { ...newItems[stmtIndex] };
    const transactions = [...(stmt.monthlyTransactions || [])];
    
    transactions.push({
      month: '',
      withdrawalCount: 0,
      withdrawalAmount: 0,
      depositCount: 0,
      depositAmount: 0,
      balance: 0,
    });
    
    stmt.monthlyTransactions = transactions;
    newItems[stmtIndex] = stmt;
    onUpdate(newItems);
  };

  const removeMonthlyTransaction = (stmtIndex: number, transIndex: number) => {
    const newItems = [...(data || [])];
    const stmt = { ...newItems[stmtIndex] };
    const transactions = [...(stmt.monthlyTransactions || [])];
    
    transactions.splice(transIndex, 1);
    stmt.monthlyTransactions = transactions;
    
    // Recalculate totals
    stmt.totalWithdrawals = transactions.reduce((sum, t) => sum + t.withdrawalAmount, 0);
    stmt.totalDeposits = transactions.reduce((sum, t) => sum + t.depositAmount, 0);
    stmt.turnover = stmt.totalWithdrawals + stmt.totalDeposits;
    
    // Update closing balance
    if (transactions.length > 0) {
      stmt.closingBalance = transactions[transactions.length - 1].balance;
    } else {
      stmt.closingBalance = stmt.openingBalance;
    }
    
    // Recalculate average balance
    const balanceSum = transactions.reduce((sum, t) => sum + Math.abs(t.balance), 0);
    stmt.averageBalance = transactions.length > 0 ? balanceSum / transactions.length : 0;
    
    newItems[stmtIndex] = stmt;
    onUpdate(newItems);
  };

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedAccounts(newExpanded);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionTitle icon={Landmark} title="การเคลื่อนไหวทางบัญชี (Bank Statement Summary)" />
        <Button size="sm" onClick={addStatement} className="h-8 bg-primary/10 text-primary hover:bg-primary/20">
          <Plus className="w-4 h-4 mr-1" /> เพิ่มบัญชี
        </Button>
      </div>

      {(data || []).length === 0 && (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/5">
          ไม่พบข้อมูล Bank Statement
        </div>
      )}

      {(data || []).map((stmt, idx) => {
        const isExpanded = expandedAccounts.has(idx);
        const totalWithdrawalCount = stmt.monthlyTransactions?.reduce((sum, t) => sum + t.withdrawalCount, 0) || 0;
        const totalDepositCount = stmt.monthlyTransactions?.reduce((sum, t) => sum + t.depositCount, 0) || 0;
        const avgWithdrawalCount = stmt.monthlyTransactions?.length > 0 ? totalWithdrawalCount / stmt.monthlyTransactions.length : 0;
        const avgDepositCount = stmt.monthlyTransactions?.length > 0 ? totalDepositCount / stmt.monthlyTransactions.length : 0;
        const avgWithdrawalAmount = stmt.monthlyTransactions?.length > 0 ? stmt.totalWithdrawals / stmt.monthlyTransactions.length : 0;
        const avgDepositAmount = stmt.monthlyTransactions?.length > 0 ? stmt.totalDeposits / stmt.monthlyTransactions.length : 0;

        return (
          <div key={idx} className="border border-border rounded-lg overflow-hidden bg-card">
            {/* Header Section */}
            <div className="bg-white p-4 border-b border-border">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">
                  การเคลื่อนไหวทางบัญชีของนิติบุคคล (บัญชีที่ {idx + 1})
                </h3>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleExpand(idx)}
                    className="h-7 px-2 text-xs"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {isExpanded ? 'ซ่อน' : 'แสดง'}รายละเอียด
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeStatement(idx)}
                    className="h-7 w-7 p-0 text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Account Information Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-muted-foreground block mb-1">ธนาคาร:</label>
                  <Input 
                    value={stmt.bank || ''} 
                    onChange={(e) => updateStatement(idx, 'bank', e.target.value)}
                    className="h-8 text-xs font-medium"
                    placeholder="เช่น ไทยพาณิชย์"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">สาขา:</label>
                  <Input 
                    value={stmt.bank?.split(' ').slice(1).join(' ') || ''} 
                    onChange={(e) => {
                      const bankName = stmt.bank?.split(' ')[0] || '';
                      updateStatement(idx, 'bank', `${bankName} ${e.target.value}`);
                    }}
                    className="h-8 text-xs"
                    placeholder="เช่น ปราณบุรี"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">ชื่อบัญชี:</label>
                  <Input 
                    value={stmt.accountName || ''} 
                    onChange={(e) => updateStatement(idx, 'accountName', e.target.value)}
                    className="h-8 text-xs font-medium"
                    placeholder="เช่น บจก.เพชรเกษมฐิติพร"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">เลขที่บัญชี:</label>
                  <Input 
                    value={stmt.accountNumber || ''} 
                    onChange={(e) => updateStatement(idx, 'accountNumber', e.target.value)}
                    className="h-8 text-xs font-mono"
                    placeholder="เช่น 612-300707-6"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">ประเภทบัญชี:</label>
                  <Input 
                    value={stmt.accountType || ''} 
                    onChange={(e) => updateStatement(idx, 'accountType', e.target.value)}
                    className="h-8 text-xs"
                    placeholder="เช่น เดินสะพัด"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground block mb-1">วงเงิน (ลบ.):</label>
                  <Input 
                    type="number"
                    value={stmt.creditLimit / 1000000 || 0} 
                    onChange={(e) => updateStatement(idx, 'creditLimit', (parseFloat(e.target.value) || 0) * 1000000)}
                    className="h-8 text-xs text-right font-semibold"
                    placeholder="6.00"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            {/* Monthly Transactions Table */}
            {isExpanded && (
              <div className="p-4">
                <h4 className="text-xs font-semibold text-muted-foreground mb-3">
                  รายละเอียดการเคลื่อนไหวรายเดือน (Monthly Transaction Summary)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th rowSpan={2} className="border border-border p-2 text-left font-medium">เดือน</th>
                        <th colSpan={4} className="border border-border p-2 text-center font-medium">การหมุนเวียนตลอดเดือน</th>
                        <th rowSpan={2} className="border border-border p-2 text-right font-medium">ยอดเงินคงเหลือ</th>
                      </tr>
                      <tr className="bg-muted/50">
                        <th colSpan={2} className="border border-border p-2 text-center font-medium text-red-600">ถอน</th>
                        <th colSpan={2} className="border border-border p-2 text-center font-medium text-green-600">ฝาก</th>
                      </tr>
                      <tr className="bg-muted/30">
                        <th className="border border-border p-2 text-left font-normal text-muted-foreground"></th>
                        <th className="border border-border p-2 text-center font-normal text-muted-foreground">ครั้ง</th>
                        <th className="border border-border p-2 text-right font-normal text-muted-foreground">จำนวนเงิน</th>
                        <th className="border border-border p-2 text-center font-normal text-muted-foreground">ครั้ง</th>
                        <th className="border border-border p-2 text-right font-normal text-muted-foreground">จำนวนเงิน</th>
                        <th className="border border-border p-2 text-right font-normal text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Opening Balance Row */}
                      <tr className="bg-blue-50/50">
                        <td className="border border-border p-2 font-medium">ยอดยกมา</td>
                        <td className="border border-border p-2 text-center">-</td>
                        <td className="border border-border p-2 text-right">-</td>
                        <td className="border border-border p-2 text-center">-</td>
                        <td className="border border-border p-2 text-right">-</td>
                        <td className="border border-border p-2 text-right font-semibold text-blue-600">
                          {stmt.openingBalance < 0 ? `(${formatCurrency(Math.abs(stmt.openingBalance))})` : formatCurrency(stmt.openingBalance)}
                        </td>
                      </tr>

                      {/* Monthly Transaction Rows */}
                      {(stmt.monthlyTransactions || []).map((trans, tIdx) => (
                        <tr key={tIdx} className="hover:bg-muted/20 group">
                          <td className="border border-border p-1">
                            <Input
                              value={trans.month}
                              onChange={(e) => updateMonthlyTransaction(idx, tIdx, 'month', e.target.value)}
                              className="h-7 text-xs border-transparent hover:border-border bg-transparent"
                            />
                          </td>
                          <td className="border border-border p-1">
                            <Input
                              type="number"
                              value={trans.withdrawalCount}
                              onChange={(e) => updateMonthlyTransaction(idx, tIdx, 'withdrawalCount', parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs text-center border-transparent hover:border-border bg-transparent"
                            />
                          </td>
                          <td className="border border-border p-1">
                            <Input
                              type="number"
                              value={trans.withdrawalAmount}
                              onChange={(e) => updateMonthlyTransaction(idx, tIdx, 'withdrawalAmount', parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs text-right border-transparent hover:border-border bg-transparent text-red-600"
                            />
                          </td>
                          <td className="border border-border p-1">
                            <Input
                              type="number"
                              value={trans.depositCount}
                              onChange={(e) => updateMonthlyTransaction(idx, tIdx, 'depositCount', parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs text-center border-transparent hover:border-border bg-transparent"
                            />
                          </td>
                          <td className="border border-border p-1">
                            <Input
                              type="number"
                              value={trans.depositAmount}
                              onChange={(e) => updateMonthlyTransaction(idx, tIdx, 'depositAmount', parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs text-right border-transparent hover:border-border bg-transparent text-green-600"
                            />
                          </td>
                          <td className="border border-border p-1 relative group">
                            <Input
                              type="number"
                              value={trans.balance}
                              onChange={(e) => updateMonthlyTransaction(idx, tIdx, 'balance', parseFloat(e.target.value) || 0)}
                              className="h-7 text-xs text-right border-transparent hover:border-border bg-transparent font-medium pr-8"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMonthlyTransaction(idx, tIdx)}
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}

                      {/* Total Row */}
                      <tr className="bg-yellow-50/50 font-semibold">
                        <td className="border border-border p-2">รวม</td>
                        <td className="border border-border p-2 text-center">{totalWithdrawalCount.toLocaleString('th-TH')}</td>
                        <td className="border border-border p-2 text-right text-red-600">{formatCurrency(stmt.totalWithdrawals)}</td>
                        <td className="border border-border p-2 text-center">{totalDepositCount.toLocaleString('th-TH')}</td>
                        <td className="border border-border p-2 text-right text-green-600">{formatCurrency(stmt.totalDeposits)}</td>
                        <td className="border border-border p-2 text-right font-semibold">{formatCurrency(stmt.closingBalance)}</td>
                      </tr>

                      {/* Average Row */}
                      <tr className="bg-purple-50/50 font-medium">
                        <td className="border border-border p-2">เฉลี่ยเดือนละ</td>
                        <td className="border border-border p-2 text-center">{avgWithdrawalCount.toFixed(1)}</td>
                        <td className="border border-border p-2 text-right text-red-600">{formatCurrency(avgWithdrawalAmount)}</td>
                        <td className="border border-border p-2 text-center">{avgDepositCount.toFixed(1)}</td>
                        <td className="border border-border p-2 text-right text-green-600">{formatCurrency(avgDepositAmount)}</td>
                        <td className="border border-border p-2 text-right font-medium">{formatCurrency(stmt.averageBalance)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Add Transaction Button */}
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addMonthlyTransaction(idx)}
                    className="h-8 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" /> เพิ่มรายการรายเดือน
                  </Button>
                </div>

                {/* Summary Stats */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-muted-foreground mb-1">ยอดเปิด</div>
                    <div className="font-semibold">{formatCurrency(stmt.openingBalance)}</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-muted-foreground mb-1">ยอดปิด</div>
                    <div className="font-semibold">{formatCurrency(stmt.closingBalance)}</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-muted-foreground mb-1">ยอดเฉลี่ย</div>
                    <div className="font-semibold">{formatCurrency(stmt.averageBalance)}</div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-muted-foreground mb-1">Turnover</div>
                    <div className="font-semibold">{formatCurrency(stmt.turnover)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
