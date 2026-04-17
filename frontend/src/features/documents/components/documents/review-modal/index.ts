/**
 * Document Review Modal - Main exports
 */

// Main modal component
export { DocumentReviewModal } from '../DocumentReviewModal';

// Types
export type {
  ReviewSection,
  SectionConfig,
  DocumentReviewModalProps,
  SectionCounts,
} from './types';

// Utilities (if needed externally)
export {
  normalizeProfile,
  calculateSectionCounts,
  displayValue,
} from './utils';

// Constants (if needed externally)
export { SECTIONS } from './constants';
