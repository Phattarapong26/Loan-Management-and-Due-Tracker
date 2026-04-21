import { PrismaClient } from '@prisma/client';
import { logger } from '@utils/common/logger.util';

const prisma = new PrismaClient();

export class ContractNumberService {
  /**
   * สร้างเลขที่สัญญาสินเชื่อ format: SME-{พ.ศ.}-{BRANCH}-{000001}
   * ตัวอย่าง: SME-2569-BKK-000001
   */
  static async generateContractNumber(
    branchId: string,
    _loanProductId?: string
  ): Promise<string> {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { code: true },
    });

    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`);
    }

    const buddhistYear = (new Date().getFullYear() + 543).toString();
    // ตัดตัวเลขท้ายออก เช่น BKK001 → BKK, CNX001 → CNX
    const branchCode = branch.code.replace(/\d+$/, '').toUpperCase();
    const prefix = `SME-${buddhistYear}-${branchCode}-`;

    // หาลำดับถัดไปจาก contract_number ที่มี prefix เดียวกัน
    const last = await prisma.loan.findFirst({
      where: { contract_number: { startsWith: prefix } },
      orderBy: { contract_number: 'desc' },
      select: { contract_number: true },
    });

    let nextSeq = 1;
    if (last?.contract_number) {
      const parts = last.contract_number.split('-');
      const lastSeq = parseInt(parts[parts.length - 1] ?? '0', 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    const contractNumber = `${prefix}${nextSeq.toString().padStart(6, '0')}`;

    logger.info({ contractNumber, branchId }, 'Generated contract number');
    return contractNumber;
  }

  /**
   * ตรวจสอบ format เบื้องต้น
   */
  static validateContractNumber(contractNumber: string): boolean {
    return /^SME-\d{4}-[A-Z0-9]+-\d{6}$/.test(contractNumber);
  }

  /**
   * สร้างเลขสัญญาสำหรับทดสอบ
   */
  static generateTestContractNumber(): string {
    const year = (new Date().getFullYear() + 543).toString();
    const seq = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    return `SME-${year}-TST-${seq}`;
  }
}
