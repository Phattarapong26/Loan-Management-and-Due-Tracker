/**
 * Error Message Mapper - แปล Technical Errors เป็นภาษามนุษย์
 * สำหรับผู้ใช้ที่ไม่มีความรู้ทางเทคนิค (SME Owners)
 */

export interface UserFriendlyError {
    userMessage: string;           // ข้อความที่แสดงให้ผู้ใช้เห็น
    technicalMessage: string;      // ข้อความเทคนิคสำหรับ Debug
    nextSteps: string[];           // ขั้นตอนที่ผู้ใช้ควรทำต่อ
    supportContact?: string;       // ช่องทางติดต่อ Support
    referenceId?: string;          // รหัสอ้างอิงสำหรับติดต่อ Support
    retryable?: boolean;           // บอกว่าลองใหม่ได้หรือไม่
}

/**
 * Error Message Mapper
 * แปล Error Codes และ Technical Messages เป็นภาษาที่เข้าใจง่าย
 */
export class ErrorMessageMapper {
    private static readonly SUPPORT_PHONE = '02-XXX-XXXX';
    private static readonly SUPPORT_EMAIL = 'support@smebank.com';

    private static errorMap: Record<string, Omit<UserFriendlyError, 'referenceId' | 'technicalMessage'>> = {
        // ==================== Authentication Errors ====================
        'UNAUTHORIZED': {
            userMessage: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
            nextSteps: [
                'คลิกปุ่ม "เข้าสู่ระบบ"',
                'กรอกอีเมลและรหัสผ่าน'
            ],
            retryable: true
        },
        'INVALID_CREDENTIALS': {
            userMessage: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
            nextSteps: [
                'ตรวจสอบอีเมลและรหัสผ่าน',
                'ลองกรอกใหม่อีกครั้ง',
                'หากลืมรหัสผ่าน คลิก "ลืมรหัสผ่าน"'
            ],
            retryable: true
        },
        'SESSION_EXPIRED': {
            userMessage: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
            nextSteps: [
                'คลิกปุ่ม "เข้าสู่ระบบ"',
                'ระบบจะนำคุณกลับไปยังหน้าเดิม'
            ],
            retryable: true
        },
        'TOKEN_INVALID': {
            userMessage: 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
            nextSteps: [
                'คลิกปุ่ม "เข้าสู่ระบบ"'
            ],
            retryable: true
        },

        // ==================== Validation Errors ====================
        'VALIDATION_ERROR': {
            userMessage: 'ข้อมูลที่กรอกไม่ถูกต้อง',
            nextSteps: [
                'ตรวจสอบข้อมูลที่กรอก',
                'ดูตัวอย่างการกรอกที่ถูกต้อง',
                'ลองกรอกใหม่อีกครั้ง'
            ],
            retryable: true
        },
        'REQUIRED_FIELD': {
            userMessage: 'กรุณากรอกข้อมูลให้ครบถ้วน',
            nextSteps: [
                'ตรวจสอบช่องที่มีเครื่องหมาย * (จำเป็น)',
                'กรอกข้อมูลให้ครบทุกช่อง'
            ],
            retryable: true
        },
        'INVALID_FORMAT': {
            userMessage: 'รูปแบบข้อมูลไม่ถูกต้อง',
            nextSteps: [
                'ตรวจสอบรูปแบบการกรอก',
                'ดูตัวอย่างที่แสดงไว้',
                'ลองกรอกใหม่อีกครั้ง'
            ],
            retryable: true
        },

        // ==================== Business Logic Errors ====================
        'BRANCH_ID_REQUIRED': {
            userMessage: 'ระบบไม่พบข้อมูลสาขาของคุณ',
            nextSteps: [
                'ติดต่อผู้จัดการสาขา',
                `โทร ${ErrorMessageMapper.SUPPORT_PHONE}`
            ],
            supportContact: ErrorMessageMapper.SUPPORT_PHONE,
            retryable: false
        },
        'INSUFFICIENT_PERMISSIONS': {
            userMessage: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้',
            nextSteps: [
                'ติดต่อผู้จัดการเพื่อขอสิทธิ์',
                `โทร ${ErrorMessageMapper.SUPPORT_PHONE}`
            ],
            supportContact: ErrorMessageMapper.SUPPORT_PHONE,
            retryable: false
        },
        'DUPLICATE_ENTRY': {
            userMessage: 'ข้อมูลนี้มีอยู่ในระบบแล้ว',
            nextSteps: [
                'ตรวจสอบข้อมูลที่กรอก',
                'ค้นหาข้อมูลเดิมในระบบ',
                'หากต้องการแก้ไข ให้เลือก "แก้ไข" แทน'
            ],
            retryable: false
        },
        'NOT_FOUND': {
            userMessage: 'ไม่พบข้อมูลที่ต้องการ',
            nextSteps: [
                'ตรวจสอบว่าข้อมูลยังอยู่ในระบบ',
                'ลองค้นหาใหม่อีกครั้ง',
                'หากปัญหายังคงอยู่ ติดต่อเจ้าหน้าที่'
            ],
            supportContact: ErrorMessageMapper.SUPPORT_PHONE,
            retryable: true
        },

        // ==================== LINE Integration Errors ====================
        'LINE_NOT_LINKED': {
            userMessage: 'ผู้ใช้นี้ยังไม่ได้เชื่อมต่อ LINE กับระบบ',
            nextSteps: [
                'ให้ผู้ใช้เพิ่มเพื่อน LINE OA',
                'เข้าเมนู LINE ในระบบ แล้วกดเชื่อมต่อ/ลงทะเบียน',
                'กลับมาทดสอบส่งข้อความใหม่อีกครั้ง'
            ],
            retryable: false
        },
        'LINE_PUSH_FAILED': {
            userMessage: 'ส่งข้อความไปยัง LINE ไม่สำเร็จ',
            nextSteps: [
                'ตรวจสอบว่า LINE OA เปิดใช้งาน และ Channel Access Token ถูกต้อง',
                'ตรวจสอบว่าผู้ใช้ไม่ได้บล็อก LINE OA',
                'ลองส่งทดสอบใหม่อีกครั้ง'
            ],
            retryable: true
        },
        'CUSTOMER_LINE_NOT_LINKED': {
            userMessage: 'ลูกค้ายังไม่ได้เชื่อมต่อ LINE กับระบบ',
            nextSteps: [
                'ให้ลูกค้าเพิ่มเพื่อน LINE OA',
                'ให้ลูกค้าทำขั้นตอนเชื่อมต่อ/ลงทะเบียนใน LINE',
                'กลับมาทดสอบส่งแจ้งเตือนลูกค้าใหม่อีกครั้ง'
            ],
            retryable: false
        },
        'ROLE_NOT_SUPPORTED': {
            userMessage: 'Role ของผู้รับไม่รองรับการแจ้งเตือนนี้',
            nextSteps: [
                'เลือกผู้รับที่เป็น Admin / Manager / Officer',
                'ตรวจสอบสิทธิ์และบทบาทผู้ใช้ในหน้า “จัดการผู้ใช้”'
            ],
            retryable: false
        },

        // ==================== Concurrency Errors ====================
        'CONCURRENT_MODIFICATION': {
            userMessage: 'มีคนอื่นกำลังแก้ไขข้อมูลนี้อยู่',
            nextSteps: [
                'รอสักครู่แล้วลองใหม่',
                'รีเฟรชหน้าจอ',
                'ตรวจสอบว่าข้อมูลถูกแก้ไขแล้วหรือไม่'
            ],
            retryable: true
        },
        'OPTIMISTIC_LOCK_ERROR': {
            userMessage: 'ข้อมูลถูกแก้ไขโดยคนอื่นแล้ว',
            nextSteps: [
                'รีเฟรชหน้าจอเพื่อดูข้อมูลล่าสุด',
                'ตรวจสอบการเปลี่ยนแปลง',
                'ลองแก้ไขใหม่อีกครั้ง'
            ],
            retryable: true
        },

        // ==================== Network Errors ====================
        'NETWORK_ERROR': {
            userMessage: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
            nextSteps: [
                'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
                'ลองใหม่อีกครั้ง',
                'หากปัญหายังคงอยู่ ติดต่อเจ้าหน้าที่'
            ],
            supportContact: ErrorMessageMapper.SUPPORT_PHONE,
            retryable: true
        },
        'TIMEOUT': {
            userMessage: 'การเชื่อมต่อหมดเวลา',
            nextSteps: [
                'ตรวจสอบสัญญาณอินเทอร์เน็ต',
                'ลองใหม่อีกครั้ง',
                'หากปัญหายังคงอยู่ ติดต่อเจ้าหน้าที่'
            ],
            supportContact: ErrorMessageMapper.SUPPORT_PHONE,
            retryable: true
        },
        'CONNECTION_REFUSED': {
            userMessage: 'ไม่สามารถเชื่อมต่อกับระบบได้',
            nextSteps: [
                'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
                'ลองใหม่อีกครั้งในอีกสักครู่',
                `หากปัญหายังคงอยู่ โทร ${ErrorMessageMapper.SUPPORT_PHONE}`
            ],
            supportContact: ErrorMessageMapper.SUPPORT_PHONE,
            retryable: true
        },

        // ==================== Server Errors ====================
        'INTERNAL_ERROR': {
            userMessage: 'ระบบขัดข้องชั่วคราว',
            nextSteps: [
                'กรุณาลองใหม่อีกครั้ง',
                'หากปัญหายังคงอยู่ กรุณาติดต่อเจ้าหน้าที่',
                `โทร ${ErrorMessageMapper.SUPPORT_PHONE} หรืออีเมล ${ErrorMessageMapper.SUPPORT_EMAIL}`
            ],
            supportContact: `${ErrorMessageMapper.SUPPORT_PHONE} หรือ ${ErrorMessageMapper.SUPPORT_EMAIL}`,
            retryable: true
        },
        'DATABASE_ERROR': {
            userMessage: 'ไม่สามารถบันทึกข้อมูลได้',
            nextSteps: [
                'กรุณาลองใหม่อีกครั้ง',
                'หากปัญหายังคงอยู่ กรุณาติดต่อเจ้าหน้าที่',
                `โทร ${ErrorMessageMapper.SUPPORT_PHONE}`
            ],
            supportContact: ErrorMessageMapper.SUPPORT_PHONE,
            retryable: true
        },
        'SERVICE_UNAVAILABLE': {
            userMessage: 'ระบบไม่พร้อมให้บริการชั่วคราว',
            nextSteps: [
                'กรุณาลองใหม่ในอีกสักครู่',
                'ระบบอาจอยู่ระหว่างการบำรุงรักษา',
                `หากต้องการความช่วยเหลือเร่งด่วน โทร ${ErrorMessageMapper.SUPPORT_PHONE}`
            ],
            supportContact: ErrorMessageMapper.SUPPORT_PHONE,
            retryable: true
        },

        // ==================== Rate Limiting ====================
        'RATE_LIMIT_EXCEEDED': {
            userMessage: 'คุณทำรายการบ่อยเกินไป',
            nextSteps: [
                'กรุณารอสักครู่แล้วลองใหม่',
                'ระบบจะพร้อมใช้งานอีกครั้งในอีก 1-2 นาที'
            ],
            retryable: true
        },

        // ==================== Loan Business Logic Errors ====================
        'BUDGET_EXCEEDED': {
            userMessage: 'งบประมาณสินเชื่อไม่เพียงพอ',
            nextSteps: [
                'ติดต่อผู้จัดการสาขาเพื่อตรวจสอบงบประมาณ',
                'เลือกสินเชื่อประเภทอื่นที่มีงบประมาณเพียงพอ',
                'ลดจำนวนเงินกู้ให้อยู่ในงบประมาณที่เหลือ',
                `โทร ${ErrorMessageMapper.SUPPORT_PHONE} เพื่อขอคำแนะนำ`
            ],
            supportContact: ErrorMessageMapper.SUPPORT_PHONE,
            retryable: false
        },
        'CUSTOMER_BLACKLISTED': {
            userMessage: 'ไม่สามารถสร้างสินเชื่อให้ลูกค้ารายนี้ได้',
            nextSteps: [
                'ลูกค้ารายนี้อยู่ในบัญชีดำ',
                'ติดต่อผู้จัดการสาขาเพื่อตรวจสอบสถานะลูกค้า',
                `โทร ${ErrorMessageMapper.SUPPORT_PHONE} เพื่อขอข้อมูลเพิ่มเติม`
            ],
            supportContact: ErrorMessageMapper.SUPPORT_PHONE,
            retryable: false
        },
        'DUPLICATE_LOAN_APPLICATION': {
            userMessage: 'ลูกค้ารายนี้มีคำขอสินเชื่อที่รออนุมัติอยู่แล้ว',
            nextSteps: [
                'ตรวจสอบคำขอสินเชื่อที่มีอยู่ในระบบ',
                'รอให้คำขอเดิมได้รับการอนุมัติหรือปฏิเสธก่อน',
                'หากต้องการแก้ไขคำขอเดิม ให้เลือก "แก้ไข" แทน',
                'หากต้องการยกเลิกคำขอเดิม ติดต่อผู้จัดการสาขา'
            ],
            retryable: false,
            // Will be populated with existingLoanId in controller
        },
        'MANAGER_APPROVAL_LIMIT_EXCEEDED': {
            userMessage: 'วงเงินคำขอสินเชื่อเกินสิทธิ์อนุมัติของหัวหน้าสาขา (ไม่เกิน 15,000,000 บาท)',
            nextSteps: [
                'แจ้งผู้ดูแลระบบ (Admin) ให้เข้ามาอนุมัติคำขอนี้',
                'ส่งเลขที่คำขอ/เลขที่สัญญา และวงเงินให้ Admin เพื่อความรวดเร็ว',
                'รอ Admin อนุมัติ แล้วกลับมาดูสถานะอีกครั้ง'
            ],
            retryable: false
        },
    };

    /**
     * แปล Error Code และ Technical Message เป็นภาษาที่เข้าใจง่าย
     */
    static map(errorCode: string | undefined, originalMessage: string): UserFriendlyError {
        // ลองหา Error Code ก่อน
        if (errorCode && this.errorMap[errorCode]) {
            const mapped = this.errorMap[errorCode];
            return {
                ...mapped,
                technicalMessage: originalMessage,
                referenceId: this.generateReferenceId()
            };
        }

        // ลองจับคำสำคัญใน Message
        const messageKeywords = this.detectErrorKeywords(originalMessage);
        if (messageKeywords && this.errorMap[messageKeywords]) {
            const mapped = this.errorMap[messageKeywords];
            return {
                ...mapped,
                technicalMessage: originalMessage,
                referenceId: this.generateReferenceId()
            };
        }

        // Default fallback
        return {
            userMessage: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
            technicalMessage: originalMessage,
            nextSteps: [
                'ลองใหม่อีกครั้ง',
                'หากปัญหายังคงอยู่ กรุณาติดต่อเจ้าหน้าที่',
                `โทร ${this.SUPPORT_PHONE} หรืออีเมล ${this.SUPPORT_EMAIL}`
            ],
            supportContact: `${this.SUPPORT_PHONE} หรือ ${this.SUPPORT_EMAIL}`,
            referenceId: this.generateReferenceId(),
            retryable: true
        };
    }

    /**
     * ตรวจจับคำสำคัญใน Error Message
     */
    private static detectErrorKeywords(message: string): string | null {
        const lowerMessage = message.toLowerCase();

        // Network errors
        if (lowerMessage.includes('econnrefused') || lowerMessage.includes('connection refused')) {
            return 'CONNECTION_REFUSED';
        }
        if (lowerMessage.includes('etimedout') || lowerMessage.includes('timeout')) {
            return 'TIMEOUT';
        }
        if (lowerMessage.includes('network error')) {
            return 'NETWORK_ERROR';
        }

        // Auth errors
        if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
            return 'UNAUTHORIZED';
        }
        if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
            return 'INSUFFICIENT_PERMISSIONS';
        }
        if (lowerMessage.includes('session expired') || lowerMessage.includes('token invalid')) {
            return 'SESSION_EXPIRED';
        }

        // Validation errors
        if (lowerMessage.includes('validation') || lowerMessage.includes('invalid')) {
            return 'VALIDATION_ERROR';
        }
        if (lowerMessage.includes('required')) {
            return 'REQUIRED_FIELD';
        }

        // Business logic errors
        if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
            return 'NOT_FOUND';
        }
        if (lowerMessage.includes('duplicate') || lowerMessage.includes('already exists')) {
            return 'DUPLICATE_ENTRY';
        }
        if (lowerMessage.includes('branch id')) {
            return 'BRANCH_ID_REQUIRED';
        }

        // Concurrency errors
        if (lowerMessage.includes('concurrent') || lowerMessage.includes('optimistic lock')) {
            return 'CONCURRENT_MODIFICATION';
        }

        // Server errors
        if (lowerMessage.includes('internal') || lowerMessage.includes('500')) {
            return 'INTERNAL_ERROR';
        }
        if (lowerMessage.includes('database')) {
            return 'DATABASE_ERROR';
        }
        if (lowerMessage.includes('service unavailable') || lowerMessage.includes('503')) {
            return 'SERVICE_UNAVAILABLE';
        }

        // Rate limiting
        if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
            return 'RATE_LIMIT_EXCEEDED';
        }

        return null;
    }

    /**
     * สร้าง Reference ID สำหรับติดต่อ Support
     */
    private static generateReferenceId(): string {
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
        const random = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `ERR-${timestamp}-${random}`;
    }
}
