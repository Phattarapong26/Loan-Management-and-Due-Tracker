import { prisma } from '@config/database.config';
import { logger } from '@utils/common/logger.util';

export class InterestRateService {
  /**
   * Get current MLR rate
   */
  async getMLR(): Promise<number> {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'interest_rate.mlr' }
    });
    
    if (!config) {
      throw new Error('MLR rate not configured');
    }
    
    return parseFloat(config.value);
  }

  /**
   * Get current MRR rate
   */
  async getMRR(): Promise<number> {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'interest_rate.mrr' }
    });
    
    if (!config) {
      throw new Error('MRR rate not configured');
    }
    
    return parseFloat(config.value);
  }

  /**
   * Update MLR rate and notify all users via LINE
   */
  /**
     * Update MLR rate and notify all users via LINE
     */
    async updateMLR(rate: number, userId: string): Promise<void> {
      if (rate < 0 || rate > 20) {
        throw new Error('Interest rate must be between 0 and 20');
      }

      // Get old rate for comparison (if exists)
      let oldRate: number | null = null;
      try {
        oldRate = await this.getMLR();
      } catch (error) {
        // Rate not configured yet, will create new
      }

      // Upsert MLR (create if not exists, update if exists)
      await prisma.systemConfig.upsert({
        where: { key: 'interest_rate.mlr' },
        create: {
          key: 'interest_rate.mlr',
          value: rate.toString(),
          description: 'Minimum Loan Rate (MLR) - อัตราดอกเบี้ยขั้นต่ำสำหรับสินเชื่อ',
          category: 'INTEREST_RATE',
          dataType: 'NUMBER',
          createdBy: userId,
        },
        update: {
          value: rate.toString(),
          updatedBy: userId,
        },
      });

      // Update last updated timestamp
      await prisma.systemConfig.upsert({
        where: { key: 'interest_rate.last_updated' },
        create: {
          key: 'interest_rate.last_updated',
          value: new Date().toISOString(),
          description: 'Last time interest rates were updated',
          category: 'INTEREST_RATE',
          dataType: 'STRING',
          createdBy: userId,
        },
        update: {
          value: new Date().toISOString(),
          updatedBy: userId,
        },
      });

      // Get updater info
      const updater = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, role: true }
      });

      // Send LINE notification only if rate changed
      if (oldRate !== null && oldRate !== rate) {
        await this.notifyRateChange('MLR', oldRate, rate, updater);
      }

      logger.info({
        type: 'MLR_UPDATE',
        oldRate,
        newRate: rate,
        updatedBy: userId,
        isNew: oldRate === null,
      }, oldRate === null ? 'MLR rate created' : 'MLR rate updated');
    }

  /**
   * Update MRR rate and notify all users via LINE
   */
  /**
     * Update MRR rate and notify all users via LINE
     */
    async updateMRR(rate: number, userId: string): Promise<void> {
      if (rate < 0 || rate > 20) {
        throw new Error('Interest rate must be between 0 and 20');
      }

      // Get old rate for comparison (if exists)
      let oldRate: number | null = null;
      try {
        oldRate = await this.getMRR();
      } catch (error) {
        // Rate not configured yet, will create new
      }

      // Upsert MRR (create if not exists, update if exists)
      await prisma.systemConfig.upsert({
        where: { key: 'interest_rate.mrr' },
        create: {
          key: 'interest_rate.mrr',
          value: rate.toString(),
          description: 'Minimum Retail Rate (MRR) - อัตราดอกเบี้ยขั้นต่ำสำหรับลูกค้ารายย่อย',
          category: 'INTEREST_RATE',
          dataType: 'NUMBER',
          createdBy: userId,
        },
        update: {
          value: rate.toString(),
          updatedBy: userId,
        },
      });

      // Update last updated timestamp
      await prisma.systemConfig.upsert({
        where: { key: 'interest_rate.last_updated' },
        create: {
          key: 'interest_rate.last_updated',
          value: new Date().toISOString(),
          description: 'Last time interest rates were updated',
          category: 'INTEREST_RATE',
          dataType: 'STRING',
          createdBy: userId,
        },
        update: {
          value: new Date().toISOString(),
          updatedBy: userId,
        },
      });

      // Get updater info
      const updater = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, role: true }
      });

      // Send LINE notification only if rate changed
      if (oldRate !== null && oldRate !== rate) {
        await this.notifyRateChange('MRR', oldRate, rate, updater);
      }

      logger.info({
        type: 'MRR_UPDATE',
        oldRate,
        newRate: rate,
        updatedBy: userId,
        isNew: oldRate === null,
      }, oldRate === null ? 'MRR rate created' : 'MRR rate updated');
    }

  /**
   * Send LINE notification to all users about rate change
   */
  private async notifyRateChange(
    rateType: 'MLR' | 'MRR',
    oldRate: number,
    newRate: number,
    updater: any
  ): Promise<void> {
    try {
      // Import LINE service dynamically to avoid circular dependency
      const { LineService } = await import('@line/services/core/line.service');
      const lineService = new LineService();

      // Get all users with LINE connected
      const users = await prisma.user.findMany({
        where: {
          lineUserId: { not: null },
          lineActive: true,
          lineNotificationsEnabled: true,
        },
        select: {
          id: true,
          lineUserId: true,
          role: true,
          firstName: true,
          lastName: true,
        }
      });

      if (users.length === 0) {
        logger.info('No users with LINE connected to notify');
        return;
      }

      const change = newRate > oldRate ? 'เพิ่มขึ้น' : 'ลดลง';
      const changeIcon = newRate > oldRate ? '📈' : '📉';
      const diff = Math.abs(newRate - oldRate).toFixed(3);

      const message = `🏦 แจ้งเตือน: อัตราดอกเบี้ยอ้างอิงเปลี่ยนแปลง

${changeIcon} ${rateType} ${change}
• จาก: ${oldRate.toFixed(3)}%
• เป็น: ${newRate.toFixed(3)}%
• ส่วนต่าง: ${diff}%

📅 มีผลตั้งแต่: ${new Date().toLocaleDateString('th-TH', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

👤 อัปเดตโดย: ${updater?.firstName} ${updater?.lastName} (${updater?.role})

ℹ️ การเปลี่ยนแปลงนี้จะส่งผลต่อสินเชื่อที่มีอัตราดอกเบี้ยแบบลอยตัว (Variable Rate)`;

      // Send to all users
      const notifications = users.map(user => 
        lineService.pushMessage(user.lineUserId!, [{ type: 'text', text: message }])
          .catch((error: Error) => {
            logger.error({
              error,
              userId: user.id,
              lineUserId: user.lineUserId
            }, 'Failed to send rate change notification');
          })
      );

      await Promise.allSettled(notifications);

      logger.info({
        rateType,
        oldRate,
        newRate,
        notifiedUsers: users.length
      }, 'Rate change notifications sent');

    } catch (error) {
      logger.error({ error }, 'Error sending rate change notifications');
      // Don't throw - notification failure shouldn't block rate update
    }
  }

  /**
   * Calculate actual interest rate from formula
   * Examples:
   * - "MLR + 1.5%" -> 6.875 + 1.5 = 8.375
   * - "MRR + 2.0%" -> 7.125 + 2.0 = 9.125
   * - "MLR - 0.5%" -> 6.875 - 0.5 = 6.375
   */
  async calculateRateFromFormula(formula: string): Promise<number> {
    if (!formula) {
      throw new Error('Formula is required');
    }

    // Clean formula - extract only the rate calculation part
    // Support formats like:
    // - "MLR + 1.5%"
    // - "MRR + 2.0%"
    // - "ปีที่ 4+: MRR + 1.5%" (extract "MRR + 1.5%")
    // - "Year 4+: MLR + 1.0%" (extract "MLR + 1.0%")
    
    // Try to extract rate formula from text
    const extractMatch = formula.match(/(MLR|MRR)\s*([+-])\s*([\d.]+)%?/i);
    
    if (!extractMatch) {
      throw new Error(`Invalid formula format: ${formula}. Expected format: "MLR + 1.5%" or "MRR + 2.0%"`);
    }

    const [, baseType, operator, marginStr] = extractMatch;
    
    if (!baseType) {
      throw new Error('Invalid base rate type');
    }
    
    const margin = parseFloat(marginStr || '0');

    // Get base rate
    const baseRate = baseType.toUpperCase() === 'MLR' 
      ? await this.getMLR() 
      : await this.getMRR();

    // Calculate final rate
    const finalRate = operator === '+' 
      ? baseRate + margin 
      : baseRate - margin;

    // Ensure rate is within legal limits (0-20%)
    if (finalRate < 0 || finalRate > 20) {
      throw new Error(`Calculated rate ${finalRate}% is outside legal limits (0-20%)`);
    }

    return finalRate;
  }

  /**
   * Get all current rates
   */
  async getAllRates(): Promise<{
    mlr: number;
    mrr: number;
    lastUpdated: string;
    updatedBy?: {
      id: string;
      name: string;
      role: string;
    };
  }> {
    // Fetch configs
    const mlrConfig = await prisma.systemConfig.findUnique({
      where: { key: 'interest_rate.mlr' }
    });

    const mrrConfig = await prisma.systemConfig.findUnique({
      where: { key: 'interest_rate.mrr' }
    });

    const lastUpdatedConfig = await prisma.systemConfig.findUnique({
      where: { key: 'interest_rate.last_updated' }
    });

    // Fetch updater info separately if available
    let updatedBy: { id: string; name: string; role: string } | undefined;
    if (mlrConfig?.updatedBy) {
      const user = await prisma.user.findUnique({
        where: { id: mlrConfig.updatedBy },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        }
      });

      if (user) {
        updatedBy = {
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        };
      }
    }

    return {
      mlr: parseFloat(mlrConfig?.value || '0'),
      mrr: parseFloat(mrrConfig?.value || '0'),
      lastUpdated: lastUpdatedConfig?.value || new Date().toISOString(),
      updatedBy,
    };
  }

  /**
   * Get rate change history (from audit logs)
   */
  async getRateHistory(limit: number = 10): Promise<any[]> {
    const history = await prisma.auditLog.findMany({
      where: {
        entity: 'SystemConfig',
        action: { in: ['UPDATE'] },
        entityId: { in: ['interest_rate.mlr', 'interest_rate.mrr'] },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            role: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return history.map(log => ({
      id: log.id,
      rateType: log.entityId === 'interest_rate.mlr' ? 'MLR' : 'MRR',
      changes: log.changes,
      updatedBy: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Unknown',
      role: log.user?.role,
      createdAt: log.createdAt,
    }));
  }
}

export const interestRateService = new InterestRateService();
