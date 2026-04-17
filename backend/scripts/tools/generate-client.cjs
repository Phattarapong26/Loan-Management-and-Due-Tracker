const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Generating Prisma client...');
  
  // Create the @prisma/client directory structure
  const clientDir = path.join(__dirname, 'node_modules', '@prisma', 'client');
  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true });
  }
  
  // Generate the client
  execSync('npx prisma generate --no-engine', { stdio: 'inherit' });
  
  // Copy the generated client to the expected location
  const generatedClientDir = path.join(__dirname, 'node_modules', '.prisma', 'client');
  if (fs.existsSync(generatedClientDir)) {
    execSync(`cp -r "${generatedClientDir}"/* "${clientDir}"/`, { stdio: 'inherit' });
  }
  
  // Copy runtime files
  const runtimeDir = path.join(__dirname, 'node_modules', 'prisma', 'prisma-client', 'runtime');
  if (fs.existsSync(runtimeDir)) {
    execSync(`cp -r "${runtimeDir}" "${clientDir}"/`, { stdio: 'inherit' });
  }
  
  console.log('Prisma client generated successfully!');
} catch (error) {
  console.error('Error generating Prisma client:', error.message);
  process.exit(1);
}