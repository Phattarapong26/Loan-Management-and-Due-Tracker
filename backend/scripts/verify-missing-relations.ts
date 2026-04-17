import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TableInfo {
  modelName: string;
  tableName: string;
  hasOutgoingFK: boolean;
  hasIncomingFK: boolean;
  outgoingFKs: string[];
  incomingFKs: string[];
  potentialMissingFKs: string[];
}

function parseSchema(): Map<string, TableInfo> {
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  const tables = new Map<string, TableInfo>();
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  let match;

  // First pass: collect all tables
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    
    const mapMatch = modelBody.match(/@@map\("([^"]+)"\)/);
    const tableName = mapMatch ? mapMatch[1] : modelName;
    
    tables.set(tableName, {
      modelName,
      tableName,
      hasOutgoingFK: false,
      hasIncomingFK: false,
      outgoingFKs: [],
      incomingFKs: [],
      potentialMissingFKs: []
    });
  }

  // Second pass: analyze relationships
  modelRegex.lastIndex = 0;
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    
    const mapMatch = modelBody.match(/@@map\("([^"]+)"\)/);
    const tableName = mapMatch ? mapMatch[1] : modelName;
    const tableInfo = tables.get(tableName)!;
    
    const fieldLines = modelBody.split('\n').filter(line => line.trim());
    
    for (const line of fieldLines) {
      const trimmed = line.trim();
      
      // Check for outgoing FK (has @relation with fields)
      const relationMatch = trimmed.match(/^(\w+)\s+(\w+)(\?|\[\])?\s+@relation\(([^)]+)\)/);
      if (relationMatch) {
        const [, fieldName, relatedModel, , relationAttrs] = relationMatch;
        
        const fieldsMatch = relationAttrs.match(/fields:\s*\[([^\]]+)\]/);
        const referencesMatch = relationAttrs.match(/references:\s*\[([^\]]+)\]/);
        
        if (fieldsMatch && referencesMatch) {
          // This is an outgoing FK
          tableInfo.hasOutgoingFK = true;
          
          // Find related table name
          const relatedModelMatch = schemaContent.match(new RegExp(`model\\s+${relatedModel}\\s*{([^}]+)}`));
          if (relatedModelMatch) {
            const relatedBody = relatedModelMatch[1];
            const relatedMapMatch = relatedBody.match(/@@map\("([^"]+)"\)/);
            const relatedTableName = relatedMapMatch ? relatedMapMatch[1] : relatedModel;
            
            tableInfo.outgoingFKs.push(`${relatedTableName} (via ${fieldName})`);
            
            // Mark incoming FK on related table
            const relatedInfo = tables.get(relatedTableName);
            if (relatedInfo) {
              relatedInfo.hasIncomingFK = true;
              relatedInfo.incomingFKs.push(`${tableName} (via ${fieldName})`);
            }
          }
        }
      }
      
      // Check for potential missing FKs (fields ending with _id but no @relation)
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?(.*)$/);
      if (fieldMatch && !trimmed.includes('@relation') && !trimmed.includes('@@')) {
        const [, fieldName, fieldType] = fieldMatch;
        
        // Check if it's a potential FK field
        if (fieldName.endsWith('_id') && fieldType === 'String') {
          // Check if there's a corresponding relation field
          const relationFieldName = fieldName.replace(/_id$/, '');
          const hasRelation = fieldLines.some(l => 
            l.trim().startsWith(relationFieldName + ' ') && l.includes('@relation')
          );
          
          if (!hasRelation) {
            tableInfo.potentialMissingFKs.push(fieldName);
          }
        }
      }
    }
  }

  return tables;
}

function main() {
  console.log('🔍 Analyzing Prisma schema for missing relationships...\n');
  console.log('============================================================\n');
  
  const tables = parseSchema();
  
  // Categorize tables
  const isolated: TableInfo[] = [];
  const rootOnly: TableInfo[] = [];
  const leafOnly: TableInfo[] = [];
  const connected: TableInfo[] = [];
  const withPotentialMissing: TableInfo[] = [];
  
  for (const table of tables.values()) {
    if (table.potentialMissingFKs.length > 0) {
      withPotentialMissing.push(table);
    }
    
    if (!table.hasOutgoingFK && !table.hasIncomingFK) {
      isolated.push(table);
    } else if (!table.hasOutgoingFK && table.hasIncomingFK) {
      rootOnly.push(table);
    } else if (table.hasOutgoingFK && !table.hasIncomingFK) {
      leafOnly.push(table);
    } else {
      connected.push(table);
    }
  }
  
  console.log(`📊 Total Tables: ${tables.size}\n`);
  
  // Show isolated tables (NO relationships at all)
  console.log(`⚠️  ISOLATED TABLES (${isolated.length} tables - NO relationships):`);
  console.log('------------------------------------------------------------');
  if (isolated.length > 0) {
    for (const table of isolated.sort((a, b) => a.tableName.localeCompare(b.tableName))) {
      console.log(`  ❌ ${table.tableName} (${table.modelName})`);
      if (table.potentialMissingFKs.length > 0) {
        console.log(`     Potential FK fields: ${table.potentialMissingFKs.join(', ')}`);
      }
    }
  } else {
    console.log('  ✅ None - all tables have at least one relationship');
  }
  console.log();
  
  // Show tables with potential missing FKs
  console.log(`🔍 TABLES WITH POTENTIAL MISSING FOREIGN KEYS (${withPotentialMissing.length} tables):`);
  console.log('------------------------------------------------------------');
  if (withPotentialMissing.length > 0) {
    for (const table of withPotentialMissing.sort((a, b) => a.tableName.localeCompare(b.tableName))) {
      console.log(`  ⚠️  ${table.tableName} (${table.modelName})`);
      console.log(`     Fields ending with _id: ${table.potentialMissingFKs.join(', ')}`);
      if (table.outgoingFKs.length > 0) {
        console.log(`     Existing FKs: ${table.outgoingFKs.join(', ')}`);
      }
    }
  } else {
    console.log('  ✅ None found');
  }
  console.log();
  
  // Show root tables (only incoming FKs)
  console.log(`🎯 ROOT TABLES (${rootOnly.length} tables - only referenced by others):`);
  console.log('------------------------------------------------------------');
  for (const table of rootOnly.sort((a, b) => a.tableName.localeCompare(b.tableName))) {
    console.log(`  ✓ ${table.tableName} (${table.modelName})`);
    console.log(`    Referenced by: ${table.incomingFKs.slice(0, 3).join(', ')}${table.incomingFKs.length > 3 ? '...' : ''}`);
  }
  console.log();
  
  // Show leaf tables (only outgoing FKs)
  console.log(`🔌 LEAF TABLES (${leafOnly.length} tables - only reference others):`);
  console.log('------------------------------------------------------------');
  for (const table of leafOnly.sort((a, b) => a.tableName.localeCompare(b.tableName))) {
    console.log(`  ✓ ${table.tableName} (${table.modelName})`);
    console.log(`    References: ${table.outgoingFKs.join(', ')}`);
  }
  console.log();
  
  // Summary
  console.log('============================================================');
  console.log('📈 SUMMARY:');
  console.log(`  - Total Tables: ${tables.size}`);
  console.log(`  - Isolated (no relationships): ${isolated.length}`);
  console.log(`  - Root only (incoming FKs): ${rootOnly.length}`);
  console.log(`  - Leaf only (outgoing FKs): ${leafOnly.length}`);
  console.log(`  - Connected (both): ${connected.length}`);
  console.log(`  - With potential missing FKs: ${withPotentialMissing.length}`);
  console.log('============================================================\n');
  
  if (isolated.length > 0 || withPotentialMissing.length > 0) {
    console.log('⚠️  ACTION REQUIRED:');
    if (isolated.length > 0) {
      console.log(`   - Review ${isolated.length} isolated tables to determine if they need relationships`);
    }
    if (withPotentialMissing.length > 0) {
      console.log(`   - Review ${withPotentialMissing.length} tables with potential missing foreign keys`);
    }
  } else {
    console.log('✅ All tables have proper relationships!');
  }
}

main();
