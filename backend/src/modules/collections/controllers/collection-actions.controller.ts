import { FastifyRequest, FastifyReply } from 'fastify';
import { CollectionActionType, CollectionActionStatus, CollectionPriority } from '@prisma/client';
import { CollectionActionsService, CreateCollectionActionInput, UpdateCollectionActionInput } from '../services/collection-actions.service';
import { CollectionFilterService } from '../services/collection-filter.service';
import { AuthorizedUser } from '../../../shared/services/authorization.service';
import { prisma } from '@config/database.config';
import { ResponseUtil } from '@utils/formatting/response.util';

interface CreateActionRequest {
  Body: CreateCollectionActionInput;
}

interface UpdateActionRequest {
  Params: { id: string };
  Body: UpdateCollectionActionInput;
}

interface ApprovalRequest {
  Params: { id: string };
  Body: {
    notes?: string;
    reason?: string; // For rejection
  };
}

interface GetActionsRequest {
  Querystring: {
    customerId?: string;
    loanId?: string;
    agentId?: string;
    status?: CollectionActionStatus;
    actionType?: CollectionActionType;
    priority?: CollectionPriority;
    requiresApproval?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    limit?: string;
  };
}

interface GetActionRequest {
  Params: { id: string };
}

interface GetCustomerHistoryRequest {
  Params: { customerId: string };
  Querystring: { loanId?: string };
}

interface GetStatsRequest {
  Querystring: {
    agentId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export class CollectionActionsController {
  private collectionActionsService: CollectionActionsService;
  private collectionFilterService: CollectionFilterService;

  constructor() {
    this.collectionActionsService = new CollectionActionsService(prisma);
    this.collectionFilterService = new CollectionFilterService();
    
    // Bind methods to ensure 'this' context is preserved
    this.create = this.create.bind(this);
    this.list = this.list.bind(this);
    this.getById = this.getById.bind(this);
    this.update = this.update.bind(this);
    this.approve = this.approve.bind(this);
    this.reject = this.reject.bind(this);
    this.getCustomerHistory = this.getCustomerHistory.bind(this);
    this.getPendingApprovals = this.getPendingApprovals.bind(this);
    this.getStats = this.getStats.bind(this);
    this.getDashboard = this.getDashboard.bind(this);
  }

  /**
   * Get collection dashboard with role-based access control
   */
  async getDashboard(request: FastifyRequest, reply: FastifyReply) {
    try {
      const user = request.user as AuthorizedUser;
      if (!user) {
        return reply.status(401).send({ error: { message: 'Unauthorized' } });
      }

      const dashboard = await this.collectionFilterService.getCollectionDashboard(user);

      return reply.send({
        success: true,
        data: dashboard,
      });
    } catch (error: any) {
      console.error('Error fetching collection dashboard:', error);
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดข้อมูลแดชบอร์ดการติดตามลูกหนี้ได้', 500, 'LOAD_ERROR');
    }
  }

  /**
   * Create a new collection action
   */
  async create(request: FastifyRequest<CreateActionRequest>, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: { message: 'Unauthorized' } });
      }

      const action = await this.collectionActionsService.createAction(request.body, userId);

      return reply.status(201).send({
        success: true,
        data: action,
      });
    } catch (error: any) {
      console.error('Error creating collection action:', error);
      return ResponseUtil.error(reply, 'ไม่สามารถสร้างรายการติดตามลูกหนี้ได้ กรุณาลองใหม่อีกครั้ง', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get collection actions with filters
   */
  async list(request: FastifyRequest<GetActionsRequest>, reply: FastifyReply) {
    try {
      const {
        customerId,
        loanId,
        agentId,
        status,
        actionType,
        priority,
        requiresApproval,
        dateFrom,
        dateTo,
        page = '1',
        limit = '20'
      } = request.query;

      const filters = {
        customerId,
        loanId,
        agentId,
        status,
        actionType,
        priority,
        requiresApproval: requiresApproval ? requiresApproval === 'true' : undefined,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      };

      const result = await this.collectionActionsService.getActions(
        filters,
        parseInt(page),
        parseInt(limit)
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error fetching collection actions:', error);
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดรายการติดตามลูกหนี้ได้', 500, 'LOAD_ERROR');
    }
  }

  /**
   * Get collection action by ID
   */
  async getById(request: FastifyRequest<GetActionRequest>, reply: FastifyReply) {
    try {
      const { id } = request.params;
      const action = await this.collectionActionsService.getActionById(id);

      if (!action) {
        return ResponseUtil.error(reply, 'ไม่พบรายการติดตามลูกหนี้', 404, 'NOT_FOUND');
      }

      return reply.send({
        success: true,
        data: action,
      });
    } catch (error: any) {
      console.error('Error fetching collection action:', error);
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดข้อมูลรายการติดตามลูกหนี้ได้', 500, 'LOAD_ERROR');
    }
  }

  /**
   * Update collection action
   */
  async update(request: FastifyRequest<UpdateActionRequest>, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: { message: 'Unauthorized' } });
      }

      const { id } = request.params;
      const action = await this.collectionActionsService.updateAction(id, request.body, userId);

      return reply.send({
        success: true,
        data: action,
      });
    } catch (error: any) {
      console.error('Error updating collection action:', error);
      return ResponseUtil.error(reply, 'ไม่สามารถอัปเดตรายการติดตามลูกหนี้ได้ กรุณาลองใหม่อีกครั้ง', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Approve collection action
   */
  async approve(request: FastifyRequest<ApprovalRequest>, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: { message: 'Unauthorized' } });
      }

      const { id } = request.params;
      const { notes } = request.body;

      const action = await this.collectionActionsService.approveAction(id, userId, notes);

      return reply.send({
        success: true,
        data: action,
        message: 'Collection action approved successfully',
      });
    } catch (error: any) {
      console.error('Error approving collection action:', error);
      return ResponseUtil.error(reply, 'ไม่สามารถอนุมัติรายการติดตามลูกหนี้ได้ กรุณาลองใหม่อีกครั้ง', 400, 'INTERNAL_ERROR');
    }
  }

  /**
   * Reject collection action
   */
  async reject(request: FastifyRequest<ApprovalRequest>, reply: FastifyReply) {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return reply.status(401).send({ error: { message: 'Unauthorized' } });
      }

      const { id } = request.params;
      const { reason } = request.body;

      if (!reason) {
        return reply.status(400).send({
          error: { message: 'Rejection reason is required' }
        });
      }

      const action = await this.collectionActionsService.rejectAction(id, userId, reason);

      return reply.send({
        success: true,
        data: action,
        message: 'Collection action rejected successfully',
      });
    } catch (error: any) {
      console.error('Error rejecting collection action:', error);
      return ResponseUtil.error(reply, 'ไม่สามารถปฏิเสธรายการติดตามลูกหนี้ได้ กรุณาลองใหม่อีกครั้ง', 400, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get customer collection action history
   */
  async getCustomerHistory(request: FastifyRequest<GetCustomerHistoryRequest>, reply: FastifyReply) {
    try {
      const { customerId } = request.params;
      const { loanId } = request.query;

      const history = await this.collectionActionsService.getCustomerActionHistory(customerId, loanId);

      return reply.send({
        success: true,
        data: history,
      });
    } catch (error: any) {
      console.error('Error fetching customer collection history:', error);
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดประวัติการติดตามลูกหนี้ได้', 500, 'LOAD_ERROR');
    }
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userRole = (request as any).user?.role;

      // Only managers and admins can see pending approvals
      if (!['MANAGER', 'ADMIN'].includes(userRole)) {
        return reply.status(403).send({
          error: { message: 'Insufficient permissions' }
        });
      }

      const approvals = await this.collectionActionsService.getPendingApprovals();

      return reply.send({
        success: true,
        data: approvals,
      });
    } catch (error: any) {
      console.error('Error fetching pending approvals:', error);
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดรายการรออนุมัติได้', 500, 'LOAD_ERROR');
    }
  }

  /**
   * Get collection statistics
   */
  async getStats(request: FastifyRequest<GetStatsRequest>, reply: FastifyReply) {
    try {
      const { agentId, dateFrom, dateTo } = request.query;

      const stats = await this.collectionActionsService.getCollectionStats(
        agentId,
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined
      );

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching collection statistics:', error);
      return ResponseUtil.error(reply, 'ไม่สามารถโหลดสถิติการติดตามลูกหนี้ได้', 500, 'LOAD_ERROR');
    }
  }
}