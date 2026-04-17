import { FastifyRequest, FastifyReply } from 'fastify';
import { TransactionService } from '../services/transaction.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import {
    CreateTransactionInput,
    UpdateTransactionInput,
    ListTransactionsQuery,
} from '../models/transaction.model';

/**
 * Transaction Controller - Request/Response ONLY
 * NO business logic, NO conditionals
 * Just pipe data to services
 */
export class TransactionController {
    private transactionService: TransactionService;

    constructor() {
        this.transactionService = new TransactionService();
    }

    /**
     * Create transaction
     */
    create = async (
        request: FastifyRequest<{ Body: CreateTransactionInput }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.transactionService.createTransaction(
                request.user!.userId,
                request.body
            );
            return ResponseUtil.success(reply, result, 201);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Get transaction by ID
     */
    getById = async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.transactionService.getTransaction(
                request.user!.userId,
                request.params.id
            );
            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 404);
        }
    };

    /**
     * List transactions
     */
    list = async (
        request: FastifyRequest<{ Querystring: ListTransactionsQuery }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.transactionService.listTransactions(
                request.user!.userId,
                request.query
            );
            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };

    /**
     * Update transaction
     */
    update = async (
        request: FastifyRequest<{
            Params: { id: string };
            Body: UpdateTransactionInput;
        }>,
        reply: FastifyReply
    ) => {
        try {
            const result = await this.transactionService.updateTransaction(
                request.user!.userId,
                request.params.id,
                request.body
            );
            return ResponseUtil.success(reply, result);
        } catch (error: any) {
            return ResponseUtil.error(reply, error.message, 400);
        }
    };
}
