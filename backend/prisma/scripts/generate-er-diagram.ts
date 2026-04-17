/**
 * สร้าง ER Diagram จาก Database จริง (Local)
 * อ่านโครงสร้างจาก PostgreSQL information_schema
 *
 * วิธีรัน: cd backend && npx tsx prisma/scripts/generate-er-diagram.ts
 * Output: DATABASE_ER_DIAGRAM.md, database.dbml (ใช้กับ https://dbml.dbdiagram.io)
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface TableColumn {
    table_name: string;
    column_name: string;
    data_type: string;
    is_nullable: string;
    is_primary?: boolean;
}

interface ForeignKey {
    from_table: string;
    from_column: string;
    to_table: string;
    to_column: string;
    constraint_name: string;
}

// Escape สำหรับ Mermaid
function escapeMermaid(str: string): string {
    return str.replace(/\s/g, '_');
}

// แปลง PostgreSQL type เป็น DBML type
function toDBMLType(pgType: string): string {
    if (pgType === 'USER-DEFINED') return 'varchar'; // enum types
    const m: Record<string, string> = {
        uuid: 'varchar(36)',
        'character varying': 'varchar',
        'timestamp with time zone': 'timestamp',
        'timestamp without time zone': 'timestamp',
        'time without time zone': 'time',
        'double precision': 'decimal',
        'real': 'decimal',
        'smallint': 'int',
        'bigint': 'bigint',
        'integer': 'int',
        'boolean': 'boolean',
        'text': 'text',
        'json': 'json',
        'jsonb': 'json',
    };
    for (const [k, v] of Object.entries(m)) {
        if (pgType.includes(k) && !pgType.includes('ARRAY')) return v;
    }
    if (pgType.includes('ARRAY')) return 'varchar'; // string[] etc
    if (pgType.startsWith('character varying') || pgType.startsWith('varchar')) return 'varchar';
    if (pgType.startsWith('decimal') || pgType.startsWith('numeric')) return pgType;
    return pgType.replace(/\s/g, '_');
}

// สร้าง DBML จากข้อมูล database (ใช้ inline ref เพื่อป้องกัน error "Unequal fields")
function generateDBML(
    tables: string[],
    tableColumns: Map<string, TableColumn[]>,
    fks: ForeignKey[]
): string {
    const fkMap = new Map<string, { to_table: string; to_column: string }>();
    for (const fk of fks) {
        fkMap.set(`${fk.from_table}.${fk.from_column}`, { to_table: fk.to_table, to_column: fk.to_column });
    }

    let dbml = `// SME Bank Database Schema
// สร้างจาก Database จริง - ใช้กับ https://dbml.dbdiagram.io
// Generated: ${new Date().toISOString()}
// ใช้ inline ref เพื่อให้ dbdiagram.io รองรับได้ถูกต้อง

Project SME_Bank_2026 {
  database_type: 'PostgreSQL'
  Note: 'SME Bank 2026 - จาก Local Database'
}

`;

    for (const table of tables) {
        const cols = tableColumns.get(table) || [];
        dbml += `Table ${table} {\n`;
        for (const col of cols) {
            const dbmlType = toDBMLType(col.data_type);
            const settings: string[] = [];
            if (col.is_primary) settings.push('pk');
            if (col.is_nullable === 'NO') settings.push('not null');
            const fkRef = fkMap.get(`${table}.${col.column_name}`);
            if (fkRef) settings.push(`ref: > ${fkRef.to_table}.${fkRef.to_column}`);
            const settingsStr = settings.length ? ` [${settings.join(', ')}]` : '';
            dbml += `  ${col.column_name} ${dbmlType}${settingsStr}\n`;
        }
        dbml += '}\n\n';
    }

    return dbml;
}

async function getTables(): Promise<string[]> {
    const result = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
        `SELECT tablename FROM pg_tables 
         WHERE schemaname = 'public' 
         ORDER BY tablename`
    );
    return result.map((r) => r.tablename);
}

async function getColumns(): Promise<TableColumn[]> {
    const result = await prisma.$queryRawUnsafe<
        { table_name: string; column_name: string; data_type: string; is_nullable: string }[]
    >(
        `SELECT table_name, column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public'
         ORDER BY table_name, ordinal_position`
    );
    return result;
}

async function getPrimaryKeys(): Promise<Set<string>> {
    const result = await prisma.$queryRawUnsafe<
        { table_name: string; column_name: string }[]
    >(
        `SELECT tc.table_name, kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu 
           ON tc.constraint_name = kcu.constraint_name
         WHERE tc.constraint_type = 'PRIMARY KEY' 
           AND tc.table_schema = 'public'`
    );
    return new Set(result.map((r) => `${r.table_name}.${r.column_name}`));
}

async function getForeignKeys(): Promise<ForeignKey[]> {
    const result = await prisma.$queryRawUnsafe<
        {
            from_table: string;
            from_column: string;
            to_table: string;
            to_column: string;
            constraint_name: string;
        }[]
    >(
        `SELECT 
            tc.table_name AS from_table,
            kcu.column_name AS from_column,
            ccu.table_name AS to_table,
            ccu.column_name AS to_column,
            tc.constraint_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
             ON tc.constraint_name = kcu.constraint_name
             AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
             ON ccu.constraint_name = tc.constraint_name
             AND ccu.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_schema = 'public'
         ORDER BY from_table, from_column`
    );
    return result;
}

async function main() {
    console.log('🔍 กำลังอ่านโครงสร้างจาก Database...\n');

    const [tables, columns, pkSet, fks] = await Promise.all([
        getTables(),
        getColumns(),
        getPrimaryKeys(),
        getForeignKeys(),
    ]);

    console.log(`   ตาราง: ${tables.length} ตาราง`);
    console.log(`   ความสัมพันธ์ (FK): ${fks.length} ความสัมพันธ์\n`);

    // Group columns by table
    const tableColumns = new Map<string, TableColumn[]>();
    for (const col of columns) {
        const pk = pkSet.has(`${col.table_name}.${col.column_name}`);
        if (!tableColumns.has(col.table_name)) {
            tableColumns.set(col.table_name, []);
        }
        tableColumns.get(col.table_name)!.push({ ...col, is_primary: pk });
    }

    // Build Mermaid ER Diagram
    let mermaid = `# Database ER Diagram (จาก Database จริง)

**สร้างเมื่อ:** ${new Date().toISOString()}  
**แหล่งที่มา:** PostgreSQL information_schema (Database Local)

---

## แผนภาพความสัมพันธ์ (Mermaid)

\`\`\`mermaid
erDiagram
`;

    // Add tables - แสดงเฉพาะ PK และ key columns เพื่อให้ diagram อ่านง่าย
    for (const table of tables) {
        const cols = tableColumns.get(table) || [];
        const pkCol = cols.find((c) => c.is_primary);
        const displayCols = pkCol ? [pkCol] : cols.slice(0, 1);

        mermaid += `    ${escapeMermaid(table)} {\n`;
        for (const col of displayCols) {
            const pk = col.is_primary ? ' PK' : '';
            const type = col.data_type.replace('character varying', 'varchar').replace('timestamp with time zone', 'timestamp').substring(0, 15);
            mermaid += `        ${type} ${col.column_name}${pk}\n`;
        }
        mermaid += `    }\n\n`;
    }

    // Add relationships (จากตารางที่มี FK ชี้ไปตารางปลายทาง = many-to-one)
    mermaid += `\n`;
    const seenRels = new Set<string>();
    for (const fk of fks) {
        const from = escapeMermaid(fk.from_table);
        const to = escapeMermaid(fk.to_table);
        const relKey = `${from}-${to}-${fk.from_column}`;
        if (seenRels.has(relKey)) continue;
        seenRels.add(relKey);
        mermaid += `    ${from} }o--|| ${to} : "${fk.from_column}"\n`;
    }

    mermaid += `\`\`\`
`;

    // แผนภาพแบบย่อ (Core tables)
    const coreTables = new Set([
        'branches', 'users', 'customers', 'loans', 'loan_products', 'loan_disbursements',
        'payment_schedules', 'payments', 'payment_receipts', 'invoices', 'next_payment_invoices',
        'documents', 'contact_logs', 'expenses', 'product_configs', 'calendar_events',
    ]);
    const coreFks = fks.filter((fk) => coreTables.has(fk.from_table) && coreTables.has(fk.to_table));

    mermaid += `
---

## แผนภาพแบบย่อ (Core Business - 16 ตารางหลัก)

\`\`\`mermaid
erDiagram
`;
    for (const table of tables.filter((t) => coreTables.has(t))) {
        const cols = tableColumns.get(table) || [];
        const pkCol = cols.find((c) => c.is_primary);
        if (pkCol) {
            mermaid += `    ${escapeMermaid(table)} {\n        uuid ${pkCol.column_name} PK\n    }\n\n`;
        }
    }
    for (const fk of coreFks) {
        const from = escapeMermaid(fk.from_table);
        const to = escapeMermaid(fk.to_table);
        mermaid += `    ${from} }o--|| ${to} : "${fk.from_column}"\n`;
    }
    mermaid += `\`\`\`

---

## ตารางทั้งหมด (${tables.length} ตาราง)

| ตาราง | จำนวนคอลัมน์ |
|-------|--------------|
`;

    for (const table of tables) {
        const count = (tableColumns.get(table) || []).length;
        mermaid += `| ${table} | ${count} |\n`;
    }

    mermaid += `
---

## ความสัมพันธ์ Foreign Key (${fks.length} ความสัมพันธ์)

| จากตาราง | คอลัมน์ | ไปตาราง | คอลัมน์ปลายทาง |
|----------|---------|---------|----------------|
`;

    for (const fk of fks) {
        mermaid += `| ${fk.from_table} | ${fk.from_column} | ${fk.to_table} | ${fk.to_column} |\n`;
    }

    mermaid += `
---

## คอลัมน์ทั้งหมด (รายละเอียด)

`;

    for (const table of tables) {
        const cols = tableColumns.get(table) || [];
        mermaid += `### ${table}\n\n| Column | Type | Nullable | PK |\n|--------|------|----------|----|\n`;
        for (const col of cols) {
            mermaid += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable} | ${col.is_primary ? '✓' : ''} |\n`;
        }
        mermaid += '\n';
    }

    const outputPath = path.join(process.cwd(), '..', 'DATABASE_ER_DIAGRAM.md');
    fs.writeFileSync(outputPath, mermaid, 'utf-8');

    // สร้าง DBML สำหรับ dbdiagram.io
    const dbml = generateDBML(tables, tableColumns, fks);
    const dbmlPath = path.join(process.cwd(), '..', 'database.dbml');
    fs.writeFileSync(dbmlPath, dbml, 'utf-8');

    console.log(`✅ สร้างแผนภาพเรียบร้อย:`);
    console.log(`   - ${path.resolve(outputPath)}`);
    console.log(`   - ${path.resolve(dbmlPath)} (ใช้กับ https://dbml.dbdiagram.io)`);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
