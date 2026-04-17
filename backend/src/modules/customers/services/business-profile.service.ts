// @ts-nocheck
/**
 * Business Profile Service
 * 
 * Service for managing customer business profiles from Excel parsing
 */

import { PrismaClient, Prisma } from '@prisma/client';
import type { ParsedBusinessProfile } from '../types/business-profile.types';

const prisma = new PrismaClient();

export interface SaveProfileOptions {
  customerId: string;
  parsedData: ParsedBusinessProfile;
  documentId?: string;
  action: 'create' | 'link';
  existingCustomerId?: string;
}

export interface ProfileWithRelations {
  id: string;
  customerId: string;
  sourceFileName: string;
  matchConfidence: number;
  status: string;
  reviewStatus: string;
  version: number;
  isLatest: boolean;
  createdAt: Date;
  updatedAt: Date;
  shareholders: any[];
  loanRequests: any[];
  collaterals: any[];
  executives: any[];
  suppliers: any[];
  customers: any[];
  dscrAnalysis: any[];
  approvalComments: any[];
}

/**
 * Save parsed business profile to database
 */
export async function saveBusinessProfile(
  options: SaveProfileOptions
): Promise<ProfileWithRelations> {
  const { customerId, parsedData, documentId } = options;

  // Get the highest version number for this customer
  const latestVersion = await prisma.customerBusinessProfile.findFirst({
    where: { customerId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const version = (latestVersion?.version || 0) + 1;

  // Mark all previous versions as not latest
  if (latestVersion) {
    await prisma.customerBusinessProfile.updateMany({
      where: {
        customerId,
        isLatest: true,
      },
      data: { isLatest: false },
    });
  }

  // Prepare profile data
  // @ts-ignore - Prisma type compatibility
  const profileData: Prisma.CustomerBusinessProfileCreateInput = {
    customer: {
      connect: { id: customerId },
    },
    sourceFileName: parsedData.sourceFileName,
    sourceFileHash: parsedData.sourceFileName, // TODO: Calculate actual hash
    document: documentId ? { connect: { id: documentId } } : undefined,
    parserVersion: 'v3.0',
    matchConfidence: new Prisma.Decimal(parsedData.matchConfidence),
    sheetsParsed: parsedData.sheetsParsed || [],
    warnings: parsedData.warnings || [],
    status: 'DRAFT',
    reviewStatus: 'PENDING',
    version,
    isLatest: true,
    enhancedData: parsedData.enhancedData as Prisma.InputJsonValue,
    recommendation: parsedData.recommendation,
    metadata: {} as Prisma.InputJsonValue,

    // Create related records
    shareholders: {
      create: (parsedData.shareholders || []).map((sh, idx) => ({
        name: sh.name || '',
        nationalId: null,
        sharePercentage: new Prisma.Decimal(sh.sharePercentage || 0),
        shareValue: new Prisma.Decimal(sh.shareValue || 0),
        shareType: 'ORDINARY',
        hasSigningAuthority: sh.hasSigningAuthority || false,
        signingConditions: sh.conditions,
        position: null,
        phone: null,
        email: null,
        address: null,
        order: idx + 1,
      })),
    },

    loanRequests: {
      create: [
        // Existing loans
        ...(parsedData.loanSummary?.existingLoans || []).map((loan, idx) => ({
          loanType: loan.loanType || 'PN',
          productName: loan.productName || 'สินเชื่อ SME',
          requestedAmount: new Prisma.Decimal(loan.amount || 0),
          purpose: null,
          termMonths: loan.loanTerm ? parseInt(loan.loanTerm) : null,
          proposedInterestRate: loan.interestRate,
          interestCalculation: null,
          collateralDescription: loan.collateral,
          collateralValue: null,
          requestType: 'EXISTING',
          status: loan.status || 'ACTIVE',
          loanId: null,
          order: idx + 1,
        })),
        // New loans
        ...(parsedData.loanSummary?.newLoans || []).map((loan, idx) => ({
          loanType: loan.loanType || 'PN',
          productName: loan.productName || 'สินเชื่อ SME',
          requestedAmount: new Prisma.Decimal(loan.amount || 0),
          purpose: null,
          termMonths: loan.loanTerm ? parseInt(loan.loanTerm) : null,
          proposedInterestRate: loan.interestRate,
          interestCalculation: null,
          collateralDescription: loan.collateral,
          collateralValue: null,
          requestType: 'NEW',
          status: 'PENDING',
          loanId: null,
          order: (parsedData.loanSummary?.existingLoans?.length || 0) + idx + 1,
        })),
      ],
    },

    collaterals: {
      create: (parsedData.collaterals || []).map((col, idx) => ({
        collateralType: col.type || 'OTHER',
        description: col.description || '',
        location: null,
        estimatedValue: new Prisma.Decimal(col.estimatedValue || 0),
        appraisedValue: null,
        appraisedBy: null,
        appraisedDate: null,
        ownerName: null,
        ownerRelationship: null,
        titleDeedNumber: null,
        landOffice: null,
        registrationNumber: null,
        isInsured: false,
        insuranceCompany: null,
        insuranceValue: null,
        order: idx + 1,
        attachments: null,
      })),
    },

    suppliers: {
      create: (parsedData.suppliers || []).map((sup, idx) => ({
        name: sup.name || '',
        address: sup.address,
        phone: sup.phone,
        contactPerson: null,
        productType: sup.productType,
        paymentTerms: sup.paymentTerms,
        creditLimit: sup.creditLimit ? new Prisma.Decimal(sup.creditLimit) : null,
        contactDuration: sup.contactDuration,
        relationshipQuality: null,
        order: idx + 1,
      })),
    },

    customers: {
      create: (parsedData.customers || []).map((cust, idx) => ({
        name: cust.name || '',
        address: cust.address,
        phone: cust.phone,
        contactPerson: null,
        productService: cust.productService,
        paymentTerms: cust.paymentTerms,
        salesProportion: cust.salesProportion ? new Prisma.Decimal(cust.salesProportion) : null,
        contactDuration: cust.contactDuration,
        relationshipQuality: null,
        order: idx + 1,
      })),
    },

    dscrAnalysis: parsedData.dscr?.dscrRatio
      ? {
          create: {
            analysisYear: parsedData.dscr.analysisYear || new Date().getFullYear(),
            analysisPeriod: null,
            netOperatingIncome: new Prisma.Decimal(parsedData.dscr.netOperatingIncome || 0),
            otherIncome: null,
            totalIncome: new Prisma.Decimal(parsedData.dscr.netOperatingIncome || 0),
            principalPayment: new Prisma.Decimal(parsedData.dscr.totalDebtService || 0),
            interestPayment: new Prisma.Decimal(0),
            totalDebtService: new Prisma.Decimal(parsedData.dscr.totalDebtService || 0),
            dscrRatio: new Prisma.Decimal(parsedData.dscr.dscrRatio || 0),
            dscrStatus: parsedData.dscr.dscrStatus || 'UNKNOWN',
            breakdown: null,
          },
        }
      : undefined,

    approvalComments: parsedData.approvalComments
      ? {
          create: [
            // Marketing Officer
            parsedData.approvalComments.marketingOfficer && {
              commentType: 'MARKETING',
              commentBy: parsedData.approvalComments.marketingOfficer.name || '',
              position: 'เจ้าหน้าที่การตลาด',
              comments: parsedData.approvalComments.marketingOfficer.comments || '',
              commentDate: parsedData.approvalComments.marketingOfficer.date
                ? new Date(parsedData.approvalComments.marketingOfficer.date)
                : new Date(),
            },
            // Credit Officer
            parsedData.approvalComments.creditOfficer && {
              commentType: 'CREDIT',
              commentBy: parsedData.approvalComments.creditOfficer.name || '',
              position: 'เจ้าหน้าที่สินเชื่อ',
              comments: parsedData.approvalComments.creditOfficer.comments || '',
              riskAssessment: parsedData.approvalComments.creditOfficer.riskAssessment,
              recommendation: parsedData.approvalComments.creditOfficer.recommendation,
              commentDate: parsedData.approvalComments.creditOfficer.date
                ? new Date(parsedData.approvalComments.creditOfficer.date)
                : new Date(),
            },
            // Branch Manager
            parsedData.approvalComments.branchManager && {
              commentType: 'BRANCH_MANAGER',
              commentBy: parsedData.approvalComments.branchManager.name || '',
              position: 'ผู้จัดการสาขา',
              comments: parsedData.approvalComments.branchManager.comments || '',
              recommendation: parsedData.approvalComments.branchManager.recommendation,
              commentDate: parsedData.approvalComments.branchManager.date
                ? new Date(parsedData.approvalComments.branchManager.date)
                : new Date(),
            },
            // Approver
            parsedData.approvalComments.approver && {
              commentType: 'APPROVER',
              commentBy: parsedData.approvalComments.approver.name || '',
              position: parsedData.approvalComments.approver.position || 'ผู้อนุมัติ',
              comments: '',
              decision: parsedData.approvalComments.approver.decision,
              approvedAmount: parsedData.approvalComments.approver.approvedAmount
                ? new Prisma.Decimal(parsedData.approvalComments.approver.approvedAmount)
                : undefined,
              specialConditions: parsedData.approvalComments.approver.specialConditions,
              commentDate: parsedData.approvalComments.approver.approvalDate
                ? new Date(parsedData.approvalComments.approver.approvalDate)
                : new Date(),
            },
          ].filter((item): item is Exclude<typeof item, false | undefined> => Boolean(item)),
        }
      : undefined,
  };

  // Save to database
  // @ts-ignore - Prisma type compatibility
  const profile = await prisma.customerBusinessProfile.create({
    data: profileData,
    include: {
      shareholders: { orderBy: { order: 'asc' } },
      loanRequests: { orderBy: { order: 'asc' } },
      collaterals: { orderBy: { order: 'asc' } },
      executives: { orderBy: { order: 'asc' } },
      suppliers: { orderBy: { order: 'asc' } },
      customers: { orderBy: { order: 'asc' } },
      dscrAnalysis: { orderBy: { analysisYear: 'desc' } },
      approvalComments: { orderBy: { commentDate: 'asc' } },
    },
  });

  // Also save to existing tables for backward compatibility
  await saveToExistingTables(customerId, parsedData);

  // @ts-ignore - Prisma type compatibility
  return profile as ProfileWithRelations;
}

/**
 * Save to existing tables for backward compatibility
 */
async function saveToExistingTables(
  customerId: string,
  parsedData: ParsedBusinessProfile
): Promise<void> {
  // Update customer basic info
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      annualRevenue: parsedData.financialStatements?.[0]?.amount
        ? new Prisma.Decimal(parsedData.financialStatements[0].amount)
        : undefined,
      totalAssets: parsedData.balanceSheets?.[0]?.totalAssets
        ? new Prisma.Decimal(parsedData.balanceSheets[0].totalAssets)
        : undefined,
      totalLiabilities: parsedData.balanceSheets?.[0]?.totalLiabilities
        ? new Prisma.Decimal(parsedData.balanceSheets[0].totalLiabilities)
        : undefined,
      aiExtractedData: parsedData as any,
      aiConfidenceScore: new Prisma.Decimal(parsedData.matchConfidence * 100),
      aiProcessedAt: new Date(),
      aiWarnings: parsedData.warnings || [],
    },
  });

  // Save VAT records
  if (parsedData.vatRecords && parsedData.vatRecords.length > 0) {
    await prisma.customerVATRecord.createMany({
      data: parsedData.vatRecords.map((vat) => ({
        customerId,
        month: vat.period,
        year: null,
        salesAmount: new Prisma.Decimal(vat.salesAmount || 0),
        salesTax: new Prisma.Decimal(vat.salesTax || 0),
        purchaseAmount: new Prisma.Decimal(vat.purchaseAmount || 0),
        purchaseTax: new Prisma.Decimal(vat.purchaseTax || 0),
        taxPayable: new Prisma.Decimal(vat.taxWithheld || 0),
        details: vat as any,
      })),
      skipDuplicates: true,
    });
  }

  // Save financial statements
  if (parsedData.financialStatements && parsedData.financialStatements.length > 0) {
    const years = [...new Set(parsedData.financialStatements.map((fs) => fs.year))];
    
    for (const year of years) {
      const yearData = parsedData.financialStatements.filter((fs) => fs.year === year);
      const revenue = yearData.find((fs) => fs.category === 'revenue')?.amount || 0;
      const netProfit = yearData.find((fs) => fs.category === 'profit')?.amount || 0;

      await prisma.customerFinancialStatement.upsert({
        where: {
          customerId_year: {
            customerId,
            year,
          },
        },
        create: {
          customerId,
          year,
          revenue: new Prisma.Decimal(revenue),
          netProfit: new Prisma.Decimal(netProfit),
        },
        update: {
          revenue: new Prisma.Decimal(revenue),
          netProfit: new Prisma.Decimal(netProfit),
        },
      });
    }
  }

  // Save credit bureau reports
  if (parsedData.creditBureauReports && parsedData.creditBureauReports.length > 0) {
    await prisma.customerCreditBureau.createMany({
      data: parsedData.creditBureauReports.map((cb) => ({
        customerId,
        type: 'NCB',
        name: cb.borrowerName || '',
        checkDate: cb.reportDate ? new Date(cb.reportDate) : null,
        totalLimit: cb.totalCreditLimit ? new Prisma.Decimal(cb.totalCreditLimit) : null,
        totalOutstanding: cb.totalOutstanding ? new Prisma.Decimal(cb.totalOutstanding) : null,
        numberOfAccounts: cb.nplAccounts || 0,
        nplStatus: cb.nplAccounts > 0,
        accounts: cb.accounts as any,
      })),
      skipDuplicates: true,
    });
  }

  // Save bank statements
  if (parsedData.bankStatements && parsedData.bankStatements.length > 0) {
    for (const stmt of parsedData.bankStatements) {
      const bankStatement = await prisma.customerBankStatement.create({
        data: {
          customerId,
          bankName: stmt.bank,
          accountNumber: stmt.accountNumber,
          accountName: stmt.accountName,
        },
      });

      if (stmt.monthlyTransactions && stmt.monthlyTransactions.length > 0) {
        await prisma.customerBankStatementMonth.createMany({
          data: stmt.monthlyTransactions.map((month) => ({
            statementId: bankStatement.id,
            month: month.month,
            withdrawCount: month.withdrawalCount || 0,
            withdrawAmount: new Prisma.Decimal(month.withdrawalAmount || 0),
            depositCount: month.depositCount || 0,
            depositAmount: new Prisma.Decimal(month.depositAmount || 0),
            balance: new Prisma.Decimal(month.balance || 0),
          })),
        });
      }
    }
  }
}

/**
 * Get latest business profile for customer
 */
export async function getLatestBusinessProfile(
  customerId: string
): Promise<ProfileWithRelations | null> {
  // @ts-ignore - Prisma type compatibility
  return await prisma.customerBusinessProfile.findFirst({
    where: {
      customerId,
      isLatest: true,
    },
    include: {
      shareholders: { orderBy: { order: 'asc' } },
      loanRequests: { orderBy: { order: 'asc' } },
      collaterals: { orderBy: { order: 'asc' } },
      executives: { orderBy: { order: 'asc' } },
      suppliers: { orderBy: { order: 'asc' } },
      customers: { orderBy: { order: 'asc' } },
      dscrAnalysis: { orderBy: { analysisYear: 'desc' } },
      approvalComments: { orderBy: { commentDate: 'asc' } },
    },
  }) as ProfileWithRelations | null;
}

/**
 * Get all versions of business profile for customer
 */
export async function getBusinessProfileVersions(
  customerId: string
): Promise<ProfileWithRelations[]> {
  // @ts-ignore - Prisma type compatibility
  return await prisma.customerBusinessProfile.findMany({
    where: { customerId },
    orderBy: { version: 'desc' },
    include: {
      shareholders: { orderBy: { order: 'asc' } },
      loanRequests: { orderBy: { order: 'asc' } },
      collaterals: { orderBy: { order: 'asc' } },
      executives: { orderBy: { order: 'asc' } },
      suppliers: { orderBy: { order: 'asc' } },
      customers: { orderBy: { order: 'asc' } },
      dscrAnalysis: { orderBy: { analysisYear: 'desc' } },
      approvalComments: { orderBy: { commentDate: 'asc' } },
    },
  }) as ProfileWithRelations[];
}

/**
 * Update profile review status
 */
export async function updateProfileReviewStatus(
  profileId: string,
  reviewStatus: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION',
  reviewedBy: string,
  reviewNotes?: string
): Promise<void> {
  await prisma.customerBusinessProfile.update({
    where: { id: profileId },
    data: {
      reviewStatus,
      reviewedBy,
      reviewedAt: new Date(),
      reviewNotes,
      status: reviewStatus === 'APPROVED' ? 'APPROVED' : 'DRAFT',
    },
  });
}

/**
 * Update business profile data (creates new version)
 */
export async function updateBusinessProfile(
  profileId: string,
  parsedData: ParsedBusinessProfile
): Promise<ProfileWithRelations> {
  // Get current profile
  const current = await prisma.customerBusinessProfile.findUnique({
    where: { id: profileId },
  });

  if (!current) {
    throw new Error('Profile not found');
  }

  // Get the highest version number for this customer
  const latestVersion = await prisma.customerBusinessProfile.findFirst({
    where: { customerId: current.customerId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const newVersion = (latestVersion?.version || 0) + 1;

  // Mark old version as not latest
  await prisma.customerBusinessProfile.update({
    where: { id: profileId },
    data: { isLatest: false },
  });

  // Prepare profile data with new version
  // @ts-ignore - Prisma type compatibility
  const profileData: Prisma.CustomerBusinessProfileCreateInput = {
    customer: {
      connect: { id: current.customerId },
    },
    sourceFileName: parsedData.sourceFileName,
    sourceFileHash: parsedData.sourceFileName,
    document: current.documentId ? { connect: { id: current.documentId } } : undefined,
    parserVersion: 'v3.0',
    matchConfidence: new Prisma.Decimal(parsedData.matchConfidence),
    sheetsParsed: parsedData.sheetsParsed || [],
    warnings: parsedData.warnings || [],
    status: 'DRAFT',
    reviewStatus: 'PENDING',
    version: newVersion,
    isLatest: true,
    previousVersion: {
      connect: { id: profileId },
    },
    enhancedData: parsedData.enhancedData as Prisma.InputJsonValue,
    recommendation: parsedData.recommendation,
    metadata: {} as Prisma.InputJsonValue,

    // Create related records (same as saveBusinessProfile)
    shareholders: {
      create: (parsedData.shareholders || []).map((sh, idx) => ({
        name: sh.name || '',
        nationalId: null,
        sharePercentage: new Prisma.Decimal(sh.sharePercentage || 0),
        shareValue: new Prisma.Decimal(sh.shareValue || 0),
        shareType: 'ORDINARY',
        hasSigningAuthority: sh.hasSigningAuthority || false,
        signingConditions: sh.conditions,
        position: null,
        phone: null,
        email: null,
        address: null,
        order: idx + 1,
      })),
    },

    loanRequests: {
      create: [
        ...(parsedData.loanSummary?.existingLoans || []).map((loan, idx) => ({
          loanType: loan.loanType || 'PN',
          productName: loan.productName || 'สินเชื่อ SME',
          requestedAmount: new Prisma.Decimal(loan.amount || 0),
          purpose: null,
          termMonths: loan.loanTerm ? parseInt(loan.loanTerm) : null,
          proposedInterestRate: loan.interestRate,
          interestCalculation: null,
          collateralDescription: loan.collateral,
          collateralValue: null,
          requestType: 'EXISTING',
          status: loan.status || 'ACTIVE',
          loanId: null,
          order: idx + 1,
        })),
        ...(parsedData.loanSummary?.newLoans || []).map((loan, idx) => ({
          loanType: loan.loanType || 'PN',
          productName: loan.productName || 'สินเชื่อ SME',
          requestedAmount: new Prisma.Decimal(loan.amount || 0),
          purpose: null,
          termMonths: loan.loanTerm ? parseInt(loan.loanTerm) : null,
          proposedInterestRate: loan.interestRate,
          interestCalculation: null,
          collateralDescription: loan.collateral,
          collateralValue: null,
          requestType: 'NEW',
          status: 'PENDING',
          loanId: null,
          order: (parsedData.loanSummary?.existingLoans?.length || 0) + idx + 1,
        })),
      ],
    },

    collaterals: {
      create: (parsedData.collaterals || []).map((col, idx) => ({
        collateralType: col.type || 'OTHER',
        description: col.description || '',
        location: null,
        estimatedValue: new Prisma.Decimal(col.estimatedValue || 0),
        appraisedValue: null,
        appraisedBy: null,
        appraisedDate: null,
        ownerName: null,
        ownerRelationship: null,
        titleDeedNumber: null,
        landOffice: null,
        registrationNumber: null,
        isInsured: false,
        insuranceCompany: null,
        insuranceValue: null,
        order: idx + 1,
        attachments: null,
      })),
    },

    suppliers: {
      create: (parsedData.suppliers || []).map((sup, idx) => ({
        name: sup.name || '',
        address: sup.address,
        phone: sup.phone,
        contactPerson: null,
        productType: sup.productType,
        paymentTerms: sup.paymentTerms,
        creditLimit: sup.creditLimit ? new Prisma.Decimal(sup.creditLimit) : null,
        contactDuration: sup.contactDuration,
        relationshipQuality: null,
        order: idx + 1,
      })),
    },

    customers: {
      create: (parsedData.customers || []).map((cust, idx) => ({
        name: cust.name || '',
        address: cust.address,
        phone: cust.phone,
        contactPerson: null,
        productService: cust.productService,
        paymentTerms: cust.paymentTerms,
        salesProportion: cust.salesProportion ? new Prisma.Decimal(cust.salesProportion) : null,
        contactDuration: cust.contactDuration,
        relationshipQuality: null,
        order: idx + 1,
      })),
    },

    dscrAnalysis: parsedData.dscr?.dscrRatio
      ? {
          create: {
            analysisYear: parsedData.dscr.analysisYear || new Date().getFullYear(),
            analysisPeriod: null,
            netOperatingIncome: new Prisma.Decimal(parsedData.dscr.netOperatingIncome || 0),
            otherIncome: null,
            totalIncome: new Prisma.Decimal(parsedData.dscr.netOperatingIncome || 0),
            principalPayment: new Prisma.Decimal(parsedData.dscr.totalDebtService || 0),
            interestPayment: new Prisma.Decimal(0),
            totalDebtService: new Prisma.Decimal(parsedData.dscr.totalDebtService || 0),
            dscrRatio: new Prisma.Decimal(parsedData.dscr.dscrRatio || 0),
            dscrStatus: parsedData.dscr.dscrStatus || 'UNKNOWN',
            breakdown: null,
          },
        }
      : undefined,

    approvalComments: parsedData.approvalComments
      ? {
          create: [
            parsedData.approvalComments.marketingOfficer && {
              commentType: 'MARKETING',
              commentBy: parsedData.approvalComments.marketingOfficer.name || '',
              position: 'เจ้าหน้าที่การตลาด',
              comments: parsedData.approvalComments.marketingOfficer.comments || '',
              riskAssessment: null,
              recommendation: null,
              decision: null,
              approvedAmount: null,
              specialConditions: null,
              commentDate: parsedData.approvalComments.marketingOfficer.date
                ? new Date(parsedData.approvalComments.marketingOfficer.date)
                : new Date(),
            },
            parsedData.approvalComments.creditOfficer && {
              commentType: 'CREDIT',
              commentBy: parsedData.approvalComments.creditOfficer.name || '',
              position: 'เจ้าหน้าที่สินเชื่อ',
              comments: parsedData.approvalComments.creditOfficer.comments || '',
              riskAssessment: parsedData.approvalComments.creditOfficer.riskAssessment,
              recommendation: parsedData.approvalComments.creditOfficer.recommendation,
              decision: null,
              approvedAmount: null,
              specialConditions: null,
              commentDate: parsedData.approvalComments.creditOfficer.date
                ? new Date(parsedData.approvalComments.creditOfficer.date)
                : new Date(),
            },
            parsedData.approvalComments.branchManager && {
              commentType: 'BRANCH_MANAGER',
              commentBy: parsedData.approvalComments.branchManager.name || '',
              position: 'ผู้จัดการสาขา',
              comments: parsedData.approvalComments.branchManager.comments || '',
              riskAssessment: null,
              recommendation: parsedData.approvalComments.branchManager.recommendation,
              decision: null,
              approvedAmount: null,
              specialConditions: null,
              commentDate: parsedData.approvalComments.branchManager.date
                ? new Date(parsedData.approvalComments.branchManager.date)
                : new Date(),
            },
            parsedData.approvalComments.approver && {
              commentType: 'APPROVER',
              commentBy: parsedData.approvalComments.approver.name || '',
              position: parsedData.approvalComments.approver.position,
              comments: '',
              riskAssessment: null,
              recommendation: null,
              decision: parsedData.approvalComments.approver.decision,
              approvedAmount: parsedData.approvalComments.approver.approvedAmount
                ? new Prisma.Decimal(parsedData.approvalComments.approver.approvedAmount)
                : null,
              specialConditions: parsedData.approvalComments.approver.specialConditions,
              commentDate: parsedData.approvalComments.approver.approvalDate
                ? new Date(parsedData.approvalComments.approver.approvalDate)
                : new Date(),
            },
          ].filter(Boolean),
        }
      : undefined,
  };

  // Create new version
  // @ts-ignore - Prisma type compatibility
  const profile = await prisma.customerBusinessProfile.create({
    data: profileData,
    include: {
      shareholders: { orderBy: { order: 'asc' } },
      loanRequests: { orderBy: { order: 'asc' } },
      collaterals: { orderBy: { order: 'asc' } },
      executives: { orderBy: { order: 'asc' } },
      suppliers: { orderBy: { order: 'asc' } },
      customers: { orderBy: { order: 'asc' } },
      dscrAnalysis: { orderBy: { analysisYear: 'desc' } },
      approvalComments: { orderBy: { commentDate: 'asc' } },
    },
  });

  // Also update existing tables for backward compatibility
  await saveToExistingTables(current.customerId, parsedData);

  // @ts-ignore - Prisma type compatibility
  return profile as ProfileWithRelations;
}

/**
 * Delete business profile (soft delete)
 */
export async function deleteBusinessProfile(profileId: string): Promise<void> {
  const profile = await prisma.customerBusinessProfile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    throw new Error('Profile not found');
  }

  // Soft delete - mark as archived and not latest
  await prisma.customerBusinessProfile.update({
    where: { id: profileId },
    data: {
      status: 'ARCHIVED',
      isLatest: false,
      deletedAt: new Date(),
    },
  });
}

export default {
  saveBusinessProfile,
  getLatestBusinessProfile,
  getBusinessProfileVersions,
  updateProfileReviewStatus,
  updateBusinessProfile,
  deleteBusinessProfile,
};
