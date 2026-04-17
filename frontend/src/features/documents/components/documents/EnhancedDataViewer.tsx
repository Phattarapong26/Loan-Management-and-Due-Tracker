/**
 * Enhanced Data Viewer - แสดงข้อมูลแบบละเอียดจาก enhancedData
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Table as TableIcon, FileText, Eye } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ParsedBusinessProfile, formatCurrency } from '../../utils/parsers/excel-parser';
import { motion, AnimatePresence } from 'framer-motion';

interface EnhancedDataViewerProps {
  enhancedData: ParsedBusinessProfile['enhancedData'];
}

type EnhancedData = NonNullable<ParsedBusinessProfile['enhancedData']>;

export function EnhancedDataViewer({ enhancedData }: EnhancedDataViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  if (!enhancedData) {
    return (
      <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground text-center">
        ไม่มีข้อมูลเพิ่มเติม
      </div>
    );
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <div className="space-y-4">
      {/* Extended Financial Statements */}
      {enhancedData.extendedFinancialStatements && enhancedData.extendedFinancialStatements.length > 0 && (
        <EnhancedSection
          title="งบกำไรขาดทุนแบบละเอียด"
          icon={TableIcon}
          isExpanded={expandedSections.has('financial')}
          onToggle={() => toggleSection('financial')}
          count={enhancedData.extendedFinancialStatements.length}
        >
          <ExtendedFinancialStatementsTable data={enhancedData.extendedFinancialStatements} />
        </EnhancedSection>
      )}

      {/* Extended Balance Sheets */}
      {enhancedData.extendedBalanceSheets && enhancedData.extendedBalanceSheets.length > 0 && (
        <EnhancedSection
          title="งบดุลแบบละเอียด"
          icon={TableIcon}
          isExpanded={expandedSections.has('balance')}
          onToggle={() => toggleSection('balance')}
          count={enhancedData.extendedBalanceSheets.length}
        >
          <ExtendedBalanceSheetsTable data={enhancedData.extendedBalanceSheets} />
        </EnhancedSection>
      )}

      {/* Executive Profiles */}
      {enhancedData.executiveProfiles && enhancedData.executiveProfiles.length > 0 && (
        <EnhancedSection
          title="ประวัติผู้บริหาร"
          icon={FileText}
          isExpanded={expandedSections.has('executives')}
          onToggle={() => toggleSection('executives')}
          count={enhancedData.executiveProfiles.length}
        >
          <ExecutiveProfilesView data={enhancedData.executiveProfiles} />
        </EnhancedSection>
      )}

      {/* Loan Rationale */}
      {enhancedData.loanRationale && (
        <EnhancedSection
          title="เหตุผลการขอสินเชื่อ"
          icon={FileText}
          isExpanded={expandedSections.has('rationale')}
          onToggle={() => toggleSection('rationale')}
        >
          <LoanRationaleView data={enhancedData.loanRationale} />
        </EnhancedSection>
      )}

      {/* Detailed Approval Comments */}
      {enhancedData.detailedApprovalComments && (
        <EnhancedSection
          title="ความเห็นแบบละเอียด"
          icon={FileText}
          isExpanded={expandedSections.has('approval')}
          onToggle={() => toggleSection('approval')}
        >
          <DetailedApprovalCommentsView data={enhancedData.detailedApprovalComments} />
        </EnhancedSection>
      )}

      {/* Raw Sheets */}
      {enhancedData.rawSheets && enhancedData.rawSheets.length > 0 && (
        <EnhancedSection
          title="ข้อมูล Raw Data (ทุก Sheet)"
          icon={Eye}
          isExpanded={expandedSections.has('raw')}
          onToggle={() => toggleSection('raw')}
          count={enhancedData.rawSheets.length}
        >
          <RawSheetsView data={enhancedData.rawSheets} />
        </EnhancedSection>
      )}
    </div>
  );
}

// ===== SECTION WRAPPER =====

function EnhancedSection({
  title,
  icon: Icon,
  isExpanded,
  onToggle,
  count,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  isExpanded: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {count !== undefined && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {count}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-card">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ===== EXTENDED FINANCIAL STATEMENTS =====

function ExtendedFinancialStatementsTable({ data }: { data: NonNullable<EnhancedData['extendedFinancialStatements']> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 font-semibold text-foreground">รายการ</th>
            {data.map((stmt, idx) => (
              <th key={idx} className="text-right py-2 px-3 font-semibold text-foreground min-w-[120px]">
                {stmt.period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-xs">
          <tr className="border-b border-border/50">
            <td className="py-2 px-3 font-medium">รายได้จากการบริการ</td>
            {data.map((stmt, idx) => (
              <td key={idx} className="text-right py-2 px-3">{formatCurrency(stmt.revenue)}</td>
            ))}
          </tr>
          {data[0]?.otherIncome !== undefined && (
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">รายได้อื่น</td>
              {data.map((stmt, idx) => (
                <td key={idx} className="text-right py-2 px-3">{formatCurrency(stmt.otherIncome || 0)}</td>
              ))}
            </tr>
          )}
          {data[0]?.totalRevenue !== undefined && (
            <tr className="border-b border-border bg-muted/20">
              <td className="py-2 px-3 font-semibold">รวมรายได้</td>
              {data.map((stmt, idx) => (
                <td key={idx} className="text-right py-2 px-3 font-semibold">{formatCurrency(stmt.totalRevenue || 0)}</td>
              ))}
            </tr>
          )}
          <tr className="border-b border-border/50">
            <td className="py-2 px-3 font-medium">ต้นทุนขาย</td>
            {data.map((stmt, idx) => (
              <td key={idx} className="text-right py-2 px-3 text-destructive">{formatCurrency(stmt.costOfGoodsSold)}</td>
            ))}
          </tr>
          <tr className="border-b border-border bg-success/5">
            <td className="py-2 px-3 font-semibold">กำไรขั้นต้น</td>
            {data.map((stmt, idx) => (
              <td key={idx} className="text-right py-2 px-3 font-semibold text-success">{formatCurrency(stmt.grossProfit)}</td>
            ))}
          </tr>
          <tr className="border-b border-border/50">
            <td className="py-2 px-3 font-medium">ค่าใช้จ่ายดำเนินงาน</td>
            {data.map((stmt, idx) => (
              <td key={idx} className="text-right py-2 px-3 text-destructive">{formatCurrency(stmt.operatingExpenses)}</td>
            ))}
          </tr>
          {data[0]?.ebitda !== undefined && (
            <tr className="border-b border-border bg-primary/5">
              <td className="py-2 px-3 font-semibold">EBITDA</td>
              {data.map((stmt, idx) => (
                <td key={idx} className="text-right py-2 px-3 font-semibold text-primary">{formatCurrency(stmt.ebitda || 0)}</td>
              ))}
            </tr>
          )}
          {data[0]?.depreciation !== undefined && (
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">ค่าเสื่อมราคา</td>
              {data.map((stmt, idx) => (
                <td key={idx} className="text-right py-2 px-3">{formatCurrency(stmt.depreciation || 0)}</td>
              ))}
            </tr>
          )}
          {data[0]?.financialExpenses !== undefined && (
            <tr className="border-b border-border/50">
              <td className="py-2 px-3 font-medium">ต้นทุนทางการเงิน</td>
              {data.map((stmt, idx) => (
                <td key={idx} className="text-right py-2 px-3 text-destructive">{formatCurrency(stmt.financialExpenses || 0)}</td>
              ))}
            </tr>
          )}
          <tr className="border-b border-border bg-success/10">
            <td className="py-2 px-3 font-bold">กำไรสุทธิ</td>
            {data.map((stmt, idx) => (
              <td key={idx} className="text-right py-2 px-3 font-bold text-success">{formatCurrency(stmt.netProfit)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ===== EXTENDED BALANCE SHEETS =====

function ExtendedBalanceSheetsTable({ data }: { data: NonNullable<EnhancedData['extendedBalanceSheets']> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 font-semibold text-foreground">รายการ</th>
            {data.map((bs, idx) => (
              <th key={idx} className="text-right py-2 px-3 font-semibold text-foreground min-w-[120px]">
                {bs.period}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-xs">
          {/* Current Assets */}
          <tr className="bg-muted/20">
            <td colSpan={data.length + 1} className="py-2 px-3 font-semibold text-primary">สินทรัพย์หมุนเวียน</td>
          </tr>
          {data[0]?.currentAssets && (
            <>
              <tr className="border-b border-border/50">
                <td className="py-2 px-3 pl-6">เงินสด</td>
                {data.map((bs, idx) => (
                  <td key={idx} className="text-right py-2 px-3">{formatCurrency(bs.currentAssets?.cash || 0)}</td>
                ))}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-3 pl-6">ลูกหนี้การค้า</td>
                {data.map((bs, idx) => (
                  <td key={idx} className="text-right py-2 px-3">{formatCurrency(bs.currentAssets?.accountsReceivable || 0)}</td>
                ))}
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 px-3 pl-6">สินค้าคงคลัง</td>
                {data.map((bs, idx) => (
                  <td key={idx} className="text-right py-2 px-3">{formatCurrency(bs.currentAssets?.inventory || 0)}</td>
                ))}
              </tr>
              <tr className="border-b border-border bg-muted/10">
                <td className="py-2 px-3 font-semibold">รวมสินทรัพย์หมุนเวียน</td>
                {data.map((bs, idx) => (
                  <td key={idx} className="text-right py-2 px-3 font-semibold">{formatCurrency(bs.currentAssets?.total || 0)}</td>
                ))}
              </tr>
            </>
          )}
          
          {/* Non-Current Assets */}
          <tr className="bg-muted/20">
            <td colSpan={data.length + 1} className="py-2 px-3 font-semibold text-primary">สินทรัพย์ไม่หมุนเวียน</td>
          </tr>
          {data[0]?.nonCurrentAssets && (
            <>
              <tr className="border-b border-border/50">
                <td className="py-2 px-3 pl-6">ที่ดิน อาคาร อุปกรณ์</td>
                {data.map((bs, idx) => (
                  <td key={idx} className="text-right py-2 px-3">{formatCurrency(bs.nonCurrentAssets?.ppe || 0)}</td>
                ))}
              </tr>
              <tr className="border-b border-border bg-muted/10">
                <td className="py-2 px-3 font-semibold">รวมสินทรัพย์ไม่หมุนเวียน</td>
                {data.map((bs, idx) => (
                  <td key={idx} className="text-right py-2 px-3 font-semibold">{formatCurrency(bs.nonCurrentAssets?.total || 0)}</td>
                ))}
              </tr>
            </>
          )}
          
          {/* Total Assets */}
          <tr className="border-b border-border bg-primary/10">
            <td className="py-2 px-3 font-bold">รวมสินทรัพย์</td>
            {data.map((bs, idx) => (
              <td key={idx} className="text-right py-2 px-3 font-bold text-primary">{formatCurrency(bs.totalAssets)}</td>
            ))}
          </tr>
          
          {/* Liabilities */}
          <tr className="bg-muted/20">
            <td colSpan={data.length + 1} className="py-2 px-3 font-semibold text-primary">หนี้สิน</td>
          </tr>
          <tr className="border-b border-border bg-muted/10">
            <td className="py-2 px-3 font-semibold">รวมหนี้สิน</td>
            {data.map((bs, idx) => (
              <td key={idx} className="text-right py-2 px-3 font-semibold text-destructive">{formatCurrency(bs.totalLiabilities)}</td>
            ))}
          </tr>
          
          {/* Equity */}
          <tr className="bg-muted/20">
            <td colSpan={data.length + 1} className="py-2 px-3 font-semibold text-primary">ส่วนของผู้ถือหุ้น</td>
          </tr>
          <tr className="border-b border-border bg-success/10">
            <td className="py-2 px-3 font-bold">รวมส่วนของผู้ถือหุ้น</td>
            {data.map((bs, idx) => (
              <td key={idx} className="text-right py-2 px-3 font-bold text-success">{formatCurrency(bs.equity)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ===== EXECUTIVE PROFILES =====

function ExecutiveProfilesView({ data }: { data: NonNullable<EnhancedData['executiveProfiles']> }) {
  return (
    <div className="space-y-4">
      {data.map((exec, idx) => (
        <div key={idx} className="border border-border rounded-lg p-4 bg-muted/10">
          <h4 className="font-semibold text-foreground mb-3">{exec.name}</h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {exec.position && (
              <div>
                <span className="text-muted-foreground">ตำแหน่ง:</span>
                <span className="ml-2 font-medium">{exec.position}</span>
              </div>
            )}
            {exec.age && (
              <div>
                <span className="text-muted-foreground">อายุ:</span>
                <span className="ml-2 font-medium">{exec.age} ปี</span>
              </div>
            )}
            {exec.dateOfBirth && (
              <div>
                <span className="text-muted-foreground">วันเกิด:</span>
                <span className="ml-2 font-medium">{exec.dateOfBirth}</span>
              </div>
            )}
            {exec.maritalStatus && (
              <div>
                <span className="text-muted-foreground">สถานะภาพ:</span>
                <span className="ml-2 font-medium">{exec.maritalStatus}</span>
              </div>
            )}
            {exec.idCard && (
              <div className="col-span-2">
                <span className="text-muted-foreground">บัตรประชาชน:</span>
                <span className="ml-2 font-medium">{exec.idCard}</span>
              </div>
            )}
            {exec.address && (
              <div className="col-span-2">
                <span className="text-muted-foreground">ที่อยู่:</span>
                <span className="ml-2 font-medium">{exec.address}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== LOAN RATIONALE =====

function LoanRationaleView({ data }: { data: NonNullable<EnhancedData['loanRationale']> }) {
  return (
    <div className="space-y-3 text-sm">
      {data.purpose && (
        <div>
          <p className="text-muted-foreground font-medium mb-1">วัตถุประสงค์:</p>
          <p className="text-foreground">{data.purpose}</p>
        </div>
      )}
      {data.usageDetails && (
        <div>
          <p className="text-muted-foreground font-medium mb-1">รายละเอียดการใช้เงิน:</p>
          <p className="text-foreground">{data.usageDetails}</p>
        </div>
      )}
      {data.repaymentCapability && (
        <div>
          <p className="text-muted-foreground font-medium mb-1">ความสามารถในการชำระหนี้:</p>
          <p className="text-foreground">{data.repaymentCapability}</p>
        </div>
      )}
    </div>
  );
}

// ===== DETAILED APPROVAL COMMENTS =====

function DetailedApprovalCommentsView({ data }: { data: NonNullable<EnhancedData['detailedApprovalComments']> }) {
  return (
    <div className="space-y-4">
      {data.fullText && (
        <div className="bg-muted/20 rounded-lg p-4">
          <p className="text-sm text-foreground whitespace-pre-wrap">{data.fullText}</p>
        </div>
      )}
      
      {data.loanDetails && data.loanDetails.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold text-foreground mb-2">รายละเอียดสินเชื่อ</h5>
          <div className="space-y-2">
            {data.loanDetails.map((loan, idx) => (
              <div key={idx} className="border border-border rounded-lg p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">ประเภท:</span> <span className="font-medium">{loan.loanType}</span></div>
                  <div><span className="text-muted-foreground">วงเงิน:</span> <span className="font-medium">{formatCurrency(loan.amount)}</span></div>
                  {loan.term && <div><span className="text-muted-foreground">ระยะเวลา:</span> <span className="font-medium">{loan.term}</span></div>}
                  {loan.interestRate && <div><span className="text-muted-foreground">อัตราดอกเบี้ย:</span> <span className="font-medium">{loan.interestRate}</span></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {data.collateralDetails && data.collateralDetails.length > 0 && (
        <div>
          <h5 className="text-sm font-semibold text-foreground mb-2">หลักประกัน</h5>
          <div className="space-y-2">
            {data.collateralDetails.map((col, idx) => (
              <div key={idx} className="border border-border rounded-lg p-3 text-sm">
                <p className="font-medium">{col.type}</p>
                <p className="text-muted-foreground text-xs mt-1">{col.description}</p>
                {col.owner && <p className="text-xs mt-1"><span className="text-muted-foreground">เจ้าของ:</span> {col.owner}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== RAW SHEETS =====

function RawSheetsView({ data }: { data: NonNullable<EnhancedData['rawSheets']> }) {
  const [selectedSheet, setSelectedSheet] = useState(0);
  const [selectedTable, setSelectedTable] = useState(0);

  const sheet = data[selectedSheet];
  const table = sheet?.tables?.[selectedTable];

  return (
    <div className="space-y-4">
      {/* Sheet Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {data.map((s, idx) => (
          <button
            key={idx}
            onClick={() => { setSelectedSheet(idx); setSelectedTable(0); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              selectedSheet === idx
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s.sheetName} ({s.tables?.length || 0} tables)
          </button>
        ))}
      </div>

      {sheet && (
        <>
          {/* Table Selector */}
          {sheet.tables && sheet.tables.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {sheet.tables.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTable(idx)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    selectedTable === idx
                      ? 'bg-primary/20 text-primary border border-primary'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Table {idx + 1} ({t.rows?.length || 0} rows)
                </button>
              ))}
            </div>
          )}

          {/* Table Display */}
          {table && (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    {table.headers.map((h: string, idx: number) => (
                      <th key={idx} className="text-left py-2 px-3 font-semibold text-foreground border-b border-border">
                        {h || `Col ${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.slice(0, 50).map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-border/50 hover:bg-muted/20">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="py-2 px-3">
                          {typeof cell === 'number' ? formatCurrency(cell) : String(cell || '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {table.rows.length > 50 && (
                    <tr>
                      <td colSpan={table.headers.length} className="py-2 px-3 text-center text-muted-foreground">
                        ... และอีก {table.rows.length - 50} แถว
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Text Blocks */}
          {sheet.textBlocks && sheet.textBlocks.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-semibold text-foreground mb-2">Text Blocks</h5>
              <div className="space-y-2">
                {sheet.textBlocks.slice(0, 5).map((tb, idx) => (
                  <div key={idx} className="bg-muted/20 rounded-lg p-3 text-xs">
                    <p className="text-muted-foreground mb-1">Row {tb.startRow} - {tb.endRow}</p>
                    <p className="text-foreground whitespace-pre-wrap">{tb.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
