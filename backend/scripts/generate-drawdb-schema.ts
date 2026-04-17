/**
 * Generate DrawDB-compatible SQL from Prisma Schema
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const outputPath = path.join(__dirname, '../database-exports/schema-drawdb-complete-2026-02-20.sql');

const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

// Parse models from schema
const models: any[] = [];
let currentModel: any = null;

const lines = schemaContent.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  // Start of model
  if (line.startsWith('model ')) {
    const modelName = line.split(' ')[1];
    currentModel = {
      name: modelName,
      fields: [],
      tableName: null,
    };
    models.push(currentModel);
    continue;
  }
  
  // End of model
  if (line === '}' && currentModel) {
    currentModel = null;
    continue;
  }
  
  // Skip if not in model
  if (!currentModel) continue;
  
  // Get table name from @@map
  if (line.startsWith('@@map(')) {
    const match = line.match(/@@map\("([^"]+)"\)/);
    if (match) {
      currentModel.tableName = match[1];
    }
    continue;
  }
  
  // Parse field
  if (line && !line.startsWith('@@') && !line.startsWith('//')) {
    const fieldMatch = line.match(/^(\w+)\s+(\w+)(\[\])?\??/);
    if (fieldMatch) {
      const [, fieldName, fieldType, isArray] = fieldMatch;
      
      // Get column name from @map
      const mapMatch = line.match(/@map\("([^"]+)"\)/);
      const columnName = mapMatch ? mapMatch[1] : fieldName;
      
      // Check if primary key
      const isPrimary = line.includes('@id');
      
      // Check if unique
      const isUnique = line.includes('@unique');
      
      // Check if optional
      const isOptional = line.includes('?');
      
      // Get default value - handle functions with parentheses
      let defaultValue = null;
      const defaultMatch = line.match(/@default\((.+?)\)(?:\s|$)/);
      if (defaultMatch) {
        defaultValue = defaultMatch[1].trim();
      }
      
      currentModel.fields.push({
        name: fieldName,
        columnName,
        type: fieldType,
        isArray: !!isArray,
        isPrimary,
        isUnique,
        isOptional,
        defaultValue,
      });
    }
  }
}

// Map Prisma types to SQL types
function mapType(prismaType: string, isOptional: boolean): string {
  const typeMap: Record<string, string> = {
    String: 'VARCHAR(255)',
    Int: 'INTEGER',
    BigInt: 'BIGINT',
    Float: 'DOUBLE PRECISION',
    Decimal: 'DECIMAL(15,2)',
    Boolean: 'BOOLEAN',
    DateTime: 'TIMESTAMP',
    Json: 'TEXT',
    Bytes: 'BYTEA',
  };
  
  let sqlType = typeMap[prismaType] || 'TEXT';
  return sqlType + (isOptional ? '' : ' NOT NULL');
}

// Generate SQL
let sql = `-- SME D Bank Complete Database Schema for DrawDB
-- Generated: 2026-02-20
-- Total Tables: ${models.length}

`;

// Create tables
for (const model of models) {
  const tableName = model.tableName || model.name.toLowerCase();
  
  sql += `-- ${model.name}\n`;
  sql += `CREATE TABLE ${tableName} (\n`;
  
  const columns: string[] = [];
  
  for (const field of model.fields) {
    // Skip relation fields
    if (field.type[0] === field.type[0].toUpperCase() && !['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'].includes(field.type)) {
      continue;
    }
    
    // Quote column name if it's a reserved keyword
    const reservedKeywords = ['order', 'user', 'group', 'table', 'index', 'key', 'value', 'type', 'status', 'role', 'name'];
    const columnName = reservedKeywords.includes(field.columnName.toLowerCase()) 
      ? `"${field.columnName}"` 
      : field.columnName;
    
    let column = `    ${columnName} ${mapType(field.type, field.isOptional)}`;
    
    if (field.isPrimary) {
      column += ' PRIMARY KEY';
    }
    
    if (field.isUnique && !field.isPrimary) {
      column += ' UNIQUE';
    }
    
    if (field.defaultValue) {
      let defaultVal = field.defaultValue;
      if (defaultVal === 'now()') {
        defaultVal = 'CURRENT_TIMESTAMP';
      } else if (defaultVal === 'true') {
        defaultVal = 'true';
      } else if (defaultVal === 'false') {
        defaultVal = 'false';
      } else if (defaultVal === 'uuid()' || defaultVal === 'cuid()' || defaultVal === 'autoincrement()') {
        // Skip auto-generated values
        defaultVal = null;
      } else if (defaultVal.match(/^\d+(\.\d+)?$/)) {
        // Keep numbers as is
      } else {
        // String values - escape properly
        defaultVal = `'${defaultVal.replace(/'/g, "''")}'`;
      }
      
      if (defaultVal) {
        column += ` DEFAULT ${defaultVal}`;
      }
    }
    
    columns.push(column);
  }
  
  sql += columns.join(',\n');
  sql += '\n);\n\n';
}

sql += `-- Note: Foreign key constraints are defined in the actual PostgreSQL schema
-- This simplified version is optimized for DrawDB visualization
-- For full schema with all constraints, see schema-2026-02-20.sql
`;

fs.writeFileSync(outputPath, sql);

console.log(`✅ Generated DrawDB schema: ${outputPath}`);
console.log(`📊 Total tables: ${models.length}`);
console.log(`📁 File size: ${(sql.length / 1024).toFixed(2)} KB`);
