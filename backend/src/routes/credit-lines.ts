// @ts-nocheck
/**
 * Credit Line Routes
 */

import { Router } from 'express';
import { creditLineService } from '../modules/credit/services/credit-line.service';

const router = Router();

/**
 * POST /api/credit-lines
 * Create credit line
 */
router.post('/', async (req, res) => {
  try {
    const creditLine = await creditLineService.createCreditLine(req.body);
    res.status(201).json(creditLine);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/credit-lines
 * Get all credit lines with filters
 */
router.get('/', async (req, res) => {
  try {
    const { customerId, status, expiringBefore, limit } = req.query;
    const creditLines = await creditLineService.getCreditLines({
      customerId: customerId as string,
      status: status as string,
      expiringBefore: expiringBefore ? new Date(expiringBefore as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(creditLines);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/credit-lines/statistics
 * Get statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await creditLineService.getStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/credit-lines/expiring
 * Get expiring credit lines
 */
router.get('/expiring', async (req, res) => {
  try {
    const { days } = req.query;
    const creditLines = await creditLineService.getExpiringCreditLines(
      days ? parseInt(days as string) : 30
    );
    res.json(creditLines);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/credit-lines/customer/:customerId
 * Get credit lines by customer ID
 */
router.get('/customer/:customerId', async (req, res) => {
  try {
    const creditLines = await creditLineService.getCreditLinesByCustomerId(req.params.customerId);
    res.json(creditLines);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/credit-lines/:id
 * Get credit line by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const creditLine = await creditLineService.getCreditLineById(req.params.id);
    if (!creditLine) {
      return res.status(404).json({ error: 'Credit line not found' });
    }
    res.json(creditLine);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/credit-lines/:id
 * Update credit line
 */
router.put('/:id', async (req, res) => {
  try {
    const creditLine = await creditLineService.updateCreditLine(req.params.id, req.body);
    res.json(creditLine);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/credit-lines/:id/suspend
 * Suspend credit line
 */
router.post('/:id/suspend', async (req, res) => {
  try {
    const creditLine = await creditLineService.suspendCreditLine(req.params.id);
    res.json(creditLine);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/credit-lines/:id/activate
 * Activate credit line
 */
router.post('/:id/activate', async (req, res) => {
  try {
    const creditLine = await creditLineService.activateCreditLine(req.params.id);
    res.json(creditLine);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/credit-lines/:id/close
 * Close credit line
 */
router.post('/:id/close', async (req, res) => {
  try {
    const creditLine = await creditLineService.closeCreditLine(req.params.id);
    res.json(creditLine);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/credit-lines/:id
 * Delete credit line
 */
router.delete('/:id', async (req, res) => {
  try {
    await creditLineService.deleteCreditLine(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
