/**
 * Analyze table relationships and usage
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.join(__dirname, '../database-exports/schema-drawdb-with-relations-2026-02-20.sql');
const sql = fs.readFileSync(sqlPath, 'utf-8');

// Extract all tables
const tables = new Set<string>();
const createMatches = sql.matchAll(/CREATE TABLE ["']?(\w+)["']? \(/g);
for (const match of createMatches) {
  tables.add(match[1]);
}

// Extract foreign keys
const fkFrom = new Set<string>(); // Tables that have FK pointing out
const fkTo = new Set<string>(); // Tables that are referenced by others

const fkMatches = sql.matchAll(/ALTER TABLE ["']?(\w+)["']? ADD FOREIGN KEY.*REFERENCES ["']?(\w+)["']?\(/g);
for (const match of fkMatches) {
  fkFrom.add(match[1]);
  fkTo.add(match[2]);
}

console.log('📊 Database Table Analysis\n');
console.log('='.repeat(60));

console.log(`\n📋 Total Tables: ${tables.size}`);
console.log(`🔗 Total Foreign Keys: ${sql.match(/ALTER TABLE/g)?.length || 0}`);

console.log(`\n\n🎯 ROOT TABLES (Referenced by others, but don't reference anyone):`);
console.log('-'.repeat(60));
const rootTables = Array.from(tables).filter(t => fkTo.has(t) && !fkFrom.has(t)).sort();
rootTables.forEach(t => console.log(`  ✓ ${t}`));
console.log(`\nCount: ${rootTables.length}`);

console.log(`\n\n🔌 LEAF TABLES (Reference others, but not referenced by anyone):`);
console.log('-'.repeat(60));
const leafTables = Array.from(tables).filter(t => fkFrom.has(t) && !fkTo.has(t)).sort();
leafTables.forEach(t => console.log(`  ✓ ${t}`));
console.log(`\nCount: ${leafTables.length}`);

console.log(`\n\n🔄 CONNECTED TABLES (Both reference and are referenced):`);
console.log('-'.repeat(60));
const connectedTables = Array.from(tables).filter(t => fkFrom.has(t) && fkTo.has(t)).sort();
connectedTables.forEach(t => console.log(`  ✓ ${t}`));
console.log(`\nCount: ${connectedTables.length}`);

console.log(`\n\n⚠️  ISOLATED TABLES (No foreign keys at all):`);
console.log('-'.repeat(60));
const isolatedTables = Array.from(tables).filter(t => !fkFrom.has(t) && !fkTo.has(t)).sort();
isolatedTables.forEach(t => console.log(`  ⚠️  ${t}`));
console.log(`\nCount: ${isolatedTables.length}`);

if (isolatedTables.length > 0) {
  console.log(`\n💡 Note: Isolated tables might be:`);
  console.log(`   - Lookup/reference tables (e.g., thai_banks, system_configs)`);
  console.log(`   - Standalone feature tables`);
  console.log(`   - Tables that need relationships added`);
}

console.log('\n' + '='.repeat(60));
