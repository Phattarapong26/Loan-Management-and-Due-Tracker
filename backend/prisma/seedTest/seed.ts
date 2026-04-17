import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default branch
  const defaultBranch = await prisma.branch.upsert({
    where: { code: 'HQ001' },
    update: {},
    create: {
      code: 'HQ001',
      name: 'สำนักงานใหญ่',
      address: 'กรุงเทพมหานคร',
      phone: '02-123-4567',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created default branch:', defaultBranch.name);

  // Hash password for admin
  const adminPassword = await bcrypt.hash('admin123', 12);

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@smebank.com' },
    update: {},
    create: {
      email: 'admin@smebank.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'System',
      phoneNumber: '0812345678',
      role: 'ADMIN',
      status: 'ACTIVE',
      branchId: defaultBranch.id,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create branch manager
  const managerPassword = await bcrypt.hash('manager123', 12);
  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@smebank.com' },
    update: {},
    create: {
      email: 'manager@smebank.com',
      passwordHash: managerPassword,
      firstName: 'สมชาย',
      lastName: 'ผู้จัดการ',
      phoneNumber: '0823456789',
      role: 'MANAGER',
      status: 'ACTIVE',
      branchId: defaultBranch.id,
    },
  });

  console.log('✅ Created manager user:', managerUser.email);

  // Create loan officer
  const officerPassword = await bcrypt.hash('officer123', 12);
  const officerUser = await prisma.user.upsert({
    where: { email: 'officer@smebank.com' },
    update: {},
    create: {
      email: 'officer@smebank.com',
      passwordHash: officerPassword,
      firstName: 'สมหญิง',
      lastName: 'เจ้าหน้าที่',
      phoneNumber: '0834567890',
      role: 'OFFICER',
      status: 'ACTIVE',
      branchId: defaultBranch.id,
    },
  });

  console.log('✅ Created officer user:', officerUser.email);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Admin:');
  console.log('   Email: admin@smebank.com');
  console.log('   Password: admin123');
  console.log('');
  console.log('👤 Branch Manager:');
  console.log('   Email: manager@smebank.com');
  console.log('   Password: manager123');
  console.log('');
  console.log('👤 Loan Officer:');
  console.log('   Email: officer@smebank.com');
  console.log('   Password: officer123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
