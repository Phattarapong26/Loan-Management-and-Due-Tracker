const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  console.log('Fixing Prisma client...');
  
  // Remove canvas from package.json temporarily
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Backup canvas dependency
  const canvasDep = packageJson.dependencies?.canvas;
  if (canvasDep) {
    delete packageJson.dependencies.canvas;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Temporarily removed canvas dependency');
  }
  
  // Try to install @prisma/client
  try {
    execSync('npm install @prisma/client --no-optional', { stdio: 'inherit' });
    console.log('Installed @prisma/client successfully');
  } catch (e) {
    console.log('Failed to install @prisma/client, continuing...');
  }
  
  // Generate client
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('Generated Prisma client successfully');
  } catch (e) {
    console.log('Failed to generate client, trying alternative...');
  }
  
  // Restore canvas dependency
  if (canvasDep) {
    packageJson.dependencies.canvas = canvasDep;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Restored canvas dependency');
  }
  
  console.log('Prisma client fix completed!');
} catch (error) {
  console.error('Error:', error.message);
}