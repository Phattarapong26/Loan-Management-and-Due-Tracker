import { FastifyInstance } from 'fastify';
import { ProductBudgetController } from '../controllers/product-budget.controller';
import { authenticate, authorize } from '@middlewares/security/auth.middleware';

export async function productBudgetRoutes(fastify: FastifyInstance) {
  const controller = new ProductBudgetController();

  // Get all budgets for a product
  fastify.get('/products/:productId/budgets', {
    preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')]
  }, controller.getAllBudgetsByProduct);

  // Get budget for specific period
  fastify.get('/products/:productId/budgets/period', {
    preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')]
  }, controller.getBudgetByPeriod);

  // Batch get budgets for multiple products (NEW - more efficient)
  fastify.post('/budgets/batch', {
    preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')]
  }, controller.getBudgetsBatch);

  // Check budget availability
  fastify.get('/products/:productId/budgets/check', {
    preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')]
  }, controller.checkAvailability);

  // Create new budget
  fastify.post('/budgets', {
    preHandler: [authenticate, authorize('ADMIN', 'MANAGER')]
  }, controller.createBudget);

  // Add more budget
  fastify.post('/budgets/:budgetId/add', {
    preHandler: [authenticate, authorize('ADMIN', 'MANAGER')]
  }, controller.addBudget);

  // Get budget statistics
  fastify.get('/budgets/stats', {
    preHandler: [authenticate, authorize('ADMIN', 'MANAGER')]
  }, controller.getBudgetStats);

  // Get budget consumption history
  fastify.get('/budgets/:budgetId/history', {
    preHandler: [authenticate, authorize('ADMIN', 'MANAGER', 'OFFICER')]
  }, controller.getConsumptionHistory);
}
