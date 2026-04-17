import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimary?: boolean;
  isUnique?: boolean;
}

interface ForeignKey {
  name: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  cardinality: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY';
}

interface Table {
  name: string;
  columns: Column[];
  foreignKeys: ForeignKey[];
}

// Reserved SQL keywords that need quoting
const RESERVED_KEYWORDS = new Set([
  'order', 'session', 'transaction', 'user', 'group', 'table', 'index',
  'key', 'value', 'type', 'status', 'date', 'time', 'timestamp', 'year'
]);

function quoteName(name: string): string {
  if (RESERVED_KEYWORDS.has(name.toLowerCase())) {
    return `"${name}"`;
  }
  return name;
}

function parseSchema(): Table[] {
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  const tables: Table[] = [];
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  let match;

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    
    // Get table name from @@map or use model name
    const mapMatch = modelBody.match(/@@map\("([^"]+)"\)/);
    const tableName = mapMatch ? mapMatch[1] : modelName;
    
    const columns: Column[] = [];
    const foreignKeys: ForeignKey[] = [];
    
    // Parse fields
    const fieldLines = modelBody.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
    
    for (const line of fieldLines) {
      const trimmed = line.trim();
      
      // Skip directives and relations
      if (trimmed.startsWith('@@') || trimmed.startsWith('//')) continue;
      
      // Parse field: name Type modifiers @attributes
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?|\[\])?(.*)$/);
      if (!fieldMatch) continue;
      
      const [, fieldName, fieldType, modifier, attributes] = fieldMatch;
      
      // Skip ALL relation fields (they don't have @map and reference other models)
      if (attributes.includes('@relation')) continue;
      
      // Skip array fields (they are implicit relations)
      if (modifier === '[]') continue;
      
      // Skip if fieldType starts with uppercase (it's a model reference)
      if (fieldType[0] === fieldType[0].toUpperCase() && fieldType !== 'String' && 
          fieldType !== 'Int' && fieldType !== 'BigInt' && fieldType !== 'Float' && 
          fieldType !== 'Decimal' && fieldType !== 'Boolean' && fieldType !== 'DateTime' && 
          fieldType !== 'Json' && fieldType !== 'Bytes') {
        continue;
      }
      
      // Get column name from @map or use field name
      const colMapMatch = attributes.match(/@map\("([^"]+)"\)/);
      const columnName = colMapMatch ? colMapMatch[1] : fieldName;
      
      const nullable = modifier === '?';
      const isArray = modifier === '[]';
      
      // Map Prisma types to SQL types
      let sqlType = 'TEXT';
      switch (fieldType) {
        case 'Int': sqlType = 'INTEGER'; break;
        case 'BigInt': sqlType = 'BIGINT'; break;
        case 'Float': sqlType = 'DOUBLE PRECISION'; break;
        case 'Decimal': sqlType = 'DECIMAL'; break;
        case 'Boolean': sqlType = 'BOOLEAN'; break;
        case 'DateTime': sqlType = 'TIMESTAMP'; break;
        case 'Json': sqlType = 'JSONB'; break;
        case 'String': 
          if (attributes.includes('@db.Text')) sqlType = 'TEXT';
          else if (attributes.includes('@db.VarChar')) {
            const varcharMatch = attributes.match(/@db\.VarChar\((\d+)\)/);
            sqlType = varcharMatch ? `VARCHAR(${varcharMatch[1]})` : 'VARCHAR(255)';
          } else {
            sqlType = 'TEXT';
          }
          break;
      }
      
      // Get default value
      let defaultValue: string | undefined;
      const defaultMatch = attributes.match(/@default\((.+?)\)(?:\s|$)/);
      if (defaultMatch) {
        let defVal = defaultMatch[1].trim();
        
        // Handle dbgenerated
        if (defVal.includes('dbgenerated')) {
          const dbgenMatch = defVal.match(/dbgenerated\("([^"]+)"\)/);
          if (dbgenMatch) defVal = dbgenMatch[1];
        }
        
        if (defVal === 'now()') {
          defaultValue = 'CURRENT_TIMESTAMP';
        } else if (defVal === 'autoincrement()') {
          defaultValue = null; // Skip for DrawDB
        } else if (defVal === 'uuid()' || defVal === 'gen_random_uuid()') {
          defaultValue = 'gen_random_uuid()';
        } else if (defVal === 'true') {
          defaultValue = 'true';
        } else if (defVal === 'false') {
          defaultValue = 'false';
        } else if (defVal.startsWith('"') && defVal.endsWith('"')) {
          defaultValue = `'${defVal.slice(1, -1)}'`;
        } else if (!isNaN(Number(defVal))) {
          defaultValue = defVal;
        } else {
          defaultValue = `'${defVal}'`;
        }
      }
      
      const isPrimary = attributes.includes('@id');
      const isUnique = attributes.includes('@unique');
      
      columns.push({
        name: columnName,
        type: sqlType,
        nullable,
        defaultValue,
        isPrimary,
        isUnique
      });
    }
    
    tables.push({ name: tableName, columns, foreignKeys });
  }
  
  return tables;
}

function analyzeForeignKeys(tables: Table[]): void {
  const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
  
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  let match;

  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    
    const mapMatch = modelBody.match(/@@map\("([^"]+)"\)/);
    const tableName = mapMatch ? mapMatch[1] : modelName;
    
    const table = tables.find(t => t.name === tableName);
    if (!table) continue;
    
    // Find relation fields
    const fieldLines = modelBody.split('\n').filter(line => line.trim());
    
    for (const line of fieldLines) {
      const trimmed = line.trim();
      
      // Look for relation fields: fieldName Type @relation(...)
      const relationMatch = trimmed.match(/^(\w+)\s+(\w+)(\?|\[\])?\s+@relation\(([^)]+)\)/);
      if (!relationMatch) continue;
      
      const [, fieldName, relatedModel, modifier, relationAttrs] = relationMatch;
      
      // Parse relation attributes
      const fieldsMatch = relationAttrs.match(/fields:\s*\[([^\]]+)\]/);
      const referencesMatch = relationAttrs.match(/references:\s*\[([^\]]+)\]/);
      
      if (!fieldsMatch || !referencesMatch) continue;
      
      const fromFields = fieldsMatch[1].split(',').map(f => f.trim());
      const toFields = referencesMatch[1].split(',').map(f => f.trim());
      
      // Get actual column names
      const fromColumns: string[] = [];
      for (const field of fromFields) {
        const fieldLine = fieldLines.find(l => l.trim().startsWith(field + ' '));
        if (fieldLine) {
          const colMapMatch = fieldLine.match(/@map\("([^"]+)"\)/);
          fromColumns.push(colMapMatch ? colMapMatch[1] : field);
        }
      }
      
      // Find related table
      const relatedModelMatch = schemaContent.match(new RegExp(`model\\s+${relatedModel}\\s*{([^}]+)}`));
      if (!relatedModelMatch) continue;
      
      const relatedBody = relatedModelMatch[1];
      const relatedMapMatch = relatedBody.match(/@@map\("([^"]+)"\)/);
      const relatedTableName = relatedMapMatch ? relatedMapMatch[1] : relatedModel;
      
      // Get referenced column names
      const toColumns: string[] = [];
      for (const field of toFields) {
        const fieldLine = relatedBody.split('\n').find(l => l.trim().startsWith(field + ' '));
        if (fieldLine) {
          const colMapMatch = fieldLine.match(/@map\("([^"]+)"\)/);
          toColumns.push(colMapMatch ? colMapMatch[1] : field);
        }
      }
      
      // Determine cardinality
      let cardinality: ForeignKey['cardinality'] = 'MANY_TO_ONE';
      
      // Check if this field is unique or primary -> ONE_TO_ONE
      const isUnique = trimmed.includes('@unique') || table.columns.find(c => 
        fromColumns.includes(c.name) && (c.isUnique || c.isPrimary)
      );
      
      // Check if it's an array -> ONE_TO_MANY (from perspective of related table)
      const isArray = modifier === '[]';
      
      if (isUnique) {
        cardinality = 'ONE_TO_ONE';
      } else if (isArray) {
        cardinality = 'ONE_TO_MANY';
      } else {
        cardinality = 'MANY_TO_ONE';
      }
      
      for (let i = 0; i < fromColumns.length; i++) {
        const fkName = `fk_${tableName}_${fromColumns[i]}`;
        table.foreignKeys.push({
          name: fkName,
          fromTable: tableName,
          fromColumn: fromColumns[i],
          toTable: relatedTableName,
          toColumn: toColumns[i] || 'id',
          cardinality
        });
      }
    }
  }
}

function generateSQL(tables: Table[]): string {
  let sql = '-- Generated DrawDB Schema with Relationships\n';
  sql += `-- Generated at: ${new Date().toISOString()}\n`;
  sql += `-- Total Tables: ${tables.length}\n\n`;
  
  // Create tables
  for (const table of tables) {
    sql += `CREATE TABLE ${quoteName(table.name)} (\n`;
    
    const columnDefs: string[] = [];
    for (const col of table.columns) {
      let def = `  ${quoteName(col.name)} ${col.type}`;
      if (col.isPrimary) def += ' PRIMARY KEY';
      if (!col.nullable && !col.isPrimary) def += ' NOT NULL';
      if (col.isUnique && !col.isPrimary) def += ' UNIQUE';
      if (col.defaultValue && col.defaultValue !== 'null') {
        def += ` DEFAULT ${col.defaultValue}`;
      }
      columnDefs.push(def);
    }
    
    sql += columnDefs.join(',\n');
    sql += '\n);\n\n';
  }
  
  // Add foreign keys with cardinality comments
  const allForeignKeys: ForeignKey[] = [];
  for (const table of tables) {
    allForeignKeys.push(...table.foreignKeys);
  }
  
  sql += `-- Foreign Key Relationships: ${allForeignKeys.length}\n\n`;
  
  for (const fk of allForeignKeys) {
    sql += `-- ${fk.cardinality}: ${fk.fromTable}.${fk.fromColumn} -> ${fk.toTable}.${fk.toColumn}\n`;
    sql += `ALTER TABLE ${quoteName(fk.fromTable)}\n`;
    sql += `  ADD CONSTRAINT ${fk.name}\n`;
    sql += `  FOREIGN KEY (${quoteName(fk.fromColumn)})\n`;
    sql += `  REFERENCES ${quoteName(fk.toTable)} (${quoteName(fk.toColumn)})\n`;
    sql += `  ON DELETE CASCADE;\n\n`;
  }
  
  // Add summary
  sql += '\n-- Summary:\n';
  sql += `-- Total Tables: ${tables.length}\n`;
  sql += `-- Total Foreign Keys: ${allForeignKeys.length}\n`;
  
  const oneToOne = allForeignKeys.filter(fk => fk.cardinality === 'ONE_TO_ONE').length;
  const oneToMany = allForeignKeys.filter(fk => fk.cardinality === 'ONE_TO_MANY').length;
  const manyToOne = allForeignKeys.filter(fk => fk.cardinality === 'MANY_TO_ONE').length;
  
  sql += `-- ONE_TO_ONE: ${oneToOne}\n`;
  sql += `-- ONE_TO_MANY: ${oneToMany}\n`;
  sql += `-- MANY_TO_ONE: ${manyToOne}\n`;
  
  return sql;
}

async function main() {
  console.log('🔍 Parsing Prisma schema...\n');
  
  const tables = parseSchema();
  console.log(`✅ Found ${tables.length} tables\n`);
  
  console.log('🔗 Analyzing foreign key relationships...\n');
  analyzeForeignKeys(tables);
  
  const totalFKs = tables.reduce((sum, t) => sum + t.foreignKeys.length, 0);
  console.log(`✅ Found ${totalFKs} foreign key relationships\n`);
  
  console.log('📝 Generating SQL...\n');
  const sql = generateSQL(tables);
  
  const outputPath = path.join(__dirname, '../database-exports/schema-drawdb-complete-2026-02-20.sql');
  fs.writeFileSync(outputPath, sql);
  
  console.log(`✅ Schema exported to: ${outputPath}\n`);
  console.log('📊 Relationship Summary:');
  
  const allFKs = tables.flatMap(t => t.foreignKeys);
  const oneToOne = allFKs.filter(fk => fk.cardinality === 'ONE_TO_ONE').length;
  const oneToMany = allFKs.filter(fk => fk.cardinality === 'ONE_TO_MANY').length;
  const manyToOne = allFKs.filter(fk => fk.cardinality === 'MANY_TO_ONE').length;
  
  console.log(`  - ONE_TO_ONE: ${oneToOne}`);
  console.log(`  - ONE_TO_MANY: ${oneToMany}`);
  console.log(`  - MANY_TO_ONE: ${manyToOne}`);
  console.log(`  - Total: ${allFKs.length}\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
