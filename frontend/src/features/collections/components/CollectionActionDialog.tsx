import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  Phone,
  MessageSquare,
  FileText,
  AlertTriangle,
  Calendar,
  DollarSign,
  Clock,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  Mail,
  CreditCard,
  Scale,
  Building2,
  User,
  MapPin,
} from 'lucide-react';
import { CustomerDueStatus, collectionsApi, CreateCollectionActionInput } from '../api/collections.api';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';

interface CollectionActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerDueStatus | null;
  variant: 'critical' | 'overdue' | 'today' | 'soon';
}

interface CollectionAction {
  id: string;
  type: 'CALL' | 'SMS' | 'EMAIL' | 'VISIT' | 'PAYMENT_PLAN' | 'RESTRUCTURE' | 'SETTLEMENT' | 'LEGAL';
  title: string;
  description: string;
  icon: React.ElementType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  availableFor: ('critical' | 'overdue' | 'today' | 'soon')[];
  requiresApproval?: boolean;
  estimatedTime?: string;
}

const collectionActions: CollectionAction[] = [
  {
    id: 'call',
    type: 'CALL',
    title: 'โทรติดต่อ',
    description: 'โทรแจ้งเตือนการชำระเงิน',
    icon: Phone,
    severity: 'low',
    availableFor: ['critical', 'overdue', 'today', 'soon'],
    estimatedTime: '5-10 นาที',
  },
  {
    id: 'sms',
    type: 'SMS', 
    title: 'ส่ง SMS',
    description: 'ส่งข้อความแจ้งเตือนการชำระ',
    icon: MessageSquare,
    severity: 'low',
    availableFor: ['critical', 'overdue', 'today', 'soon'],
    estimatedTime: '1-2 นาที',
  },
  {
    id: 'email',
    type: 'EMAIL',
    title: 'ส่งอีเมล',
    description: 'ส่งหนังสือแจ้งเตือนทางอีเมล',
    icon: Mail,
    severity: 'medium',
    availableFor: ['critical', 'overdue', 'today', 'soon'],
    estimatedTime: '3-5 นาที',
  },
  {
    id: 'visit',
    type: 'VISIT',
    title: 'เยี่ยมลูกค้า',
    description: 'นัดหมายเยี่ยมลูกค้าที่สถานประกอบการ',
    icon: MapPin,
    severity: 'high',
    availableFor: ['critical', 'overdue'],
    requiresApproval: true,
    estimatedTime: '2-4 ชั่วโมง',
  },
  {
    id: 'payment_plan',
    type: 'PAYMENT_PLAN',
    title: 'จัดแผนผ่อนชำระ',
    description: 'เสนอแผนการผ่อนชำระใหม่',
    icon: Calendar,
    severity: 'medium',
    availableFor: ['critical', 'overdue'],
    requiresApproval: true,
    estimatedTime: '30-60 นาที',
  },
  {
    id: 'restructure',
    type: 'RESTRUCTURE',
    title: 'ปรับโครงสร้างหนี้',
    description: 'เสนอการปรับโครงสร้างเงื่อนไขสินเชื่อ',
    icon: CreditCard,
    severity: 'high',
    availableFor: ['critical'],
    requiresApproval: true,
    estimatedTime: '1-2 ชั่วโมง',
  },
  {
    id: 'settlement',
    type: 'SETTLEMENT',
    title: 'เจรจาตั้งหนี้',
    description: 'เจรจาการตั้งหนี้สูญหรือลดหนี้',
    icon: DollarSign,
    severity: 'critical',
    availableFor: ['critical'],
    requiresApproval: true,
    estimatedTime: '2-4 ชั่วโมง',
  },
  {
    id: 'legal',
    type: 'LEGAL',
    title: 'ดำเนินการทางกฎหมาย',
    description: 'ส่งเรื่องให้ฝ่ายกฎหมายดำเนินการ',
    icon: Scale,
    severity: 'critical',
    availableFor: ['critical'],
    requiresApproval: true,
    estimatedTime: '1-2 สัปดาห์',
  },
];

export function CollectionActionDialog({
  open,
  onOpenChange,
  customer,
  variant,
}: CollectionActionDialogProps) {
  const [selectedAction, setSelectedAction] = useState<CollectionAction | null>(null);
  const [notes, setNotes] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [contactMethod, setContactMethod] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryClient = useQueryClient();

  // Create collection action mutation
  const createActionMutation = useMutation({
    mutationFn: async (actionData: CreateCollectionActionInput) => {
      const response = await collectionsApi.createCollectionAction(actionData);
      return response.data;
    },
    onSuccess: (data) => {
      const actionTitle = selectedAction?.title || 'การดำเนินการ';
      
      if (data.requiresApproval) {
        toast.success(`✅ ส่งขออนุมัติ ${actionTitle} สำเร็จ`, {
          description: `ส่งคำขออนุมัติ ${actionTitle} สำหรับ ${customer?.customerName} เรียบร้อยแล้ว`,
        });
      } else {
        toast.success(`✅ ${actionTitle} สำเร็จ`, {
          description: `ดำเนินการ ${actionTitle} สำหรับ ${customer?.customerName} เรียบร้อยแล้ว`,
        });
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['collectionDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['collectionActions'] });
      
      onOpenChange(false);
      setSelectedAction(null);
    },
    onError: (error: any) => {
      toast.error('❌ เกิดข้อผิดพลาด', {
        description: error.response?.data?.error?.message || 'ไม่สามารถดำเนินการได้ กรุณาลองใหม่อีกครั้ง',
      });
    },
  });

  // Filter actions based on variant
  const availableActions = collectionActions.filter(action =>
    action.availableFor.includes(variant)
  );

  const handleActionSelect = (action: CollectionAction) => {
    setSelectedAction(action);
    setNotes('');
    setFollowUpDate('');
    setContactMethod('');
    setAmount('');
  };

  const handleSubmit = async () => {
    if (!selectedAction || !customer) return;

    const actionData: CreateCollectionActionInput = {
      customerId: customer.customerId,
      loanId: customer.loanId,
      scheduleId: customer.scheduleId,
      actionType: selectedAction.type,
      priority: selectedAction.severity === 'critical' ? 'CRITICAL' : 
                selectedAction.severity === 'high' ? 'HIGH' :
                selectedAction.severity === 'medium' ? 'MEDIUM' : 'LOW',
      notes,
      amount: amount ? parseFloat(amount) : undefined,
      followUpDate: followUpDate ? new Date(followUpDate).toISOString() : undefined,
      estimatedDurationMinutes: selectedAction.estimatedTime ? 
        parseInt(selectedAction.estimatedTime.split('-')[0]) * 60 : undefined,
      metadata: {
        contactMethod,
        originalVariant: variant,
      },
    };

    createActionMutation.mutate(actionData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="bg-primary/10 p-2 rounded-lg">
              <User className="h-6 w-6 text-primary" />
            </div>
            การดำเนินการติดตามหนี้
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-muted/30 rounded-xl p-4 border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">{customer.customerName}</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    <span>{customer.customerPhone || 'ไม่มีเบอร์'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>งวดที่ {customer.paymentNumber}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary mb-1">
                  {formatCurrency(customer.amountDue)}
                </div>
                <Badge className={cn(
                  'text-sm',
                  variant === 'critical' ? 'bg-red-500 text-white' :
                  variant === 'overdue' ? 'bg-orange-500 text-white' :
                  variant === 'today' ? 'bg-blue-500 text-white' :
                  'bg-amber-500 text-white'
                )}>
                  {variant === 'critical' ? `เกิน ${Math.abs(customer.daysUntilDue)} วัน` :
                   variant === 'overdue' ? `เกิน ${Math.abs(customer.daysUntilDue)} วัน` :
                   variant === 'today' ? 'ครบกำหนดวันนี้' :
                   `อีก ${customer.daysUntilDue} วัน`}
                </Badge>
              </div>
            </div>
          </div>

          {!selectedAction ? (
            /* Action Selection */
            <div>
              <h3 className="text-lg font-semibold mb-4">เลือกการดำเนินการ</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleActionSelect(action)}
                      className="text-left p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          getSeverityColor(action.severity)
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold group-hover:text-primary transition-colors">
                              {action.title}
                            </h4>
                            {action.requiresApproval && (
                              <Badge variant="outline" className="text-xs">
                                ต้องอนุมัติ
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {action.description}
                          </p>
                          {action.estimatedTime && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>ใช้เวลา: {action.estimatedTime}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Action Form */
            <div className="space-y-6">
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <selectedAction.icon className="h-6 w-6 text-primary" />
                <div>
                  <h3 className="font-semibold text-lg">{selectedAction.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedAction.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedAction(null)}
                  className="ml-auto"
                >
                  เปลี่ยน
                </Button>
              </div>

              {/* Dynamic Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(selectedAction.type === 'CALL' || selectedAction.type === 'SMS') && (
                  <div>
                    <Label htmlFor="contactMethod">วิธีการติดต่อ</Label>
                    <Select value={contactMethod} onValueChange={setContactMethod}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกวิธีการติดต่อ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phone">โทรศัพท์</SelectItem>
                        <SelectItem value="line">LINE</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {(selectedAction.type === 'PAYMENT_PLAN' || selectedAction.type === 'SETTLEMENT') && (
                  <div>
                    <Label htmlFor="amount">จำนวนเงิน (บาท)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="ระบุจำนวนเงิน"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="followUpDate">วันที่ติดตามครั้งถัดไป</Label>
                  <Input
                    id="followUpDate"
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">หมายเหตุ / รายละเอียดเพิ่มเติม</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="บันทึกรายละเอียดการติดต่อ, ผลการดำเนินการ, หรือข้อมูลสำคัญอื่นๆ"
                  rows={4}
                />
              </div>

              {selectedAction.requiresApproval && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold">ต้องการอนุมัติ</span>
                  </div>
                  <p className="text-sm text-amber-700 mt-1">
                    การดำเนินการนี้ต้องได้รับการอนุมัติจากผู้บังคับบัญชาก่อน
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setSelectedAction(null)}
                  className="flex-1"
                >
                  ย้อนกลับ
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createActionMutation.isPending}
                  className="flex-1"
                >
                  {createActionMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      กำลังดำเนินการ...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {selectedAction.requiresApproval ? 'ส่งขออนุมัติ' : 'ดำเนินการ'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
