import { WorkBook } from '../../core/exceljs-adapter';
import { ParsedBusinessProfile } from '../../excel-parser';
import { 
  fillMergedCells, 
  getSheetDataWithMergedCells 
} from '../../core/excel-merged-cells-handler';
import { safeParseNumber } from '../helpers';

/**
 * Sheet 14: ผู้ขายผู้ซื้อ (Suppliers/Customers) - FIXED v2
 * Fixes:
 * - Better section detection with multi-row header support
 * - Handles rows where name is in column 1 (col 0 has row number)
 * - Fallback: if no sections found, tries to parse all data rows
 * - Skip section header keywords more carefully
 */
export function parseSuppliersAndCustomers(workbook: WorkBook): {
  suppliers: Array<NonNullable<ParsedBusinessProfile['suppliers']>[number]>;
  customers: Array<NonNullable<ParsedBusinessProfile['customers']>[number]>;
} {
  console.log('[Suppliers/Customers Parser] Starting...');
  
  const sheetName = workbook.SheetNames.find(name => 
    name.includes('ผู้ขาย') || name.includes('ผู้ซื้อ') || name.includes('คู่ค้า')
  );
  
  if (!sheetName) {
    console.log('[Suppliers/Customers Parser] ❌ Sheet not found. Available sheets:', workbook.SheetNames);
    return { suppliers: [], customers: [] };
  }
  
  console.log(`[Suppliers/Customers Parser] ✅ Found sheet: "${sheetName}"`);
  
  const sheet = workbook.Sheets[sheetName];
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  console.log(`[Suppliers/Customers Parser] Processing ${data.length} rows`);
  
  // DEBUG: Show first 20 rows for visibility
  console.log('[Suppliers/Customers Parser] 🔍 First 20 rows:', data.slice(0, 20).map((row, i) => ({
    row: i,
    data: row.slice(0, 8)
  })));
  
  const suppliers: Array<NonNullable<ParsedBusinessProfile['suppliers']>[number]> = [];
  const customers: Array<NonNullable<ParsedBusinessProfile['customers']>[number]> = [];
  
  // Helper: Check if a row is a section header (not data)
  function isSectionHeader(rowText: string): boolean {
    const headerPatterns = [
      /^\s*ผู้ขาย/,
      /^\s*ผู้ซื้อ/,
      /^\s*ลูกค้า/,
      /^\s*คู่ค้า/,
      /^\s*supplier/i,
      /^\s*customer/i,
      /^\s*buyer/i,
      /^\s*vendor/i,
    ];
    return headerPatterns.some(p => p.test(rowText.trim()));
  }
  
  // Helper: Check if a row is a column header
  function isColumnHeader(rowText: string): boolean {
    const lower = rowText.toLowerCase();
    return (
      (lower.includes('ชื่อ') && (lower.includes('สินค้า') || lower.includes('เงื่อนไข') || lower.includes('สัดส่วน'))) ||
      (lower.includes('name') && (lower.includes('product') || lower.includes('term'))) ||
      (lower.includes('ลำดับ') && lower.includes('ชื่อ'))
    );
  }
  
  // Helper: Extract name from a row (handles merged cells where name spans C2-C5)
  function extractName(row: Array<unknown>): { name: string; nameCol: number } | null {
    // Scan first 5 columns for a name
    for (let col = 0; col < Math.min(5, row.length); col++) {
      const cellText = String(row[col] || '').trim();
      if (!cellText || cellText.length < 2) continue;
      
      // Skip pure numbers
      if (cellText.match(/^[\d.]+$/)) continue;
      
      // Case 1: "1. Company Name" or "1  Company Name" in cell
      const numberedInline = cellText.match(/^\d+\.?\s+(.+)$/);
      if (numberedInline && numberedInline[1] && numberedInline[1].length >= 2) {
        return { name: numberedInline[1].trim(), nameCol: col };
      }
      
      // Case 2: Cell contains a company/person name (not a number or keyword)
      if (cellText.length >= 3 && !cellText.match(/^[\d,.%]+$/)) {
        return { name: cellText, nameCol: col };
      }
    }
    
    return null;
  }
  
  // Helper: Check if name should be skipped (headers, keywords, etc.)
  function shouldSkipName(name: string): boolean {
    const lower = name.toLowerCase();
    const skipWords = [
      'ชื่อ', 'name', 'ผู้ขาย', 'ผู้ซื้อ', 'ลูกค้า', 'supplier', 'customer',
      'buyer', 'vendor', 'คู่ค้า', 'รายละเอียด', 'หมายเหตุ', 'note', 'remark',
      'สินค้า', 'product', 'เงื่อนไข', 'รวม', 'total', 'สัดส่วน', 'ลำดับ',
      'ชื่อผู้ขาย', 'ชื่อลูกค้า', 'ประเภท', 'รายชื่อ', 'เครดิต', 'ระยะเวลา',
    ];
    return (
      name.length < 2 ||
      skipWords.some(w => lower === w || lower.startsWith(w + ' ') || lower.includes('รายใหญ่')) ||
      !!name.match(/^[0-9]+\.?$/)
    );
  }
  
  // Helper: Parse supplier/customer data from a row
  // Real Excel layout: name(C2-C5), product(C6-C8), %(C9-C10), credit(C11), duration(C12-C13)
  function parseEntityRow(row: Array<unknown>): {
    name: string;
    productType: string;
    paymentTerms: string;
    address: string;
    phone: string;
    percentage: number;
    amount: number;
    contactDuration: string;
  } | null {
    const nameResult = extractName(row);
    if (!nameResult || shouldSkipName(nameResult.name)) return null;
    
    const { name, nameCol } = nameResult;
    
    // Try to find data by column position patterns
    // Common layout: name at col 1-4, product at col 5-7, % at col 8-9, credit at col 10, duration at col 11-12
    let productType = '';
    let paymentTerms = '';
    let address = '';
    let phone = '';
    let percentage = 0;
    let contactDuration = '';
    
    // Scan all cells after the name for specific data types
    for (let col = nameCol + 1; col < row.length; col++) {
      const cellText = String(row[col] || '').trim();
      if (!cellText || cellText.length === 0) continue;
      // Skip cells that are the same as the name (from merged cells)
      if (cellText === name) continue;
      
      const cellNum = safeParseNumber(row[col]);
      
      // Percentage detection (0 < num <= 1 means decimal %, or explicit %)
      if (percentage === 0 && cellNum > 0 && cellNum <= 1) {
        percentage = cellNum * 100;
        continue;
      }
      if (percentage === 0 && cellText.includes('%')) {
        const pMatch = cellText.match(/([\d.]+)\s*%/);
        if (pMatch) {
          percentage = parseFloat(pMatch[1]);
          continue;
        }
      }
      
      // Payment terms / credit detection (e.g., "3 วัน", "30 วัน", "เงินสด")
      if (!paymentTerms && (
        cellText.includes('วัน') || cellText.includes('เงินสด') || 
        cellText.includes('day') || cellText.includes('cash') ||
        cellText.includes('เครดิต') || cellText.includes('credit')
      )) {
        paymentTerms = cellText;
        continue;
      }
      
      // Contact duration detection (e.g., "5 ปี", "14 ปี")
      if (!contactDuration && cellText.includes('ปี')) {
        contactDuration = cellText;
        continue;
      }
      
      // Product type detection — short text that's not a number
      if (!productType && cellText.length >= 2 && cellText.length < 50 && 
          !cellText.match(/^[\d,.%]+$/) && !cellText.includes('ปี') && !cellText.includes('วัน')) {
        productType = cellText;
        continue;
      }
      
      // Phone detection
      if (!phone && cellText.match(/^0[0-9-]{8,12}$/)) {
        phone = cellText;
        continue;
      }
      
      // Address detection
      if (!address && cellText.length > 10 && (
        cellText.includes('จ.') || cellText.includes('ถ.') || 
        cellText.includes('ต.') || cellText.includes('อ.') ||
        cellText.includes('หมู่') || cellText.includes('ซอย')
      )) {
        address = cellText;
        continue;
      }
    }
    
    return {
      name,
      productType,
      paymentTerms,
      address,
      phone,
      percentage,
      amount: 0,
      contactDuration,
    };
  }
  
  // Phase 1: Find section boundaries
  let supplierStart = -1;
  let customerStart = -1;
  const sectionBoundaries: Array<{ type: 'supplier' | 'customer'; startRow: number }> = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const rowText = row.join(' ').toLowerCase();
    const firstCellLower = String(row[0] || '').toLowerCase().trim();
    
    // Check if this is a section header
    if (
      firstCellLower.includes('ผู้ขาย') || 
      firstCellLower.includes('supplier') ||
      firstCellLower.includes('vendor') ||
      (rowText.includes('ผู้ขาย') && !rowText.includes('ผู้ซื้อ') && row.filter((c: unknown) => String(c || '').trim()).length <= 3)
    ) {
      supplierStart = i;
      sectionBoundaries.push({ type: 'supplier', startRow: i });
      console.log(`[Suppliers/Customers Parser] 🔍 Found supplier section at row ${i}: "${rowText.substring(0, 60)}"`);
    }
    
    if (
      firstCellLower.includes('ผู้ซื้อ') || 
      firstCellLower.includes('ลูกค้า') || 
      firstCellLower.includes('customer') ||
      firstCellLower.includes('buyer') ||
      (rowText.includes('ผู้ซื้อ') && !rowText.includes('ผู้ขาย') && row.filter((c: unknown) => String(c || '').trim()).length <= 3) ||
      (rowText.includes('ลูกค้า') && row.filter((c: unknown) => String(c || '').trim()).length <= 3)
    ) {
      customerStart = i;
      sectionBoundaries.push({ type: 'customer', startRow: i });
      console.log(`[Suppliers/Customers Parser] 🔍 Found customer section at row ${i}: "${rowText.substring(0, 60)}"`);
    }
  }
  
  // Phase 2: Parse data rows within each section
  if (sectionBoundaries.length > 0) {
    for (let s = 0; s < sectionBoundaries.length; s++) {
      const section = sectionBoundaries[s];
      const nextSectionStart = s + 1 < sectionBoundaries.length ? sectionBoundaries[s + 1].startRow : data.length;
      
      // Find where data starts (skip section header + column headers)
      let dataStart = section.startRow + 1;
      for (let i = section.startRow + 1; i < Math.min(section.startRow + 4, nextSectionStart); i++) {
        const row = data[i];
        if (!row) continue;
        const rowText = row.join(' ');
        if (isColumnHeader(rowText)) {
          dataStart = i + 1;
          console.log(`[Suppliers/Customers Parser] 🔍 Column header at row ${i}, data starts at ${dataStart}`);
          break;
        }
      }
      
      // Parse data rows
      for (let i = dataStart; i < nextSectionStart; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        
        const rowText = row.join(' ').trim();
        if (!rowText || rowText.length < 3) continue;
        
        // Stop at "total" or new section
        if (rowText.toLowerCase().includes('รวม') && !rowText.toLowerCase().includes('บริษัท')) break;
        
        const entity = parseEntityRow(row);
        if (!entity) continue;
        
        if (section.type === 'supplier') {
          suppliers.push({
            name: entity.name,
            address: entity.address,
            phone: entity.phone,
            productType: entity.productType,
            paymentTerms: entity.paymentTerms,
            creditLimit: entity.percentage || entity.amount || 0,
            contactDuration: entity.contactDuration,
          });
          if (suppliers.length <= 5) {
            console.log(`[Suppliers/Customers Parser] 🔍 Added supplier: "${entity.name}" (product: ${entity.productType || 'none'}, ${entity.percentage}%)`);
          }
        } else {
          customers.push({
            name: entity.name,
            address: entity.address,
            phone: entity.phone,
            productService: entity.productType,
            paymentTerms: entity.paymentTerms,
            salesProportion: entity.percentage || entity.amount || 0,
            contactDuration: entity.contactDuration,
          });
          if (customers.length <= 5) {
            console.log(`[Suppliers/Customers Parser] 🔍 Added customer: "${entity.name}" (product: ${entity.productType || 'none'}, ${entity.percentage}%)`);
          }
        }
      }
    }
  }
  
  // Phase 3: FALLBACK - If no sections found or no data extracted, try parsing all rows
  if (suppliers.length === 0 && customers.length === 0) {
    console.log('[Suppliers/Customers Parser] ⚠️ No data from section-based parsing, trying fallback...');
    
    let isInData = false;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const rowText = row.join(' ');
      
      // Skip title/header rows
      if (isColumnHeader(rowText) || isSectionHeader(rowText.toLowerCase())) {
        isInData = true; // Data should start after headers
        continue;
      }
      
      if (!isInData) continue;
      
      const entity = parseEntityRow(row);
      if (!entity) continue;
      
      // Default to suppliers for fallback (most common)
      suppliers.push({
        name: entity.name,
        address: entity.address,
        phone: entity.phone,
        productType: entity.productType,
        paymentTerms: entity.paymentTerms,
        creditLimit: entity.percentage || entity.amount || 0,
      });
      
      if (suppliers.length <= 3) {
        console.log(`[Suppliers/Customers Parser] 🔍 Fallback added: "${entity.name}"`);
      }
    }
  }
  
  console.log(`[Suppliers/Customers Parser] ✅ Extracted ${suppliers.length} suppliers, ${customers.length} customers`);
  
  return { suppliers, customers };
}
