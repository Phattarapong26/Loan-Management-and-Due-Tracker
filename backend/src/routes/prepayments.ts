// @ts-nocheck
/**
 * Principal Prepayment Routes
 */

import { Router } from 'express';
import { prepaymentService } from '../modules/payments/services/prepayment.service';

const router = Router();

/**
 * POST /api/prepayments
 * Create prepayment record
 */
router.post('/', async (req, res) => {
  try {
    const prepayment = await prepaymentService.createPrepayment(req.body);
    res.status(201).json(prepayment);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถดำเนินการได้ กรุณาตรวจสอบข้อมูล' });
  }
});

/**
 * POST /api/prepayments/calculate-impact
 * Calculate prepayment impact
 */
router.post('/calculate-impact', async (req, res) => {
  try {
    const { loanPrincipal, remainingBalance, prepaymentAmount, interestRate, remainingMonths } =
      req.body;
    const impact = prepaymentService.calculatePrepaymentImpact(
      loanPrincipal,
      remainingBalance,
      prepaymentAmount,
      interestRate,
      remainingMonths
    );
    res.json(impact);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถดำเนินการได้ กรุณาตรวจสอบข้อมูล' });
  }
});

/**
 * GET /api/prepayments
 * Get all prepayments with filters
 */
router.get('/', async (req, res) => {
  try {
    const { loanId, customerId, processedBy, dateFrom, dateTo, limit } = req.query;
    const prepayments = await prepaymentService.getPrepayments({
      loanId: loanId as string,
      customerId: customerId as string,
      processedBy: processedBy as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(prepayments);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูลการชำระเงินล่วงหน้าได้' });
  }
});

/**
 * GET /api/prepayments/statistics
 * Get statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await prepaymentService.getStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูลการชำระเงินล่วงหน้าได้' });
  }
});

/**
 * GET /api/prepayments/loan/:loanId
 * Get prepayments by loan ID
 */
router.get('/loan/:loanId', async (req, res) => {
  try {
    const prepayments = await prepaymentService.getPrepaymentsByLoanId(req.params.loanId);
    res.json(prepayments);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูลการชำระเงินล่วงหน้าได้' });
  }
});

/**
 * GET /api/prepayments/loan/:loanId/total
 * Calculate total prepayments for loan
 */
router.get('/loan/:loanId/total', async (req, res) => {
  try {
    const total = await prepaymentService.calculateTotalPrepayments(req.params.loanId);
    res.json(total);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูลการชำระเงินล่วงหน้าได้' });
  }
});

/**
 * GET /api/prepayments/:id
 * Get prepayment by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const prepayment = await prepaymentService.getPrepaymentById(req.params.id);
    if (!prepayment) {
      return res.status(404).json({ error: 'ไม่พบรายการชำระเงินล่วงหน้า' });
    }
    res.json(prepayment);
  } catch (error: any) {
    res.status(500).json({ error: 'ไม่สามารถโหลดข้อมูลการชำระเงินล่วงหน้าได้' });
  }
});

/**
 * PUT /api/prepayments/:id
 * Update prepayment
 */
router.put('/:id', async (req, res) => {
  try {
    const prepayment = await prepaymentService.updatePrepayment(req.params.id, req.body);
    res.json(prepayment);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถดำเนินการได้ กรุณาตรวจสอบข้อมูล' });
  }
});

/**
 * POST /api/prepayments/:id/process
 * Process prepayment
 */
router.post('/:id/process', async (req, res) => {
  try {
    const { processedBy } = req.body;
    const prepayment = await prepaymentService.processPrepayment(req.params.id, processedBy);
    res.json(prepayment);
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถดำเนินการได้ กรุณาตรวจสอบข้อมูล' });
  }
});

/**
 * DELETE /api/prepayments/:id
 * Delete prepayment
 */
router.delete('/:id', async (req, res) => {
  try {
    await prepaymentService.deletePrepayment(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(400).json({ error: 'ไม่สามารถดำเนินการได้ กรุณาตรวจสอบข้อมูล' });
  }
});

export default router;
