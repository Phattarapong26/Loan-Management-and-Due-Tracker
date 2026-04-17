import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { LineChart, History, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/shared/lib/api-client';

interface InterestHistory {
  id: string;
  loanId: string;
  paymentNumber: number;
  outstandingBalance: number;
  appliedRate: number;
  tierName: string | null;
  gracePeriodDays: number;
  interestAmount: number;
  calculatedAt: string;
  effectiveDate: string;
  loan: {
    id: string;
    principal: number;
    interestRate: number;
    status: string;
    customer: {
      id: string;
      businessName: string;
    };
  };
}

interface RateChange {
  effectiveDate: string;
  oldRate: number | null;
  newRate: number;
  change: number | null;
  paymentNumber: number;
}

interface InterestHistoryViewerProps {
  loanId: string;
}

const InterestHistoryViewer: React.FC<InterestHistoryViewerProps> = ({ loanId }) => {
  const [history, setHistory] = useState<InterestHistory[]>([]);
  const [rateChanges, setRateChanges] = useState<RateChange[]>([]);
  const [totalStats, setTotalStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [loanId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyRes, changesRes, totalRes] = await Promise.all([
        apiClient.get(`/api/loan-interest-history/loan/${loanId}`),
        apiClient.get(`/api/loan-interest-history/loan/${loanId}/rate-changes`),
        apiClient.get(`/api/loan-interest-history/loan/${loanId}/total`),
      ]);
      setHistory(historyRes.data as InterestHistory[]);
      setRateChanges(changesRes.data as RateChange[]);
      setTotalStats(totalRes.data);
    } catch (error) {
      toast.error('ไม่สามารถโหลดข้อมูลได้');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('th-TH');
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('th-TH');
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {totalStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ดอกเบี้ยรวม</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalStats.totalInterest)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">จำนวนบันทึก</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {totalStats.recordCount}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">อัตราเฉลี่ย</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(totalStats.averageRate * 100).toFixed(2)}%
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ช่วงอัตรา</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-orange-600">
                {(totalStats.minRate * 100).toFixed(2)}% - {(totalStats.maxRate * 100).toFixed(2)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rate Changes Timeline */}
      {rateChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              <span>ประวัติการเปลี่ยนแปลงอัตราดอกเบี้ย</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rateChanges.map((change, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                  <div className="flex-shrink-0 mt-1">
                    {change.change === null ? (
                      <LineChart className="h-5 w-5 text-blue-600" />
                    ) : change.change > 0 ? (
                      <TrendingUp className="h-5 w-5 text-red-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {formatDate(change.effectiveDate)} - งวดที่ {change.paymentNumber}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {change.oldRate !== null && (
                        <>
                          <span className="line-through text-muted-foreground">
                            {(change.oldRate * 100).toFixed(2)}%
                          </span>
                          <span>→</span>
                        </>
                      )}
                      <Badge variant={change.change === null ? 'default' : change.change > 0 ? 'destructive' : 'secondary'}>
                        {(change.newRate * 100).toFixed(2)}%
                      </Badge>
                      {change.change !== null && (
                        <span className={change.change > 0 ? 'text-red-600' : 'text-green-600'}>
                          ({change.change > 0 ? '+' : ''}{(change.change * 100).toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              <span>ประวัติการคำนวณดอกเบี้ย</span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>งวดที่</TableHead>
                  <TableHead>วันที่มีผล</TableHead>
                  <TableHead>ยอดคงเหลือ</TableHead>
                  <TableHead>อัตราดอกเบี้ย</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Grace Period</TableHead>
                  <TableHead>ดอกเบี้ย</TableHead>
                  <TableHead>คำนวณเมื่อ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      กำลังโหลด...
                    </TableCell>
                  </TableRow>
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ไม่มีข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.paymentNumber}</TableCell>
                      <TableCell>{formatDate(record.effectiveDate)}</TableCell>
                      <TableCell>{formatCurrency(record.outstandingBalance)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {(record.appliedRate * 100).toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{record.tierName || '-'}</TableCell>
                      <TableCell>{record.gracePeriodDays} วัน</TableCell>
                      <TableCell className="font-bold text-red-600">
                        {formatCurrency(record.interestAmount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(record.calculatedAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {history.length > 0 && (
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                ทั้งหมด {history.length} รายการ
              </span>
              <div className="text-right">
                <span className="text-sm text-muted-foreground mr-2">รวมดอกเบี้ย:</span>
                <span className="text-lg font-bold text-red-600">
                  {formatCurrency(history.reduce((sum, record) => sum + record.interestAmount, 0))}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InterestHistoryViewer;
