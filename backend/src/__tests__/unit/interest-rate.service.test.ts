import { InterestRateService } from '../../services/interest-rate.service';
import { prisma } from '../../config/database';
import { logger } from '@utils/common/logger.util';

// Mock Prisma
jest.mock('../../config/database', () => ({
  prisma: {
    systemConfig: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
  },
}));

// Mock Logger
jest.mock('@utils/logger.util', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock LINE Service
jest.mock('../../services/line.service', () => ({
  LineService: jest.fn().mockImplementation(() => ({
    pushMessage: jest.fn().mockResolvedValue(true),
  })),
}));

describe('InterestRateService', () => {
  let service: InterestRateService;

  beforeEach(() => {
    service = new InterestRateService();
    jest.clearAllMocks();
  });

  describe('getMLR', () => {
    it('should return MLR rate from database', async () => {
      // Arrange
      const mockConfig = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);

      // Act
      const result = await service.getMLR();

      // Assert
      expect(result).toBe(6.875);
      expect(prisma.systemConfig.findUnique).toHaveBeenCalledWith({
        where: { key: 'interest_rate.mlr' },
      });
    });

    it('should throw error if MLR not configured', async () => {
      // Arrange
      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getMLR()).rejects.toThrow('MLR rate not configured');
    });
  });

  describe('getMRR', () => {
    it('should return MRR rate from database', async () => {
      // Arrange
      const mockConfig = {
        id: '2',
        key: 'interest_rate.mrr',
        value: '7.125',
        category: 'INTEREST_RATE',
        description: 'MRR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockConfig);

      // Act
      const result = await service.getMRR();

      // Assert
      expect(result).toBe(7.125);
      expect(prisma.systemConfig.findUnique).toHaveBeenCalledWith({
        where: { key: 'interest_rate.mrr' },
      });
    });

    it('should throw error if MRR not configured', async () => {
      // Arrange
      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getMRR()).rejects.toThrow('MRR rate not configured');
    });
  });

  describe('updateMLR', () => {
    it('should update MLR rate successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const newRate = 7.0;
      const oldRate = 6.875;

      const mockOldConfig = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: userId,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockOldConfig);
      (prisma.systemConfig.update as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.updateMLR(newRate, userId);

      // Assert
      expect(prisma.systemConfig.update).toHaveBeenCalledWith({
        where: { key: 'interest_rate.mlr' },
        data: {
          value: '7',
          updatedBy: userId,
        },
      });

      expect(prisma.systemConfig.update).toHaveBeenCalledWith({
        where: { key: 'interest_rate.last_updated' },
        data: {
          value: expect.any(String),
          updatedBy: userId,
        },
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MLR_UPDATE',
          oldRate,
          newRate,
          updatedBy: userId,
        }),
        'MLR rate updated'
      );
    });

    it('should reject rate below 0%', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidRate = -1;

      // Act & Assert
      await expect(service.updateMLR(invalidRate, userId)).rejects.toThrow(
        'Interest rate must be between 0 and 20'
      );
    });

    it('should reject rate above 20%', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidRate = 21;

      // Act & Assert
      await expect(service.updateMLR(invalidRate, userId)).rejects.toThrow(
        'Interest rate must be between 0 and 20'
      );
    });

    it('should accept rate at 0%', async () => {
      // Arrange
      const userId = 'user-123';
      const validRate = 0;

      const mockOldConfig = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: userId,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockOldConfig);
      (prisma.systemConfig.update as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.updateMLR(validRate, userId);

      // Assert
      expect(prisma.systemConfig.update).toHaveBeenCalled();
    });

    it('should accept rate at 20%', async () => {
      // Arrange
      const userId = 'user-123';
      const validRate = 20;

      const mockOldConfig = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: userId,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockOldConfig);
      (prisma.systemConfig.update as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.updateMLR(validRate, userId);

      // Assert
      expect(prisma.systemConfig.update).toHaveBeenCalled();
    });
  });

  describe('updateMRR', () => {
    it('should update MRR rate successfully', async () => {
      // Arrange
      const userId = 'user-123';
      const newRate = 7.5;
      const oldRate = 7.125;

      const mockOldConfig = {
        id: '2',
        key: 'interest_rate.mrr',
        value: '7.125',
        category: 'INTEREST_RATE',
        description: 'MRR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUser = {
        id: userId,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockOldConfig);
      (prisma.systemConfig.update as jest.Mock).mockResolvedValue({});
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      // Act
      await service.updateMRR(newRate, userId);

      // Assert
      expect(prisma.systemConfig.update).toHaveBeenCalledWith({
        where: { key: 'interest_rate.mrr' },
        data: {
          value: '7.5',
          updatedBy: userId,
        },
      });

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MRR_UPDATE',
          oldRate,
          newRate,
          updatedBy: userId,
        }),
        'MRR rate updated'
      );
    });

    it('should reject invalid MRR rate', async () => {
      // Arrange
      const userId = 'user-123';
      const invalidRate = 25;

      // Act & Assert
      await expect(service.updateMRR(invalidRate, userId)).rejects.toThrow(
        'Interest rate must be between 0 and 20'
      );
    });
  });

  describe('calculateRateFromFormula', () => {
    it('should calculate MLR + margin correctly', async () => {
      // Arrange
      const formula = 'MLR + 1.5%';
      const mockMLR = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockMLR);

      // Act
      const result = await service.calculateRateFromFormula(formula);

      // Assert
      expect(result).toBe(8.375); // 6.875 + 1.5
    });

    it('should calculate MLR - margin correctly', async () => {
      // Arrange
      const formula = 'MLR - 0.5%';
      const mockMLR = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockMLR);

      // Act
      const result = await service.calculateRateFromFormula(formula);

      // Assert
      expect(result).toBe(6.375); // 6.875 - 0.5
    });

    it('should calculate MRR + margin correctly', async () => {
      // Arrange
      const formula = 'MRR + 2.0%';
      const mockMRR = {
        id: '2',
        key: 'interest_rate.mrr',
        value: '7.125',
        category: 'INTEREST_RATE',
        description: 'MRR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockMRR);

      // Act
      const result = await service.calculateRateFromFormula(formula);

      // Assert
      expect(result).toBe(9.125); // 7.125 + 2.0
    });

    it('should calculate MRR - margin correctly', async () => {
      // Arrange
      const formula = 'MRR - 1.0%';
      const mockMRR = {
        id: '2',
        key: 'interest_rate.mrr',
        value: '7.125',
        category: 'INTEREST_RATE',
        description: 'MRR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockMRR);

      // Act
      const result = await service.calculateRateFromFormula(formula);

      // Assert
      expect(result).toBe(6.125); // 7.125 - 1.0
    });

    it('should handle formula without % sign', async () => {
      // Arrange
      const formula = 'MLR + 1.5';
      const mockMLR = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockMLR);

      // Act
      const result = await service.calculateRateFromFormula(formula);

      // Assert
      expect(result).toBe(8.375);
    });

    it('should handle formula with spaces', async () => {
      // Arrange
      const formula = 'MLR + 1.5%'; // Single space works
      const mockMLR = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockMLR);

      // Act
      const result = await service.calculateRateFromFormula(formula);

      // Assert
      expect(result).toBe(8.375);
    });

    it('should handle case-insensitive formula', async () => {
      // Arrange
      const formula = 'mlr + 1.5%';
      const mockMLR = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockMLR);

      // Act
      const result = await service.calculateRateFromFormula(formula);

      // Assert
      expect(result).toBe(8.375);
    });

    it('should throw error for empty formula', async () => {
      // Act & Assert
      await expect(service.calculateRateFromFormula('')).rejects.toThrow(
        'Formula is required'
      );
    });

    it('should throw error for invalid formula format', async () => {
      // Arrange
      const invalidFormula = 'INVALID + 1.5%';

      // Act & Assert
      await expect(service.calculateRateFromFormula(invalidFormula)).rejects.toThrow(
        'Invalid formula format'
      );
    });

    it('should throw error if calculated rate exceeds 20%', async () => {
      // Arrange
      const formula = 'MLR + 15%';
      const mockMLR = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockMLR);

      // Act & Assert
      await expect(service.calculateRateFromFormula(formula)).rejects.toThrow(
        'Calculated rate 21.875% is outside legal limits (0-20%)'
      );
    });

    it('should throw error if calculated rate is negative', async () => {
      // Arrange
      const formula = 'MLR - 10%';
      const mockMLR = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockMLR);

      // Act & Assert
      await expect(service.calculateRateFromFormula(formula)).rejects.toThrow(
        'Calculated rate -3.125% is outside legal limits (0-20%)'
      );
    });

    it('should accept calculated rate at exactly 0%', async () => {
      // Arrange
      const formula = 'MLR - 6.875%';
      const mockMLR = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockMLR);

      // Act
      const result = await service.calculateRateFromFormula(formula);

      // Assert
      expect(result).toBe(0);
    });

    it('should accept calculated rate at exactly 20%', async () => {
      // Arrange
      const formula = 'MLR + 13.125%';
      const mockMLR = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock).mockResolvedValue(mockMLR);

      // Act
      const result = await service.calculateRateFromFormula(formula);

      // Assert
      expect(result).toBe(20);
    });
  });

  describe('getAllRates', () => {
    it('should return all rates with updater info', async () => {
      // Arrange
      const mockMLR = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedByUser: {
          id: 'user-123',
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
        },
      };

      const mockMRR = {
        id: '2',
        key: 'interest_rate.mrr',
        value: '7.125',
        category: 'INTEREST_RATE',
        description: 'MRR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLastUpdated = {
        id: '3',
        key: 'interest_rate.last_updated',
        value: '2026-02-04T10:00:00.000Z',
        category: 'INTEREST_RATE',
        description: 'Last Updated',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMLR)
        .mockResolvedValueOnce(mockMRR)
        .mockResolvedValueOnce(mockLastUpdated);

      // Act
      const result = await service.getAllRates();

      // Assert
      expect(result).toEqual({
        mlr: 6.875,
        mrr: 7.125,
        lastUpdated: '2026-02-04T10:00:00.000Z',
        updatedBy: {
          id: 'user-123',
          name: 'Admin User',
          role: 'ADMIN',
        },
      });
    });

    it('should return rates without updater info if not available', async () => {
      // Arrange
      const mockMLR = {
        id: '1',
        key: 'interest_rate.mlr',
        value: '6.875',
        category: 'INTEREST_RATE',
        description: 'MLR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedByUser: null,
      };

      const mockMRR = {
        id: '2',
        key: 'interest_rate.mrr',
        value: '7.125',
        category: 'INTEREST_RATE',
        description: 'MRR',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockLastUpdated = {
        id: '3',
        key: 'interest_rate.last_updated',
        value: '2026-02-04T10:00:00.000Z',
        category: 'INTEREST_RATE',
        description: 'Last Updated',
        updatedBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.systemConfig.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMLR)
        .mockResolvedValueOnce(mockMRR)
        .mockResolvedValueOnce(mockLastUpdated);

      // Act
      const result = await service.getAllRates();

      // Assert
      expect(result.updatedBy).toBeUndefined();
    });
  });
});
