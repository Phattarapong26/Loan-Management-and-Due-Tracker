/**
 * Payment Webhook Controller
 * 
 * Handles webhook notifications from our own payment service
 * when payment status changes occur
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { paymentSyncService } from '../services/payment-sync.service';
import { LineMessagesService } from '@line/services/messaging/line-messages.service';
import { LineService } from '@line/services/core/line.service';
import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';
import crypto from 'crypto';
import { env } from '@config/env.config';

interface PaymentWebhookBody {
  event: 'payment.completed' | 'payment.failed' | 'payment.overdue' | 'schedule.updated';
  loanId: string;
  paymentId?: string;
  amount?: number;
  paymentDate?: string;
  timestamp: string;
  signature?: string;
}

export class PaymentWebhookController {
  private lineMessagesService: LineMessagesService;
  private lineService: LineService;

  constructor() {
    this.lineMessagesService = new LineMessagesService();
    this.lineService = new LineService();
  }

  /**
   * Verify webhook signature from payment service
   */
  private verifyPaymentWebhookSignature(body: string, signature: string): boolean {
    try {
      // Use a separate webhook secret for payment service
      const webhookSecret = env.PAYMENT_WEBHOOK_SECRET || env.LINE_CHANNEL_SECRET;

      const hash = crypto
        .createHmac('SHA256', webhookSecret)
        .update(body)
        .digest('hex');

      return hash === signature;
    } catch (error) {
      logger.error({ error }, 'Payment webhook signature verification failed');
      return false;
    }
  }

  /**
   * Handle payment webhook events
   */
  handlePaymentWebhook = async (
    request: FastifyRequest<{ Body: PaymentWebhookBody }>,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      const body = request.body;
      const signature = request.headers['x-payment-signature'] as string;

      // Verify signature if provided
      if (signature) {
        const rawBody = JSON.stringify(body);
        const isValid = this.verifyPaymentWebhookSignature(rawBody, signature);

        if (!isValid) {
          logger.error({ event: body.event }, 'Invalid payment webhook signature');
          reply.code(401).send({ error: 'Invalid signature' });
          return;
        }
      }

      logger.info({
        event: body.event,
        loanId: body.loanId,
        paymentId: body.paymentId,
      }, 'Payment webhook received');

      // Handle different event types
      switch (body.event) {
        case 'payment.completed':
          await this.handlePaymentCompleted(body);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(body);
          break;

        case 'payment.overdue':
          await this.handlePaymentOverdue(body);
          break;

        case 'schedule.updated':
          await this.handleScheduleUpdated(body);
          break;

        default:
          logger.warn({ event: body.event }, 'Unknown payment webhook event');
      }

      reply.code(200).send({ success: true });
    } catch (error) {
      logger.error({ error }, 'Payment webhook handling failed');
      reply.code(500).send({ error: 'Internal server error' });
    }
  }

  /**
   * Handle payment completed event
   */
  private async handlePaymentCompleted(data: PaymentWebhookBody): Promise<void> {
    try {
      // Sync payment data
      await paymentSyncService.syncAllPaymentData(data.loanId);

      // Get loan and customer info
      const loan = await prisma.loan.findUnique({
        where: { id: data.loanId },
        include: {
          customer: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!loan || !loan.customer.user?.lineUserId || !loan.customer.user.lineActive) {
        logger.info({ loanId: data.loanId }, 'Customer not linked to LINE or inactive');
        return;
      }

      // Send payment confirmation to customer
      const message = this.lineMessagesService.createPaymentConfirmationMessage({
        amount: data.amount || 0,
        paymentDate: data.paymentDate || new Date().toISOString(),
        loanId: data.loanId,
        reference: data.paymentId || '',
      });

      await this.lineService.pushMessage(loan.customer.user.lineUserId, [message]);

      logger.info({
        loanId: data.loanId,
        customerId: loan.customer.id,
      }, 'Payment confirmation sent to customer');
    } catch (error) {
      logger.error({
        loanId: data.loanId,
        error,
      }, 'Failed to handle payment completed event');
    }
  }

  /**
   * Handle payment failed event
   */
  private async handlePaymentFailed(data: PaymentWebhookBody): Promise<void> {
    try {
      // Get loan and customer info
      const loan = await prisma.loan.findUnique({
        where: { id: data.loanId },
        include: {
          customer: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!loan || !loan.customer.user?.lineUserId || !loan.customer.user.lineActive) {
        return;
      }

      // Send payment failure notification
      const message = this.lineMessagesService.createTextMessage(
        `⚠️ การชำระเงินล้มเหลว\n\n` +
        `เลขที่สินเชื่อ: ${data.loanId.substring(0, 8)}\n` +
        `จำนวนเงิน: ${data.amount?.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\n\n` +
        `กรุณาตรวจสอบยอดเงินในบัญชีและลองชำระอีกครั้ง หรือติดต่อเจ้าหน้าที่`
      );

      await this.lineService.pushMessage(loan.customer.user.lineUserId, [message]);

      logger.info({
        loanId: data.loanId,
        customerId: loan.customer.id,
      }, 'Payment failure notification sent');
    } catch (error) {
      logger.error({
        loanId: data.loanId,
        error,
      }, 'Failed to handle payment failed event');
    }
  }

  /**
   * Handle payment overdue event
   */
  private async handlePaymentOverdue(data: PaymentWebhookBody): Promise<void> {
    try {
      // Sync payment schedule
      await paymentSyncService.syncPaymentSchedule(data.loanId);

      // Get loan and customer info
      const loan = await prisma.loan.findUnique({
        where: { id: data.loanId },
        include: {
          customer: {
            include: {
              user: true,
            },
          },
          paymentSchedule: {
            where: { status: 'OVERDUE' },
            orderBy: { paymentDate: 'asc' },
            take: 1,
          },
        },
      });

      if (!loan || !loan.customer.user?.lineUserId || !loan.customer.user.lineActive) {
        return;
      }

      // Send overdue notification
      const overdueSchedule = loan.paymentSchedule[0];
      if (overdueSchedule) {
        const daysOverdue = Math.floor(
          (new Date().getTime() - overdueSchedule.paymentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const message = this.lineMessagesService.createTextMessage(
          `🔴 แจ้งเตือนค้างชำระ\n\n` +
          `เลขที่สินเชื่อ: ${data.loanId.substring(0, 8)}\n` +
          `จำนวนเงิน: ${overdueSchedule.totalPayment.toNumber().toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท\n` +
          `ค้างชำระ: ${daysOverdue} วัน\n\n` +
          `กรุณาชำระเงินโดยเร็วเพื่อหลีกเลี่ยงค่าปรับและผลกระทบต่อเครดิต`
        );

        await this.lineService.pushMessage(loan.customer.user.lineUserId, [message]);

        logger.info({
          loanId: data.loanId,
          customerId: loan.customer.id,
          daysOverdue,
        }, 'Overdue notification sent');
      }
    } catch (error) {
      logger.error({
        loanId: data.loanId,
        error,
      }, 'Failed to handle payment overdue event');
    }
  }

  /**
   * Handle payment schedule updated event
   */
  private async handleScheduleUpdated(data: PaymentWebhookBody): Promise<void> {
    try {
      // Sync payment schedule
      await paymentSyncService.syncPaymentSchedule(data.loanId);

      logger.info({
        loanId: data.loanId,
      }, 'Payment schedule synced after update');

      // Optionally notify customer of schedule changes
      const loan = await prisma.loan.findUnique({
        where: { id: data.loanId },
        include: {
          customer: {
            include: {
              user: true,
            },
          },
        },
      });

      if (loan && loan.customer.user?.lineUserId && loan.customer.user.lineActive) {
        const message = this.lineMessagesService.createTextMessage(
          `📅 ตารางการชำระเงินได้รับการปรับปรุง\n\n` +
          `เลขที่สินเชื่อ: ${data.loanId.substring(0, 8)}\n\n` +
          `กรุณาตรวจสอบตารางการชำระเงินใหม่ผ่านเมนู "กำหนดชำระ"`
        );

        await this.lineService.pushMessage(loan.customer.user.lineUserId, [message]);
      }
    } catch (error) {
      logger.error({
        loanId: data.loanId,
        error,
      }, 'Failed to handle schedule updated event');
    }
  }

  /**
   * Handle slip upload from mobile app or other sources
   */
  handleSlipUpload = async (
    _request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> => {
    try {
      // Stub for now - can be expanded with OCR/AI verification
      logger.info('Slip upload webhook received');

      return reply.code(200).send({
        success: true,
        message: 'Slip received and queued for processing'
      });
    } catch (error) {
      logger.error({ error }, 'Slip upload handling failed');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  };
}

export const paymentWebhookController = new PaymentWebhookController();
