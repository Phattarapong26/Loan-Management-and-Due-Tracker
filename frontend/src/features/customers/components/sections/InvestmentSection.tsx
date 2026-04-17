import { Wallet, Plus, Trash2, TrendingUp, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { EditableSection } from '../EditableSection';
import { useEditableData } from '../../hooks/useEditableData';
import { customersApi } from '@/shared/lib/api-endpoints';
import { useMemo, useCallback } from 'react';

interface InvestmentItem {
  item: string;
  amount: number;
}

type InvestmentData = {
  totalInvestment: number;
  ownerEquity: number;
  otherLoans: number;
  requestedLoan: number;
  debtToEquityRatio: number;
  investmentItems: InvestmentItem[];
} & Record<string, unknown>;

interface InvestmentSectionProps {
  aiData?: {
    investmentStructure?: Partial<InvestmentData>;
  } | null;
  hasAIData: boolean;
  customerId: string;
  formatCurrency: (amount: number) => string;
}

export function InvestmentSection({ aiData, hasAIData, customerId, formatCurrency }: InvestmentSectionProps) {
  const initialData: InvestmentData = {
    totalInvestment: aiData?.investmentStructure?.totalInvestment || 0,
    ownerEquity: aiData?.investmentStructure?.ownerEquity || 0,
    otherLoans: aiData?.investmentStructure?.otherLoans || 0,
    requestedLoan: aiData?.investmentStructure?.requestedLoan || 0,
    debtToEquityRatio: aiData?.investmentStructure?.debtToEquityRatio || 0,
    investmentItems: aiData?.investmentStructure?.investmentItems || [],
  };

  const {
    isEditing,
    editedData,
    isSaving,
    handleEdit,
    handleSave,
    handleCancel,
    updateField,
  } = useEditableData<InvestmentData>({
    initialData,
    updateFn: (data) => customersApi.updateWithAIData(customerId, { investmentStructure: data }, 100, []),
    queryKey: ['customer', customerId],
  });

  // Memoize total calculation
  const totalInvestmentCalculated = useMemo(() => 
    (editedData.investmentItems as InvestmentItem[]).reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [editedData.investmentItems]
  );

  const updateInvestmentField = useCallback((field: keyof InvestmentData, value: string | number | InvestmentItem[]) => {
    updateField(field, value);
  }, [updateField]);

  // Improved calculation logic using state effects or manual updates
  const updateItem = useCallback((index: number, field: keyof InvestmentItem, value: string | number) => {
    const newItems = [...(editedData.investmentItems as InvestmentItem[])];
    newItems[index] = { ...newItems[index], [field]: value };
    
    const total = newItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    updateField('investmentItems', newItems);
    updateField('totalInvestment', total);
    
    // Recalculate D/E
    const totalDebt = (Number(editedData.requestedLoan) || 0) + (Number(editedData.otherLoans) || 0);
    const equity = Number(editedData.ownerEquity) || 1;
    updateField('debtToEquityRatio', totalDebt / equity);
  }, [editedData, updateField]);

  const addItem = useCallback(() => {
    const newItems = [...(editedData.investmentItems as InvestmentItem[]), { item: '', amount: 0 }];
    updateField('investmentItems', newItems);
  }, [editedData.investmentItems, updateField]);

  const removeItem = useCallback((index: number) => {
    const newItems = [...(editedData.investmentItems as InvestmentItem[])];
    newItems.splice(index, 1);
    const total = newItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    updateField('investmentItems', newItems);
    updateField('totalInvestment', total);
  }, [editedData.investmentItems, updateField]);

  const onEquityChange = useCallback((val: number) => {
    updateField('ownerEquity', val);
    const totalDebt = (Number(editedData.requestedLoan) || 0) + (Number(editedData.otherLoans) || 0);
    updateField('debtToEquityRatio', totalDebt / (val || 1));
  }, [editedData.requestedLoan, editedData.otherLoans, updateField]);

  const onRequestLoanChange = (val: number) => {
    updateField('requestedLoan', val);
    const totalDebt = val + (Number(editedData.otherLoans) || 0);
    updateField('debtToEquityRatio', totalDebt / (Number(editedData.ownerEquity) || 1));
  };

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white rounded-[24px]">
      <CardHeader className="p-8 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#E6F0FF] text-[#0065FB]">
              <Wallet size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">โครงสร้างการลงทุน</h2>
              <p className="text-xs text-gray-400">แหล่งเงินทุนและโครงสร้างหนี้</p>
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
      <CardContent className="p-8 pt-0">
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#E6F0FF] border border-[#CCE0FF]">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4 text-[#0065FB]" />
                <p className="text-[10px] font-bold text-[#003D99] uppercase tracking-wider">เงินลงทุนรวม</p>
              </div>
              <p className="text-2xl font-black text-[#0065FB]">{formatCurrency(Number(editedData.totalInvestment))}</p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F0E6FF] border border-[#E0D1F8]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-[#6F42C1]" />
                <p className="text-[10px] font-bold text-[#4F3589] uppercase tracking-wider">สัดส่วน D/E</p>
              </div>
              <p className="text-2xl font-black text-[#6F42C1]">{(Number(editedData.debtToEquityRatio) || 0).toFixed(2)}</p>
            </div>
          </div>

          {/* Equity & Loan Fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                ส่วนของเจ้าของ (Equity)
              </label>
              {isEditing ? (
                <Input 
                  type="number"
                  value={Number(editedData.ownerEquity)}
                  onChange={(e) => onEquityChange(parseFloat(e.target.value) || 0)}
                  className="h-10 text-base font-semibold"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-lg font-bold text-gray-800">{formatCurrency(Number(editedData.ownerEquity))}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                วงเงินที่ขอกู้
              </label>
              {isEditing ? (
                <Input 
                  type="number"
                  value={Number(editedData.requestedLoan)}
                  onChange={(e) => onRequestLoanChange(parseFloat(e.target.value) || 0)}
                  className="h-10 text-base font-semibold"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-lg font-bold text-gray-800">{formatCurrency(Number(editedData.requestedLoan))}</p>
                </div>
              )}
            </div>
          </div>

          {/* Investment Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-gray-700">รายละเอียดการลงทุน</p>
                <Badge variant="secondary" className="text-xs">
                  {(editedData.investmentItems as InvestmentItem[]).length} รายการ
                </Badge>
              </div>
              {isEditing && (
                <Button onClick={addItem} size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" /> เพิ่ม
                </Button>
              )}
            </div>

            {(editedData.investmentItems as InvestmentItem[]).length > 0 ? (
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-bold text-gray-700">รายการ</th>
                      <th className="text-right py-3 px-4 font-bold text-gray-700">จำนวนเงิน</th>
                      {isEditing && <th className="w-12"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(editedData.investmentItems as InvestmentItem[]).map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input 
                              value={item.item}
                              onChange={(e) => updateItem(idx, 'item', e.target.value)}
                              className="h-8 text-sm font-medium"
                              placeholder="ชื่อรายการ"
                            />
                          ) : (
                            <span className="font-medium text-gray-900">{item.item}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <Input 
                              type="number"
                              value={item.amount}
                              onChange={(e) => updateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
                              className="h-8 text-sm text-right"
                            />
                          ) : (
                            <span className="font-bold text-gray-800">{formatCurrency(item.amount)}</span>
                          )}
                        </td>
                        {isEditing && (
                          <td className="py-3 px-2 text-center">
                            <Button onClick={() => removeItem(idx)} variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:bg-red-100">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-500 mb-2">ไม่มีข้อมูลรายการลงทุน</p>
                {isEditing && (
                  <Button onClick={addItem} variant="outline" size="sm">
                    <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มรายการแรก
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
