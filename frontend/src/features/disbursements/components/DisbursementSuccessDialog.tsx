import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { CheckCircle, DollarSign, User, Calendar, FileText } from 'lucide-react';

interface DisbursementSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disbursementData: {
    customerName: string;
    amount: number;
    disbursementNo?: number;
    referenceNo?: string;
    disbursementMethod?: string;
  } | null;
  formatCurrency: (amount: number) => string;
}

export function DisbursementSuccessDialog({
  open,
  onOpenChange,
  disbursementData,
  formatCurrency,
}: DisbursementSuccessDialogProps) {
  if (!disbursementData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        {/* Success Animation Header */}
        <div className="relative px-8 py-12 bg-gradient-to-br from-emerald-500 to-green-600 overflow-hidden">
          {/* Animated circles background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
          </div>
          
          {/* Success Icon */}
          <div className="relative flex flex-col items-center gap-4">
            <div className="relative">
              {/* Pulse animation */}
              <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75" />
              <div className="relative h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-2xl">
                <CheckCircle className="h-12 w-12 text-emerald-600" />
              </div>
            </div>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                เบิกจ่ายเงินสำเร็จ!
              </h2>
              <p className="text-emerald-50 text-sm">
                ระบบได้บันทึกการเบิกจ่ายเรียบร้อยแล้ว
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 h-12 text-base font-semibold"
          >
            เสร็จสิ้น
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
