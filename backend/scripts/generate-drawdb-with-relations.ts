/**
 * Generate DrawDB-compatible SQL with Foreign Key Relations
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
const outputPath = path.join(__dirname, '../database-exports/schema-drawdb-with-relations-2026-02-20.sql');

const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

// Parse models and relations
const models: any[] = [];
const relations: any[] = [];
let currentModel: any = null;

const lines = schemaContent.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
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
  
  if (line === '}' && currentModel) {
    currentModel = null;
    continue;
  }
  
  if (!currentModel) continue;
  
  if (line.startsWith('@@map(')) {
    const match = line.match(/@@map\("([^"]+)"\)/);
    if (match) {
      currentModel.tableName = match[1];
    }
    continue;
  }
  
  if (line && !line.startsWith('@@') && !line.startsWith('//')) {
    const fieldMatch = line.match(/^(\w+)\s+(\w+)(\[\])?\??/);
    if (fieldMatch) {
      const [, fieldName, fieldType, isArray] = fieldMatch;
      
      const mapMatch = line.match(/@map\("([^"]+)"\)/);
      const columnName = mapMatch ? mapMatch[1] : fieldName;
      
      const isPrimary = line.includes('@id');
      const isUnique = line.includes('@unique');
      const isOptional = line.includes('?');
      
      let defaultValue = null;
      const defaultMatch = line.match(/@default\((.+?)\)(?:\s|$)/);
      if (defaultMatch) {
        defaultValue = defaultMatch[1].trim();
      }
      
      // Check for relation
      const relationMatch = line.match(/@relation\([^)]*fields:\s*\[([^\]]+)\][^)]*references:\s*\[([^\]]+)\]/);
      if (relationMatch) {
        const fromFieldNames = relationMatch[1].split(',').map(f => f.trim());
        const toFields = relationMatch[2].split(',').map(f => f.trim());
        
        // Get actual column names from @map
        const fromFields = fromFieldNames.map(fieldName => {
          // Look for the field definition to get its @map value
          const fieldLine = lines.find(l => {
            const match = l.trim().match(new RegExp(`^${fieldName}\\s+`));
            return match;
          });
          
          if (fieldLine) {
            const mapMatch = fieldLine.match(/@map\("([^"]+)"\)/);
            return mapMatch ? mapMatch[1] : fieldName;
          }
          return fieldName;
        });
        
        relations.push({
          fromTable: currentModel.tableName || currentModel.name.toLowerCase(),
          fromModel: currentModel.name,
          toModel: fieldType,
          fromFields,
          toFields,
          fieldName,
        });
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

let sql = `-- SME D Bank Complete Database Schema with Relations for DrawDB
-- Generated: 2026-02-20
-- Total Tables: ${models.length}
-- Total Relations: ${relations.length}

`;

// Create tables
for (const model of models) {
  const tableName = model.tableName || model.name.toLowerCase();
  
  sql += `-- ${model.name}\n`;
  sql += `CREATE TABLE ${tableName} (\n`;
  
  const columns: string[] = [];
  
  for (const field of model.fields) {
    if (field.type[0] === field.type[0].toUpperCase() && !['String', 'Int', 'BigInt', 'Float', 'Decimal', 'Boolean', 'DateTime', 'Json', 'Bytes'].includes(field.type)) {
      continue;
    }
    
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
        defaultVal = null;
      } else if (defaultVal.match(/^\d+(\.\d+)?$/)) {
        // Keep numbers
      } else {
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

// Add foreign keys
sql += `-- Foreign Key Constraints\n`;
sql += `-- Total Relations: ${relations.length}\n\n`;

// Group relations by table
const relationsByTable: Record<string, any[]> = {};
for (const rel of relations) {
  if (!relationsByTable[rel.fromTable]) {
    relationsByTable[rel.fromTable] = [];
  }
  relationsByTable[rel.fromTable].push(rel);
}

// Find table name for model
function getTableName(modelName: string): string {
  const model = models.find(m => m.name === modelName);
  return model ? (model.tableName || model.name.toLowerCase()) : modelName.toLowerCase();
}

for (const [fromTable, rels] of Object.entries(relationsByTable)) {
  sql += `-- Relations from ${fromTable}\n`;
  
  for (const rel of rels) {
    const toTable = getTableName(rel.toModel);
    const fromField = rel.fromFields[0];
    const toField = rel.toFields[0];
    
    const reservedKeywords = ['order', 'user', 'group', 'table', 'index', 'key', 'value', 'type', 'status', 'role', 'name', 'session', 'transaction'];
    
    // Quote table names if reserved
    const fromTableQuoted = reservedKeywords.includes(fromTable.toLowerCase()) ? `"${fromTable}"` : fromTable;
    const toTableQuoted = reservedKeywords.includes(toTable.toLowerCase()) ? `"${toTable}"` : toTable;
    
    // Quote column names if reserved
    const fromCol = reservedKeywords.includes(fromField.toLowerCase()) ? `"${fromField}"` : fromField;
    const toCol = reservedKeywords.includes(toField.toLowerCase()) ? `"${toField}"` : toField;
    
    sql += `ALTER TABLE ${fromTableQuoted} ADD FOREIGN KEY (${fromCol}) REFERENCES ${toTableQuoted}(${toCol});\n`;
  }
  
  sql += '\n';
}

sql += `-- End of schema
-- Tables: ${models.length}
-- Relations: ${relations.length}
`;

fs.writeFileSync(outputPath, sql);

console.log(`✅ Generated DrawDB schema with relations: ${outputPath}`);
console.log(`📊 Total tables: ${models.length}`);
console.log(`🔗 Total relations: ${relations.length}`);
console.log(`📁 File size: ${(sql.length / 1024).toFixed(2)} KB`);
