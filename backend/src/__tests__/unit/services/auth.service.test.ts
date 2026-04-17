import { AuthService } from '@auth/services/auth.service';
import { UserRepository } from '@users/repositories/user.repository';
import { SessionRepository } from '@auth/repositories/session.repository';
import { EncryptionUtil } from '@utils/security/encryption.util';
import { JWTUtil } from '@utils/security/jwt.util';

// Mock dependencies
jest.mock('@users/repositories/user.repository');
jest.mock('@auth/repositories/session.repository');
jest.mock('../../../utils/encryption.util');
jest.mock('../../../utils/jwt.util');

const mockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;
const mockSessionRepository = SessionRepository as jest.MockedClass<typeof SessionRepository>;
const mockEncryptionUtil = EncryptionUtil as jest.Mocked<typeof EncryptionUtil>;
const mockJWTUtil = JWTUtil as jest.Mocked<typeof JWTUtil>;

// Mock FastifyRequest
const mockRequest = {
  ip: '127.0.0.1',
  headers: {
    'user-agent': 'test-agent',
  },
} as any;

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: jest.Mocked<UserRepository>;
  let mockSessionRepo: jest.Mocked<SessionRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepo = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
    } as any;

    mockSessionRepo = {
      create: jest.fn(),
      findByToken: jest.fn(),
      findByRefreshToken: jest.fn(),
      invalidate: jest.fn(),
    } as any;

    mockUserRepository.mockImplementation(() => mockUserRepo);
    mockSessionRepository.mockImplementation(() => mockSessionRepo);

    authService = new AuthService();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: 'ACTIVE' as const,
        role: 'USER' as const,
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: null,
        branchId: 'branch-1',
        nationalId: null,
        lineUserId: null,
        lineLinkedAt: null,
        lineActive: true,
        lineNotificationsEnabled: true,
        mustChangePassword: false,
        passwordChangedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        branch: {
          id: 'branch-1',
          code: 'TEST001',
          name: 'Test Branch',
        },
        monthlyTarget: 0,
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockEncryptionUtil.verifyPassword.mockResolvedValue(true);
      mockEncryptionUtil.generateUUID.mockReturnValue('session-id');
      mockJWTUtil.generateAccessToken.mockResolvedValue('access-token');
      mockJWTUtil.generateRefreshToken.mockResolvedValue('refresh-token');
      mockSessionRepo.create.mockResolvedValue({
        id: 'session-id',
        token: 'access-token',
        refreshToken: 'refresh-token',
        userId: 'user-1',
        expiresAt: new Date(),
        createdAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        isValid: true,
        previousToken: null,
        previousTokenExpiresAt: null,
        previousRefreshToken: null,
      });

      const result = await authService.login(mockRequest, {
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toEqual(expect.objectContaining({
        id: 'user-1',
        email: 'test@example.com',
      }));
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should fail login with invalid email', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login(mockRequest, {
          email: 'invalid@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should fail login with invalid password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: 'ACTIVE' as const,
        role: 'USER' as const,
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: null,
        branchId: 'branch-1',
        nationalId: null,
        lineUserId: null,
        lineLinkedAt: null,
        lineActive: true,
        lineNotificationsEnabled: true,
        mustChangePassword: false,
        passwordChangedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        branch: null,
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockEncryptionUtil.verifyPassword.mockResolvedValue(false);

      await expect(
        authService.login(mockRequest, {
          email: 'test@example.com',
          password: 'wrong-password',
        })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should fail login with inactive user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: 'INACTIVE' as const,
        role: 'USER' as const,
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: null,
        branchId: 'branch-1',
        nationalId: null,
        lineUserId: null,
        lineLinkedAt: null,
        lineActive: true,
        lineNotificationsEnabled: true,
        mustChangePassword: false,
        passwordChangedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        branch: null,
      };

      mockUserRepo.findByEmail.mockResolvedValue(mockUser);
      mockEncryptionUtil.verifyPassword.mockResolvedValue(true);

      await expect(
        authService.login(mockRequest, {
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Account is not active');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const mockSession = {
        id: 'session-1',
        token: 'valid-token',
        refreshToken: 'refresh-token',
        userId: 'user-1',
        expiresAt: new Date(),
        createdAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        isValid: true,
      };

      mockSessionRepo.findByToken.mockResolvedValue(mockSession);
      mockSessionRepo.invalidate.mockResolvedValue(mockSession);

      await authService.logout('valid-token');

      expect(mockSessionRepo.findByToken).toHaveBeenCalledWith('valid-token');
      expect(mockSessionRepo.invalidate).toHaveBeenCalledWith('session-1');
    });

    it('should handle logout with invalid token', async () => {
      mockSessionRepo.findByToken.mockResolvedValue(null);

      await authService.logout('invalid-token');

      expect(mockSessionRepo.findByToken).toHaveBeenCalledWith('invalid-token');
      expect(mockSessionRepo.invalidate).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('should register successfully with valid data', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'USER',
        branchId: 'branch-1',
      };

      mockUserRepo.findByEmail.mockResolvedValue(null); // User doesn't exist
      mockUserRepo.create.mockResolvedValue(mockUser as any);
      mockUserRepo.findById.mockResolvedValue(mockUser as any);
      mockEncryptionUtil.hashPassword.mockResolvedValue('hashed-password');
      mockEncryptionUtil.generateUUID.mockReturnValue('session-id');
      mockJWTUtil.generateAccessToken.mockResolvedValue('access-token');
      mockJWTUtil.generateRefreshToken.mockResolvedValue('refresh-token');
      mockSessionRepo.create.mockResolvedValue({} as any);

      const result = await authService.register(mockRequest, {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.user.email).toBe('newuser@example.com');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should fail registration with existing email', async () => {
      const existingUser = { id: 'user-1', email: 'existing@example.com' };
      mockUserRepo.findByEmail.mockResolvedValue(existingUser as any);

      await expect(
        authService.register(mockRequest, {
          email: 'existing@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        })
      ).rejects.toThrow('User already exists');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockPayload = { userId: 'user-1', sessionId: 'session-1' };
      const mockSession = {
        id: 'session-1',
        token: 'old-token',
        refreshToken: 'refresh-token',
        userId: 'user-1',
        expiresAt: new Date(),
        createdAt: new Date(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        isValid: true,
      };
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: 'ACTIVE' as const,
        role: 'USER' as const,
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: null,
        branchId: 'branch-1',
        nationalId: null,
        lineUserId: null,
        lineLinkedAt: null,
        lineActive: true,
        lineNotificationsEnabled: true,
        mustChangePassword: false,
        passwordChangedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
        branch: null,
      };

      mockJWTUtil.verifyRefreshToken.mockResolvedValue(mockPayload);
      mockSessionRepo.findByRefreshToken.mockResolvedValue(mockSession);
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockJWTUtil.generateAccessToken.mockResolvedValue('new-access-token');
      mockSessionRepo.invalidate.mockResolvedValue(mockSession);
      mockSessionRepo.create.mockResolvedValue({} as any);

      const result = await authService.refreshToken(mockRequest, 'refresh-token');

      expect(result.accessToken).toBe('new-access-token');
    });

    it('should fail refresh with invalid token', async () => {
      mockJWTUtil.verifyRefreshToken.mockRejectedValue(new Error('Invalid token'));

      await expect(
        authService.refreshToken(mockRequest, 'invalid-refresh-token')
      ).rejects.toThrow('Invalid token');
    });
  });
});