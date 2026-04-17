import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Users, Plus, Trash2, TrendingUp, Award } from 'lucide-react';
import { customersApi } from '@/shared/lib/api-endpoints';
import { EditableSection } from '../EditableSection';
import { useEditableData } from '../../hooks/useEditableData';
import { useMemo, useCallback } from 'react';

// Types for shareholders
type Shareholder = {
  name?: string;
  percentage?: number;
  amount?: number;
  hasAuthority?: boolean;
  [key: string]: unknown;
};

type ShareholderData = {
  shareholders: Shareholder[];
} & Record<string, unknown>;

interface ShareholdersSectionProps {
  aiData?: {
    shareholders?: (Shareholder & { sharePercentage?: number; shareValue?: number; hasSigningAuthority?: boolean })[] | null;
  } | null;
  hasAIData: boolean;
  customerId: string;
}

export function ShareholdersSection({ aiData, hasAIData, customerId }: ShareholdersSectionProps) {
  // Memoize initial data transformation
  const initialData: ShareholderData = useMemo(() => ({
    shareholders: (aiData?.shareholders || []).map(s => ({
      name: s.name || '',
      percentage: s.percentage ?? s.sharePercentage ?? 0,
      amount: s.amount ?? s.shareValue ?? 0,
      hasAuthority: !!(s.hasAuthority ?? s.hasSigningAuthority),
    })),
  }), [aiData?.shareholders]);

  const {
    isEditing,
    editedData,
    isSaving,
    handleEdit,
    handleSave,
    handleCancel,
    updateField,
  } = useEditableData<ShareholderData>({
    initialData,
    updateFn: (data) => customersApi.updateWithAIData(customerId, { shareholders: data.shareholders }, 100, []),
    queryKey: ['customer', customerId],
  });

  const updateShareholder = useCallback((index: number, field: keyof Shareholder, value: string | number | boolean) => {
    const newData = [...(editedData.shareholders as Shareholder[])];
    newData[index] = { ...newData[index], [field]: value };
    updateField('shareholders', newData);
  }, [editedData.shareholders, updateField]);

  const addShareholder = useCallback(() => {
    updateField('shareholders', [
      ...(editedData.shareholders as Shareholder[]),
      { name: '', percentage: 0, amount: 0, hasAuthority: false }
    ]);
  }, [editedData.shareholders, updateField]);

  const removeShareholder = useCallback((index: number) => {
    const newData = [...(editedData.shareholders as Shareholder[])];
    newData.splice(index, 1);
    updateField('shareholders', newData);
  }, [editedData.shareholders, updateField]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const shareholders = editedData.shareholders as Shareholder[];
  
  // Calculate total percentage
  const totalPercentage = shareholders.reduce((sum, s) => sum + (Number(s.percentage) || 0), 0);

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white rounded-[24px]">
      <CardHeader className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users size={20} className="text-[#0065FB]" />
            <h3 className="font-bold text-gray-900">โครงสร้างผู้ถือหุ้น</h3>
          </div>
          {!isEditing ? (
            <button 
              onClick={handleEdit}
              className="text-gray-400 hover:text-gray-600"
            >
              <Plus size={16} />
            </button>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={handleCancel}
                className="px-3 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                ยกเลิก
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-1 rounded-lg bg-[#0065FB] text-white text-xs font-semibold hover:bg-[#0052CC] disabled:opacity-50"
              >
                {isSaving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          )}
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#E6F0FF] border border-[#CCE0FF]">
            <p className="text-[10px] font-bold text-[#003D99] mb-1">จำนวนผู้ถือหุ้น</p>
            <p className="text-2xl font-bold text-[#0065FB]">{shareholders.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#F0E6FF] border border-[#E0D1F8]">
            <p className="text-[10px] font-bold text-[#4F3589] mb-1">สัดส่วนรวม</p>
            <p className="text-2xl font-bold text-[#6F42C1]">{totalPercentage.toFixed(0)}%</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 pt-0">
        {shareholders.length > 0 ? (
          <div className="space-y-3">
            {shareholders.map((s: Shareholder, i: number) => (
              <div key={i} className="p-3 rounded-xl border border-gray-50 bg-gray-50/30 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#0065FB] text-white flex items-center justify-center text-xs font-bold">
                    {s.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <Input 
                        value={s.name} 
                        onChange={(e) => updateShareholder(i, 'name', e.target.value)}
                        className="h-7 text-xs"
                        placeholder="ชื่อ-นามสกุล"
                      />
                    ) : (
                      <>
                        <p className="text-xs font-bold text-gray-900 truncate">{s.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <Input 
                                type="number"
                                value={s.percentage} 
                                onChange={(e) => updateShareholder(i, 'percentage', parseFloat(e.target.value) || 0)}
                                className="h-6 text-xs w-16"
                              />
                              <Input 
                                type="number"
                                value={s.amount} 
                                onChange={(e) => updateShareholder(i, 'amount', parseFloat(e.target.value) || 0)}
                                className="h-6 text-xs w-24"
                              />
                            </div>
                          ) : (
                            <>
                              <span className="text-[10px] font-bold text-[#0065FB]">{s.percentage}%</span>
                              <span className="text-[10px] text-gray-400">{formatCurrency(Number(s.amount ?? 0))}</span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {isEditing && (
                    <Button 
                      onClick={() => removeShareholder(i)} 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 text-destructive hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-[9px] uppercase font-bold text-gray-400">อำนาจลงนาม</span>
                  {isEditing ? (
                    <Checkbox 
                      checked={!!s.hasAuthority} 
                      onCheckedChange={(checked) => updateShareholder(i, 'hasAuthority', !!checked)}
                    />
                  ) : (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${s.hasAuthority ? 'bg-[#E6F0FF] text-[#0065FB]' : 'bg-gray-100 text-gray-400'}`}>
                      {s.hasAuthority ? 'AUTHORIZED' : 'NONE'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {isEditing && (
              <Button onClick={addShareholder} variant="outline" size="sm" className="w-full">
                <Plus className="h-4 w-4 mr-1" /> เพิ่มผู้ถือหุ้น
              </Button>
            )}
            
            {/* Footer Note */}
            <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100 flex gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-400 text-white flex items-center justify-center text-[10px] font-bold shrink-0">i</div>
              <p className="text-[10px] text-amber-700 leading-tight font-medium">
                เงื่อนไขการลงนาม: ปกติจะระบุเป็นจำนวนกรรมการที่ต้องลงนามพร้อมประทับตราบริษัท
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Users className="h-8 w-8 text-gray-300" />
              </div>
              <div>
                <p className="font-medium text-sm mb-1 text-gray-700">ไม่มีข้อมูลผู้ถือหุ้น</p>
                <p className="text-xs text-gray-400">เพิ่มข้อมูลผู้ถือหุ้นเพื่อแสดงโครงสร้างองค์กร</p>
              </div>
              {isEditing && (
                <Button onClick={addShareholder} variant="outline" size="sm" className="mt-2">
                  <Plus className="h-4 w-4 mr-1" /> เพิ่มรายชื่อครั้งแรก
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
