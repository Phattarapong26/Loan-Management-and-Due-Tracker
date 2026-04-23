// @ts-nocheck
/**
 * Credit Line Drawdown Routes
 */

import { Router } from 'express';
import { drawdownService } from '../modules/credit/services/drawdown.service';

const router = Router();

/**
 * POST /api/drawdowns
 * Create drawdown
 */
router.post('/', async (req, res) => {
  try {
    const drawdown = await drawdownService.createDrawdown(req.body);
    res.status(201).json(drawdown);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถสร้างรายการเบิกเงินได้ กรุณาตรวจสอบข้อมูล' });
  }
});

/**
 * GET /api/drawdowns
 * Get all drawdowns with filters
 */
router.get('/', async (req, res) => {
  try {
    const { creditLineId, customerId, status, maturingBefore, limit } = req.query;
    const drawdowns = await drawdownService.getDrawdowns({
      creditLineId: creditLineId as string,
      customerId: customerId as string,
      status: status as string,
      maturingBefore: maturingBefore ? new Date(maturingBefore as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(drawdowns);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดรายการเบิกเงินได้' });
  }
});

/**
 * GET /api/drawdowns/statistics
 * Get statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await drawdownService.getStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดสถิติได้' });
  }
});

/**
 * GET /api/drawdowns/maturing
 * Get maturing drawdowns
 */
router.get('/maturing', async (req, res) => {
  try {
    const { days } = req.query;
    const drawdowns = await drawdownService.getMaturingDrawdowns(
      days ? parseInt(days as string) : 30
    );
    res.json(drawdowns);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดรายการที่จะครบกำหนดได้' });
  }
});

/**
 * GET /api/drawdowns/credit-line/:creditLineId
 * Get drawdowns by credit line ID
 */
router.get('/credit-line/:creditLineId', async (req, res) => {
  try {
    const drawdowns = await drawdownService.getDrawdownsByCreditLineId(req.params.creditLineId);
    res.json(drawdowns);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดรายการเบิกเงินได้' });
  }
});

/**
 * GET /api/drawdowns/:id
 * Get drawdown by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const drawdown = await drawdownService.getDrawdownById(req.params.id);
    if (!drawdown) {
      return res.status(404).json({ error: 'ไม่พบรายการเบิกเงิน' });
    }
    res.json(drawdown);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดรายการเบิกเงินได้' });
  }
});

/**
 * PUT /api/drawdowns/:id
 * Update drawdown
 */
router.put('/:id', async (req, res) => {
  try {
    const drawdown = await drawdownService.updateDrawdown(req.params.id, req.body);
    res.json(drawdown);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถอัปเดตรายการเบิกเงินได้' });
  }
});

/**
 * POST /api/drawdowns/:id/repay
 * Repay drawdown
 */
router.post('/:id/repay', async (req, res) => {
  try {
    const drawdown = await drawdownService.repayDrawdown(req.params.id);
    res.json(drawdown);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถชำระคืนได้' });
  }
});

/**
 * POST /api/drawdowns/:id/cancel
 * Cancel drawdown
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const drawdown = await drawdownService.cancelDrawdown(req.params.id);
    res.json(drawdown);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถยกเลิกรายการเบิกเงินได้' });
  }
});

/**
 * DELETE /api/drawdowns/:id
 * Delete drawdown
 */
router.delete('/:id', async (req, res) => {
  try {
    await drawdownService.deleteDrawdown(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถลบรายการเบิกเงินได้' });
  }
});

export default router;
