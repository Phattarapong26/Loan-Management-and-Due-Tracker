import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { CreditCard, Plus, Trash2, TrendingUp, DollarSign } from 'lucide-react';
import { customersApi } from '@/shared/lib/api-endpoints';
import { useEditableData } from '../../hooks/useEditableData';

// Types for AI extracted loan summary matching ParsedBusinessProfile
type LoanItem = {
  loanType?: string;
  productName?: string;
  amount?: number;
  outstandingDebt?: number;
  interestRate?: string;
  loanTerm?: string;
  collateral?: string;
  status?: string;
  [key: string]: unknown;
};

type LoanSummary = {
  existingLoans?: LoanItem[];
  newLoans?: LoanItem[];
  totalExisting?: number;
  totalNew?: number;
  totalAll?: number;
  [key: string]: unknown;
};

type AIData = {
  loanSummary?: LoanSummary | null;
  [key: string]: unknown;
};

interface LoanSummarySectionProps {
  aiData?: AIData | null;
  hasAIData: boolean;
  customerId: string;
  formatCurrency: (amount: number) => string;
  databaseLoans?: any[];
}

export function LoanSummarySection({ aiData, hasAIData, customerId, formatCurrency, databaseLoans = [] }: LoanSummarySectionProps) {
  // Merge database loans into newLoans
  const databaseLoansFormatted: LoanItem[] = databaseLoans.map((loan: any) => ({
    loanType: loan.loanProduct?.productCode || 'DB',
    productName: loan.loanProduct?.productName || 'สินเชื่อจากระบบ',
    amount: Number(loan.principal) || 0,
    outstandingDebt: Number(loan.outstandingBalance) || 0,
    interestRate: loan.interestRate ? `${loan.interestRate}%` : '-',
    loanTerm: loan.termMonths ? `${loan.termMonths} เดือน` : '-',
    collateral: '-',
    status: loan.status || 'ACTIVE',
  }));

  const initialData = {
    existingLoans: aiData?.loanSummary?.existingLoans || [],
    newLoans: [...(aiData?.loanSummary?.newLoans || []), ...databaseLoansFormatted],
    totalExisting: aiData?.loanSummary?.totalExisting || 0,
    totalNew: (aiData?.loanSummary?.totalNew || 0) + databaseLoansFormatted.reduce((sum, loan) => sum + (loan.amount || 0), 0),
    totalAll: (aiData?.loanSummary?.totalAll || 0) + databaseLoansFormatted.reduce((sum, loan) => sum + (loan.amount || 0), 0),
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
    updateFn: (data) => customersApi.updateWithAIData(customerId, { loanSummary: data }, 100, []),
    queryKey: ['customer', customerId],
  });

  const updateTableField = (table: 'existingLoans' | 'newLoans', index: number, field: string, value: string | number) => {
    const newData = [...(editedData[table] as LoanItem[])];
    newData[index] = { ...newData[index], [field]: value };
    
    // Recalculate totals
    const existingTotal = table === 'existingLoans' 
      ? newData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      : (editedData.existingLoans as LoanItem[]).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    const newTotal = table === 'newLoans'
      ? newData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      : (editedData.newLoans as LoanItem[]).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    updateField(table, newData);
    updateField('totalExisting', existingTotal);
    updateField('totalNew', newTotal);
    updateField('totalAll', existingTotal + newTotal);
  };

  const addItem = (table: 'existingLoans' | 'newLoans') => {
    const newItem: LoanItem = {
      loanType: 'PN',
      productName: 'สินเชื่อ SME',
      amount: 0,
      outstandingDebt: 0,
      interestRate: '-',
      loanTerm: '-',
      collateral: '-',
      status: table === 'existingLoans' ? 'เดิม' : 'ใหม่',
    };
    updateField(table, [...(editedData[table] as LoanItem[]), newItem]);
  };

  const removeItem = (table: 'existingLoans' | 'newLoans', index: number) => {
    const newData = [...(editedData[table] as LoanItem[])];
    newData.splice(index, 1);
    
    // Recalculate totals
    const existingTotal = table === 'existingLoans' 
      ? newData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      : (editedData.existingLoans as LoanItem[]).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    const newTotal = table === 'newLoans'
      ? newData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      : (editedData.newLoans as LoanItem[]).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

    updateField(table, newData);
    updateField('totalExisting', existingTotal);
    updateField('totalNew', newTotal);
    updateField('totalAll', existingTotal + newTotal);
  };

  const renderLoanTable = (loans: LoanItem[], type: 'existingLoans' | 'newLoans', title: string, colorClass: string) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center shadow-lg`}>
            {type === 'existingLoans' ? (
              <TrendingUp className="w-5 h-5 text-white" />
            ) : (
              <DollarSign className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h4 className="text-base font-bold text-gray-900">{title}</h4>
            <p className="text-xs text-gray-500">{loans.length} รายการ</p>
          </div>
        </div>
        {isEditing && (
          <Button size="sm" onClick={() => addItem(type)} variant="outline" className="h-8 gap-1 hover:bg-blue-50 hover:border-blue-300">
            <Plus className="w-3.5 h-3.5" /> เพิ่มรายการ
          </Button>
        )}
      </div>

      {loans.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={`${type === 'existingLoans' ? 'bg-gradient-to-r from-slate-50 to-gray-50' : 'bg-gradient-to-r from-blue-50 to-indigo-50'} border-b ${type === 'existingLoans' ? 'border-gray-200' : 'border-blue-200'}`}>
                <tr>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">ประเภท/โครงการ</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-700">วงเงิน</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-700">ภาระหนี้</th>
                  <th className="text-left py-3 px-4 font-bold text-gray-700">ดอกเบี้ย/ระยะเวลา</th>
                  {isEditing && <th className="py-3 px-4 w-12"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loans.map((loan, idx) => (
                  <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <Input 
                            value={loan.loanType} 
                            onChange={(e) => updateTableField(type, idx, 'loanType', e.target.value)}
                            className="h-7 text-xs font-bold"
                            placeholder="ประเภท"
                          />
                          <Input 
                            value={loan.productName} 
                            onChange={(e) => updateTableField(type, idx, 'productName', e.target.value)}
                            className="h-7 text-xs"
                            placeholder="โครงการ"
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-gray-900">{loan.loanType}</p>
                          <p className="text-xs text-gray-500">{loan.productName}</p>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <Input 
                          type="number"
                          value={loan.amount} 
                          onChange={(e) => updateTableField(type, idx, 'amount', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right font-bold"
                        />
                      ) : (
                        <span className={`font-bold ${type === 'existingLoans' ? 'text-gray-700' : 'text-blue-600'}`}>
                          {formatCurrency(loan.amount)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isEditing ? (
                        <Input 
                          type="number"
                          value={loan.outstandingDebt} 
                          onChange={(e) => updateTableField(type, idx, 'outstandingDebt', parseFloat(e.target.value) || 0)}
                          className="h-8 text-xs text-right"
                        />
                      ) : (
                        <span className="text-gray-600">{formatCurrency(loan.outstandingDebt || 0)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <Input 
                            value={loan.interestRate} 
                            onChange={(e) => updateTableField(type, idx, 'interestRate', e.target.value)}
                            className="h-7 text-xs"
                            placeholder="ดอกเบี้ย"
                          />
                          <Input 
                            value={loan.loanTerm} 
                            onChange={(e) => updateTableField(type, idx, 'loanTerm', e.target.value)}
                            className="h-7 text-xs"
                            placeholder="ระยะเวลา"
                          />
                        </div>
                      ) : (
                        <div className="text-xs space-y-0.5">
                          <p className="text-green-600 font-medium">{loan.interestRate}</p>
                          <p className="text-gray-500">{loan.loanTerm}</p>
                        </div>
                      )}
                    </td>
                    {isEditing && (
                      <td className="py-3 px-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeItem(type, idx)}
                          className="h-7 w-7 p-0 text-destructive hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
          <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 mb-2">ไม่มีรายการ{title}</p>
          {isEditing && (
            <Button onClick={() => addItem(type)} variant="outline" size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มรายการแรก
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white rounded-[24px]">
      <CardHeader className="p-8 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#E6F0FF] text-[#0065FB]">
              <CreditCard size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">สรุปวงเงินสินเชื่อ</h2>
              <p className="text-xs text-gray-400">รายละเอียดสินเชื่อเดิม สินเชื่อใหม่ และสัญญาที่มีผลบังคับ</p>
            </div>
          </div>
          {!isEditing ? (
            <button 
              onClick={handleEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-100 text-sm font-semibold hover:bg-gray-50 text-gray-700"
            >
              แก้ไขข้อมูล
            </button>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 text-gray-600"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[#0065FB] text-white text-sm font-semibold hover:bg-[#0052CC] disabled:opacity-50"
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-8 pt-0 space-y-8">
        {renderLoanTable(editedData.existingLoans as LoanItem[], 'existingLoans', 'สินเชื่อเดิม', 'bg-gray-600')}
        {renderLoanTable(editedData.newLoans as LoanItem[], 'newLoans', 'สินเชื่อใหม่', 'bg-[#0065FB]')}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="p-5 rounded-xl bg-gray-50 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">รวมสินเชื่อเดิม</p>
            </div>
            <p className="text-2xl font-black text-gray-700">{formatCurrency(editedData.totalExisting as number)}</p>
          </div>
          <div className="p-5 rounded-xl bg-[#E6F0FF] border border-[#CCE0FF]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#0065FB]" />
              <p className="text-xs text-[#003D99] font-bold uppercase tracking-wider">รวมสินเชื่อใหม่</p>
            </div>
            <p className="text-2xl font-black text-[#0065FB]">{formatCurrency(editedData.totalNew as number)}</p>
          </div>
          <div className="p-5 rounded-xl bg-gray-800 border border-gray-700 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-white" />
              <p className="text-xs text-gray-300 font-bold uppercase tracking-wider">วงเงินรวมทั้งหมด</p>
            </div>
            <p className="text-2xl font-black text-white">{formatCurrency(editedData.totalAll as number)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

