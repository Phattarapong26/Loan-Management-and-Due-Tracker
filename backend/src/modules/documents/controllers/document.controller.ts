import { FastifyRequest, FastifyReply } from 'fastify';
import { DocumentService } from '../services/document.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { logger } from '@utils/common/logger.util';
import {
    CreateDocumentInput,
    ListDocumentsQuery,
} from '../models/document.model';

export class DocumentController {
    private documentService: DocumentService;

    constructor() {
        this.documentService = new DocumentService();
    }

    /**
     * Upload document
     */
    upload = async (
        request: FastifyRequest,
        reply: FastifyReply
    ) => {
        try {
            console.log('[Document Upload] Starting upload...');
            const data = await request.file();
            if (!data) {
                console.log('[Document Upload] ERROR: No file uploaded');
                return ResponseUtil.error(reply, 'No file uploaded', 400);
            }

            console.log('[Document Upload] File received:', {
                filename: data.filename,
                mimetype: data.mimetype,
                fields: data.fields
            });

            const buffer = await data.toBuffer();
            
            // ✅ SECURITY FIX: Validate file size
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (buffer.length > maxSize) {
                return ResponseUtil.error(reply, 'File too large (max 10MB)', 400);
            }

            // ✅ SECURITY FIX: Detect actual file type from magic bytes
            const { fileTypeFromBuffer } = await import('file-type');
            const detectedType = await fileTypeFromBuffer(buffer);

            // ✅ Whitelist allowed file types
            const allowedTypes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'image/jpg',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel .xlsx
                'application/vnd.ms-excel', // Excel .xls
            ];

            if (!detectedType || !allowedTypes.includes(detectedType.mime)) {
                logger.warn({ 
                    providedMimetype: data.mimetype, 
                    detectedMimetype: detectedType?.mime,
                    filename: data.filename 
                }, 'Invalid file type detected');
                return ResponseUtil.error(reply, `Invalid file type. Allowed: PDF, JPEG, PNG, Excel. Detected: ${detectedType?.mime || 'unknown'}`, 400);
            }

            // ✅ Sanitize filename (prevent path traversal)
            const originalFilename = data.filename || 'unknown';
            const safeFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');

            // ✅ Use detected mimetype instead of client-provided
            const file = {
                filename: safeFilename,
                mimetype: detectedType.mime,
                data: buffer,
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const customerId = (data.fields?.customerId as any)?.value || null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const documentType = (data.fields?.documentType as any)?.value || 'other';

            console.log('[Document Upload] Parsed fields:', {
                customerId,
                documentType,
                fileSize: buffer.length,
                detectedMimetype: detectedType.mime
            });

            const input: CreateDocumentInput = {
                customerId: customerId || undefined,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                documentType: documentType as any,
                fileName: file.filename,
                fileSize: buffer.length,
                mimeType: file.mimetype,
            };

            const document = await this.documentService.uploadDocument(
                request,
                file,
                input,
                request.user!.userId,
                request.user!.branchId || undefined
            );

            console.log('[Document Upload] SUCCESS: Document uploaded:', document.id);
            return ResponseUtil.success(reply, document, 201);
        } catch (error: unknown) {
            console.error('[Document Upload] ERROR:', (error as Error).message);
            console.error('[Document Upload] Stack:', (error as Error).stack);
            return ResponseUtil.error(reply, (error as Error).message, 400);
        }
    };

    /**
     * Get document by ID
     */
    getById = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const document = await this.documentService.getDocument(
                request.params.id,
                request.user!.branchId || undefined
            );

            return ResponseUtil.success(reply, document);
        } catch (error: unknown) {
            return ResponseUtil.error(reply, (error as Error).message, 404);
        }
    };

    /**
     * List documents
     */
    list = async (
        request: FastifyRequest<{ Querystring: ListDocumentsQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const role = request.user!.role;
            // Admin can see all branches, optionally filter by branchId. Others see only their branch.
            const branchId =
                role === 'ADMIN' ? request.query.branchId : request.user!.branchId || undefined;

            const result = await this.documentService.listDocuments({
                page: request.query.page || 1,
                limit: request.query.limit || 20,
                customerId: request.query.customerId,
                branchId,
                status: request.query.status,
                documentType: request.query.documentType,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: unknown) {
            return ResponseUtil.error(reply, (error as Error).message, 400);
        }
    };

    /**
     * Get document file
     */
    getFile = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const file = await this.documentService.getDocumentFile(request.params.id);

            reply.type(file.mimeType);
            reply.header('Content-Disposition', `attachment; filename="${file.fileName}"`);

            return file.data;
        } catch (error: unknown) {
            return ResponseUtil.error(reply, (error as Error).message, 404);
        }
    };

    /**
     * Delete document
     */
    delete = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            await this.documentService.deleteDocument(
                request.params.id,
                request.user!.branchId || undefined
            );

            return ResponseUtil.success(reply, { message: 'Document deleted successfully' });
        } catch (error: unknown) {
            return ResponseUtil.error(reply, (error as Error).message, 404);
        }
    };

    /**
     * Link document to customer
     */
    linkToCustomer = async (
        request: FastifyRequest<{ Params: { id: string }; Body: { customerId: string; businessProfile?: unknown } }>,
        reply: FastifyReply
    ) => {
        try {
            const document = await this.documentService.linkToCustomer(
                request.params.id,
                request.body.customerId,
                request.body.businessProfile
            );

            return ResponseUtil.success(reply, document);
        } catch (error: unknown) {
            console.error('[DocumentController.linkToCustomer] Error:', error);
            return ResponseUtil.error(reply, (error as Error).message, 400);
        }
    };

    /**
     * Save parsed data for a document
     */
    saveParsedData = async (
        request: FastifyRequest<{ Params: { id: string }; Body: unknown }>,
        reply: FastifyReply
    ) => {
        try {
            await this.documentService.saveParsedData(
                request.params.id,
                request.body
            );

            return ResponseUtil.success(reply, { message: 'Parsed data saved successfully' });
        } catch (error: unknown) {
            console.error('[DocumentController.saveParsedData] Error:', error);
            return ResponseUtil.error(reply, (error as Error).message, 400);
        }
    };
}
