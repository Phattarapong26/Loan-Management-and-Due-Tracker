import { FastifyRequest, FastifyReply } from 'fastify';
import { ReportService } from '../services/report.service';
import { ResponseUtil } from '@utils/formatting/response.util';

/**
 * Report Controller - Request/Response ONLY
 */
export class ReportController {
    private reportService: ReportService;

    constructor() {
        this.reportService = new ReportService();
    }

    private getScopedBranchId(request: FastifyRequest, requestedBranchId?: string) {
        const role = request.user!.role;
        if (role === 'ADMIN') return requestedBranchId;
        return request.user!.branchId || undefined;
    }

    /**
     * Generate Branch Summary Report
     */
    generateBranchSummary = async (
        request: FastifyRequest<{
            Querystring: {
                branchId?: string;
                officerId?: string;
                productId?: string;
                dateFrom?: string;
                dateTo?: string;
            };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.reportService.generateBranchSummaryReport({
                branchId: this.getScopedBranchId(request, request.query.branchId),
                officerId: request.query.officerId,
                productId: request.query.productId,
                dateFrom: request.query.dateFrom ? new Date(request.query.dateFrom) : undefined,
                dateTo: request.query.dateTo ? new Date(request.query.dateTo) : undefined,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถสร้างรายงานสรุปสาขาได้ กรุณาตรวจสอบเงื่อนไขการค้นหา', 400, 'VALIDATION_ERROR');
        }
    };

    /**
     * Generate NPL Report
     */
    generateNPLReport = async (
        request: FastifyRequest<{
            Querystring: {
                branchId?: string;
                officerId?: string;
                productId?: string;
                dateFrom?: string;
                dateTo?: string;
            };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.reportService.generateNPLReport({
                branchId: this.getScopedBranchId(request, request.query.branchId),
                officerId: request.query.officerId,
                productId: request.query.productId,
                dateFrom: request.query.dateFrom ? new Date(request.query.dateFrom) : undefined,
                dateTo: request.query.dateTo ? new Date(request.query.dateTo) : undefined,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถสร้างรายงาน NPL ได้ กรุณาตรวจสอบเงื่อนไขการค้นหา', 400, 'VALIDATION_ERROR');
        }
    };

    /**
     * Generate Officer Performance Report
     */
    generateOfficerPerformance = async (
        request: FastifyRequest<{
            Querystring: {
                branchId?: string;
                officerId?: string;
                productId?: string;
                dateFrom?: string;
                dateTo?: string;
            };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.reportService.generateOfficerPerformanceReport({
                branchId: this.getScopedBranchId(request, request.query.branchId),
                officerId: request.query.officerId,
                productId: request.query.productId,
                dateFrom: request.query.dateFrom ? new Date(request.query.dateFrom) : undefined,
                dateTo: request.query.dateTo ? new Date(request.query.dateTo) : undefined,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถสร้างรายงานผลงานเจ้าหน้าที่ได้ กรุณาตรวจสอบเงื่อนไขการค้นหา', 400, 'VALIDATION_ERROR');
        }
    };

    /**
     * Get Loan Report
     */
    getLoanReport = async (
        request: FastifyRequest<{
            Querystring: {
                branchId?: string;
                officerId?: string;
                productId?: string;
                dateFrom?: string;
                dateTo?: string;
                // Backward-compat
                startDate?: string;
                endDate?: string;
            };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const dateFromRaw = request.query.dateFrom || request.query.startDate;
            const dateToRaw = request.query.dateTo || request.query.endDate;
            const result = await this.reportService.generateLoanReport({
                branchId: this.getScopedBranchId(request, request.query.branchId),
                officerId: request.query.officerId,
                productId: request.query.productId,
                dateFrom: dateFromRaw ? new Date(dateFromRaw) : undefined,
                dateTo: dateToRaw ? new Date(dateToRaw) : undefined,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถสร้างรายงานสินเชื่อได้ กรุณาตรวจสอบเงื่อนไขการค้นหา', 400, 'VALIDATION_ERROR');
        }
    };

    /**
     * Get Payment Report
     */
    getPaymentReport = async (
        request: FastifyRequest<{
            Querystring: {
                branchId?: string;
                officerId?: string;
                productId?: string;
                dateFrom?: string;
                dateTo?: string;
                // Backward-compat
                startDate?: string;
                endDate?: string;
            };
        }>,
        reply: FastifyReply
    ) => {
        try {
            const dateFromRaw = request.query.dateFrom || request.query.startDate;
            const dateToRaw = request.query.dateTo || request.query.endDate;
            const result = await this.reportService.generatePaymentReport({
                branchId: this.getScopedBranchId(request, request.query.branchId),
                officerId: request.query.officerId,
                productId: request.query.productId,
                dateFrom: dateFromRaw ? new Date(dateFromRaw) : undefined,
                dateTo: dateToRaw ? new Date(dateToRaw) : undefined,
            });

            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, 'ไม่สามารถสร้างรายงานการชำระเงินได้ กรุณาตรวจสอบเงื่อนไขการค้นหา', 400, 'VALIDATION_ERROR');
        }
    };
}
