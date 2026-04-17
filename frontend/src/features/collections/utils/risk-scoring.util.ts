/**
 * Risk Scoring Utility for Collections
 * 
 * Calculates risk scores based on multiple factors:
 * - NCB Score (30 points)
 * - DSCR (30 points)
 * - Overdue Days (30 points)
 * - Industry Risk (10 points)
 */

export interface RiskFactors {
  // NCB Data
  ncbScore?: number; // 0-100
  nplStatus?: boolean;
  creditUtilization?: number; // 0-100%
  
  // Financial Health
  dscr?: number; // Debt Service Coverage Ratio
  dscrStatus?: 'excellent' | 'warning' | 'risk';
  
  // Payment Behavior
  // Note: In this app we pass `daysUntilDue` here (negative = overdue, positive = due in future)
  daysOverdue: number;
  paymentHistory?: 'good' | 'fair' | 'poor';
  
  // Business Profile
  industryCode?: string; // ISIC code
  businessAge?: number; // years
}

export interface RiskScore {
  totalScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskColor: string;
  factors: {
    ncb: number;
    dscr: number;
    overdue: number;
    industry: number;
  };
  recommendations: string[];
}

/**
 * Calculate comprehensive risk score
 */
export function calculateRiskScore(factors: RiskFactors): RiskScore {
  const scores = {
    ncb: calculateNCBScore(factors),
    dscr: calculateDSCRScore(factors),
    overdue: calculateOverdueScore(factors),
    industry: calculateIndustryScore(factors),
  };

  const totalScore = scores.ncb + scores.dscr + scores.overdue + scores.industry;
  
  const { riskLevel, riskColor } = getRiskLevel(totalScore);
  const recommendations = generateRecommendations(factors, scores);

  return {
    totalScore: Math.round(totalScore),
    riskLevel,
    riskColor,
    factors: scores,
    recommendations,
  };
}

/**
 * NCB Score Component (30 points max)
 * - NPL Status: -30 points (critical)
 * - Credit Utilization > 80%: -15 points
 * - Credit Utilization 50-80%: -10 points
 * - Good NCB: +30 points
 */
function calculateNCBScore(factors: RiskFactors): number {
  if (factors.nplStatus) {
    return -30; // Critical: Customer has NPL status
  }

  if (factors.creditUtilization !== undefined) {
    if (factors.creditUtilization > 80) {
      return -15; // High utilization
    } else if (factors.creditUtilization > 50) {
      return -10; // Medium utilization
    } else if (factors.creditUtilization < 30) {
      return 30; // Low utilization - good
    }
  }

  // Default: No NCB data available
  return 0;
}

/**
 * DSCR Score Component (30 points max)
 * - DSCR >= 1.5: +30 points (excellent)
 * - DSCR 1.25-1.5: +20 points (good)
 * - DSCR 1.2-1.25: +10 points (acceptable)
 * - DSCR < 1.2: -30 points (risk)
 */
function calculateDSCRScore(factors: RiskFactors): number {
  if (!factors.dscr) {
    return 0; // No DSCR data
  }

  if (factors.dscr >= 1.5) {
    return 30; // Excellent
  } else if (factors.dscr >= 1.25) {
    return 20; // Good
  } else if (factors.dscr >= 1.2) {
    return 10; // Acceptable
  } else {
    return -30; // Risk
  }
}

/**
 * Overdue Score Component (30 points max)
 * - 0 days: +30 points
 * - 1-7 days: +20 points
 * - 8-30 days: 0 points
 * - 31-60 days: -20 points
 * - 60+ days: -30 points
 */
function calculateOverdueScore(factors: RiskFactors): number {
  // Treat negative as overdue days, positive as not overdue yet
  const days = factors.daysOverdue < 0 ? Math.abs(factors.daysOverdue) : 0;

  if (days === 0) {
    return 30; // On time
  } else if (days <= 7) {
    return 20; // Slightly late
  } else if (days <= 30) {
    return 0; // Overdue
  } else if (days <= 60) {
    return -20; // Seriously overdue
  } else {
    return -30; // Critical overdue
  }
}

/**
 * Industry Score Component (10 points max)
 * Based on ISIC industry classification
 * High-risk industries: Construction, Real Estate, Hospitality
 * Low-risk industries: Healthcare, Education, Government
 */
function calculateIndustryScore(factors: RiskFactors): number {
  if (!factors.industryCode) {
    return 0; // No industry data
  }

  const code = factors.industryCode;

  // High-risk industries (ISIC codes)
  const highRisk = ['F', '41', '42', '43', 'L', '68', 'I', '55', '56']; // Construction, Real Estate, Hospitality
  // Low-risk industries
  const lowRisk = ['Q', '86', '87', '88', 'P', '85', 'O', '84']; // Healthcare, Education, Government

  if (highRisk.some(risk => code.startsWith(risk))) {
    return -10; // High-risk industry
  } else if (lowRisk.some(risk => code.startsWith(risk))) {
    return 10; // Low-risk industry
  }

  return 0; // Medium-risk industry
}

/**
 * Determine risk level from total score
 */
function getRiskLevel(totalScore: number): { riskLevel: RiskScore['riskLevel']; riskColor: string } {
  if (totalScore >= 60) {
    return { riskLevel: 'low', riskColor: 'text-green-600 bg-green-50 border-green-200' };
  } else if (totalScore >= 20) {
    return { riskLevel: 'medium', riskColor: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
  } else if (totalScore >= -20) {
    return { riskLevel: 'high', riskColor: 'text-orange-600 bg-orange-50 border-orange-200' };
  } else {
    return { riskLevel: 'critical', riskColor: 'text-red-600 bg-red-50 border-red-200' };
  }
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(factors: RiskFactors, scores: { ncb: number; dscr: number; overdue: number; industry: number }): string[] {
  const recommendations: string[] = [];

  // NCB recommendations
  if (factors.nplStatus) {
    recommendations.push('⚠️ ลูกค้ามีสถานะ NPL - ต้องติดตามเร่งด่วน');
  } else if (factors.creditUtilization && factors.creditUtilization > 80) {
    recommendations.push('💳 Credit Utilization สูง - พิจารณาความเสี่ยง');
  }

  // DSCR recommendations
  if (factors.dscr && factors.dscr < 1.2) {
    recommendations.push('📊 DSCR ต่ำกว่าเกณฑ์ - ความสามารถชำระหนี้อ่อนแอ');
  } else if (factors.dscr && factors.dscr >= 1.5) {
    recommendations.push('✅ DSCR ดีเยี่ยม - ความสามารถชำระหนี้แข็งแกร่ง');
  }

  // Overdue recommendations
  const overdueDays = factors.daysOverdue < 0 ? Math.abs(factors.daysOverdue) : 0;

  if (overdueDays > 60) {
    recommendations.push('🚨 เกินกำหนด 60+ วัน - พิจารณาดำเนินการทางกฎหมาย');
  } else if (overdueDays > 30) {
    recommendations.push('⏰ เกินกำหนด 30+ วัน - เร่งติดตามและเจรจา');
  }

  // Industry recommendations
  if (scores.industry < 0) {
    recommendations.push('🏭 อุตสาหกรรมเสี่ยงสูง - ติดตามใกล้ชิด');
  }

  // Default recommendation
  if (recommendations.length === 0) {
    recommendations.push('✓ ติดตามตามปกติ');
  }

  return recommendations;
}

/**
 * Get risk badge text
 */
export function getRiskBadgeText(riskLevel: RiskScore['riskLevel']): string {
  switch (riskLevel) {
    case 'low':
      return 'ความเสี่ยงต่ำ';
    case 'medium':
      return 'ความเสี่ยงปานกลาง';
    case 'high':
      return 'ความเสี่ยงสูง';
    case 'critical':
      return 'ความเสี่ยงวิกฤต';
  }
}

/**
 * Get DSCR status text and color
 */
export function getDSCRDisplay(dscr?: number): { text: string; color: string } {
  if (!dscr) {
    return { text: 'ไม่มีข้อมูล', color: 'text-gray-500' };
  }

  if (dscr >= 1.5) {
    return { text: `${dscr.toFixed(2)}x (ดีเยี่ยม)`, color: 'text-green-600' };
  } else if (dscr >= 1.25) {
    return { text: `${dscr.toFixed(2)}x (ดี)`, color: 'text-blue-600' };
  } else if (dscr >= 1.2) {
    return { text: `${dscr.toFixed(2)}x (พอใช้)`, color: 'text-yellow-600' };
  } else {
    return { text: `${dscr.toFixed(2)}x (เสี่ยง)`, color: 'text-red-600' };
  }
}

/**
 * Get industry name from ISIC code
 */
export function getIndustryName(code?: string): string {
  if (!code) return 'ไม่ระบุ';

  const industries: Record<string, string> = {
    'A': 'เกษตรกรรม',
    'B': 'เหมืองแร่',
    'C': 'อุตสาหกรรมการผลิต',
    'D': 'ไฟฟ้า ก๊าซ',
    'E': 'น้ำประปา',
    'F': 'ก่อสร้าง',
    'G': 'ค้าส่ง ค้าปลีก',
    'H': 'ขนส่ง',
    'I': 'โรงแรม ร้านอาหาร',
    'J': 'สื่อสาร',
    'K': 'การเงิน',
    'L': 'อสังหาริมทรัพย์',
    'M': 'วิชาชีพ วิทยาศาสตร์',
    'N': 'บริการธุรกิจ',
    'O': 'ราชการ',
    'P': 'การศึกษา',
    'Q': 'สาธารณสุข',
    'R': 'ศิลปะ บันเทิง',
    'S': 'บริการอื่นๆ',
  };

  const firstChar = code.charAt(0).toUpperCase();
  return industries[firstChar] || code;
}
