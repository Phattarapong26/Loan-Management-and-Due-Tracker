import { KPIRepository } from '../repositories/kpi.repository';

export interface BranchKPIs {
    branchId: string;
    branchName: string;
    period: { start: Date; end: Date };
    totalLoans: number;
    totalDisbursement: number;
    outstandingBalance: number;
    collectionRate: number;
    nplRatio: number;
    nplCount: number;
    activeCustomers: number;
    newLoansThisMonth: number;
    comparison: {
        previousDay: { totalLoans: number; disbursement: number };
        previousMonth: { totalLoans: number; disbursement: number; collectionRate: number; nplRatio: number };
    };
    alerts: Array<{ type: 'NPL' | 'COLLECTION' | 'DISBURSEMENT'; severity: 'HIGH' | 'MEDIUM' | 'LOW'; message: string }>;
}

export class KPIDashboardService {
    private kpiRepository: KPIRepository;

    constructor() {
        this.kpiRepository = new KPIRepository();
    }

    async getBranchKPIs(branchId: string): Promise<BranchKPIs> {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const branchName = await this.kpiRepository.getBranchName(branchId);
            if (!branchName) throw new Error('Branch not found');

            const totalLoans = await this.kpiRepository.countLoansByBranch(branchId, ['ACTIVE', 'APPROVED', 'NPL']);

            const thisMonthData = await this.kpiRepository.aggregateLoansByBranch(branchId, ['ACTIVE', 'APPROVED', 'NPL'], { gte: startOfMonth, lte: endOfMonth });
            const totalDisbursement = thisMonthData.sum;
            const newLoansThisMonth = thisMonthData.count;

            const outstandingData = await this.kpiRepository.aggregateLoansByBranch(branchId, ['ACTIVE', 'NPL']);
            const outstandingBalance = outstandingData.sum;

            const [receivedAmount, scheduledAmount] = await Promise.all([
                this.kpiRepository.aggregatePaymentsByBranch(branchId, { gte: startOfMonth, lte: endOfMonth }),
                this.kpiRepository.aggregateSchedulesByBranch(branchId, { gte: startOfMonth, lte: endOfMonth }),
            ]);
            const collectionRate = scheduledAmount > 0 ? (receivedAmount / scheduledAmount) * 100 : 0;

            const nplLoans = await this.kpiRepository.findNPLLoansByBranch(branchId, ninetyDaysAgo);
            const nplCount = nplLoans.length;
            const nplBalance = nplLoans.reduce((sum: number, loan: any) => sum + Number(loan.outstandingBalance || 0), 0);
            const nplRatio = outstandingBalance > 0 ? (nplBalance / outstandingBalance) * 100 : 0;

            const activeCustomers = await this.kpiRepository.countActiveCustomersByBranch(branchId);

            const [prevDayLoans, prevDayData, prevMonthLoans, prevMonthData, prevMonthReceived, prevMonthScheduled] = await Promise.all([
                this.kpiRepository.countLoansByBranch(branchId, ['ACTIVE', 'APPROVED', 'NPL']),
                this.kpiRepository.aggregateLoansByBranch(branchId, ['ACTIVE', 'APPROVED', 'NPL'], { gte: yesterday, lte: now }),
                this.kpiRepository.countLoansByBranch(branchId, ['ACTIVE', 'APPROVED', 'NPL']),
                this.kpiRepository.aggregateLoansByBranch(branchId, ['ACTIVE', 'APPROVED', 'NPL'], { gte: startOfPreviousMonth, lte: endOfPreviousMonth }),
                this.kpiRepository.aggregatePaymentsByBranch(branchId, { gte: startOfPreviousMonth, lte: endOfPreviousMonth }),
                this.kpiRepository.aggregateSchedulesByBranch(branchId, { gte: startOfPreviousMonth, lte: endOfPreviousMonth }),
            ]);
            const previousMonthCollectionRate = prevMonthScheduled > 0 ? (prevMonthReceived / prevMonthScheduled) * 100 : 0;

            const alerts: BranchKPIs['alerts'] = [];
            if (nplRatio > 5) alerts.push({ type: 'NPL', severity: nplRatio > 10 ? 'HIGH' : 'MEDIUM', message: `⚠️ NPL Ratio สูง: ${nplRatio.toFixed(2)}% (เกินเกณฑ์ 5%)` });
            if (collectionRate < 90) alerts.push({ type: 'COLLECTION', severity: collectionRate < 80 ? 'HIGH' : 'MEDIUM', message: `⚠️ Collection Rate ต่ำ: ${collectionRate.toFixed(2)}% (ต่ำกว่าเกณฑ์ 90%)` });

            return {
                branchId, branchName,
                period: { start: startOfMonth, end: endOfMonth },
                totalLoans, totalDisbursement, outstandingBalance, collectionRate, nplRatio, nplCount, activeCustomers, newLoansThisMonth,
                comparison: {
                    previousDay: { totalLoans: prevDayLoans, disbursement: prevDayData.sum },
                    previousMonth: { totalLoans: prevMonthLoans, disbursement: prevMonthData.sum, collectionRate: previousMonthCollectionRate, nplRatio: 0 },
                },
                alerts,
            };
        } catch (error) {
            console.error('Error getting branch KPIs:', error);
            throw error;
        }
    }

    async getDrillDownData(branchId: string, metric: 'NPL' | 'COLLECTION' | 'DISBURSEMENT' | 'CUSTOMERS'): Promise<any> {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        switch (metric) {
            case 'NPL': {
                const loans = await this.kpiRepository.findNPLLoansByBranch(branchId, ninetyDaysAgo);
                return loans.map((loan: any) => ({
                    loanNumber: loan.id,
                    customerName: loan.customer?.user ? `${loan.customer.user.firstName} ${loan.customer.user.lastName}` : loan.customer?.businessName,
                    outstandingBalance: Number(loan.outstandingBalance),
                    daysOverdue: loan.paymentSchedule?.[0] ? Math.floor((now.getTime() - new Date(loan.paymentSchedule[0].paymentDate).getTime()) / 86400000) : 0,
                }));
            }
            case 'COLLECTION': {
                const payments = await this.kpiRepository.findRecentPaymentsByBranch(branchId, startOfMonth, 20);
                return payments.map((p: any) => ({
                    date: p.paymentDate, loanNumber: p.loan.id,
                    customerName: p.loan.customer.user ? `${p.loan.customer.user.firstName} ${p.loan.customer.user.lastName}` : p.loan.customer.businessName,
                    amount: Number(p.amount), method: p.paymentMethod,
                }));
            }
            case 'DISBURSEMENT': {
                const disbursements = await this.kpiRepository.findRecentDisbursementsByBranch(branchId, startOfMonth, 20);
                return disbursements.map((d: any) => ({
                    date: d.disbursedAt, loanNumber: d.loan.id,
                    customerName: d.loan.customer.user ? `${d.loan.customer.user.firstName} ${d.loan.customer.user.lastName}` : d.loan.customer.businessName,
                    amount: Number(d.amount), status: d.status,
                }));
            }
            case 'CUSTOMERS': {
                const customers = await this.kpiRepository.findActiveCustomersWithLoans(branchId, 20);
                return customers.map((c: any) => ({
                    name: c.user ? `${c.user.firstName} ${c.user.lastName}` : c.businessName,
                    phoneNumber: c.user?.phoneNumber || c.phone,
                    totalLoans: c.loans.length,
                    totalOutstanding: c.loans.reduce((sum: number, l: any) => sum + Number(l.outstandingBalance || 0), 0),
                    hasOverdue: c.loans.some((l: any) => l.status === 'NPL'),
                }));
            }
            default: throw new Error('Invalid metric');
        }
    }

    async generateTrendChart(branchId: string, metric: 'disbursement' | 'collection' | 'npl', months: number = 6): Promise<string> {
        const now = new Date();
        const dataPoints: Array<{ month: string; value: number }> = [];

        for (let i = months - 1; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const ninetyDaysAgo = new Date(monthEnd);
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            let value = 0;
            if (metric === 'disbursement') {
                const data = await this.kpiRepository.aggregateLoansByBranch(branchId, ['ACTIVE', 'APPROVED', 'NPL'], { gte: monthStart, lte: monthEnd });
                value = data.sum;
            } else if (metric === 'collection') {
                const [received, scheduled] = await Promise.all([
                    this.kpiRepository.aggregatePaymentsByBranch(branchId, { gte: monthStart, lte: monthEnd }),
                    this.kpiRepository.aggregateSchedulesByBranch(branchId, { gte: monthStart, lte: monthEnd }),
                ]);
                value = scheduled > 0 ? (received / scheduled) * 100 : 0;
            } else {
                const nplLoans = await this.kpiRepository.findNPLLoansByBranch(branchId, ninetyDaysAgo);
                const outData = await this.kpiRepository.aggregateLoansByBranch(branchId, ['ACTIVE', 'NPL']);
                const nplBalance = nplLoans.reduce((sum: number, l: any) => sum + Number(l.outstandingBalance || 0), 0);
                value = outData.sum > 0 ? (nplBalance / outData.sum) * 100 : 0;
            }

            dataPoints.push({ month: monthStart.toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }), value: Math.round(value * 100) / 100 });
        }

        const chartConfig = {
            type: 'line',
            data: {
                labels: dataPoints.map(d => d.month),
                datasets: [{ label: metric === 'disbursement' ? 'ยอดเบิกจ่าย (บาท)' : metric === 'collection' ? 'Collection Rate (%)' : 'NPL Ratio (%)', data: dataPoints.map(d => d.value), borderColor: metric === 'disbursement' ? '#06C755' : metric === 'collection' ? '#2196F3' : '#FF6B6B', borderWidth: 2, fill: true, tension: 0.4 }],
            },
        };

        return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&width=500&height=300&backgroundColor=white`;
    }
}
