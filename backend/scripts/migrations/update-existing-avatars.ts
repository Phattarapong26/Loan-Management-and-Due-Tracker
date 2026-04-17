import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Updating existing user avatars...');

  try {
    // Get all users
    const users = await prisma.user.findMany();

    console.log(`👥 Found ${users.length} users`);

    // New avatar collection from Flaticon
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
      // Assign avatar based on user ID hash for consistency
      const hash = user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const avatarIndex = hash % avatars.length;
      const avatar = avatars[avatarIndex];

      await prisma.$executeRaw`
        UPDATE users 
        SET avatar = ${avatar}
        WHERE id = ${user.id}
      `;

      console.log(`✨ Updated avatar for user: ${user.email} -> ${avatar}`);
    }

    console.log('🎉 All avatars updated successfully!');
  } catch (error) {
    console.error('❌ Update failed:', error);
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
