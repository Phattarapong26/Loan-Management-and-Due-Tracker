import { z } from 'zod';

// Import enhanced types
import { 
  EnhancedDocumentType, 
  DocumentTypeConfig,
  ENHANCED_DOCUMENT_TYPES,
  getDocumentTypeConfig,
  validateDocumentCompleteness,
  ExtractedSheetData,
  LoanApplicationData
} from './document.model.enhanced';

// Document type enum - now includes enhanced types
export const documentTypeSchema = z.enum([
  'excel', 
  'pdf', 
  'image', 
  'other',
  // Enhanced types
  'LOAN_APPLICATION',
  'FINANCIAL',
  'TAX_DOC',
  'BANK_STATEMENT',
  'CREDIT_BUREAU',
  'DSCR_ANALYSIS',
  'ID_CARD',
  'HOUSE_REGISTRATION',
  'COLLATERAL'
]);
export type DocumentType = z.infer<typeof documentTypeSchema>;

// Re-export enhanced types for convenience
export type { 
  EnhancedDocumentType,
  DocumentTypeConfig,
  ExtractedSheetData,
  LoanApplicationData
};

export { 
  ENHANCED_DOCUMENT_TYPES,
  getDocumentTypeConfig,
  validateDocumentCompleteness
};

// Processing status enum
export const processingStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);
export type ProcessingStatus = z.infer<typeof processingStatusSchema>;

// Create document input
export const createDocumentSchema = z.object({
    customerId: z.string().uuid().optional().nullable(),
    documentType: documentTypeSchema,
    fileName: z.string().min(1),
    fileSize: z.number().int().positive(),
    mimeType: z.string(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// List documents query
export const listDocumentsQuerySchema = z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    customerId: z.string().uuid().optional(),
    branchId: z.string().optional(),
    status: processingStatusSchema.optional(),
    documentType: documentTypeSchema.optional(),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

// Process Excel input
export const processExcelSchema = z.object({
    documentId: z.string().uuid(),
    fileContent: z.string().optional(), // Make optional since we can read from disk
});

export type ProcessExcelInput = z.infer<typeof processExcelSchema>;
