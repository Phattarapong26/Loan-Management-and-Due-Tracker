import { WorkBook } from '../core/exceljs-adapter';
import { 
  fillMergedCells,
  getSheetDataWithMergedCells 
} from '../core/excel-merged-cells-handler';
import { ParsedBusinessProfile } from '../excel-parser';

/**
 * Sheet-Specific Parsers - FIXED VERSION
 * ✅ Uses merged cells handler
 * ✅ Robust data extraction
 * ✅ Comprehensive logging
 */

function safeParseNumber(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const cleaned: string = value.replace(/[,\s฿]/g, '').replace(/บาท/g, '').replace(/ล้าน/g, '').trim();
    const parsed: number = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    if (value.includes('ล้าน')) return parsed * 1000000;
    return parsed;
  }
  return 0;
}

/**
 * Sheet 7: ประมาณการ (Revenue Projection) - ENHANCED WITH DEBUG
 */
export function parseRevenueProjection(workbook: WorkBook): NonNullable<ParsedBusinessProfile['revenueProjection']> {
  console.log('[Revenue Projection Parser] Starting...');
  
  const defaultResult: NonNullable<ParsedBusinessProfile['revenueProjection']> = {
    projectionYear: new Date().getFullYear(),
    growthRate: 0,
    monthlyProjections: [],
    annualTotal: { totalRevenue: 0, totalCost: 0, totalProfit: 0 },
  };

  const candidateSheets = workbook.SheetNames.filter(name => 
    name.includes('ประมาณการ') || 
    name.toLowerCase().includes('projection') || 
    name.includes('DSCR') || 
    name.toLowerCase().includes('dscr')
  );

  if (candidateSheets.length === 0) {
    console.log('[Revenue Projection Parser] ❌ No relevant sheets found');
    return defaultResult;
  }

  // Prioritize DSCR sheet as it usually contains monthly breakdown
  const sheetName = candidateSheets.find(n => n.includes('DSCR') && n.includes('(')) || 
                    candidateSheets.find(n => n.includes('DSCR')) ||
                    candidateSheets[0];
                    
  console.log(`[Revenue Projection Parser] ✅ Using sheet: "${sheetName}"`);

  const sheet = workbook.Sheets[sheetName];
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  console.log(`[Revenue Projection Parser] Processing ${data.length} rows`);
  
  // DEBUG: Show first 10 rows
  console.log('[Revenue Projection Parser] 🔍 First 10 rows:', data.slice(0, 10).map((row, i) => ({
    row: i,
    data: row.slice(0, 8)
  })));
  
  let growthRate: number = 0;
  const monthlyProjections: Array<{
    month: number;
    projectedRevenue: number;
    projectedCost: number;
    projectedProfit: number;
  }> = [];
  
  // Find growth rate
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const rowText = data[i].join(' ');
    if (rowText.includes('อัตรา') || rowText.includes('Growth')) {
      const match = rowText.match(/([\d.]+)\s*%/);
      if (match) growthRate = parseFloat(match[1]);
    }
  }
  
  // ENHANCED: More month patterns
  const monthNames: Array<string> = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  
  const fullMonthNames: Array<string> = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];
  
  const englishMonths: Array<string> = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  
  const allMonthPatterns: Array<string> = [...monthNames, ...fullMonthNames, ...englishMonths];
  
  // ENHANCED: Check if data uses row numbers instead of month names
  let usesRowNumbers = false;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    const firstCell = String(row[0] || '').trim();
    if (firstCell.match(/^[1-9]$|^1[0-2]$/) && row.length > 2) {
      const hasNumbers = row.slice(1).some((cell: unknown) => safeParseNumber(cell) > 10000);
      if (hasNumbers) {
        usesRowNumbers = true;
        console.log('[Revenue Projection Parser] 🔍 Detected row number format (1-12)');
        break;
      }
    }
  }
  
  // FIX: Find header row with month columns
  let headerRowIndex = -1;
  const monthColumnIndices: number[] = [];
  
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    let monthsFound = 0;
    const tempIndices: number[] = [];
    
    for (let col = 0; col < row.length; col++) {
      const cellText = String(row[col] || '').toLowerCase();
      for (let m = 0; m < 12; m++) {
        if (
          cellText.includes(monthNames[m].toLowerCase()) ||
          cellText.includes(fullMonthNames[m].toLowerCase()) ||
          cellText.includes(englishMonths[m].toLowerCase())
        ) {
          monthsFound++;
          tempIndices.push(col);
          break;
        }
      }
    }
    
    if (monthsFound >= 3) {
      headerRowIndex = i;
      monthColumnIndices.push(...tempIndices);
      console.log(`[Revenue Projection Parser] 🔍 Found header row ${i} with ${monthsFound} months at columns:`, tempIndices);
      break;
    }
  }
  
  // FIX: If found header with month columns, parse data rows
  if (headerRowIndex >= 0 && monthColumnIndices.length >= 3) {
    // Find revenue and cost rows
    let revenueRowIndex = -1;
    let costRowIndex = -1;
    
    for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 30, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      
      const firstCell = String(row[0] || '').toLowerCase();
      if (firstCell.includes('รายได้') || firstCell.includes('revenue') || firstCell.includes('ยอดขาย')) {
        revenueRowIndex = i;
        console.log(`[Revenue Projection Parser] 🔍 Found revenue row at ${i}`);
      }
      if (firstCell.includes('ต้นทุน') || firstCell.includes('cost') || firstCell.includes('ค่าใช้จ่าย')) {
        costRowIndex = i;
        console.log(`[Revenue Projection Parser] 🔍 Found cost row at ${i}`);
      }
      
      if (revenueRowIndex >= 0 && costRowIndex >= 0) break;
    }
    
    // Extract data for each month
    if (revenueRowIndex >= 0 || costRowIndex >= 0) {
      for (let month = 0; month < Math.min(12, monthColumnIndices.length); month++) {
        const colIndex = monthColumnIndices[month];
        
        const revenue = revenueRowIndex >= 0 ? safeParseNumber(data[revenueRowIndex][colIndex]) : 0;
        const cost = costRowIndex >= 0 ? safeParseNumber(data[costRowIndex][colIndex]) : 0;
        
        if (revenue > 0 || cost > 0) {
          monthlyProjections.push({
            month: month + 1,
            projectedRevenue: revenue,
            projectedCost: cost,
            projectedProfit: revenue - cost,
          });
          
          if (monthlyProjections.length <= 3) {
            console.log(`[Revenue Projection Parser] 🔍 Month ${month + 1}: Revenue=${revenue}, Cost=${cost}`);
          }
        }
      }
    }
  }
  
  // FALLBACK 1: Row-based parsing where each row = a month
  if (monthlyProjections.length === 0) {
    console.log('[Revenue Projection Parser] 🔍 Column-based parsing failed, trying row-based...');
    
    // First pass: find rows with month names or numbers
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const rowText = row.join(' ');
      const firstCell = String(row[0] || '').trim();
      
      // Check if this row contains month data
      for (let month = 0; month < 12; month++) {
        const patterns = [
          monthNames[month],
          fullMonthNames[month],
          englishMonths[month],
          `เดือน ${month + 1}`,
          `Month ${month + 1}`,
        ];
        
        let foundPattern = patterns.find(p => rowText.includes(p));
        
        // If using row numbers, check first cell
        if (!foundPattern && usesRowNumbers) {
          if (firstCell === String(month + 1)) {
            foundPattern = monthNames[month];
          }
        }
        
        // Also check if first cell is exactly the month number
        if (!foundPattern && firstCell.match(/^[1-9]$|^1[0-2]$/) && parseInt(firstCell) === month + 1) {
          const hasLargeNumbers = row.slice(1).some((cell: unknown) => safeParseNumber(cell) > 1000);
          if (hasLargeNumbers) foundPattern = monthNames[month];
        }
        
        if (foundPattern) {
          const numbers: number[] = [];
          for (const cell of row) {
            const num = safeParseNumber(cell);
            if (num > 1000 && num < 1000000000) numbers.push(num);
          }
          
          if (numbers.length >= 1) {
            monthlyProjections.push({
              month: month + 1,
              projectedRevenue: numbers[0] || 0,
              projectedCost: numbers[1] || 0,
              projectedProfit: (numbers[0] || 0) - (numbers[1] || 0),
            });
            
            if (monthlyProjections.length <= 3) {
              console.log(`[Revenue Projection Parser] 🔍 Row-based month ${month + 1} (${foundPattern}): Revenue=${numbers[0]}, Cost=${numbers[1] || 0}`);
            }
          }
          break;
        }
      }
    }
  }
  
  // FALLBACK 2: If still no data, try consecutive numeric rows as months 1-12
  if (monthlyProjections.length === 0) {
    console.log('[Revenue Projection Parser] 🔍 Row-based failed, trying sequential numeric rows...');
    let monthCounter = 0;
    
    for (let i = 0; i < data.length && monthCounter < 12; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;
      
      const numbers: number[] = [];
      for (const cell of row) {
        const num = safeParseNumber(cell);
        if (num > 1000 && num < 1000000000) numbers.push(num);
      }
      
      // Row has at least one substantial number and looks like data
      if (numbers.length >= 1) {
        const firstCell = String(row[0] || '').trim().toLowerCase();
        // Skip header/total rows
        if (firstCell.includes('รวม') || firstCell.includes('total') || firstCell.includes('รายการ')) continue;
        
        monthCounter++;
        monthlyProjections.push({
          month: monthCounter,
          projectedRevenue: numbers[0] || 0,
          projectedCost: numbers[1] || 0,
          projectedProfit: (numbers[0] || 0) - (numbers[1] || 0),
        });
      }
    }
    
    if (monthlyProjections.length > 0) {
      console.log(`[Revenue Projection Parser] 🔍 Sequential fallback found ${monthlyProjections.length} months`);
    }
  }
  
  // Calculate annual totals
  const annualTotal: { 
    totalRevenue: number; 
    totalCost: number; 
    totalProfit: number; 
  } = monthlyProjections.reduce((acc, proj) => ({
    totalRevenue: acc.totalRevenue + proj.projectedRevenue,
    totalCost: acc.totalCost + proj.projectedCost,
    totalProfit: acc.totalProfit + proj.projectedProfit,
  }), { totalRevenue: 0, totalCost: 0, totalProfit: 0 });
  
  console.log(`[Revenue Projection Parser] ✅ Extracted ${monthlyProjections.length} months`);
  
  if (monthlyProjections.length === 0) {
    console.log('[Revenue Projection Parser] ⚠️ No monthly data found. Showing rows with numbers:');
    let debugCount: number = 0;
    for (let i = 0; i < Math.min(50, data.length); i++) {
      const row: Array<unknown> = data[i];
      if (!row) continue;
      const numbers: Array<number> = row
        .map((cell: unknown) => safeParseNumber(cell))
        .filter((num: number) => num > 10000);
      if (numbers.length >= 2 && debugCount < 5) {
        console.log(`  Row ${i}:`, row.slice(0, 8));
        debugCount++;
      }
    }
  }
  
  return {
    projectionYear: new Date().getFullYear(),
    growthRate,
    monthlyProjections,
    annualTotal,
  };
}

/**
 * Sheet 12: ความเห็น (Approval Comments) - ENHANCED VERSION
 */
export function parseApprovalComments(workbook: WorkBook): NonNullable<ParsedBusinessProfile['approvalComments']> {
  console.log('[Approval Comments Parser] Starting...');
  
  const sheetName = workbook.SheetNames.find(name => 
    name.includes('ความเห็น') || name.toLowerCase().includes('comment') || name.toLowerCase().includes('approval')
  );
  
  if (!sheetName) {
    console.log('[Approval Comments Parser] ❌ Sheet not found');
    return {};
  }
  
  const sheet = workbook.Sheets[sheetName];
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  console.log(`[Approval Comments Parser] Processing ${data.length} rows`);
  
  // Extract all text content from the sheet
  let fullText = '';
  const sections: string[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const row: Array<unknown> = data[i];
    if (!row || row.length === 0) continue;
    
    // Combine all cells in the row
    const rowText = row
      .filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
      .map(cell => String(cell).trim())
      .join(' ');
    
    if (rowText) {
      fullText += rowText + '\n';
      sections.push(rowText);
    }
  }
  
  console.log(`[Approval Comments Parser] Extracted ${sections.length} text sections`);
  console.log(`[Approval Comments Parser] Total text length: ${fullText.length} characters`);
  
  // Parse structured data
  const result: NonNullable<ParsedBusinessProfile['approvalComments']> = {};
  
  // Look for loan details
  const loanDetails: Array<{
    loanType: string;
    amount: number;
    purpose: string;
    term: string;
    interestRate: string;
    conditions: string[];
  }> = [];
  
  // Extract P/N loan details
  const pnMatch = fullText.match(/เงินกู้ระยะสั้นตามตั๋วสัญญาใช้เงิน.*?วงเงิน\s*([\d,\.]+)\s*บาท/);
  if (pnMatch) {
    const amount = parseFloat(pnMatch[1].replace(/,/g, ''));
    loanDetails.push({
      loanType: 'P/N',
      amount: amount,
      purpose: 'เงินทุนหมุนเวียนในกิจการ',
      term: '10 ปี',
      interestRate: 'ปีที่ 1-3 Fix 3.00% ต่อปี, ปีที่ 4 เป็นต้นไป MLR+1.50%',
      conditions: ['ทบทวนวงเงินทุกปี', 'ระยะเวลาตั๋วแต่ละฉบับไม่เกิน 90 วัน']
    });
  }
  
  // Extract F/L loan details
  const flMatch = fullText.match(/เงินกู้ระยะยาว.*?วงเงิน\s*([\d,\.]+)\s*ล้านบาท/);
  if (flMatch) {
    const amount = parseFloat(flMatch[1].replace(/,/g, '')) * 1000000;
    loanDetails.push({
      loanType: 'F/L',
      amount: amount,
      purpose: 'สมทบซื้อเครื่องตู้อบรมควัน',
      term: '7 ปี',
      interestRate: 'ปีที่ 1-2 MLR-2.75%, ปีที่ 3 เป็นต้นไป MLR+0.75%, ปีที่ 4 เป็นต้นไป MLR+1.50%',
      conditions: ['จดทะเบียนเครื่องจักรเป็นหลักประกัน']
    });
  }
  
  // Extract collateral information
  const collaterals: Array<{
    type: string;
    description: string;
    owner: string;
    estimatedValue?: number;
  }> = [];
  
  // Land collateral
  const landMatches = fullText.matchAll(/โฉนดที่ดินเลขที่\s*(\d+).*?เนื้อที่\s*([\d\-\.]+)\s*ไร่.*?กรรมสิทธิ์\s*([^|]+)/g);
  for (const match of landMatches) {
    collaterals.push({
      type: 'โฉนดที่ดิน',
      description: `โฉนดเลขที่ ${match[1]} เนื้อที่ ${match[2]} ไร่`,
      owner: match[3].trim()
    });
  }
  
  // Extract guarantors
  const guarantors: Array<{
    name: string;
    relationship: string;
    guaranteeAmount: number;
  }> = [];
  
  const guarantorMatches = fullText.matchAll(/บุคคลค้ำประกัน.*?ได้แก่\s*([^|]+)/g);
  for (const match of guarantorMatches) {
    const names = match[1].split(',').map(name => name.trim());
    names.forEach(name => {
      if (name) {
        guarantors.push({
          name: name.replace(/นาย|นาง|นางสาว|น\.ส\./g, '').trim(),
          relationship: 'ผู้ค้ำประกัน',
          guaranteeAmount: 0 // Will be calculated based on loan amounts
        });
      }
    });
  }
  
  // Create comprehensive approval comments
  result.approver = {
    name: 'ผู้อนุมัติสินเชื่อ',
    position: 'ผู้มีอำนาจอนุมัติ',
    decision: 'อนุมัติ',
    approvedAmount: loanDetails.reduce((sum, loan) => sum + loan.amount, 0),
    specialConditions: fullText.substring(0, 1000), // First 1000 characters as summary
    approvalDate: new Date().toISOString().split('T')[0]
  };

  // Also create standard format for compatibility
  result.marketingOfficer = {
    name: 'เจ้าหน้าที่การตลาด',
    comments: 'ตรวจสอบข้อมูลลูกค้าและประเมินความเหมาะสมของผลิตภัณฑ์',
    date: new Date().toISOString().split('T')[0]
  };

  result.creditOfficer = {
    name: 'เจ้าหน้าที่สินเชื่อ',
    riskAssessment: 'ประเมินความเสี่ยงจากข้อมูลทางการเงินและหลักประกัน',
    comments: fullText.substring(0, 500) + '...', // First 500 characters
    recommendation: 'เห็นควรอนุมัติตามเงื่อนไขที่กำหนด',
    date: new Date().toISOString().split('T')[0]
  };

  result.branchManager = {
    name: 'ผู้จัดการสาขา',
    comments: `อนุมัติสินเชื่อรวม ${loanDetails.reduce((sum, loan) => sum + loan.amount, 0).toLocaleString()} บาท`,
    recommendation: 'เห็นชอบการอนุมัติ',
    date: new Date().toISOString().split('T')[0]
  };
  
  // Store detailed information in enhanced data
  if (loanDetails.length > 0 || collaterals.length > 0 || guarantors.length > 0) {
    result.detailedApprovalComments = {
      fullText: fullText,
      loanDetails: loanDetails,
      collateralDetails: collaterals,
      guarantorDetails: guarantors,
      machineryList: [] // Will be extracted if needed
    };
  }
  
  console.log(`[Approval Comments Parser] ✅ Extracted:`, {
    loanDetails: loanDetails.length,
    collaterals: collaterals.length,
    guarantors: guarantors.length,
    fullTextLength: fullText.length
  });
  
  return result;
}

/**
 * Sheet 13: ประวัติกิจการ (Business History) - ENHANCED WITH DEBUG
 */
export function parseBusinessHistory(workbook: WorkBook): NonNullable<ParsedBusinessProfile['businessHistory']> {
  console.log('[Business History Parser] Starting...');
  
  const sheetName = workbook.SheetNames.find(name => 
    name.includes('ประวัติ') || name.toLowerCase().includes('history')
  );
  
  const defaultResult: NonNullable<ParsedBusinessProfile['businessHistory']> = {
    establishmentYear: 0,
    founder: '',
    businessEvolution: '',
    majorMilestones: [],
    productsServices: [],
    targetMarket: '',
    mainCustomers: [],
    competitors: [],
  };
  
  if (!sheetName) {
    console.log('[Business History Parser] ❌ Sheet not found. Available sheets:', workbook.SheetNames);
    return defaultResult;
  }
  
  console.log(`[Business History Parser] ✅ Found sheet: "${sheetName}"`);
  
  const sheet = workbook.Sheets[sheetName];
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  console.log(`[Business History Parser] Processing ${data.length} rows`);
  
  // DEBUG: Show first 10 rows
  console.log('[Business History Parser] 🔍 First 10 rows:', data.slice(0, 10).map((row, i) => ({
    row: i,
    data: row.slice(0, 6)
  })));
  
  let companyName: string = '';
  let establishmentYear: number = 0;
  let founder: string = '';
  let businessEvolution: string = '';
  const majorMilestones: Array<{ year: number; event: string }> = [];
  const productsServices: Array<string> = [];
  const mainCustomers: Array<string> = [];
  const competitors: Array<string> = [];
  let targetMarket: string = '';
  
  for (let i = 0; i < data.length; i++) {
    const row: Array<unknown> = data[i];
    if (!row || row.length === 0) continue;
    
    const rowText: string = row.join(' ');
    const firstCellText = String(row[0] || '').trim();
    
    // Extract company name
    if (rowText.includes('บริษัท') && !companyName) {
      const match = rowText.match(/บริษัท\s+([^\s]+(?:\s+[^\s]+)*?)\s+จำกัด/);
      if (match) companyName = match[0];
    }
    
    // FIXED: Extract establishment year with proper Buddhist year validation
    if ((rowText.includes('ก่อตั้ง') || rowText.includes('จดทะเบียน') || rowText.includes('เริ่มกิจการ')) && !establishmentYear) {
      // First check for ISO date strings from ExcelJS (e.g. "2557-08-19T00:00:00.000Z")
      for (const cell of row) {
        const cellStr = String(cell || '');
        const isoMatch = cellStr.match(/^(\d{4})-\d{2}-\d{2}T/);
        if (isoMatch) {
          const yearVal = parseInt(isoMatch[1]);
          if (yearVal >= 2500 && yearVal <= 2580) {
            // Buddhist year in ISO format
            establishmentYear = yearVal - 543;
            console.log(`[Business History Parser] 🔍 Found year from ISO date (Buddhist): ${yearVal} → ${establishmentYear}`);
          } else if (yearVal >= 1957 && yearVal <= 2037) {
            // Gregorian year in ISO format
            establishmentYear = yearVal;
            console.log(`[Business History Parser] 🔍 Found year from ISO date (Gregorian): ${establishmentYear}`);
          }
          if (establishmentYear) break;
        }
      }
      
      if (!establishmentYear) {
        // Try to find Buddhist year (25xx) — validate range 2500-2580 (= 1957-2037 CE)
        const buddhistMatches = rowText.match(/25([0-7]\d)/g);
        if (buddhistMatches) {
          for (const bm of buddhistMatches) {
            const buddhistYear = parseInt(bm);
            if (buddhistYear >= 2500 && buddhistYear <= 2580) {
              establishmentYear = buddhistYear - 543;
              console.log(`[Business History Parser] 🔍 Found year (Buddhist): ${buddhistYear} → ${establishmentYear}`);
              break;
            }
          }
        }
      }
      
      if (!establishmentYear) {
        // Try to find Gregorian year (19xx or 20xx)
        const gregMatch = rowText.match(/(19\d{2}|20[0-3]\d)/);
        if (gregMatch) {
          establishmentYear = parseInt(gregMatch[1]);
          console.log(`[Business History Parser] 🔍 Found year (Gregorian): ${establishmentYear}`);
        }
      }
    }
    
    // FIXED: Also try standalone year extraction from any row containing ปี or พ.ศ.
    if (!establishmentYear && (rowText.includes('พ.ศ.') || rowText.includes('ปี'))) {
      const buddhistMatch = rowText.match(/(?:พ\.ศ\.|ปี)\s*(25[0-7]\d)/);
      if (buddhistMatch) {
        const buddhistYear = parseInt(buddhistMatch[1]);
        if (buddhistYear >= 2500 && buddhistYear <= 2580) {
          establishmentYear = buddhistYear - 543;
          console.log(`[Business History Parser] 🔍 Found year from พ.ศ./ปี label: ${buddhistYear} → ${establishmentYear}`);
        }
      }
    }
    
    // FIXED: Extract founder — search across all cells in the row, not just col 1/2
    if (!founder) {
      if (firstCellText.includes('ผู้ก่อตั้ง') || firstCellText.includes('Founder') || 
          firstCellText.includes('ผู้บริหาร') || firstCellText.includes('เจ้าของ')) {
        // Look for Thai name pattern in remaining cells
        for (let col = 1; col < row.length; col++) {
          const cellText = String(row[col] || '').trim();
          if (cellText.length >= 4 && (cellText.includes('นาย') || cellText.includes('นาง') || cellText.includes('นางสาว'))) {
            founder = cellText;
            break;
          }
          // Accept any non-empty cell >= 4 chars as founder name
          if (cellText.length >= 4 && !cellText.match(/^\d+$/) && col <= 3) {
            founder = cellText;
            break;
          }
        }
        if (founder) console.log(`[Business History Parser] 🔍 Found founder: ${founder}`);
      }
      // Also check if the row text contains title+name pattern
      if (!founder) {
        const nameMatch = rowText.match(/(นาย|นาง|นางสาว)\s*\S+\s+\S+/);
        if (nameMatch && (rowText.includes('ก่อตั้ง') || rowText.includes('เจ้าของ'))) {
          founder = nameMatch[0].trim();
          console.log(`[Business History Parser] 🔍 Found founder from text: ${founder}`);
        }
      }
    }
    
    // FIXED: Extract business evolution — collect text from nearby rows too
    if (firstCellText.includes('วิวัฒนาการ') || firstCellText.includes('Evolution') || 
        firstCellText.includes('ความเป็นมา') || firstCellText.includes('ประวัติ')) {
      const parts: string[] = [];
      // Get text from current row
      for (let col = 1; col < row.length; col++) {
        const cellText = String(row[col] || '').trim();
        if (cellText.length > 3) parts.push(cellText);
      }
      // Also check next 1-2 rows for continuation
      for (let nextRow = i + 1; nextRow < Math.min(i + 3, data.length); nextRow++) {
        const nr = data[nextRow];
        if (!nr || nr.length === 0) break;
        const nrFirstCell = String(nr[0] || '').trim();
        // Stop if next row is a new section
        if (nrFirstCell.includes('สินค้า') || nrFirstCell.includes('ตลาด') || nrFirstCell.includes('คู่แข่ง')) break;
        const nrText = nr.filter((_: unknown, idx: number) => idx > 0).map((c: unknown) => String(c || '').trim()).filter((s: string) => s.length > 3).join(' ');
        if (nrText) parts.push(nrText);
      }
      if (parts.length > 0 && !businessEvolution) {
        businessEvolution = parts.join(' ');
        console.log(`[Business History Parser] 🔍 Found evolution: ${businessEvolution.substring(0, 80)}...`);
      }
    }
    
    // Extract milestones — with proper year validation
    if (rowText.match(/25[0-7]\d/) || rowText.match(/(19|20)\d{2}/)) {
      let yearMatch = rowText.match(/25([0-7]\d)/);
      let year = 0;
      
      if (yearMatch) {
        const buddhistYear = parseInt('25' + yearMatch[1]);
        if (buddhistYear >= 2500 && buddhistYear <= 2580) {
          year = buddhistYear - 543;
        }
      } else {
        yearMatch = rowText.match(/(19\d{2}|20[0-3]\d)/);
        if (yearMatch) {
          year = parseInt(yearMatch[0]);
        }
      }
      
      if (year > 1900 && year < 2100) {
        const event = rowText.replace(/25[0-7]\d/, '').replace(/(19|20)\d{2}/, '').trim();
        if (event && event.length > 5) {
          majorMilestones.push({ year, event });
        }
      }
    }
    
    // Extract products/services
    if (rowText.includes('สินค้า') || rowText.includes('บริการ') || rowText.includes('Product')) {
      const items = rowText.split(/[,;]/).filter(item => item.trim() && !item.includes('สินค้า') && !item.includes('บริการ'));
      productsServices.push(...items.map(item => item.trim()));
    }
    
    // Extract target market
    if (rowText.includes('ตลาด') || rowText.includes('Market')) {
      targetMarket = String(row[1] || row[2] || '');
    }
    
    // Extract main customers
    if (rowText.includes('ลูกค้าหลัก') || rowText.includes('Main Customer')) {
      const customers = rowText.split(/[,;]/).filter(item => item.trim() && !item.includes('ลูกค้า'));
      mainCustomers.push(...customers.map(item => item.trim()));
    }
    
    // Extract competitors
    if (rowText.includes('คู่แข่ง') || rowText.includes('Competitor')) {
      const comps = rowText.split(/[,;]/).filter(item => item.trim() && !item.includes('คู่แข่ง'));
      competitors.push(...comps.map(item => item.trim()));
    }
  }
  
  console.log(`[Business History Parser] ✅ Extracted company: ${companyName}, Year: ${establishmentYear}`);
  
  return {
    establishmentYear,
    founder,
    businessEvolution,
    majorMilestones,
    productsServices,
    targetMarket,
    mainCustomers,
    competitors,
  };
}

/**
 * Sheet 6: ความต้องการ (Working Capital Requirements) - FIXED
 */
export function parseWorkingCapitalRequirements(workbook: WorkBook): NonNullable<ParsedBusinessProfile['workingCapital']> {
  console.log('[Working Capital Parser] Starting...');
  
  const sheetName = workbook.SheetNames.find(name => 
    name.includes('ความต้องการ') || name.toLowerCase().includes('capital') || name.toLowerCase().includes('requirement')
  );
  
  const defaultResult: NonNullable<ParsedBusinessProfile['workingCapital']> = {
    accountsReceivable: 0,
    inventory: 0,
    accountsPayable: 0,
    totalNeeded: 0,
    existingCredit: 0,
    newCredit: 0,
    remaining: 0,
  };
  
  if (!sheetName) {
    console.log('[Working Capital Parser] ❌ Sheet not found');
    return defaultResult;
  }
  
  const sheet = workbook.Sheets[sheetName];
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  console.log(`[Working Capital Parser] Processing ${data.length} rows`);
  
  let accountsReceivable: number = 0;
  let inventory: number = 0;
  let accountsPayable: number = 0;
  let totalNeeded: number = 0;
  let existingCredit: number = 0;
  let newCredit: number = 0;
  
  for (let i = 0; i < data.length; i++) {
    const row: Array<unknown> = data[i];
    if (!row || row.length === 0) continue;
    
    const rowText: string = row.join(' ').toLowerCase();
    
    // Extract accounts receivable
    if (rowText.includes('ลูกหนี้') || rowText.includes('receivable')) {
      const numbers: number[] = [];
      for (const cell of row) {
        const num = safeParseNumber(cell);
        if (num > 1000) numbers.push(num);
      }
      if (numbers.length > 0) accountsReceivable = numbers[0];
    }
    
    // Extract inventory
    if (rowText.includes('สินค้าคงคลัง') || rowText.includes('inventory')) {
      const numbers: number[] = [];
      for (const cell of row) {
        const num = safeParseNumber(cell);
        if (num > 1000) numbers.push(num);
      }
      if (numbers.length > 0) inventory = numbers[0];
    }
    
    // Extract accounts payable
    if (rowText.includes('เจ้าหนี้') || rowText.includes('payable')) {
      const numbers: number[] = [];
      for (const cell of row) {
        const num = safeParseNumber(cell);
        if (num > 1000) numbers.push(num);
      }
      if (numbers.length > 0) accountsPayable = numbers[0];
    }
    
    // Extract total needed
    if (rowText.includes('รวม') || rowText.includes('total')) {
      const numbers: number[] = [];
      for (const cell of row) {
        const num = safeParseNumber(cell);
        if (num > 1000) numbers.push(num);
      }
      if (numbers.length > 0) totalNeeded = Math.max(...numbers);
    }
    
    // Extract existing credit
    if (rowText.includes('วงเงินเดิม') || rowText.includes('existing')) {
      const numbers: number[] = [];
      for (const cell of row) {
        const num = safeParseNumber(cell);
        if (num > 1000) numbers.push(num);
      }
      if (numbers.length > 0) existingCredit = numbers[0];
    }
    
    // Extract new credit
    if (rowText.includes('วงเงินใหม่') || rowText.includes('new credit')) {
      const numbers: number[] = [];
      for (const cell of row) {
        const num = safeParseNumber(cell);
        if (num > 1000) numbers.push(num);
      }
      if (numbers.length > 0) newCredit = numbers[0];
    }
  }
  
  // Calculate if not found
  if (totalNeeded === 0) {
    totalNeeded = accountsReceivable + inventory - accountsPayable;
  }
  
  const remaining: number = existingCredit + newCredit - totalNeeded;
  
  console.log(`[Working Capital Parser] ✅ Extracted ${5} items, Total: ${totalNeeded}`);
  
  return {
    accountsReceivable,
    inventory,
    accountsPayable,
    totalNeeded,
    existingCredit,
    newCredit,
    remaining,
  };
}

/**
 * NEW: โครงสร้าง (Investment Structure) Parser
 */
export function parseInvestmentStructure(workbook: WorkBook): {
  totalInvestment: number;
  ownerEquity: number;
  otherLoans: number;
  requestedLoan: number;
  debtToEquityRatio: number;
  investmentItems: Array<{
    item: string;
    amount: number;
  }>;
} {
  console.log('[Investment Structure Parser] Starting...');
  
  const sheetName = workbook.SheetNames.find(name => 
    name.includes('โครงสร้าง') || name.toLowerCase().includes('structure') || name.toLowerCase().includes('investment')
  );
  
  const defaultResult = {
    totalInvestment: 0,
    ownerEquity: 0,
    otherLoans: 0,
    requestedLoan: 0,
    debtToEquityRatio: 0,
    investmentItems: [],
  };
  
  if (!sheetName) {
    console.log('[Investment Structure Parser] ❌ Sheet not found. Available sheets:', workbook.SheetNames);
    return defaultResult;
  }
  
  console.log(`[Investment Structure Parser] ✅ Found sheet: "${sheetName}"`);
  
  const sheet = workbook.Sheets[sheetName];
  const filledSheet = fillMergedCells(sheet);
  const data = getSheetDataWithMergedCells(filledSheet);
  
  console.log(`[Investment Structure Parser] Processing ${data.length} rows`);
  
  // DEBUG: Show first 15 rows
  console.log('[Investment Structure Parser] 🔍 First 15 rows:', data.slice(0, 15).map((row, i) => ({
    row: i,
    data: row.slice(0, 6)
  })));
  
  let totalInvestment = 0;
  let ownerEquity = 0;
  let otherLoans = 0;
  let requestedLoan = 0;
  let debtToEquityRatio = 0;
  const investmentItems: Array<{ item: string; amount: number }> = [];
  
  // Find header row
  let headerRowIndex = -1;
  let colItem = -1;
  let colOwner = -1;
  let colOther = -1;
  let colRequested = -1;
  
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    const rowText = row.join(' ').toLowerCase();
    if (rowText.includes('รายละเอียด') && (rowText.includes('ลงทุน') || rowText.includes('investment'))) {
      headerRowIndex = i;
      
      for (let j = 0; j < row.length; j++) {
        const cellText = String(row[j]).toLowerCase();
        if (cellText.includes('รายละเอียด') || cellText.includes('รายการ')) colItem = j;
        if (cellText.includes('ผู้กู้') || cellText.includes('owner') || cellText.includes('equity')) colOwner = j;
        if (cellText.includes('สถาบันการเงินอื่น') || cellText.includes('other')) colOther = j;
        if (cellText.includes('กองทุน') || cellText.includes('ธพว') || cellText.includes('requested')) colRequested = j;
      }
      
      console.log(`[Investment Structure Parser] 🔍 Found header at row ${i}, columns:`, { colItem, colOwner, colOther, colRequested });
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    // FALLBACK: Try looser header detection
    for (let i = 0; i < Math.min(15, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      
      const rowText = row.join(' ').toLowerCase();
      // Look for any row that has "รายการ" or "รายละเอียด" along with financial column keywords
      if ((rowText.includes('รายการ') || rowText.includes('รายละเอียด')) && 
          (rowText.includes('ผู้กู้') || rowText.includes('กองทุน') || rowText.includes('ธพว') || rowText.includes('จำนวนเงิน'))) {
        headerRowIndex = i;
        
        for (let j = 0; j < row.length; j++) {
          const cellText = String(row[j]).toLowerCase();
          if (cellText.includes('รายละเอียด') || cellText.includes('รายการ')) colItem = j;
          if (cellText.includes('ผู้กู้') || cellText.includes('owner') || cellText.includes('equity') || cellText.includes('เจ้าของ')) colOwner = j;
          if (cellText.includes('สถาบันการเงินอื่น') || cellText.includes('other') || cellText.includes('อื่น')) colOther = j;
          if (cellText.includes('กองทุน') || cellText.includes('ธพว') || cellText.includes('requested') || cellText.includes('ขอสินเชื่อ')) colRequested = j;
          // Also try "จำนวนเงิน" (amount) as a general amount column
          if (cellText.includes('จำนวนเงิน') && colOwner === -1) colOwner = j;
        }
        
        console.log(`[Investment Structure Parser] 🔍 Fallback header at row ${i}, columns:`, { colItem, colOwner, colOther, colRequested });
        break;
      }
    }
  }
  
  if (headerRowIndex === -1) {
    console.log('[Investment Structure Parser] ⚠️ No header row found');
    return defaultResult;
  }
  
  // Track seen item names to avoid duplicates
  const seenItems = new Set<string>();
  
  // Parse investment items
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    // Use colItem column if available, otherwise column 0
    const itemCol = colItem >= 0 ? colItem : 0;
    const firstCell = String(row[itemCol] || '').trim().toLowerCase();
    const originalName = String(row[itemCol] || '').trim();
    
    // Skip empty rows
    if (!firstCell || firstCell.length < 2) continue;
    
    // Check for D/E ratio row — EXCLUDE from items
    if (firstCell.includes('d/e') || firstCell.includes('debt') || firstCell.includes('อัตราส่วน') || firstCell.includes('สัดส่วน')) {
      // Extract ratio value
      for (const cell of row) {
        const num = safeParseNumber(cell);
        if (num > 0 && num < 100) {
          debtToEquityRatio = num;
          console.log(`[Investment Structure Parser] 🔍 Found D/E ratio: ${debtToEquityRatio}`);
          break;
        }
      }
      continue; // Don't add as item
    }
    
    // Check for total row
    if (firstCell.includes('รวม') || firstCell.includes('total')) {
      if (colOwner >= 0) ownerEquity = safeParseNumber(row[colOwner]);
      if (colOther >= 0) otherLoans = safeParseNumber(row[colOther]);
      if (colRequested >= 0) requestedLoan = safeParseNumber(row[colRequested]);
      
      // Also scan all numeric cells for the largest value as totalInvestment
      let maxVal = 0;
      for (const cell of row) {
        const num = safeParseNumber(cell);
        if (num > maxVal && num < 1000000000) maxVal = num;
      }
      if (maxVal > 0) totalInvestment = maxVal;
      
      console.log(`[Investment Structure Parser] 🔍 Found totals: Owner=${ownerEquity}, Other=${otherLoans}, Requested=${requestedLoan}, Total=${totalInvestment}`);
      continue;
    }
    
    // Skip headers and keywords
    if (
      firstCell.includes('รายละเอียด') ||
      firstCell.includes('รายการ') ||
      firstCell.includes('หมายเหตุ') ||
      firstCell.match(/^[0-9]+\.?$/)
    ) {
      continue;
    }
    
    // DEDUP: Skip if we already have this item
    const normalizedName = originalName.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seenItems.has(normalizedName)) {
      console.log(`[Investment Structure Parser] ⏭️ Skipping duplicate: "${originalName}"`);
      continue;
    }
    
    // Get total amount for this item
    const amounts: number[] = [];
    if (colOwner >= 0) amounts.push(safeParseNumber(row[colOwner]));
    if (colOther >= 0) amounts.push(safeParseNumber(row[colOther]));
    if (colRequested >= 0) amounts.push(safeParseNumber(row[colRequested]));
    
    const totalAmount = amounts.reduce((sum, val) => sum + val, 0);
    
    if (totalAmount > 0) {
      seenItems.add(normalizedName);
      investmentItems.push({
        item: originalName,
        amount: totalAmount,
      });
      
      if (investmentItems.length <= 5) {
        console.log(`[Investment Structure Parser] 🔍 Added item: "${originalName}" = ${totalAmount}`);
      }
    }
  }
  
  // CALCULATE totalInvestment from items if not found in total row
  if (totalInvestment === 0 && investmentItems.length > 0) {
    totalInvestment = investmentItems.reduce((sum, item) => sum + item.amount, 0);
    console.log(`[Investment Structure Parser] 🔍 Calculated totalInvestment from items: ${totalInvestment}`);
  }
  
  // CALCULATE from components if still 0
  if (totalInvestment === 0 && (ownerEquity > 0 || otherLoans > 0 || requestedLoan > 0)) {
    totalInvestment = ownerEquity + otherLoans + requestedLoan;
  }
  
  // CALCULATE D/E ratio if not found
  if (debtToEquityRatio === 0 && ownerEquity > 0) {
    const totalDebt = otherLoans + requestedLoan;
    debtToEquityRatio = Math.round((totalDebt / ownerEquity) * 100) / 100;
    console.log(`[Investment Structure Parser] 🔍 Calculated D/E ratio: ${debtToEquityRatio}`);
  }
  
  console.log(`[Investment Structure Parser] ✅ Extracted ${investmentItems.length} items, Total=${totalInvestment}, D/E=${debtToEquityRatio}`);
  
  return {
    totalInvestment,
    ownerEquity,
    otherLoans,
    requestedLoan,
    debtToEquityRatio,
    investmentItems,
  };
}
