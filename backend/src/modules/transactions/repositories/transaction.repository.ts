import { prisma } from '@config/database.config';
import { Transaction, TransactionType, TransactionStatus, Prisma } from '@prisma/client';

/**
 * Transaction Repository - Database access ONLY
 * NO business logic allowed
 */
export class TransactionRepository {
    /**
     * Create transaction
     */
    async create(data: {
        userId: string;
        loanId?: string;
        type: TransactionType;
        amount: number;
        currency?: string;
        fromAccount?: string;
        toAccount?: string;
        reference?: string;
        description?: string;
        metadata?: Prisma.InputJsonValue;
    }): Promise<Transaction> {
        return prisma.transaction.create({
            data: {
                ...data,
                reference: data.reference || this.generateReference(),
            },
        });
    }

    /**
     * Find transaction by ID
     */
    async findById(id: string): Promise<Transaction | null> {
        return prisma.transaction.findUnique({
            where: { id },
        });
    }

    /**
     * Find transaction by reference
     */
    async findByReference(reference: string): Promise<Transaction | null> {
        return prisma.transaction.findUnique({
            where: { reference },
        });
    }

    /**
     * Find transactions by user
     */
    async findByUser(
        userId: string,
        options?: {
            skip?: number;
            take?: number;
            status?: TransactionStatus;
            type?: TransactionType;
            fromDate?: Date;
            toDate?: Date;
        }
    ): Promise<Transaction[]> {
        return prisma.transaction.findMany({
            where: {
                userId,
                ...(options?.status && { status: options.status }),
                ...(options?.type && { type: options.type }),
                ...(options?.fromDate &&
                    options?.toDate && {
                    createdAt: {
                        gte: options.fromDate,
                        lte: options.toDate,
                    },
                }),
            },
            skip: options?.skip,
            take: options?.take,
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Update transaction status
     */
    async updateStatus(
        id: string,
        status: TransactionStatus,
        metadata?: Prisma.InputJsonValue
    ): Promise<Transaction> {
        return prisma.transaction.update({
            where: { id },
            data: {
                status,
                ...(metadata && { metadata }),
                ...(status === 'COMPLETED' && { processedAt: new Date() }),
            },
        });
    }

    /**
     * Count user transactions
     */
    async countByUser(userId: string): Promise<number> {
        return prisma.transaction.count({
            where: { userId },
        });
    }

    /**
     * Generate unique reference
     */
    private generateReference(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `TXN-${timestamp}-${random}`;
    }
}
