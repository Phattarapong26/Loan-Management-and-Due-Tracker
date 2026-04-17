import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { env } from '@config/env.config';

const SALT_ROUNDS = 12;

/**
 * AES-256-GCM Encryption for sensitive data
 */
export class EncryptionUtil {
    private static algorithm = env.ENCRYPTION_ALGORITHM;
    private static key = (() => {
        const k = env.ENCRYPTION_KEY;
        // If key is 64-char hex string (32 bytes), parse as hex
        // Otherwise treat as raw utf-8 (legacy)
        if (/^[0-9a-fA-F]{64}$/.test(k)) {
            return Buffer.from(k, 'hex');
        }
        return Buffer.from(k, 'utf-8');
    })();

    /**
     * Encrypt data using AES-256-GCM
     */
    static encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM;

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // Return: iv:authTag:encrypted
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    /**
     * Decrypt data using AES-256-GCM
     */
    static decrypt(encryptedData: string): string {
        // Handle seed data format
        if (encryptedData.startsWith('seed_')) {
            const base64Data = encryptedData.replace('seed_', '');
            return Buffer.from(base64Data, 'base64').toString('utf8');
        }

        // Handle legacy format from seed data
        if (encryptedData.startsWith('encrypted_')) {
            // This is legacy seed data, return as-is for now
            return encryptedData.replace('encrypted_', '');
        }

        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const [ivHex, authTagHex, encrypted] = parts as [string, string, string];

        if (!ivHex || !authTagHex || !encrypted) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as crypto.DecipherGCM;
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Hash password using bcrypt
     */
    static async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, SALT_ROUNDS);
    }

    /**
     * Verify password against hash
     */
    static async verifyPassword(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }

    /**
     * Generate SHA-256 hash
     */
    static sha256(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Generate random token
     */
    static generateToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Generate UUID
     */
    static generateUUID(): string {
        return crypto.randomUUID();
    }

    /**
     * Generate random password
     */
    static generateRandomPassword(length: number = 12): string {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        const randomBytes = crypto.randomBytes(length);
        let password = '';

        for (let i = 0; i < length; i++) {
            const byte = randomBytes[i];
            if (byte !== undefined) {
                password += charset[byte % charset.length];
            }
        }

        return password;
    }
}
