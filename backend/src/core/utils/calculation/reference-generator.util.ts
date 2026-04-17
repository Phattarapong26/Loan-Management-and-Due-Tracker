/**
 * Reference Number Generator Utility
 * 
 * Purpose: Generate standardized reference numbers for banking transactions
 * 
 * 1.1 Contract Number Format: [รหัสสาขา(4ตัว)]-[ปีพ.ศ.(4ตัว)]-[รหัสสินเชื่อ(3ตัว)]-[ลำดับที่(6ตัว)]
 * Example: BKK1-2567-SME-000123
 * 
 * 1.2 Invoice Number Format: INV-[สาขา(4ตัว)]-[ปีพ.ศ.(2ตัว)]-[เดือน(2ตัว)]-[ลำดับที่(5ตัว)]
 * Example: INV-BKK1-67-03-00123
 * 
 * 1.3 Receipt Number Format: RCP-[สาขา(4ตัว)]-[ปีพ.ศ.(2ตัว)]-[เดือน(2ตัว)]-[ลำดับที่(5ตัว)]
 * Example: RCP-BKK1-67-03-00123
 * 
 * 1.4 Statement Number Format: STM-[เลขสัญญา]-[งวดที่(3ตัว)]
 * Example: STM-BKK1-2567-SME-000123-001
 * 
 * Other Reference Formats: [PREFIX][YYYYMMDD][SEQUENCE][CHECKSUM]
 * Examples:
 * - Disbursement: DSB20260129000001C
 * - Payment: PAY20260129000001A
 */

import { PrismaClient } from '@prisma/client';
import { TimezoneUtil } from '../formatting/timezone.util';

const prisma = new PrismaClient();

export class ReferenceGenerator {
    /**
     * 1.1 Generate contract number (เลขที่สัญญา)
     * Format: [รหัสสาขา(4ตัว)]-[ปีพ.ศ.(4ตัว)]-[รหัสสินเชื่อ(3ตัว)]-[ลำดับที่(6ตัว)]
     * Example: BKK1-2567-SME-000123
     */
    static async generateContractNumber(branchId: string, loanType: 'SME' | 'PERSONAL' | 'MICRO' = 'SME'): Promise<string> {
        // Get branch code
        const branch = await prisma.branch.findUnique({
            where: { id: branchId },
            select: { code: true }
        });

        if (!branch) {
            throw new Error(`Branch not found: ${branchId}`);
        }

        // Ensure branch code is 4 characters
        const branchCode = branch.code.padEnd(4, '0').substring(0, 4);
        
        // Get Buddhist year (พ.ศ.)
        const currentYear = TimezoneUtil.now().getFullYear();
        const buddhistYear = currentYear + 543; // Convert to Buddhist year
        
        // Loan type code (3 characters)
        const loanTypeCode = loanType.padEnd(3, '0').substring(0, 3);
        
        // Get sequence number for this branch and year
        const startOfYear = TimezoneUtil.createThailandDate(currentYear, 1, 1);
        const endOfYear = TimezoneUtil.createThailandDate(currentYear, 12, 31, 23, 59);
        
        const count = await prisma.loan.count({
            where: {
                branchId: branchId,
                createdAt: {
                    gte: startOfYear,
                    lte: endOfYear,
                },
            },
        });

        const sequence = (count + 1).toString().padStart(6, '0');
        
        return `${branchCode}-${buddhistYear}-${loanTypeCode}-${sequence}`;
    }

    /**
     * 1.2 Generate invoice number (เลขที่ Invoice/ใบแจ้งหนี้)
     * Format: INV-[สาขา(4ตัว)]-[ปีพ.ศ.(2ตัว)]-[เดือน(2ตัว)]-[ลำดับที่(5ตัว)]
     * Example: INV-BKK1-67-03-00123
     */
    static async generateInvoiceNumber(branchId: string): Promise<string> {
        // Get branch code
        const branch = await prisma.branch.findUnique({
            where: { id: branchId },
            select: { code: true }
        });

        if (!branch) {
            throw new Error(`Branch not found: ${branchId}`);
        }

        const branchCode = branch.code.padEnd(4, '0').substring(0, 4);
        
        // Get current date in Thailand timezone
        const now = TimezoneUtil.now();
        const buddhistYear = (now.getFullYear() + 543).toString().slice(-2); // Last 2 digits
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        
        // Get sequence for this branch and month
        const startOfMonth = TimezoneUtil.createThailandDate(now.getFullYear(), now.getMonth() + 1, 1);
        const endOfMonth = TimezoneUtil.createThailandDate(now.getFullYear(), now.getMonth() + 1, 31, 23, 59);
        
        const count = await prisma.invoice.count({
            where: {
                loan: {
                    branchId: branchId,
                },
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
        });

        const sequence = (count + 1).toString().padStart(5, '0');
        
        return `INV-${branchCode}-${buddhistYear}-${month}-${sequence}`;
    }

    /**
     * 1.3 Generate receipt number (เลขที่ Receipt/ใบเสร็จ)
     * Format: RCP-[สาขา(4ตัว)]-[ปีพ.ศ.(2ตัว)]-[เดือน(2ตัว)]-[ลำดับที่(5ตัว)]
     * Example: RCP-BKK1-67-03-00123
     */
    static async generateReceiptNumber(branchId: string): Promise<string> {
        // Get branch code
        const branch = await prisma.branch.findUnique({
            where: { id: branchId },
            select: { code: true }
        });

        if (!branch) {
            throw new Error(`Branch not found: ${branchId}`);
        }

        const branchCode = branch.code.padEnd(4, '0').substring(0, 4);
        
        // Get current date in Thailand timezone
        const now = TimezoneUtil.now();
        const buddhistYear = (now.getFullYear() + 543).toString().slice(-2); // Last 2 digits
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        
        // Get sequence for this branch and month
        const startOfMonth = TimezoneUtil.createThailandDate(now.getFullYear(), now.getMonth() + 1, 1);
        const endOfMonth = TimezoneUtil.createThailandDate(now.getFullYear(), now.getMonth() + 1, 31, 23, 59);
        
        const count = await prisma.payment.count({
            where: {
                loan: {
                    branchId: branchId,
                },
                createdAt: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
        });

        const sequence = (count + 1).toString().padStart(5, '0');
        
        return `RCP-${branchCode}-${buddhistYear}-${month}-${sequence}`;
    }

    /**
     * 1.4 Generate statement number (เลขที่ Statement/ใบแจ้งยอด)
     * Format: STM-[เลขสัญญา]-[งวดที่(3ตัว)]
     * Example: STM-BKK1-2567-SME-000123-001
     */
    static generateStatementNumber(contractNumber: string, installmentNumber: number): string {
        if (!contractNumber) {
            throw new Error('Contract number is required');
        }

        const installment = installmentNumber.toString().padStart(3, '0');
        return `STM-${contractNumber}-${installment}`;
    }

    /**
     * Generate disbursement reference number
     * Format: DSB[YYYYMMDD][6-digit sequence][checksum]
     * Example: DSB202601290000017
     */
    static async generateDisbursementReference(_loanId?: string): Promise<string> {
        const prefix = 'DSB';
        const dateStr = this.getDateString();
        
        // Get today's disbursement count for sequence
        const startOfDay = TimezoneUtil.startOfDay();
        const endOfDay = TimezoneUtil.endOfDay();

        const count = await prisma.loanDisbursement.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        const sequence = (count + 1).toString().padStart(6, '0');
        const baseRef = `${prefix}${dateStr}${sequence}`;
        const checksum = this.calculateChecksum(baseRef);

        return `${baseRef}${checksum}`;
    }

    /**
     * Generate payment reference number
     * Format: PAY[YYYYMMDD][6-digit sequence][checksum]
     * Example: PAY202601290000015
     */
    static async generatePaymentReference(_loanId?: string): Promise<string> {
        const prefix = 'PAY';
        const dateStr = this.getDateString();
        
        const startOfDay = TimezoneUtil.startOfDay();
        const endOfDay = TimezoneUtil.endOfDay();

        const count = await prisma.payment.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        const sequence = (count + 1).toString().padStart(6, '0');
        const baseRef = `${prefix}${dateStr}${sequence}`;
        const checksum = this.calculateChecksum(baseRef);

        return `${baseRef}${checksum}`;
    }

    /**
     * Generate loan reference number (for internal use)
     * Format: LON[YYYYMMDD][6-digit sequence][checksum]
     * Example: LON202601290000013
     */
    static async generateLoanReference(): Promise<string> {
        const prefix = 'LON';
        const dateStr = this.getDateString();
        
        const startOfDay = TimezoneUtil.startOfDay();
        const endOfDay = TimezoneUtil.endOfDay();

        const count = await prisma.loan.count({
            where: {
                createdAt: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
        });

        const sequence = (count + 1).toString().padStart(6, '0');
        const baseRef = `${prefix}${dateStr}${sequence}`;
        const checksum = this.calculateChecksum(baseRef);

        return `${baseRef}${checksum}`;
    }

    /**
     * Validate contract number format
     * Format: [รหัสสาขา(4ตัว)]-[ปีพ.ศ.(4ตัว)]-[รหัสสินเชื่อ(3ตัว)]-[ลำดับที่(6ตัว)]
     */
    static validateContractNumber(contractNumber?: string): boolean {
        if (!contractNumber) return false;
        
        // Check format: XXXX-YYYY-ZZZ-NNNNNN
        const pattern = /^[A-Z0-9]{4}-\d{4}-[A-Z0-9]{3}-\d{6}$/;
        if (!pattern.test(contractNumber)) return false;
        
        const parts = contractNumber.split('-');
        if (parts.length !== 4) return false;
        
        const [branchCode, year, loanType, sequence] = parts;
        
        // Validate parts exist
        if (!branchCode || !year || !loanType || !sequence) return false;
        
        // Validate parts
        if (branchCode.length !== 4) return false;
        if (year.length !== 4) return false;
        if (loanType.length !== 3) return false;
        if (sequence.length !== 6) return false;
        
        // Validate Buddhist year (should be reasonable range)
        const buddhistYear = parseInt(year);
        const currentBuddhistYear = new Date().getFullYear() + 543;
        if (buddhistYear < 2500 || buddhistYear > currentBuddhistYear + 10) return false;
        
        return true;
    }

    /**
     * Validate invoice number format
     * Format: INV-[สาขา(4ตัว)]-[ปีพ.ศ.(2ตัว)]-[เดือน(2ตัว)]-[ลำดับที่(5ตัว)]
     */
    static validateInvoiceNumber(invoiceNumber?: string): boolean {
        if (!invoiceNumber) return false;
        
        // Check format: INV-XXXX-YY-MM-NNNNN
        const pattern = /^INV-[A-Z0-9]{4}-\d{2}-\d{2}-\d{5}$/;
        if (!pattern.test(invoiceNumber)) return false;
        
        const parts = invoiceNumber.split('-');
        if (parts.length !== 5) return false;
        
        const [prefix, branchCode, year, month, sequence] = parts;
        
        // Validate parts exist
        if (!prefix || !branchCode || !year || !month || !sequence) return false;
        
        // Validate parts
        if (prefix !== 'INV') return false;
        if (branchCode.length !== 4) return false;
        if (year.length !== 2) return false;
        if (month.length !== 2) return false;
        if (sequence.length !== 5) return false;
        
        // Validate month (01-12)
        const monthNum = parseInt(month);
        if (monthNum < 1 || monthNum > 12) return false;
        
        return true;
    }

    /**
     * Validate receipt number format
     * Format: RCP-[สาขา(4ตัว)]-[ปีพ.ศ.(2ตัว)]-[เดือน(2ตัว)]-[ลำดับที่(5ตัว)]
     */
    static validateReceiptNumber(receiptNumber?: string): boolean {
        if (!receiptNumber) return false;
        
        // Check format: RCP-XXXX-YY-MM-NNNNN
        const pattern = /^RCP-[A-Z0-9]{4}-\d{2}-\d{2}-\d{5}$/;
        if (!pattern.test(receiptNumber)) return false;
        
        const parts = receiptNumber.split('-');
        if (parts.length !== 5) return false;
        
        const [prefix, branchCode, year, month, sequence] = parts;
        
        // Validate parts exist
        if (!prefix || !branchCode || !year || !month || !sequence) return false;
        
        // Validate parts
        if (prefix !== 'RCP') return false;
        if (branchCode.length !== 4) return false;
        if (year.length !== 2) return false;
        if (month.length !== 2) return false;
        if (sequence.length !== 5) return false;
        
        // Validate month (01-12)
        const monthNum = parseInt(month);
        if (monthNum < 1 || monthNum > 12) return false;
        
        return true;
    }

    /**
     * Validate statement number format
     * Format: STM-[เลขสัญญา]-[งวดที่(3ตัว)]
     */
    static validateStatementNumber(statementNumber?: string): boolean {
        if (!statementNumber) return false;
        
        // Check format: STM-XXXX-YYYY-ZZZ-NNNNNN-III
        const pattern = /^STM-[A-Z0-9]{4}-\d{4}-[A-Z0-9]{3}-\d{6}-\d{3}$/;
        if (!pattern.test(statementNumber)) return false;
        
        const parts = statementNumber.split('-');
        if (parts.length !== 6) return false;
        
        const [prefix, branchCode, year, loanType, sequence, installment] = parts;
        
        // Validate parts exist
        if (!prefix || !branchCode || !year || !loanType || !sequence || !installment) return false;
        
        // Validate parts
        if (prefix !== 'STM') return false;
        if (branchCode.length !== 4) return false;
        if (year.length !== 4) return false;
        if (loanType.length !== 3) return false;
        if (sequence.length !== 6) return false;
        if (installment.length !== 3) return false;
        
        return true;
    }

    /**
     * Validate reference number format and checksum
     */
    static validateReference(reference?: string): boolean {
        // Check if reference exists and has minimum length
        if (!reference || reference.length < 18) return false;

        // Extract checksum
        const baseRef = reference.slice(0, -1);
        const providedChecksum = reference.slice(-1);
        const calculatedChecksum = this.calculateChecksum(baseRef);

        return providedChecksum === calculatedChecksum;
    }

    /**
     * Parse contract number to extract information
     */
    static parseContractNumber(contractNumber?: string): {
        branchCode: string;
        buddhistYear: string;
        christianYear: number;
        loanType: string;
        sequence: string;
        isValid: boolean;
    } | null {
        if (!contractNumber || !this.validateContractNumber(contractNumber)) {
            return null;
        }

        const parts = contractNumber.split('-');
        if (parts.length !== 4) return null;
        
        const [branchCode, buddhistYear, loanType, sequence] = parts;
        if (!branchCode || !buddhistYear || !loanType || !sequence) return null;
        
        const christianYear = parseInt(buddhistYear) - 543;

        return {
            branchCode,
            buddhistYear,
            christianYear,
            loanType,
            sequence,
            isValid: true,
        };
    }

    /**
     * Parse invoice number to extract information
     */
    static parseInvoiceNumber(invoiceNumber?: string): {
        branchCode: string;
        buddhistYear: string;
        christianYear: number;
        month: string;
        sequence: string;
        isValid: boolean;
    } | null {
        if (!invoiceNumber || !this.validateInvoiceNumber(invoiceNumber)) {
            return null;
        }

        const parts = invoiceNumber.split('-');
        if (parts.length !== 5) return null;
        
        const [, branchCode, year, month, sequence] = parts;
        if (!branchCode || !year || !month || !sequence) return null;
        
        const fullBuddhistYear = parseInt(`25${year}`); // Convert 69 to 2569
        const christianYear = fullBuddhistYear - 543; // Convert to Christian year

        return {
            branchCode,
            buddhistYear: year,
            christianYear,
            month,
            sequence,
            isValid: true,
        };
    }

    /**
     * Parse receipt number to extract information
     */
    static parseReceiptNumber(receiptNumber?: string): {
        branchCode: string;
        buddhistYear: string;
        christianYear: number;
        month: string;
        sequence: string;
        isValid: boolean;
    } | null {
        if (!receiptNumber || !this.validateReceiptNumber(receiptNumber)) {
            return null;
        }

        const parts = receiptNumber.split('-');
        if (parts.length !== 5) return null;
        
        const [, branchCode, year, month, sequence] = parts;
        if (!branchCode || !year || !month || !sequence) return null;
        
        const fullBuddhistYear = parseInt(`25${year}`); // Convert 69 to 2569
        const christianYear = fullBuddhistYear - 543; // Convert to Christian year

        return {
            branchCode,
            buddhistYear: year,
            christianYear,
            month,
            sequence,
            isValid: true,
        };
    }

    /**
     * Parse statement number to extract information
     */
    static parseStatementNumber(statementNumber?: string): {
        contractNumber: string;
        installmentNumber: number;
        isValid: boolean;
    } | null {
        if (!statementNumber || !this.validateStatementNumber(statementNumber)) {
            return null;
        }

        const parts = statementNumber.split('-');
        if (parts.length !== 6) return null;
        
        const installment = parts[parts.length - 1];
        if (!installment) return null;
        
        const contractParts = parts.slice(1, -1); // Remove STM prefix and installment
        const contractNumber = contractParts.join('-');

        return {
            contractNumber,
            installmentNumber: parseInt(installment),
            isValid: true,
        };
    }

    /**
     * Get date string in YYYYMMDD format (Thailand timezone)
     */
    private static getDateString(): string {
        const now = TimezoneUtil.now();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        return `${year}${month}${day}`;
    }

    /**
     * Calculate checksum using Luhn algorithm (mod 10)
     * Used by banks for credit card and reference number validation
     */
    private static calculateChecksum(input: string): string {
        // Convert to numbers only
        const numbers = input.replace(/\D/g, '');
        
        let sum = 0;
        let isEven = false;

        // Process from right to left
        for (let i = numbers.length - 1; i >= 0; i--) {
            const char = numbers.charAt(i);
            let digit = parseInt(char, 10);

            if (isEven) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }

            sum += digit;
            isEven = !isEven;
        }

        // Calculate check digit
        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit.toString();
    }

    /**
     * Parse reference number to extract information
     */
    static parseReference(reference?: string): {
        type: string;
        date: string;
        sequence: string;
        checksum: string;
        isValid: boolean;
    } | null {
        if (!reference || reference.length < 18) return null;

        const type = reference.substring(0, 3);
        const date = reference.substring(3, 11);
        const sequence = reference.substring(11, reference.length - 1);
        const checksum = reference.slice(-1);
        const isValid = this.validateReference(reference);

        return {
            type,
            date,
            sequence,
            checksum,
            isValid,
        };
    }
}
