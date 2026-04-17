import { PrismaClient } from '@prisma/client';
import { CreateDocumentInput } from '../models/document.model';

const prisma = new PrismaClient();

export class DocumentRepository {
    /**
     * Create document record
     */
    async create(input: CreateDocumentInput & {
        filePath: string;
        fileHash: string;
        uploadedBy: string;
        branchId?: string;
    }) {
        // If customerId is provided, verify it exists
        if (input.customerId) {
            const customer = await prisma.customer.findUnique({
                where: { id: input.customerId },
            });
            if (!customer) {
                throw new Error('Customer not found');
            }
        }

        // customerId is now optional - can be linked later
        return prisma.document.create({
            data: {
                customerId: input.customerId || null,
                documentType: input.documentType.toUpperCase(),
                fileName: input.fileName,
                filePath: input.filePath,
                fileSize: input.fileSize,
                mimeType: input.mimeType,
                fileHash: input.fileHash,
                uploadedBy: input.uploadedBy,
                aiStatus: 'pending',
            },
        });
    }

    /**
     * Get document by ID
     */
    async findById(id: string) {
        return prisma.document.findUnique({
            where: { id },
            include: {
                customer: {
                    select: {
                        id: true,
                        businessName: true,
                        customerCode: true,
                        branchId: true,
                    },
                },
            },
        });
    }

    /**
     * List documents with pagination
     */
    async list(params: {
        page: number;
        limit: number;
        customerId?: string;
        branchId?: string;
        status?: string;
        documentType?: string;
    }) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};

        if (params.customerId) {
            where.customerId = params.customerId;
        }

        if (params.branchId) {
            where.customer = {
                branchId: params.branchId,
            };
        }

        if (params.status) {
            where.aiStatus = params.status;
        }

        if (params.documentType) {
            where.documentType = params.documentType.toUpperCase();
        }

        const [documents, total] = await Promise.all([
            prisma.document.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: {
                        select: {
                            id: true,
                            businessName: true,
                            customerCode: true,
                        },
                    },
                },
            }),
            prisma.document.count({ where }),
        ]);

        return { documents, total };
    }

    /**
     * Update document status
     */
    async updateStatus(id: string, status: string) {
        return prisma.document.update({
            where: { id },
            data: { aiStatus: status },
        });
    }

    /**
     * Update document with AI results
     */
    async updateWithAIResults(
        id: string,
        data: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            extractedData: any;
            confidenceScore: number;
            warnings?: string[];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            enhancedData?: any;
            processingVersion?: string;
        }
    ) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {
            aiProcessed: true,
            aiStatus: 'completed',
            extractedData: data.extractedData,
            confidenceScore: data.confidenceScore,
        };

        // Add enhanced data if available
        if (data.enhancedData) {
            updateData.enhancedData = data.enhancedData;
        }

        // Add processing version if available
        if (data.processingVersion) {
            updateData.processingVersion = data.processingVersion;
        }

        // Add document subtype from enhanced data
        if (data.enhancedData?.documentType) {
            updateData.documentSubtype = data.enhancedData.documentType;
        }

        return prisma.document.update({
            where: { id },
            data: updateData,
        });
    }

    /**
     * Get AI results for document
     */
    async getAIResults(documentId: string) {
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            select: {
                extractedData: true,
                confidenceScore: true,
                aiStatus: true,
                aiProcessed: true,
                enhancedData: true,
                processingVersion: true,
                documentSubtype: true,
            },
        });

        if (!document || !document.aiProcessed) {
            return null;
        }

        return {
            document_id: documentId,
            extracted_data: document.extractedData,
            confidence_score: document.confidenceScore,
            enhanced_data: document.enhancedData,
            processing_version: document.processingVersion || 'v1',
            document_subtype: document.documentSubtype,
            processed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            warnings: [],
        };
    }

    /**
     * Update document with generic data
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async update(id: string, data: any) {
        return prisma.document.update({
            where: { id },
            data,
        });
    }

    /**
     * Find customer by ID (for verification)
     */
    async findCustomerById(customerId: string) {
        return prisma.customer.findUnique({
            where: { id: customerId },
        });
    }

    /**
     * Delete document
     */
    async delete(id: string) {
        return prisma.document.delete({
            where: { id },
        });
    }
}
