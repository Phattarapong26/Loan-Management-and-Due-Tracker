/**
 * Overpayment Simulator Service for LINE
 * Calculates the impact of extra payments on loans
 */

export interface OverpaymentSimulationInput {
    currentBalance: number;
    monthlyPayment: number;
    interestRate: number;
    remainingMonths: number;
    extraPayment: number;
}

export interface OverpaymentSimulationResult {
    originalTotalInterest: number;
    originalMonthsRemaining: number;
    newTotalInterest: number;
    newMonthsRemaining: number;
    interestSaved: number;
    monthsSaved: number;
    newMonthlyPayment: number;
}

export class OverpaymentSimulatorService {
    /**
     * Calculate overpayment impact
     */
    static calculateOverpaymentImpact(input: OverpaymentSimulationInput): OverpaymentSimulationResult | null {
        const { currentBalance, monthlyPayment, interestRate, remainingMonths, extraPayment } = input;

        // Enhanced validation
        if (extraPayment <= 0) {
            console.log('Invalid extra payment: must be greater than 0');
            return null;
        }
        
        if (extraPayment >= currentBalance) {
            console.log('Invalid extra payment: cannot exceed current balance');
            return null;
        }

        if (monthlyPayment <= 0 || interestRate < 0 || remainingMonths <= 0) {
            console.log('Invalid loan parameters');
            return null;
        }

        const monthlyRate = interestRate / 100 / 12;

        // Calculate original scenario
        let originalBalance = currentBalance;
        let originalTotalInterest = 0;
        let originalMonths = 0;

        while (originalBalance > 0.01 && originalMonths < remainingMonths) {
            const interestPayment = originalBalance * monthlyRate;
            const principalPayment = Math.min(monthlyPayment - interestPayment, originalBalance);
            
            // Ensure we're making progress
            if (principalPayment <= 0) {
                console.log('Monthly payment too low to cover interest');
                return null;
            }
            
            originalTotalInterest += interestPayment;
            originalBalance -= principalPayment;
            originalMonths++;
        }

        // Calculate new scenario with extra payment applied immediately
        let newBalance = currentBalance - extraPayment;
        let newTotalInterest = 0;
        let newMonths = 0;

        while (newBalance > 0.01 && newMonths < remainingMonths) {
            const interestPayment = newBalance * monthlyRate;
            const principalPayment = Math.min(monthlyPayment - interestPayment, newBalance);
            
            // Ensure we're making progress
            if (principalPayment <= 0) {
                break;
            }
            
            newTotalInterest += interestPayment;
            newBalance -= principalPayment;
            newMonths++;
        }

        const interestSaved = Math.max(0, originalTotalInterest - newTotalInterest);
        const monthsSaved = Math.max(0, originalMonths - newMonths);

        return {
            originalTotalInterest: Math.round(originalTotalInterest),
            originalMonthsRemaining: originalMonths,
            newTotalInterest: Math.round(newTotalInterest),
            newMonthsRemaining: newMonths,
            interestSaved: Math.round(interestSaved),
            monthsSaved,
            newMonthlyPayment: monthlyPayment,
        };
    }

    /**
     * Format currency for Thai Baht
     */
    static formatCurrency(amount: number): string {
        return amount.toLocaleString('th-TH', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    }

    /**
     * Create LINE Flex Message for overpayment simulation result
     */
    static createSimulationMessage(
        result: OverpaymentSimulationResult,
        extraPayment: number,
        contractNumber: string
    ): any {
        try {
            const formatCurrency = this.formatCurrency;

            // Validate result data
            if (!result || typeof result.interestSaved !== 'number' || typeof result.monthsSaved !== 'number') {
                console.error('Invalid overpayment result data:', result);
                return {
                    type: 'text',
                    text: '❌ เกิดข้อผิดพลาดในการสร้างรายงาน กรุณาลองใหม่อีกครั้ง'
                };
            }

            console.log('Creating simulation message with:', { 
                result, 
                extraPayment, 
                contractNumber 
            });

            return {
                type: 'flex',
                altText: `คำนวณผลกระทบจากการจ่ายเกิน ${formatCurrency(extraPayment)} บาท`,
                contents: {
                    type: 'bubble',
                    size: 'mega',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '🧮 คำนวณการจ่ายเกิน',
                                weight: 'bold',
                                size: 'xl',
                                color: '#FFFFFF',
                            },
                            {
                                type: 'text',
                                text: contractNumber,
                                size: 'xs',
                                color: '#FFFFFF',
                                margin: 'sm',
                            },
                        ],
                        paddingAll: '20px',
                        backgroundColor: '#138F3E',
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            // Extra Payment Amount
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '💰 จำนวนที่จ่ายเพิ่ม',
                                        size: 'sm',
                                        color: '#666666',
                                        weight: 'bold',
                                    },
                                    {
                                        type: 'text',
                                        text: `${formatCurrency(extraPayment)} บาท`,
                                        size: 'xxl',
                                        weight: 'bold',
                                        color: '#138F3E',
                                        margin: 'sm',
                                    },
                                ],
                                backgroundColor: '#F0F9F4',
                                paddingAll: '15px',
                                cornerRadius: '10px',
                            },
                            {
                                type: 'separator',
                                margin: 'lg',
                            },
                            // Savings Summary
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '📊 ผลประหยัด',
                                        size: 'md',
                                        weight: 'bold',
                                        color: '#333333',
                                    },
                                    // Interest Saved
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'box',
                                                layout: 'vertical',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: '💵 ประหยัดดอกเบี้ย',
                                                        size: 'sm',
                                                        color: '#666666',
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${formatCurrency(result.interestSaved)} บาท`,
                                                        size: 'lg',
                                                        weight: 'bold',
                                                        color: '#10B981',
                                                        margin: 'xs',
                                                    },
                                                ],
                                                flex: 1,
                                            },
                                            {
                                                type: 'box',
                                                layout: 'vertical',
                                                contents: [
                                                    {
                                                        type: 'text',
                                                        text: '📅 ลดระยะเวลา',
                                                        size: 'sm',
                                                        color: '#666666',
                                                    },
                                                    {
                                                        type: 'text',
                                                        text: `${result.monthsSaved} เดือน`,
                                                        size: 'lg',
                                                        weight: 'bold',
                                                        color: '#138F3E',
                                                        margin: 'xs',
                                                    },
                                                ],
                                                flex: 1,
                                            },
                                        ],
                                        margin: 'md',
                                        spacing: 'md',
                                    },
                                ],
                                margin: 'lg',
                            },
                            {
                                type: 'separator',
                                margin: 'lg',
                            },
                            // Comparison
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '📈 เปรียบเทียบ',
                                        size: 'md',
                                        weight: 'bold',
                                        color: '#333333',
                                    },
                                    // Interest Comparison
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'ดอกเบี้ยรวม',
                                                size: 'sm',
                                                color: '#666666',
                                                flex: 2,
                                            },
                                            {
                                                type: 'text',
                                                text: formatCurrency(result.originalTotalInterest),
                                                size: 'sm',
                                                color: '#999999',
                                                align: 'end',
                                                flex: 2,
                                                decoration: 'line-through',
                                            },
                                            {
                                                type: 'text',
                                                text: formatCurrency(result.newTotalInterest),
                                                size: 'sm',
                                                weight: 'bold',
                                                color: '#10B981',
                                                align: 'end',
                                                flex: 2,
                                            },
                                        ],
                                        margin: 'md',
                                    },
                                    // Duration Comparison
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: 'ระยะเวลา',
                                                size: 'sm',
                                                color: '#666666',
                                                flex: 2,
                                            },
                                            {
                                                type: 'text',
                                                text: `${result.originalMonthsRemaining} เดือน`,
                                                size: 'sm',
                                                color: '#999999',
                                                align: 'end',
                                                flex: 2,
                                                decoration: 'line-through',
                                            },
                                            {
                                                type: 'text',
                                                text: `${result.newMonthsRemaining} เดือน`,
                                                size: 'sm',
                                                weight: 'bold',
                                                color: '#138F3E',
                                                align: 'end',
                                                flex: 2,
                                            },
                                        ],
                                        margin: 'sm',
                                    },
                                ],
                                margin: 'lg',
                            },
                            // Recommendation
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '💡 คำแนะนำ',
                                        size: 'sm',
                                        weight: 'bold',
                                        color: '#138F3E',
                                    },
                                    {
                                        type: 'text',
                                        text: 'การชำระเงินเพิ่มจะช่วยลดภาระดอกเบี้ยและทำให้หมดหนี้เร็วขึ้น',
                                        size: 'xs',
                                        color: '#666666',
                                        wrap: true,
                                        margin: 'sm',
                                    },
                                ],
                                backgroundColor: '#FEF3C7',
                                paddingAll: '12px',
                                cornerRadius: '8px',
                                margin: 'lg',
                            },
                        ],
                        paddingAll: '20px',
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'text',
                                text: '⚠️ การคำนวณนี้เป็นเพียงการประมาณการ',
                                size: 'xxs',
                                color: '#999999',
                                align: 'center',
                                wrap: true,
                            },
                        ],
                        paddingAll: '12px',
                    },
                },
            };
        } catch (error) {
            console.error('Error creating simulation message:', error);
            return {
                type: 'text',
                text: `❌ เกิดข้อผิดพลาดในการสร้างรายงาน\n\nรายละเอียด: ${error instanceof Error ? error.message : 'ไม่ทราบสาเหตุ'}\n\nกรุณาลองใหม่อีกครั้ง`
            };
        }
    }

    /**
     * Create LINE Flex Message for overpayment options
     */
    static createOverpaymentOptionsMessage(loanId: string, contractNumber: string): any {
        const quickAmounts = [10000, 20000, 50000, 100000];

        return {
            type: 'flex',
            altText: 'คำนวณการจ่ายเกิน',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '🧮 คำนวณการจ่ายเกิน',
                            weight: 'bold',
                            size: 'xl',
                            color: '#FFFFFF',
                        },
                        {
                            type: 'text',
                            text: contractNumber,
                            size: 'xs',
                            color: '#FFFFFF',
                            margin: 'sm',
                        },
                    ],
                    paddingAll: '20px',
                    backgroundColor: '#138F3E',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: 'เลือกจำนวนเงินที่ต้องการจ่ายเพิ่ม',
                            size: 'sm',
                            color: '#666666',
                            wrap: true,
                        },
                        {
                            type: 'text',
                            text: 'เพื่อดูว่าจะช่วยประหยัดดอกเบี้ยและลดระยะเวลาได้เท่าไหร่',
                            size: 'xs',
                            color: '#999999',
                            wrap: true,
                            margin: 'sm',
                        },
                        {
                            type: 'separator',
                            margin: 'lg',
                        },
                        ...quickAmounts.map((amount, index) => ({
                            type: 'button',
                            action: {
                                type: 'postback',
                                label: `💰 ${this.formatCurrency(amount)} บาท`,
                                data: `action=calculate_overpayment&loan_id=${loanId}&amount=${amount}`,
                                displayText: `คำนวณการจ่ายเพิ่ม ${this.formatCurrency(amount)} บาท`,
                            },
                            style: 'primary',
                            color: '#138F3E',
                            margin: index === 0 ? 'lg' : 'sm',
                        })),
                    ],
                    paddingAll: '20px',
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '💡 เลือกจำนวนเงินเพื่อดูการคำนวณ',
                            size: 'xxs',
                            color: '#999999',
                            align: 'center',
                        },
                    ],
                    paddingAll: '12px',
                },
            },
        };
    }
}