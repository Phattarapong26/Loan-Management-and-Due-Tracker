export type CreditGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'RISKY' | 'CRITICAL';

export interface CreditAssessment {
    grade: CreditGrade;
    score: number; // 0-100 (higher = healthier / lower risk)
    reasons: string[];
    nextActions: string[];
}

type CreditFactors = {
    // Payment behavior
    daysUntilDue: number; // negative = overdue (schedule-level)
    loanOverdueDays?: number; // loan-level overdue days (if loan already has overdue elsewhere)
    scheduleStatus?: string; // UNPAID | OVERDUE | PARTIAL | ...
    loanStatus?: string; // ACTIVE | DEFAULTED | NPL | ...
    overdueInstallmentsCount?: number; // number of installments currently overdue (unpaid and past due)
    delinquencyCount?: number; // how many installments were ever late/overdue (history)
    maxDpd?: number; // maximum days past due observed (history)
    paidInstallmentsCount?: number; // total paid installments (history)
    onTimePaidCount?: number; // paid on/before due date (history)
    prepaidInstallmentsCount?: number; // paid for future-due installments (prepaid)

    // Financial health
    dscr?: number;

    // Credit bureau / utilization
    nplStatus?: boolean;
    creditUtilization?: number; // 0-100%

    // Business profile
    industryCode?: string;
    businessAge?: number;
};

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function isHighRiskIndustry(code?: string): boolean {
    if (!code) return false;
    const highRisk = ['F', '41', '42', '43', 'L', '68', 'I', '55', '56']; // Construction, Real Estate, Hospitality
    return highRisk.some((risk) => code.startsWith(risk));
}

function scoreNCB(f: CreditFactors): number {
    // NCB bureau data only — loan system status handled in scoreOverdue
    if (f.nplStatus) return -30;
    const u = f.creditUtilization;
    if (u === undefined || u === null || !Number.isFinite(u)) return 0;
    if (u > 80) return -15;
    if (u > 50) return -10;
    if (u < 30) return 30;
    return 0;
}

function scoreDSCR(f: CreditFactors): number {
    const d = f.dscr;
    if (d === undefined || d === null || !Number.isFinite(d)) return 0;
    if (d >= 1.5) return 30;
    if (d >= 1.25) return 20;
    if (d >= 1.2) return 10;
    return -30;
}

function scoreOverdue(f: CreditFactors): number {
    // loanStatus penalty — only here, not in scoreNCB
    const loanStatus = f.loanStatus ? String(f.loanStatus).toUpperCase() : '';
    // NPL = confirmed non-performing → max penalty regardless of overdueDays
    if (loanStatus === 'NPL') return -30;
    // DEFAULTED = legal/write-off status, penalize based on actual overdue days
    // (don't double-penalize if overdueDays is already 0 after restructuring)

    // Penalize only when truly overdue (schedule or loan-level)
    const scheduleOverdueDays = f.daysUntilDue < 0 ? Math.abs(f.daysUntilDue) : 0;
    const loanOverdueDays = f.loanOverdueDays && Number.isFinite(f.loanOverdueDays) ? Math.max(0, f.loanOverdueDays) : 0;
    const overdueDays = Math.max(scheduleOverdueDays, loanOverdueDays);

    if (overdueDays === 0) return loanStatus === 'DEFAULTED' ? -10 : 30; // DEFAULTED ไม่ได้ +30 แม้ไม่มี overdue
    if (overdueDays <= 7) return 20;
    if (overdueDays <= 30) return 0;
    if (overdueDays <= 60) return -20;
    return -30;
}

function scoreIndustry(f: CreditFactors): number {
    if (!f.industryCode) return 0;
    return isHighRiskIndustry(f.industryCode) ? -10 : 0;
}

function gradeFromHealthScore(score: number): CreditGrade {
    if (score >= 85) return 'EXCELLENT';
    if (score >= 70) return 'GOOD';
    if (score >= 50) return 'FAIR';
    if (score >= 30) return 'RISKY';
    return 'CRITICAL';
}

function scorePaymentStatus(f: CreditFactors): number {
    if (!f.scheduleStatus) return 0;
    const status = String(f.scheduleStatus).toUpperCase();
    if (status === 'PARTIAL') return -10;
    if (status === 'OVERDUE') return -10;
    return 0;
}

function scoreDelinquencyHistory(f: CreditFactors): number {
    let score = 0;

    const overdueInstallments = f.overdueInstallmentsCount;
    if (typeof overdueInstallments === 'number' && Number.isFinite(overdueInstallments)) {
        if (overdueInstallments >= 3) score -= 15;
        else if (overdueInstallments >= 2) score -= 10;
    }

    const delinquencyCount = f.delinquencyCount;
    if (typeof delinquencyCount === 'number' && Number.isFinite(delinquencyCount)) {
        if (delinquencyCount >= 6) score -= 10;
        else if (delinquencyCount >= 3) score -= 5;
    }

    const maxDpd = f.maxDpd;
    if (typeof maxDpd === 'number' && Number.isFinite(maxDpd)) {
        if (maxDpd >= 90) score -= 30;
        else if (maxDpd >= 60) score -= 15;
        else if (maxDpd >= 30) score -= 10;
        else if (maxDpd >= 7) score -= 5;
    }

    return score;
}

function scorePositivePaymentHistory(f: CreditFactors): number {
    const paid = typeof f.paidInstallmentsCount === 'number' && Number.isFinite(f.paidInstallmentsCount)
        ? Math.max(0, Math.floor(f.paidInstallmentsCount))
        : 0;
    const onTime = typeof f.onTimePaidCount === 'number' && Number.isFinite(f.onTimePaidCount)
        ? Math.max(0, Math.floor(f.onTimePaidCount))
        : 0;
    const prepaid = typeof f.prepaidInstallmentsCount === 'number' && Number.isFinite(f.prepaidInstallmentsCount)
        ? Math.max(0, Math.floor(f.prepaidInstallmentsCount))
        : 0;

    if (paid < 3) return 0; // not enough history to reward

    const onTimeRate = paid > 0 ? clamp(onTime / paid, 0, 1) : 0;
    let score = 0;

    // Reward consistent on-time behavior (bigger reward only when enough samples exist)
    if (paid >= 6) {
        if (onTimeRate >= 0.95) score += 20;
        else if (onTimeRate >= 0.8) score += 15;
        else if (onTimeRate >= 0.6) score += 10;
    } else {
        if (onTimeRate >= 0.95) score += 10;
        else if (onTimeRate >= 0.8) score += 7;
        else if (onTimeRate >= 0.6) score += 5;
    }

    // Reward prepayment (shows liquidity / commitment)
    if (prepaid >= 3) score += 10;
    else if (prepaid >= 1) score += 5;

    return score;
}

function buildReasons(f: CreditFactors, healthScore: number): string[] {
    const reasons: string[] = [];

    const scheduleOverdueDays = f.daysUntilDue < 0 ? Math.abs(f.daysUntilDue) : 0;
    const loanOverdueDays = f.loanOverdueDays && Number.isFinite(f.loanOverdueDays) ? Math.max(0, f.loanOverdueDays) : 0;
    const overdueDays = Math.max(scheduleOverdueDays, loanOverdueDays);
    if (overdueDays > 0) {
        reasons.push(`ค้างชำระ ${overdueDays} วัน`);
    } else {
        reasons.push('ยังไม่ค้างชำระ');
    }

    if (f.loanStatus) {
        const loanStatus = String(f.loanStatus).toUpperCase();
        if (loanStatus === 'DEFAULTED') reasons.push('สถานะสัญญา: Defaulted');
        if (loanStatus === 'NPL') reasons.push('สถานะสัญญา: NPL');
    }

    if (f.scheduleStatus) {
        const scheduleStatus = String(f.scheduleStatus).toUpperCase();
        if (scheduleStatus === 'PARTIAL') reasons.push('มีงวดที่ชำระไม่ครบ (Partial)');
    }

    if (typeof f.overdueInstallmentsCount === 'number' && Number.isFinite(f.overdueInstallmentsCount)) {
        if (f.overdueInstallmentsCount >= 2) reasons.push(`ค้างชำระหลายงวด (${f.overdueInstallmentsCount} งวด)`);
    }

    if (typeof f.maxDpd === 'number' && Number.isFinite(f.maxDpd) && f.maxDpd > 0) {
        reasons.push(`ประวัติค้างสูงสุด (Max DPD) ${Math.round(f.maxDpd)} วัน`);
    }

    if (typeof f.delinquencyCount === 'number' && Number.isFinite(f.delinquencyCount)) {
        if (f.delinquencyCount >= 3) reasons.push(`ประวัติค้างซ้ำ ${f.delinquencyCount} ครั้ง`);
    }

    if (
        typeof f.paidInstallmentsCount === 'number' &&
        Number.isFinite(f.paidInstallmentsCount) &&
        typeof f.onTimePaidCount === 'number' &&
        Number.isFinite(f.onTimePaidCount) &&
        f.paidInstallmentsCount >= 3
    ) {
        reasons.push(`ชำระตรงเวลา ${Math.max(0, Math.floor(f.onTimePaidCount))}/${Math.max(0, Math.floor(f.paidInstallmentsCount))} งวด`);
    }

    if (typeof f.prepaidInstallmentsCount === 'number' && Number.isFinite(f.prepaidInstallmentsCount)) {
        if (f.prepaidInstallmentsCount >= 1) reasons.push(`ชำระล่วงหน้า ${Math.max(0, Math.floor(f.prepaidInstallmentsCount))} งวด`);
    }

    if (f.nplStatus) {
        reasons.push('พบสถานะ NPL จากข้อมูลเครดิต');
    }

    if (f.creditUtilization !== undefined && Number.isFinite(f.creditUtilization)) {
        if (f.creditUtilization > 80) reasons.push(`ใช้วงเงินเครดิตสูง (${Math.round(f.creditUtilization)}%)`);
        else if (f.creditUtilization < 30) reasons.push(`ใช้วงเงินเครดิตต่ำ (${Math.round(f.creditUtilization)}%)`);
    }

    if (f.dscr !== undefined && Number.isFinite(f.dscr)) {
        if (f.dscr < 1.2) reasons.push(`DSCR ต่ำ (${f.dscr.toFixed(2)}x)`);
        else if (f.dscr >= 1.5) reasons.push(`DSCR ดีเยี่ยม (${f.dscr.toFixed(2)}x)`);
        else reasons.push(`DSCR ${f.dscr.toFixed(2)}x`);
    }

    if (isHighRiskIndustry(f.industryCode)) {
        reasons.push('อยู่ในกลุ่มอุตสาหกรรมเสี่ยงสูง');
    }

    if (f.businessAge !== undefined && Number.isFinite(f.businessAge) && f.businessAge <= 2) {
        reasons.push('ธุรกิจอายุยังน้อย (≤ 2 ปี)');
    }

    // Add a summary reason last (helps UI)
    reasons.push(`คะแนนสุขภาพเครดิต ${healthScore}/100`);

    return reasons.slice(0, 6);
}

function buildNextActions(grade: CreditGrade, f: CreditFactors): string[] {
    const scheduleOverdueDays = f.daysUntilDue < 0 ? Math.abs(f.daysUntilDue) : 0;
    const loanOverdueDays = f.loanOverdueDays && Number.isFinite(f.loanOverdueDays) ? Math.max(0, f.loanOverdueDays) : 0;
    const overdueDays = Math.max(scheduleOverdueDays, loanOverdueDays);

    if (grade === 'EXCELLENT') {
        return ['ติดตามตามรอบปกติ', 'ยืนยันวันนัดชำระล่วงหน้า 1–3 วัน'];
    }
    if (grade === 'GOOD') {
        return ['ติดตามตามรอบปกติ', 'ส่งเตือนก่อนครบกำหนด 1 วัน'];
    }
    if (grade === 'FAIR') {
        return overdueDays > 0
            ? ['โทรย้ำเตือนและยืนยันกำหนดชำระ', 'บันทึกผลการติดต่อในระบบ']
            : ['ติดตามใกล้ชิดช่วงใกล้ครบกำหนด', 'เตรียมแผนติดตามหากเกินกำหนด'];
    }
    if (grade === 'RISKY') {
        return [
            'ติดต่อเร่งด่วนและนัดชำระภายใน 3 วัน',
            'เสนอแผนผ่อนชำระ/ปรับโครงสร้างหนี้ (ถ้าจำเป็น)',
            'Escalate ให้หัวหน้าสาขาตรวจสอบ',
        ];
    }
    return [
        'ติดตามเร่งด่วนระดับวิกฤต (โทร/ลงพื้นที่)',
        'พิจารณามาตรการเข้มข้น: ปรับโครงสร้าง/ยุติวงเงิน/กฎหมาย',
        'Escalate ให้ผู้จัดการและ Admin รับทราบ',
    ];
}

/**
 * Compute credit assessment (grade + reasons + next actions) from the factors.
 *
 * Note: Internal scoring aligns with the existing frontend collections scoring ranges:
 * totalScore ∈ [-100, 100] -> healthScore ∈ [0, 100].
 */
export function computeCreditAssessment(factors: CreditFactors): CreditAssessment {
    const totalScore =
        scoreNCB(factors) +
        scoreDSCR(factors) +
        scoreOverdue(factors) +
        scoreIndustry(factors) +
        scorePaymentStatus(factors) +
        scoreDelinquencyHistory(factors) +
        scorePositivePaymentHistory(factors);
    const healthScore = clamp(Math.round((totalScore + 100) / 2), 0, 100);

    const scheduleOverdueDays = factors.daysUntilDue < 0 ? Math.abs(factors.daysUntilDue) : 0;
    const loanOverdueDays =
        factors.loanOverdueDays && Number.isFinite(factors.loanOverdueDays) ? Math.max(0, factors.loanOverdueDays) : 0;
    const overdueDays = Math.max(scheduleOverdueDays, loanOverdueDays);
    let grade = gradeFromHealthScore(healthScore);

    // Hard overrides for severe delinquency signals
    const loanStatus = factors.loanStatus ? String(factors.loanStatus).toUpperCase() : '';
    if (loanStatus === 'DEFAULTED' || loanStatus === 'NPL') {
        grade = 'CRITICAL';
    } else if (factors.nplStatus || overdueDays >= 90 || (typeof factors.maxDpd === 'number' && factors.maxDpd >= 90)) {
        grade = 'CRITICAL';
    }

    // Cap healthScore to match grade — prevents "วิกฤต (75)" contradiction
    const cappedScore = grade === 'CRITICAL' ? Math.min(healthScore, 29)
        : grade === 'RISKY' ? Math.min(healthScore, 49)
        : healthScore;

    const reasons = buildReasons(factors, cappedScore);
    const nextActions = buildNextActions(grade, factors);

    return { grade, score: cappedScore, reasons, nextActions };
}
