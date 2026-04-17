const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Generating Prisma client...');
  
  // Try to generate without installing
  try {
    execSync('npx prisma generate --no-engine', { stdio: 'pipe' });
  } catch (e) {
    console.log('First attempt failed, trying alternative...');
  }
  
  // Check if client was generated
  const clientPath = path.join(__dirname, 'node_modules', '.prisma', 'client');
  const targetPath = path.join(__dirname, 'node_modules', '@prisma', 'client');
  
  if (fs.existsSync(clientPath)) {
    console.log('Client generated, copying files...');
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    execSync(`cp -r "${clientPath}"/* "${targetPath}"/`);
  } else {
    console.log('Client not found, creating minimal structure...');
    // Create minimal client structure
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    
    // Copy from prisma client if exists
    const prismaClientPath = path.join(__dirname, 'node_modules', 'prisma', 'prisma-client');
    if (fs.existsSync(prismaClientPath)) {
      execSync(`cp -r "${prismaClientPath}"/* "${targetPath}"/`);
    }
  }
  
  console.log('Prisma client setup completed!');
} catch (error) {
  console.error('Error:', error.message);
}