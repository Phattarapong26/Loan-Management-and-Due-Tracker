import { BranchRepository } from '@branches/repositories/branch.repository';
import { logger } from '@utils/common/logger.util';

// Thai provinces grouped by region
const THAI_REGIONS = {
  north: ['เชียงใหม่', 'เชียงราย', 'ลำปาง', 'ลำพูน', 'แม่ฮ่องสอน', 'น่าน', 'พะเยา', 'แพร่', 'อุตรดิตถ์'],
  northeast: ['ขอนแก่น', 'อุดรธานี', 'นครราชสีมา', 'อุบลราชธานี', 'สกลนคร', 'นครพนม', 'มหาสารคาม', 'ร้อยเอ็ด', 'กาฬสินธุ์', 'มุกดาหาร', 'เลย', 'หนองบัวลำภู', 'หนองคาย', 'บึงกาฬ', 'ชัยภูมิ', 'ยโสธร', 'ศรีสะเกษ', 'สุรินทร์', 'บุรีรัมย์', 'อำนาจเจริญ'],
  central: ['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'นครปฐม', 'สมุทรสาคร', 'สมุทรสงคราม', 'พระนครศรีอยุธยา', 'อ่างทอง', 'ลพบุรี', 'สิงห์บุรี', 'ชัยนาท', 'สระบุรี', 'ชลบุรี', 'ระยอง', 'จันทบุรี', 'ตราด', 'ฉะเชิงเทรา', 'ปราจีนบุรี', 'นครนายก', 'สระแก้ว', 'เพชรบุรี', 'ประจวบคีรีขันธ์', 'กาญจนบุรี', 'สุพรรณบุรี', 'นครสวรรค์', 'อุทัยธานี', 'กำแพงเพชร', 'ตาก', 'สุโขทัย', 'พิษณุโลก', 'พิจิตร', 'เพชรบูรณ์'],
  south: ['ภูเก็ต', 'พังงา', 'กระบี่', 'ตรัง', 'สตูล', 'สงขลา', 'ปัตตานี', 'ยะลา', 'นราธิวาส', 'ชุมพร', 'สุราษฎร์ธานี', 'นครศรีธรรมราช', 'พัทลุง', 'ระนอง'],
};

export class FilterOptionsService {
  private branchRepository: BranchRepository;

  constructor() {
    this.branchRepository = new BranchRepository();
  }

  async getBranches() {
    try {
      const result = await this.branchRepository.list({ page: 1, limit: 1000 });
      return result.branches.map((b: any) => ({ id: b.id, name: b.name, province: b.province, district: b.district }));
    } catch (error) {
      logger.error({ error }, 'Error getting branches');
      return [];
    }
  }

  async getRegions() {
    try {
      const branches = await this.getBranches();
      const regions = new Set<string>();
      branches.forEach((branch: any) => {
        if (branch.province) {
          for (const [region, provinces] of Object.entries(THAI_REGIONS)) {
            if (provinces.includes(branch.province)) { regions.add(region); break; }
          }
        }
      });
      return Array.from(regions).map((region) => ({ value: region, label: this.getRegionLabel(region) }));
    } catch (error) {
      logger.error({ error }, 'Error getting regions');
      return [];
    }
  }

  async getZones(region?: string) {
    try {
      const branches = await this.getBranches();
      const provinces = region && region !== 'all' ? THAI_REGIONS[region as keyof typeof THAI_REGIONS] || [] : [];
      const filtered = provinces.length > 0 ? branches.filter((b: any) => b.province && provinces.includes(b.province)) : branches;
      const districts = [...new Set(filtered.map((b: any) => b.district).filter(Boolean))];
      return districts.map((d) => ({ value: d, label: d }));
    } catch (error) {
      logger.error({ error }, 'Error getting zones');
      return [];
    }
  }

  async getAvailableYears() {
    try {
      const { prisma } = await import('@config/database.config');
      const rows = await prisma.$queryRaw<Array<{ year: number }>>`
        SELECT DISTINCT EXTRACT(YEAR FROM d)::int AS year
        FROM (
          SELECT created_at AS d FROM loans
          UNION ALL SELECT disbursement_date AS d FROM loans
          UNION ALL SELECT start_date AS d FROM loans
          UNION ALL SELECT payment_date AS d FROM payments
          UNION ALL SELECT payment_date AS d FROM payment_schedules
        ) t
        WHERE d IS NOT NULL
        ORDER BY year DESC;
      `;
      const years = rows.map((r) => r.year).filter((y) => Number.isFinite(y));
      if (years.length > 0) return years;
      const currentYear = new Date().getFullYear();
      return [currentYear];
    } catch (error) {
      logger.error({ error }, 'Error getting available years');
      const currentYear = new Date().getFullYear();
      return [currentYear, currentYear - 1, currentYear - 2];
    }
  }

  private getRegionLabel(region: string): string {
    const labels: Record<string, string> = { north: 'ภาคเหนือ', northeast: 'ภาคตะวันออกเฉียงเหนือ', central: 'ภาคกลาง', south: 'ภาคใต้' };
    return labels[region] || region;
  }
}

export const filterOptionsService = new FilterOptionsService();
