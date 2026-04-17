import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Home, Users, Sparkles, Plus, Trash2, MapPin, Building2, Gavel } from 'lucide-react';
import { customersApi } from '@/shared/lib/api-endpoints';
import { EditableSection } from '../EditableSection';
import { useEditableData } from '../../hooks/useEditableData';
import { useCallback } from 'react';

// Types for AI extracted collateral matching ParsedBusinessProfile
type CollateralItem = {
  type: string;
  description: string;
  owner?: string;
  value?: number;
  location?: string;
  [key: string]: unknown;
};

type GuarantorItem = {
  name: string;
  relationship?: string;
  address?: string;
  [key: string]: unknown;
};

type AIData = {
  collaterals?: CollateralItem[];
  guarantors?: GuarantorItem[];
  [key: string]: unknown;
};

interface CollateralSectionProps {
  aiData?: AIData | null;
  hasAIData: boolean;
  customerId: string;
  formatCurrency?: (amount: number) => string;
}

export function CollateralSection({ aiData, hasAIData, customerId, formatCurrency }: CollateralSectionProps) {
  const initialData = {
    collaterals: aiData?.collaterals || [],
    guarantors: aiData?.guarantors || [],
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

  const updateArrayField = useCallback((arrayKey: 'collaterals' | 'guarantors', index: number, field: string, value: string | number) => {
    if (arrayKey === 'collaterals') {
      const newData = [...(editedData.collaterals as CollateralItem[])];
      newData[index] = { ...newData[index], [field]: value };
      updateField('collaterals', newData);
    } else {
      const newData = [...(editedData.guarantors as GuarantorItem[])];
      newData[index] = { ...newData[index], [field]: value };
      updateField('guarantors', newData);
    }
  }, [editedData, updateField]);

  const addItem = useCallback((arrayKey: 'collaterals' | 'guarantors', defaultValue: CollateralItem | GuarantorItem) => {
    if (arrayKey === 'collaterals') {
      const currentArray = editedData.collaterals as CollateralItem[];
      updateField('collaterals', [...currentArray, defaultValue as CollateralItem]);
    } else {
      const currentArray = editedData.guarantors as GuarantorItem[];
      updateField('guarantors', [...currentArray, defaultValue as GuarantorItem]);
    }
  }, [editedData, updateField]);

  const removeItem = useCallback((arrayKey: 'collaterals' | 'guarantors', index: number) => {
    if (arrayKey === 'collaterals') {
      const newData = [...(editedData.collaterals as CollateralItem[])];
      newData.splice(index, 1);
      updateField('collaterals', newData);
    } else {
      const newData = [...(editedData.guarantors as GuarantorItem[])];
      newData.splice(index, 1);
      updateField('guarantors', newData);
    }
  }, [editedData, updateField]);

  const collaterals = (editedData.collaterals as CollateralItem[]) || [];
  const guarantors = (editedData.guarantors as GuarantorItem[]) || [];

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      {/* หลักประกัน */}
      <Card className="shadow-sm border-border/60 overflow-hidden">
        <CardHeader className="bg-muted/20 pb-4">
          <EditableSection
            title="หลักประกัน (Collaterals)"
            icon={<Home className="h-5 w-5" />}
            isEditing={isEditing}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isSaving}
            
            actions={
              isEditing && (
                <Button onClick={() => addItem('collaterals', { type: 'ที่ดินและสิ่งปลูกสร้าง', description: '', value: 0 })} size="sm" className="bg-primary/5 text-primary hover:bg-primary/10 border-none">
                  <Plus className="w-4 h-4 mr-1" /> เพิ่มหลักประกัน
                </Button>
              )
            }
          >
            {null}
          </EditableSection>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {collaterals.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-border bg-muted/5 relative group">
              <div className="flex items-start gap-4">
                 <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center text-primary shadow-sm">
                   <Building2 className="w-5 h-5" />
                 </div>
                 <div className="flex-1 space-y-3">
                   {isEditing ? (
                     <>
                        <div className="grid grid-cols-2 gap-2">
                           <Input 
                             value={item.type}
                             onChange={(e) => updateArrayField('collaterals', idx, 'type', e.target.value)}
                             className="h-8 text-xs font-bold"
                             placeholder="ประเภทหลักประกัน"
                           />
                           <Input 
                             type="number"
                             value={item.value}
                             onChange={(e) => updateArrayField('collaterals', idx, 'value', parseFloat(e.target.value) || 0)}
                             className="h-8 text-xs font-bold text-primary text-right"
                             placeholder="ราคาประเมิน"
                           />
                        </div>
                        <Input 
                        value={item.description}
                        onChange={(e) => updateArrayField('collaterals', idx, 'description', e.target.value)}
                        className="h-8 text-xs"
                        placeholder="รายละเอียด"
                      />
                   </>
                 ) : (
                   <>
                      <div className="flex items-center justify-between">
                         <h4 className="font-bold text-foreground">{item.type}</h4>
                         <span className="font-black text-primary">{formatCurrency ? formatCurrency(item.value || 0) : item.value}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                   </>
                 )}
                 
                 <div className="flex items-center gap-4 pt-1">
                   <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                     <MapPin className="w-3 h-3" />
                     {isEditing ? (
                       <Input 
                         value={item.location}
                         onChange={(e) => updateArrayField('collaterals', idx, 'location', e.target.value)}
                         className="h-7 text-xs w-32"
                         placeholder="ที่ตั้ง"
                       />
                     ) : (
                       <span>{item.location || 'กรุงเทพฯ'}</span>
                     )}
                   </div>
                   <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                     <Gavel className="w-3 h-3" />
                     {isEditing ? (
                       <Input 
                         value={item.owner as string}
                         onChange={(e) => updateArrayField('collaterals', idx, 'owner', e.target.value)}
                         className="h-7 text-xs w-32"
                         placeholder="เจ้ากรรมสิทธิ์"
                       />
                     ) : (
                       <span>{item.owner || 'บจก. ตัวอย่าง'}</span>
                     )}
                   </div>
                 </div>
               </div>

               {isEditing && (
                 <Button onClick={() => removeItem('collaterals', idx)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Trash2 className="w-4 h-4" />
                 </Button>
               )}
            </div>
          </div>
        ))}
        {collaterals.length === 0 && (
          <div className="py-12 text-center text-muted-foreground italic border-2 border-dashed border-border rounded-2xl">
            ไม่มีข้อมูลหลักประกัน
          </div>
        )}
      </CardContent>
    </Card>

    {/* ผู้ค้ำประกัน */}
    <Card className="shadow-sm border-border/60 overflow-hidden">
      <CardHeader className="bg-muted/20 pb-4">
        <EditableSection
          title="บุคคลค้ำประกัน (Guarantors)"
          icon={<Users className="h-5 w-5" />}
          isEditing={isEditing}
          onEdit={handleEdit}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
          actions={
            isEditing && (
              <Button onClick={() => addItem('guarantors', { name: '', relationship: 'กรรมการ' })} size="sm" className="bg-primary/5 text-primary hover:bg-primary/10 border-none">
                <Plus className="w-4 h-4 mr-1" /> เพิ่มผู้ค้ำประกัน
              </Button>
            )
          }
        >
          {null}
        </EditableSection>
      </CardHeader>
        <CardContent className="pt-6 space-y-4">
           {guarantors.map((item, idx) => (
             <div key={idx} className="p-4 rounded-2xl border border-border bg-muted/5 relative group">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          value={item.name}
                          onChange={(e) => updateArrayField('guarantors', idx, 'name', e.target.value)}
                          className="h-8 text-xs font-bold"
                          placeholder="ชื่อ-นามสกุล"
                        />
                        <Input 
                          value={item.relationship}
                          onChange={(e) => updateArrayField('guarantors', idx, 'relationship', e.target.value)}
                          className="h-8 text-xs"
                          placeholder="ความสัมพันธ์"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-foreground text-base tracking-tight">{item.name}</h4>
                        <Badge variant="secondary" className="text-xs font-bold uppercase tracking-wider">{item.relationship}</Badge>
                      </div>
                    )}
                    
                    {isEditing ? (
                       <Input 
                         value={item.address}
                         onChange={(e) => updateArrayField('guarantors', idx, 'address', e.target.value)}
                         className="h-8 text-xs mt-1"
                         placeholder="ที่อยู่"
                       />
                    ) : (
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                        <MapPin className="w-3 h-3" />
                        {item.address || 'ตามทะเบียนบ้าน'}
                      </p>
                    )}
                  </div>

                  {isEditing && (
                    <Button onClick={() => removeItem('guarantors', idx)} variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
             </div>
           ))}
           {guarantors.length === 0 && (
            <div className="py-12 text-center text-muted-foreground italic border-2 border-dashed border-border rounded-2xl">
              ไม่มีข้อมูลผู้ค้ำประกัน
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Add User icon replacement
function User({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
