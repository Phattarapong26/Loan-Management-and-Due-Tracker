import { Package, Plus, Trash2, Building2, ShoppingBag, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { useEditableData } from '../../hooks/useEditableData';
import { customersApi } from '@/shared/lib/api-endpoints';
import { useCallback } from 'react';

interface Supplier {
  name: string;
  address?: string;
  phone?: string;
  productType?: string;
  paymentTerms?: string;
  creditLimit?: number;
  contactDuration?: string;
}

interface Customer {
  name: string;
  address?: string;
  phone?: string;
  productService?: string;
  paymentTerms?: string;
  salesProportion?: number;
  contactDuration?: string;
}

type ProductData = {
  suppliers: Supplier[];
  customers: Customer[];
} & Record<string, unknown>;

interface ProductSectionProps {
  aiData?: Partial<ProductData> | null;
  hasAIData: boolean;
  customerId: string;
}

export function ProductSection({ aiData, customerId }: ProductSectionProps) {
  const initialData: ProductData = {
    suppliers: aiData?.suppliers || [],
    customers: aiData?.customers || [],
  };

  const {
    isEditing,
    editedData,
    isSaving,
    handleEdit,
    handleSave,
    handleCancel,
    updateField,
  } = useEditableData<ProductData>({
    initialData,
    updateFn: (data) => customersApi.updateWithAIData(customerId, data, 100, []),
    queryKey: ['customer', customerId],
  });

  const updateSupplier = useCallback((index: number, field: keyof Supplier, value: string | number) => {
    const newData = [...(editedData.suppliers as Supplier[])];
    newData[index] = { ...newData[index], [field]: value };
    updateField('suppliers', newData);
  }, [editedData.suppliers, updateField]);

  const updateCustomer = useCallback((index: number, field: keyof Customer, value: string | number) => {
    const newData = [...(editedData.customers as Customer[])];
    newData[index] = { ...newData[index], [field]: value };
    updateField('customers', newData);
  }, [editedData.customers, updateField]);

  const addItem = useCallback((type: 'suppliers' | 'customers') => {
    if (type === 'suppliers') {
      updateField('suppliers', [...(editedData.suppliers as Supplier[]), { name: '', productType: '', paymentTerms: '', creditLimit: 0 }]);
    } else {
      updateField('customers', [...(editedData.customers as Customer[]), { name: '', productService: '', paymentTerms: '', salesProportion: 0 }]);
    }
  }, [editedData.suppliers, editedData.customers, updateField]);

  const removeItem = useCallback((type: 'suppliers' | 'customers', index: number) => {
    const newData = [...(editedData[type] as (Supplier | Customer)[])];
    newData.splice(index, 1);
    updateField(type, newData);
  }, [editedData, updateField]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white rounded-[24px] hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)] transition-all duration-500 pt-10">
      <CardContent className="p-8 pt-0">
        {/* Grid Layout: Left (Suppliers) - Right (Customers) */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Suppliers Section - LEFT */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#F7931E] flex items-center justify-center shadow-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1D1F]">ผู้จัดจำหน่าย</h4>
                  <p className="text-xs text-[#6F767E]">Suppliers & Vendors</p>
                </div>
                <Badge className="ml-2 bg-orange-100 text-orange-700 border-orange-200">
                  {(editedData.suppliers as Supplier[]).length} รายการ
                </Badge>
              </div>
              {isEditing && (
                <Button 
                  onClick={() => addItem('suppliers')} 
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs gap-1 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่ม
                </Button>
              )}
            </div>

            {(editedData.suppliers as Supplier[]).length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-gray-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-white border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-bold text-[#1A1D1F]">ชื่อคู่ค้า</th>
                      <th className="text-left py-3 px-4 font-bold text-[#1A1D1F]">ประเภท</th>
                      <th className="text-right py-3 px-4 font-bold text-[#1A1D1F]">วงเงิน</th>
                      {isEditing && <th className="w-12"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(editedData.suppliers as Supplier[]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-white transition-colors">
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input 
                              value={row.name} 
                              onChange={(e) => updateSupplier(idx, 'name', e.target.value)} 
                              className="h-8 text-xs border-2 focus:border-orange-400" 
                              placeholder="ชื่อคู่ค้า" 
                            />
                          ) : (
                            <span className="font-medium text-[#1A1D1F]">{row.name || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input 
                              value={row.productType} 
                              onChange={(e) => updateSupplier(idx, 'productType', e.target.value)} 
                              className="h-8 text-xs border-2 focus:border-orange-400" 
                              placeholder="ประเภท" 
                            />
                          ) : (
                            <span className="text-[#6F767E] text-xs">{row.productType || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <Input 
                              type="number" 
                              value={row.creditLimit} 
                              onChange={(e) => updateSupplier(idx, 'creditLimit', parseFloat(e.target.value) || 0)} 
                              className="h-8 text-right text-xs font-bold border-2 focus:border-orange-400" 
                            />
                          ) : (
                            <span className="font-bold text-orange-600">{formatCurrency(row.creditLimit || 0)}</span>
                          )}
                        </td>
                        {isEditing && (
                          <td className="p-2">
                            <Button 
                              onClick={() => removeItem('suppliers', idx)} 
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
                  </tbody>
                  <tfoot className="bg-white border-t border-gray-200">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 font-bold text-[#1A1D1F]">รวมวงเงินคู่ค้า</td>
                      <td className="py-3 px-4 text-right font-black text-orange-600">
                        {formatCurrency((editedData.suppliers as Supplier[]).reduce((sum, s) => sum + (s.creditLimit || 0), 0))}
                      </td>
                      {isEditing && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-[#6F767E] mb-2">ไม่มีข้อมูลผู้จัดจำหน่าย</p>
                {isEditing && (
                  <Button onClick={() => addItem('suppliers')} variant="outline" size="sm">
                    <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มรายการแรก
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Customers Section - RIGHT */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00A950] to-[#008F44] flex items-center justify-center shadow-lg">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1D1F]">ลูกค้าหลัก</h4>
                  <p className="text-xs text-[#6F767E]">Major Customers</p>
                </div>
                <Badge className="ml-2 bg-green-100 text-green-700 border-green-200">
                  {(editedData.customers as Customer[]).length} รายการ
                </Badge>
              </div>
              {isEditing && (
                <Button 
                  onClick={() => addItem('customers')} 
                  size="sm" 
                  variant="outline" 
                  className="h-8 text-xs gap-1 hover:bg-green-50 hover:border-green-300 hover:text-[#00A950]"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่ม
                </Button>
              )}
            </div>

            {(editedData.customers as Customer[]).length > 0 ? (
              <div className="overflow-hidden rounded-xl border  border-gray-100 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-white border-b  border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-bold text-[#1A1D1F]">ชื่อลูกค้า</th>
                      <th className="text-left py-3 px-4 font-bold text-[#1A1D1F]">สินค้า</th>
                      <th className="text-right py-3 px-4 font-bold text-[#1A1D1F]">สัดส่วน</th>
                      {isEditing && <th className="w-12"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(editedData.customers as Customer[]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-green-50/30 transition-colors">
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input 
                              value={row.name} 
                              onChange={(e) => updateCustomer(idx, 'name', e.target.value)} 
                              className="h-8 text-xs border-2 focus:border-[#00A950]" 
                              placeholder="ชื่อลูกค้า" 
                            />
                          ) : (
                            <span className="font-medium text-[#1A1D1F]">{row.name || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <Input 
                              value={row.productService} 
                              onChange={(e) => updateCustomer(idx, 'productService', e.target.value)} 
                              className="h-8 text-xs border-2 focus:border-[#00A950]" 
                              placeholder="สินค้า" 
                            />
                          ) : (
                            <span className="text-[#6F767E] text-xs">{row.productService || '-'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isEditing ? (
                            <Input 
                              type="number" 
                              value={row.salesProportion} 
                              onChange={(e) => updateCustomer(idx, 'salesProportion', parseFloat(e.target.value) || 0)} 
                              className="h-8 text-right text-xs font-bold border-2 focus:border-[#00A950]" 
                            />
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-[#00A950] to-[#61D699]" 
                                  style={{ width: `${Math.min(row.salesProportion || 0, 100)}%` }} 
                                />
                              </div>
                              <span className="font-bold text-[#00A950] w-12">{row.salesProportion}%</span>
                            </div>
                          )}
                        </td>
                        {isEditing && (
                          <td className="p-2">
                            <Button 
                              onClick={() => removeItem('customers', idx)} 
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
                  </tbody>
                  <tfoot className="bg-white border-t border-gray200">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 font-bold text-[#1A1D1F]">รวมสัดส่วนยอดขาย</td>
                      <td className="py-3 px-4 text-right font-black text-[#00A950]">
                        {(editedData.customers as Customer[]).reduce((sum, c) => sum + (c.salesProportion || 0), 0).toFixed(1)}%
                      </td>
                      {isEditing && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/30">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-[#6F767E] mb-2">ไม่มีข้อมูลลูกค้าหลัก</p>
                {isEditing && (
                  <Button onClick={() => addItem('customers')} variant="outline" size="sm">
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
