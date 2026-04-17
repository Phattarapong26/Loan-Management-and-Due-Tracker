import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Separator } from '@/shared/components/ui/separator';
import { UserAvatar } from '@/shared/components/ui/user-avatar';
import { 
  User, 
  DollarSign, 
  Calendar, 
  FileText, 
  Building2,
  CreditCard,
  CheckCircle,
  X
} from 'lucide-react';
import { Disbursement } from '@/shared/lib/api-endpoints';

interface TransactionDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTransaction: Disbursement | null;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
}

export function TransactionDetailDialog({
  open,
  onOpenChange,
  selectedTransaction,
  formatCurrency,
  formatDate,
}: TransactionDetailDialogProps) {
  if (!selectedTransaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            รายละเอียดรายการรอเบิกจ่าย
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              ข้อมูลลูกค้า
            </h3>
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <UserAvatar 
                src={selectedTransaction.loan.customer.avatar} 
                name={selectedTransaction.loan.customer.businessName} 
                size="lg" 
                className="h-16 w-16" 
              />
              <div className="flex-1">
                <p className="font-semibold text-lg">{selectedTransaction.loan.customer.businessName}</p>
                <p className="text-sm text-muted-foreground">{selectedTransaction.loan.customer.customerCode}</p>
              </div>
              <Badge className="bg-success/10 text-success">
                <CheckCircle className="h-3 w-3 mr-1" />
                พร้อมเบิกจ่าย
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Transaction Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              ข้อมูลการเบิกจ่าย
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">งวดที่</p>
                <p className="font-semibold">#{selectedTransaction.disbursementNo}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">จำนวนเงิน</p>
                <p className="font-semibold text-lg text-primary">{formatCurrency(selectedTransaction.amount)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">วันที่ขอเบิก</p>
                <p className="font-semibold">{formatDate(selectedTransaction.requestedDate)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">วัตถุประสงค์</p>
                <p className="font-semibold text-sm">{selectedTransaction.purpose}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Loan Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              ข้อมูลสัญญาสินเชื่อ
            </h3>
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">วงเงินรวม</p>
                <p className="font-semibold">{formatCurrency(selectedTransaction.loan.principal)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">เบิกไปแล้ว</p>
                <p className="font-semibold text-info">{formatCurrency(selectedTransaction.loan.totalDisbursed)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">คงเหลือ</p>
                <p className="font-semibold text-success">
                  {formatCurrency(
                    Number(selectedTransaction.loan.remainingAmount) || 
                    Number(selectedTransaction.loan.principal)
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {selectedTransaction.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">หมายเหตุ</h3>
                <p className="text-sm p-3 bg-muted/50 rounded-lg">{selectedTransaction.notes}</p>
              </div>
            </>
          )}

          {/* Disbursement Advice Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900">หนังสือแจ้งการเบิกจ่ายเงินกู้</p>
                <p className="text-xs text-blue-700 mt-1">
                  เมื่อเบิกจ่ายเงินแล้ว ระบบจะสร้างหนังสือแจ้งการเบิกจ่าย PDF และส่งให้ลูกค้าอัตโนมัติ 
                  พร้อมล็อคไฟล์ด้วยรหัสเพื่อความปลอดภัย
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            ปิด
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
