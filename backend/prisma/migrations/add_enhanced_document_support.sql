-- Migration: Add Enhanced Document Support
-- Description: Add columns to support enhanced document processing with 12-sheet analysis

-- Add enhanced_data column to store detailed analysis results
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS enhanced_data JSONB,
ADD COLUMN IF NOT EXISTS document_subtype VARCHAR(50),
ADD COLUMN IF NOT EXISTS processing_version VARCHAR(20) DEFAULT 'v1';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_document_subtype ON documents(document_subtype);
CREATE INDEX IF NOT EXISTS idx_documents_processing_version ON documents(processing_version);

-- Add comment for documentation
COMMENT ON COLUMN documents.enhanced_data IS 'Stores detailed analysis results from EnhancedAIGeminiService including sheet-by-sheet analysis, validation results, and business insights';
COMMENT ON COLUMN documents.document_subtype IS 'Specific document subtype for enhanced processing (e.g., LOAN_APPLICATION, FINANCIAL, TAX_DOC)';
COMMENT ON COLUMN documents.processing_version IS 'Version of AI processing used (v1=legacy, v2=enhanced)';
