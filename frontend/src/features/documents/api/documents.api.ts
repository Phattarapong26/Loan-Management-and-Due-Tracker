/**
 * Documents API - Document management and AI processing endpoints
 */

import { documentsApi } from '@/shared/lib/api-endpoints';

export type DocumentType = 'id_card' | 'house_registration' | 'bank_statement' | 'financial_statement' | 'contract' | 'other';
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Document {
  id: string;
  customerId?: string;
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  aiProcessed: boolean;
  aiResults?: any;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDocumentData {
  customerId?: string;
  documentType: DocumentType;
}

export interface ListDocumentsParams {
  page?: number;
  limit?: number;
  customerId?: string;
  documentType?: DocumentType;
}

export interface AIResults {
  documentId: string;
  extractedData: any;
  confidence: number;
  processedAt: string;
}

/**
 * List documents
 */
export const listDocuments = async (params?: ListDocumentsParams) => {
  return documentsApi.list(params);
};

/**
 * Get document by ID
 */
export const getDocumentById = async (id: string) => {
  return documentsApi.getById(id);
};

/**
 * Upload document
 */
export const uploadDocument = async (
  file: File,
  data: UploadDocumentData,
  onProgress?: (progress: number) => void
) => {
  return documentsApi.upload(file, data, onProgress);
};

/**
 * Get document file
 */
export const getDocumentFile = async (id: string) => {
  return documentsApi.getFile(id);
};

export default {
  uploadDocument,
  getDocumentFile,
};
