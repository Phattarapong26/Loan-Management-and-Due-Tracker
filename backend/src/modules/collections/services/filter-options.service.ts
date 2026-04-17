/**
 * Filter Options Service
 * Provides available filter options for debt management reports
 */

import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';

// Thai provinces grouped by region
const THAI_REGIONS = {
  north: ['เชียงใหม่', 'เชียงราย', 'ลำปาง', 'ลำพูน', 'แม่ฮ่องสอน', 'น่าน', 'พะเยา', 'แพร่', 'อุตรดิตถ์'],
  northeast: ['ขอนแก่น', 'อุดรธานี', 'นครราชสีมา', 'อุบลราชธานี', 'สกลนคร', 'นครพนม', 'มหาสารคาม', 'ร้อยเอ็ด', 'กาฬสินธุ์', 'มุกดาหาร', 'เลย', 'หนองบัวลำภู', 'หนองคาย', 'บึงกาฬ', 'ชัยภูมิ', 'ยโสธร', 'ศรีสะเกษ', 'สุรินทร์', 'บุรีรัมย์', 'อำนาจเจริญ'],
  central: ['กรุงเทพมหานคร', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'นครปฐม', 'สมุทรสาคร', 'สมุทรสงคราม', 'พระนครศรีอยุธยา', 'อ่างทอง', 'ลพบุรี', 'สิงห์บุรี', 'ชัยนาท', 'สระบุรี', 'ชลบุรี', 'ระยอง', 'จันทบุรี', 'ตราด', 'ฉะเชิงเทรา', 'ปราจีนบุรี', 'นครนายก', 'สระแก้ว', 'เพชรบุรี', 'ประจวบคีรีขันธ์', 'กาญจนบุรี', 'สุพรรณบุรี', 'นครสวรรค์', 'อุทัยธานี', 'กำแพงเพชร', 'ตาก', 'สุโขทัย', 'พิษณุโลก', 'พิจิตร', 'เพชรบูรณ์'],
  south: ['ภูเก็ต', 'พังงา', 'กระบี่', 'ตรัง', 'สตูล', 'สงขลา', 'ปัตตานี', 'ยะลา', 'นราธิวาส', 'ชุมพร', 'สุราษฎร์ธานี', 'นครศรีธรรมราช', 'พัทลุง', 'ระนอง'],
};

export class FilterOptionsService {
  /**
   * Get available branches
   */
  async getBranches() {
    try {
      const branches = await prisma.branch.findMany({
        select: {
          id: true,
          name: true,
          province: true,
          district: true,
        },
        orderBy: {
          name: 'asc',
        },
      });

      return branches;
    } catch (error) {
      logger.error({ error }, 'Error getting branches');
      return [];
    }
  }

  /**
   * Get available regions based on branches
   */
  async getRegions() {
    try {
      const branches = await prisma.branch.findMany({
        select: {
          province: true,
        },
        distinct: ['province'],
      });

      const regions = new Set<string>();
      
      branches.forEach((branch) => {
        if (branch.province) {
          // Find which region this province belongs to
          for (const [region, provinces] of Object.entries(THAI_REGIONS)) {
            if (provinces.includes(branch.province)) {
              regions.add(region);
              break;
            }
          }
        }
      });

      return Array.from(regions).map((region) => ({
        value: region,
        label: this.getRegionLabel(region),
      }));
    } catch (error) {
      logger.error({ error }, 'Error getting regions');
      return [];
    }
  }

  /**
   * Get available zones (districts) based on selected region
   */
  async getZones(region?: string) {
    try {
      let provinces: string[] = [];

      if (region && region !== 'all') {
        provinces = THAI_REGIONS[region as keyof typeof THAI_REGIONS] || [];
      }

      const whereClause = provinces.length > 0 ? { province: { in: provinces } } : {};

      const branches = await prisma.branch.findMany({
        where: whereClause,
        select: {
          district: true,
        },
        distinct: ['district'],
      });

      return branches
        .filter((b) => b.district)
        .map((b) => ({
          value: b.district!,
          label: b.district!,
        }));
    } catch (error) {
      logger.error({ error }, 'Error getting zones');
      return [];
    }
  }

  /**
   * Get available years from loan data
   */
  async getAvailableYears() {
    try {
      // Use financial timeline dates (payments/schedules) instead of loan.createdAt.
      // This makes the report filters reflect years that actually have data.
      const rows = await prisma.$queryRaw<Array<{ year: number }>>`
        SELECT DISTINCT EXTRACT(YEAR FROM d)::int AS year
        FROM (
          SELECT created_at AS d FROM loans
          UNION ALL
          SELECT disbursement_date AS d FROM loans
          UNION ALL
          SELECT start_date AS d FROM loans
          UNION ALL
          SELECT payment_date AS d FROM payments
          UNION ALL
          SELECT payment_date AS d FROM payment_schedules
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

  /**
   * Get region label in Thai
   */
  private getRegionLabel(region: string): string {
    const labels: Record<string, string> = {
      north: 'ภาคเหนือ',
      northeast: 'ภาคตะวันออกเฉียงเหนือ',
      central: 'ภาคกลาง',
      south: 'ภาคใต้',
    };
    return labels[region] || region;
  }
}

export const filterOptionsService = new FilterOptionsService();
