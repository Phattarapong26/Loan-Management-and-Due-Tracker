import { FastifyRequest } from 'fastify';
import { BranchRepository } from '../repositories/branch.repository';
import { CreateBranchInput, UpdateBranchInput } from '../models/branch.model';

/**
 * Branch Service - Business logic ONLY
 * Orchestrates repositories and handles business rules
 */
export class BranchService {
    private branchRepository: BranchRepository;

    constructor() {
        this.branchRepository = new BranchRepository();
    }

    /**
     * Create branch with validation
     */
    async createBranch(_request: FastifyRequest, input: CreateBranchInput) {
        // Check if branch code already exists
        const existingBranch = await this.branchRepository.findByCode(input.code);
        if (existingBranch) {
            throw new Error('Branch code already exists');
        }

        // Create branch
        const branch = await this.branchRepository.create(input);

        return branch;
    }

    /**
     * Get branch by ID
     */
    async getBranch(branchId: string) {
        const branch = await this.branchRepository.findById(branchId);
        if (!branch) {
            throw new Error('Branch not found');
        }

        return branch;
    }

    /**
     * Get branch with statistics
     */
    async getBranchWithStats(branchId: string) {
        const result = await this.branchRepository.getBranchStatistics(branchId);
        if (!result) {
            throw new Error('Branch not found');
        }

        return result;
    }

    /**
     * List branches
     */
    async listBranches(params: {
        page: number;
        limit: number;
        status?: 'ACTIVE' | 'INACTIVE';
        search?: string;
    }) {
        return this.branchRepository.list(params);
    }

    /**
     * Update branch
     */
    async updateBranch(_request: FastifyRequest, branchId: string, input: UpdateBranchInput) {
        // Check if branch exists
        const existingBranch = await this.branchRepository.findById(branchId);
        if (!existingBranch) {
            throw new Error('Branch not found');
        }

        // Update branch
        const branch = await this.branchRepository.update(branchId, input);

        return branch;
    }

    /**
     * Delete branch
     */
    async deleteBranch(branchId: string) {
        // Check if branch exists
        const branch = await this.branchRepository.findById(branchId);
        if (!branch) {
            throw new Error('Branch not found');
        }

        // Check if branch has associated users, customers, or loans
        const stats = await this.branchRepository.getBranchStatistics(branchId);
        if (stats && (stats.stats.officerCount > 0 || stats.stats.totalCustomers > 0 || stats.stats.activeLoans > 0)) {
            throw new Error('Cannot delete branch with associated active records. Consider deactivating instead.');
        }

        return this.branchRepository.delete(branchId);
    }

    /**
     * Get all branches for dropdown/select
     */
    async getAllBranches() {
        const result = await this.branchRepository.list({
            page: 1,
            limit: 1000,
        });

        return result.branches;
    }

    /**
     * Get branch employees (officers and managers)
     */
    async getBranchEmployees(branchId: string) {
        return this.branchRepository.getBranchEmployees(branchId);
    }
}
