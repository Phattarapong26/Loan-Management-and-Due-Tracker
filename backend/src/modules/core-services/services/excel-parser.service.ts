import { readExcelFile, WorkBook, WorkSheet, getSheetData } from '@core/utils/exceljs-adapter';

/**
 * Deterministic Excel Parser Service
 * Fast, accurate parsing without AI for structured documents
 * Migrated to ExcelJS for security (no Prototype Pollution/ReDoS)
 */

export interface ParsedExcelData {
    companyName: string;
    loanSummary?: {
        projectName?: string;
        type?: string;
        amount?: number;
        interestRate?: string;
        term?: string;
        collaterals?: string[];
        guarantors?: string[];
    };
    vatReport?: {
        period?: string;
        totalSales?: number;
        totalPurchases?: number;
        averageMonthlySales?: number;
        annualSales?: number;
        records?: Array<{
            month: string;
            salesAmount: number;
            salesTax: number;
            purchaseAmount: number;
            purchaseTax: number;
            taxPayable: number;
        }>;
    };
    financialStatement?: {
        years?: Array<{
            year: string;
            revenue?: number;
            grossProfit?: number;
            netProfit?: number;
            totalAssets?: number;
            totalLiabilities?: number;
            equity?: number;
        }>;
    };
    creditBureau?: {
        borrower?: {
            name: string;
            checkDate: string;
            accounts: Array<{
                bank: string;
                type: string;
                limit: number;
                outstanding: number;
                payment: number;
                status: string;
            }>;
            totalLimit: number;
            totalOutstanding: number;
            totalPayment: number;
        };
        guarantors?: Array<{
            name: string;
            checkDate: string;
            accounts: Array<{
                bank: string;
                type: string;
                limit: number;
                outstanding: number;
                payment: number;
                status: string;
            }>;
            totalLimit: number;
            totalOutstanding: number;
            totalPayment: number;
        }>;
    };
    bankStatements?: Array<{
        month: string;
        withdrawCount: number;
        withdrawAmount: number;
        depositCount: number;
        depositAmount: number;
        balance: number;
    }>;
    shareholders?: Array<{
        name: string;
        percentage: number;
        amount: number;
        hasAuthority: boolean;
    }>;
    investmentStructure?: {
        totalInvestment?: number;
        debtToEquityRatio?: number;
        items?: Array<{ name: string; ownCapital?: number; bankLoan?: number; fundLoan?: number; smeBank?: number; total?: number }>;
        notes?: string[];
    };
    workingCapitalAnalysis?: {
        totalNeeded?: number;
        additionalNeeded?: number;
        receivables?: { percentage?: number; days?: number; amount?: number };
        stock?: number;
        payables?: { percentage?: number; days?: number; amount?: number };
        existingCredit?: number;
        notes?: string[];
    };
    projections?: {
        headers?: string[];
        revenue?: number[];
        costOfSales?: number[];
        grossProfit?: number[];
        adminExpenses?: number[];
        sellingExpenses?: number[];
        ebitda?: number[];
        netProfit?: number[];
        dscr?: number[];
        debtRepayment?: number[];
        notes?: string[];
    };
    balanceSheet?: {
        years?: Array<{
            year: string;
            currentAssets?: number;
            nonCurrentAssets?: number;
            totalAssets?: number;
            currentLiabilities?: number;
            nonCurrentLiabilities?: number;
            totalLiabilities?: number;
            registeredCapital?: number;
            retainedEarnings?: number;
            totalEquity?: number;
        }>;
    };
    bankStatementAccounts?: Array<{
        bankName: string;
        accountName?: string;
        accountNumber?: string;
        accountType?: string;
        creditLimit?: number;
        months: Array<{
            month: string;
            withdrawCount?: number;
            withdrawAmount?: number;
            depositCount?: number;
            depositAmount?: number;
            balance?: number;
        }>;
        summary?: { avgWithdraw?: number; avgDeposit?: number; avgBalance?: number };
    }>;
    comments?: string[];
    businessHistory?: {
        executives?: Array<{
            name: string;
            birthDate?: string;
            age?: string;
            education?: string;
            experience?: string[];
            idNumber?: string;
            address?: string;
        }>;
        companyInfo?: { name?: string; registrationDate?: string; capital?: string; address?: string };
        shareholding?: Array<{ name: string; shares?: number; percentage?: number; role?: string }>;
    };
    products?: string[];

    // Metadata
    sheetCount: number;
    sheetNames: string[];
    documentType: 'LOAN_APPLICATION' | 'FINANCIAL' | 'TAX_DOC' | 'BANK_STATEMENT' | 'CREDIT_BUREAU' | 'OTHER';
    confidenceScore: number;
    warnings: string[];
}

export class ExcelParserService {
    /**
     * Parse Excel file with deterministic approach
     */
    async parseExcel(fileBuffer: Buffer): Promise<ParsedExcelData> {
        const workbook = await readExcelFile(fileBuffer);
        const sheetNames = workbook.SheetNames;
        const sheetCount = sheetNames.length;

        console.log(`[Excel Parser] Detected ${sheetCount} sheets:`, sheetNames);

        // Auto-detect document type
        const documentType = this.detectDocumentType(sheetNames, sheetCount);
        console.log(`[Excel Parser] Document type: ${documentType}`);

        // Parse based on document type
        let parsedData: ParsedExcelData;

        switch (documentType) {
            case 'LOAN_APPLICATION':
                parsedData = this.parseLoanApplication(workbook);
                break;
            case 'TAX_DOC':
                parsedData = this.parseTaxDocument(workbook);
                break;
            case 'BANK_STATEMENT':
                parsedData = this.parseBankStatement(workbook);
                break;
            case 'CREDIT_BUREAU':
                parsedData = this.parseCreditBureau(workbook);
                break;
            case 'FINANCIAL':
                parsedData = this.parseFinancialStatement(workbook);
                break;
            default:
                parsedData = this.parseGeneric(workbook);
        }

        // Add metadata
        parsedData.sheetCount = sheetCount;
        parsedData.sheetNames = sheetNames;
        parsedData.documentType = documentType;

        // Calculate confidence score
        parsedData.confidenceScore = this.calculateConfidence(parsedData);

        console.log(`[Excel Parser] Parsing complete. Confidence: ${parsedData.confidenceScore}%`);

        return parsedData;
    }

    /**
     * Detect document type based on sheet names and count
     */
    private detectDocumentType(sheetNames: string[], sheetCount: number): ParsedExcelData['documentType'] {
        const lowerNames = sheetNames.map(n => n.toLowerCase());

        // 10+ sheets = Loan Application
        if (sheetCount >= 10) {
            return 'LOAN_APPLICATION';
        }

        // Check for specific keywords
        if (lowerNames.some(n => n.includes('ภพ') || n.includes('vat') || n.includes('ภาษี'))) {
            return 'TAX_DOC';
        }

        if (lowerNames.some(n => n.includes('statement') || n.includes('บัญชี'))) {
            return 'BANK_STATEMENT';
        }

        if (lowerNames.some(n => n.includes('เครดิต') || n.includes('credit') || n.includes('bureau'))) {
            return 'CREDIT_BUREAU';
        }

        if (lowerNames.some(n => n.includes('งบการเงิน') || n.includes('financial') || n.includes('balance'))) {
            return 'FINANCIAL';
        }

        return 'OTHER';
    }

    /**
     * Find sheet by name keyword (case-insensitive, partial match)
     */
    private findSheet(workbook: WorkBook, ...keywords: string[]): WorkSheet | undefined {
        for (const keyword of keywords) {
            const name = workbook.SheetNames.find(n => n.includes(keyword));
            if (name) return workbook.Sheets[name];
        }
        return undefined;
    }

    /**
     * Parse multi-sheet Loan Application using NAME-BASED sheet lookup
     */
    private parseLoanApplication(workbook: WorkBook): ParsedExcelData {
        const result: ParsedExcelData = {
            companyName: '',
            sheetCount: 0,
            sheetNames: [],
            documentType: 'LOAN_APPLICATION',
            confidenceScore: 0,
            warnings: [],
        };

        // Find company name from first sheet or detail sheet
        const detailSheet = this.findSheet(workbook, 'รายละเอียด') || (workbook.SheetNames[0] ? workbook.Sheets[workbook.SheetNames[0]] : undefined);
        if (detailSheet) {
            result.companyName = this.findCompanyName(detailSheet);
            result.shareholders = this.parseShareholders(detailSheet);
        }

        // Tab: ใบสรุปวงเงิน → Loan Summary
        const loanSheet = this.findSheet(workbook, 'ใบสรุปวงเงิน', 'สรุปวงเงิน');
        if (loanSheet) result.loanSummary = this.parseLoanSummary(loanSheet);

        // Tab: ภพ 30 → VAT Report
        const vatSheet = this.findSheet(workbook, 'ภพ 30', 'ภพ30', 'ภพ.');
        if (vatSheet) result.vatReport = this.parseVATReport(vatSheet);

        // Tab: โครงสร้าง → Investment Structure
        const structSheet = this.findSheet(workbook, 'โครงสร้าง');
        if (structSheet) result.investmentStructure = this.parseInvestmentStructure(structSheet);

        // Tab: งบการเงิน → Financial Statement (P&L + Balance Sheet)
        const finSheet = this.findSheet(workbook, 'งบการเงิน');
        if (finSheet) {
            result.financialStatement = this.parseFinancialStatements([finSheet]);
            result.balanceSheet = this.parseBalanceSheet(finSheet);
        }

        // Tab: ความต้องการ → Working Capital
        const wcSheet = this.findSheet(workbook, 'ความต้องการ');
        if (wcSheet) result.workingCapitalAnalysis = this.parseWorkingCapital(wcSheet);

        // Tab: ประมาณการ → Projections
        const projSheet = this.findSheet(workbook, 'ประมาณการ');
        if (projSheet) result.projections = this.parseProjections(projSheet);

        // Tab: เครดิตบูโร → Credit Bureau
        const cbSheet = this.findSheet(workbook, 'เครดิตบูโร', 'เครดิต');
        if (cbSheet) result.creditBureau = this.parseCreditBureauSheets([cbSheet]);

        // Tab: Statement → Bank Statement
        const stmtSheet = this.findSheet(workbook, 'Statement', 'statement');
        if (stmtSheet) {
            result.bankStatements = this.parseBankStatementSheet(stmtSheet);
            result.bankStatementAccounts = this.parseBankStatementAccounts(stmtSheet);
        }

        // Tab: ความเห็น → Comments
        const commentSheet = this.findSheet(workbook, 'ความเห็น');
        if (commentSheet) result.comments = this.parseComments(commentSheet);

        // Tab: ประวัติกิจการ → Business History
        const histSheet = this.findSheet(workbook, 'ประวัติกิจการ', 'ประวัติ');
        if (histSheet) result.businessHistory = this.parseBusinessHistory(histSheet);

        // Tab: ภพ 30 → Products list
        if (vatSheet) result.products = this.parseProducts(vatSheet);

        return result;
    }

    /**
     * Parse Tax Document (ภ.พ.30)
     */
    private parseTaxDocument(workbook: WorkBook): ParsedExcelData {
        const result: ParsedExcelData = {
            companyName: '',
            sheetCount: 0,
            sheetNames: [],
            documentType: 'TAX_DOC',
            confidenceScore: 0,
            warnings: [],
        };

        const name = workbook.SheetNames[0];
        const sheet = name ? workbook.Sheets[name] : undefined;
        if (sheet) {
            result.companyName = this.findCompanyName(sheet);
            result.vatReport = this.parseVATReport(sheet);
        }

        return result;
    }

    /**
     * Parse Bank Statement
     */
    private parseBankStatement(workbook: WorkBook): ParsedExcelData {
        const result: ParsedExcelData = {
            companyName: '',
            sheetCount: 0,
            sheetNames: [],
            documentType: 'BANK_STATEMENT',
            confidenceScore: 0,
            warnings: [],
        };

        const name = workbook.SheetNames[0];
        const sheet = name ? workbook.Sheets[name] : undefined;
        if (sheet) {
            result.companyName = this.findCompanyName(sheet);
            result.bankStatements = this.parseBankStatementSheet(sheet);
        }

        return result;
    }

    /**
     * Parse Credit Bureau
     */
    private parseCreditBureau(workbook: WorkBook): ParsedExcelData {
        const result: ParsedExcelData = {
            companyName: '',
            sheetCount: 0,
            sheetNames: [],
            documentType: 'CREDIT_BUREAU',
            confidenceScore: 0,
            warnings: [],
        };

        const sheets = workbook.SheetNames.map(name => workbook.Sheets[name]);
        result.creditBureau = this.parseCreditBureauSheets(sheets);

        return result;
    }

    /**
     * Parse Financial Statement
     */
    private parseFinancialStatement(workbook: WorkBook): ParsedExcelData {
        const result: ParsedExcelData = {
            companyName: '',
            sheetCount: 0,
            sheetNames: [],
            documentType: 'FINANCIAL',
            confidenceScore: 0,
            warnings: [],
        };

        const sheets = workbook.SheetNames.map(name => workbook.Sheets[name]);
        const firstSheet = sheets[0];
        if (firstSheet) {
            result.companyName = this.findCompanyName(firstSheet);
        }
        result.financialStatement = this.parseFinancialStatements(sheets);

        return result;
    }

    /**
     * Parse generic Excel
     */
    private parseGeneric(workbook: WorkBook): ParsedExcelData {
        const result: ParsedExcelData = {
            companyName: '',
            sheetCount: 0,
            sheetNames: [],
            documentType: 'OTHER',
            confidenceScore: 0,
            warnings: ['ไม่สามารถระบุประเภทเอกสารได้ กรุณาตรวจสอบ'],
        };

        // Try to find company name from first sheet
        const name = workbook.SheetNames[0];
        const sheet = name ? workbook.Sheets[name] : undefined;
        if (sheet) {
            result.companyName = this.findCompanyName(sheet);
        }

        return result;
    }

    // ===== HELPER METHODS =====

    private getCellValue(sheet: WorkSheet, cell: string): string {
        // Parse cell address (e.g., "A1" -> row 0, col 0)
        const match = cell.match(/^([A-Z]+)(\d+)$/);
        if (!match || !match[1] || !match[2]) return '';
        
        const col = match[1].charCodeAt(0) - 65; // A=0, B=1, etc.
        const row = parseInt(match[2], 10) - 1; // 1-indexed to 0-indexed
        
        const value = sheet.data[row]?.[col];
        return value ? String(value) : '';
    }

    private findCellByKeyword(sheet: WorkSheet, keyword: string): string | null {
        for (let r = 0; r < sheet.rowCount; r++) {
            for (let c = 0; c < sheet.columnCount; c++) {
                const val = String(sheet.data[r]?.[c] || '');
                if (val.includes(keyword)) {
                    // Convert to Excel address (e.g., A1)
                    const colLetter = String.fromCharCode(65 + c);
                    return `${colLetter}${r + 1}`;
                }
            }
        }
        return null;
    }

    private getSheetData(sheet: WorkSheet): any[][] {
        return getSheetData(sheet) as any[][];
    }

    private findCompanyName(sheet: WorkSheet): string {
        const keywords = ['บริษัท', 'บจก', 'หจก', 'ห้างหุ้นส่วน'];

        for (const keyword of keywords) {
            const cell = this.findCellByKeyword(sheet, keyword);
            if (cell) {
                const value = this.getCellValue(sheet, cell);
                // Extract company name
                const match = value.match(/(บริษัท|บจก\.|หจก\.)[\s]*([^\s|]+)/);
                if (match) return match[0];
            }
        }

        return 'Unknown';
    }

    private parseShareholders(sheet: WorkSheet): Array<{ name: string; percentage: number; amount: number; hasAuthority: boolean }> {
        const shareholders: Array<{ name: string; percentage: number; amount: number; hasAuthority: boolean }> = [];
        const data = this.getSheetData(sheet);

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row) continue;
            const joined = row.join(' ');

            if (joined.includes('ผู้ถือหุ้น') || joined.includes('สัดส่วน')) {
                // Parse next rows
                for (let j = i + 1; j < Math.min(i + 10, data.length); j++) {
                    const sRow = data[j];
                    if (!sRow) continue;
                    const sJoined = sRow.join(' ');

                    if (sJoined.includes('รวม')) break;

                    const nameMatch = sJoined.match(/(น\.ส\.|นาย|นาง|นางสาว)[^\d]+/);
                    const pctMatch = sJoined.match(/(\d+)%/);

                    if (nameMatch && pctMatch) {
                        shareholders.push({
                            name: nameMatch[0].trim(),
                            percentage: parseInt(pctMatch[1] || '0'),
                            amount: 0,
                            hasAuthority: sJoined.includes('P') || sJoined.includes('ลงลายมือชื่อ'),
                        });
                    }
                }
                break;
            }
        }

        return shareholders;
    }

    private parseLoanSummary(sheet: WorkSheet): ParsedExcelData['loanSummary'] {
        const data = this.getSheetData(sheet);
        const summary: ParsedExcelData['loanSummary'] = {};

        for (const row of data) {
            const joined = row.join(' ');

            if (joined.includes('โครงการ')) {
                summary.projectName = joined;
            }
            if (joined.includes('วงเงิน')) {
                const match = joined.match(/(\d[\d,]+)/);
                if (match && match[1]) summary.amount = parseFloat(match[1].replace(/,/g, ''));
            }
            if (joined.includes('อัตราดอกเบี้ย')) {
                summary.interestRate = joined;
            }
            if (joined.includes('ระยะเวลา')) {
                summary.term = joined;
            }
        }

        return summary;
    }

    private parseFinancialStatements(sheets: (WorkSheet | undefined)[]): ParsedExcelData['financialStatement'] {
        const years: Array<{
            year: string;
            revenue?: number;
            grossProfit?: number;
            netProfit?: number;
            totalAssets?: number;
            totalLiabilities?: number;
            equity?: number;
        }> = [];

        for (const sheet of sheets) {
            if (!sheet) continue;
            const data = this.getSheetData(sheet);

            // Find year and financial data
            for (const row of data) {
                const joined = row.join(' ');

                if (joined.includes('รายได้') || joined.includes('ยอดขาย')) {
                    const match = joined.match(/(\d[\d,]+)/);
                    if (match && match[1] && years.length === 0) {
                        years.push({
                            year: new Date().getFullYear().toString(),
                            revenue: parseFloat(match[1].replace(/,/g, '')),
                        });
                    }
                }
            }
        }

        return { years };
    }

    private parseVATReport(sheet: WorkSheet): ParsedExcelData['vatReport'] {
        const data = this.getSheetData(sheet);
        const records: ParsedExcelData['vatReport'] extends undefined ? never : NonNullable<ParsedExcelData['vatReport']>['records'] = [];

        let totalSales = 0;
        let totalPurchases = 0;
        let avgMonthlySales = 0;
        let annualSales = 0;

        // Find the main ภ.พ.30 table with full data (sales, tax, purchases)
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row) continue;
            const joined = row.join(' ');

            // Detect ภ.พ.30 header row
            if (joined.includes('ยอดขาย') && joined.includes('ภาษีขาย') && joined.includes('ยอดซื้อ')) {
                // Parse subsequent data rows
                for (let j = i + 1; j < data.length; j++) {
                    const dRow = data[j];
                    if (!dRow) continue;
                    const dJoined = dRow.join(' ');
                    if (dJoined.includes('รวม') || dJoined.includes('รายได้เฉลี่ย')) {
                        // Extract totals from the 'รวม' row
                        if (dJoined.includes('รวม')) {
                            const nums = dRow.filter((c): c is number => typeof c === 'number' && c > 100);
                            if (nums.length >= 2) {
                                totalSales = nums[0] || 0;
                                totalPurchases = nums[1] || 0;
                            }
                        }
                        if (dJoined.includes('รายได้เฉลี่ย/เดือน')) {
                            const nums = dRow.filter((c): c is number => typeof c === 'number' && c > 100);
                            avgMonthlySales = nums[0] || 0;
                        }
                        if (dJoined.includes('รายได้ต่อปี')) {
                            const nums = dRow.filter((c): c is number => typeof c === 'number' && c > 100);
                            annualSales = nums[0] || 0;
                            break;
                        }
                        continue;
                    }
                    // Parse monthly record
                    const nums = dRow.filter((c): c is number => typeof c === 'number');
                    if (nums.length >= 3 && nums[0]! > 200000) { // serial date > 200000 = Thai Buddhist date
                        records!.push({
                            month: String(nums[0]),
                            salesAmount: nums[1] || 0,
                            salesTax: nums[2] || 0,
                            purchaseAmount: nums[3] || 0,
                            purchaseTax: nums[4] || 0,
                            taxPayable: nums[5] || 0,
                        });
                    }
                }
                break;
            }
        }

        // Fallback: if no ภ.พ.30 table found, look for simpler tables
        if (records!.length === 0) {
            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                if (!row) continue;
                const joined = row.join(' ');
                if (joined.includes('ลำดับ') && joined.includes('เดือน') && joined.includes('ยอดขาย')) {
                    for (let j = i + 1; j < data.length; j++) {
                        const dRow = data[j];
                        if (!dRow) continue;
                        const dJoined = dRow.join(' ');
                        if (dJoined.includes('รวม')) {
                            const nums = dRow.filter((c): c is number => typeof c === 'number' && c > 1000);
                            totalSales = nums[0] || totalSales;
                            break;
                        }
                        const nums = dRow.filter((c): c is number => typeof c === 'number');
                        if (nums.length >= 2) {
                            records!.push({
                                month: String(nums[1]),
                                salesAmount: nums[2] || 0,
                                salesTax: 0, purchaseAmount: 0, purchaseTax: 0, taxPayable: 0,
                            });
                        }
                    }
                    break;
                }
            }
        }

        // Extract average/annual from 'รายได้เฉลี่ย' rows if not found
        if (!avgMonthlySales && records!.length > 0) {
            avgMonthlySales = totalSales / records!.length;
        }
        if (!annualSales) {
            annualSales = totalSales;
        }

        return { totalSales, totalPurchases, averageMonthlySales: avgMonthlySales, annualSales, records: records! };
    }

    /**
     * Parse products list from ภพ 30 sheet
     */
    private parseProducts(sheet: WorkSheet): string[] {
        const data = this.getSheetData(sheet);
        const products: string[] = [];
        let inProductSection = false;

        for (const row of data) {
            const joined = row.join(' ');
            if (joined.includes('ผลิตภัณฑ์ที่ผลิต') || joined.includes('สินค้า')) {
                inProductSection = true;
                continue;
            }
            if (inProductSection) {
                const strCols = row.filter((c): c is string => typeof c === 'string' && c.trim().length > 1 && !c.includes('ลำดับ') && !c.includes('ราคา'));
                if (strCols.length > 0) {
                    products.push(...strCols);
                } else if (products.length > 0) {
                    // Check if we hit empty product rows
                    const hasData = row.filter(c => c !== '').length;
                    if (hasData <= 1) break;
                }
            }
        }
        return products;
    }

    private parseCreditBureauSheets(sheets: (WorkSheet | undefined)[]): ParsedExcelData['creditBureau'] {
        const result: NonNullable<ParsedExcelData['creditBureau']> = { borrower: { name: '', checkDate: '', accounts: [], totalLimit: 0, totalOutstanding: 0, totalPayment: 0 } };
        const guarantors: NonNullable<ParsedExcelData['creditBureau']>['guarantors'] = [];

        for (const sheet of sheets) {
            if (!sheet) continue;
            const data = this.getSheetData(sheet);
            let currentSection: 'borrower' | 'guarantor' | null = null;
            let currentGuarantor: typeof guarantors extends (infer T)[] ? T : never = { name: '', checkDate: '', accounts: [], totalLimit: 0, totalOutstanding: 0, totalPayment: 0 };

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                if (!row) continue;
                const joined = row.join(' ');

                // Detect section headers
                if (joined.includes('ในนามผู้กู้')) {
                    currentSection = 'borrower';
                    const nameMatch = joined.match(/(บริษัท|บจก\.|หจก\.)[^\s][\u0E00-\u0E7F\s]+/);
                    if (nameMatch && result.borrower) result.borrower.name = nameMatch[0].trim();
                    const dateNums = row.filter((c): c is number => typeof c === 'number' && c > 240000);
                    if (dateNums[0] && result.borrower) result.borrower.checkDate = String(dateNums[0]);
                    continue;
                }
                if (joined.includes('ในนามกรรมการ') || joined.includes('ผู้ค้ำประกัน')) {
                    currentSection = 'guarantor';
                    currentGuarantor = { name: '', checkDate: '', accounts: [], totalLimit: 0, totalOutstanding: 0, totalPayment: 0 };
                    const nameMatch = joined.match(/(นาย|น\.ส\.|นาง|นางสาว)[\u0E00-\u0E7F\s]+/);
                    if (nameMatch) currentGuarantor.name = nameMatch[0].trim();
                    const dateNums = row.filter((c): c is number => typeof c === 'number' && c > 240000);
                    if (dateNums[0]) currentGuarantor.checkDate = String(dateNums[0]);
                    guarantors!.push(currentGuarantor);
                    continue;
                }

                // Parse account rows (starts with a number index)
                const nums = row.filter((c): c is number => typeof c === 'number');
                const strs = row.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
                if (nums.length >= 3 && strs.length >= 2 && typeof row[0] === 'number' && row[0] <= 50) {
                    const account = {
                        bank: strs[0] || '',
                        type: strs[1] || '',
                        limit: nums[1] || 0,
                        outstanding: nums[2] || 0,
                        payment: nums[3] || 0,
                        status: strs.find(s => s.includes('ปกติ') || s.includes('ค้างชำระ') || s.includes('ปิดบัญชี')) || 'ปกติ',
                    };
                    if (currentSection === 'borrower' && result.borrower) {
                        result.borrower.accounts.push(account);
                    } else if (currentSection === 'guarantor' && currentGuarantor) {
                        currentGuarantor.accounts.push(account);
                    }
                }

                // Parse totals
                if (joined.includes('รวม') && !joined.includes('รวมทั้งหมด') && nums.length >= 2) {
                    const bigNums = nums.filter(n => n > 100);
                    if (currentSection === 'borrower' && result.borrower) {
                        result.borrower.totalLimit = bigNums[0] || result.borrower.totalLimit;
                        result.borrower.totalOutstanding = bigNums[1] || result.borrower.totalOutstanding;
                        result.borrower.totalPayment = bigNums[2] || result.borrower.totalPayment;
                    } else if (currentSection === 'guarantor' && currentGuarantor) {
                        currentGuarantor.totalLimit = bigNums[0] || currentGuarantor.totalLimit;
                        currentGuarantor.totalOutstanding = bigNums[1] || currentGuarantor.totalOutstanding;
                        currentGuarantor.totalPayment = bigNums[2] || currentGuarantor.totalPayment;
                    }
                }
            }
        }

        if (guarantors!.length > 0) result.guarantors = guarantors;
        return result;
    }

    private parseBankStatementSheet(sheet: WorkSheet): ParsedExcelData['bankStatements'] {
        const statements: Array<{
            month: string;
            withdrawCount: number;
            withdrawAmount: number;
            depositCount: number;
            depositAmount: number;
            balance: number;
        }> = [];

        const data = this.getSheetData(sheet);

        for (const row of data) {
            const joined = row.join(' ');
            const monthMatch = joined.match(/(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/);

            if (monthMatch) {
                statements.push({
                    month: monthMatch[0],
                    withdrawCount: 0,
                    withdrawAmount: 0,
                    depositCount: 0,
                    depositAmount: 0,
                    balance: 0,
                });
            }
        }

        return statements;
    }

    private parseWorkingCapital(sheet: WorkSheet): ParsedExcelData['workingCapitalAnalysis'] {
        const data = this.getSheetData(sheet);
        const result: NonNullable<ParsedExcelData['workingCapitalAnalysis']> = { totalNeeded: 0, additionalNeeded: 0, notes: [] };

        for (const row of data) {
            if (!row) continue;
            const joined = row.join(' ');

            if (joined.includes('เงินหมุนเวียนที่ต้องการทั้งหมด')) {
                const nums = row.filter((c): c is number => typeof c === 'number' && c > 1000);
                if (nums[0]) result.totalNeeded = nums[0];
            }
            if (joined.includes('ความต้องการใช้เงินทุนหมุนเวียนในครั้งนี้')) {
                const nums = row.filter((c): c is number => typeof c === 'number' && c > 1000);
                if (nums[0]) result.additionalNeeded = nums[0];
            }
            if (joined.includes('ลูกหนี้การค้า') && !joined.includes('ลบ')) {
                const nums = row.filter((c): c is number => typeof c === 'number');
                if (nums.length >= 2) {
                    result.receivables = { percentage: nums[0], days: nums[1], amount: nums[2] };
                }
            }
            if (joined.includes('STOCK') || joined.includes('สินค้าคงเหลือ')) {
                const nums = row.filter((c): c is number => typeof c === 'number' && c > 1000);
                if (nums[0]) result.stock = nums[0];
            }
            if (joined.includes('เจ้าหนี้การค้า')) {
                const nums = row.filter((c): c is number => typeof c === 'number');
                if (nums.length >= 2) {
                    result.payables = { percentage: nums[0], days: nums[1], amount: nums[2] };
                }
            }
        }
        return result;
    }

    private parseInvestmentStructure(sheet: WorkSheet): ParsedExcelData['investmentStructure'] {
        const data = this.getSheetData(sheet);
        const result: NonNullable<ParsedExcelData['investmentStructure']> = { totalInvestment: 0, debtToEquityRatio: 0, items: [], notes: [] };

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row) continue;
            const joined = row.join(' ');

            if (joined.includes('D/E Ratio')) {
                const nums = row.filter((c): c is number => typeof c === 'number');
                if (nums[0]) result.debtToEquityRatio = nums[0];
            }

            // Parse investment items table
            if (joined.includes('รายละเอียดการลงทุน')) {
                // Parse next rows until 'รวม'
                for (let j = i + 1; j < data.length; j++) {
                    const dRow = data[j];
                    if (!dRow) break;
                    const dJoined = dRow.join(' ');

                    if (dJoined.includes('รวม') && !dJoined.includes('1.')) {
                        const nums = dRow.filter((c): c is number => typeof c === 'number' && c > 1000);
                        if (nums.length > 0) result.totalInvestment = nums[nums.length - 1]; // Last number is usually total
                        break;
                    }

                    // Item row
                    const name = dRow.find(c => typeof c === 'string' && c.length > 3 && !c.includes('บาท'));
                    const nums = dRow.filter((c): c is number => typeof c === 'number');

                    if (name && nums.length > 0) {
                        result.items!.push({
                            name: name,
                            total: nums[nums.length - 1], // Usually rightmost column
                            ownCapital: nums[0] || 0
                        });
                    }
                }
            }
        }
        return result;
    }

    private parseProjections(sheet: WorkSheet): ParsedExcelData['projections'] {
        const data = this.getSheetData(sheet);
        const result: NonNullable<ParsedExcelData['projections']> = {
            revenue: [], costOfSales: [], grossProfit: [], adminExpenses: [],
            sellingExpenses: [], ebitda: [], netProfit: [], dscr: [], headers: []
        };

        // Find header row with Years
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            if (!row) continue;
            const joined = row.join(' ');

            if (joined.includes('ปี 25') || joined.includes('ปี 20')) {
                result.headers = row.filter(c => typeof c === 'string' && (c.includes('ปี') || c.includes('Year')));
            }

            // Extract key metrics
            const nums = row.filter((c): c is number => typeof c === 'number');
            if (nums.length === 0) continue;

            if (joined.includes('รายได้จากการขาย') || (joined.includes('รวมรายได้') && !joined.includes('เฉลี่ย'))) {
                result.revenue = nums;
            } else if (joined.includes('ต้นทุนขาย')) {
                result.costOfSales = nums;
            } else if (joined.includes('กำไรขั้นต้น')) {
                result.grossProfit = nums;
            } else if (joined.includes('ค่าใช้จ่ายในการบริหาร')) {
                result.adminExpenses = nums;
            } else if (joined.includes('กำไร(ขาดทุน)สุทธิ') || joined.includes('กำไรสุทธิ')) {
                result.netProfit = nums;
            } else if (joined.includes('EBITDA')) {
                result.ebitda = nums;
            } else if (joined.includes('DSCR')) {
                result.dscr = nums;
            }
        }
        return result;
    }

    private parseComments(sheet: WorkSheet): string[] {
        const data = this.getSheetData(sheet);
        const comments: string[] = [];

        for (const row of data) {
            if (!row) continue;
            const text = row.filter(c => typeof c === 'string' && c.trim().length > 10).join(' ');
            if (text.length > 0) {
                // Filter out headers/labels if needed
                if (!text.includes('ความเห็น') && !text.includes('อนุมัติ')) {
                    comments.push(text);
                }
            }
        }
        return comments;
    }

    private parseBusinessHistory(sheet: WorkSheet): ParsedExcelData['businessHistory'] {
        const data = this.getSheetData(sheet);
        const result: NonNullable<ParsedExcelData['businessHistory']> = { executives: [], shareholding: [] };

        let section: 'exec' | 'share' | null = null;
        let currentExec: any = {};

        for (const row of data) {
            if (!row) continue;
            const joined = row.join(' ');

            // Handle standard and typo headers
            if (joined.includes('ประวัติผู้บริหาร') || joined.includes('ประว้ติผู้บริหาร') || joined.includes('ประสบการทำงาน')) {
                section = 'exec';
                continue;
            }
            if (joined.includes('การถือหุ้น')) {
                section = 'share';
                continue;
            }

            if (section === 'exec') {
                if (joined.includes('ชื่อ') && !joined.includes('สกุล')) {
                    // Check if it's a company name (starts with ห้าง/บริษัท) -> ignore
                    if (joined.includes('ห้างหุ้นส่วน') || joined.includes('บริษัท')) continue;

                    if (currentExec.name && result.executives) result.executives.push(currentExec);
                    currentExec = {};
                    const name = row.find(c => typeof c === 'string' && (c.includes('นาย') || c.includes('นาง') || c.includes('น.ส.')));
                    if (name) currentExec.name = name;
                }
                if (joined.includes('การศึกษา') || joined.includes('ประวัติการศึกษา')) {
                    currentExec.education = row.find(c => typeof c === 'string' && c !== 'ประวัติการศึกษา' && c.length > 5) || joined;
                }
                if (joined.includes('อายุ') && !joined.includes('ปี(เกิด)')) {
                    const age = row.find((c): c is number => typeof c === 'number');
                    if (age) currentExec.age = String(age);
                    else currentExec.age = row.find(c => typeof c === 'string' && c.includes('ปี') && !c.includes('อายุ')) || '';
                }
            } else if (section === 'share') {
                const name = row.find(c => typeof c === 'string' && (c.includes('นาย') || c.includes('นาง') || c.includes('น.ส.')));
                const nums = row.filter((c): c is number => typeof c === 'number');
                if (name && nums.length > 0 && result.shareholding) {
                    const shares = nums.find(n => n > 1000);
                    const percent = nums.find(n => n <= 100);
                    result.shareholding.push({
                        name: name,
                        percentage: percent ? (percent < 1 ? percent * 100 : percent) : 0,
                        shares: shares || 0
                    });
                }
            }
        }
        if (currentExec.name && result.executives) result.executives.push(currentExec); // Push last exec

        return result;
    }

    private parseBankStatementAccounts(sheet: WorkSheet): ParsedExcelData['bankStatementAccounts'] {
        const data = this.getSheetData(sheet);
        const accounts: ParsedExcelData['bankStatementAccounts'] = [];

        let currentAccount: any = null;

        for (const row of data) {
            if (!row) continue;
            const joined = row.join(' ');

            // Detect new account block
            // Often "ธนาคาร" and "เลขที่บัญชี" are in the first few rows of a block
            if (joined.includes('ธนาคาร') || joined.includes('เลขที่บัญชี') || (joined.includes('สาขา') && joined.includes('ประเภท'))) {
                // If we have a previous account with data, push it
                if (currentAccount && currentAccount.months.length > 0 && accounts) {
                    // Check if already pushed (by reference or logic) - here simplify by just pushing if new content found
                    // But we must be careful not to push multiple times for same header block
                }

                // Initialize if not exists or if we detect a clearly new account header (e.g. Account Number change)
                const accNum = row.find(c => typeof c === 'string' && /\d{3}-\d-\d{5,}/.test(c));

                if (!currentAccount || (accNum && currentAccount.accountNumber !== accNum)) {
                    if (currentAccount && currentAccount.months.length > 0 && currentAccount.bankName) {
                        accounts!.push(currentAccount);
                    }
                    currentAccount = { bankName: '', months: [] };
                }

                const bank = row.find(c => typeof c === 'string' && (c.includes('ธ.') || c.includes('ธนาคาร') || c.includes('ไทยพาณิชย์') || c.includes('กสิกร')));
                if (bank) currentAccount.bankName = bank;

                if (accNum) currentAccount.accountNumber = accNum;
            }

            // Account details
            if (currentAccount) {
                if (joined.includes('วงเงิน')) {
                    const limit = row.find((c): c is number => typeof c === 'number' && c > 1000);
                    if (limit) currentAccount.creditLimit = limit;
                }

                // Transactions
                // Check if row starts with a Month name OR a Serial Date number
                const monthMatch = joined.match(/(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)/);
                const firstCell = row[0];
                const isSerialDate = typeof firstCell === 'number' && firstCell > 20000; // e.g. 24838 is year 2500+ in days or similar

                if (monthMatch || isSerialDate) {
                    const nums = row.filter((c): c is number => typeof c === 'number');
                    // Expecting at least: WithdrawAmt, DepositAmt, Balance (maybe count too)
                    // Based on sample: 24 (count), 24098918.63 (amt), 77 (count), 23345336.42 (amt), -34955... (balance?)
                    // It seems structure is: W_Count, W_Amt, D_Count, D_Amt, Balance

                    if (nums.length >= 3) {
                        const monthLabel = monthMatch ? monthMatch[0] : (isSerialDate ? String(firstCell) : 'Month');

                        // Heuristic to map columns based on value magnitude
                        // Large numbers (>1000) are likely amounts
                        // Small numbers (<1000) are likely counts
                        // But strictly following column index is better if consistent.
                        // Assuming standard format as seen in log:
                        // Col 1 (index 0 of nums filtered? No, mixed types)
                        // If filtered only numbers:
                        // nums[0] = W_Count? (24)
                        // nums[1] = W_Amt (24098918)
                        // nums[2] = D_Count (77)
                        // nums[3] = D_Amt (23345336)
                        // nums[4] = Balance? (-3495515)

                        // Let's rely on standard 5 number pattern if available
                        if (nums.length >= 5) {
                            currentAccount.months.push({
                                month: monthLabel,
                                withdrawCount: nums[0],
                                withdrawAmount: nums[1],
                                depositCount: nums[2],
                                depositAmount: nums[3],
                                balance: nums[4]
                            });
                        } else if (nums.length >= 2) {
                            // Fallback for simpler rows
                            currentAccount.months.push({
                                month: monthLabel,
                                withdrawCount: 0,
                                withdrawAmount: nums[0], // Assumption
                                depositCount: 0,
                                depositAmount: nums[1], // Assumption
                                balance: nums[nums.length - 1]
                            });
                        }
                    }
                }
            }
        }
        // Push the last account found
        if (currentAccount && currentAccount.months.length > 0 && accounts) accounts.push(currentAccount);

        return accounts;
    }

    private parseBalanceSheet(sheet: WorkSheet): ParsedExcelData['balanceSheet'] {
        const data = this.getSheetData(sheet);
        const result: NonNullable<ParsedExcelData['balanceSheet']> = { years: [] };

        // Find header row with Years
        const yearRow = data.find(r => r.join(' ').includes('ปี 25') || r.join(' ').includes('ปี 20'));
        if (!yearRow) return result;

        const years = yearRow.filter((c): c is string => typeof c === 'string' && (c.includes('25') || c.includes('20')));

        // Initialize years
        years.forEach(y => result.years!.push({ year: y }));

        for (const row of data) {
            if (!row) continue;
            const joined = row.join(' ');
            const nums = row.filter((c): c is number => typeof c === 'number');

            if (nums.length < years.length) continue;

            // Map values to years
            if (joined.includes('สินทรัพย์หมุนเวียน')) {
                result.years!.forEach((y, i) => y.currentAssets = nums[i]);
            } else if (joined.includes('สินทรัพย์ไม่หมุนเวียน')) {
                result.years!.forEach((y, i) => y.nonCurrentAssets = nums[i]);
            } else if (joined.includes('รวมสินทรัพย์')) {
                result.years!.forEach((y, i) => y.totalAssets = nums[i]);
            } else if (joined.includes('หนี้สินหมุนเวียน')) {
                result.years!.forEach((y, i) => y.currentLiabilities = nums[i]);
            } else if (joined.includes('หนี้สินไม่หมุนเวียน')) {
                result.years!.forEach((y, i) => y.nonCurrentLiabilities = nums[i]);
            } else if (joined.includes('รวมหนี้สิน')) {
                result.years!.forEach((y, i) => y.totalLiabilities = nums[i]);
            } else if (joined.includes('ส่วนของผู้ถือหุ้น') || joined.includes('รวมส่วนของ')) {
                result.years!.forEach((y, i) => y.totalEquity = nums[i]);
            }
        }

        return result;
    }

    /**
     * Calculate confidence score based on data completeness
     */
    private calculateConfidence(data: ParsedExcelData): number {
        let score = 0;
        let maxScore = 0;

        // Company name (10 points)
        maxScore += 10;
        if (data.companyName && data.companyName !== 'Unknown') score += 10;

        // Loan summary (20 points)
        maxScore += 20;
        if (data.loanSummary?.amount) score += 10;
        if (data.loanSummary?.interestRate) score += 5;
        if (data.loanSummary?.term) score += 5;

        // VAT report (20 points)
        maxScore += 20;
        if (data.vatReport?.totalSales) score += 10;
        if (data.vatReport?.annualSales) score += 10;

        // Financial statement (30 points)
        maxScore += 30;
        if (data.financialStatement?.years && data.financialStatement.years.length > 0) {
            score += 30;
        }

        // Other data (20 points)
        maxScore += 20;
        if (data.shareholders && data.shareholders.length > 0) score += 5;
        if (data.creditBureau) score += 5;
        if (data.bankStatements && data.bankStatements.length > 0) score += 5;
        if (data.investmentStructure) score += 5;

        return Math.round((score / maxScore) * 100);
    }
}
