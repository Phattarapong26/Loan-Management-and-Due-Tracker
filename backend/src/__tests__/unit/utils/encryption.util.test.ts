import { EncryptionUtil } from '@utils/security/encryption.util';

describe('EncryptionUtil', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'sensitive-data-123';
      const encrypted = EncryptionUtil.encrypt(originalData);
      const decrypted = EncryptionUtil.decrypt(encrypted);
      
      expect(decrypted).toBe(originalData);
      expect(encrypted).not.toBe(originalData);
      expect(encrypted).toContain(':'); // Should contain IV:authTag:encrypted format
    });

    it('should handle legacy encrypted data format', () => {
      const legacyData = 'encrypted_test123';
      const decrypted = EncryptionUtil.decrypt(legacyData);
      
      expect(decrypted).toBe('test123');
    });

    it('should throw error for invalid encrypted data format', () => {
      expect(() => {
        EncryptionUtil.decrypt('invalid-format');
      }).toThrow('Invalid encrypted data format');
    });
  });

  describe('password hashing', () => {
    it('should hash and verify password correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await EncryptionUtil.hashPassword(password);
      const isValid = await EncryptionUtil.verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
      expect(hash).not.toBe(password);
    });

    it('should reject invalid password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await EncryptionUtil.hashPassword(password);
      const isValid = await EncryptionUtil.verifyPassword(wrongPassword, hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('utility functions', () => {
    it('should generate SHA-256 hash', () => {
      const data = 'test-data';
      const hash = EncryptionUtil.sha256(data);
      
      expect(hash).toHaveLength(64); // SHA-256 produces 64 character hex string
      expect(hash).toMatch(/^[a-f0-9]+$/); // Should be hex
    });

    it('should generate random token', () => {
      const token1 = EncryptionUtil.generateToken();
      const token2 = EncryptionUtil.generateToken();
      
      expect(token1).toHaveLength(64); // Default length 32 bytes = 64 hex chars
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2); // Should be unique
    });

    it('should generate UUID', () => {
      const uuid1 = EncryptionUtil.generateUUID();
      const uuid2 = EncryptionUtil.generateUUID();
      
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(uuid2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate random password with correct length', () => {
      const password = EncryptionUtil.generateRandomPassword(16);
      
      expect(password).toHaveLength(16);
      expect(password).toMatch(/^[a-zA-Z0-9!@#$%^&*]+$/);
    });
  });
});