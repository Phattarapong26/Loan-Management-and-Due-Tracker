import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Plus, Trash2, ShieldCheck, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { customersApi } from '@/shared/lib/api-endpoints';
import { EditableSection } from '../EditableSection';
import { useEditableData } from '../../hooks/useEditableData';

// Types for AI extracted credit bureau data matching ParsedBusinessProfile
type CBAccount = {
  bank?: string;
  accountType?: string;
  openDate?: string;
  creditLimit?: number;
  outstanding?: number;
  monthlyPayment?: number;
  paymentStatus?: string;
  [key: string]: unknown;
};

type CBReport = {
  borrowerName?: string;
  subjectName?: string;
  subjectType?: 'borrower' | 'guarantor' | string;
  reportDate?: string;
  totalCreditLimit?: number;
  totalLimit?: number;
  totalOutstanding?: number;
  creditUtilization?: number;
  nplAccounts?: number;
  accounts?: CBAccount[];
  records?: CBAccount[];
  [key: string]: unknown;
};

type AIData = {
  creditBureauReports?: CBReport[];
  [key: string]: unknown;
};

interface CreditBureauSectionProps {
  aiData?: AIData | null;
  hasAIData: boolean;
  customerId: string;
  formatCurrency: (amount: number) => string;
}

export function CreditBureauSection({ aiData, customerId, formatCurrency }: CreditBureauSectionProps) {
  const initialData = {
    creditBureauReports: aiData?.creditBureauReports || [],
  };

  const {
    isEditing,
    editedData,
    isSaving,
    handleEdit,
    handleSave,
    handleCancel,
    updateField,
  } = useEditableData({
    initialData,
    updateFn: (data) => customersApi.updateWithAIData(customerId, data, 100, []),
    queryKey: ['customer', customerId],
  });

  // Format date to show only date without time
  const formatDateOnly = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      // Use international format to avoid Buddhist calendar conversion
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      // If it's already in a simple format, return as is
      return dateStr.split(' ')[0]; // Take only the date part if there's a space
    }
  };

  const updateReportField = (reportIdx: number, field: string, value: string | number) => {
    const newReports = [...(editedData.creditBureauReports as CBReport[])];
    newReports[reportIdx] = { ...newReports[reportIdx], [field]: value };
    updateField('creditBureauReports', newReports);
  };

  const addReport = () => {
    const newReport: CBReport = {
      borrowerName: '',
      reportDate: '',
      totalCreditLimit: 0,
      totalOutstanding: 0,
      creditUtilization: 0,
      nplAccounts: 0,
      accounts: []
    };
    updateField('creditBureauReports', [...(editedData.creditBureauReports as CBReport[]), newReport]);
  };

  const removeReport = (idx: number) => {
    const newReports = [...(editedData.creditBureauReports as CBReport[])];
    newReports.splice(idx, 1);
    updateField('creditBureauReports', newReports);
  };

  const addAccount = (reportIdx: number) => {
    const newReports = [...(editedData.creditBureauReports as CBReport[])];
    const report = { ...newReports[reportIdx] };
    report.accounts = [...(report.accounts || []), { 
      bank: '', 
      accountType: '', 
      openDate: '', 
      creditLimit: 0, 
      outstanding: 0, 
      monthlyPayment: 0, 
      paymentStatus: '' 
    }];
    newReports[reportIdx] = report;
    updateField('creditBureauReports', newReports);
  };

  const removeAccount = (reportIdx: number, accIdx: number) => {
    const newReports = [...(editedData.creditBureauReports as CBReport[])];
    const report = { ...newReports[reportIdx] };
    const newAccounts = [...(report.accounts || [])];
    newAccounts.splice(accIdx, 1);
    report.accounts = newAccounts;
    newReports[reportIdx] = report;
    updateField('creditBureauReports', newReports);
  };

  const updateAccount = (reportIdx: number, accIdx: number, field: string, value: string | number) => {
    const newReports = [...(editedData.creditBureauReports as CBReport[])];
    const report = { ...newReports[reportIdx] };
    const newAccounts = [...(report.accounts || [])];
    newAccounts[accIdx] = { ...newAccounts[accIdx], [field]: value };
    report.accounts = newAccounts;
    newReports[reportIdx] = report;
    updateField('creditBureauReports', newReports);
  };

  return (
    <Card className="overflow-hidden border-none shadow-lg bg-white">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
        <EditableSection
          title="รายงานเครดิตบูโร"
          icon={<ShieldCheck className="h-5 w-5 text-indigo-600" />}
          isEditing={isEditing}
          onEdit={handleEdit}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        >
          {null}
        </EditableSection>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Add Report Button */}
        {isEditing && (
          <div className="flex justify-end">
            <Button size="sm" onClick={addReport} variant="outline" className="h-8 gap-1 hover:bg-indigo-50 hover:border-indigo-300">
              <Plus className="w-3.5 h-3.5" /> เพิ่มรายงาน
            </Button>
          </div>
        )}

        {/* Empty State */}
        {(editedData.creditBureauReports as CBReport[] || []).length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/30">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500 mb-2">ไม่พบข้อมูลเครดิตบูโร</p>
            {isEditing && (
              <Button onClick={addReport} variant="outline" size="sm" className="mt-2">
                <Plus className="h-3.5 w-3.5 mr-1" /> เพิ่มรายงานแรก
              </Button>
            )}
          </div>
        )}

        {/* Credit Bureau Reports */}
        {(editedData.creditBureauReports as CBReport[] || []).map((report, idx) => (
          <div key={idx} className="relative border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            {/* Header Section */}
            <div className="bg-white p-5 border-b border-indigo-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">รายงานที่ {idx + 1}</h3>
                    <p className="text-xs text-gray-500">ข้อมูลเครดิตบูโรของผู้กู้และผู้ค้ำประกัน</p>
                  </div>
                </div>
                {isEditing && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeReport(idx)}
                    className="h-8 w-8 p-0 text-destructive hover:bg-red-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Borrower Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white  p-3">
                  <label className="text-xs text-gray-500 block mb-1.5 font-medium">ชื่อผู้กู้/กรรมการ/ผู้ค้ำประกัน</label>
                  {isEditing ? (
                    <Input 
                      value={report.borrowerName || report.subjectName || ''} 
                      onChange={(e) => updateReportField(idx, 'borrowerName', e.target.value)}
                      className="h-8 text-sm font-bold"
                      placeholder="ชื่อผู้กู้..."
                    />
                  ) : (
                    <div className="text-sm font-bold text-gray-900">
                      {report.borrowerName || report.subjectName || '-'}
                    </div>
                  )}
                </div>
                <div className="bg-white  p-3 ">
                  <label className="text-xs text-gray-500 block mb-1.5 font-medium">ตรวจสอบ ณ วันที่</label>
                  {isEditing ? (
                    <Input 
                      value={report.reportDate || ''} 
                      onChange={(e) => updateReportField(idx, 'reportDate', e.target.value)}
                      className="h-8 text-sm font-semibold"
                      placeholder="วันที่..."
                    />
                  ) : (
                    <div className="text-sm font-bold text-gray-900">
                      {formatDateOnly(report.reportDate || '')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">วงเงินรวม</label>
                  <div className="text-lg font-bold text-foreground">
                    {formatCurrency((report.totalCreditLimit || report.totalLimit || 0))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">ภาระหนี้รวม</label>
                  <div className="text-lg font-bold text-foreground">
                    {formatCurrency(report.totalOutstanding || 0)}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">อัตราการใช้วงเงิน</label>
                  <div className="text-lg font-bold text-foreground">
                    {(report.creditUtilization || 0).toFixed(2)}%
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">บัญชี NPL</label>
                  <div className="text-lg font-bold text-destructive">
                    {report.nplAccounts || 0}
                  </div>
                </div>
              </div>
              
              {/* Accounts Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold text-foreground uppercase tracking-widest">ประวัติการติดต่อกับสถาบันการเงิน</h5>
                  {isEditing && (
                    <Button size="sm" variant="ghost" onClick={() => addAccount(idx)} className="h-7 text-xs text-primary hover:bg-primary/5">
                      <Plus className="w-3.5 h-3.5 mr-1" /> เพิ่มบัญชี
                    </Button>
                  )}
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-center py-3 px-2 text-muted-foreground font-bold text-xs">ลำดับ</th>
                        <th className="text-left py-3 px-3 text-muted-foreground font-bold text-xs">ชื่อสถาบันการเงิน</th>
                        <th className="text-left py-3 px-3 text-muted-foreground font-bold text-xs">ประเภทสินเชื่อ</th>
                        <th className="text-left py-3 px-3 text-muted-foreground font-bold text-xs">วันที่เปิดบัญชี</th>
                        <th className="text-right py-3 px-3 text-muted-foreground font-bold text-xs">วงเงิน</th>
                        <th className="text-right py-3 px-3 text-muted-foreground font-bold text-xs">ภาระหนี้</th>
                        <th className="text-right py-3 px-3 text-muted-foreground font-bold text-xs">ยอดผ่อนชำระต่อเดือน</th>
                        <th className="text-center py-3 px-3 text-muted-foreground font-bold text-xs">สถานะปัจจุบัน</th>
                        {isEditing && <th className="text-right py-3 px-2 w-10"></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(report.accounts || report.records || []).map((acc, accIdx) => (
                        <tr key={accIdx} className="border-b border-border/50 group/acc hover:bg-background/50 transition-colors">
                          <td className="py-2 px-2 text-center text-muted-foreground font-medium">
                            {accIdx + 1}
                          </td>
                          <td className="py-2 px-1">
                            {isEditing ? (
                              <Input 
                                value={acc.bank || ''} 
                                onChange={(e) => updateAccount(idx, accIdx, 'bank', e.target.value)}
                                className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                                placeholder="ธนาคาร..."
                              />
                            ) : (
                              <span className="px-2">{acc.bank || '-'}</span>
                            )}
                          </td>
                          <td className="py-2 px-1">
                            {isEditing ? (
                              <Input 
                                value={acc.accountType || ''} 
                                onChange={(e) => updateAccount(idx, accIdx, 'accountType', e.target.value)}
                                className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                                placeholder="ประเภท..."
                              />
                            ) : (
                              <span className="px-2">{acc.accountType || '-'}</span>
                            )}
                          </td>
                          <td className="py-2 px-1">
                            {isEditing ? (
                              <Input 
                                value={acc.openDate || ''} 
                                onChange={(e) => updateAccount(idx, accIdx, 'openDate', e.target.value)}
                                className="h-8 text-xs bg-transparent border-transparent hover:border-border"
                                placeholder="วันที่..."
                              />
                            ) : (
                              <span className="px-2">{formatDateOnly(acc.openDate || '')}</span>
                            )}
                          </td>
                          <td className="py-2 px-1">
                            {isEditing ? (
                              <Input 
                                type="number"
                                value={acc.creditLimit || 0} 
                                onChange={(e) => updateAccount(idx, accIdx, 'creditLimit', parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                              />
                            ) : (
                              <div className="text-right px-2 font-mono text-xs">
                                {formatCurrency(acc.creditLimit || 0)}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-1">
                            {isEditing ? (
                              <Input 
                                type="number"
                                value={acc.outstanding || 0} 
                                onChange={(e) => updateAccount(idx, accIdx, 'outstanding', parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border font-medium"
                              />
                            ) : (
                              <div className="text-right px-2 font-mono text-xs font-medium">
                                {formatCurrency(acc.outstanding || 0)}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-1">
                            {isEditing ? (
                              <Input 
                                type="number"
                                value={acc.monthlyPayment || 0} 
                                onChange={(e) => updateAccount(idx, accIdx, 'monthlyPayment', parseFloat(e.target.value) || 0)}
                                className="h-8 text-xs text-right bg-transparent border-transparent hover:border-border"
                              />
                            ) : (
                              <div className="text-right px-2 font-mono text-xs">
                                {formatCurrency(acc.monthlyPayment || 0)}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-1 text-center">
                            {isEditing ? (
                              <Input 
                                value={acc.paymentStatus || ''} 
                                onChange={(e) => updateAccount(idx, accIdx, 'paymentStatus', e.target.value)}
                                className="h-8 text-xs text-center bg-transparent border-transparent hover:border-border"
                                placeholder="ปกติ"
                              />
                            ) : (
                              <Badge variant="outline" className={`text-xs py-0 h-5 ${
                                (acc.paymentStatus || '').toLowerCase().includes('npl') || 
                                (acc.paymentStatus || '').toLowerCase().includes('ค้าง')
                                  ? 'border-destructive/20 bg-destructive/10 text-destructive'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-600'
                              }`}>
                                {acc.paymentStatus || 'ปกติ'}
                              </Badge>
                            )}
                          </td>
                          {isEditing && (
                            <td className="py-2 px-1 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => removeAccount(idx, accIdx)}
                                className="h-7 w-7 p-0 text-destructive opacity-0 group-hover/acc:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                      {(report.accounts || report.records || []).length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-muted-foreground italic">
                            ไม่มีรายการบัญชี
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ))}
        </CardContent>
      </Card>
    );
  }
