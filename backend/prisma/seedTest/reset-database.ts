import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('🗑️  Starting database reset...\n');

  try {
    // Get all user-defined table names from the DB
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    const tableNames = tables.map(t => `"${t.tablename}"`).join(', ');
    console.log(`Found ${tables.length} tables`);

    // TRUNCATE all at once with CASCADE
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`
    );

    console.log('✅ Database reset completed — all tables cleared');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase().catch((error) => {
  console.error(error);
  process.exit(1);
});
