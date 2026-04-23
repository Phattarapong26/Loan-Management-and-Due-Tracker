import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Disbursement } from '@/shared/lib/api-endpoints';
import { 
  FileText, 
  Building2, 
  User, 
  MapPin, 
  Phone, 
  Mail,
  CreditCard,
  Calendar,
  DollarSign,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Loader,
  Eye
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';

interface DisbursementPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disbursement: Disbursement | null;
  disbursementData: {
    disbursementMethod: 'TRANSFER' | 'CHECK' | 'CASH';
    referenceNo?: string;
    notes?: string;
  };
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
}

export function DisbursementPreviewDialog({
  open,
  onOpenChange,
  disbursement,
  disbursementData,
  onConfirm,
  onBack,
  isLoading,
  formatCurrency,
  formatDate,
}: DisbursementPreviewDialogProps) {
  if (!disbursement) return null;

  const originalCustomer = disbursement.loan?.customer;
  const loan = disbursement.loan;
  
  // Check if data is still encrypted (long base64-like string)
  const isEncrypted = (value: string | null | undefined): boolean => {
    if (!value) return false;
    // Encrypted data is typically long (>50 chars) and base64-like
    return value.length > 50 && /^[A-Za-z0-9+/=]+$/.test(value);
  };
  
  // Helper function to format ID for display (mask middle digits)
  const formatIdForDisplay = (id: string | null | undefined, label: string = ''): string => {
    if (!id) return '-';
    
    // If still encrypted, show warning
    if (isEncrypted(id)) {
      console.warn(`[DisbursementPreview] ${label} is still encrypted!`, {
        length: id.length,
        sample: id.substring(0, 20) + '...',
      });
      return '⚠️ ข้อมูลยังไม่ถูก decrypt';
    }
    
    // Remove any non-digit characters
    const digitsOnly = id.replace(/\D/g, '');
    
    console.log(`[DisbursementPreview] Formatting ${label}:`, {
      original: id,
      digitsOnly,
      length: digitsOnly.length,
    });
    
    if (digitsOnly.length === 0) return '-';
    
    // For Thai ID (13 digits): X-XXXX-XXXXX-XX-X
    if (digitsOnly.length === 13) {
      return `${digitsOnly[0]}-${digitsOnly.substring(1, 5)}-${'X'.repeat(5)}-${digitsOnly.substring(10, 12)}-${digitsOnly[12]}`;
    }
    
    // For other lengths, show first 3 and last 4 digits
    if (digitsOnly.length > 7) {
      const firstPart = digitsOnly.substring(0, 3);
      const lastPart = digitsOnly.slice(-4);
      const maskedLength = Math.min(digitsOnly.length - 7, 10);
      return `${firstPart}${'X'.repeat(maskedLength)}${lastPart}`;
    }
    
    // Too short to mask meaningfully - show as is
    return digitsOnly;
  };

  // For PDF password, we need the last 4 digits
  const pdfPassword = (() => {
    const id = originalCustomer?.thaiId || originalCustomer?.nationalId || originalCustomer?.taxId;
    
    if (!id) {
      // If no real data, use mock password
      return '1234';
    }
    
    // If still encrypted, can't extract password
    if (isEncrypted(id)) {
      console.error('[DisbursementPreview] Cannot extract PDF password - data is still encrypted');
      return '⚠️ ข้อมูลยังไม่ถูก decrypt';
    }
    
    // Extract only digits
    const digitsOnly = id.replace(/\D/g, '');
    
    console.log('[DisbursementPreview] PDF Password extraction:', {
      source: id.substring(0, 20) + '...',
      digitsOnly,
      digitsLength: digitsOnly.length,
      last4: digitsOnly.slice(-4),
    });
    
    if (digitsOnly.length < 4) {
      return 'ข้อมูลไม่ครบ';
    }
    
    // Return last 4 digits
    return digitsOnly.slice(-4);
  })();

  // ✅ Create customer with defaults - now after all the above declarations
  const customerWithDefaults = {
    ...originalCustomer,
    address: originalCustomer?.address || 'ไม่ได้ระบุที่อยู่ในระบบ',
    phone: originalCustomer?.phone || 'ไม่ได้ระบุเบอร์โทรในระบบ',
    email: originalCustomer?.email || 'ไม่ได้ระบุอีเมลในระบบ',
    thaiId: originalCustomer?.thaiId || '1234567890123', // Mock for PDF password
    taxId: originalCustomer?.taxId || '1234567890123', // Mock for PDF password
  };

  console.log('[DisbursementPreview] Customer with defaults:', customerWithDefaults);

  const customer = customerWithDefaults;
  
  // Get display values (masked for security) - now after customerWithDefaults is created
  const displayThaiId = formatIdForDisplay(customer?.thaiId || customer?.nationalId, 'Thai ID');
  const displayTaxId = formatIdForDisplay(customer?.taxId, 'Tax ID');

  console.log('[DisbursementPreview] Customer data processed:', {
    customerCode: originalCustomer?.customerCode,
    businessName: originalCustomer?.businessName,
    address: originalCustomer?.address,
    phone: originalCustomer?.phone,
    email: originalCustomer?.email,
    thaiIdRaw: originalCustomer?.thaiId?.substring(0, 30),
    taxIdRaw: originalCustomer?.taxId?.substring(0, 30),
    thaiIdEncrypted: isEncrypted(originalCustomer?.thaiId),
    taxIdEncrypted: isEncrypted(originalCustomer?.taxId),
    displayThaiId,
    displayTaxId,
    pdfPassword,
  });
  
  // Calculate amounts
  const totalLoanAmount = Number(loan?.principal) || 0;
  const currentDisbursement = Number(disbursement.amount) || 0;
  const previouslyDisbursed = Number(loan?.totalDisbursed) || 0;
  const remainingAfterThis = totalLoanAmount - (previouslyDisbursed + currentDisbursement);

  // Validation checks
  const validations = [
    {
      label: 'ข้อมูลลูกค้า',
      valid: !!(customer?.businessName && customer?.address && !customer?.address?.includes('ไม่ได้ระบุ')),
      message: (customer?.businessName && customer?.address && !customer?.address?.includes('ไม่ได้ระบุ')) ? '✓ ครบถ้วน' : '⚠ ข้อมูลที่อยู่ไม่ครบถ้วน'
    },
    {
      label: 'เลขบัตร/ผู้เสียภาษี',
      valid: !!(customer?.thaiId || customer?.nationalId || customer?.taxId) && !(customer?.thaiId === '1234567890123'),
      message: (customer?.thaiId || customer?.nationalId || customer?.taxId) && !(customer?.thaiId === '1234567890123') ? '✓ มีข้อมูล' : '⚠ ข้อมูลไม่ครบถ้วน (จำเป็นสำหรับรหัสเอกสาร)'
    },
    {
      label: 'เบอร์โทรศัพท์',
      valid: !!(customer?.phone) && !customer?.phone?.includes('ไม่ได้ระบุ'),
      message: (customer?.phone) && !customer?.phone?.includes('ไม่ได้ระบุ') ? '✓ มีข้อมูล' : '⚠ ไม่มีข้อมูล (แนะนำให้มี)'
    },
    {
      label: 'ข้อมูลสัญญา',
      valid: !!((loan?.contract_number || loan?.loanContractNo) && loan?.principal),
      message: (loan?.contract_number || loan?.loanContractNo) ? '✓ ครบถ้วน' : '✗ ไม่ครบถ้วน'
    },
    {
      label: 'วิธีการเบิกจ่าย',
      valid: !!disbursementData.disbursementMethod,
      message: disbursementData.disbursementMethod ? '✓ ระบุแล้ว' : '✗ ยังไม่ระบุ'
    },
    {
      label: 'เลขที่อ้างอิง',
      valid: disbursementData.disbursementMethod === 'CASH' || !!disbursementData.referenceNo,
      message: disbursementData.referenceNo ? '✓ ระบุแล้ว' : (disbursementData.disbursementMethod === 'CASH' ? '○ ไม่จำเป็น' : '⚠ แนะนำให้ระบุ')
    },
    {
      label: 'ยอดเงินคงเหลือ',
      valid: remainingAfterThis >= 0,
      message: remainingAfterThis >= 0 ? '✓ ปกติ' : '✗ เกินวงเงิน'
    }
  ];

  const allValid = validations.filter(v => !v.message.includes('⚠')).every(v => v.valid);
  const hasWarnings = validations.some(v => !v.valid);

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'TRANSFER': return 'โอนเงิน';
      case 'CHECK': return 'เช็ค';
      case 'CASH': return 'เงินสด';
      default: return method;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader>
          <DialogTitle>ตรวจสอบข้อมูลก่อนเบิกจ่าย</DialogTitle>
          <DialogDescription>
            กรุณาตรวจสอบความถูกต้องของข้อมูลทั้งหมดก่อนส่งเอกสารให้ลูกค้า
          </DialogDescription>
        </DialogHeader>
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <Eye className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-blue-700 tracking-tight">
                ตรวจสอบข้อมูลก่อนเบิกจ่าย
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                กรุณาตรวจสอบความถูกต้องของข้อมูลทั้งหมดก่อนส่งเอกสารให้ลูกค้า
              </p>
            </div>
            {allValid ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            )}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-8 space-y-6 bg-[#FAFBFC]">
            {/* Validation Status */}
            {hasWarnings && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-amber-900 mb-2">
                      ⚠️ พบข้อมูลที่ต้องตรวจสอบ
                    </p>
                    <div className="space-y-1">
                      {validations.filter(v => !v.valid).map((v, i) => (
                        <p key={i} className="text-xs text-amber-700">
                          • {v.label}: {v.message}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Preview Header */}
            <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                <FileText className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900">หนังสือแจ้งการเบิกจ่ายเงินกู้</h3>
                  <p className="text-xs text-slate-500">Disbursement Advice</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">เลขที่เอกสาร</p>
                  <p className="font-semibold">{disbursement.disbursementNo}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">วันที่ออกเอกสาร</p>
                  <p className="font-semibold">{formatDate(new Date().toISOString())}</p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                <User className="h-5 w-5 text-slate-600" />
                <h3 className="font-bold text-slate-900">ข้อมูลลูกค้า</h3>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">ชื่อ-นามสกุล / ชื่อธุรกิจ</p>
                    <p className="font-semibold">{customer?.businessName || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500">ที่อยู่</p>
                    <p className={`font-medium ${customer?.address?.includes('ไม่ได้ระบุ') ? 'text-amber-600 italic' : 'text-slate-700'}`}>
                      {customer?.address}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">เลขบัตรประชาชน</p>
                      <p className="font-medium">{displayThaiId}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <FileCheck className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">เลขผู้เสียภาษี</p>
                      <p className="font-medium">{displayTaxId}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">เบอร์โทรศัพท์</p>
                      <p className={`font-medium ${customer?.phone?.includes('ไม่ได้ระบุ') ? 'text-amber-600 italic' : 'text-slate-700'}`}>
                        {customer?.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">อีเมล</p>
                      <p className={`font-medium ${customer?.email?.includes('ไม่ได้ระบุ') ? 'text-amber-600 italic' : 'text-slate-700'}`}>
                        {customer?.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Loan Contract Information */}
            <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                <FileCheck className="h-5 w-5 text-slate-600" />
                <h3 className="font-bold text-slate-900">ข้อมูลสัญญาสินเชื่อ</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 mb-1">เลขที่สัญญา</p>
                  <p className="font-semibold">{loan?.contract_number || loan?.loanContractNo || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">วันที่ทำสัญญา</p>
                  <p className="font-medium">{(loan?.approvedAt || loan?.approvedDate) ? formatDate(loan.approvedAt || loan.approvedDate!) : '-'}</p>
                </div>
              </div>
            </div>

            {/* Disbursement Details */}
            <div className="bg-white rounded-2xl p-6 border-2 border-emerald-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">รายละเอียดการเบิกจ่าย</h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">วันที่เบิกจ่าย</p>
                    <p className="font-semibold">{formatDate(new Date().toISOString())}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">วิธีการเบิกจ่าย</p>
                    <Badge variant="outline" className="font-semibold">
                      {getMethodLabel(disbursementData.disbursementMethod)}
                    </Badge>
                  </div>
                </div>

                {disbursementData.disbursementMethod === 'TRANSFER' && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">เลขที่ธุรกรรม</p>
                    <p className="font-semibold">{disbursementData.referenceNo || '-'}</p>
                  </div>
                )}

                {disbursementData.disbursementMethod === 'CHECK' && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">เลขที่เช็ค</p>
                    <p className="font-semibold">{disbursementData.referenceNo || '-'}</p>
                  </div>
                )}

                {disbursementData.notes && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">หมายเหตุ</p>
                    <p className="font-medium text-slate-700">{disbursementData.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Amount Summary */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border-2 border-emerald-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">สรุปยอดเงินกู้</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-emerald-200">
                  <span className="text-sm text-slate-600">วงเงินกู้รวม</span>
                  <span className="font-bold text-slate-900">{formatCurrency(totalLoanAmount)}</span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b border-emerald-200">
                  <span className="text-sm text-slate-600">เบิกจ่ายไปแล้ว</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(previouslyDisbursed)}</span>
                </div>

                <div className="flex justify-between items-center pb-3 border-b-2 border-emerald-300">
                  <span className="text-sm font-semibold text-emerald-700">เบิกจ่ายครั้งนี้</span>
                  <span className="font-bold text-xl text-emerald-600">{formatCurrency(currentDisbursement)}</span>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-semibold text-slate-900">ยอดคงเหลือหลังเบิกจ่าย</span>
                  <span className={`font-bold text-lg ${remainingAfterThis >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(remainingAfterThis)}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-blue-900 mb-2">
                    🔒 ความปลอดภัยของเอกสาร
                  </p>
                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-blue-700 mb-1">
                        รหัสเปิดเอกสาร PDF:
                      </p>
                      <p className="text-lg font-bold text-blue-900 tracking-wider">
                        {pdfPassword}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        (เลขบัตรประชาชน/ผู้เสียภาษี 4 ตัวท้าย)
                      </p>
                    </div>
                    <p className="text-xs text-blue-700">
                      • เอกสารจะถูกส่งไปยัง LINE ของลูกค้าพร้อมรหัสนี้
                    </p>
                    <p className="text-xs text-blue-700">
                      • ลูกค้าต้องกรอกรหัสเพื่อเปิดดูเอกสาร
                    </p>
                    <p className="text-xs text-blue-700">
                      • ลิงก์เอกสารจะหมดอายุใน 7 วัน
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4">รายการตรวจสอบ</h3>
              <div className="space-y-2">
                {validations.map((v, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    {v.valid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                    )}
                    <span className="flex-1 text-slate-700">{v.label}</span>
                    <span className={`text-xs font-medium ${v.valid ? 'text-green-600' : 'text-amber-600'}`}>
                      {v.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100">
          <div className="flex items-center justify-between gap-4">
            <Button 
              variant="outline" 
              onClick={onBack}
              disabled={isLoading}
              className="border-slate-200 hover:bg-slate-50"
            >
              ← ย้อนกลับแก้ไข
            </Button>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="border-slate-200 hover:bg-slate-50"
              >
                ยกเลิก
              </Button>
              <Button
                onClick={onConfirm}
                disabled={isLoading || !allValid}
                className="px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    กำลังเบิกจ่าย...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    ยืนยันเบิกจ่ายและส่งเอกสาร
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
