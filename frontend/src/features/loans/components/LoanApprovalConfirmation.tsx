/**
 * Loan Approval Confirmation Component
 * 
 * Enhanced loan approval dialog with:
 * - Context-rich loan details display
 * - Require scrolling to bottom before enabling approve button
 * - Large, readable fonts for critical information
 * - DSCR risk assessment display
 * 
 * Implements Requirement 3.1: Loan Approval Confirmation
 * 
 * @module LoanApprovalConfirmation
 */

import React from 'react';
import {
  ConfirmationDialog,
  ConfirmationDetailsSection,
  ConfirmationDetailRow,
} from '@/shared/components/ui/confirmation-dialog';
import { formatCurrency } from '../../../shared/utils/format';

export interface LoanApprovalData {
  id: string;
  contractNumber?: string;
  customerName: string;
  amount: number;
  interestRate: number;
  term: number;
  dscr: number;
  purpose?: string;
  collateral?: string;
  monthlyPayment?: number;
}

export interface LoanApprovalConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: LoanApprovalData | null;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

/**
 * Get DSCR risk level and color
 */
function getDSCRRiskLevel(dscr: number): { level: string; color: string; icon: string } {
  if (dscr < 1.25) {
    return { level: 'ความเสี่ยงสูง', color: 'text-red-600', icon: '⚠️' };
  } else if (dscr < 1.50) {
    return { level: 'ความเสี่ยงปานกลาง', color: 'text-amber-600', icon: '⚡' };
  } else {
    return { level: 'ความเสี่ยงต่ำ', color: 'text-green-600', icon: '✓' };
  }
}

/**
 * Loan Approval Confirmation Dialog
 * 
 * @example
 * ```tsx
 * <LoanApprovalConfirmation
 *   open={showApproval}
 *   onOpenChange={setShowApproval}
 *   loan={selectedLoan}
 *   onConfirm={handleApprove}
 * />
 * ```
 */
export function LoanApprovalConfirmation({
  open,
  onOpenChange,
  loan,
  onConfirm,
  onCancel,
  isLoading = false,
}: LoanApprovalConfirmationProps) {
  if (!loan) return null;

  const risk = getDSCRRiskLevel(loan.dscr);
  const contractNumber = loan.contractNumber || loan.id;

  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="ยืนยันการอนุมัติสินเชื่อ"
      description="กรุณาตรวจสอบข้อมูลสินเชื่อให้ครบถ้วนก่อนอนุมัติ การอนุมัติไม่สามารถยกเลิกได้"
      variant={loan.dscr < 1.25 ? 'warning' : 'success'}
      confirmText={isLoading ? 'กำลังอนุมัติ...' : 'ยืนยันอนุมัติสินเชื่อ'}
      cancelText="ยกเลิก"
      onConfirm={onConfirm}
      onCancel={onCancel}
      requireScroll={true}
      disabled={isLoading}
    >
      <div className="space-y-6">
        {/* Loan Basic Information */}
        <ConfirmationDetailsSection title="ข้อมูลสินเชื่อ">
          <ConfirmationDetailRow
            label="เลขที่สัญญา"
            value={<span className="font-mono">{contractNumber}</span>}
          />
          <ConfirmationDetailRow
            label="ชื่อลูกค้า"
            value={loan.customerName}
          />
          <ConfirmationDetailRow
            label="วงเงินกู้"
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
          {loan.monthlyPayment && (
            <ConfirmationDetailRow
              label="ค่างวดต่อเดือน"
              value={formatCurrency(loan.monthlyPayment)}
            />
          )}
        </ConfirmationDetailsSection>

        {/* DSCR Risk Assessment */}
        <ConfirmationDetailsSection title="การประเมินความเสี่ยง (DSCR)">
          <ConfirmationDetailRow
            label="DSCR Score"
            value={
              <span className={`text-2xl font-bold ${risk.color}`}>
                {loan.dscr != null && !isNaN(Number(loan.dscr)) ? Number(loan.dscr).toFixed(2) : 'N/A'}
              </span>
            }
            highlight={true}
          />
          <ConfirmationDetailRow
            label="ระดับความเสี่ยง"
            value={
              <span className={`font-semibold ${risk.color}`}>
                {risk.icon} {risk.level}
              </span>
            }
          />
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong>คำอธิบาย:</strong> DSCR (Debt Service Coverage Ratio) คือ อัตราส่วนความสามารถในการชำระหนี้
            </p>
            <ul className="mt-2 text-sm text-slate-600 space-y-1 ml-4">
              <li>• DSCR ≥ 1.50: ความเสี่ยงต่ำ (แนะนำให้อนุมัติ)</li>
              <li>• DSCR 1.25-1.49: ความเสี่ยงปานกลาง (พิจารณาอย่างรอบคอบ)</li>
              <li>• DSCR &lt; 1.25: ความเสี่ยงสูง (ไม่แนะนำให้อนุมัติ)</li>
            </ul>
          </div>
        </ConfirmationDetailsSection>

        {/* Additional Information */}
        {(loan.purpose || loan.collateral) && (
          <ConfirmationDetailsSection title="ข้อมูลเพิ่มเติม">
            {loan.purpose && (
              <ConfirmationDetailRow
                label="วัตถุประสงค์"
                value={loan.purpose}
              />
            )}
            {loan.collateral && (
              <ConfirmationDetailRow
                label="หลักประกัน"
                value={loan.collateral}
              />
            )}
          </ConfirmationDetailsSection>
        )}

        {/* Warning for high-risk loans */}
        {loan.dscr < 1.25 && (
          <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-red-900 mb-1">
                  คำเตือน: DSCR ต่ำกว่าเกณฑ์มาตรฐาน
                </p>
                <p className="text-sm text-red-700 leading-relaxed">
                  สินเชื่อนี้มี DSCR ต่ำกว่า 1.25 ซึ่งบ่งชี้ว่าลูกค้าอาจมีความเสี่ยงในการผิดนัดชำระหนี้สูง 
                  กรุณาพิจารณาอย่างรอบคอบและตรวจสอบข้อมูลเพิ่มเติมก่อนอนุมัติ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Important Notice */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-900 font-medium">
            📌 <strong>หมายเหตุสำคัญ:</strong> การอนุมัติสินเชื่อเป็นการตัดสินใจที่สำคัญและไม่สามารถยกเลิกได้ 
            กรุณาตรวจสอบข้อมูลทั้งหมดให้ถูกต้องครบถ้วนก่อนกดยืนยัน
          </p>
        </div>
      </div>
    </ConfirmationDialog>
  );
}
