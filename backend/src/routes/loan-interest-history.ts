// @ts-nocheck
/**
 * Loan Interest History Routes
 */

import { Router } from 'express';
import { loanInterestHistoryService } from '../modules/loans/services/loan-interest-history.service';

const router = Router();

/**
 * POST /api/loan-interest-history
 * Create interest history record
 */
router.post('/', async (req, res) => {
  try {
    const history = await loanInterestHistoryService.createInterestHistory(req.body);
    res.status(201).json(history);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/loan-interest-history/bulk
 * Bulk create interest history records
 */
router.post('/bulk', async (req, res) => {
  try {
    const { records } = req.body;
    const count = await loanInterestHistoryService.bulkCreateInterestHistory(records);
    res.status(201).json({ count, message: `Created ${count} records` });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/loan-interest-history
 * Get all interest history with filters
 */
router.get('/', async (req, res) => {
  try {
    const { loanId, customerId, tierName, dateFrom, dateTo, limit } = req.query;
    const history = await loanInterestHistoryService.getInterestHistory({
      loanId: loanId as string,
      customerId: customerId as string,
      tierName: tierName as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/loan-interest-history/statistics
 * Get statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await loanInterestHistoryService.getStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/loan-interest-history/loan/:loanId
 * Get interest history by loan ID
 */
router.get('/loan/:loanId', async (req, res) => {
  try {
    const history = await loanInterestHistoryService.getInterestHistoryByLoanId(req.params.loanId);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/loan-interest-history/loan/:loanId/total
 * Calculate total interest for loan
 */
router.get('/loan/:loanId/total', async (req, res) => {
  try {
    const total = await loanInterestHistoryService.calculateTotalInterest(req.params.loanId);
    res.json(total);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/loan-interest-history/loan/:loanId/rate-changes
 * Get interest rate changes for loan
 */
router.get('/loan/:loanId/rate-changes', async (req, res) => {
  try {
    const changes = await loanInterestHistoryService.getInterestRateChanges(req.params.loanId);
    res.json(changes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/loan-interest-history/loan/:loanId/payment/:paymentNumber
 * Get interest history by payment number
 */
router.get('/loan/:loanId/payment/:paymentNumber', async (req, res) => {
  try {
    const history = await loanInterestHistoryService.getInterestHistoryByPaymentNumber(
      req.params.loanId,
      parseInt(req.params.paymentNumber)
    );
    if (!history) {
      return res.status(404).json({ error: 'Interest history not found' });
    }
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/loan-interest-history/loan/:loanId/date-range
 * Get interest history within date range
 */
router.get('/loan/:loanId/date-range', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }
    const history = await loanInterestHistoryService.getInterestHistoryByDateRange(
      req.params.loanId,
      new Date(startDate as string),
      new Date(endDate as string)
    );
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/loan-interest-history/:id
 * Get interest history by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const history = await loanInterestHistoryService.getInterestHistoryById(req.params.id);
    if (!history) {
      return res.status(404).json({ error: 'Interest history not found' });
    }
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/loan-interest-history/:id
 * Delete interest history record
 */
router.delete('/:id', async (req, res) => {
  try {
    await loanInterestHistoryService.deleteInterestHistory(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
