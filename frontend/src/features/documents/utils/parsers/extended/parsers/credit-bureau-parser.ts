import { WorkBook } from '../../core/exceljs-adapter';
import { ParsedBusinessProfile } from '../../excel-parser';
import { 
  fillMergedCells, 
  getSheetDataWithMergedCells 
} from '../../core/excel-merged-cells-handler';
import { safeParseNumber } from '../helpers';

/**
 * Sheet 8: เครดิตบูโร (Credit Bureau Report) - DYNAMIC VERSION
 * ✅ Uses "รวม" as table separator (not borrower names)
 * ✅ Collects ALL rows with data (even if bank = "ธนาคาร")
 * ✅ Extracts borrower name from section headers dynamically
 * ✅ Extracts openDate and monthlyPayment columns
 */
export function parseCreditBureauReports(workbook: WorkBook): Array<NonNullable<ParsedBusinessProfile['creditBureauReports']>[number]> {
  console.log('[Credit Bureau Parser] Starting DYNAMIC parsing...');
  const reports: ParsedBusinessProfile['creditBureauReports'] = [];
  
  const sheetName = workbook.SheetNames.find(name => 
    name.includes('เครดิต') || name.includes('บูโร') || name.toLowerCase().includes('credit')
  );
  
  if (!sheetName) {
    console.log('[Credit Bureau Parser] ❌ Sheet not found');
    return reports;
  }
  
  const sheet = workbook.Sheets[sheetName];
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  console.log(`[Credit Bureau Parser] 📋 Sheet has ${data.length} rows`);
  
  // Find all section headers (ประวัติการติดต่อกับสถาบันการเงิน)
  const sections: Array<{ 
    borrowerName: string; 
    reportDate: string; 
    startRow: number; 
    endRow: number;
  }> = [];
  
  for (let i = 0; i < data.length; i++) {
    const rowText = data[i].join(' ');
    
    // Look for section header
    if (rowText.includes('ประวัติการติดต่อกับสถาบันการเงิน')) {
      // Extract borrower name from nearby rows
      let borrowerName = 'ไม่ระบุ';
      let reportDate = '';
      
      // Search in current row and next 3 rows
      for (let j = i; j < Math.min(i + 4, data.length); j++) {
        const searchText = data[j].join(' ');
        
        // Try company pattern
        const companyMatch = searchText.match(/บริษัท\s+([^\s]+(?:\s+[^\s]+)*?)\s+จำกัด/);
        if (companyMatch) {
          borrowerName = companyMatch[0].trim();
          const dateMatch = searchText.match(/ตรวจสอบ\s*ณ\s*วันที่\s*(\d{1,2}\s*[ก-ฮ\.]+\s*\d{2,4})/);
          if (dateMatch) reportDate = dateMatch[1];
          break;
        }
        
        // Try person pattern
        const personMatch = searchText.match(/(นาย|นาง|นางสาว|น\.ส\.)[\s]*([^\s]+)[\s]+([^\s]+)/);
        if (personMatch) {
          borrowerName = `${personMatch[1]}${personMatch[2]} ${personMatch[3]}`.trim();
          const dateMatch = searchText.match(/ตรวจสอบ\s*ณ\s*วันที่\s*(\d{1,2}\s*[ก-ฮ\.]+\s*\d{2,4})/);
          if (dateMatch) reportDate = dateMatch[1];
          break;
        }
      }
      
      sections.push({
        borrowerName,
        reportDate,
        startRow: i,
        endRow: data.length, // Will be updated when we find next section or "รวม"
      });
      
      console.log(`[Credit Bureau Parser] 📍 Section ${sections.length}: ${borrowerName} at row ${i}`);
    }
  }
  
  // Update endRow for each section (find "รวม" or next section)
  for (let s = 0; s < sections.length; s++) {
    const section = sections[s];
    const nextSectionStart = s < sections.length - 1 ? sections[s + 1].startRow : data.length;
    
    // Find "รวม" row within this section
    for (let i = section.startRow; i < nextSectionStart; i++) {
      const rowText = data[i].join(' ').toLowerCase();
      if (rowText.includes('รวมทั้งหมด') || (rowText.includes('รวม') && !rowText.includes('แหล่ง') && !rowText.includes('กองทุน'))) {
        section.endRow = i;
        console.log(`[Credit Bureau Parser] 🔚 Section "${section.borrowerName}" ends at row ${i} (found รวม)`);
        break;
      }
    }
    
    if (section.endRow === data.length) {
      section.endRow = nextSectionStart;
      console.log(`[Credit Bureau Parser] 🔚 Section "${section.borrowerName}" ends at row ${nextSectionStart} (next section)`);
    }
  }
  
  // Process each section
  for (const section of sections) {
    console.log(`[Credit Bureau Parser] 🔄 Processing section: ${section.borrowerName} (rows ${section.startRow}-${section.endRow})`);
    
    // Find header row (contains column names)
    let headerRow = -1;
    let columns: { [key: string]: number } = {};
    
    for (let i = section.startRow; i < Math.min(section.startRow + 10, section.endRow); i++) {
      const row = data[i];
      const rowText = row.map((c: unknown) => String(c).toLowerCase()).join(' ');
      
      // Check if this row has column headers
      if ((rowText.includes('ธนาคาร') || rowText.includes('สถาบัน')) && 
          (rowText.includes('วงเงิน') || rowText.includes('ภาระ'))) {
        headerRow = i;
        
        // Map column positions
        for (let col = 0; col < row.length; col++) {
          const cellText = String(row[col] || '').toLowerCase();
          
          if (cellText.includes('ธนาคาร') || cellText.includes('สถาบัน') || cellText.includes('แหล่ง')) {
            columns.bank = col;
          }
          if (cellText.includes('ประเภท')) {
            columns.type = col;
          }
          if (cellText.includes('วันที่เปิด') || cellText.includes('เปิดบัญชี')) {
            columns.openDate = col;
          }
          if (cellText.includes('วงเงิน')) {
            columns.limit = col;
          }
          if (cellText.includes('ภาระหนี้') || cellText.includes('คงค้าง')) {
            columns.outstanding = col;
          }
          if (cellText.includes('ผ่อนชำระ') || cellText.includes('ชำระต่อเดือน')) {
            columns.monthlyPayment = col;
          }
          if (cellText.includes('สถานะ')) {
            columns.status = col;
          }
        }
        
        console.log(`[Credit Bureau Parser] 📊 Found header at row ${i}, columns:`, columns);
        break;
      }
    }
    
    if (headerRow === -1) {
      console.log(`[Credit Bureau Parser] ⚠️  No header found for section "${section.borrowerName}"`);
      continue;
    }
    
    // Collect all data rows (from header+1 to endRow)
    const accounts: Array<{
      bank: string;
      accountType: string;
      openDate?: string;
      creditLimit: number;
      outstanding: number;
      monthlyPayment?: number;
      paymentStatus: string;
    }> = [];
    
    for (let i = headerRow + 1; i < section.endRow; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const rowText = row.join(' ').toLowerCase();
      
      // Skip "รวม" rows and "ไม่พบข้อมูล"
      if (rowText.includes('รวม') || rowText.includes('ไม่พบข้อมูล')) {
        continue;
      }
      
      // Extract data from columns
      const bank = columns.bank !== undefined ? String(row[columns.bank] || '').trim() : '';
      const accountType = columns.type !== undefined ? String(row[columns.type] || '').trim() : '';
      const openDate = columns.openDate !== undefined ? String(row[columns.openDate] || '').trim() : '';
      const creditLimit = columns.limit !== undefined ? safeParseNumber(row[columns.limit]) : 0;
      const outstanding = columns.outstanding !== undefined ? safeParseNumber(row[columns.outstanding]) : 0;
      const monthlyPayment = columns.monthlyPayment !== undefined ? safeParseNumber(row[columns.monthlyPayment]) : 0;
      const paymentStatus = columns.status !== undefined ? String(row[columns.status] || 'ปกติ').trim() : 'ปกติ';
      
      // Skip if bank is empty or just a number (row number)
      if (!bank || bank.match(/^\d+$/)) {
        continue;
      }
      
      // Skip only these specific header values (but keep "ธนาคาร" as data)
      if (bank === 'สถาบันการเงิน' || bank === 'ลำดับ' || 
          bank === 'แหล่งเงินกู้' || bank === 'สินเชื่อกองทุน' ||
          bank === 'ชื่อสถาบันการเงิน') {
        continue;
      }
      
      // Add account (keep even if bank = "ธนาคาร" - user will edit)
      accounts.push({
        bank,
        accountType: accountType || '-',
        openDate: openDate || undefined,
        creditLimit,
        outstanding,
        monthlyPayment: monthlyPayment > 0 ? monthlyPayment : undefined,
        paymentStatus: paymentStatus || 'ปกติ',
      });
      
      console.log(`[Credit Bureau Parser] ➕ Added account: ${bank} (limit: ${creditLimit}, outstanding: ${outstanding})`);
    }
    
    // Create report even if no accounts (user can add manually)
    const totalCreditLimit = accounts.reduce((sum, acc) => sum + acc.creditLimit, 0);
    const totalOutstanding = accounts.reduce((sum, acc) => sum + acc.outstanding, 0);
    
    reports.push({
      borrowerName: section.borrowerName,
      reportDate: section.reportDate || new Date().toISOString().split('T')[0],
      totalCreditLimit,
      totalOutstanding,
      creditUtilization: totalCreditLimit > 0 ? (totalOutstanding / totalCreditLimit) * 100 : 0,
      nplAccounts: accounts.filter(a => a.paymentStatus.includes('NPL')).length,
      accounts,
    });
    
    console.log(`[Credit Bureau Parser] ✅ Created report for "${section.borrowerName}": ${accounts.length} accounts`);
  }
  
  console.log(`[Credit Bureau Parser] ✅ Total: ${reports.length} reports with ${reports.reduce((sum, r) => sum + r.accounts.length, 0)} accounts`);
  return reports;
}
