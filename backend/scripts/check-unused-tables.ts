import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TableUsage {
  modelName: string;
  tableName: string;
  usedInCode: boolean;
  usageCount: number;
  usageLocations: string[];
}

function getAllModels(): Map<string, string> {
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  const models = new Map<string, string>();
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  let match;

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    
    const mapMatch = modelBody.match(/@@map\("([^"]+)"\)/);
    const tableName = mapMatch ? mapMatch[1] : modelName;
    
    models.set(modelName, tableName);
  }
  
  return models;
}

function searchInBackendCode(modelName: string): { count: number; locations: string[] } {
  const backendSrcPath = path.join(__dirname, '../src');
  const locations: string[] = [];
  let count = 0;
  
  try {
    // Convert model name to camelCase for Prisma client usage
    const camelCaseName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    
    // Use grep to search for model usage
    try {
      const result = execSync(
        `grep -r -i "${modelName}" "${backendSrcPath}" --include="*.ts" --include="*.js" 2>/dev/null || true`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
      );
      
      if (result) {
        const lines = result.trim().split('\n').filter(line => line.trim());
        
        // Filter out false positives (comments, etc)
        const relevantLines = lines.filter(line => {
          const content = line.toLowerCase();
          return (
            content.includes(`prisma.${camelCaseName.toLowerCase()}`) ||
            content.includes(`: ${modelName.toLowerCase()}`) ||
            content.includes(`<${modelName.toLowerCase()}>`) ||
            content.includes(`${modelName.toLowerCase()}[]`) ||
            content.includes(`import`) && content.includes(modelName.toLowerCase()) ||
            content.includes(`type ${modelName.toLowerCase()}`) ||
            content.includes(`interface ${modelName.toLowerCase()}`)
          );
        });
        
        count = relevantLines.length;
        
        // Get unique file paths
        const files = new Set<string>();
        for (const line of relevantLines) {
          const match = line.match(/^([^:]+):/);
          if (match) {
            const filePath = match[1].replace(backendSrcPath + '/', '');
            files.add(filePath);
          }
        }
        
        locations.push(...Array.from(files).slice(0, 5));
      }
    } catch (error) {
      // Fallback to manual search
      count = manualSearch(backendSrcPath, modelName, locations);
    }
  } catch (error) {
    console.error(`Error searching for ${modelName}:`, error);
  }
  
  return { count, locations };
}

function manualSearch(dir: string, modelName: string, locations: string[]): number {
  let count = 0;
  const files = getAllFiles(dir, ['.ts', '.js']);
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const regex = new RegExp(`\\b${modelName}\\b`, 'gi');
      const matches = content.match(regex);
      
      if (matches) {
        count += matches.length;
        if (locations.length < 5) {
          locations.push(file.replace(dir + '/', ''));
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  return count;
}

function getAllFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            traverse(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  traverse(dir);
  return files;
}

async function main() {
  console.log('🔍 Analyzing table usage in backend code...\n');
  console.log('============================================================\n');
  
  const models = getAllModels();
  const tableUsage: TableUsage[] = [];
  
  console.log(`📊 Total Models: ${models.size}\n`);
  console.log('Searching in backend/src directory...\n');
  
  for (const [modelName, tableName] of models.entries()) {
    const { count, locations } = searchInBackendCode(modelName);
    
    tableUsage.push({
      modelName,
      tableName,
      usedInCode: count > 0,
      usageCount: count,
      usageLocations: locations
    });
    
    // Show progress
    process.stdout.write(`\rProcessed: ${tableUsage.length}/${models.size}`);
  }
  
  console.log('\n\n============================================================\n');
  
  // Categorize tables
  const used = tableUsage.filter(t => t.usedInCode);
  const unused = tableUsage.filter(t => !t.usedInCode);
  const lightlyUsed = used.filter(t => t.usageCount < 5);
  const heavilyUsed = used.filter(t => t.usageCount >= 20);
  
  // Show unused tables
  console.log(`❌ UNUSED TABLES (${unused.length} tables - NOT found in backend code):`);
  console.log('------------------------------------------------------------');
  if (unused.length > 0) {
    for (const table of unused.sort((a, b) => a.tableName.localeCompare(b.tableName))) {
      console.log(`  ⚠️  ${table.tableName} (${table.modelName})`);
    }
  } else {
    console.log('  ✅ All tables are used in code!');
  }
  console.log();
  
  // Show lightly used tables
  console.log(`⚡ LIGHTLY USED TABLES (${lightlyUsed.length} tables - less than 5 references):`);
  console.log('------------------------------------------------------------');
  if (lightlyUsed.length > 0) {
    for (const table of lightlyUsed.sort((a, b) => a.usageCount - b.usageCount)) {
      console.log(`  📝 ${table.tableName} (${table.modelName}) - ${table.usageCount} references`);
      if (table.usageLocations.length > 0) {
        console.log(`     Files: ${table.usageLocations.slice(0, 2).join(', ')}`);
      }
    }
  }
  console.log();
  
  // Show heavily used tables
  console.log(`🔥 HEAVILY USED TABLES (${heavilyUsed.length} tables - 20+ references):`);
  console.log('------------------------------------------------------------');
  if (heavilyUsed.length > 0) {
    for (const table of heavilyUsed.sort((a, b) => b.usageCount - a.usageCount).slice(0, 10)) {
      console.log(`  ✓ ${table.tableName} (${table.modelName}) - ${table.usageCount} references`);
      if (table.usageLocations.length > 0) {
        console.log(`     Files: ${table.usageLocations.slice(0, 3).join(', ')}`);
      }
    }
    if (heavilyUsed.length > 10) {
      console.log(`  ... and ${heavilyUsed.length - 10} more`);
    }
  }
  console.log();
  
  // Summary
  console.log('============================================================');
  console.log('📈 SUMMARY:');
  console.log(`  - Total Tables: ${models.size}`);
  console.log(`  - Used in Code: ${used.length} (${Math.round(used.length / models.size * 100)}%)`);
  console.log(`  - Unused: ${unused.length} (${Math.round(unused.length / models.size * 100)}%)`);
  console.log(`  - Lightly Used (<5 refs): ${lightlyUsed.length}`);
  console.log(`  - Heavily Used (20+ refs): ${heavilyUsed.length}`);
  console.log('============================================================\n');
  
  // Export detailed report
  const reportPath = path.join(__dirname, '../docs/TABLE_USAGE_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary: {
      total: models.size,
      used: used.length,
      unused: unused.length,
      lightlyUsed: lightlyUsed.length,
      heavilyUsed: heavilyUsed.length
    },
    tables: tableUsage.sort((a, b) => b.usageCount - a.usageCount)
  }, null, 2));
  
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
  
  if (unused.length > 0) {
    console.log('⚠️  RECOMMENDATION:');
    console.log('   - Review unused tables to determine if they should be:');
    console.log('     1. Implemented in backend code');
    console.log('     2. Removed from schema if not needed');
    console.log('     3. Kept for future features\n');
  }
}

main().catch(console.error);
