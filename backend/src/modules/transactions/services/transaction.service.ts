import { TransactionRepository } from '../repositories/transaction.repository';
import { UserRepository } from '@users/repositories/user.repository';
import { QueueUtil } from '@utils/common/queue.util';
import {
    CreateTransactionInput,
    UpdateTransactionInput,
    TransactionResponse,
    ListTransactionsQuery,
} from '../models/transaction.model';
import { TransactionStatus, Transaction, TransactionType, Prisma } from '@prisma/client';

/**
 * Transaction Service - Business logic ONLY
 * Orchestrates repositories and handles business rules
 */
export class TransactionService {
    private transactionRepository: TransactionRepository;
    private userRepository: UserRepository;

    constructor() {
        this.transactionRepository = new TransactionRepository();
        this.userRepository = new UserRepository();
    }

    /**
     * Create new transaction
     */
    async createTransaction(
        userId: string,
        input: CreateTransactionInput
    ): Promise<TransactionResponse> {
        // Verify user exists
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Business rule: Check if user is active
        if (user.status !== 'ACTIVE') {
            throw new Error('User account is not active');
        }

        // Create transaction
        const { metadata, ...rest } = input;
        const transaction = await this.transactionRepository.create({
            userId,
            ...rest,
            metadata: metadata as Prisma.InputJsonValue,
        });

        // Queue transaction processing
        await QueueUtil.addJob('transaction-processing', {
            name: 'process-transaction',
            data: { transactionId: transaction.id },
        });

        return this.mapToResponse(transaction);
    }

    /**
     * Get transaction by ID
     */
    async getTransaction(
        userId: string,
        transactionId: string
    ): Promise<TransactionResponse> {
        const transaction = await this.transactionRepository.findById(transactionId);

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        // Business rule: Users can only view their own transactions
        if (transaction.userId !== userId) {
            throw new Error('Unauthorized access to transaction');
        }

        return this.mapToResponse(transaction);
    }

    /**
     * List user transactions
     */
    async listTransactions(
        userId: string,
        query: ListTransactionsQuery
    ): Promise<{
        transactions: TransactionResponse[];
        total: number;
        page: number;
        limit: number;
    }> {
        const page = parseInt(query.page);
        const limit = parseInt(query.limit);
        const skip = (page - 1) * limit;

        const transactions = await this.transactionRepository.findByUser(userId, {
            skip,
            take: limit,
            status: query.status as TransactionStatus | undefined,
            type: query.type as TransactionType | undefined,
            fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
            toDate: query.toDate ? new Date(query.toDate) : undefined,
        });

        const total = await this.transactionRepository.countByUser(userId);

        return {
            transactions: transactions.map(this.mapToResponse),
            total,
            page,
            limit,
        };
    }

    /**
     * Update transaction status
     */
    async updateTransaction(
        userId: string,
        transactionId: string,
        input: UpdateTransactionInput
    ): Promise<TransactionResponse> {
        const transaction = await this.transactionRepository.findById(transactionId);

        if (!transaction) {
            throw new Error('Transaction not found');
        }

        // Business rule: Users can only update their own transactions
        if (transaction.userId !== userId) {
            throw new Error('Unauthorized access to transaction');
        }

        // Business rule: Cannot update completed or cancelled transactions
        if (['COMPLETED', 'CANCELLED'].includes(transaction.status)) {
            throw new Error('Cannot update completed or cancelled transaction');
        }

        const updated = await this.transactionRepository.updateStatus(
            transactionId,
            input.status as TransactionStatus,
            input.metadata as Prisma.InputJsonValue
        );

        return this.mapToResponse(updated);
    }

    /**
     * Map transaction to response
     */
    private mapToResponse(transaction: Transaction & { loanId?: string | null }): TransactionResponse {
        return {
            id: transaction.id,
            userId: transaction.userId,
            loanId: transaction.loanId ?? undefined,
            type: transaction.type,
            amount: transaction.amount.toString(),
            currency: transaction.currency,
            status: transaction.status,
            fromAccount: transaction.fromAccount ?? undefined,
            toAccount: transaction.toAccount ?? undefined,
            reference: transaction.reference ?? undefined,
            description: transaction.description ?? undefined,
            metadata: transaction.metadata as Record<string, unknown> | undefined,
            processedAt: transaction.processedAt?.toISOString(),
            createdAt: transaction.createdAt.toISOString(),
            updatedAt: transaction.updatedAt.toISOString(),
        };
    }
}
