import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { Landmark, Plus, Trash2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { customersApi } from '@/shared/lib/api-endpoints';
import { EditableSection } from '../EditableSection';
import { useEditableData } from '../../hooks/useEditableData';
import { useState } from 'react';

// Types for AI extracted bank statement matching ParsedBusinessProfile
type MonthlyTransaction = {
  month: string;
  withdrawalCount: number;
  withdrawalAmount: number;
  depositCount: number;
  depositAmount: number;
  balance: number;
};

type BankStatement = {
  accountName?: string;
  bank?: string;
  accountNumber?: string;
  accountType?: string;
  creditLimit?: number;
  period?: string;
  openingBalance?: number;
  closingBalance?: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
  averageBalance?: number;
  turnover?: number;
  monthlyTransactions?: MonthlyTransaction[];
  [key: string]: unknown;
};

type AIData = {
  bankStatements?: BankStatement[];
  [key: string]: unknown;
};

interface BankStatementSectionProps {
  aiData?: AIData | null;
  hasAIData: boolean;
  customerId: string;
  formatCurrency: (amount: number) => string;
}

export function BankStatementSection({ aiData, customerId, formatCurrency }: BankStatementSectionProps) {
  const [expandedAccounts, setExpandedAccounts] = useState<Set<number>>(new Set());

  const initialData = {
    bankStatements: aiData?.bankStatements || [],
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

  const updateStatement = (index: number, field: string, value: string | number) => {
    const newData = [...(editedData.bankStatements as BankStatement[])];
    newData[index] = { ...newData[index], [field]: value };
    updateField('bankStatements', newData);
  };

  const addStatement = () => {
    const newItem: BankStatement = {
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
    };
    updateField('bankStatements', [...(editedData.bankStatements as BankStatement[]), newItem]);
  };

  const removeStatement = (index: number) => {
    const newData = [...(editedData.bankStatements as BankStatement[])];
    newData.splice(index, 1);
    updateField('bankStatements', newData);
  };

  const updateMonthlyTransaction = (
    stmtIndex: number,
    transIndex: number,
    field: string,
    value: string | number
  ) => {
    const newItems = [...(editedData.bankStatements as BankStatement[])];
    const stmt = { ...newItems[stmtIndex] };
    const transactions = [...(stmt.monthlyTransactions || [])];
    transactions[transIndex] = { ...transactions[transIndex], [field]: value };
    stmt.monthlyTransactions = transactions;
    
    // Recalculate totals
    stmt.totalWithdrawals = transactions.reduce((sum, t) => sum + (t.withdrawalAmount || 0), 0);
    stmt.totalDeposits = transactions.reduce((sum, t) => sum + (t.depositAmount || 0), 0);
    stmt.turnover = (stmt.totalWithdrawals || 0) + (stmt.totalDeposits || 0);
    
    // Update closing balance (last transaction's balance)
    if (transactions.length > 0) {
      stmt.closingBalance = transactions[transactions.length - 1].balance;
    }
    
    // Recalculate average balance
    const balanceSum = transactions.reduce((sum, t) => sum + Math.abs(t.balance || 0), 0);
    stmt.averageBalance = transactions.length > 0 ? balanceSum / transactions.length : 0;
    
    newItems[stmtIndex] = stmt;
    updateField('bankStatements', newItems);
  };

  const addMonthlyTransaction = (stmtIndex: number) => {
    const newItems = [...(editedData.bankStatements as BankStatement[])];
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
    updateField('bankStatements', newItems);
  };

  const removeMonthlyTransaction = (stmtIndex: number, transIndex: number) => {
    const newItems = [...(editedData.bankStatements as BankStatement[])];
    const stmt = { ...newItems[stmtIndex] };
    const transactions = [...(stmt.monthlyTransactions || [])];
    
    transactions.splice(transIndex, 1);
    stmt.monthlyTransactions = transactions;
    
    // Recalculate totals
    stmt.totalWithdrawals = transactions.reduce((sum, t) => sum + (t.withdrawalAmount || 0), 0);
    stmt.totalDeposits = transactions.reduce((sum, t) => sum + (t.depositAmount || 0), 0);
    stmt.turnover = (stmt.totalWithdrawals || 0) + (stmt.totalDeposits || 0);
    
    // Update closing balance
    if (transactions.length > 0) {
      stmt.closingBalance = transactions[transactions.length - 1].balance;
    } else {
      stmt.closingBalance = stmt.openingBalance || 0;
    }
    
    // Recalculate average balance
    const balanceSum = transactions.reduce((sum, t) => sum + Math.abs(t.balance || 0), 0);
    stmt.averageBalance = transactions.length > 0 ? balanceSum / transactions.length : 0;
    
    newItems[stmtIndex] = stmt;
    updateField('bankStatements', newItems);
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

  const bankStatements = editedData.bankStatements as BankStatement[];

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-white">
      <CardHeader className="bg-white border-b border-gray-200">
        <EditableSection
          title="การเคลื่อนไหวทางบัญชี"
          icon={<Landmark className="h-5 w-5 text-cyan-600" />}
          isEditing={isEditing}
          onEdit={handleEdit}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        >
          {null}
        </EditableSection>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Add Statement Button */}
        {isEditing && (
          <div className="flex justify-end">
            <Button size="sm" onClick={addStatement} variant="outline" className="h-8 gap-1 hover:bg-cyan-50 hover:border-cyan-300">
              <Plus className="w-3.5 h-3.5" /> เพิ่มบัญชี
            </Button>
          </div>
        )}

        {/* Empty State */}
        {bankStatements.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
            <Landmark className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500 mb-2">ไม่พบข้อมูล Bank Statement</p>
            {isEditing && (
              <Button onClick={addStatement} variant="outline" size="sm" className="mt-2">
                <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มบัญชีแรก
              </Button>
            )}
          </div>
        )}

          {bankStatements.map((stmt, idx) => {
            const isExpanded = expandedAccounts.has(idx);
            const totalWithdrawalCount = stmt.monthlyTransactions?.reduce((sum, t) => sum + (t.withdrawalCount || 0), 0) || 0;
            const totalDepositCount = stmt.monthlyTransactions?.reduce((sum, t) => sum + (t.depositCount || 0), 0) || 0;
            const avgWithdrawalCount = stmt.monthlyTransactions?.length ? totalWithdrawalCount / stmt.monthlyTransactions.length : 0;
            const avgDepositCount = stmt.monthlyTransactions?.length ? totalDepositCount / stmt.monthlyTransactions.length : 0;
            const avgWithdrawalAmount = stmt.monthlyTransactions?.length ? (stmt.totalWithdrawals || 0) / stmt.monthlyTransactions.length : 0;
            const avgDepositAmount = stmt.monthlyTransactions?.length ? (stmt.totalDeposits || 0) / stmt.monthlyTransactions.length : 0;

            return (
            <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Header Section */}
              <div className=" bg-white p-5 border-b  ">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <Landmark className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        บัญชีที่ {idx + 1}
                      </h3>
                      <p className="text-sm text-gray-500">การเคลื่อนไหวทางบัญชีของนิติบุคคล</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => toggleExpand(idx)}
                      className="h-8 px-3 text-sm gap-1 hover:bg-white"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isExpanded ? 'ซ่อน' : 'แสดง'}
                    </Button>
                    {isEditing && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeStatement(idx)}
                        className="h-8 w-8 p-0 text-destructive hover:bg-red-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Account Information Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3">
                    <label className="text-sm text-gray-500 block mb-1.5 font-medium">ธนาคาร</label>
                    {isEditing ? (
                      <Input 
                        value={stmt.bank || ''} 
                        onChange={(e) => updateStatement(idx, 'bank', e.target.value)}
                        className="h-8 text-sm font-medium"
                        placeholder="เช่น ไทยพาณิชย์"
                      />
                    ) : (
                      <div className="text-sm font-bold text-gray-900">{stmt.bank || '-'}</div>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-3 ">
                    <label className="text-sm text-gray-500 block mb-1.5 font-medium">ชื่อบัญชี</label>
                    {isEditing ? (
                      <Input 
                        value={stmt.accountName || ''} 
                        onChange={(e) => updateStatement(idx, 'accountName', e.target.value)}
                        className="h-8 text-sm font-medium"
                        placeholder="ชื่อบัญชี"
                      />
                    ) : (
                      <div className="text-sm font-bold text-gray-900">{stmt.accountName || '-'}</div>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-3 ">
                    <label className="text-sm text-gray-500 block mb-1.5 font-medium">เลขที่บัญชี</label>
                    {isEditing ? (
                      <Input 
                        value={stmt.accountNumber || ''} 
                        onChange={(e) => updateStatement(idx, 'accountNumber', e.target.value)}
                        className="h-8 text-sm font-mono"
                        placeholder="xxx-xxxxxx-x"
                      />
                    ) : (
                      <div className="text-sm font-bold text-gray-900 font-mono">{stmt.accountNumber || '-'}</div>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-3 ">
                    <label className="text-sm text-gray-500 block mb-1.5 font-medium">ประเภทบัญชี</label>
                    {isEditing ? (
                      <Input 
                        value={stmt.accountType || ''} 
                        onChange={(e) => updateStatement(idx, 'accountType', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="เดินสะพัด"
                      />
                    ) : (
                      <div className="text-sm font-bold text-gray-900">{stmt.accountType || '-'}</div>
                    )}
                  </div>
                  <div className="bg-white rounded-lg p-3  md:col-span-2">
                    <label className="text-sm text-gray-500 block mb-1.5 font-medium">วงเงิน (ล้านบาท)</label>
                    {isEditing ? (
                      <Input 
                        type="number"
                        value={(stmt.creditLimit || 0) / 1000000} 
                        onChange={(e) => updateStatement(idx, 'creditLimit', (parseFloat(e.target.value) || 0) * 1000000)}
                        className="h-8 text-sm text-right font-semibold"
                        placeholder="6.00"
                        step="0.01"
                      />
                    ) : (
                      <div className="text-sm font-bold text-cyan-600 text-right">
                        {((stmt.creditLimit || 0) / 1000000).toFixed(2)} ล้านบาท
                      </div>
                    )}
                  </div>
                </div>
              </div>

                {/* Monthly Transactions Table */}
                {isExpanded && (
                  <div className="p-4">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                      รายละเอียดการเคลื่อนไหวรายเดือน (Monthly Transaction Summary)
                    </h4>
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-sm border-collapse">
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
                              {(stmt.openingBalance || 0) < 0 
                                ? `(${formatCurrency(Math.abs(stmt.openingBalance || 0))})` 
                                : formatCurrency(stmt.openingBalance || 0)}
                            </td>
                          </tr>

                          {/* Monthly Transaction Rows */}
                          {(stmt.monthlyTransactions || []).map((trans, tIdx) => (
                            <tr key={tIdx} className="hover:bg-muted/20 group">
                              <td className="border border-border p-1">
                                {isEditing ? (
                                  <Input
                                    value={trans.month}
                                    onChange={(e) => updateMonthlyTransaction(idx, tIdx, 'month', e.target.value)}
                                    className="h-7 text-xs border-transparent hover:border-border bg-transparent"
                                  />
                                ) : (
                                  <span className="px-2">{trans.month}</span>
                                )}
                              </td>
                              <td className="border border-border p-1">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={trans.withdrawalCount}
                                    onChange={(e) => updateMonthlyTransaction(idx, tIdx, 'withdrawalCount', parseFloat(e.target.value) || 0)}
                                    className="h-7 text-xs text-center border-transparent hover:border-border bg-transparent"
                                  />
                                ) : (
                                  <div className="text-center">{trans.withdrawalCount}</div>
                                )}
                              </td>
                              <td className="border border-border p-1">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={trans.withdrawalAmount}
                                    onChange={(e) => updateMonthlyTransaction(idx, tIdx, 'withdrawalAmount', parseFloat(e.target.value) || 0)}
                                    className="h-7 text-xs text-right border-transparent hover:border-border bg-transparent text-red-600"
                                  />
                                ) : (
                                  <div className="text-right text-red-600 font-mono">{formatCurrency(trans.withdrawalAmount)}</div>
                                )}
                              </td>
                              <td className="border border-border p-1">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={trans.depositCount}
                                    onChange={(e) => updateMonthlyTransaction(idx, tIdx, 'depositCount', parseFloat(e.target.value) || 0)}
                                    className="h-7 text-xs text-center border-transparent hover:border-border bg-transparent"
                                  />
                                ) : (
                                  <div className="text-center">{trans.depositCount}</div>
                                )}
                              </td>
                              <td className="border border-border p-1">
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={trans.depositAmount}
                                    onChange={(e) => updateMonthlyTransaction(idx, tIdx, 'depositAmount', parseFloat(e.target.value) || 0)}
                                    className="h-7 text-xs text-right border-transparent hover:border-border bg-transparent text-green-600"
                                  />
                                ) : (
                                  <div className="text-right text-green-600 font-mono">{formatCurrency(trans.depositAmount)}</div>
                                )}
                              </td>
                              <td className="border border-border p-1 relative group">
                                {isEditing ? (
                                  <>
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
                                  </>
                                ) : (
                                  <div className="text-right font-medium font-mono">{formatCurrency(trans.balance)}</div>
                                )}
                              </td>
                            </tr>
                          ))}

                          {/* Total Row */}
                          <tr className="bg-yellow-50/50 font-semibold">
                            <td className="border border-border p-2">รวม</td>
                            <td className="border border-border p-2 text-center">{totalWithdrawalCount.toLocaleString('th-TH')}</td>
                            <td className="border border-border p-2 text-right text-red-600 font-mono">{formatCurrency(stmt.totalWithdrawals || 0)}</td>
                            <td className="border border-border p-2 text-center">{totalDepositCount.toLocaleString('th-TH')}</td>
                            <td className="border border-border p-2 text-right text-green-600 font-mono">{formatCurrency(stmt.totalDeposits || 0)}</td>
                            <td className="border border-border p-2 text-right font-semibold font-mono">{formatCurrency(stmt.closingBalance || 0)}</td>
                          </tr>

                          {/* Average Row */}
                          <tr className="bg-purple-50/50 font-medium">
                            <td className="border border-border p-2">เฉลี่ยเดือนละ</td>
                            <td className="border border-border p-2 text-center">{avgWithdrawalCount.toFixed(1)}</td>
                            <td className="border border-border p-2 text-right text-red-600 font-mono">{formatCurrency(avgWithdrawalAmount)}</td>
                            <td className="border border-border p-2 text-center">{avgDepositCount.toFixed(1)}</td>
                            <td className="border border-border p-2 text-right text-green-600 font-mono">{formatCurrency(avgDepositAmount)}</td>
                            <td className="border border-border p-2 text-right font-medium font-mono">{formatCurrency(stmt.averageBalance || 0)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Add Transaction Button */}
                    {isEditing && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addMonthlyTransaction(idx)}
                          className="h-8 text-sm"
                        >
                          <Plus className="w-3 h-3 mr-1" /> เพิ่มรายการรายเดือน
                        </Button>
                      </div>
                    )}

                    {/* Summary Stats */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-muted-foreground mb-1">ยอดเปิด</div>
                        <div className="font-semibold">{formatCurrency(stmt.openingBalance || 0)}</div>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-muted-foreground mb-1">ยอดปิด</div>
                        <div className="font-semibold">{formatCurrency(stmt.closingBalance || 0)}</div>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-muted-foreground mb-1">ยอดเฉลี่ย</div>
                        <div className="font-semibold">{formatCurrency(stmt.averageBalance || 0)}</div>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-muted-foreground mb-1">Turnover</div>
                        <div className="font-semibold">{formatCurrency(stmt.turnover || 0)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
    </Card>
  );
}
