import { z } from 'zod';

/**
 * Enhanced Document Model - รองรับเอกสารสินเชื่อแบบละเอียด
 */

// Document type enum - เพิ่มประเภทใหม่
export const enhancedDocumentTypeSchema = z.enum([
  'LOAN_APPLICATION',    // ไฟล์สินเชื่อแบบครบชุด (12 sheets)
  'FINANCIAL',           // งบการเงินเดี่ยว
  'TAX_DOC',            // ภ.พ.30
  'BANK_STATEMENT',     // Statement ธนาคาร
  'CREDIT_BUREAU',      // เครดิตบูโร
  'DSCR_ANALYSIS',      // การวิเคราะห์ DSCR
  'ID_CARD',            // บัตรประชาชน
  'HOUSE_REGISTRATION', // ทะเบียนบ้าน
  'COLLATERAL',         // หลักประกัน
  'OTHER'               // อื่นๆ
]);

export type EnhancedDocumentType = z.infer<typeof enhancedDocumentTypeSchema>;

// Sheet configuration สำหรับเอกสารแต่ละประเภท
export interface SheetConfig {
  name: string;
  thaiName: string;
  required: boolean;
  description: string;
  expectedFields: string[];
  validationRules?: ValidationRule[];
  dataExtractionRules?: DataExtractionRule[];
}

export interface ValidationRule {
  name: string;
  description: string;
  validate: (data: any) => ValidationResult;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

export interface DataExtractionRule {
  field: string;
  description: string;
  extractionPattern?: RegExp;
  excelReference?: string; // เช่น 'รายละเอียด!A1', 'งบการเงิน!D5'
  dataType: 'NUMBER' | 'TEXT' | 'DATE' | 'PERCENTAGE' | 'BOOLEAN';
  required: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
  };
}

export interface ValidationResult {
  valid: boolean;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  details?: any;
  suggestions?: string[];
}

export interface DataField {
  name: string;
  thaiName: string;
  value: any;
  source: string; // ชื่อ sheet และ cell
  confidence: number; // ความมั่นใจในการสกัดข้อมูล (0-100)
  validated: boolean;
  validationNotes?: string[];
}

export interface ExtractedSheetData {
  sheetName: string;
  thaiName: string;
  extractedFields: DataField[];
  validationResults: ValidationResult[];
  completenessScore: number; // 0-100
}

// Document Type Configuration
export interface DocumentTypeConfig {
  id: EnhancedDocumentType;
  label: string;
  description: string;
  supportedFormats: string[];
  expectedSheets?: SheetConfig[];
  aiCapabilities: string[];
  sampleFiles?: string[];
  validationRules?: ValidationRule[];
  maskingRules?: MaskingRule[];
  dataMappings?: {
    [key: string]: string; // Map field to business concept
  };
  completenessThreshold: number; // เกณฑ์ความครบถ้วนต่ำสุด (%)
}

export interface MaskingRule {
  field: string;
  pattern: RegExp;
  maskType: 'FULL' | 'PARTIAL' | 'HASH';
  category: 'PII' | 'FINANCIAL' | 'BUSINESS';
  maskCharacter?: string;
  preserveLength?: boolean;
}

// Business Analysis Models
export interface FinancialAnalysis {
  revenue: {
    year2566: number;
    year2567: number;
    growthRate: number;
    monthlyAverage: number;
  };
  profitability: {
    grossProfit: number;
    netProfit: number;
    profitMargin: number;
    ebitda: number;
  };
  liquidity: {
    currentRatio: number;
    quickRatio: number;
    cashPosition: number;
  };
  leverage: {
    debtToEquity: number;
    debtRatio: number;
    interestCoverage: number;
  };
}

export interface CreditAnalysis {
  totalCreditLines: number;
  totalOutstanding: number;
  utilizationRate: number;
  creditStatus: 'GOOD' | 'FAIR' | 'POOR';
  paymentHistory: {
    onTimePayments: number;
    latePayments: number;
    defaults: number;
  };
}

export interface LoanApplicationData {
  // Basic Information
  companyName: string;
  taxId: string;
  businessType: string;
  location: string;
  phone: string;
  
  // Loan Details
  loanPurpose: string;
  requestedAmount: number;
  interestRate: string;
  loanTerm: number;
  collateral: string[];
  guarantors: string[];
  
  // Financial Information
  financials: FinancialAnalysis;
  creditInfo: CreditAnalysis;
  
  // Supporting Data
  dscrScore: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
  cashFlow: number;
  
  // Document Status
  documentCompleteness: number;
  validationResults: ValidationResult[];
  missingDocuments: string[];
  
  // Metadata
  extractedSheets: ExtractedSheetData[];
  extractionDate: Date;
  confidenceScore: number;
}

// Loan Application Document Configuration (12 sheets)
export const LOAN_APPLICATION_CONFIG: DocumentTypeConfig = {
  id: 'LOAN_APPLICATION',
  label: 'เอกสารขออนุมัติสินเชื่อ (ครบชุด)',
  description: 'ไฟล์ Excel ที่มีข้อมูลครบถ้วนสำหรับการพิจารณาสินเชื่อตามมาตรฐานธนาคาร',
  supportedFormats: ['.xlsx', '.xls'],
  completenessThreshold: 80,
  
  expectedSheets: [
    {
      name: 'รายละเอียด',
      thaiName: 'รายละเอียด',
      required: true,
      description: 'ฟอร์มหลักขออนุมัติสินเชื่อ',
      expectedFields: [
        'ชื่อโครงการ',
        'ประเภทสินเชื่อ',
        'วงเงินขอกู้',
        'อัตราดอกเบี้ย',
        'ระยะเวลา',
        'หลักประกัน',
        'ผู้ค้ำประกัน',
        'ชื่อลูกค้า',
        'วันที่เสนอ',
        'ผู้นำเสนอ',
        'ผู้อนุมัติ'
      ],
      validationRules: [
        {
          name: 'loan_amount_validation',
          description: 'ตรวจสอบวงเงินขอกู้ไม่เกิน 5 ล้านบาท',
          validate: (data) => {
            const loanAmount = data.วงเงินขอกู้;
            if (loanAmount > 5000000) {
              return {
                valid: false,
                message: 'วงเงินขอกู้เกิน 5 ล้านบาท ต้องใช้กระบวนการพิจารณาพิเศษ',
                severity: 'WARNING',
                suggestions: ['ตรวจสอบเอกสารเพิ่มเติม', 'ขออนุมัติจากผู้จัดการระดับสูง']
              };
            }
            return {
              valid: true,
              message: 'วงเงินอยู่ในเกณฑ์ปกติ',
              severity: 'INFO'
            };
          },
          severity: 'WARNING'
        }
      ],
      dataExtractionRules: [
        {
          field: 'ชื่อลูกค้า',
          description: 'ชื่อบริษัทหรือบุคคล',
          excelReference: 'รายละเอียด!T1',
          dataType: 'TEXT',
          required: true,
          validation: {
            pattern: /^[ก-๙\s]+$/
          }
        },
        {
          field: 'วงเงินขอกู้',
          description: 'วงเงินสินเชื่อที่ขอ',
          excelReference: 'รายละเอียด!M11',
          dataType: 'NUMBER',
          required: true,
          validation: {
            min: 0,
            max: 5000000
          }
        }
      ]
    },
    {
      name: 'ใบสรุปวงเงิน',
      thaiName: 'ใบสรุปวงเงิน',
      required: true,
      description: 'สรุปวงเงินสินเชื่อปัจจุบันและที่ขอเพิ่ม',
      expectedFields: ['วงเงินรวม', 'วงเงินคงเหลือ', 'วงเงินขอเพิ่ม', 'อัตราดอกเบี้ย', 'สถานะ'],
      dataExtractionRules: [
        {
          field: 'วงเงินรวม',
          description: 'วงเงินสินเชื่อทั้งหมด',
          excelReference: 'ใบสรุปวงเงิน!E25',
          dataType: 'NUMBER',
          required: true
        },
        {
          field: 'อัตราดอกเบี้ย',
          description: 'อัตราดอกเบี้ยสินเชื่อ',
          excelReference: 'ใบสรุปวงเงิน!G13',
          dataType: 'TEXT',
          required: true
        }
      ]
    },
    {
      name: 'ภพ 30',
      thaiName: 'ภ.พ.30',
      required: true,
      description: 'ข้อมูลภาษีมูลค่าเพิ่ม ย้อนหลัง 12 เดือน',
      expectedFields: ['ยอดขาย', 'ภาษีขาย', 'ภาษีซื้อ', 'เดือน', 'รายได้เฉลี่ย/เดือน'],
      dataExtractionRules: [
        {
          field: 'รายได้เฉลี่ยต่อเดือน',
          description: 'รายได้เฉลี่ยต่อเดือนจากภพ30',
          excelReference: 'ภพ 30!C18',
          dataType: 'NUMBER',
          required: true
        },
        {
          field: 'ยอดขายรวมปีล่าสุด',
          description: 'ยอดขายรวม 12 เดือน',
          excelReference: 'ภพ 30!C17',
          dataType: 'NUMBER',
          required: true
        }
      ]
    },
    {
      name: 'โครงสร้าง',
      thaiName: 'โครงสร้างการลงทุน',
      required: true,
      description: 'โครงสร้างการลงทุนและผู้ถือหุ้น',
      expectedFields: ['ผู้ถือหุ้น', 'สัดส่วน', 'มูลค่า', 'ทุนจดทะเบียน', 'ที่ดิน', 'เครื่องจักร'],
      dataExtractionRules: [
        {
          field: 'ทุนจดทะเบียน',
          description: 'ทุนจดทะเบียนบริษัท',
          excelReference: 'โครงสร้าง!D4',
          dataType: 'NUMBER',
          required: true
        },
        {
          field: 'ผู้ถือหุ้นหลัก',
          description: 'ชื่อผู้ถือหุ้นและสัดส่วน',
          excelReference: 'โครงสร้าง!C38',
          dataType: 'TEXT',
          required: true
        }
      ]
    },
    {
      name: 'งบการเงิน',
      thaiName: 'งบการเงิน',
      required: true,
      description: 'งบการเงินบริษัท 3 ปีย้อนหลัง',
      expectedFields: ['สินทรัพย์', 'หนี้สิน', 'ส่วนของผู้ถือหุ้น', 'รายได้', 'กำไร', 'ค่าใช้จ่าย'],
      dataExtractionRules: [
        {
          field: 'รายได้ปีล่าสุด',
          description: 'รายได้รวมปีล่าสุด',
          excelReference: 'งบการเงิน!F11',
          dataType: 'NUMBER',
          required: true
        },
        {
          field: 'กำไรสุทธิปีล่าสุด',
          description: 'กำไรสุทธิปีล่าสุด',
          excelReference: 'งบการเงิน!F21',
          dataType: 'NUMBER',
          required: true
        },
        {
          field: 'สินทรัพย์รวม',
          description: 'สินทรัพย์รวมทั้งหมด',
          excelReference: 'งบการเงิน!F28',
          dataType: 'NUMBER',
          required: true
        }
      ]
    },
    {
      name: 'ความต้องการ',
      thaiName: 'ความต้องการเงินทุน',
      required: false,
      description: 'ความต้องการใช้เงินทุนหมุนเวียน',
      expectedFields: ['รายการ', 'จำนวนเงิน', 'ระยะเวลา', 'สัดส่วน'],
      dataExtractionRules: [
        {
          field: 'เงินทุนหมุนเวียนที่ต้องการ',
          description: 'ยอดเงินทุนหมุนเวียนที่ต้องการ',
          excelReference: 'ความต้องการ!F15',
          dataType: 'NUMBER',
          required: false
        }
      ]
    },
    {
      name: 'ประมาณการ',
      thaiName: 'ประมาณการรายได้',
      required: true,
      description: 'ประมาณการรายได้และความสามารถชำระหนี้ 3 ปี',
      expectedFields: ['รายได้', 'ค่าใช้จ่าย', 'กำไรสุทธิ', 'DSCR', 'EBITDA'],
      dataExtractionRules: [
        {
          field: 'DSCR',
          description: 'Debt Service Coverage Ratio',
          excelReference: 'ประมาณการ!L33',
          dataType: 'NUMBER',
          required: true,
          validation: {
            min: 1.2
          }
        },
        {
          field: 'ประมาณการรายได้ปีหน้า',
          description: 'ประมาณการรายได้ปีถัดไป',
          excelReference: 'ประมาณการ!L11',
          dataType: 'NUMBER',
          required: true
        }
      ]
    },
    {
      name: 'เครดิตบูโร',
      thaiName: 'เครดิตบูโร',
      required: true,
      description: 'ข้อมูลเครดิตบูโรจากระบบ TCC, NCB',
      expectedFields: ['ธนาคาร', 'ประเภท', 'วงเงิน', 'ยอดคงเหลือ', 'สถานะ', 'ยอดชำระ/เดือน'],
      dataExtractionRules: [
        {
          field: 'วงเงินรวมเครดิตบูโร',
          description: 'วงเงินสินเชื่อทั้งหมดจากเครดิตบูโร',
          excelReference: 'เครดิตบูโร!V26',
          dataType: 'NUMBER',
          required: true
        },
        {
          field: 'ยอดคงเหลือรวม',
          description: 'ยอดคงเหลือสินเชื่อทั้งหมด',
          excelReference: 'เครดิตบูโร!Z26',
          dataType: 'NUMBER',
          required: true
        }
      ]
    },
    {
      name: 'Statement',
      thaiName: 'Statement ธนาคาร',
      required: true,
      description: 'การเคลื่อนไหวทางบัญชี 6-12 เดือน',
      expectedFields: ['วันที่', 'รายการ', 'ถอน', 'ฝาก', 'คงเหลือ', 'หมุนเวียนเฉลี่ย'],
      dataExtractionRules: [
        {
          field: 'ยอดฝากเฉลี่ยต่อเดือน',
          description: 'ยอดเงินฝากเฉลี่ยต่อเดือน',
          excelReference: 'Statement!E23',
          dataType: 'NUMBER',
          required: true
        },
        {
          field: 'ยอดเงินคงเหลือเฉลี่ย',
          description: 'ยอดเงินคงเหลือเฉลี่ยในบัญชี',
          excelReference: 'Statement!F23',
          dataType: 'NUMBER',
          required: true
        }
      ]
    },
    {
      name: 'งบสรรพากร',
      thaiName: 'งบสรรพากร',
      required: false,
      description: 'ข้อมูลภาษีจากกรมสรรพากร',
      expectedFields: ['รายได้', 'ค่าใช้จ่าย', 'กำไร', 'ภาษี'],
      dataExtractionRules: [
        {
          field: 'รายได้สรรพากรปีล่าสุด',
          description: 'รายได้จากงบสรรพากร',
          excelReference: 'งบสรรพากร!H88',
          dataType: 'NUMBER',
          required: false
        }
      ]
    },
    {
      name: 'DSCR',
      thaiName: 'DSCR Analysis',
      required: true,
      description: 'การวิเคราะห์ความสามารถในการชำระหนี้รายเดือน',
      expectedFields: ['DSCR', 'รายได้', 'ค่าใช้จ่าย', 'ภาระหนี้', 'คงเหลือ'],
      dataExtractionRules: [
        {
          field: 'DSCR_Score',
          description: 'คะแนน DSCR',
          excelReference: 'DSCR!R23',
          dataType: 'NUMBER',
          required: true,
          validation: {
            min: 1.25
          }
        }
      ]
    },
    {
      name: 'ความเห็น',
      thaiName: 'ความเห็นการอนุมัติ',
      required: false,
      description: 'ความเห็นการอนุมัติสินเชื่อจากเจ้าหน้าที่',
      expectedFields: ['ความเห็น', 'ผู้พิจารณา', 'ข้อเสนอแนะ', 'เงื่อนไข'],
      dataExtractionRules: [
        {
          field: 'ความเห็นสรุป',
          description: 'ความเห็นสรุปจากเจ้าหน้าที่',
          excelReference: 'ความเห็น!C1',
          dataType: 'TEXT',
          required: false
        }
      ]
    }
  ],
  
  aiCapabilities: [
    'สกัดข้อมูลจากทุก sheet อัตโนมัติ',
    'วิเคราะห์ความสอดคล้องระหว่าง sheets',
    'คำนวณอัตราส่วนทางการเงิน (Current Ratio, Debt/Equity, ROA, ROE)',
    'ตรวจสอบความครบถ้วนของเอกสาร',
    'วิเคราะห์ DSCR และความสามารถชำระหนี้',
    'ตรวจจับข้อมูลที่ขัดแย้งกัน',
    'ตรวจสอบความถูกต้องของสูตรใน Excel',
    'วิเคราะห์แนวโน้มรายได้จากย้อนหลัง',
    'คำนวณความเสี่ยงเครดิต',
    'ตรวจสอบความสอดคล้องของหลักประกัน'
  ],
  
  sampleFiles: ['loan_application_template.xlsx'],
  
  maskingRules: [
    {
      field: 'companyName',
      pattern: /บริษัท\s+([ก-๙\s]+(?:\sจำกัด)?)/g,
      maskType: 'PARTIAL',
      category: 'BUSINESS',
      maskCharacter: '*',
      preserveLength: true
    },
    {
      field: 'taxId',
      pattern: /\b(\d{13})\b/g,
      maskType: 'PARTIAL',
      category: 'BUSINESS',
      maskCharacter: '*'
    },
    {
      field: 'shareholderName',
      pattern: /([ก-๙]{2,})\s+([ก-๙]{2,})/g,
      maskType: 'PARTIAL',
      category: 'PII',
      maskCharacter: '*'
    },
    {
      field: 'phoneNumber',
      pattern: /\b(0[689]\d{1}-\d{3,4}-\d{3,4})\b/g,
      maskType: 'PARTIAL',
      category: 'PII',
      maskCharacter: '*'
    },
    {
      field: 'citizenId',
      pattern: /\b(\d{13})\b/g,
      maskType: 'PARTIAL',
      category: 'PII',
      maskCharacter: '*'
    }
  ],
  
  dataMappings: {
    'รายได้ปีล่าสุด': 'revenue.latestYear',
    'กำไรสุทธิ': 'profitability.netProfit',
    'วงเงินขอกู้': 'loan.requestedAmount',
    'DSCR': 'loan.dscrScore',
    'สินทรัพย์รวม': 'financials.totalAssets',
    'หนี้สินรวม': 'financials.totalLiabilities',
    'ยอดขายเฉลี่ย/เดือน': 'revenue.monthlyAverage',
    'วงเงินเครดิตรวม': 'credit.totalCreditLines',
    'ยอดคงเหลือสินเชื่อ': 'credit.totalOutstanding'
  },
  
  validationRules: [
    {
      name: 'consistency_check',
      description: 'ตรวจสอบความสอดคล้องของข้อมูลระหว่าง sheets',
      validate: (extractedData: any): ValidationResult => {
        const revenueFromFinancial = extractedData?.financials?.revenue;
        const revenueFromTax = extractedData?.tax?.revenue;
        
        if (revenueFromFinancial && revenueFromTax) {
          const difference = Math.abs(revenueFromFinancial - revenueFromTax);
          const percentageDiff = (difference / revenueFromFinancial) * 100;
          
          if (percentageDiff > 15) {
            return {
              valid: false,
              message: `รายได้จากงบการเงิน (${revenueFromFinancial}) และภพ30 (${revenueFromTax}) แตกต่างกัน ${percentageDiff.toFixed(1)}%`,
              severity: 'WARNING',
              details: { financial: revenueFromFinancial, tax: revenueFromTax, diff: percentageDiff }
            };
          }
        }
        
        return {
          valid: true,
          message: 'ข้อมูลมีความสอดคล้องกัน',
          severity: 'INFO'
        };
      },
      severity: 'WARNING'
    }
  ]
};

// All Document Type Configurations
export const ENHANCED_DOCUMENT_TYPES: Record<string, DocumentTypeConfig> = {
  LOAN_APPLICATION: LOAN_APPLICATION_CONFIG,
  
  FINANCIAL: {
    id: 'FINANCIAL',
    label: 'งบการเงิน',
    description: 'งบดุล, งบกำไรขาดทุน, งบกระแสเงินสด',
    supportedFormats: ['.xlsx', '.xls', '.pdf'],
    completenessThreshold: 90,
    expectedSheets: [
      {
        name: 'งบดุล',
        thaiName: 'งบดุล',
        required: true,
        description: 'งบแสดงฐานะการเงิน',
        expectedFields: ['สินทรัพย์', 'หนี้สิน', 'ส่วนของผู้ถือหุ้น', 'สินทรัพย์หมุนเวียน', 'สินทรัพย์ไม่หมุนเวียน']
      },
      {
        name: 'งบกำไรขาดทุน',
        thaiName: 'งบกำไรขาดทุน',
        required: true,
        description: 'งบแสดงผลการดำเนินงาน',
        expectedFields: ['รายได้', 'ค่าใช้จ่าย', 'กำไร', 'EBITDA', 'ภาษี']
      }
    ],
    aiCapabilities: [
      'วิเคราะห์งบดุล',
      'คำนวณอัตราส่วนทางการเงิน',
      'ตรวจสอบความสมดุล (Assets = Liabilities + Equity)',
      'วิเคราะห์โครงสร้างเงินทุน',
      'คำนวณอัตราการเติบโต'
    ],
    maskingRules: [],
    dataMappings: {
      'สินทรัพย์รวม': 'totalAssets',
      'หนี้สินรวม': 'totalLiabilities',
      'ส่วนของผู้ถือหุ้น': 'equity',
      'รายได้รวม': 'totalRevenue',
      'กำไรสุทธิ': 'netProfit'
    }
  },

  TAX_DOC: {
    id: 'TAX_DOC',
    label: 'เอกสารภาษี (ภ.พ.30)',
    description: 'รายงานภาษีมูลค่าเพิ่ม แสดงยอดขายรายเดือน',
    supportedFormats: ['.pdf', '.xlsx', '.xls'],
    completenessThreshold: 85,
    aiCapabilities: [
      'สกัดยอดขายรายเดือน',
      'คำนวณยอดขายรายปี',
      'วิเคราะห์แนวโน้มยอดขาย',
      'ตรวจจับ seasonal pattern',
      'คำนวณอัตราการเติบโตรายเดือน'
    ],
    maskingRules: [
      {
        field: 'taxId',
        pattern: /\b(\d{13})\b/g,
        maskType: 'PARTIAL',
        category: 'BUSINESS',
        maskCharacter: '*'
      }
    ],
    dataMappings: {
      'ยอดขายรวม': 'totalSales',
      'รายได้เฉลี่ย/เดือน': 'averageMonthlyRevenue',
      'ภาษีขาย': 'outputTax',
      'ภาษีซื้อ': 'inputTax'
    }
  },

  BANK_STATEMENT: {
    id: 'BANK_STATEMENT',
    label: 'Statement ธนาคาร',
    description: 'รายการเคลื่อนไหวบัญชีธนาคารย้อนหลัง 6-12 เดือน',
    supportedFormats: ['.pdf', '.xlsx', '.csv'],
    completenessThreshold: 95,
    aiCapabilities: [
      'วิเคราะห์กระแสเงินสด',
      'คำนวณยอดเงินเฉลี่ย',
      'ตรวจจับธุรกรรมผิดปกติ',
      'วิเคราะห์รูปแบบการถอน-ฝาก',
      'คำนวณอัตราการใช้เงินทุนหมุนเวียน'
    ],
    maskingRules: [
      {
        field: 'accountNumber',
        pattern: /\b(\d{3}-\d{3}-\d{3}-\d{1,2})\b/g,
        maskType: 'PARTIAL',
        category: 'FINANCIAL',
        maskCharacter: '*'
      },
      {
        field: 'customerName',
        pattern: /ชื่อบัญชี\s*:\s*([^\n]+)/g,
        maskType: 'PARTIAL',
        category: 'PII',
        maskCharacter: '*'
      }
    ],
    dataMappings: {
      'ยอดเงินเฉลี่ย': 'averageBalance',
      'ยอดฝากรวม': 'totalDeposits',
      'ยอดถอนรวม': 'totalWithdrawals',
      'จำนวนธุรกรรม/เดือน': 'transactionsPerMonth'
    }
  },

  CREDIT_BUREAU: {
    id: 'CREDIT_BUREAU',
    label: 'เครดิตบูโร',
    description: 'รายงานเครดิตบูโรจาก TCC, NCB, หรือบริษัทเครดิตบูโร',
    supportedFormats: ['.pdf', '.xlsx'],
    completenessThreshold: 100,
    aiCapabilities: [
      'สกัดข้อมูลบัญชีสินเชื่อ',
      'คำนวณวงเงินรวม',
      'วิเคราะห์ประวัติการชำระ',
      'ตรวจจับ NPL และหนี้เสีย',
      'คำนวณอัตราการใช้เครดิต (Utilization Rate)'
    ],
    maskingRules: [
      {
        field: 'citizenId',
        pattern: /\b(\d{13})\b/g,
        maskType: 'PARTIAL',
        category: 'PII',
        maskCharacter: '*'
      },
      {
        field: 'customerName',
        pattern: /ชื่อ-สกุล\s*:\s*([^\n]+)/g,
        maskType: 'PARTIAL',
        category: 'PII',
        maskCharacter: '*'
      }
    ],
    dataMappings: {
      'วงเงินรวม': 'totalCreditLimit',
      'ยอดคงเหลือรวม': 'totalOutstanding',
      'สถานะบัญชี': 'accountStatus',
      'ประวัติการชำระ': 'paymentHistory'
    }
  },

  DSCR_ANALYSIS: {
    id: 'DSCR_ANALYSIS',
    label: 'การวิเคราะห์ DSCR',
    description: 'Debt Service Coverage Ratio Analysis สำหรับการประเมินความสามารถในการชำระหนี้',
    supportedFormats: ['.xlsx', '.xls'],
    completenessThreshold: 80,
    aiCapabilities: [
      'คำนวณ DSCR',
      'วิเคราะห์ความสามารถชำระหนี้',
      'ประเมินความเสี่ยง',
      'คำนวณ Debt Service Capacity',
      'วิเคราะห์ Cash Flow Adequacy'
    ],
    maskingRules: [],
    dataMappings: {
      'DSCR': 'dscrScore',
      'รายได้ที่ใช้คำนวณ': 'incomeForDscr',
      'ภาระหนี้รวม': 'totalDebtService',
      'EBITDA': 'ebitda'
    }
  },

  ID_CARD: {
    id: 'ID_CARD',
    label: 'บัตรประชาชน',
    description: 'สำเนาบัตรประชาชนผู้กู้และผู้ค้ำประกัน',
    supportedFormats: ['.jpg', '.jpeg', '.png', '.pdf'],
    completenessThreshold: 100,
    aiCapabilities: [
      'OCR สกัดข้อมูลบัตรประชาชน',
      'ตรวจสอบความถูกต้องของเลขบัตร',
      'ตรวจสอบวันหมดอายุ',
      'ตรวจสอบความชัดเจนของภาพ'
    ],
    maskingRules: [
      {
        field: 'citizenId',
        pattern: /\b(\d{13})\b/g,
        maskType: 'PARTIAL',
        category: 'PII',
        maskCharacter: '*',
        preserveLength: true
      },
      {
        field: 'fullName',
        pattern: /ชื่อ-สกุล\s*:\s*([^\n]+)/g,
        maskType: 'PARTIAL',
        category: 'PII',
        maskCharacter: '*'
      }
    ],
    dataMappings: {
      'เลขบัตรประชาชน': 'citizenId',
      'ชื่อ-สกุล': 'fullName',
      'วันเกิด': 'birthDate',
      'วันหมดอายุ': 'expiryDate'
    }
  },

  HOUSE_REGISTRATION: {
    id: 'HOUSE_REGISTRATION',
    label: 'ทะเบียนบ้าน',
    description: 'สำเนาทะเบียนบ้านผู้กู้และผู้ค้ำประกัน',
    supportedFormats: ['.jpg', '.jpeg', '.png', '.pdf'],
    completenessThreshold: 100,
    aiCapabilities: [
      'OCR สกัดข้อมูลทะเบียนบ้าน',
      'ตรวจสอบที่อยู่',
      'ตรวจสอบความสัมพันธ์',
      'ตรวจสอบความชัดเจนของภาพ'
    ],
    maskingRules: [
      {
        field: 'houseNumber',
        pattern: /บ้านเลขที่\s*:\s*([^\n]+)/g,
        maskType: 'PARTIAL',
        category: 'PII',
        maskCharacter: '*'
      },
      {
        field: 'residentNames',
        pattern: /ชื่อ\s*:\s*([^\n]+)/g,
        maskType: 'PARTIAL',
        category: 'PII',
        maskCharacter: '*'
      }
    ],
    dataMappings: {
      'บ้านเลขที่': 'houseNumber',
      'หมู่ที่': 'villageNumber',
      'ตำบล': 'subdistrict',
      'อำเภอ': 'district',
      'จังหวัด': 'province'
    }
  },

  COLLATERAL: {
    id: 'COLLATERAL',
    label: 'หลักประกัน',
    description: 'เอกสารหลักประกัน เช่น โฉนดที่ดิน, สัญญาซื้อขายรถ, กรมธรรม์ประกันชีวิต',
    supportedFormats: ['.pdf', '.jpg', '.jpeg', '.png'],
    completenessThreshold: 100,
    aiCapabilities: [
      'OCR สกัดข้อมูลโฉนดที่ดิน',
      'ตรวจสอบเลขที่โฉนด',
      'ตรวจสอบพื้นที่ที่ดิน',
      'ตรวจสอบกรรมสิทธิ์',
      'คำนวณมูลค่าตามราคาประเมิน'
    ],
    maskingRules: [
      {
        field: 'landDeedNumber',
        pattern: /โฉนดเลขที่\s*:\s*([^\n]+)/g,
        maskType: 'PARTIAL',
        category: 'FINANCIAL',
        maskCharacter: '*'
      },
      {
        field: 'ownerName',
        pattern: /กรรมสิทธิ์\s*:\s*([^\n]+)/g,
        maskType: 'PARTIAL',
        category: 'PII',
        maskCharacter: '*'
      }
    ],
    dataMappings: {
      'เลขที่โฉนด': 'landDeedNumber',
      'เนื้อที่': 'landArea',
      'ตำบล': 'subdistrict',
      'อำเภอ': 'district',
      'จังหวัด': 'province',
      'กรรมสิทธิ์': 'ownership'
    }
  },

  OTHER: {
    id: 'OTHER',
    label: 'เอกสารอื่นๆ',
    description: 'เอกสารเพิ่มเติมที่เกี่ยวข้องกับการพิจารณาสินเชื่อ',
    supportedFormats: ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.xls', '.doc', '.docx'],
    completenessThreshold: 0,
    aiCapabilities: [
      'OCR สกัดข้อมูลทั่วไป',
      'ตรวจสอบประเภทเอกสาร',
      'จับคู่กับหมวดหมู่ที่เกี่ยวข้อง'
    ],
    maskingRules: [],
    dataMappings: {}
  }
};

// Utility Functions
export function getDocumentTypeConfig(type: EnhancedDocumentType): DocumentTypeConfig {
  const config = ENHANCED_DOCUMENT_TYPES[type];
  if (!config) {
    return ENHANCED_DOCUMENT_TYPES.OTHER as DocumentTypeConfig;
  }
  return config;
}

export function validateDocumentCompleteness(
  documentType: EnhancedDocumentType,
  extractedData: ExtractedSheetData[]
): ValidationResult {
  const config = getDocumentTypeConfig(documentType);
  if (!config.expectedSheets) {
    return {
      valid: true,
      message: 'ไม่มี expected sheets ที่ต้องตรวจสอบ',
      severity: 'INFO'
    };
  }

  const requiredSheets = config.expectedSheets.filter(sheet => sheet.required);
  const foundSheets = extractedData.map(sheet => sheet.sheetName);
  
  const missingSheets = requiredSheets.filter(
    sheet => !foundSheets.includes(sheet.name) && !foundSheets.includes(sheet.thaiName)
  );

  if (missingSheets.length > 0) {
    return {
      valid: false,
      message: `ขาดเอกสารที่จำเป็น: ${missingSheets.map(s => s.thaiName).join(', ')}`,
      severity: 'ERROR',
      details: {
        missingSheets: missingSheets.map(s => ({ name: s.name, thaiName: s.thaiName })),
        totalRequired: requiredSheets.length,
        found: foundSheets.length
      },
      suggestions: ['กรุณาแนบเอกสารที่ขาดให้ครบถ้วน']
    };
  }

  // Calculate completeness score
  let totalFields = 0;
  let foundFields = 0;
  
  config.expectedSheets?.forEach(sheet => {
    totalFields += sheet.expectedFields.length;
    const sheetData = extractedData.find(s => 
      s.sheetName === sheet.name || s.sheetName === sheet.thaiName
    );
    if (sheetData) {
      foundFields += sheetData.extractedFields.filter(f => f.value !== undefined && f.value !== null).length;
    }
  });

  const completenessScore = totalFields > 0 ? (foundFields / totalFields) * 100 : 100;
  
  return {
    valid: completenessScore >= config.completenessThreshold,
    message: `ความครบถ้วนของเอกสาร: ${completenessScore.toFixed(1)}%`,
    severity: completenessScore >= config.completenessThreshold ? 'INFO' : 'WARNING',
    details: {
      completenessScore,
      threshold: config.completenessThreshold,
      foundFields,
      totalFields
    }
  };
}

export function generateDocumentSummary(
  documentType: EnhancedDocumentType,
  extractedData: LoanApplicationData
): {
  summary: string;
  recommendations: string[];
  riskFactors: string[];
  nextSteps: string[];
} {
  const summary = [];
  const recommendations = [];
  const riskFactors = [];
  const nextSteps = [];

  if (documentType === 'LOAN_APPLICATION') {
    // Analyze financial health
    if (extractedData.financials) {
      const { profitability, liquidity, leverage } = extractedData.financials;
      
      if (profitability.profitMargin > 10) {
        summary.push('กิจการมีอัตรากำไรสุทธิที่ดี');
      } else if (profitability.profitMargin > 5) {
        summary.push('กิจการมีอัตรากำไรสุทธิอยู่ในระดับปานกลาง');
        riskFactors.push('อัตรากำไรสุทธิค่อนข้างต่ำ');
      } else {
        summary.push('กิจการมีอัตรากำไรสุทธิต่ำ');
        riskFactors.push('อัตรากำไรสุทธิต่ำ อาจส่งผลต่อความสามารถในการชำระหนี้');
      }

      if (leverage.debtToEquity > 2) {
        riskFactors.push('สัดส่วนหนี้สินต่อทุนสูง');
        recommendations.push('พิจารณาลดภาระหนี้ก่อนเพิ่มวงเงิน');
      }

      if (liquidity.currentRatio < 1) {
        riskFactors.push('สภาพคล่องต่ำ (Current Ratio < 1)');
        recommendations.push('ควรเพิ่มเงินทุนหมุนเวียน');
      }
    }

    // Analyze credit
    if (extractedData.creditInfo) {
      if (extractedData.creditInfo.utilizationRate > 80) {
        riskFactors.push('อัตราการใช้เครดิตสูง (>80%)');
        recommendations.push('พิจารณาลดภาระหนี้ก่อนเพิ่มวงเงินใหม่');
      }

      if (extractedData.creditInfo.creditStatus === 'POOR') {
        riskFactors.push('ประวัติเครดิตไม่ดี');
        recommendations.push('ต้องการหลักประกันเพิ่มเติมหรือผู้ค้ำประกันที่มั่นคง');
      }
    }

    // Analyze DSCR
    if (extractedData.dscrScore) {
      if (extractedData.dscrScore >= 1.5) {
        summary.push('ความสามารถในการชำระหนี้ดี (DSCR ≥ 1.5)');
      } else if (extractedData.dscrScore >= 1.25) {
        summary.push('ความสามารถในการชำระหนี้อยู่ในเกณฑ์มาตรฐาน (DSCR ≥ 1.25)');
      } else {
        riskFactors.push('ความสามารถในการชำระหนี้ต่ำกว่าเกณฑ์มาตรฐาน');
        recommendations.push('พิจารณาลดวงเงินหรือเพิ่มหลักประกัน');
      }
    }

    // Document completeness
    if (extractedData.documentCompleteness < 80) {
      riskFactors.push('เอกสารไม่ครบถ้วน');
      nextSteps.push('ขอเอกสารเพิ่มเติมให้ครบตาม checklist');
    } else {
      summary.push('เอกสารครบถ้วนตามเกณฑ์');
    }

    nextSteps.push('จัดทำรายงานการวิเคราะห์ความเสี่ยง');
    nextSteps.push('ประสานงานกับทีม Risk Management');
    nextSteps.push('เตรียมเอกสารสำหรับ Credit Committee');
  }

  return {
    summary: summary.length > 0 ? summary.join(' ') : 'เอกสารอยู่ในระหว่างการวิเคราะห์',
    recommendations,
    riskFactors,
    nextSteps
  };
}
