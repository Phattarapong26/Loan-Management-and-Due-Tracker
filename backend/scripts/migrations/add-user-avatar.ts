import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting avatar migration...');

  try {
    // Execute SQL migration command
    console.log('📝 Adding avatar column...');
    await prisma.$executeRaw`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500)`;

    console.log('✅ Avatar column added successfully!');

    // Get all users
    const users = await prisma.user.findMany();

    console.log(`👥 Found ${users.length} users`);

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

    for (const user of users) {
      // Skip if user already has avatar
      if ((user as any).avatar) {
        console.log(`⏭️  User ${user.email} already has avatar`);
        continue;
      }

      // Assign avatar based on user ID hash for consistency
      const hash = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const avatarIndex = hash % avatars.length;
      const avatar = avatars[avatarIndex];

      await prisma.$executeRaw`
        UPDATE users 
        SET avatar = ${avatar}
        WHERE id = ${user.id}
      `;

      console.log(`✨ Assigned avatar to user: ${user.email}`);
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
