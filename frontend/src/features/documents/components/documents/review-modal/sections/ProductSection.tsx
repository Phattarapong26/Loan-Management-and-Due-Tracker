import { Package, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface ProductSectionProps {
  suppliers: ParsedBusinessProfile['suppliers'];
  customers: ParsedBusinessProfile['customers'];
  onUpdate: (suppliers: ParsedBusinessProfile['suppliers'], customers: ParsedBusinessProfile['customers']) => void;
}

export function ProductSection({ suppliers, customers, onUpdate }: ProductSectionProps) {
  const addSupplier = () => {
    const newList = [...(suppliers || [])];
    newList.push({ name: '', address: '', phone: '', productType: '', paymentTerms: '', creditLimit: 0, contactDuration: '' });
    onUpdate(newList, customers);
  };

  const removeSupplier = (index: number) => {
    onUpdate((suppliers || []).filter((_, i) => i !== index), customers);
  };

  const updateSupplier = (index: number, field: string, value: any) => {
    const newList = [...(suppliers || [])];
    newList[index] = { ...newList[index], [field]: value };
    onUpdate(newList, customers);
  };

  const addCustomer = () => {
    const newList = [...(customers || [])];
    newList.push({ name: '', address: '', phone: '', productService: '', paymentTerms: '', salesProportion: 0, contactDuration: '' });
    onUpdate(suppliers, newList);
  };

  const removeCustomer = (index: number) => {
    onUpdate(suppliers, (customers || []).filter((_, i) => i !== index));
  };

  const updateCustomer = (index: number, field: string, value: any) => {
    const newList = [...(customers || [])];
    newList[index] = { ...newList[index], [field]: value };
    onUpdate(suppliers, newList);
  };

  return (
    <div className="space-y-10">
      <SectionTitle icon={Package} title="คู่ค้า/ลูกค้า (Suppliers & Customers)" />
      
      {/* Suppliers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h4 className="text-md font-bold text-foreground flex items-center gap-2">
            <div className="w-2 h-4 bg-orange-500 rounded-sm"></div>
            ซัพพลายเออร์ (Suppliers)
          </h4>
          <Button variant="outline" size="sm" onClick={addSupplier} className="h-8 bg-orange-50/50 border-orange-200 text-orange-700 hover:bg-orange-100">
            <Plus className="w-4 h-4 mr-1" /> เพิ่มซัพพลายเออร์
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">ชื่อ</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">ประเภทสินค้า</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">วงเงินเครดิต</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">เงื่อนไขการชำระ</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">ระยะเวลาติดต่อ</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">โทรศัพท์</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {(suppliers || []).map((supplier, idx) => (
                <tr key={idx} className="hover:bg-muted/5 transition-colors">
                  <td className="p-2">
                    <Input 
                      value={supplier.name} 
                      onChange={(e) => updateSupplier(idx, 'name', e.target.value)}
                      className="h-8 border-transparent hover:border-border bg-transparent focus:bg-background transition-all"
                    />
                  </td>
                  <td className="p-2">
                    <Input 
                      value={supplier.productType} 
                      onChange={(e) => updateSupplier(idx, 'productType', e.target.value)}
                      className="h-8 border-transparent hover:border-border bg-transparent focus:bg-background transition-all"
                    />
                  </td>
                  <td className="p-2">
                    <Input 
                      type="number"
                      value={supplier.creditLimit} 
                      onChange={(e) => updateSupplier(idx, 'creditLimit', parseFloat(e.target.value) || 0)}
                      className="h-8 text-right border-transparent hover:border-border bg-transparent focus:bg-background transition-all font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <Input 
                      value={supplier.paymentTerms} 
                      onChange={(e) => updateSupplier(idx, 'paymentTerms', e.target.value)}
                      className="h-8 border-transparent hover:border-border bg-transparent focus:bg-background transition-all"
                    />
                  </td>
                  <td className="p-2">
                    <Input 
                      value={supplier.contactDuration} 
                      onChange={(e) => updateSupplier(idx, 'contactDuration', e.target.value)}
                      className="h-8 border-transparent hover:border-border bg-transparent focus:bg-background transition-all"
                    />
                  </td>
                  <td className="p-2">
                    <Input 
                      value={supplier.phone} 
                      onChange={(e) => updateSupplier(idx, 'phone', e.target.value)}
                      className="h-8 border-transparent hover:border-border bg-transparent focus:bg-background transition-all"
                    />
                  </td>
                  <td className="p-2">
                    <Button variant="ghost" size="icon" onClick={() => removeSupplier(idx)} className="h-8 w-8 text-muted-foreground hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(!suppliers || suppliers.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground italic">ยังไม่มีข้อมูลซัพพลายเออร์</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h4 className="text-md font-bold text-foreground flex items-center gap-2">
            <div className="w-2 h-4 bg-blue-500 rounded-sm"></div>
            ลูกค้าหลัก (Key Customers)
          </h4>
          <Button variant="outline" size="sm" onClick={addCustomer} className="h-8 bg-blue-50/50 border-blue-200 text-blue-700 hover:bg-blue-100">
            <Plus className="w-4 h-4 mr-1" /> เพิ่มลูกค้า
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">ชื่อ</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">สินค้า/บริการ</th>
                <th className="text-right py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">สัดส่วนขาย (%)</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">เทอมการค้า</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">ระยะเวลาติดต่อ</th>
                <th className="text-left py-3 px-4 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">โทรศัพท์</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {(customers || []).map((customer, idx) => (
                <tr key={idx} className="hover:bg-muted/5 transition-colors">
                  <td className="p-2">
                    <Input 
                      value={customer.name} 
                      onChange={(e) => updateCustomer(idx, 'name', e.target.value)}
                      className="h-8 border-transparent hover:border-border bg-transparent focus:bg-background transition-all"
                    />
                  </td>
                  <td className="p-2">
                    <Input 
                      value={customer.productService} 
                      onChange={(e) => updateCustomer(idx, 'productService', e.target.value)}
                      className="h-8 border-transparent hover:border-border bg-transparent focus:bg-background transition-all"
                    />
                  </td>
                  <td className="p-2">
                    <Input 
                      type="number"
                      value={customer.salesProportion} 
                      onChange={(e) => updateCustomer(idx, 'salesProportion', parseFloat(e.target.value) || 0)}
                      className="h-8 text-right border-transparent hover:border-border bg-transparent focus:bg-background transition-all font-mono"
                    />
                  </td>
                  <td className="p-2">
                    <Input 
                      value={customer.paymentTerms} 
                      onChange={(e) => updateCustomer(idx, 'paymentTerms', e.target.value)}
                      className="h-8 border-transparent hover:border-border bg-transparent focus:bg-background transition-all"
                    />
                  </td>
                  <td className="p-2">
                    <Input 
                      value={customer.contactDuration} 
                      onChange={(e) => updateCustomer(idx, 'contactDuration', e.target.value)}
                      className="h-8 border-transparent hover:border-border bg-transparent focus:bg-background transition-all"
                    />
                  </td>
                  <td className="p-2">
                    <Input 
                      value={customer.phone} 
                      onChange={(e) => updateCustomer(idx, 'phone', e.target.value)}
                      className="h-8 border-transparent hover:border-border bg-transparent focus:bg-background transition-all"
                    />
                  </td>
                  <td className="p-2">
                    <Button variant="ghost" size="icon" onClick={() => removeCustomer(idx)} className="h-8 w-8 text-muted-foreground hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(!customers || customers.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground italic">ยังไม่มีข้อมูลลูกค้าหลัก</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
