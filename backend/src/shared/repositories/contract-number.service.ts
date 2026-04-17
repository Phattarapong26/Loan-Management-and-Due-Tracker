import { PrismaClient } from '@prisma/client';
import { logger } from '@utils/common/logger.util';

const prisma = new PrismaClient();

interface ContractNumberConfig {
  bankCode: string;           // รหัสธนาคาร (2 ตัว)
  productCode: string;        // รหัสผลิตภัณฑ์ (3 ตัว) 
  year: string;              // ปีพ.ศ. (4 ตัว)
  branchCode: string;        // รหัสสาขา (3 ตัว)
  departmentCode: string;    // รหัสหน่วยงาน (2 ตัว)
  sequenceNumber: string;    // ลำดับที่ (6 ตัว)
  checkDigit: string;        // ตัวตรวจสอบ (1 ตัว)
}

export class ContractNumberService {
  private static readonly BANK_CODE = 'SD'; // SME D Bank
  private static readonly DEFAULT_PRODUCT_CODE = 'SME'; // SME Loan
  private static readonly DEFAULT_DEPARTMENT_CODE = '01'; // Lending Department

  /**
   * สร้างเลขที่สัญญาใหม่
   */
  static async generateContractNumber(
    branchId: string,
    loanProductId?: string
  ): Promise<string> {
    try {
      // ดึงข้อมูลสาขา
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { code: true }
      });

      if (!branch) {
        throw new Error(`Branch not found: ${branchId}`);
      }

      // ดึงข้อมูลผลิตภัณฑ์สินเชื่อ (ถ้ามี)
      let productCode = this.DEFAULT_PRODUCT_CODE;
      if (loanProductId) {
        const loanProduct = await prisma.loanProduct.findUnique({
          where: { id: loanProductId },
          select: { productCode: true }
        });
        if (loanProduct?.productCode) {
          productCode = loanProduct.productCode.substring(0, 3).toUpperCase();
        }
      }

      // สร้างปีพ.ศ.
      const currentYear = new Date().getFullYear();
      const buddhistYear = (currentYear + 543).toString();

      // สร้างรหัสสาขา (3 ตัว)
      const branchCode = branch.code.padStart(3, '0').substring(0, 3);

      // สร้างลำดับที่ (6 ตัว) - หาลำดับถัดไป
      const sequenceNumber = await this.getNextSequenceNumber(
        buddhistYear,
        branchCode,
        productCode
      );

      // สร้างเลขสัญญาโดยไม่มีตัวตรวจสอบ
      const baseContractNumber =
        this.BANK_CODE +
        productCode +
        buddhistYear +
        branchCode +
        this.DEFAULT_DEPARTMENT_CODE +
        sequenceNumber;

      // คำนวณตัวตรวจสอบ
      const checkDigit = this.calculateCheckDigit(baseContractNumber);

      // เลขสัญญาสมบูรณ์
      const contractNumber = baseContractNumber + checkDigit;

      logger.info({
        contractNumber,
        branchId,
        loanProductId,
        components: {
          bankCode: this.BANK_CODE,
          productCode,
          year: buddhistYear,
          branchCode,
          departmentCode: this.DEFAULT_DEPARTMENT_CODE,
          sequenceNumber,
          checkDigit
        }
      }, 'Generated contract number');

      return contractNumber;
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : 'Unknown error',
        branchId,
        loanProductId
      }, 'Error generating contract number');
      throw new Error(`Failed to generate contract number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * หาลำดับถัดไปสำหรับปี/สาขา/ผลิตภัณฑ์
   */
  private static async getNextSequenceNumber(
    year: string,
    branchCode: string,
    productCode: string
  ): Promise<string> {
    try {
      // หาเลขสัญญาล่าสุดที่มีรูปแบบเดียวกัน
      const prefix = `${this.BANK_CODE}${productCode}${year}${branchCode}${this.DEFAULT_DEPARTMENT_CODE}`;

      const lastContract = await prisma.loan.findFirst({
        where: {
          contract_number: {
            startsWith: prefix
          }
        },
        orderBy: {
          contract_number: 'desc'
        },
        select: {
          contract_number: true
        }
      });

      let nextSequence = 1;

      if (lastContract?.contract_number) {
        // ดึงลำดับที่จากเลขสัญญาล่าสุด (ตำแหน่งที่ 12-17, 6 ตัว)
        const sequenceStart = prefix.length;
        const sequenceEnd = sequenceStart + 6;
        const lastSequence = lastContract.contract_number.substring(sequenceStart, sequenceEnd);

        if (lastSequence && !isNaN(parseInt(lastSequence, 10))) {
          nextSequence = parseInt(lastSequence, 10) + 1;
        }
      }

      // แปลงเป็น string 6 ตัว
      return nextSequence.toString().padStart(6, '0');
    } catch (error) {
      // ถ้าเกิดข้อผิดพลาด ให้เริ่มจาก 1
      return '000001';
    }
  }

  /**
   * คำนวณตัวตรวจสอบด้วย Modulus 11
   */
  private static calculateCheckDigit(contractNumber: string): string {
    const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9, 2, 3];
    let sum = 0;

    // คำนวณผลรวมถ่วงน้ำหนัก
    for (let i = 0; i < contractNumber.length && i < weights.length; i++) {
      const char = contractNumber[i];
      const weight = weights[i];

      if (!char || weight === undefined) continue;

      const digit = parseInt(char, 10);
      if (!isNaN(digit)) {
        sum += digit * weight;
      }
    }

    // คำนวณ modulus 11
    const remainder = sum % 11;
    let checkDigit = 11 - remainder;

    // กรณีพิเศษ
    if (checkDigit === 10) {
      checkDigit = 0;
    } else if (checkDigit === 11) {
      checkDigit = 1;
    }

    return checkDigit.toString();
  }

  /**
   * ตรวจสอบความถูกต้องของเลขสัญญา
   */
  static validateContractNumber(contractNumber: string): boolean {
    try {
      if (!contractNumber || contractNumber.length !== 19) {
        return false;
      }

      // แยกส่วนประกอบ
      const baseNumber = contractNumber.substring(0, 18);
      const providedCheckDigit = contractNumber.substring(18, 19);

      // คำนวณตัวตรวจสอบที่ถูกต้อง
      const calculatedCheckDigit = this.calculateCheckDigit(baseNumber);

      return providedCheckDigit === calculatedCheckDigit;
    } catch (error) {
      logger.error({ error, contractNumber }, 'Error validating contract number');
      return false;
    }
  }

  /**
   * แยกส่วนประกอบของเลขสัญญา
   */
  static parseContractNumber(contractNumber: string): ContractNumberConfig | null {
    try {
      if (!contractNumber || contractNumber.length !== 19) {
        return null;
      }

      return {
        bankCode: contractNumber.substring(0, 2),
        productCode: contractNumber.substring(2, 5),
        year: contractNumber.substring(5, 9),
        branchCode: contractNumber.substring(9, 12),
        departmentCode: contractNumber.substring(12, 14),
        sequenceNumber: contractNumber.substring(14, 18),
        checkDigit: contractNumber.substring(18, 19)
      };
    } catch (error) {
      logger.error({ error, contractNumber }, 'Error parsing contract number');
      return null;
    }
  }

  /**
   * สร้างเลขสัญญาสำหรับทดสอบ
   */
  static generateTestContractNumber(): string {
    const year = (new Date().getFullYear() + 543).toString();
    const testSequence = Math.floor(Math.random() * 999999).toString().padStart(6, '0');

    const baseNumber =
      this.BANK_CODE +
      this.DEFAULT_PRODUCT_CODE +
      year +
      '001' + // Test branch
      this.DEFAULT_DEPARTMENT_CODE +
      testSequence;

    const checkDigit = this.calculateCheckDigit(baseNumber);
    return baseNumber + checkDigit;
  }
}