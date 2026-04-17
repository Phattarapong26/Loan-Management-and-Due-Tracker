/**
 * Application Status Service
 * 
 * Purpose: Send loan application status updates with timeline
 * Features:
 * - Status change notifications
 * - Application timeline display
 * - Document request handling
 * - Disbursement notifications
 * 
 * Requirements: Requirement 14 - Application Status Updates
 * Tasks: 7.4.1 - 7.4.9
 */

import { prisma } from '@config/database.config';

export interface ApplicationStatus {
    loanId: string;
    customerId: string;
    customerName: string;
    status: string;
    principal: number;
    interestRate: number;
    termMonths: number;
    appliedAt: Date;
    statusHistory: Array<{
        status: string;
        timestamp: Date;
        note?: string;
    }>;
}

export class ApplicationStatusService {
    /**
     * Task 7.4.2: Send notification on application submission
     * 
     * @param loanId - Loan ID
     * @returns Notification message
     */
    async notifyApplicationSubmitted(loanId: string): Promise<any> {
        try {
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                include: {
                    customer: {
                        select: {
                            businessName: true,
                            lineUserId: true,
                        },
                    },
                },
            });

            if (!loan || !loan.customer.lineUserId) {
                return null;
            }

            return {
                lineUserId: loan.customer.lineUserId,
                message: {
                    type: 'flex',
                    altText: 'แจ้งเตือน: ได้รับคำขอสินเชื่อแล้ว',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '✅ ได้รับคำขอสินเชื่อแล้ว',
                                    weight: 'bold',
                                    size: 'lg',
                                    color: '#FFFFFF',
                                },
                            ],
                            backgroundColor: '#06C755',
                            paddingAll: '20px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: `เลขที่คำขอ: ${loan.id}`,
                                    size: 'sm',
                                    color: '#666666',
                                    margin: 'md',
                                },
                                {
                                    type: 'text',
                                    text: `จำนวนเงิน: ${Number(loan.principal).toLocaleString('th-TH')} บาท`,
                                    size: 'md',
                                    weight: 'bold',
                                    margin: 'md',
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '⏱️ ระยะเวลาพิจารณา',
                                    size: 'sm',
                                    weight: 'bold',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '• ≤ 500,000 บาท: 1-2 วันทำการ\n• 500,001-2,000,000 บาท: 3-5 วันทำการ\n• > 2,000,000 บาท: 5-7 วันทำการ',
                                    size: 'xs',
                                    color: '#666666',
                                    wrap: true,
                                    margin: 'sm',
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '📱 เราจะแจ้งเตือนคุณเมื่อมีความคืบหน้า',
                                    size: 'xs',
                                    color: '#999999',
                                    wrap: true,
                                    margin: 'lg',
                                    align: 'center',
                                },
                            ],
                            paddingAll: '20px',
                        },
                    },
                },
            };
        } catch (error) {
            console.error('Error creating application submitted notification:', error);
            return null;
        }
    }

    /**
     * Task 7.4.3: Send notification on application under review
     * 
     * @param loanId - Loan ID
     * @param reviewerName - Reviewer name
     * @returns Notification message
     */
    async notifyApplicationUnderReview(loanId: string, reviewerName: string): Promise<any> {
        try {
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                include: {
                    customer: {
                        select: {
                            lineUserId: true,
                        },
                    },
                },
            });

            if (!loan || !loan.customer.lineUserId) {
                return null;
            }

            return {
                lineUserId: loan.customer.lineUserId,
                message: {
                    type: 'flex',
                    altText: 'แจ้งเตือน: คำขอสินเชื่ออยู่ระหว่างพิจารณา',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '🔍 อยู่ระหว่างพิจารณา',
                                    weight: 'bold',
                                    size: 'lg',
                                    color: '#FFFFFF',
                                },
                            ],
                            backgroundColor: '#FFA500',
                            paddingAll: '20px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: `เลขที่คำขอ: ${loan.id}`,
                                    size: 'sm',
                                    color: '#666666',
                                    margin: 'md',
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '👤 ผู้พิจารณา',
                                    size: 'sm',
                                    weight: 'bold',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: reviewerName,
                                    size: 'sm',
                                    color: '#666666',
                                    margin: 'sm',
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '📱 เราจะแจ้งเตือนคุณเมื่อมีผลการพิจารณา',
                                    size: 'xs',
                                    color: '#999999',
                                    wrap: true,
                                    margin: 'lg',
                                    align: 'center',
                                },
                            ],
                            paddingAll: '20px',
                        },
                    },
                },
            };
        } catch (error) {
            console.error('Error creating under review notification:', error);
            return null;
        }
    }

    /**
     * Task 7.4.4: Send notification on application approval
     * 
     * @param loanId - Loan ID
     * @returns Notification message
     */
    async notifyApplicationApproved(loanId: string): Promise<any> {
        try {
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                include: {
                    customer: {
                        select: {
                            lineUserId: true,
                        },
                    },
                },
            });

            if (!loan || !loan.customer.lineUserId) {
                return null;
            }

            return {
                lineUserId: loan.customer.lineUserId,
                message: {
                    type: 'flex',
                    altText: 'แจ้งเตือน: คำขอสินเชื่ออนุมัติแล้ว',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '🎉 อนุมัติแล้ว!',
                                    weight: 'bold',
                                    size: 'xl',
                                    color: '#FFFFFF',
                                },
                            ],
                            backgroundColor: '#06C755',
                            paddingAll: '20px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: `เลขที่สินเชื่อ: ${loan.id}`,
                                    size: 'sm',
                                    color: '#666666',
                                    margin: 'md',
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        {
                                            type: 'box',
                                            layout: 'baseline',
                                            contents: [
                                                {
                                                    type: 'text',
                                                    text: 'วงเงินอนุมัติ:',
                                                    size: 'sm',
                                                    color: '#666666',
                                                    flex: 0,
                                                },
                                                {
                                                    type: 'text',
                                                    text: `${Number(loan.principal).toLocaleString('th-TH')} บาท`,
                                                    size: 'sm',
                                                    weight: 'bold',
                                                    align: 'end',
                                                },
                                            ],
                                            margin: 'lg',
                                        },
                                        {
                                            type: 'box',
                                            layout: 'baseline',
                                            contents: [
                                                {
                                                    type: 'text',
                                                    text: 'อัตราดอกเบี้ย:',
                                                    size: 'sm',
                                                    color: '#666666',
                                                    flex: 0,
                                                },
                                                {
                                                    type: 'text',
                                                    text: `${loan.interestRate}% ต่อปี`,
                                                    size: 'sm',
                                                    weight: 'bold',
                                                    align: 'end',
                                                },
                                            ],
                                            margin: 'md',
                                        },
                                        {
                                            type: 'box',
                                            layout: 'baseline',
                                            contents: [
                                                {
                                                    type: 'text',
                                                    text: 'ระยะเวลา:',
                                                    size: 'sm',
                                                    color: '#666666',
                                                    flex: 0,
                                                },
                                                {
                                                    type: 'text',
                                                    text: `${loan.termMonths} เดือน`,
                                                    size: 'sm',
                                                    weight: 'bold',
                                                    align: 'end',
                                                },
                                            ],
                                            margin: 'md',
                                        },
                                    ],
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '📋 ขั้นตอนต่อไป',
                                    size: 'sm',
                                    weight: 'bold',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '1. เจ้าหน้าที่จะติดต่อเพื่อนัดหมาย\n2. ลงนามในสัญญา\n3. รับเงินกู้',
                                    size: 'xs',
                                    color: '#666666',
                                    wrap: true,
                                    margin: 'sm',
                                },
                            ],
                            paddingAll: '20px',
                        },
                    },
                },
            };
        } catch (error) {
            console.error('Error creating approval notification:', error);
            return null;
        }
    }

    /**
     * Task 7.4.5: Send notification on application rejection
     * 
     * @param loanId - Loan ID
     * @param reason - Rejection reason
     * @returns Notification message
     */
    async notifyApplicationRejected(loanId: string, reason: string): Promise<any> {
        try {
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                include: {
                    customer: {
                        select: {
                            lineUserId: true,
                        },
                    },
                },
            });

            if (!loan || !loan.customer.lineUserId) {
                return null;
            }

            return {
                lineUserId: loan.customer.lineUserId,
                message: {
                    type: 'flex',
                    altText: 'แจ้งเตือน: คำขอสินเชื่อไม่อนุมัติ',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '❌ ไม่อนุมัติ',
                                    weight: 'bold',
                                    size: 'lg',
                                    color: '#FFFFFF',
                                },
                            ],
                            backgroundColor: '#FF6B6B',
                            paddingAll: '20px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: `เลขที่คำขอ: ${loan.id}`,
                                    size: 'sm',
                                    color: '#666666',
                                    margin: 'md',
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '📋 เหตุผล',
                                    size: 'sm',
                                    weight: 'bold',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: reason,
                                    size: 'sm',
                                    color: '#666666',
                                    wrap: true,
                                    margin: 'sm',
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '💡 คุณสามารถยื่นคำขอใหม่ได้หลังจาก 30 วัน',
                                    size: 'xs',
                                    color: '#999999',
                                    wrap: true,
                                    margin: 'lg',
                                    align: 'center',
                                },
                                {
                                    type: 'text',
                                    text: 'หากมีข้อสงสัย กรุณาติดต่อเจ้าหน้าที่',
                                    size: 'xs',
                                    color: '#999999',
                                    wrap: true,
                                    margin: 'sm',
                                    align: 'center',
                                },
                            ],
                            paddingAll: '20px',
                        },
                    },
                },
            };
        } catch (error) {
            console.error('Error creating rejection notification:', error);
            return null;
        }
    }

    /**
     * Task 7.4.6: Send notification on document request
     * 
     * @param loanId - Loan ID
     * @param documents - List of required documents
     * @returns Notification message
     */
    async notifyDocumentRequest(loanId: string, documents: string[]): Promise<any> {
        try {
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                include: {
                    customer: {
                        select: {
                            lineUserId: true,
                        },
                    },
                },
            });

            if (!loan || !loan.customer.lineUserId) {
                return null;
            }

            const documentList = documents.map((doc, index) => `${index + 1}. ${doc}`).join('\n');

            return {
                lineUserId: loan.customer.lineUserId,
                message: {
                    type: 'flex',
                    altText: 'แจ้งเตือน: ต้องการเอกสารเพิ่มเติม',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '📄 ต้องการเอกสารเพิ่มเติม',
                                    weight: 'bold',
                                    size: 'lg',
                                    color: '#FFFFFF',
                                },
                            ],
                            backgroundColor: '#FFA500',
                            paddingAll: '20px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: `เลขที่คำขอ: ${loan.id}`,
                                    size: 'sm',
                                    color: '#666666',
                                    margin: 'md',
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '📋 เอกสารที่ต้องการ',
                                    size: 'sm',
                                    weight: 'bold',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: documentList,
                                    size: 'sm',
                                    color: '#666666',
                                    wrap: true,
                                    margin: 'sm',
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '⏰ กรุณาส่งเอกสารภายใน 7 วัน',
                                    size: 'xs',
                                    color: '#FF6B6B',
                                    wrap: true,
                                    margin: 'lg',
                                    align: 'center',
                                    weight: 'bold',
                                },
                                {
                                    type: 'text',
                                    text: 'เจ้าหน้าที่จะติดต่อเพื่อนัดรับเอกสาร',
                                    size: 'xs',
                                    color: '#999999',
                                    wrap: true,
                                    margin: 'sm',
                                    align: 'center',
                                },
                            ],
                            paddingAll: '20px',
                        },
                    },
                },
            };
        } catch (error) {
            console.error('Error creating document request notification:', error);
            return null;
        }
    }

    /**
     * Task 7.4.7: Send notification on disbursement completion
     * 
     * @param loanId - Loan ID
     * @param disbursementId - Disbursement ID
     * @returns Notification message
     */
    async notifyDisbursementCompleted(_loanId: string, disbursementId: string): Promise<any> {
        try {
            const disbursement = await prisma.loanDisbursement.findUnique({
                where: { id: disbursementId },
                include: {
                    loan: {
                        include: {
                            customer: {
                                select: {
                                    lineUserId: true,
                                },
                            },
                            paymentSchedule: {
                                where: {
                                    status: 'UNPAID',
                                },
                                orderBy: {
                                    paymentDate: 'asc',
                                },
                                take: 1,
                            },
                        },
                    },
                },
            });

            if (!disbursement || !disbursement.loan.customer.lineUserId) {
                return null;
            }

            const firstPaymentDate = disbursement.loan.paymentSchedule[0]?.paymentDate;

            return {
                lineUserId: disbursement.loan.customer.lineUserId,
                message: {
                    type: 'flex',
                    altText: 'แจ้งเตือน: เบิกจ่ายเงินกู้สำเร็จ',
                    contents: {
                        type: 'bubble',
                        header: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: '💰 เบิกจ่ายสำเร็จ!',
                                    weight: 'bold',
                                    size: 'xl',
                                    color: '#FFFFFF',
                                },
                            ],
                            backgroundColor: '#06C755',
                            paddingAll: '20px',
                        },
                        body: {
                            type: 'box',
                            layout: 'vertical',
                            contents: [
                                {
                                    type: 'text',
                                    text: `เลขที่สินเชื่อ: ${disbursement.loan.id}`,
                                    size: 'sm',
                                    color: '#666666',
                                    margin: 'md',
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'box',
                                    layout: 'vertical',
                                    contents: [
                                        {
                                            type: 'box',
                                            layout: 'baseline',
                                            contents: [
                                                {
                                                    type: 'text',
                                                    text: 'จำนวนเงิน:',
                                                    size: 'sm',
                                                    color: '#666666',
                                                    flex: 0,
                                                },
                                                {
                                                    type: 'text',
                                                    text: `${Number(disbursement.amount).toLocaleString('th-TH')} บาท`,
                                                    size: 'sm',
                                                    weight: 'bold',
                                                    align: 'end',
                                                },
                                            ],
                                            margin: 'lg',
                                        },
                                        {
                                            type: 'box',
                                            layout: 'baseline',
                                            contents: [
                                                {
                                                    type: 'text',
                                                    text: 'วันที่เบิกจ่าย:',
                                                    size: 'sm',
                                                    color: '#666666',
                                                    flex: 0,
                                                },
                                                {
                                                    type: 'text',
                                                    text: disbursement.disbursedAt ? new Date(disbursement.disbursedAt).toLocaleDateString('th-TH') : 'N/A',
                                                    size: 'sm',
                                                    weight: 'bold',
                                                    align: 'end',
                                                },
                                            ],
                                            margin: 'md',
                                        },
                                        {
                                            type: 'box',
                                            layout: 'baseline',
                                            contents: [
                                                {
                                                    type: 'text',
                                                    text: 'บัญชีที่โอน:',
                                                    size: 'sm',
                                                    color: '#666666',
                                                    flex: 0,
                                                },
                                                {
                                                    type: 'text',
                                                    text: disbursement.disbursementMethod || 'N/A',
                                                    size: 'sm',
                                                    weight: 'bold',
                                                    align: 'end',
                                                },
                                            ],
                                            margin: 'md',
                                        },
                                    ],
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '📅 งวดชำระแรก',
                                    size: 'sm',
                                    weight: 'bold',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: firstPaymentDate
                                        ? `วันที่: ${new Date(firstPaymentDate).toLocaleDateString('th-TH')}`
                                        : 'กำลังจัดทำตารางชำระ',
                                    size: 'sm',
                                    color: '#666666',
                                    margin: 'sm',
                                },
                                {
                                    type: 'separator',
                                    margin: 'lg',
                                },
                                {
                                    type: 'text',
                                    text: '💡 เราจะแจ้งเตือนก่อนถึงกำหนดชำระทุกครั้ง',
                                    size: 'xs',
                                    color: '#999999',
                                    wrap: true,
                                    margin: 'lg',
                                    align: 'center',
                                },
                            ],
                            paddingAll: '20px',
                        },
                    },
                },
            };
        } catch (error) {
            console.error('Error creating disbursement notification:', error);
            return null;
        }
    }

    /**
     * Task 7.4.9: Get application status timeline
     * 
     * @param loanId - Loan ID
     * @returns Application status with timeline
     */
    async getApplicationStatus(loanId: string): Promise<ApplicationStatus | null> {
        try {
            const loan = await prisma.loan.findUnique({
                where: { id: loanId },
                include: {
                    customer: {
                        select: {
                            id: true,
                            businessName: true,
                        },
                    },
                },
            });

            if (!loan) {
                return null;
            }

            // Build status history from approvalHistory JSON field
            const statusHistory: Array<{
                status: string;
                timestamp: Date;
                note?: string;
            }> = [];

            // Add creation
            statusHistory.push({
                status: 'SUBMITTED',
                timestamp: loan.createdAt,
                note: 'ยื่นคำขอสินเชื่อ',
            });

            // Parse approval history if exists
            if (loan.approvalHistory) {
                const history = JSON.parse(loan.approvalHistory as string);
                if (Array.isArray(history)) {
                    history.forEach((item: any) => {
                        statusHistory.push({
                            status: item.action || item.status,
                            timestamp: new Date(item.timestamp),
                            note: item.note || item.reason,
                        });
                    });
                }
            }

            // Add current status
            if (loan.status !== 'PENDING_APPROVAL') {
                statusHistory.push({
                    status: loan.status,
                    timestamp: loan.updatedAt,
                });
            }

            return {
                loanId: loan.id,
                customerId: loan.customerId,
                customerName: loan.customer.businessName,
                status: loan.status,
                principal: Number(loan.principal),
                interestRate: Number(loan.interestRate),
                termMonths: loan.termMonths,
                appliedAt: loan.createdAt,
                statusHistory,
            };
        } catch (error) {
            console.error('Error getting application status:', error);
            return null;
        }
    }
}
