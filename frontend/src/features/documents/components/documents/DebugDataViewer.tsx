import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, FileSearch } from 'lucide-react';
import { ParsedBusinessProfile } from '../../utils/parsers/excel-parser';

interface DebugDataViewerProps {
  parsedData: ParsedBusinessProfile;
}

export function DebugDataViewer({ parsedData }: DebugDataViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const copyToClipboard = () => {
    const jsonString = JSON.stringify(parsedData, null, 2);
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const sections = [
    { key: 'companyInfo', label: 'ข้อมูลบริษัท', data: parsedData.companyInfo },
    { key: 'shareholders', label: 'ผู้ถือหุ้น', data: parsedData.shareholders },
    { key: 'loanSummary', label: 'สรุปวงเงินสินเชื่อ', data: parsedData.loanSummary },
    { key: 'financialStatements', label: 'งบกำไรขาดทุน', data: parsedData.financialStatements },
    { key: 'balanceSheets', label: 'งบดุล', data: parsedData.balanceSheets },
    { key: 'vatRecords', label: 'ภพ.30', data: parsedData.vatRecords },
    { key: 'creditBureauReports', label: 'เครดิตบูโร', data: parsedData.creditBureauReports },
    { key: 'bankStatements', label: 'Bank Statement', data: parsedData.bankStatements },
    { key: 'investmentStructure', label: 'โครงสร้างการลงทุน', data: parsedData.investmentStructure },
    { key: 'collaterals', label: 'หลักประกัน', data: parsedData.collaterals },
    { key: 'workingCapital', label: 'เงินทุนหมุนเวียน', data: parsedData.workingCapital },
    { key: 'revenueProjection', label: 'ประมาณรายได้', data: parsedData.revenueProjection },
    { key: 'dscr', label: 'DSCR', data: parsedData.dscr },
    { key: 'businessHistory', label: 'ประวัติธุรกิจ', data: parsedData.businessHistory },
    { key: 'suppliers', label: 'ซัพพลายเออร์', data: parsedData.suppliers },
    { key: 'customers', label: 'ลูกค้า', data: parsedData.customers },
    { key: 'recommendation', label: 'ความเห็น', data: parsedData.recommendation },
    { key: 'enhancedData', label: 'ข้อมูลเพิ่มเติม (Enhanced)', data: parsedData.enhancedData },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
        <div>
          <h3 className="text-lg font-semibold">Debug: Parsed Data</h3>
          <p className="text-sm text-muted-foreground">
            ตรวจสอบข้อมูลที่ parser อ่านได้จากไฟล์ Excel
          </p>
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy JSON
            </>
          )}
        </button>
      </div>

      {/* Metadata */}
      <div className="p-4 bg-muted/10 rounded-lg">
        <h4 className="text-sm font-semibold mb-2">Metadata</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Source File:</span>
            <span className="ml-2 font-mono">{parsedData.sourceFileName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Confidence:</span>
            <span className="ml-2 font-mono">{Math.round(parsedData.matchConfidence * 100)}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Sheets Parsed:</span>
            <span className="ml-2 font-mono">{parsedData.sheetsParsed?.length || 0}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Warnings:</span>
            <span className="ml-2 font-mono">{parsedData.warnings?.length || 0}</span>
          </div>
        </div>
        {parsedData.sheetsParsed && parsedData.sheetsParsed.length > 0 && (
          <div className="mt-2">
            <span className="text-xs text-muted-foreground">Sheets:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {parsedData.sheetsParsed.map((sheet, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded">
                  {sheet}
                </span>
              ))}
            </div>
          </div>
        )}
        {parsedData.warnings && parsedData.warnings.length > 0 && (
          <div className="mt-2">
            <span className="text-xs text-warning">Warnings:</span>
            <div className="mt-1 space-y-1">
              {parsedData.warnings.map((warning, idx) => (
                <div key={idx} className="text-xs text-warning bg-warning/10 px-2 py-1 rounded">
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {sections.map(({ key, label, data }) => {
          const isExpanded = expandedSections.has(key);
          const hasData = data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0);
          
          return (
            <div key={key} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(key)}
                className="w-full flex items-center justify-between p-3 bg-muted/5 hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span className="font-medium">{label}</span>
                  {hasData ? (
                    <span className="px-2 py-0.5 bg-success/10 text-success text-xs rounded">
                      {Array.isArray(data) ? `${data.length} items` : 'Has data'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded">
                      No data
                    </span>
                  )}
                </div>
              </button>
              
              {isExpanded && (
                <div className="p-4 bg-background">
                  <pre className="text-xs font-mono bg-muted/20 p-3 rounded overflow-x-auto">
                    {renderValue(data)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Raw JSON */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('raw')}
          className="w-full flex items-center justify-between p-3 bg-muted/5 hover:bg-muted/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            {expandedSections.has('raw') ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span className="font-medium">Raw JSON (Complete)</span>
          </div>
        </button>
        
        {expandedSections.has('raw') && (
          <div className="p-4 bg-background">
            <pre className="text-xs font-mono bg-muted/20 p-3 rounded overflow-x-auto max-h-96 overflow-y-auto">
              {JSON.stringify(parsedData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
