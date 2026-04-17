/**
 * Types for Document Review Modal
 */

import { ParsedBusinessProfile } from '../../../utils/parsers/excel-parser';

export type ReviewSection = 
  | 'companyInfo' 
  | 'shareholders' 
  | 'loanSummary' 
  | 'financial' 
  | 'vatRecords' 
  | 'creditBureau' 
  | 'bankStatements' 
  | 'investment' 
  | 'collateral' 
  | 'workingCapital' 
  | 'revenueProjection' 
  | 'dscr' 
  | 'businessHistory' 
  | 'products' 
  | 'approvalComments'
  | 'recommendation'
  | 'debug';

export interface SectionConfig {
  key: ReviewSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface DocumentReviewModalProps {
  documentId: string;
  parsedData: ParsedBusinessProfile;
  onConfirm: (editedData: ParsedBusinessProfile, action: 'create' | 'link', customerId?: string) => void;
  onSaveDraft?: (editedData: ParsedBusinessProfile) => Promise<void>;
  onCancel: () => void;
  existingCustomers?: Array<{ id: string; name: string; taxId?: string }>;
}

export interface SectionCounts {
  companyInfo: number;
  shareholders: number;
  loanSummary: number;
  financial: number;
  vatRecords: number;
  creditBureau: number;
  bankStatements: number;
  investment: number;
  collateral: number;
  workingCapital: number;
  revenueProjection: number;
  dscr: number;
  businessHistory: number;
  products: number;
  approvalComments: number;
  recommendation: number;
  debug: number;
}
