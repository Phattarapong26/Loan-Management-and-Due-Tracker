import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Building2, MapPin, Calendar, Briefcase, Users, Fuel } from 'lucide-react';
import { customersApi } from '@/shared/lib/api-endpoints';
import { EditableSection } from '../EditableSection';
import { EditableField } from '../EditableField';
import { useEditableData } from '../../hooks/useEditableData';

// Customer type for company details
type CustomerCompany = {
  id?: string;
  name?: string;
  registrationNumber?: string;
  registeredCapital?: number;
  registrationDate?: string;
  businessType?: string;
  yearsInBusiness?: number;
  address?: string;
  employees?: number;
  pumpCount?: number;
  [key: string]: unknown;
};

interface CompanyInfoSectionProps {
  customer?: CustomerCompany | null;
  customerId: string;
}

export function CompanyInfoSection({ customer, customerId }: CompanyInfoSectionProps) {
  const initialData = useMemo(() => ({
    name: customer?.name || '',
    registrationNumber: customer?.registrationNumber || '',
    registeredCapital: customer?.registeredCapital || 0,
    registrationDate: customer?.registrationDate || '',
    businessType: customer?.businessType || '',
    yearsInBusiness: customer?.yearsInBusiness || 0,
    address: customer?.address || '',
    employees: customer?.employees || 0,
    pumpCount: customer?.pumpCount || 0,
  }), [customer]);

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
    updateFn: (data) => customersApi.update(customerId, data),
    queryKey: ['customer', customerId],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card className="overflow-hidden border-none shadow-sm bg-white rounded-[24px]">
      <CardHeader className="p-8 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#E6F0FF] text-[#0065FB]">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">ข้อมูลบริษัท</h2>
              <p className="text-xs text-gray-400">รายละเอียดจดทะเบียนและที่ตั้ง</p>
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
        <div className="space-y-8">
          {/* Primary Info Grid */}
          <div className="grid md:grid-cols-2 gap-y-8">
            <EditableField
              label="ชื่อบริษัท"
              value={editedData.name}
              isEditing={isEditing}
              onChange={(v) => updateField('name', v)}
              icon={<Building2 className="w-3.5 h-3.5 text-[#0065FB]" />}
            />
            <EditableField
              label="ทุนจดทะเบียน"
              value={editedData.registeredCapital}
              isEditing={isEditing}
              onChange={(v) => updateField('registeredCapital', v)}
              type="number"
              displayValue={formatCurrency(editedData.registeredCapital)}
              icon={<Building2 className="w-3.5 h-3.5 text-[#0065FB]" />}
            />
            <EditableField
              label="เลขทะเบียนนิติบุคคล"
              value={editedData.registrationNumber}
              isEditing={isEditing}
              onChange={(v) => updateField('registrationNumber', v)}
              displayValue={editedData.registrationNumber}
              icon={<Briefcase className="w-3.5 h-3.5 text-[#0065FB]" />}
            />
            <EditableField
              label="วันที่จดทะเบียน"
              value={editedData.registrationDate}
              isEditing={isEditing}
              onChange={(v) => updateField('registrationDate', v)}
              type="date"
              icon={<Calendar className="w-3.5 h-3.5 text-[#0065FB]" />}
            />
            <EditableField
              label="ประเภทธุรกิจ"
              value={editedData.businessType}
              isEditing={isEditing}
              onChange={(v) => updateField('businessType', v)}
              icon={<Briefcase className="w-3.5 h-3.5 text-[#0065FB]" />}
            />
          
          </div>

          {/* Address Section */}
          <div className="p-5 rounded-[20px] bg-gray-50 border border-dashed border-gray-200">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 rounded-lg bg-white shadow-sm">
                <MapPin size={16} className="text-[#0065FB]" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase mb-1 text-gray-400">ที่อยู่บริษัท</p>
                {isEditing ? (
                  <textarea
                    value={editedData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="w-full text-sm leading-relaxed text-gray-900 bg-white border border-gray-200 rounded-lg p-2 min-h-[60px]"
                  />
                ) : (
                  <p className="text-sm leading-relaxed text-gray-900">{editedData.address || '-'}</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
