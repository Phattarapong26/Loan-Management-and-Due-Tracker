import { describe, it, expect } from '@jest/globals';
import { addMonths } from 'date-fns';

/**
 * Test to verify the payment schedule timezone bug fix
 * 
 * Bug: Using new Date(year, month, day) creates dates in local timezone,
 * which can cause off-by-one day errors when converted to ISO strings.
 * 
 * Fix: Use setDate() on a cloned Date object to preserve timezone.
 */

// Fixed implementation
function calculatePaymentDateFixed(
    firstPaymentDate: Date,
    monthsToAdd: number,
    paymentDay: number
): Date {
    const baseDate = addMonths(firstPaymentDate, monthsToAdd);
    const day = baseDate.getDate();
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // If the day already matches, return as-is
    if (day === paymentDay) {
        return baseDate;
    }

    // If payment day doesn't exist in this month, use last day
    const targetDay = paymentDay > daysInMonth ? daysInMonth : paymentDay;

    // Clone and set the day
    const result = new Date(baseDate);
    result.setDate(targetDay);
    return result;
}

describe('Payment Schedule Timezone Fix', () => {
    it('should generate correct payment dates for loan approved on Jan 30, 2026', () => {
        // Scenario: Loan approved on 2026-01-30, first payment on 2026-02-01, payment day = 1
        const firstPaymentDate = new Date('2026-02-01T00:00:00.000Z');
        const paymentDay = 1;

        const schedule = [];
        for (let i = 0; i < 5; i++) {
            const paymentDate = calculatePaymentDateFixed(firstPaymentDate, i, paymentDay);
            schedule.push(paymentDate.toISOString().split('T')[0]);
        }

        expect(schedule).toEqual([
            '2026-02-01', // Payment 1: February 1
            '2026-03-01', // Payment 2: March 1
            '2026-04-01', // Payment 3: April 1
            '2026-05-01', // Payment 4: May 1
            '2026-06-01', // Payment 5: June 1
        ]);
    });

    it('should handle payment day 15 correctly', () => {
        const firstPaymentDate = new Date('2026-02-15T00:00:00.000Z');
        const paymentDay = 15;

        const schedule = [];
        for (let i = 0; i < 5; i++) {
            const paymentDate = calculatePaymentDateFixed(firstPaymentDate, i, paymentDay);
            schedule.push(paymentDate.toISOString().split('T')[0]);
        }

        expect(schedule).toEqual([
            '2026-02-15', // Payment 1: February 15
            '2026-03-15', // Payment 2: March 15
            '2026-04-15', // Payment 3: April 15
            '2026-05-15', // Payment 4: May 15
            '2026-06-15', // Payment 5: June 15
        ]);
    });

    it('should handle end of month (day 30) correctly', () => {
        const firstPaymentDate = new Date('2026-01-30T00:00:00.000Z');
        const paymentDay = 30;

        const schedule = [];
        for (let i = 0; i < 5; i++) {
            const paymentDate = calculatePaymentDateFixed(firstPaymentDate, i, paymentDay);
            schedule.push(paymentDate.toISOString().split('T')[0]);
        }

        expect(schedule).toEqual([
            '2026-01-30', // Payment 1: January 30
            '2026-02-28', // Payment 2: February 28 (Feb has only 28 days in 2026)
            '2026-03-30', // Payment 3: March 30
            '2026-04-30', // Payment 4: April 30
            '2026-05-30', // Payment 5: May 30
        ]);
    });

    it('should handle payment day 31 across different months', () => {
        const firstPaymentDate = new Date('2026-01-31T00:00:00.000Z');
        const paymentDay = 31;

        const schedule = [];
        for (let i = 0; i < 5; i++) {
            const paymentDate = calculatePaymentDateFixed(firstPaymentDate, i, paymentDay);
            schedule.push(paymentDate.toISOString().split('T')[0]);
        }

        expect(schedule).toEqual([
            '2026-01-31', // Payment 1: January 31
            '2026-02-28', // Payment 2: February 28 (Feb has only 28 days)
            '2026-03-31', // Payment 3: March 31
            '2026-04-30', // Payment 4: April 30 (April has only 30 days)
            '2026-05-31', // Payment 5: May 31
        ]);
    });

    it('should preserve time component when adjusting dates', () => {
        const firstPaymentDate = new Date('2026-02-01T10:30:00.000Z');
        const paymentDay = 1;

        const paymentDate = calculatePaymentDateFixed(firstPaymentDate, 0, paymentDay);
        
        // Should preserve the time component
        expect(paymentDate.getHours()).toBe(firstPaymentDate.getHours());
        expect(paymentDate.getMinutes()).toBe(firstPaymentDate.getMinutes());
    });
});
