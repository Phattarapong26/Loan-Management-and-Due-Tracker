import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export interface ActiveLoan {
  id: string;
  contractNumber?: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  amount: number;
  outstandingBalance: number;
  interestRate: number;
  duration: number;
  dscr: number;
  status: 'active' | 'overdue' | 'npl';
  createdAt: string;
  disbursementDate?: string;
  nextPaymentDate?: string;
  nextPaymentAmount?: number;
  overdueDays: number;
  creditGrade?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'RISKY' | 'CRITICAL';
  creditScore?: number; // 0-100
  creditReasons?: string[];
  creditNextActions?: string[];
}

export interface PaymentFormData {
  amount: string;
  paymentDate: string;
  method: string;
  note: string;
}

export const statusConfig = {
  active: {
    label: 'ปกติ',
    icon: CheckCircle2,
    color: 'bg-success/10 text-success border-success/20',
    dotColor: 'bg-success'
  },
  overdue: {
    label: 'เกินกำหนด',
    icon: AlertTriangle,
    color: 'bg-warning/10 text-warning border-warning/20',
    dotColor: 'bg-warning'
  },
  npl: {
    label: 'NPL',
    icon: XCircle,
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    dotColor: 'bg-destructive'
  },
};

// Map backend loan status to frontend status
export const mapLoanStatus = (status: string, overdueDays: number): ActiveLoan['status'] => {
  // Prefer overdueDays as the source of truth; backend status can be stale.
  if (overdueDays >= 90) return 'npl';
  if (overdueDays > 0) return 'overdue';
  return 'active';
};
