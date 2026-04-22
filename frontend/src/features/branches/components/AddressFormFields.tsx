/**
 * Address Form Fields Component
 * Reusable cascading dropdowns for Thai address selection
 */

import { useQuery } from '@tanstack/react-query';
import { Label } from '@/shared/components/ui/label';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { thaiAddressApi } from '../api/thai-address.api';

interface AddressFormFieldsProps {
  province: string;
  district: string;
  subdistrict: string;
  postalCode: string;
  onProvinceChange: (value: string) => void;
  onDistrictChange: (value: string) => void;
  onSubdistrictChange: (value: string) => void;
}

export function AddressFormFields({
  province,
  district,
  subdistrict,
  postalCode,
  onProvinceChange,
  onDistrictChange,
  onSubdistrictChange,
}: AddressFormFieldsProps) {
  // Fetch provinces
  const { data: provinces } = useQuery({
    queryKey: ['provinces'],
    queryFn: async () => {
      const result = await thaiAddressApi.getProvinces();
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
  });

  // Fetch districts based on selected province
  const { data: districts } = useQuery({
    queryKey: ['districts', province],
    queryFn: async () => {
      if (!province) return [];
      const result = await thaiAddressApi.getDistricts(province);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    enabled: !!province,
  });

  // Fetch subdistricts based on selected province and district
  const { data: subdistricts } = useQuery({
    queryKey: ['subdistricts', province, district],
    queryFn: async () => {
      if (!province || !district) return [];
      const result = await thaiAddressApi.getSubdistricts(province, district);
      if (result.error) throw new Error(result.error.message ?? String(result.error));
      return result.data;
    },
    enabled: !!province && !!district,
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>จังหวัด</Label>
          <Select value={province} onValueChange={onProvinceChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="เลือกจังหวัด" />
            </SelectTrigger>
            <SelectContent>
              {provinces?.map((prov) => (
                <SelectItem key={prov.id} value={prov.name}>
                  {prov.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>อำเภอ/เขต</Label>
          <Select 
            value={district} 
            onValueChange={onDistrictChange}
            disabled={!province}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={province ? "เลือกอำเภอ/เขต" : "เลือกจังหวัดก่อน"} />
            </SelectTrigger>
            <SelectContent>
              {districts?.map((dist) => (
                <SelectItem key={dist.id} value={dist.name}>
                  {dist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>ตำบล/แขวง</Label>
          <Select 
            value={subdistrict} 
            onValueChange={onSubdistrictChange}
            disabled={!district}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={district ? "เลือกตำบล/แขวง" : "เลือกอำเภอ/เขตก่อน"} />
            </SelectTrigger>
            <SelectContent>
              {subdistricts?.map((subdist) => (
                <SelectItem key={subdist.id} value={subdist.name}>
                  {subdist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>รหัสไปรษณีย์</Label>
          <Input
            value={postalCode}
            disabled
            className="bg-muted"
            placeholder="เลือกตำบล/แขวงเพื่อดูรหัส"
          />
        </div>
      </div>
    </>
  );
}
