import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Eye,
} from 'lucide-react';
import { CustomerDueStatus, collectionsApi, CollectionAction } from '../api/collections.api';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { cn } from '@/shared/lib/utils';

interface CollectionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerDueStatus | null;
}

export function CollectionHistoryDialog({
  open,
  onOpenChange,
  customer,
}: CollectionHistoryDialogProps) {
  const [selectedRecord, setSelectedRecord] = useState<CollectionAction | null>(null);

  // Fetch collection history from API
  const { data: collectionHistory, isLoading } = useQuery({
    queryKey: ['collectionHistory', customer?.customerId, customer?.loanId],
    queryFn: async () => {
      if (!customer) return [];
      const response = await collectionsApi.getCustomerCollectionHistory(
        customer.customerId, 
        customer.loanId
      );
      return response.data;
    },
    enabled: !!customer && open,
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CALL': return Phone;
      case 'SMS': return MessageSquare;
      case 'EMAIL': return Mail;
      case 'VISIT': return MapPin;
      case 'PAYMENT_PLAN': return Calendar;
      case 'LEGAL': return FileText;
      case 'RESTRUCTURE': return FileText;
      case 'SETTLEMENT': return FileText;
      default: return Clock;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'CALL': return 'โทรติดต่อ';
      case 'SMS': return 'ส่ง SMS';
      case 'EMAIL': return 'ส่งอีเมล';
      case 'VISIT': return 'เยี่ยมลูกค้า';
      case 'PAYMENT_PLAN': return 'แผนผ่อนชำระ';
      case 'LEGAL': return 'ดำเนินการทางกฎหมาย';
      case 'RESTRUCTURE': return 'ปรับโครงสร้างหนี้';
      case 'SETTLEMENT': return 'เจรจาตั้งหนี้';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FAILED': return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return CheckCircle;
      case 'PENDING': return Clock;
      case 'IN_PROGRESS': return Clock;
      case 'FAILED': return XCircle;
      case 'CANCELLED': return XCircle;
      default: return Clock;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'เสร็จสิ้น';
      case 'PENDING': return 'รอดำเนินการ';
      case 'IN_PROGRESS': return 'กำลังดำเนินการ';
      case 'FAILED': return 'ไม่สำเร็จ';
      case 'CANCELLED': return 'ยกเลิก';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            ประวัติการติดตามหนี้
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Info */}
          <div className="bg-muted/30 rounded-xl p-4 border">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-lg">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{customer.customerName}</h3>
                <p className="text-sm text-muted-foreground">
                  งวดที่ {customer.paymentNumber} • {customer.customerPhone}
                </p>
              </div>
            </div>
          </div>

          {/* History List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[500px]">
            {/* Records List */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg mb-3">รายการติดตาม</h3>
              <ScrollArea className="h-[450px] pr-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {collectionHistory?.map((record) => {
                      const TypeIcon = getTypeIcon(record.actionType);
                      const StatusIcon = getStatusIcon(record.status);
                      
                      return (
                        <button
                          key={record.id}
                          onClick={() => setSelectedRecord(record)}
                          className={cn(
                            'w-full text-left p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md',
                            selectedRecord?.id === record.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                              <TypeIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">
                                  {getTypeLabel(record.actionType)}
                                </span>
                                <Badge className={cn('text-xs', getStatusColor(record.status))}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {getStatusLabel(record.status)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">
                                {format(new Date(record.createdAt), 'dd MMM yyyy HH:mm', { locale: th })}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {record.notes || 'ไม่มีหมายเหตุ'}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Record Details */}
            <div className="border rounded-lg">
              <div className="p-4 border-b bg-muted/30">
                <h3 className="font-semibold text-lg">รายละเอียด</h3>
              </div>
              <div className="p-4">
                {selectedRecord ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const TypeIcon = getTypeIcon(selectedRecord.actionType);
                        const StatusIcon = getStatusIcon(selectedRecord.status);
                        return (
                          <>
                            <div className="bg-primary/10 p-3 rounded-lg">
                              <TypeIcon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg">
                                {getTypeLabel(selectedRecord.actionType)}
                              </h4>
                              <div className="flex items-center gap-2">
                                <Badge className={cn('text-sm', getStatusColor(selectedRecord.status))}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {getStatusLabel(selectedRecord.status)}
                                </Badge>
                                {selectedRecord.requiresApproval && selectedRecord.approvalStatus && (
                                  <Badge variant="outline" className="text-xs">
                                    {selectedRecord.approvalStatus === 'PENDING' ? 'รออนุมัติ' :
                                     selectedRecord.approvalStatus === 'APPROVED' ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ'}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">วันที่ดำเนินการ</label>
                        <p className="text-sm">
                          {format(new Date(selectedRecord.createdAt), 'dd MMMM yyyy เวลา HH:mm น.', { locale: th })}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">ผู้ดำเนินการ</label>
                        <p className="text-sm">{`${selectedRecord.agent.firstName} ${selectedRecord.agent.lastName}`}</p>
                      </div>

                      {selectedRecord.amount && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">จำนวนเงิน</label>
                          <p className="text-sm font-semibold text-primary">
                            {formatCurrency(selectedRecord.amount)}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium text-muted-foreground">หมายเหตุ</label>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">
                          {selectedRecord.notes || 'ไม่มีหมายเหตุ'}
                        </p>
                      </div>

                      {selectedRecord.result && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">ผลการดำเนินการ</label>
                          <p className="text-sm font-medium">{selectedRecord.result}</p>
                        </div>
                      )}

                      {selectedRecord.followUpDate && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">วันที่ติดตามครั้งถัดไป</label>
                          <p className="text-sm">
                            {format(new Date(selectedRecord.followUpDate), 'dd MMMM yyyy', { locale: th })}
                          </p>
                        </div>
                      )}

                      {selectedRecord.completedAt && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">วันที่เสร็จสิ้น</label>
                          <p className="text-sm">
                            {format(new Date(selectedRecord.completedAt), 'dd MMMM yyyy เวลา HH:mm น.', { locale: th })}
                          </p>
                        </div>
                      )}

                      {selectedRecord.approver && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">ผู้อนุมัติ</label>
                          <p className="text-sm">{`${selectedRecord.approver.firstName} ${selectedRecord.approver.lastName}`}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Eye className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">เลือกรายการเพื่อดูรายละเอียด</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}