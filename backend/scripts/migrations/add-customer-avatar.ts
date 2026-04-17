import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting customer avatar migration...');

  try {
    // Execute SQL migration command
    console.log('📝 Adding avatar column to customers table...');
    await prisma.$executeRaw`ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar VARCHAR(500)`;

    console.log('✅ Avatar column added successfully!');

    // Get all customers
    const customers = await prisma.customer.findMany();

    console.log(`👥 Found ${customers.length} customers`);

    // Avatar collection from Flaticon
    const avatars = [
      'https://cdn-icons-png.flaticon.com/512/2202/2202112.png',
      'https://cdn-icons-png.flaticon.com/512/6997/6997662.png',
      'https://cdn-icons-png.flaticon.com/512/1999/1999625.png',
      'https://cdn-icons-png.flaticon.com/512/1154/1154448.png',
      'https://cdn-icons-png.flaticon.com/512/4140/4140061.png',
      'https://cdn-icons-png.flaticon.com/512/13482/13482193.png',
      'https://cdn-icons-png.flaticon.com/512/706/706831.png',
      'https://cdn-icons-png.flaticon.com/512/4128/4128176.png',
    ];

    for (const customer of customers) {
      // Skip if customer already has avatar
      if ((customer as any).avatar) {
        console.log(`⏭️  Customer ${customer.businessName} already has avatar`);
        continue;
      }

      // Assign avatar based on customer ID hash for consistency
      const hash = customer.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const avatarIndex = hash % avatars.length;
      const avatar = avatars[avatarIndex];

      await prisma.$executeRaw`
        UPDATE customers 
        SET avatar = ${avatar}
        WHERE id = ${customer.id}
      `;

      console.log(`✨ Assigned avatar to customer: ${customer.businessName}`);
    }

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
