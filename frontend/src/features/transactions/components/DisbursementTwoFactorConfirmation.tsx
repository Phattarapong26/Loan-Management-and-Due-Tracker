/**
 * Disbursement Two-Factor Confirmation Component
 * 
 * Enhanced disbursement confirmation with two-factor verification:
 * - Display bank account details in large, readable font
 * - Require typing last 4 digits of account number for verification
 * - Context-rich disbursement details display
 * - Prevent accidental disbursement to wrong account
 * 
 * Implements Requirement 3.5: Disbursement Two-Factor Confirmation
 * 
 * @module DisbursementTwoFactorConfirmation
 */

import React, { useState } from 'react';
import {
  ConfirmationDialog,
  ConfirmationDetailsSection,
  ConfirmationDetailRow,
} from '@/shared/components/ui/confirmation-dialog';
import { Input } from '@/shared/components/ui/input';
import { formatCurrency } from '@/shared/utils/format';
import { cn } from '@/shared/lib/utils';

export interface DisbursementData {
  id: string;
  disbursementNo: string;
  customerName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  disbursementMethod: 'TRANSFER' | 'CHECK' | 'CASH';
  referenceNo?: string;
  contractNumber?: string;
}

export interface DisbursementTwoFactorConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disbursement: DisbursementData | null;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * Disbursement Two-Factor Confirmation Dialog
 * 
 * @example
 * ```tsx
 * <DisbursementTwoFactorConfirmation
 *   open={showConfirmation}
 *   onOpenChange={setShowConfirmation}
 *   disbursement={selectedDisbursement}
 *   onConfirm={handleDisbursement}
 * />
 * ```
 */
export function DisbursementTwoFactorConfirmation({
  open,
  onOpenChange,
  disbursement,
  onConfirm,
  onCancel,
  isLoading = false,
}: DisbursementTwoFactorConfirmationProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState(false);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setVerificationCode('');
      setVerificationError(false);
    }
  }, [open]);

  if (!disbursement) return null;

  // Get last 4 digits of account number
  const accountNumber = disbursement.accountNumber.replace(/\s/g, '');
  const last4Digits = accountNumber.slice(-4);
  const isVerificationValid = verificationCode === last4Digits;

  // Format account number for display (XXX-X-XXXXX-X)
  const formatAccountNumber = (accNum: string) => {
    const cleaned = accNum.replace(/\s/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 4)}-${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return accNum;
  };

  const handleVerificationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setVerificationCode(value);
    setVerificationError(false);
  };

  const handleConfirm = async () => {
    if (!isVerificationValid) {
      setVerificationError(true);
      return;
    }
    await onConfirm();
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'TRANSFER': return 'โอนเงิน';
      case 'CHECK': return 'เช็ค';
      case 'CASH': return 'เงินสด';
      default: return method;
    }
  };

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="ยืนยันการเบิกจ่ายเงินกู้"
      description="กรุณาตรวจสอบข้อมูลบัญชีธนาคารและยืนยันด้วยการกรอกเลข 4 ตัวท้ายของบัญชี"
      variant="warning"
      confirmText={isLoading ? 'กำลังเบิกจ่าย...' : 'ยืนยันเบิกจ่ายเงิน'}
      cancelText="ยกเลิก"
      onConfirm={handleConfirm}
      onCancel={onCancel}
      requireScroll={false}
      disabled={isLoading || !isVerificationValid}
    >
      <div className="space-y-6">
        {/* Disbursement Basic Information */}
        <ConfirmationDetailsSection title="ข้อมูลการเบิกจ่าย">
          <ConfirmationDetailRow
            label="เลขที่เอกสาร"
            value={<span className="font-mono">{disbursement.disbursementNo}</span>}
          />
          {disbursement.contractNumber && (
            <ConfirmationDetailRow
              label="เลขที่สัญญา"
              value={<span className="font-mono">{disbursement.contractNumber}</span>}
            />
          )}
          <ConfirmationDetailRow
            label="ชื่อลูกค้า"
            value={disbursement.customerName}
          />
          <ConfirmationDetailRow
            label="จำนวนเงิน"
            value={formatCurrency(disbursement.amount)}
            highlight={true}
          />
          <ConfirmationDetailRow
            label="วิธีการเบิกจ่าย"
            value={getMethodLabel(disbursement.disbursementMethod)}
          />
          {disbursement.referenceNo && (
            <ConfirmationDetailRow
              label="เลขที่อ้างอิง"
              value={<span className="font-mono">{disbursement.referenceNo}</span>}
            />
          )}
        </ConfirmationDetailsSection>

        {/* Bank Account Information - Large Font */}
        <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-4">
            ข้อมูลบัญชีธนาคารปลายทาง
          </h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs text-blue-700 mb-1">ธนาคาร</p>
              <p className="text-2xl font-bold text-blue-900">
                {disbursement.bankName}
              </p>
            </div>

            <div>
              <p className="text-xs text-blue-700 mb-1">เลขที่บัญชี</p>
              <p className="text-3xl font-bold text-blue-900 font-mono tracking-wider">
                {formatAccountNumber(disbursement.accountNumber)}
              </p>
            </div>

            <div>
              <p className="text-xs text-blue-700 mb-1">ชื่อบัญชี</p>
              <p className="text-xl font-bold text-blue-900">
                {disbursement.accountName}
              </p>
            </div>
          </div>
        </div>

        {/* Two-Factor Verification */}
        <div className="space-y-3">
          <label htmlFor="verification-code" className="text-sm font-semibold text-gray-900 block">
            ยืนยันการเบิกจ่าย: กรอกเลข 4 ตัวท้ายของบัญชี <span className="text-red-600">*</span>
          </label>
          
          <div className="relative">
            <Input
              id="verification-code"
              type="text"
              inputMode="numeric"
              value={verificationCode}
              onChange={handleVerificationChange}
              placeholder="กรอกเลข 4 ตัวท้าย"
              maxLength={4}
              className={cn(
                'text-center text-2xl font-bold font-mono tracking-widest h-16',
                verificationError && 'border-red-500 focus-visible:ring-red-500',
                isVerificationValid && 'border-green-500 focus-visible:ring-green-500'
              )}
              autoComplete="off"
            />
            {isVerificationValid && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <span className="text-2xl">✓</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <p className={cn(
              'font-medium',
              verificationCode.length === 0 ? 'text-slate-500' :
              isVerificationValid ? 'text-green-600' :
              verificationError ? 'text-red-600' : 'text-slate-500'
            )}>
              {verificationCode.length === 0 ? (
                '⚠️ กรุณากรอกเลข 4 ตัวท้ายของบัญชี (บังคับ)'
              ) : isVerificationValid ? (
                '✓ ยืนยันถูกต้อง'
              ) : verificationError ? (
                '✗ เลขที่กรอกไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
              ) : (
                `กรอกแล้ว ${verificationCode.length}/4 ตัว`
              )}
            </p>
            <p className="text-slate-400">
              เลข 4 ตัวท้าย: {last4Digits}
            </p>
          </div>
        </div>

        {/* Important Warning */}
        <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-900 mb-1">
                คำเตือนสำคัญ
              </p>
              <p className="text-sm text-amber-700 leading-relaxed">
                การเบิกจ่ายเงินเป็นการดำเนินการที่ไม่สามารถยกเลิกได้ 
                กรุณาตรวจสอบข้อมูลบัญชีธนาคารให้ถูกต้องก่อนยืนยัน 
                หากโอนเงินผิดบัญชีอาจทำให้เกิดปัญหาตามมา
              </p>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 font-medium">
            🔒 <strong>มาตรการความปลอดภัย:</strong> การยืนยันด้วยเลข 4 ตัวท้าย
          </p>
          <p className="mt-2 text-sm text-blue-800">
            ระบบต้องการให้คุณกรอกเลข 4 ตัวท้ายของบัญชีเพื่อยืนยันว่าคุณได้ตรวจสอบ
            ข้อมูลบัญชีธนาคารอย่างละเอียดแล้ว ช่วยป้องกันการโอนเงินผิดบัญชี
          </p>
        </div>
      </div>
    </ConfirmationDialog>
  );
}
