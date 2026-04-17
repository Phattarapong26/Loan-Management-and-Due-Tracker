/**
 * Company Info Section Component
 */

import { Building2 } from "lucide-react";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { EditableField, SectionTitle } from '../shared';

interface CompanyInfoSectionProps {
  data: ParsedBusinessProfile['companyInfo'];
  onUpdate: (field: string, value: string | number) => void;
}

export function CompanyInfoSection({ data, onUpdate }: CompanyInfoSectionProps) {
  if (!data) return <div className="p-4 text-muted-foreground">ไม่พบข้อมูลบริษัท</div>;

  return (
    <div>
      <SectionTitle icon={Building2} title="ข้อมูลบริษัท" />
      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        <EditableField label="ชื่อบริษัท" value={data.companyName || ''} onSave={(v) => onUpdate('companyName', v)} />
        <EditableField label="เลขทะเบียนนิติบุคคล" value={data.registrationNumber || ''} onSave={(v) => onUpdate('registrationNumber', v)} />
        <EditableField label="วันจดทะเบียน" value={data.registrationDate || ''} onSave={(v) => onUpdate('registrationDate', v)} />
        <EditableField label="ทุนจดทะเบียน" value={data.registeredCapital || 0} onSave={(v) => onUpdate('registeredCapital', v)} type="number" />
        <EditableField label="ประเภทธุรกิจ" value={data.businessType || ''} onSave={(v) => onUpdate('businessType', v)} />
        <EditableField label="ประสบการณ์" value={data.experience || ''} onSave={(v) => onUpdate('experience', v)} />
        <div className="col-span-2">
          <EditableField label="ที่อยู่" value={data.address || ''} onSave={(v) => onUpdate('address', v)} />
        </div>
        <EditableField label="จำนวนพนักงาน" value={data.employeeCount || 0} onSave={(v) => onUpdate('employeeCount', parseInt(String(v)) || 0)} type="number" />
      </div>
    </div>
  );
}
