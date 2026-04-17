import { PrismaClient, CollectionActionType, CollectionActionStatus, CollectionPriority, CollectionApprovalStatus } from '@prisma/client';

export interface CreateCollectionActionInput {
  customerId: string;
  loanId?: string;
  scheduleId?: string;
  actionType: CollectionActionType;
  priority?: CollectionPriority;
  notes?: string;
  amount?: number;
  followUpDate?: Date;
  estimatedDurationMinutes?: number;
  metadata?: any;
}

export interface UpdateCollectionActionInput {
  status?: CollectionActionStatus;
  notes?: string;
  result?: string;
  completedAt?: Date;
  metadata?: any;
}

export interface CollectionActionFilters {
  customerId?: string;
  loanId?: string;
  agentId?: string;
  status?: CollectionActionStatus;
  actionType?: CollectionActionType;
  priority?: CollectionPriority;
  approvalStatus?: CollectionApprovalStatus;
  dateFrom?: Date;
  dateTo?: Date;
  requiresApproval?: boolean;
}

export class CollectionActionsService {
  constructor(private db: PrismaClient) {}

  /**
   * Create a new collection action
   */
  async createAction(input: CreateCollectionActionInput, agentId: string) {
    // Determine if action requires approval
    const requiresApproval = this.actionRequiresApproval(input.actionType);
    
    const action = await this.db.collectionAction.create({
      data: {
        customerId: input.customerId,
        loanId: input.loanId,
        scheduleId: input.scheduleId,
        actionType: input.actionType,
        priority: input.priority || CollectionPriority.MEDIUM,
        agentId,
        notes: input.notes,
        amount: input.amount,
        followUpDate: input.followUpDate,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        requiresApproval,
        approvalStatus: requiresApproval ? CollectionApprovalStatus.PENDING : null,
        status: requiresApproval ? CollectionActionStatus.PENDING : CollectionActionStatus.IN_PROGRESS,
        metadata: input.metadata,
      },
      include: {
        customer: {
          select: {
            id: true,
            businessName: true,
            phone: true,
          }
        },
        loan: {
          select: {
            id: true,
            principal: true,
            outstandingBalance: true,
          }
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    });

    // Create history entry
    await this.createHistoryEntry(action.id, null, action.status, agentId, 'Action created');

    return action;
  }

  /**
   * Get collection actions with filters
   */
  async getActions(filters: CollectionActionFilters, page = 1, limit = 20) {
    const where: any = {};

    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.loanId) where.loanId = filters.loanId;
    if (filters.agentId) where.agentId = filters.agentId;
    if (filters.status) where.status = filters.status;
    if (filters.actionType) where.actionType = filters.actionType;
    if (filters.priority) where.priority = filters.priority;
    if (filters.approvalStatus) where.approvalStatus = filters.approvalStatus;
    if (filters.requiresApproval !== undefined) where.requiresApproval = filters.requiresApproval;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [actions, total] = await Promise.all([
      this.db.collectionAction.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              businessName: true,
              phone: true,
            }
          },
          loan: {
            select: {
              id: true,
              principal: true,
              outstandingBalance: true,
            }
          },
          schedule: {
            select: {
              id: true,
              paymentNumber: true,
              paymentDate: true,
              totalPayment: true,
              daysOverdue: true,
            }
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.db.collectionAction.count({ where })
    ]);

    return {
      actions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get action by ID
   */
  async getActionById(id: string) {
    return this.db.collectionAction.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            businessName: true,
            phone: true,
            email: true,
          }
        },
        loan: {
          select: {
            id: true,
            principal: true,
            outstandingBalance: true,
            interestRate: true,
          }
        },
        schedule: {
          select: {
            id: true,
            paymentNumber: true,
            paymentDate: true,
            totalPayment: true,
            daysOverdue: true,
            status: true,
          }
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        history: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        contactLogs: {
          include: {
            officer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * Update collection action
   */
  async updateAction(id: string, input: UpdateCollectionActionInput, userId: string) {
    const currentAction = await this.db.collectionAction.findUnique({
      where: { id }
    });

    if (!currentAction) {
      throw new Error('Collection action not found');
    }

    const updatedAction = await this.db.collectionAction.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
      include: {
        customer: true,
        agent: true,
        approver: true,
      }
    });

    // Create history entry if status changed
    if (input.status && input.status !== currentAction.status) {
      await this.createHistoryEntry(
        id,
        currentAction.status,
        input.status,
        userId,
        `Status changed from ${currentAction.status} to ${input.status}`
      );
    }

    return updatedAction;
  }

  /**
   * Approve collection action
   */
  async approveAction(id: string, approverId: string, notes?: string) {
    const action = await this.db.collectionAction.findUnique({
      where: { id }
    });

    if (!action) {
      throw new Error('Collection action not found');
    }

    if (!action.requiresApproval) {
      throw new Error('This action does not require approval');
    }

    if (action.approvalStatus !== CollectionApprovalStatus.PENDING) {
      throw new Error('Action has already been processed');
    }

    const updatedAction = await this.db.collectionAction.update({
      where: { id },
      data: {
        approvalStatus: CollectionApprovalStatus.APPROVED,
        approvedBy: approverId,
        approvedAt: new Date(),
        status: CollectionActionStatus.IN_PROGRESS,
        notes: notes ? `${action.notes || ''}\n\nApproval Notes: ${notes}` : action.notes,
      }
    });

    await this.createHistoryEntry(
      id,
      action.status,
      CollectionActionStatus.IN_PROGRESS,
      approverId,
      `Action approved${notes ? `: ${notes}` : ''}`
    );

    return updatedAction;
  }

  /**
   * Reject collection action
   */
  async rejectAction(id: string, rejectorId: string, reason: string) {
    const action = await this.db.collectionAction.findUnique({
      where: { id }
    });

    if (!action) {
      throw new Error('Collection action not found');
    }

    if (!action.requiresApproval) {
      throw new Error('This action does not require approval');
    }

    if (action.approvalStatus !== CollectionApprovalStatus.PENDING) {
      throw new Error('Action has already been processed');
    }

    const updatedAction = await this.db.collectionAction.update({
      where: { id },
      data: {
        approvalStatus: CollectionApprovalStatus.REJECTED,
        approvedBy: rejectorId,
        approvedAt: new Date(),
        rejectionReason: reason,
        status: CollectionActionStatus.CANCELLED,
      }
    });

    await this.createHistoryEntry(
      id,
      action.status,
      CollectionActionStatus.CANCELLED,
      rejectorId,
      `Action rejected: ${reason}`
    );

    return updatedAction;
  }

  /**
   * Get collection action history for a customer
   */
  async getCustomerActionHistory(customerId: string, loanId?: string) {
    const where: any = { customerId };
    if (loanId) where.loanId = loanId;

    return this.db.collectionAction.findMany({
      where,
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        schedule: {
          select: {
            paymentNumber: true,
            paymentDate: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get pending approvals
   */
  async getPendingApprovals() {
      const where: any = {
        requiresApproval: true,
        approvalStatus: CollectionApprovalStatus.PENDING,
      };

      return this.db.collectionAction.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              businessName: true,
              phone: true,
            }
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          loan: {
            select: {
              id: true,
              principal: true,
              outstandingBalance: true,
            }
          }
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'asc' }
        ]
      });
    }

  /**
   * Get collection statistics
   */
  async getCollectionStats(agentId?: string, dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    if (agentId) where.agentId = agentId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [
      totalActions,
      completedActions,
      pendingActions,
      pendingApprovals,
      actionsByType,
      actionsByPriority
    ] = await Promise.all([
      this.db.collectionAction.count({ where }),
      this.db.collectionAction.count({ 
        where: { ...where, status: CollectionActionStatus.COMPLETED }
      }),
      this.db.collectionAction.count({ 
        where: { ...where, status: CollectionActionStatus.PENDING }
      }),
      this.db.collectionAction.count({ 
        where: { ...where, approvalStatus: CollectionApprovalStatus.PENDING }
      }),
      this.db.collectionAction.groupBy({
        by: ['actionType'],
        where,
        _count: true,
      }),
      this.db.collectionAction.groupBy({
        by: ['priority'],
        where,
        _count: true,
      })
    ]);

    return {
      totalActions,
      completedActions,
      pendingActions,
      pendingApprovals,
      completionRate: totalActions > 0 ? (completedActions / totalActions) * 100 : 0,
      actionsByType: actionsByType.reduce((acc, item) => {
        acc[item.actionType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      actionsByPriority: actionsByPriority.reduce((acc, item) => {
        acc[item.priority] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Create history entry
   */
  private async createHistoryEntry(
    actionId: string,
    statusFrom: string | null,
    statusTo: string,
    changedBy: string,
    changeReason?: string
  ) {
    return this.db.collectionActionHistory.create({
      data: {
        actionId,
        statusFrom,
        statusTo,
        changedBy,
        changeReason,
      }
    });
  }

  /**
   * Check if action type requires approval
   */
  private actionRequiresApproval(actionType: CollectionActionType): boolean {
      const approvalRequired: CollectionActionType[] = [
        CollectionActionType.VISIT,
        CollectionActionType.PAYMENT_PLAN,
        CollectionActionType.RESTRUCTURE,
        CollectionActionType.SETTLEMENT,
        CollectionActionType.LEGAL,
      ];

      return approvalRequired.includes(actionType);
    }
}