import { cachedLoanProductService } from '../services/loan-product-cached.service';
import { ResponseUtil } from '@utils/formatting/response.util';
import { FastifyRequest, FastifyReply } from 'fastify';

export class LoanProductController {
  private service = cachedLoanProductService;

  constructor() {
    // Using cached service singleton
  }

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { status, isPopular, search, page, limit } = request.query as any;

      const filters: any = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 20,
      };
      if (status) filters.status = status as string;
      if (isPopular !== undefined) filters.isPopular = isPopular === 'true';
      if (search) filters.search = search as string;

      const products = await this.service.getAllProducts(filters);

      return ResponseUtil.success(reply, products);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message || 'Failed to fetch loan products', 500);
    }
  };

  getById = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any;
      const product = await this.service.getProductById(id);

      return ResponseUtil.success(reply, product);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message || 'Failed to fetch loan product', 404);
    }
  };

  getProductStats = async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await this.service.getProductStats();

      return ResponseUtil.success(reply, stats);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message || 'Failed to fetch statistics', 500);
    }
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) {
        return ResponseUtil.unauthorized(reply, 'User not authenticated');
      }

      const productData = {
        ...(request.body as any),
        createdBy: userId,
      };

      const product = await this.service.createProduct(productData);

      return ResponseUtil.success(reply, product, 201);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message || 'Failed to create loan product', 400);
    }
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any;
      const product = await this.service.updateProduct(id, request.body as any);

      return ResponseUtil.success(reply, product);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message || 'Failed to update loan product', 400);
    }
  };

  delete = async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as any;
      await this.service.deleteProduct(id);

      return ResponseUtil.success(reply, null);
    } catch (error: any) {
      return ResponseUtil.error(reply, error.message || 'Failed to delete loan product', 400);
    }
  };
}
