import { FastifyRequest } from 'fastify';
import { DocumentRepository } from '../repositories/document.repository';
import { CreateDocumentInput } from '../models/document.model';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

export class DocumentService {
    private documentRepository: DocumentRepository;
    private uploadDir: string;

    constructor() {
        this.documentRepository = new DocumentRepository();
        this.uploadDir = join(process.cwd(), 'uploads', 'documents');
        this.ensureUploadDir();
    }

    /**
     * Ensure upload directory exists
     */
    private async ensureUploadDir() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
        } catch (error) {
            // Directory might already exist
        }
    }

    /**
     * Upload document file
     */
    async uploadDocument(
        _request: FastifyRequest,
        file: { filename: string; mimetype: string; data: Buffer },
        input: CreateDocumentInput,
        userId: string,
        branchId?: string
    ) {
        // Validate file type
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel', // .xls
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/jpg',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new Error('Invalid file type. Only Excel, PDF, and images are allowed.');
        }

        // Validate file size (50MB max)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.data.length > maxSize) {
            throw new Error('File size exceeds 50MB limit');
        }

        // Generate file hash
        const fileHash = createHash('sha256').update(file.data).digest('hex');

        // Generate file path
        const timestamp = Date.now();
        const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${userId}/${timestamp}_${sanitizedFilename}`;
        const fullPath = join(this.uploadDir, filePath);

        // Ensure user directory exists
        const userDir = join(this.uploadDir, userId);
        await fs.mkdir(userDir, { recursive: true });

        // Save file
        await fs.writeFile(fullPath, file.data);

        // Create document record
        const document = await this.documentRepository.create({
            ...input,
            filePath,
            fileHash,
            uploadedBy: userId,
            branchId,
        });

        return document;
    }

    /**
     * Get document by ID
     */
    async getDocument(documentId: string, branchId?: string) {
        const document = await this.documentRepository.findById(documentId);

        if (!document) {
            throw new Error('Document not found');
        }

        // If branchId is provided, verify document belongs to branch
        if (branchId && document.customer) {
            // Check if customer has branchId property
            const customer = document.customer as { branchId?: string | null };
            if (customer?.branchId && customer.branchId !== branchId) {
                throw new Error('Document not found');
            }
        }

        return document;
    }

    /**
     * List documents
     */
    async listDocuments(params: {
        page: number;
        limit: number;
        customerId?: string;
        branchId?: string;
        status?: string;
        documentType?: string;
    }) {
        return this.documentRepository.list(params);
    }

    /**
     * Get document file
     */
    async getDocumentFile(documentId: string) {
        const document = await this.documentRepository.findById(documentId);
        if (!document) {
            throw new Error('Document not found');
        }

        const fullPath = join(this.uploadDir, document.filePath);
        const fileData = await fs.readFile(fullPath);

        return {
            data: fileData,
            fileName: document.fileName,
            mimeType: document.mimeType,
        };
    }

    /**
     * Delete document
     */
    async deleteDocument(documentId: string, branchId?: string) {
        const document = await this.documentRepository.findById(documentId);

        if (!document) {
            throw new Error('Document not found');
        }

        // If branchId is provided, verify document belongs to branch
        if (branchId && document.customer) {
            const customer = document.customer as { branchId?: string | null };
            if (customer?.branchId && customer.branchId !== branchId) {
                throw new Error('Document not found');
            }
        }

        // Delete file from disk
        try {
            const fullPath = join(this.uploadDir, document.filePath);
            await fs.unlink(fullPath);
            console.log(`[Document Delete] File deleted: ${fullPath}`);
        } catch (error) {
            console.error(`[Document Delete] Failed to delete file:`, error);
            // Continue with database deletion even if file deletion fails
        }

        // Delete from database
        await this.documentRepository.delete(documentId);
        console.log(`[Document Delete] Document deleted from database: ${documentId}`);

        return { success: true };
    }

    /**
     * Link document to customer and optionally save extracted data
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async linkToCustomer(documentId: string, customerId: string, extractedData?: any) {
        console.log(`[Document Service] Linking document ${documentId} to customer ${customerId}`);

        // Verify customer exists
        const customer = await this.documentRepository.findCustomerById(customerId);

        if (!customer) {
            throw new Error('Customer not found');
        }

        // Update document
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {
            customerId,
        };

        if (extractedData) {
            updateData.extractedData = extractedData;
        }

        const document = await this.documentRepository.update(documentId, updateData);

        console.log(`[Document Service] Document linked to customer successfully`);
        return document;
    }

    /**
     * Save parsed data for a document
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async saveParsedData(documentId: string, extractedData: any) {
        console.log(`[Document Service] Saving parsed data for document ${documentId}`);

        return this.documentRepository.update(documentId, {
            extractedData,
        });
    }
}
