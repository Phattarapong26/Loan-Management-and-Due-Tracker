import { PrismaClient, ContactLog, ContactStatus, ContactMethod, Prisma } from '@prisma/client';
import { prisma } from '@config/database.config';
import { EncryptionUtil } from '@core/utils/security/encryption.util';
import { CreateContactLogInput } from '../models/contact-log.model';

/**
 * Contact Log Repository - Database access ONLY
 * NO business logic allowed
 */
export class ContactLogRepository {
    private db: PrismaClient;

    constructor() {
        this.db = prisma;
    }

    /**
     * Create contact log
     */
    async create(data: CreateContactLogInput & { officerId: string }): Promise<ContactLog> {
        return this.db.contactLog.create({
            data: {
                customerId: data.customerId,
                loanId: data.loanId || null,
                officerId: data.officerId,
                contactDate: new Date(data.contactDate),
                contactStatus: data.contactStatus,
                contactMethod: data.contactMethod,
                notes: data.notes,
                promisedDate: data.promisedDate ? new Date(data.promisedDate) : null,
                taskId: data.taskId || null,
                nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
                outcome: data.outcome || null,
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        businessName: true,
                        customerCode: true,
                        phone: true,
                    },
                },
            },
        });
    }

    /**
     * Find contact log by ID
     */
    async findById(id: string): Promise<ContactLog | null> {
        return this.db.contactLog.findUnique({
            where: { id },
            include: {
                customer: {
                    select: {
                        id: true,
                        businessName: true,
                        customerCode: true,
                        phone: true,
                    },
                },
            },
        });
    }

    /**
     * List contact logs with pagination and filters
     */
    async list(params: {
        page: number;
        limit: number;
        customerId?: string;
        loanId?: string;
        officerId?: string;
        contactStatus?: ContactStatus;
        contactMethod?: ContactMethod;
        dateFrom?: Date;
        dateTo?: Date;
    }): Promise<{ contactLogs: ContactLog[]; total: number }> {
        const where: Prisma.ContactLogWhereInput = {};

        if (params.customerId) {
            where.customerId = params.customerId;
        }

        if (params.loanId) {
            where.loanId = params.loanId;
        }

        if (params.officerId) {
            where.officerId = params.officerId;
        }

        if (params.contactStatus) {
            where.contactStatus = params.contactStatus;
        }

        if (params.contactMethod) {
            where.contactMethod = params.contactMethod;
        }

        if (params.dateFrom || params.dateTo) {
            where.contactDate = {};
            if (params.dateFrom) {
                where.contactDate.gte = params.dateFrom;
            }
            if (params.dateTo) {
                where.contactDate.lte = params.dateTo;
            }
        }

        const [contactLogs, total] = await Promise.all([
            this.db.contactLog.findMany({
                where,
                skip: (params.page - 1) * params.limit,
                take: params.limit,
                orderBy: { contactDate: 'desc' },
                include: {
                    customer: {
                        select: {
                            id: true,
                            businessName: true,
                            customerCode: true,
                            phone: true,
                        },
                    },
                },
            }),
            this.db.contactLog.count({ where }),
        ]);

        return { contactLogs, total };
    }

    /**
     * Get reminders (promised payments and follow-ups)
     */
    async getReminders(params: {
        officerId?: string;
        status?: 'pending' | 'overdue' | 'completed' | 'all';
        dateFrom?: Date;
        dateTo?: Date;
    }) {
        const where: Prisma.ContactLogWhereInput = {
            OR: [
                { contactStatus: 'PROMISED_TO_PAY', promisedDate: { not: null } },
                { contactStatus: 'REQUEST_EXTENSION', promisedDate: { not: null } },
            ],
        };

        if (params.officerId) {
            where.officerId = params.officerId;
        }

        if (params.dateFrom || params.dateTo) {
            where.promisedDate = {};
            if (params.dateFrom) {
                where.promisedDate.gte = params.dateFrom;
            }
            if (params.dateTo) {
                where.promisedDate.lte = params.dateTo;
            }
        }

        const contactLogs = await this.db.contactLog.findMany({
            where,
            orderBy: { promisedDate: 'asc' },
            include: {
                customer: {
                    select: {
                        id: true,
                        businessName: true,
                        customerCode: true,
                        phone: true,
                    },
                },
            },
        });

        // Filter by status (pending, overdue, completed)
        const now = new Date();
        let filtered = contactLogs;

        if (params.status && params.status !== 'all') {
            filtered = contactLogs.filter((log) => {
                if (!log.promisedDate) return false;

                const promisedDate = new Date(log.promisedDate);
                const isOverdue = promisedDate < now;

                if (params.status === 'overdue') {
                    return isOverdue;
                } else if (params.status === 'pending') {
                    return !isOverdue;
                } else if (params.status === 'completed') {
                    // Check if there's a newer contact log indicating payment
                    return false; // This would need additional logic
                }

                return true;
            });
        }

        return filtered;
    }

    /**
     * Get uncontacted customers (no contact in last N days)
     */
    async getUncontactedCustomers(params: {
        officerId?: string;
        daysWithoutContact: number;
        branchId?: string;
    }) {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - params.daysWithoutContact);

        // Get all customers with loans
        const customersWithLoans = await this.db.customer.findMany({
            where: {
                ...(params.branchId && { branchId: params.branchId }),
                loans: {
                    some: {
                        status: {
                            in: ['APPROVED', 'DISBURSED', 'ACTIVE'],
                        },
                    },
                },
            },
            include: {
                loans: {
                    where: {
                        status: {
                            in: ['APPROVED', 'DISBURSED', 'ACTIVE'],
                        },
                    },
                },
                contacts: {
                    where: {
                        ...(params.officerId && { officerId: params.officerId }),
                    },
                    orderBy: { contactDate: 'desc' },
                    take: 1,
                },
            },
        });

        // Filter customers without recent contact
        const now = new Date();
        const uncontacted = customersWithLoans.filter((customer) => {
            const lastContact = customer.contacts[0];
            if (!lastContact) return true; // Never contacted

            const lastContactDate = new Date(lastContact.contactDate);
            return lastContactDate < dateThreshold;
        });

        return uncontacted.map((customer) => ({
            customerId: customer.id,
            customerName: customer.businessName,
            customerCode: customer.customerCode,
            phone: (() => {
                try {
                    return EncryptionUtil.decrypt(customer.phone);
                } catch {
                    // Legacy rows may already store plain text
                    return customer.phone;
                }
            })(),
            lastContactDate: customer.contacts[0]?.contactDate || null,
            daysSinceContact: customer.contacts[0]
                ? Math.floor(
                      (now.getTime() - new Date(customer.contacts[0].contactDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                  )
                : null,
            activeLoans: customer.loans.length,
        }));
    }

    /**
     * Find recent NPL alert log for a loan (dedup check)
     */
    async findRecentNPLAlert(loanId: string, withinDays: number): Promise<ContactLog | null> {
        const since = new Date();
        since.setDate(since.getDate() - withinDays);
        return this.db.contactLog.findFirst({
            where: {
                loanId,
                notes: { contains: 'NPL Alert sent' },
                createdAt: { gte: since },
            },
        });
    }
}

    /**
     * Update taskId link on a contact log
     */
    async updateTaskLink(id: string, taskId: string): Promise<void> {
        await this.db.contactLog.update({ where: { id }, data: { taskId } });
    }
