/**
 * Thai Address Service
 * Provides Thai provinces, districts, and subdistricts data
 */

export interface Province {
  id: number;
  name: string;
  region: 'north' | 'northeast' | 'central' | 'south';
}

export interface District {
  id: number;
  provinceId: number;
  name: string;
}

export interface Subdistrict {
  id: number;
  districtId: number;
  name: string;
  postalCode: string;
}

/**
 * Thai Provinces Data
 * Organized by region
 */
const THAI_PROVINCES: Province[] = [
  // ภาคเหนือ (North)
  { id: 1, name: 'เชียงใหม่', region: 'north' },
  { id: 2, name: 'เชียงราย', region: 'north' },
  { id: 3, name: 'ลำปาง', region: 'north' },
  { id: 4, name: 'ลำพูน', region: 'north' },
  { id: 5, name: 'แม่ฮ่องสอน', region: 'north' },
  { id: 6, name: 'น่าน', region: 'north' },
  { id: 7, name: 'พะเยา', region: 'north' },
  { id: 8, name: 'แพร่', region: 'north' },
  { id: 9, name: 'อุตรดิตถ์', region: 'north' },
  
  // ภาคตะวันออกเฉียงเหนือ (Northeast)
  { id: 10, name: 'นครราชสีมา', region: 'northeast' },
  { id: 11, name: 'บุรีรัมย์', region: 'northeast' },
  { id: 12, name: 'สุรินทร์', region: 'northeast' },
  { id: 13, name: 'ศรีสะเกษ', region: 'northeast' },
  { id: 14, name: 'อุบลราชธานี', region: 'northeast' },
  { id: 15, name: 'ยโสธร', region: 'northeast' },
  { id: 16, name: 'ขอนแก่น', region: 'northeast' },
  { id: 17, name: 'อุดรธานี', region: 'northeast' },
  { id: 18, name: 'เลย', region: 'northeast' },
  { id: 19, name: 'หนองคาย', region: 'northeast' },
  { id: 20, name: 'มหาสารคาม', region: 'northeast' },
  { id: 21, name: 'ร้อยเอ็ด', region: 'northeast' },
  { id: 22, name: 'กาฬสินธุ์', region: 'northeast' },
  { id: 23, name: 'สกลนคร', region: 'northeast' },
  { id: 24, name: 'นครพนม', region: 'northeast' },
  
  // ภาคกลาง (Central)
  { id: 25, name: 'กรุงเทพมหานคร', region: 'central' },
  { id: 26, name: 'สมุทรปราการ', region: 'central' },
  { id: 27, name: 'นนทบุรี', region: 'central' },
  { id: 28, name: 'ปทุมธานี', region: 'central' },
  { id: 29, name: 'พระนครศรีอยุธยา', region: 'central' },
  { id: 30, name: 'อ่างทอง', region: 'central' },
  { id: 31, name: 'ลพบุรี', region: 'central' },
  { id: 32, name: 'สระบุรี', region: 'central' },
  { id: 33, name: 'ชลบุรี', region: 'central' },
  { id: 34, name: 'ระยอง', region: 'central' },
  { id: 35, name: 'จันทบุรี', region: 'central' },
  { id: 36, name: 'ตราด', region: 'central' },
  { id: 37, name: 'ฉะเชิงเทรา', region: 'central' },
  { id: 38, name: 'ปราจีนบุรี', region: 'central' },
  { id: 39, name: 'นครนายก', region: 'central' },
  { id: 40, name: 'สระแก้ว', region: 'central' },
  { id: 41, name: 'นครปฐม', region: 'central' },
  { id: 42, name: 'สุพรรณบุรี', region: 'central' },
  { id: 43, name: 'กาญจนบุรี', region: 'central' },
  { id: 44, name: 'ราชบุรี', region: 'central' },
  { id: 45, name: 'เพชรบุรี', region: 'central' },
  { id: 46, name: 'ประจวบคีรีขันธ์', region: 'central' },
  { id: 47, name: 'สมุทรสาคร', region: 'central' },
  { id: 48, name: 'สมุทรสงคราม', region: 'central' },
  
  // ภาคใต้ (South)
  { id: 49, name: 'นครศรีธรรมราช', region: 'south' },
  { id: 50, name: 'กระบี่', region: 'south' },
  { id: 51, name: 'พังงา', region: 'south' },
  { id: 52, name: 'ภูเก็ต', region: 'south' },
  { id: 53, name: 'สุราษฎร์ธานี', region: 'south' },
  { id: 54, name: 'ระนอง', region: 'south' },
  { id: 55, name: 'ชุมพร', region: 'south' },
  { id: 56, name: 'สงขลา', region: 'south' },
  { id: 57, name: 'สตูล', region: 'south' },
  { id: 58, name: 'ตรัง', region: 'south' },
  { id: 59, name: 'พัทลุง', region: 'south' },
  { id: 60, name: 'ปัตตานี', region: 'south' },
  { id: 61, name: 'ยะลา', region: 'south' },
  { id: 62, name: 'นราธิวาส', region: 'south' },
];

/**
 * Sample Districts Data (เขต/อำเภอ)
 * In production, this should come from a complete database
 */
const THAI_DISTRICTS: District[] = [
  // กรุงเทพมหานคร
  { id: 1, provinceId: 25, name: 'บางรัก' },
  { id: 2, provinceId: 25, name: 'คลองเตย' },
  { id: 3, provinceId: 25, name: 'ปทุมวัน' },
  { id: 4, provinceId: 25, name: 'สาทร' },
  { id: 5, provinceId: 25, name: 'ยานนาวา' },
  { id: 6, provinceId: 25, name: 'บางคอแหลม' },
  { id: 7, provinceId: 25, name: 'ราชเทวี' },
  { id: 8, provinceId: 25, name: 'ห้วยขวาง' },
  { id: 9, provinceId: 25, name: 'ดินแดง' },
  { id: 10, provinceId: 25, name: 'วัฒนา' },
  
  // เชียงใหม่
  { id: 11, provinceId: 1, name: 'เมืองเชียงใหม่' },
  { id: 12, provinceId: 1, name: 'สันทราย' },
  { id: 13, provinceId: 1, name: 'หางดง' },
  { id: 14, provinceId: 1, name: 'สันกำแพง' },
  
  // เชียงราย
  { id: 15, provinceId: 2, name: 'เมืองเชียงราย' },
  { id: 16, provinceId: 2, name: 'แม่จัน' },
  { id: 17, provinceId: 2, name: 'เชียงของ' },
  
  // นครราชสีมา
  { id: 18, provinceId: 10, name: 'เมืองนครราชสีมา' },
  { id: 19, provinceId: 10, name: 'ปากช่อง' },
  { id: 20, provinceId: 10, name: 'โชคชัย' },
  
  // ขอนแก่น
  { id: 21, provinceId: 16, name: 'เมืองขอนแก่น' },
  { id: 22, provinceId: 16, name: 'บ้านไผ่' },
  
  // อุดรธานี
  { id: 23, provinceId: 17, name: 'เมืองอุดรธานี' },
  { id: 24, provinceId: 17, name: 'กุมภวาปี' },
  
  // อุบลราชธานี
  { id: 25, provinceId: 14, name: 'เมืองอุบลราชธานี' },
  { id: 26, provinceId: 14, name: 'วารินชำราบ' },
  
  // นนทบุรี
  { id: 27, provinceId: 27, name: 'เมืองนนทบุรี' },
  { id: 28, provinceId: 27, name: 'บางกรวย' },
  { id: 29, provinceId: 27, name: 'ปากเกร็ด' },
  
  // ปทุมธานี
  { id: 30, provinceId: 28, name: 'เมืองปทุมธานี' },
  { id: 31, provinceId: 28, name: 'คลองหลวง' },
  
  // พระนครศรีอยุธยา
  { id: 32, provinceId: 29, name: 'พระนครศรีอยุธยา' },
  { id: 33, provinceId: 29, name: 'บางไทร' },
  
  // ชลบุรี
  { id: 34, provinceId: 33, name: 'เมืองชลบุรี' },
  { id: 35, provinceId: 33, name: 'บางละมุง' },
  { id: 36, provinceId: 33, name: 'ศรีราชา' },
  
  // ระยอง
  { id: 37, provinceId: 34, name: 'เมืองระยอง' },
  { id: 38, provinceId: 34, name: 'บ้านฉาง' },
  
  // สงขลา
  { id: 39, provinceId: 56, name: 'หาดใหญ่' },
  { id: 40, provinceId: 56, name: 'เมืองสงขลา' },
  
  // ภูเก็ต
  { id: 41, provinceId: 52, name: 'เมืองภูเก็ต' },
  { id: 42, provinceId: 52, name: 'กะทู้' },
  { id: 43, provinceId: 52, name: 'ถลาง' },
  
  // นครศรีธรรมราช
  { id: 44, provinceId: 49, name: 'เมืองนครศรีธรรมราช' },
  { id: 45, provinceId: 49, name: 'ปากพนัง' },
  
  // สุราษฎร์ธานี
  { id: 46, provinceId: 53, name: 'เมืองสุราษฎร์ธานี' },
  { id: 47, provinceId: 53, name: 'เกาะสมุย' },
];

/**
 * Sample Subdistricts Data (ตำบล/แขวง)
 * In production, this should come from a complete database
 */
const THAI_SUBDISTRICTS: Subdistrict[] = [
  // บางรัก
  { id: 1, districtId: 1, name: 'สีลม', postalCode: '10500' },
  { id: 2, districtId: 1, name: 'สุริยวงศ์', postalCode: '10500' },
  { id: 3, districtId: 1, name: 'บางรัก', postalCode: '10500' },
  
  // คลองเตย
  { id: 4, districtId: 2, name: 'คลองเตย', postalCode: '10110' },
  { id: 5, districtId: 2, name: 'คลองตัน', postalCode: '10110' },
  { id: 6, districtId: 2, name: 'พระโขนง', postalCode: '10110' },
  
  // ปทุมวัน
  { id: 7, districtId: 3, name: 'ลุมพินี', postalCode: '10330' },
  { id: 8, districtId: 3, name: 'ปทุมวัน', postalCode: '10330' },
  { id: 9, districtId: 3, name: 'รองเมือง', postalCode: '10330' },
  
  // สาทร
  { id: 10, districtId: 4, name: 'ยานนาวา', postalCode: '10120' },
  { id: 11, districtId: 4, name: 'ทุ่งมหาเมฆ', postalCode: '10120' },
  { id: 12, districtId: 4, name: 'ทุ่งวัดดอน', postalCode: '10120' },
  
  // เมืองเชียงใหม่
  { id: 13, districtId: 11, name: 'ช้างเผือก', postalCode: '50300' },
  { id: 14, districtId: 11, name: 'ศรีภูมิ', postalCode: '50200' },
  { id: 15, districtId: 11, name: 'พระสิงห์', postalCode: '50200' },
  
  // เมืองเชียงราย
  { id: 16, districtId: 15, name: 'เวียง', postalCode: '57000' },
  { id: 17, districtId: 15, name: 'รอบเวียง', postalCode: '57000' },
  
  // เมืองนครราชสีมา
  { id: 18, districtId: 18, name: 'ในเมือง', postalCode: '30000' },
  { id: 19, districtId: 18, name: 'โพธิ์กลาง', postalCode: '30000' },
  
  // เมืองขอนแก่น
  { id: 20, districtId: 21, name: 'ในเมือง', postalCode: '40000' },
  { id: 21, districtId: 21, name: 'บ้านค้อ', postalCode: '40000' },
  
  // เมืองอุดรธานี
  { id: 22, districtId: 23, name: 'หมากแข้ง', postalCode: '41000' },
  { id: 23, districtId: 23, name: 'บ้านเลื่อม', postalCode: '41000' },
  
  // เมืองอุบลราชธานี
  { id: 24, districtId: 25, name: 'ในเมือง', postalCode: '34000' },
  { id: 25, districtId: 25, name: 'ขามใหญ่', postalCode: '34000' },
  
  // เมืองนนทบุรี
  { id: 26, districtId: 27, name: 'สวนใหญ่', postalCode: '11000' },
  { id: 27, districtId: 27, name: 'ตลาดขวัญ', postalCode: '11000' },
  
  // เมืองปทุมธานี
  { id: 28, districtId: 30, name: 'บางปรอก', postalCode: '12000' },
  { id: 29, districtId: 30, name: 'บ้านกลาง', postalCode: '12000' },
  
  // พระนครศรีอยุธยา
  { id: 30, districtId: 32, name: 'ประตูชัย', postalCode: '13000' },
  { id: 31, districtId: 32, name: 'หอรัตนไชย', postalCode: '13000' },
  
  // เมืองชลบุรี
  { id: 32, districtId: 34, name: 'บางปลาสร้อย', postalCode: '20000' },
  { id: 33, districtId: 34, name: 'แสนสุข', postalCode: '20000' },
  
  // บางละมุง (พัทยา)
  { id: 34, districtId: 35, name: 'หนองปรือ', postalCode: '20150' },
  { id: 35, districtId: 35, name: 'นาเกลือ', postalCode: '20150' },
  
  // เมืองระยอง
  { id: 36, districtId: 37, name: 'ท่าประดู่', postalCode: '21000' },
  { id: 37, districtId: 37, name: 'เนินพระ', postalCode: '21000' },
  
  // หาดใหญ่
  { id: 38, districtId: 39, name: 'หาดใหญ่', postalCode: '90110' },
  { id: 39, districtId: 39, name: 'คูเต่า', postalCode: '90110' },
  
  // เมืองภูเก็ต
  { id: 40, districtId: 41, name: 'ตลาดใหญ่', postalCode: '83000' },
  { id: 41, districtId: 41, name: 'ตลาดเหนือ', postalCode: '83000' },
  
  // เมืองนครศรีธรรมราช
  { id: 42, districtId: 44, name: 'ในเมือง', postalCode: '80000' },
  { id: 43, districtId: 44, name: 'ท่าวัง', postalCode: '80000' },
  
  // เมืองสุราษฎร์ธานี
  { id: 44, districtId: 46, name: 'ตลาด', postalCode: '84000' },
  { id: 45, districtId: 46, name: 'มะขามเตี้ย', postalCode: '84000' },
];

export class ThaiAddressService {
  /**
   * Get all provinces
   */
  getProvinces(): Province[] {
    return THAI_PROVINCES;
  }

  /**
   * Get provinces by region
   */
  getProvincesByRegion(region: string): Province[] {
    return THAI_PROVINCES.filter(p => p.region === region);
  }

  /**
   * Get districts by province ID
   */
  getDistrictsByProvince(provinceId: number): District[] {
    return THAI_DISTRICTS.filter(d => d.provinceId === provinceId);
  }

  /**
   * Get districts by province name
   */
  getDistrictsByProvinceName(provinceName: string): District[] {
    const province = THAI_PROVINCES.find(p => p.name === provinceName);
    if (!province) return [];
    return this.getDistrictsByProvince(province.id);
  }

  /**
   * Get subdistricts by district ID
   */
  getSubdistrictsByDistrict(districtId: number): Subdistrict[] {
    return THAI_SUBDISTRICTS.filter(s => s.districtId === districtId);
  }

  /**
   * Get subdistricts by district name and province name
   */
  getSubdistrictsByDistrictName(districtName: string, provinceName: string): Subdistrict[] {
    const province = THAI_PROVINCES.find(p => p.name === provinceName);
    if (!province) return [];
    
    const district = THAI_DISTRICTS.find(d => 
      d.name === districtName && d.provinceId === province.id
    );
    if (!district) return [];
    
    return this.getSubdistrictsByDistrict(district.id);
  }

  /**
   * Get postal code by subdistrict
   */
  getPostalCode(subdistrictName: string, districtName: string, provinceName: string): string | null {
    const subdistricts = this.getSubdistrictsByDistrictName(districtName, provinceName);
    const subdistrict = subdistricts.find(s => s.name === subdistrictName);
    return subdistrict?.postalCode || null;
  }
}

export const thaiAddressService = new ThaiAddressService();
