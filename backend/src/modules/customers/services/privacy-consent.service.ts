// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateConsentInput {
  customerId: string;
  consentType: string;
  consentVersion: string;
  consentText: string;
  granted: boolean;
  grantedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateConsentInput {
  granted: boolean;
  revokedAt?: Date;
  revokedReason?: string;
}

export class PrivacyConsentService {
  /**
   * Create a new privacy consent record
   */
  async createConsent(data: CreateConsentInput) {
    return await prisma.privacy_consents.create({
      data: {
        customer_id: data.customerId,
        consent_type: data.consentType,
        consent_version: data.consentVersion,
        consent_text: data.consentText,
        granted: data.granted,
        granted_at: data.grantedAt || new Date(),
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
  }

  /**
   * Get all consents for a customer
   */
  async getCustomerConsents(customerId: string) {
    return await prisma.privacy_consents.findMany({
      where: { customer_id: customerId },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Get latest consent by type
   */
  async getLatestConsent(customerId: string, consentType: string) {
    return await prisma.privacy_consents.findFirst({
      where: {
        customer_id: customerId,
        consent_type: consentType
      },
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Check if customer has granted specific consent
   */
  async hasConsent(customerId: string, consentType: string): Promise<boolean> {
    const consent = await this.getLatestConsent(customerId, consentType);
    return consent?.granted === true && !consent?.revoked_at;
  }

  /**
   * Update consent (revoke or re-grant)
   */
  async updateConsent(consentId: string, data: UpdateConsentInput) {
    return await prisma.privacy_consents.update({
      where: { id: consentId },
      data: {
        granted: data.granted,
        revoked_at: data.revokedAt,
        revoked_reason: data.revokedReason,
        updated_at: new Date()
      }
    });
  }

  /**
   * Revoke consent
   */
  async revokeConsent(consentId: string, reason?: string) {
    return await this.updateConsent(consentId, {
      granted: false,
      revokedAt: new Date(),
      revokedReason: reason
    });
  }

  /**
   * Get consent history for a customer
   */
  async getConsentHistory(customerId: string, consentType?: string) {
    const where: any = { customer_id: customerId };
    if (consentType) {
      where.consent_type = consentType;
    }

    return await prisma.privacy_consents.findMany({
      where,
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Check if customer needs to update consent (version changed)
   */
  async needsConsentUpdate(customerId: string, consentType: string, currentVersion: string): Promise<boolean> {
    const latestConsent = await this.getLatestConsent(customerId, consentType);
    
    if (!latestConsent) return true;
    if (!latestConsent.granted) return true;
    if (latestConsent.revoked_at) return true;
    if (latestConsent.consent_version !== currentVersion) return true;
    
    return false;
  }

  /**
   * Bulk create consents (for customer registration)
   */
  async createBulkConsents(customerId: string, consents: Omit<CreateConsentInput, 'customerId'>[]) {
    const data = consents.map(consent => ({
      customer_id: customerId,
      consent_type: consent.consentType,
      consent_version: consent.consentVersion,
      consent_text: consent.consentText,
      granted: consent.granted,
      granted_at: consent.grantedAt || new Date(),
      ip_address: consent.ipAddress,
      user_agent: consent.userAgent,
      created_at: new Date(),
      updated_at: new Date()
    }));

    return await prisma.privacy_consents.createMany({ data });
  }

  /**
   * Get consent statistics
   */
  async getConsentStats() {
    const total = await prisma.privacy_consents.count();
    const granted = await prisma.privacy_consents.count({
      where: { granted: true, revoked_at: null }
    });
    const revoked = await prisma.privacy_consents.count({
      where: { revoked_at: { not: null } }
    });

    return {
      total,
      granted,
      revoked,
      grantedPercentage: total > 0 ? (granted / total) * 100 : 0
    };
  }
}

export const privacyConsentService = new PrivacyConsentService();
