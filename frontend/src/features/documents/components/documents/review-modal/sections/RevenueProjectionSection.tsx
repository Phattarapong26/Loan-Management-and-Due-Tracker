import React from 'react';
import { BarChart3, X } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { ParsedBusinessProfile } from "../../../../utils/parsers/excel-parser";
import { SectionTitle } from '../shared';

interface RevenueProjectionSectionProps {
  data: ParsedBusinessProfile['revenueProjection'];
  onUpdate: (newData: ParsedBusinessProfile['revenueProjection']) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatPercent = (value: number) => {
  // Convert to percentage (multiply by 100) and format
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value * 100);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export function RevenueProjectionSection({ data, onUpdate }: RevenueProjectionSectionProps) {
  // Check if we have detailed data (new format)
  const hasDetailedData = data?.rows && data.rows.length > 0;

  if (!data) {
    return (
      <div className="space-y-6">
        <SectionTitle icon={BarChart3} title="ประมาณรายได้ (Revenue Projection)" />
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-muted/5">
          ไม่พบข้อมูลประมาณการ
        </div>
      </div>
    );
  }

  if (hasDetailedData) {
    return <DetailedRevenueProjection data={data} onUpdate={onUpdate} />;
  }

  // Fallback to old format (monthly projections)
  return <LegacyRevenueProjection data={data} onUpdate={onUpdate} />;
}

// New detailed table component
function DetailedRevenueProjection({ data, onUpdate }: RevenueProjectionSectionProps) {
  const taxYears = data?.taxYears || [];
  const projectionYears = data?.projectionYears || [];
  const rows = data?.rows || [];

  // Track which cell is being edited
  const [editingCell, setEditingCell] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState<string>('');

  const updateRow = (rowIndex: number, field: string, colIndex: number, value: number) => {
    const newRows = [...rows];
    const row = { ...newRows[rowIndex] };
    
    if (field === 'taxData') {
      row.taxData = [...row.taxData];
      row.taxData[colIndex] = value;
    } else if (field === 'taxPercent') {
      row.taxPercent = [...row.taxPercent];
      row.taxPercent[colIndex] = value;
    } else if (field === 'projectionData') {
      row.projectionData = [...row.projectionData];
      row.projectionData[colIndex] = value;
    } else if (field === 'projectionPercent') {
      row.projectionPercent = [...row.projectionPercent];
      row.projectionPercent[colIndex] = value;
    }
    
    newRows[rowIndex] = row;
    onUpdate({ ...data!, rows: newRows });
  };

  const deleteTaxYear = (yearIndex: number) => {
    const newTaxYears = taxYears.filter((_, idx) => idx !== yearIndex);
    const newRows = rows.map(row => ({
      ...row,
      taxData: row.taxData.filter((_, idx) => idx !== yearIndex),
      taxPercent: row.taxPercent.filter((_, idx) => idx !== yearIndex),
    }));
    
    onUpdate({
      ...data!,
      taxYears: newTaxYears,
      rows: newRows,
    });
  };

  const deleteProjectionYear = (yearIndex: number) => {
    const newProjectionYears = projectionYears.filter((_, idx) => idx !== yearIndex);
    const newRows = rows.map(row => ({
      ...row,
      projectionData: row.projectionData.filter((_, idx) => idx !== yearIndex),
      projectionPercent: row.projectionPercent.filter((_, idx) => idx !== yearIndex),
    }));
    
    onUpdate({
      ...data!,
      projectionYears: newProjectionYears,
      rows: newRows,
    });
  };

  const formatDisplayValue = (value: number, isPercent: boolean = false) => {
    if (value === 0) return '';
    if (isPercent) {
      // For percent, multiply by 100 and show as percentage
      return formatNumber(value * 100);
    }
    return formatNumber(value);
  };

  const handleCellClick = (cellId: string, currentValue: number, isPercent: boolean) => {
    setEditingCell(cellId);
    // For editing, show the raw value (for percent, multiply by 100)
    setEditValue(currentValue === 0 ? '' : (isPercent ? (currentValue * 100).toString() : currentValue.toString()));
  };

  const handleCellBlur = (rowIdx: number, field: string, colIdx: number, isPercent: boolean) => {
    const numValue = parseFloat(editValue) || 0;
    // For percent, divide by 100 before saving
    const valueToSave = isPercent ? numValue / 100 : numValue;
    updateRow(rowIdx, field, colIdx, valueToSave);
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, field: string, colIdx: number, isPercent: boolean) => {
    if (e.key === 'Enter') {
      handleCellBlur(rowIdx, field, colIdx, isPercent);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const getRowStyle = (rowType: string) => {
    switch (rowType) {
      case 'total':
        return 'bg-yellow-50/50 font-semibold';
      case 'ebitda':
        return 'bg-blue-50/50 font-medium';
      case 'profit':
        return 'bg-green-50/50';
      case 'debt':
        return 'bg-red-50/30';
      case 'dscr':
        return 'bg-purple-50/50 font-medium';
      case 'header':
        return 'bg-gray-100 font-bold';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle icon={BarChart3} title="ประมาณรายได้กิจการ (Revenue Projection)" />

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs border-collapse">
          <thead>
            {/* Row 1: Section headers */}
            <tr className="bg-muted/50">
              <th rowSpan={2} className="border border-border p-2 text-left font-bold min-w-[200px] sticky left-0 bg-muted/50 z-10">
                รายการ
              </th>
              <th colSpan={taxYears.length * 2} className="border border-border p-2 text-center font-bold">
                งบการเงินสรรพากร
              </th>
              <th colSpan={projectionYears.length * 2} className="border border-border p-2 text-center font-bold bg-blue-50">
                ประมาณการ
              </th>
            </tr>
            
            {/* Row 2: Year headers */}
            <tr className="bg-muted/30">
              {taxYears.map((year, idx) => (
                <React.Fragment key={`tax-${idx}`}>
                  <th className="border border-border p-2 text-center font-medium min-w-[100px] relative group">
                    <div>{year.year}</div>
                    {year.period && <div className="text-[10px] text-muted-foreground">{year.period}</div>}
                    {taxYears.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full"
                        onClick={() => deleteTaxYear(idx)}
                        title={`ลบ ${year.year}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </th>
                  <th className="border border-border p-2 text-center font-medium min-w-[60px]">%</th>
                </React.Fragment>
              ))}
              {projectionYears.map((year, idx) => (
                <React.Fragment key={`proj-${idx}`}>
                  <th className="border border-border p-2 text-center font-medium min-w-[100px] bg-blue-50 relative group">
                    <div>{year.year}</div>
                    {year.period && <div className="text-[10px] text-muted-foreground">{year.period}</div>}
                    {projectionYears.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full"
                        onClick={() => deleteProjectionYear(idx)}
                        title={`ลบ ${year.year}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </th>
                  <th className="border border-border p-2 text-center font-medium min-w-[60px] bg-blue-50">%</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className={`hover:bg-muted/10 ${getRowStyle(row.rowType)}`}>
                <td 
                  className="border border-border p-2 font-medium sticky left-0 bg-background z-10"
                  style={{ paddingLeft: `${(row.indent || 0) * 16 + 8}px` }}
                >
                  {row.label}
                </td>
                
                {/* Tax year data */}
                {row.taxData.map((value, colIdx) => {
                  const dataCellId = `tax-data-${rowIdx}-${colIdx}`;
                  const percentCellId = `tax-percent-${rowIdx}-${colIdx}`;
                  
                  return (
                    <React.Fragment key={`tax-data-${colIdx}`}>
                      <td className="border border-border p-1">
                        {editingCell === dataCellId ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(rowIdx, 'taxData', colIdx, false)}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, 'taxData', colIdx, false)}
                            className="h-7 text-xs text-right border-border"
                            autoFocus
                          />
                        ) : (
                          <div 
                            className="h-7 px-2 text-xs text-right flex items-center justify-end cursor-pointer hover:bg-muted/20"
                            onClick={() => handleCellClick(dataCellId, value, false)}
                          >
                            {formatDisplayValue(value, false)}
                          </div>
                        )}
                      </td>
                      <td className="border border-border p-1">
                        {editingCell === percentCellId ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(rowIdx, 'taxPercent', colIdx, true)}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, 'taxPercent', colIdx, true)}
                            className="h-7 text-xs text-right border-border"
                            autoFocus
                            step="0.01"
                          />
                        ) : (
                          <div 
                            className="h-7 px-2 text-xs text-right flex items-center justify-end cursor-pointer hover:bg-muted/20"
                            onClick={() => handleCellClick(percentCellId, row.taxPercent[colIdx], true)}
                          >
                            {formatDisplayValue(row.taxPercent[colIdx], true)}
                          </div>
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}
                
                {/* Projection data */}
                {row.projectionData.map((value, colIdx) => {
                  const dataCellId = `proj-data-${rowIdx}-${colIdx}`;
                  const percentCellId = `proj-percent-${rowIdx}-${colIdx}`;
                  
                  return (
                    <React.Fragment key={`proj-data-${colIdx}`}>
                      <td className="border border-border p-1 bg-blue-50/30">
                        {editingCell === dataCellId ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(rowIdx, 'projectionData', colIdx, false)}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, 'projectionData', colIdx, false)}
                            className="h-7 text-xs text-right border-border"
                            autoFocus
                          />
                        ) : (
                          <div 
                            className="h-7 px-2 text-xs text-right flex items-center justify-end cursor-pointer hover:bg-muted/20"
                            onClick={() => handleCellClick(dataCellId, value, false)}
                          >
                            {formatDisplayValue(value, false)}
                          </div>
                        )}
                      </td>
                      <td className="border border-border p-1 bg-blue-50/30">
                        {editingCell === percentCellId ? (
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => handleCellBlur(rowIdx, 'projectionPercent', colIdx, true)}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, 'projectionPercent', colIdx, true)}
                            className="h-7 text-xs text-right border-border"
                            autoFocus
                            step="0.01"
                          />
                        ) : (
                          <div 
                            className="h-7 px-2 text-xs text-right flex items-center justify-end cursor-pointer hover:bg-muted/20"
                            onClick={() => handleCellClick(percentCellId, row.projectionPercent[colIdx], true)}
                          >
                            {formatDisplayValue(row.projectionPercent[colIdx], true)}
                          </div>
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Legacy component for old format (kept for backward compatibility)
function LegacyRevenueProjection({ data, onUpdate }: RevenueProjectionSectionProps) {
  return (
    <div className="space-y-6">
      <SectionTitle icon={BarChart3} title="ประมาณรายได้ (Revenue Projection) - รูปแบบเก่า" />
      <div className="p-4 bg-muted/20 rounded-lg border border-border">
        <p className="text-sm text-muted-foreground">
          ข้อมูลประมาณการแบบรายเดือน (รูปแบบเก่า)
        </p>
        {data?.monthlyProjections && data.monthlyProjections.length > 0 && (
          <p className="text-sm mt-2">
            จำนวนเดือน: {data.monthlyProjections.length} เดือน
          </p>
        )}
      </div>
    </div>
  );
}
