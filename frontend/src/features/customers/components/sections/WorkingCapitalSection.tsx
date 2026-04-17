import { Wallet, Plus, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { useEditableData } from '../../hooks/useEditableData';
import { customersApi } from '@/shared/lib/api-endpoints';
import { useMemo, useCallback } from 'react';

interface WCItem {
  label: string;
  amount: number;
}

type WorkingCapitalData = {
  accountsReceivable: number;
  inventory: number;
  accountsPayable: number;
  totalNeeded: number;
  existingCredit: number;
  newCredit: number;
  remaining: number;
  assets: WCItem[];
  liabilities: WCItem[];
} & Record<string, unknown>;

interface WorkingCapitalSectionProps {
  aiData?: {
    workingCapital?: Partial<WorkingCapitalData>;
  } | null;
  hasAIData: boolean;
  customerId: string;
  formatCurrency: (amount: number) => string;
}

export function WorkingCapitalSection({ aiData, customerId, formatCurrency }: WorkingCapitalSectionProps) {
  const initialData: WorkingCapitalData = {
    accountsReceivable: aiData?.workingCapital?.accountsReceivable || 0,
    inventory: aiData?.workingCapital?.inventory || 0,
    accountsPayable: aiData?.workingCapital?.accountsPayable || 0,
    totalNeeded: aiData?.workingCapital?.totalNeeded || 0,
    existingCredit: aiData?.workingCapital?.existingCredit || 0,
    newCredit: aiData?.workingCapital?.newCredit || 0,
    remaining: aiData?.workingCapital?.remaining || 0,
    assets: aiData?.workingCapital?.assets || [],
    liabilities: aiData?.workingCapital?.liabilities || [],
  };

  const {
    isEditing,
    editedData,
    isSaving,
    handleEdit,
    handleSave,
    handleCancel,
    updateField,
  } = useEditableData<WorkingCapitalData>({
    initialData,
    updateFn: (data) => customersApi.updateWithAIData(customerId, { workingCapital: data }, 100, []),
    queryKey: ['customer', customerId],
  });

  // Memoize total calculations
  const totalAssets = useMemo(() => 
    (editedData.assets as WCItem[]).reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [editedData.assets]
  );

  const totalLiabilities = useMemo(() => 
    (editedData.liabilities as WCItem[]).reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [editedData.liabilities]
  );

  const workingCapital = useMemo(() => totalAssets - totalLiabilities, [totalAssets, totalLiabilities]);

  const updateTableData = useCallback((type: 'assets' | 'liabilities', index: number, field: keyof WCItem, value: string | number) => {
    const newData = [...(editedData[type] as WCItem[])];
    newData[index] = { ...newData[index], [field]: value };
    
    // Recalculate total needed
    const calcTotalAssets = (type === 'assets' ? newData : (editedData.assets as WCItem[])).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const calcTotalLiabilities = (type === 'liabilities' ? newData : (editedData.liabilities as WCItem[])).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    
    updateField(type, newData);
    updateField('totalNeeded', calcTotalAssets - calcTotalLiabilities);
  }, [editedData, updateField]);

  const addItem = useCallback((type: 'assets' | 'liabilities') => {
    updateField(type, [...(editedData[type] as WCItem[]), { label: '', amount: 0 }]);
  }, [editedData, updateField]);

  const removeItem = useCallback((type: 'assets' | 'liabilities', index: number) => {
    const newData = [...(editedData[type] as WCItem[])];
    newData.splice(index, 1);
    updateField(type, newData);
  }, [editedData, updateField]);

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white rounded-[24px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-500">
      <CardHeader className="p-8 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-[#E6F6EE] text-[#00A950] shadow-sm">
              <Wallet size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A1D1F]">เงินทุนหมุนเวียน</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F767E]">Working Capital Analysis</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button 
                onClick={handleEdit}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-100 text-sm font-bold hover:bg-gray-50 text-[#1A1D1F] transition-all"
              >
                <Edit2 size={16} className="text-[#00A950]" /> แก้ไขข้อมูล
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
                  className="px-6 py-2.5 rounded-xl bg-[#00A950] text-white text-sm font-bold shadow-lg shadow-green-100 hover:bg-[#008F44] transition-all disabled:opacity-50"
                >
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <div className="space-y-8">
          {/* Main Visual Display */}
          <div className="relative overflow-hidden rounded-[28px] p-8 border bg-gradient-to-br from-[#E6F6EE] to-[#F0FAF4] border-[#CDEBDC]">
            <div className="absolute right-0 top-0 w-64 h-64 bg-white opacity-30 rounded-full -mr-20 -mt-20 blur-3xl" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="flex items-center gap-8">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-white shadow-xl flex items-center justify-center border-4 border-[#CDEBDC]">
                    <div className="text-center">
                      <div className="text-[10px] font-bold text-[#6F767E] uppercase tracking-wider mb-1">WC</div>
                      <div className="text-2xl font-black text-[#1A1D1F] tracking-tighter">
                        {(workingCapital / 1000000).toFixed(1)}M
                      </div>
                    </div>
                  </div>
                  <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-full border-4 border-white ${workingCapital >= 0 ? 'bg-[#00A950]' : 'bg-[#E03131]'} flex items-center justify-center text-white shadow-lg`}>
                    {workingCapital >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold ${workingCapital >= 0 ? 'bg-[#E6F6EE] text-[#00A950] border border-[#CDEBDC]' : 'bg-[#FFF0F0] text-[#E03131] border border-[#F8D7D7]'}`}>
                      {workingCapital >= 0 ? (
                        <><TrendingUp className="w-3.5 h-3.5 mr-1.5" /> สภาพคล่องดี</>
                      ) : (
                        <><TrendingDown className="w-3.5 h-3.5 mr-1.5" /> ต้องเพิ่มสภาพคล่อง</>
                      )}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-[#1A1D1F]">เงินทุนหมุนเวียนสุทธิ</h3>
                  <p className="text-sm text-[#6F767E] max-w-xs mt-1">
                    สินทรัพย์หมุนเวียนหักหนี้สินหมุนเวียน
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 backdrop-blur-md px-5 py-4 rounded-2xl border border-white shadow-sm">
                  <p className="text-[10px] font-bold text-[#6F767E] uppercase tracking-widest mb-1">สินทรัพย์</p>
                  <p className="text-lg font-black text-[#00A950]">{formatCurrency(totalAssets)}</p>
                </div>
                <div className="bg-white/80 backdrop-blur-md px-5 py-4 rounded-2xl border border-white shadow-sm">
                  <p className="text-[10px] font-bold text-[#6F767E] uppercase tracking-widest mb-1">หนี้สิน</p>
                  <p className="text-lg font-black text-[#E03131]">{formatCurrency(totalLiabilities)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Credit Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border-2 border-gray-100 hover:border-[#00A950] transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#E6F6EE] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="w-5 h-5 text-[#00A950]" />
                </div>
                <p className="text-xs font-bold text-[#6F767E] uppercase tracking-wider">วงเงินปัจจุบัน</p>
              </div>
              <p className="text-2xl font-black text-[#1A1D1F]">{formatCurrency(Number(editedData.existingCredit))}</p>
              <p className="text-[10px] text-[#6F767E] mt-1">Existing Credit Line</p>
            </div>
            <div className="p-5 rounded-2xl bg-white border-2 border-gray-100 hover:border-[#00A950] transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF9E6] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5 text-[#947600]" />
                </div>
                <p className="text-xs font-bold text-[#6F767E] uppercase tracking-wider">วงเงินที่ขอใหม่</p>
              </div>
              <p className="text-2xl font-black text-[#1A1D1F]">{formatCurrency(Number(editedData.newCredit))}</p>
              <p className="text-[10px] text-[#6F767E] mt-1">New Credit Request</p>
            </div>
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#00A950] to-[#008F44] text-white shadow-lg shadow-green-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider opacity-90">ส่วนต่าง</p>
              </div>
              <p className="text-2xl font-black">{formatCurrency(Number(editedData.remaining))}</p>
              <p className="text-[10px] opacity-75 mt-1">Remaining Balance</p>
            </div>
          </div>

          {/* Assets & Liabilities Tables */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Assets Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#1A1D1F]">สินทรัพย์หมุนเวียน</h4>
                  <p className="text-xs text-[#6F767E]">Current Assets</p>
                </div>
                {isEditing && (
                  <Button onClick={() => addItem('assets')} size="sm" variant="outline" className="h-8 gap-1 hover:bg-green-50 hover:border-green-300 hover:text-[#00A950]">
                    <Plus className="w-3.5 h-3.5" /> เพิ่ม
                  </Button>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border-2 border-gray-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-[#E6F6EE] to-[#F0FAF4] border-b-2 border-[#CDEBDC]">
                    <tr>
                      <th className="text-left py-3 px-4 font-bold text-[#1A1D1F]">รายการ</th>
                      <th className="text-right py-3 px-4 font-bold text-[#1A1D1F]">จำนวนเงิน</th>
                      {isEditing && <th className="w-12"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(editedData.assets as WCItem[]).map((item, idx) => (
                      <tr key={idx} className="hover:bg-green-50/30 transition-colors">
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input 
                              value={item.label} 
                              onChange={(e) => updateTableData('assets', idx, 'label', e.target.value)} 
                              className="h-8 text-xs border-2 focus:border-[#00A950]" 
                              placeholder="ชื่อรายการ"
                            />
                          ) : (
                            <span className="text-[#1A1D1F] font-medium">{item.label || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <Input 
                              type="number" 
                              value={item.amount} 
                              onChange={(e) => updateTableData('assets', idx, 'amount', parseFloat(e.target.value) || 0)} 
                              className="h-8 text-xs text-right font-bold border-2 focus:border-[#00A950]"
                            />
                          ) : (
                            <span className="font-bold text-[#00A950]">{formatCurrency(item.amount)}</span>
                          )}
                        </td>
                        {isEditing && (
                          <td className="py-3 px-4 text-right">
                            <Button 
                              onClick={() => removeItem('assets', idx)} 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-destructive hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(editedData.assets as WCItem[]).length === 0 && (
                      <tr>
                        <td colSpan={isEditing ? 3 : 2} className="py-8 text-center text-sm text-[#6F767E]">
                          ไม่มีรายการสินทรัพย์หมุนเวียน
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gradient-to-r from-[#E6F6EE] to-[#F0FAF4] border-t-2 border-[#CDEBDC]">
                    <tr>
                      <td className="py-3 px-4 font-bold text-[#1A1D1F]">รวมสินทรัพย์หมุนเวียน</td>
                      <td className="py-3 px-4 text-right font-black text-[#00A950]">{formatCurrency(totalAssets)}</td>
                      {isEditing && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Liabilities Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#1A1D1F]">หนี้สินหมุนเวียน</h4>
                  <p className="text-xs text-[#6F767E]">Current Liabilities</p>
                </div>
                {isEditing && (
                  <Button onClick={() => addItem('liabilities')} size="sm" variant="outline" className="h-8 gap-1 hover:bg-red-50 hover:border-red-300 hover:text-red-600">
                    <Plus className="w-3.5 h-3.5" /> เพิ่ม
                  </Button>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border-2 border-gray-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-[#FFF0F0] to-[#FFF5F5] border-b-2 border-[#F8D7D7]">
                    <tr>
                      <th className="text-left py-3 px-4 font-bold text-[#1A1D1F]">รายการ</th>
                      <th className="text-right py-3 px-4 font-bold text-[#1A1D1F]">จำนวนเงิน</th>
                      {isEditing && <th className="w-12"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(editedData.liabilities as WCItem[]).map((item, idx) => (
                      <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input 
                              value={item.label} 
                              onChange={(e) => updateTableData('liabilities', idx, 'label', e.target.value)} 
                              className="h-8 text-xs border-2 focus:border-red-400"
                              placeholder="ชื่อรายการ"
                            />
                          ) : (
                            <span className="text-[#1A1D1F] font-medium">{item.label || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <Input 
                              type="number" 
                              value={item.amount} 
                              onChange={(e) => updateTableData('liabilities', idx, 'amount', parseFloat(e.target.value) || 0)} 
                              className="h-8 text-xs text-right font-bold border-2 focus:border-red-400"
                            />
                          ) : (
                            <span className="font-bold text-[#E03131]">{formatCurrency(item.amount)}</span>
                          )}
                        </td>
                        {isEditing && (
                          <td className="py-3 px-4 text-right">
                            <Button 
                              onClick={() => removeItem('liabilities', idx)} 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 w-7 p-0 text-destructive hover:bg-red-100"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(editedData.liabilities as WCItem[]).length === 0 && (
                      <tr>
                        <td colSpan={isEditing ? 3 : 2} className="py-8 text-center text-sm text-[#6F767E]">
                          ไม่มีรายการหนี้สินหมุนเวียน
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gradient-to-r from-[#FFF0F0] to-[#FFF5F5] border-t-2 border-[#F8D7D7]">
                    <tr>
                      <td className="py-3 px-4 font-bold text-[#1A1D1F]">รวมหนี้สินหมุนเวียน</td>
                      <td className="py-3 px-4 text-right font-black text-[#E03131]">{formatCurrency(totalLiabilities)}</td>
                      {isEditing && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Formula Box */}
          <div className="bg-[#1A1D1F] rounded-[24px] p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00A950] opacity-20 blur-[60px] group-hover:opacity-40 transition-opacity" />
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[#00A950] flex items-center justify-center shrink-0">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-bold">สูตรการคำนวณ</h4>
                  <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded-full text-gray-400">Standard Formula</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-mono">
                  Working Capital = <span className="text-white">Current Assets</span> - <span className="text-white">Current Liabilities</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-[#00A950]" />
                  <p className="text-[10px] text-gray-500">
                    เงินทุนหมุนเวียนที่เพียงพอจะช่วยให้ธุรกิจมีสภาพคล่องในการดำเนินงานประจำวัน
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
