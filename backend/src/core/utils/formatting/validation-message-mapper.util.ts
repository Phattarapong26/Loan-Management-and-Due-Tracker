/**
 * Validation Message Mapper - แปล Validation Errors เป็นภาษาไทยที่เข้าใจง่าย
 * พร้อม Hints และ Examples
 */

export interface ValidationMessage {
    message: string;      // ข้อความ Error
    hint: string;         // คำแนะนำการกรอก
    example: string;      // ตัวอย่างที่ถูกต้อง
}

/**
 * Validation Messages สำหรับ Fields ต่างๆ
 */
export const validationMessages = {
    // ==================== Thai ID ====================
    thaiId: {
        required: {
            message: 'กรุณากรอกเลขบัตรประชาชน',
            hint: 'เลขบัตรประชาชนเป็นข้อมูลที่จำเป็น',
            example: '1234567890123'
        },
        invalid: {
            message: 'เลขบัตรประชาชนไม่ถูกต้อง',
            hint: 'กรุณากรอกเลขบัตรประชาชน 13 หลัก (ตัวเลขเท่านั้น)',
            example: '1234567890123'
        },
        checksum: {
            message: 'เลขบัตรประชาชนไม่ถูกต้อง',
            hint: 'กรุณาตรวจสอบเลขบัตรประชาชนอีกครั้ง',
            example: '1234567890123'
        }
    },

    // ==================== Tax ID ====================
    taxId: {
        required: {
            message: 'กรุณากรอกเลขประจำตัวผู้เสียภาษี',
            hint: 'เลขประจำตัวผู้เสียภาษีเป็นข้อมูลที่จำเป็น',
            example: '0123456789012'
        },
        invalid: {
            message: 'เลขประจำตัวผู้เสียภาษีไม่ถูกต้อง',
            hint: 'กรุณากรอกเลขประจำตัวผู้เสียภาษี 13 หลัก (ตัวเลขเท่านั้น)',
            example: '0123456789012'
        },
        length: {
            message: 'เลขประจำตัวผู้เสียภาษีต้องเป็น 13 หลัก',
            hint: 'กรุณากรอกให้ครบ 13 หลัก',
            example: '0123456789012'
        }
    },

    // ==================== Phone Number ====================
    phone: {
        required: {
            message: 'กรุณากรอกเบอร์โทรศัพท์',
            hint: 'เบอร์โทรศัพท์เป็นข้อมูลที่จำเป็น',
            example: '0812345678'
        },
        invalid: {
            message: 'เบอร์โทรศัพท์ไม่ถูกต้อง',
            hint: 'กรุณากรอกเบอร์โทรศัพท์ 10 หลัก เริ่มต้นด้วย 0 (ตัวเลขเท่านั้น)',
            example: '0812345678'
        },
        length: {
            message: 'เบอร์โทรศัพท์ต้องเป็น 10 หลัก',
            hint: 'กรุณากรอกให้ครบ 10 หลัก เริ่มต้นด้วย 0',
            example: '0812345678'
        },
        format: {
            message: 'เบอร์โทรศัพท์ต้องเริ่มต้นด้วย 0',
            hint: 'เบอร์โทรศัพท์ในประเทศไทยเริ่มต้นด้วย 0',
            example: '0812345678'
        }
    },

    // ==================== Email ====================
    email: {
        required: {
            message: 'กรุณากรอกอีเมล',
            hint: 'อีเมลเป็นข้อมูลที่จำเป็น',
            example: 'example@email.com'
        },
        invalid: {
            message: 'อีเมลไม่ถูกต้อง',
            hint: 'กรุณากรอกอีเมลในรูปแบบที่ถูกต้อง',
            example: 'example@email.com'
        },
        format: {
            message: 'รูปแบบอีเมลไม่ถูกต้อง',
            hint: 'อีเมลต้องมี @ และชื่อโดเมน',
            example: 'example@email.com'
        }
    },

    // ==================== Business Name ====================
    businessName: {
        required: {
            message: 'กรุณากรอกชื่อธุรกิจ',
            hint: 'ชื่อธุรกิจเป็นข้อมูลที่จำเป็น',
            example: 'ร้านค้าตัวอย่าง'
        },
        tooShort: {
            message: 'ชื่อธุรกิจสั้นเกินไป',
            hint: 'กรุณากรอกชื่อธุรกิจอย่างน้อย 2 ตัวอักษร',
            example: 'ร้านค้าตัวอย่าง'
        },
        tooLong: {
            message: 'ชื่อธุรกิจยาวเกินไป',
            hint: 'ชื่อธุรกิจต้องไม่เกิน 255 ตัวอักษร',
            example: 'ร้านค้าตัวอย่าง'
        }
    },

    // ==================== Address ====================
    address: {
        required: {
            message: 'กรุณากรอกที่อยู่',
            hint: 'ที่อยู่เป็นข้อมูลที่จำเป็น',
            example: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110'
        },
        tooShort: {
            message: 'ที่อยู่สั้นเกินไป',
            hint: 'กรุณากรอกที่อยู่ให้ครบถ้วน',
            example: '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110'
        }
    },

    // ==================== Amount ====================
    amount: {
        required: {
            message: 'กรุณากรอกจำนวนเงิน',
            hint: 'จำนวนเงินเป็นข้อมูลที่จำเป็น',
            example: '100000'
        },
        invalid: {
            message: 'จำนวนเงินไม่ถูกต้อง',
            hint: 'กรุณากรอกตัวเลขเท่านั้น',
            example: '100000'
        },
        tooLow: {
            message: 'จำนวนเงินต้องมากกว่า 0',
            hint: 'กรุณากรอกจำนวนเงินที่มากกว่า 0',
            example: '100000'
        },
        tooHigh: {
            message: 'จำนวนเงินสูงเกินไป',
            hint: 'กรุณาตรวจสอบจำนวนเงินอีกครั้ง',
            example: '100000'
        }
    },

    // ==================== Interest Rate ====================
    interestRate: {
        required: {
            message: 'กรุณากรอกอัตราดอกเบี้ย',
            hint: 'อัตราดอกเบี้ยเป็นข้อมูลที่จำเป็น',
            example: '8.5'
        },
        invalid: {
            message: 'อัตราดอกเบี้ยไม่ถูกต้อง',
            hint: 'กรุณากรอกตัวเลขเท่านั้น',
            example: '8.5'
        },
        outOfRange: {
            message: 'อัตราดอกเบี้ยต้องอยู่ระหว่าง 0-100',
            hint: 'กรุณากรอกอัตราดอกเบี้ยระหว่าง 0-100',
            example: '8.5'
        }
    },

    // ==================== Term (Duration) ====================
    term: {
        required: {
            message: 'กรุณากรอกระยะเวลา',
            hint: 'ระยะเวลาเป็นข้อมูลที่จำเป็น',
            example: '12'
        },
        invalid: {
            message: 'ระยะเวลาไม่ถูกต้อง',
            hint: 'กรุณากรอกตัวเลขเท่านั้น (หน่วยเป็นเดือน)',
            example: '12'
        },
        tooShort: {
            message: 'ระยะเวลาสั้นเกินไป',
            hint: 'ระยะเวลาต้องอย่างน้อย 1 เดือน',
            example: '12'
        },
        tooLong: {
            message: 'ระยะเวลายาวเกินไป',
            hint: 'ระยะเวลาต้องไม่เกิน 360 เดือน (30 ปี)',
            example: '12'
        }
    },

    // ==================== Date ====================
    date: {
        required: {
            message: 'กรุณาเลือกวันที่',
            hint: 'วันที่เป็นข้อมูลที่จำเป็น',
            example: '2024-12-31'
        },
        invalid: {
            message: 'วันที่ไม่ถูกต้อง',
            hint: 'กรุณาเลือกวันที่ในรูปแบบที่ถูกต้อง',
            example: '2024-12-31'
        },
        pastDate: {
            message: 'ไม่สามารถเลือกวันที่ในอดีตได้',
            hint: 'กรุณาเลือกวันที่ในอนาคต',
            example: '2024-12-31'
        },
        futureDate: {
            message: 'ไม่สามารถเลือกวันที่ในอนาคตได้',
            hint: 'กรุณาเลือกวันที่ในอดีตหรือวันนี้',
            example: '2024-12-31'
        }
    },

    // ==================== Password ====================
    password: {
        required: {
            message: 'กรุณากรอกรหัสผ่าน',
            hint: 'รหัสผ่านเป็นข้อมูลที่จำเป็น',
            example: 'Password123!'
        },
        tooShort: {
            message: 'รหัสผ่านสั้นเกินไป',
            hint: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
            example: 'Password123!'
        },
        tooWeak: {
            message: 'รหัสผ่านไม่ปลอดภัย',
            hint: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักขระพิเศษ',
            example: 'Password123!'
        },
        mismatch: {
            message: 'รหัสผ่านไม่ตรงกัน',
            hint: 'กรุณากรอกรหัสผ่านให้ตรงกันทั้งสองช่อง',
            example: 'Password123!'
        }
    },

    // ==================== Generic ====================
    generic: {
        required: {
            message: 'กรุณากรอกข้อมูล',
            hint: 'ข้อมูลนี้เป็นข้อมูลที่จำเป็น',
            example: ''
        },
        invalid: {
            message: 'ข้อมูลไม่ถูกต้อง',
            hint: 'กรุณาตรวจสอบข้อมูลที่กรอก',
            example: ''
        }
    }
};

/**
 * Helper function สำหรับสร้าง Zod error message พร้อม metadata
 */
export function createValidationMessage(
    field: keyof typeof validationMessages,
    type: string
): { message: string; params: { hint: string; example: string } } {
    const fieldMessages = validationMessages[field] as any;
    const messageData = fieldMessages[type] || validationMessages.generic.invalid;

    return {
        message: messageData.message,
        params: {
            hint: messageData.hint,
            example: messageData.example
        }
    };
}
