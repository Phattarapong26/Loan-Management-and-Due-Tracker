/**
 * Loan Rejection Confirmation Component
 * 
 * Enhanced loan rejection dialog with:
 * - Mandatory rejection reason field
 * - Common reason templates for quick selection
 * - Context-rich loan details display
 * - Validation to ensure reason is provided
 * 
 * Implements Requirement 3.2: Loan Rejection with Mandatory Reason
 * 
 * @module LoanRejectionConfirmation
 */

import React, { useState } from 'react';
import {
  ConfirmationDialog,
  ConfirmationDetailsSection,
  ConfirmationDetailRow,
} from '@/shared/components/ui/confirmation-dialog';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { formatCurrency } from '@/shared/utils/format';
import { cn } from '@/shared/lib/utils';

export interface LoanRejectionData {
  id: string;
  contractNumber?: string;
  customerName: string;
  amount: number;
  interestRate: number;
  term: number;
  dscr?: number;
}

export interface LoanRejectionConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: LoanRejectionData | null;
  onConfirm: (reason: string) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * Common rejection reason templates
 */
const REJECTION_REASONS = [
  'DSCR ต่ำเกินไป (ต่ำกว่า 1.25) - ความสามารถในการชำระหนี้ไม่เพียงพอ',
  'เอกสารไม่ครบถ้วน - ขาดเอกสารสำคัญที่จำเป็นในการพิจารณา',
  'ประวัติเครดิตไม่ดี - มีประวัติผิดนัดชำระหนี้',
  'รายได้ไม่เพียงพอ - รายได้ไม่สอดคล้องกับวงเงินที่ขอกู้',
  'หลักประกันไม่เพียงพอ - มูลค่าหลักประกันต่ำกว่าที่กำหนด',
  'ข้อมูลไม่ตรงกัน - ข้อมูลที่ให้มาไม่สอดคล้องหรือขัดแย้งกัน',
  'ไม่ผ่านนโยบายสินเชื่อ - ไม่เป็นไปตามเกณฑ์ที่บริษัทกำหนด',
];

/**
 * Loan Rejection Confirmation Dialog
 * 
 * @example
 * ```tsx
 * <LoanRejectionConfirmation
 *   open={showRejection}
 *   onOpenChange={setShowRejection}
 *   loan={selectedLoan}
 *   onConfirm={handleReject}
 * />
 * ```
 */
export function LoanRejectionConfirmation({
  open,
  onOpenChange,
  loan,
  onConfirm,
  onCancel,
  isLoading = false,
}: LoanRejectionConfirmationProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setRejectionReason('');
      setSelectedTemplate(null);
    }
  }, [open]);

  if (!loan) return null;

  const contractNumber = loan.contractNumber || loan.id;
  const isReasonValid = rejectionReason.trim().length >= 10;

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template);
    setRejectionReason(template);
  };

  const handleConfirm = async () => {
    if (!isReasonValid) return;
    await onConfirm(rejectionReason.trim());
  };

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="ยืนยันการปฏิเสธคำขอสินเชื่อ"
      description="กรุณาระบุเหตุผลในการปฏิเสธอย่างชัดเจน เพื่อให้ลูกค้าเข้าใจและสามารถแก้ไขได้"
      variant="danger"
      confirmText={isLoading ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธคำขอ'}
      cancelText="ยกเลิก"
      onConfirm={handleConfirm}
      onCancel={onCancel}
      requireScroll={false}
      disabled={isLoading || !isReasonValid}
    >
      <div className="space-y-6">
        {/* Loan Basic Information */}
        <ConfirmationDetailsSection title="ข้อมูลคำขอสินเชื่อ">
          <ConfirmationDetailRow
            label="เลขที่สัญญา"
            value={<span className="font-mono">{contractNumber}</span>}
          />
          <ConfirmationDetailRow
            label="ชื่อลูกค้า"
            value={loan.customerName}
          />
          <ConfirmationDetailRow
            label="วงเงินที่ขอ"
            value={formatCurrency(loan.amount)}
            highlight={true}
          />
          <ConfirmationDetailRow
            label="อัตราดอกเบี้ย"
            value={`${loan.interestRate.toFixed(2)}% ต่อปี`}
          />
          <ConfirmationDetailRow
            label="ระยะเวลา"
            value={`${loan.term} เดือน`}
          />
          {loan.dscr !== undefined && (
            <ConfirmationDetailRow
              label="DSCR Score"
              value={
                <span className={cn(
                  'font-semibold',
                  loan.dscr < 1.25 ? 'text-red-600' : 'text-green-600'
                )}>
                  {loan.dscr != null && !isNaN(Number(loan.dscr)) ? Number(loan.dscr).toFixed(2) : 'N/A'}
                </span>
              }
            />
          )}
        </ConfirmationDetailsSection>

        {/* Rejection Reason Templates */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-900 block">
            เลือกเหตุผลที่พบบ่อย (ไม่บังคับ)
          </label>
          <div className="grid grid-cols-1 gap-2">
            {REJECTION_REASONS.map((template, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTemplateSelect(template)}
                className={cn(
                  'justify-start text-left h-auto py-3 px-4 whitespace-normal',
                  selectedTemplate === template && 'border-red-500 bg-red-50'
                )}
              >
                <span className="text-xs leading-relaxed">{template}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Rejection Reason Input */}
        <div className="space-y-3">
          <label htmlFor="rejection-reason" className="text-sm font-semibold text-gray-900 block">
            เหตุผลในการปฏิเสธ <span className="text-red-600">*</span>
          </label>
          <Textarea
            id="rejection-reason"
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              setSelectedTemplate(null);
            }}
            placeholder="กรุณาระบุเหตุผลในการปฏิเสธอย่างละเอียด (อย่างน้อย 10 ตัวอักษร)&#10;&#10;ตัวอย่าง:&#10;• DSCR ต่ำเกินไป (1.15) ซึ่งต่ำกว่าเกณฑ์ขั้นต่ำที่ 1.25&#10;• เอกสารการเงินไม่ครบถ้วน ขาดงบการเงินย้อนหลัง 3 ปี&#10;• ประวัติเครดิตมีปัญหา พบการผิดนัดชำระหนี้ในช่วง 6 เดือนที่ผ่านมา"
            rows={6}
            className={cn(
              'resize-none',
              rejectionReason.trim().length > 0 && !isReasonValid && 'border-red-500 focus-visible:ring-red-500'
            )}
          />
          <div className="flex items-center justify-between text-xs">
            <p className={cn(
              'font-medium',
              rejectionReason.trim().length === 0 ? 'text-slate-500' :
              isReasonValid ? 'text-green-600' : 'text-red-600'
            )}>
              {rejectionReason.trim().length === 0 ? (
                '⚠️ กรุณาระบุเหตุผล (บังคับ)'
              ) : isReasonValid ? (
                '✓ เหตุผลถูกต้อง'
              ) : (
                `⚠️ กรุณาระบุเหตุผลอย่างน้อย 10 ตัวอักษร (ปัจจุบัน: ${rejectionReason.trim().length})`
              )}
            </p>
            <p className="text-slate-400">
              {rejectionReason.length} ตัวอักษร
            </p>
          </div>
        </div>

        {/* Important Warning */}
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-red-900 mb-1">
                คำเตือนสำคัญ
              </p>
              <p className="text-sm text-red-700 leading-relaxed">
                การปฏิเสธคำขอสินเชื่อเป็นการตัดสินใจที่สำคัญและไม่สามารถยกเลิกได้ 
                เหตุผลที่ระบุจะถูกบันทึกและส่งให้ลูกค้าทราบ กรุณาตรวจสอบความถูกต้องก่อนยืนยัน
              </p>
            </div>
          </div>
        </div>

        {/* Helpful Note */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 font-medium">
            💡 <strong>คำแนะนำ:</strong> เหตุผลที่ดีควรระบุ:
          </p>
          <ul className="mt-2 text-sm text-blue-800 space-y-1 ml-6 list-disc">
            <li>สาเหตุหลักที่ชัดเจน</li>
            <li>ข้อมูลหรือตัวเลขประกอบ (ถ้ามี)</li>
            <li>คำแนะนำสำหรับการแก้ไข (ถ้าเป็นไปได้)</li>
          </ul>
        </div>
      </div>
    </ConfirmationDialog>
  );
}
