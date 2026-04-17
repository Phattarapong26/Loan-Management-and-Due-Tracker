import { FastifyRequest, FastifyReply } from 'fastify';
import { ResponseUtil } from '@utils/formatting/response.util';
import { LoanRepository } from '@loans/repositories/loan.repository';
import { CreatePaymentInput } from '../models/payment.model';

/**
 * Validate payment amount against loan outstanding balance
 * Enhanced with user-friendly error messages
 */
export const validatePaymentAmount = () => {
    return async (request: FastifyRequest<{ Body: CreatePaymentInput }>, reply: FastifyReply) => {
        try {
            const { loanId, amount } = request.body;
            
            // Get loan data
            const loanRepository = new LoanRepository();
            const loan = await loanRepository.findById(loanId);
            
            if (!loan) {
                return ResponseUtil.error(reply, 'ไม่พบข้อมูลสัญญา กรุณาตรวจสอบเลขที่สัญญาอีกครั้ง', 404);
            }
            
            const outstandingBalance = Number(loan.outstandingBalance);
            const customerName = (loan as any).customer?.businessName || 'ลูกค้า';
            
            // 🚫 STRICT: No overpayment allowed (except small buffer for rounding)
            if (amount > outstandingBalance + 10) { // เผื่อเพียง 10 บาทสำหรับการปัดเศษ
                const formatCurrency = (num: number) => num.toLocaleString('th-TH', { 
                    style: 'currency', 
                    currency: 'THB',
                    minimumFractionDigits: 0 
                });
                
                return ResponseUtil.error(
                    reply, 
                    `🚫 ไม่สามารถชำระเกินยอดหนี้คงเหลือได้!\n\n` +
                    `👤 ลูกค้า: ${customerName}\n` +
                    `💰 ยอดหนี้คงเหลือ: ${formatCurrency(outstandingBalance)}\n` +
                    `💸 จำนวนที่พยายามชำระ: ${formatCurrency(amount)}\n` +
                    `❌ เกินไป: ${formatCurrency(amount - outstandingBalance)}\n\n` +
                    `กรุณาใส่จำนวนเงินไม่เกิน ${formatCurrency(outstandingBalance)} บาท`, 
                    400,
                    'PAYMENT_EXCEEDS_BALANCE'
                );
            }
            
            // Validate minimum amount
            if (amount <= 0) {
                return ResponseUtil.error(
                    reply, 
                    '❌ จำนวนเงินต้องมากกว่า 0 บาท', 
                    400,
                    'INVALID_AMOUNT'
                );
            }
            
            // Validate reasonable amount (prevent typos)
            if (amount > 10000000) { // 10 ล้าน
                return ResponseUtil.error(
                    reply, 
                    `⚠️ จำนวนเงินสูงผิดปกติ!\n\n` +
                    `จำนวน ${amount.toLocaleString('th-TH')} บาท สูงเกินไป\n` +
                    `กรุณาตรวจสอบอีกครั้งว่าใส่จำนวนถูกต้องหรือไม่`, 
                    400,
                    'AMOUNT_TOO_HIGH'
                );
            }
            
            // Store loan data in request for later use
            (request as any).loan = loan;
            
        } catch (error: any) {
            console.error('Payment validation error:', error);
            return ResponseUtil.error(reply, 'เกิดข้อผิดพลาดในการตรวจสอบข้อมูล กรุณาลองใหม่อีกครั้ง', 500);
        }
    };
};