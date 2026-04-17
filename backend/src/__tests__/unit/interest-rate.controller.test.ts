import { InterestRateController } from '../../controllers/interest-rate.controller';
import { interestRateService } from '../../services/interest-rate.service';
import { FastifyRequest, FastifyReply } from 'fastify';

// Mock the service
jest.mock('../../services/interest-rate.service', () => ({
  interestRateService: {
    getAllRates: jest.fn(),
    updateMLR: jest.fn(),
    updateMRR: jest.fn(),
    calculateRateFromFormula: jest.fn(),
    getRateHistory: jest.fn(),
  },
}));

describe('InterestRateController', () => {
  let controller: InterestRateController;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    controller = new InterestRateController();
    
    mockRequest = {
      body: {},
      query: {},
      params: {},
      user: { id: 'user-123', role: 'ADMIN' },
      id: 'request-123',
    } as any;

    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      request: { id: 'request-123' },
    } as any;

    jest.clearAllMocks();
  });

  describe('getCurrentRates', () => {
    it('should return current rates successfully', async () => {
      // Arrange
      const mockRates = {
        mlr: 6.875,
        mrr: 7.125,
        lastUpdated: '2026-02-04T10:00:00.000Z',
        updatedBy: {
          id: 'user-123',
          name: 'Admin User',
          role: 'ADMIN',
        },
      };

      (interestRateService.getAllRates as jest.Mock).mockResolvedValue(mockRates);

      // Act
      await controller.getCurrentRates(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(interestRateService.getAllRates).toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockRates,
        })
      );
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Database error');
      (interestRateService.getAllRates as jest.Mock).mockRejectedValue(error);

      // Act
      await controller.getCurrentRates(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        })
      );
    });
  });

  describe('updateMLR', () => {
    it('should update MLR successfully', async () => {
      // Arrange
      mockRequest.body = { rate: 7.0 };
      (interestRateService.updateMLR as jest.Mock).mockResolvedValue(undefined);

      // Act
      await controller.updateMLR(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(interestRateService.updateMLR).toHaveBeenCalledWith(7.0, 'user-123');
      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: 'MLR updated successfully and notifications sent',
            rate: 7.0,
          }),
        })
      );
    });

    it('should return 401 if user not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;
      mockRequest.body = { rate: 7.0 };

      // Act
      await controller.updateMLR(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(interestRateService.updateMLR).not.toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid rate (not a number)', async () => {
      // Arrange
      mockRequest.body = { rate: 'invalid' };

      // Act
      await controller.updateMLR(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(interestRateService.updateMLR).not.toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(400);
    });

    it('should return 400 for NaN rate', async () => {
      // Arrange
      mockRequest.body = { rate: NaN };

      // Act
      await controller.updateMLR(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(interestRateService.updateMLR).not.toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(400);
    });

    it('should handle service errors', async () => {
      // Arrange
      mockRequest.body = { rate: 25 };
      const error = new Error('Interest rate must be between 0 and 20');
      (interestRateService.updateMLR as jest.Mock).mockRejectedValue(error);

      // Act
      await controller.updateMLR(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('updateMRR', () => {
    it('should update MRR successfully', async () => {
      // Arrange
      mockRequest.body = { rate: 7.5 };
      (interestRateService.updateMRR as jest.Mock).mockResolvedValue(undefined);

      // Act
      await controller.updateMRR(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(interestRateService.updateMRR).toHaveBeenCalledWith(7.5, 'user-123');
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it('should return 401 if user not authenticated', async () => {
      // Arrange
      mockRequest.user = undefined;
      mockRequest.body = { rate: 7.5 };

      // Act
      await controller.updateMRR(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(interestRateService.updateMRR).not.toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(401);
    });

    it('should return 400 for invalid rate', async () => {
      // Arrange
      mockRequest.body = { rate: 'invalid' };

      // Act
      await controller.updateMRR(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(interestRateService.updateMRR).not.toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('calculateFromFormula', () => {
    it('should calculate rate from formula successfully', async () => {
      // Arrange
      mockRequest.body = { formula: 'MLR + 1.5%' };
      (interestRateService.calculateRateFromFormula as jest.Mock).mockResolvedValue(8.375);

      // Act
      await controller.calculateFromFormula(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(interestRateService.calculateRateFromFormula).toHaveBeenCalledWith('MLR + 1.5%');
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it('should return 400 if formula is missing', async () => {
      // Arrange
      mockRequest.body = {};

      // Act
      await controller.calculateFromFormula(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(interestRateService.calculateRateFromFormula).not.toHaveBeenCalled();
      expect(mockReply.code).toHaveBeenCalledWith(400);
    });

    it('should handle invalid formula errors', async () => {
      // Arrange
      mockRequest.body = { formula: 'INVALID + 1.5%' };
      const error = new Error('Invalid formula format');
      (interestRateService.calculateRateFromFormula as jest.Mock).mockRejectedValue(error);

      // Act
      await controller.calculateFromFormula(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('getRateHistory', () => {
    it('should return rate history with default limit', async () => {
      // Arrange
      const mockHistory = [
        {
          id: '1',
          rateType: 'MLR',
          changes: { oldValue: '6.875', newValue: '7.000' },
          updatedBy: 'Admin User',
          role: 'ADMIN',
          createdAt: new Date('2026-02-04T10:00:00.000Z'),
        },
      ];

      mockRequest.query = {};
      (interestRateService.getRateHistory as jest.Mock).mockResolvedValue(mockHistory);

      // Act
      await controller.getRateHistory(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(interestRateService.getRateHistory).toHaveBeenCalledWith(10);
      expect(mockReply.code).toHaveBeenCalledWith(200);
    });

    it('should return rate history with custom limit', async () => {
      // Arrange
      const mockHistory: any[] = [];
      mockRequest.query = { limit: '5' };
      (interestRateService.getRateHistory as jest.Mock).mockResolvedValue(mockHistory);

      // Act
      await controller.getRateHistory(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(interestRateService.getRateHistory).toHaveBeenCalledWith(5);
    });

    it('should handle errors', async () => {
      // Arrange
      const error = new Error('Database error');
      mockRequest.query = {};
      (interestRateService.getRateHistory as jest.Mock).mockRejectedValue(error);

      // Act
      await controller.getRateHistory(mockRequest as FastifyRequest, mockReply as FastifyReply);

      // Assert
      expect(mockReply.code).toHaveBeenCalledWith(500);
    });
  });
});
