import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';

/**
 * Service for generating business reference numbers
 * Supports all document types with proper Thai formatting
 */
export class ReferenceNumberService {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Generate Contract Number
     * Format: BKK1-2567-SME-000123 ({Branch}-{ThaiYear}-{ProductCode}-{Running})
     */
    async generateContractNumber(branchCode: string, productCode: string = 'SME'): Promise<string> {
        const thaiYear = this.getThaiYearFull(); // 2567
        const key = `CONTRACT-${branchCode}-${thaiYear}-${productCode}`;

        const runningNumber = await this.getNextSequence(key);
        const paddedRunning = runningNumber.toString().padStart(6, '0');

        return `${branchCode}-${thaiYear}-${productCode}-${paddedRunning}`;
    }

    /**
     * Generate Invoice Number
     * Format: INV-BKK1-6703-00123 (INV-{Branch}-{ThaiYYMM}-{Running})
     */
    async generateInvoiceNumber(branchCode: string): Promise<string> {
        const prefix = 'INV';
        const thaiYearMonth = this.getThaiYearMonth(); // 6703
        const key = `${prefix}-${branchCode}-${thaiYearMonth}`;

        const runningNumber = await this.getNextSequence(key);
        const paddedRunning = runningNumber.toString().padStart(5, '0');

        return `${prefix}-${branchCode}-${thaiYearMonth}-${paddedRunning}`;
    }

    /**
     * Generate Receipt Number
     * Format: RCP-BKK1-6703-00123 (RCP-{Branch}-{ThaiYYMM}-{Running})
     */
    async generateReceiptNumber(branchCode: string): Promise<string> {
        const prefix = 'RCP';
        const thaiYearMonth = this.getThaiYearMonth(); // 6703
        const key = `${prefix}-${branchCode}-${thaiYearMonth}`;

        const runningNumber = await this.getNextSequence(key);
        const paddedRunning = runningNumber.toString().padStart(5, '0');

        return `${prefix}-${branchCode}-${thaiYearMonth}-${paddedRunning}`;
    }

    /**
     * Generate Statement Number
     * Format: STM-BKK1-2567-SME-000123-001 (STM-{ContractNumber}-{InstallmentNo})
     */
    async generateStatementNumber(contractNumber: string, installmentNo: number): Promise<string> {
        const prefix = 'STM';
        const paddedInstallment = installmentNo.toString().padStart(3, '0');

        return `${prefix}-${contractNumber}-${paddedInstallment}`;
    }

    /**
     * Generate Transaction Reference
     * Format: TXN-BKK1-670301-0000123 (Daily running)
     */
    async generateTransactionReference(branchCode: string): Promise<string> {
        const prefix = 'TXN';
        const dateStr = this.getThaiYearMonthDay(); // 670301
        const key = `${prefix}-${branchCode}-${dateStr}`;

        const runningNumber = await this.getNextSequence(key);
        const paddedRunning = runningNumber.toString().padStart(7, '0');

        return `${prefix}-${branchCode}-${dateStr}-${paddedRunning}`;
    }

    /**
     * Generate Disbursement Reference
     * Format: DIS-BKK1-6703-00123 (DIS-{Branch}-{ThaiYYMM}-{Running})
     */
    async generateDisbursementReference(branchCode: string): Promise<string> {
        const prefix = 'DIS';
        const thaiYearMonth = this.getThaiYearMonth(); // 6703
        const key = `${prefix}-${branchCode}-${thaiYearMonth}`;

        const runningNumber = await this.getNextSequence(key);
        const paddedRunning = runningNumber.toString().padStart(5, '0');

        return `${prefix}-${branchCode}-${thaiYearMonth}-${paddedRunning}`;
    }

    /**
     * Generate Document Reference
     * Format: DOC-BKK1-6703-00123 (DOC-{Branch}-{ThaiYYMM}-{Running})
     */
    async generateDocumentReference(branchCode: string): Promise<string> {
        const prefix = 'DOC';
        const thaiYearMonth = this.getThaiYearMonth(); // 6703
        const key = `${prefix}-${branchCode}-${thaiYearMonth}`;

        const runningNumber = await this.getNextSequence(key);
        const paddedRunning = runningNumber.toString().padStart(5, '0');

        return `${prefix}-${branchCode}-${thaiYearMonth}-${paddedRunning}`;
    }

    /**
     * Generate Expense Reference
     * Format: EXP-BKK1-6703-00123 (EXP-{Branch}-{ThaiYYMM}-{Running})
     */
    async generateExpenseReference(branchCode: string): Promise<string> {
        const prefix = 'EXP';
        const thaiYearMonth = this.getThaiYearMonth(); // 6703
        const key = `${prefix}-${branchCode}-${thaiYearMonth}`;

        const runningNumber = await this.getNextSequence(key);
        const paddedRunning = runningNumber.toString().padStart(5, '0');

        return `${prefix}-${branchCode}-${thaiYearMonth}-${paddedRunning}`;
    }

    /**
     * Generate Notification Reference
     * Format: NOT-BKK1-670301-0000123 (Daily running)
     */
    async generateNotificationReference(branchCode: string): Promise<string> {
        const prefix = 'NOT';
        const dateStr = this.getThaiYearMonthDay(); // 670301
        const key = `${prefix}-${branchCode}-${dateStr}`;

        const runningNumber = await this.getNextSequence(key);
        const paddedRunning = runningNumber.toString().padStart(7, '0');

        return `${prefix}-${branchCode}-${dateStr}-${paddedRunning}`;
    }

    /**
     * Generate Report Reference
     * Format: RPT-BKK1-6703-00123 (RPT-{Branch}-{ThaiYYMM}-{Running})
     */
    async generateReportReference(branchCode: string): Promise<string> {
        const prefix = 'RPT';
        const thaiYearMonth = this.getThaiYearMonth(); // 6703
        const key = `${prefix}-${branchCode}-${thaiYearMonth}`;

        const runningNumber = await this.getNextSequence(key);
        const paddedRunning = runningNumber.toString().padStart(5, '0');

        return `${prefix}-${branchCode}-${thaiYearMonth}-${paddedRunning}`;
    }

    /**
     * Parse reference number to extract components
     */
    parseReferenceNumber(referenceNumber: string): {
        type: string;
        branchCode?: string;
        year?: string;
        month?: string;
        day?: string;
        productCode?: string;
        runningNumber?: string;
        installmentNo?: string;
    } {
        const parts = referenceNumber.split('-');
        
        if (parts.length < 2) {
            return { type: 'UNKNOWN' };
        }

        const type = parts[0];
        
        switch (type) {
            case 'INV':
            case 'RCP':
            case 'DIS':
            case 'DOC':
            case 'EXP':
            case 'RPT':
                // Format: PREFIX-BRANCH-YYMM-RUNNING
                return {
                    type,
                    branchCode: parts[1],
                    year: parts[2]?.substring(0, 2),
                    month: parts[2]?.substring(2, 4),
                    runningNumber: parts[3],
                };
                
            case 'TXN':
            case 'NOT':
                // Format: PREFIX-BRANCH-YYMMDD-RUNNING
                return {
                    type,
                    branchCode: parts[1],
                    year: parts[2]?.substring(0, 2),
                    month: parts[2]?.substring(2, 4),
                    day: parts[2]?.substring(4, 6),
                    runningNumber: parts[3],
                };
                
            case 'STM':
                // Format: STM-BRANCH-YEAR-PRODUCT-RUNNING-INSTALLMENT
                return {
                    type,
                    branchCode: parts[1],
                    year: parts[2],
                    productCode: parts[3],
                    runningNumber: parts[4],
                    installmentNo: parts[5],
                };
                
            default:
                // Contract format: BRANCH-YEAR-PRODUCT-RUNNING
                if (parts.length === 4) {
                    return {
                        type: 'CONTRACT',
                        branchCode: parts[0],
                        year: parts[1],
                        productCode: parts[2],
                        runningNumber: parts[3],
                    };
                }
                return { type: 'UNKNOWN' };
        }
    }

    /**
     * Validate reference number format
     */
    validateReferenceNumber(referenceNumber: string, expectedType?: string): {
        isValid: boolean;
        type?: string;
        error?: string;
    } {
        try {
            const parsed = this.parseReferenceNumber(referenceNumber);
            
            if (parsed.type === 'UNKNOWN') {
                return {
                    isValid: false,
                    error: 'Invalid reference number format',
                };
            }
            
            if (expectedType && parsed.type !== expectedType) {
                return {
                    isValid: false,
                    type: parsed.type,
                    error: `Expected ${expectedType} but got ${parsed.type}`,
                };
            }
            
            return {
                isValid: true,
                type: parsed.type,
            };
        } catch (error) {
            return {
                isValid: false,
                error: 'Reference number validation failed',
            };
        }
    }

    // --- Helpers ---

    /**
     * Get next sequence number from database (Thread-safe via transaction)
     */
    private async getNextSequence(sequenceKey: string): Promise<number> {
        const configKey = `SEQ:${sequenceKey}`;

        return await this.db.$transaction(async (tx: Prisma.TransactionClient) => {
            const config = await tx.systemConfig.findUnique({
                where: { key: configKey }
            });

            let current = 0;
            if (config) {
                current = parseInt(config.value, 10);
                if (isNaN(current)) current = 0;
            }

            const next = current + 1;

            await tx.systemConfig.upsert({
                where: { key: configKey },
                create: {
                    key: configKey,
                    value: next.toString(),
                    category: 'SEQUENCE',
                    description: `Auto-generated sequence number for ${sequenceKey}`,
                    dataType: 'INTEGER',
                    createdBy: 'SYSTEM'
                },
                update: {
                    value: next.toString()
                }
            });

            return next;
        });
    }

    private getThaiYearMonth(): string {
        const now = new Date();
        const year = (now.getFullYear() + 543).toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        return `${year}${month}`;
    }

    private getThaiYearFull(): string {
        const now = new Date();
        return (now.getFullYear() + 543).toString();
    }

    private getThaiYearMonthDay(): string {
        const now = new Date();
        const year = (now.getFullYear() + 543).toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        return `${year}${month}${day}`;
    }
}
