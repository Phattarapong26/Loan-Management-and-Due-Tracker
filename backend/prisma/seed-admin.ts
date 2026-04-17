/**
 * Admin User Seed Script
 * Creates default admin, manager, and officer users
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedAdmin() {
    console.log('🌱 Seeding admin users...');

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
        where: { email: 'admin@smebank.com' }
    });

    if (existingAdmin) {
        console.log('✅ Admin user already exists');
        return;
    }

    // Create default branch first
    let branch = await prisma.branch.findFirst({
        where: { name: 'สำนักงานใหญ่' }
    });

    if (!branch) {
        console.log('📍 Creating default branch...');
        branch = await prisma.branch.create({
            data: {
                name: 'สำนักงานใหญ่',
                code: 'HQ001',
                address: '123 ถนนสีลม แขวงสีลม เขตบางรัก กรุงเทพมหานคร 10500',
                phone: '02-123-4567',
                isActive: true,
            }
        });
        console.log('✅ Default branch created');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // Create admin user
    const admin = await prisma.user.create({
        data: {
            email: 'admin@smebank.com',
            password: hashedPassword,
            name: 'System Administrator',
            role: 'ADMIN',
            branchId: branch.id,
            isActive: true,
        }
    });

    console.log('✅ Admin user created:', admin.email);

    // Create manager user
    const manager = await prisma.user.create({
        data: {
            email: 'manager@smebank.com',
            password: await bcrypt.hash('Manager@123', 10),
            name: 'Branch Manager',
            role: 'MANAGER',
            branchId: branch.id,
            isActive: true,
        }
    });

    console.log('✅ Manager user created:', manager.email);

    // Create officer user
    const officer = await prisma.user.create({
        data: {
            email: 'officer@smebank.com',
            password: await bcrypt.hash('Officer@123', 10),
            name: 'Loan Officer',
            role: 'OFFICER',
            branchId: branch.id,
            isActive: true,
        }
    });

    console.log('✅ Officer user created:', officer.email);

    console.log('\n🎉 Admin seed completed!');
    console.log('\nDefault credentials:');
    console.log('- Admin: admin@smebank.com / Admin@123');
    console.log('- Manager: manager@smebank.com / Manager@123');
    console.log('- Officer: officer@smebank.com / Officer@123');
}

async function main() {
    try {
        await seedAdmin();
    } catch (error) {
        console.error('❌ Seed failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

main();
