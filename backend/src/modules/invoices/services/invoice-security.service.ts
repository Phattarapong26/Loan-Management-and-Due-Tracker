import { logger } from '@utils/common/logger.util';
import { InvoiceSecurityRepository } from '../repositories/invoice-security.repository';
import crypto from 'crypto';

/**
 * Service สำหรับจัดการความปลอดภัยของ Invoice
 * ใช้เลขบัตรประชาชนเป็นรหัสผ่านในการเปิดดู Invoice
 */
export class InvoiceSecurityService {
    private readonly ALGORITHM = 'aes-256-gcm';
    private readonly KEY_LENGTH = 32;
    private readonly IV_LENGTH = 16;
    private securityRepo: InvoiceSecurityRepository;

    constructor() {
        this.securityRepo = new InvoiceSecurityRepository();
    }

    /**
     * ตรวจสอบว่าเลขบัตรประชาชนถูกต้องหรือไม่
     */
    async verifyNationalId(paymentScheduleId: string, nationalId: string): Promise<boolean> {
        try {
            const schedule = await this.securityRepo.findScheduleWithCustomerNationalId(paymentScheduleId);

            if (!schedule) {
                logger.warn({ paymentScheduleId }, 'Payment schedule not found');
                return false;
            }

            const customer = schedule.loan?.customer;
            if (!customer || !customer.thaiId) {
                logger.warn({ paymentScheduleId }, 'Customer national ID not found');
                return false;
            }

            // เปรียบเทียบเลขบัตรประชาชน (ลบช่องว่างและขีดออก)
            const cleanInputId = this.cleanNationalId(nationalId);
            const cleanStoredId = this.cleanNationalId(customer.thaiId);

            const isValid = cleanInputId === cleanStoredId;

            // บันทึก audit log
            await this.logAccessAttempt(
                paymentScheduleId,
                schedule.loan.customerId,
                isValid
            );

            return isValid;
        } catch (error) {
            logger.error({ error, paymentScheduleId }, 'Error verifying national ID');
            return false;
        }
    }

    /**
     * ตรวจสอบว่าเลขบัตรประชาชนถูกต้องสำหรับ loan
     */
    async verifyNationalIdForLoan(loanId: string, nationalId: string): Promise<boolean> {
        try {
            const loan = await this.securityRepo.findLoanWithCustomerNationalId(loanId);

            if (!loan) {
                logger.warn({ loanId }, 'Loan not found');
                return false;
            }

            const customer = loan.customer;
            if (!customer || !customer.nationalId) {
                logger.warn({ loanId }, 'Customer national ID not found');
                return false;
            }

            const cleanInputId = this.cleanNationalId(nationalId);
            const cleanStoredId = this.cleanNationalId(customer.nationalId);

            const isValid = cleanInputId === cleanStoredId;

            // บันทึก audit log
            await this.logAccessAttempt(loanId, customer.id, isValid);

            return isValid;
        } catch (error) {
            logger.error({ error, loanId }, 'Error verifying national ID for loan');
            return false;
        }
    }

    /**
     * ทำความสะอาดเลขบัตรประชาชน (ลบช่องว่าง, ขีด, และอักขระพิเศษ)
     */
    private cleanNationalId(nationalId: string): string {
        return nationalId.replace(/[\s\-]/g, '').trim();
    }

    /**
     * เข้ารหัสข้อมูล Invoice
     */
    encryptInvoiceData(data: any, nationalId: string): {
        encrypted: string;
        iv: string;
        authTag: string;
    } {
        try {
            // สร้าง key จาก national ID
            const key = this.deriveKey(nationalId);
            
            // สร้าง IV แบบสุ่ม
            const iv = crypto.randomBytes(this.IV_LENGTH);
            
            // สร้าง cipher
            const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
            
            // เข้ารหัสข้อมูล
            const jsonData = JSON.stringify(data);
            let encrypted = cipher.update(jsonData, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // ดึง auth tag
            const authTag = cipher.getAuthTag();

            return {
                encrypted,
                iv: iv.toString('hex'),
                authTag: authTag.toString('hex'),
            };
        } catch (error) {
            logger.error({ error }, 'Error encrypting invoice data');
            throw new Error('Failed to encrypt invoice data');
        }
    }

    /**
     * ถอดรหัสข้อมูล Invoice
     */
    decryptInvoiceData(
        encrypted: string,
        iv: string,
        authTag: string,
        nationalId: string
    ): any {
        try {
            // สร้าง key จาก national ID
            const key = this.deriveKey(nationalId);
            
            // สร้าง decipher
            const decipher = crypto.createDecipheriv(
                this.ALGORITHM,
                key,
                Buffer.from(iv, 'hex')
            );
            
            // ตั้งค่า auth tag
            decipher.setAuthTag(Buffer.from(authTag, 'hex'));
            
            // ถอดรหัสข้อมูล
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return JSON.parse(decrypted);
        } catch (error) {
            logger.error({ error }, 'Error decrypting invoice data');
            throw new Error('Invalid password or corrupted data');
        }
    }

    /**
     * สร้าง key จาก national ID โดยใช้ PBKDF2
     */
    private deriveKey(nationalId: string): Buffer {
        const cleanId = this.cleanNationalId(nationalId);
        
        // ใช้ PBKDF2 เพื่อสร้าง key ที่แข็งแรง
        // Salt คือ hash ของ national ID เพื่อให้ได้ key เดิมทุกครั้ง
        const salt = crypto.createHash('sha256').update(cleanId).digest();
        
        return crypto.pbkdf2Sync(
            cleanId,
            salt,
            100000, // iterations
            this.KEY_LENGTH,
            'sha256'
        );
    }

    /**
     * บันทึก log การพยายามเข้าถึง Invoice
     */
    private async logAccessAttempt(
        resourceId: string,
        customerId: string,
        success: boolean
    ): Promise<void> {
        try {
            await this.securityRepo.createAccessLog({
                resourceId,
                customerId,
                success,
                attemptedAt: new Date(),
                ipAddress: null, // จะถูกเพิ่มจาก controller
                userAgent: null, // จะถูกเพิ่มจาก controller
            });
        } catch (error) {
            // ไม่ throw error เพื่อไม่ให้กระทบกับ main flow
            logger.error({ error }, 'Error logging access attempt');
        }
    }

    /**
     * ดึงประวัติการเข้าถึง Invoice
     */
    async getAccessHistory(resourceId: string, limit = 50) {
        try {
            return await this.securityRepo.findAccessHistory(resourceId, limit);
        } catch (error) {
            logger.error({ error }, 'Error getting access history');
            return [];
        }
    }

    /**
     * ตรวจสอบว่ามีการพยายามเข้าถึงผิดพลาดมากเกินไปหรือไม่
     */
    async checkRateLimit(resourceId: string, timeWindowMinutes = 15): Promise<{
        allowed: boolean;
        remainingAttempts: number;
        resetAt: Date;
    }> {
        try {
            const maxAttempts = 5;
            const timeWindow = new Date();
            timeWindow.setMinutes(timeWindow.getMinutes() - timeWindowMinutes);

            const recentAttempts = await this.securityRepo.countFailedAttempts(resourceId, timeWindow);

            const resetAt = new Date();
            resetAt.setMinutes(resetAt.getMinutes() + timeWindowMinutes);

            return {
                allowed: recentAttempts < maxAttempts,
                remainingAttempts: Math.max(0, maxAttempts - recentAttempts),
                resetAt,
            };
        } catch (error) {
            logger.error({ error }, 'Error checking rate limit');
            // ในกรณีเกิด error ให้อนุญาต
            return {
                allowed: true,
                remainingAttempts: 5,
                resetAt: new Date(),
            };
        }
    }

    /**
     * สร้าง masked national ID สำหรับแสดงผล (เช่น 1-2345-xxxxx-xx-x)
     */
    maskNationalId(nationalId: string): string {
        const clean = this.cleanNationalId(nationalId);
        if (clean.length !== 13) {
            return 'x-xxxx-xxxxx-xx-x';
        }

        return `${clean[0]}-${clean.substring(1, 5)}-xxxxx-xx-x`;
    }
}
