/**
 * Constants for Document Review Modal
 */

import {
  Building2, Users, CreditCard, BarChart3, Receipt,
  Shield, Landmark, Wallet, Package, FileText, Layers, MessageSquare
} from "lucide-react";
import { SectionConfig } from './types';

export const SECTIONS: SectionConfig[] = [
  { key: 'companyInfo', label: 'ข้อมูลบริษัท', icon: Building2 },
  { key: 'shareholders', label: 'ผู้ถือหุ้น', icon: Users },
  { key: 'loanSummary', label: 'สรุปวงเงินสินเชื่อ', icon: CreditCard },
  { key: 'financial', label: 'งบการเงิน', icon: BarChart3 },
  { key: 'vatRecords', label: 'ภพ.30', icon: Receipt },
  { key: 'creditBureau', label: 'เครดิตบูโร', icon: Shield },
  { key: 'bankStatements', label: 'Bank Statement', icon: Landmark },
  { key: 'investment', label: 'โครงสร้างการลงทุน', icon: Wallet },
  { key: 'collateral', label: 'หลักประกัน', icon: Shield },
  { key: 'workingCapital', label: 'เงินทุนหมุนเวียน', icon: Wallet },
  { key: 'revenueProjection', label: 'ประมาณรายได้', icon: BarChart3 },
  { key: 'dscr', label: 'DSCR', icon: BarChart3 },
  { key: 'businessHistory', label: 'ประวัติธุรกิจ', icon: Building2 },
  { key: 'products', label: 'คู่ค้า/ลูกค้า', icon: Package },
  { key: 'approvalComments', label: 'ความเห็นการอนุมัติ', icon: MessageSquare },
  { key: 'recommendation', label: 'คำแนะนำ', icon: FileText },
  { key: 'debug', label: '🔍 ข้อมูลทั้งหมด', icon: Layers },
];
