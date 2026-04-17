import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import {
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  DollarSign,
  Scale,
  MoreHorizontal,
  Clock,
  AlertTriangle,
  History,
} from 'lucide-react';
import { CustomerDueStatus } from '../api/collections.api';
import { CollectionActionDialog } from './CollectionActionDialog';
import { CollectionHistoryDialog } from './CollectionHistoryDialog';
import { cn } from '@/shared/lib/utils';

interface QuickActionMenuProps {
  customer: CustomerDueStatus;
  variant: 'critical' | 'overdue' | 'today' | 'soon';
}

interface QuickAction {
  id: string;
  title: string;
  icon: React.ElementType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'phone' | 'dialog';
  requiresApproval?: boolean;
}

export function QuickActionMenu({ customer, variant }: QuickActionMenuProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Define quick actions based on variant
  const getQuickActions = (): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        id: 'call',
        title: 'โทรติดต่อ',
        icon: Phone,
        severity: 'low',
        action: 'phone',
      },
      {
        id: 'sms',
        title: 'ส่ง SMS',
        icon: MessageSquare,
        severity: 'low',
        action: 'dialog',
      },
    ];

    if (variant === 'critical') {
      return [
        ...baseActions,
        {
          id: 'email',
          title: 'ส่งหนังสือแจ้ง',
          icon: Mail,
          severity: 'medium',
          action: 'dialog',
        },
        {
          id: 'visit',
          title: 'เยี่ยมลูกค้า',
          icon: MapPin,
          severity: 'high',
          action: 'dialog',
          requiresApproval: true,
        },
        {
          id: 'restructure',
          title: 'ปรับโครงสร้างหนี้',
          icon: CreditCard,
          severity: 'high',
          action: 'dialog',
          requiresApproval: true,
        },
        {
          id: 'legal',
          title: 'ดำเนินการทางกฎหมาย',
          icon: Scale,
          severity: 'critical',
          action: 'dialog',
          requiresApproval: true,
        },
      ];
    }

    if (variant === 'overdue') {
      return [
        ...baseActions,
        {
          id: 'email',
          title: 'ส่งหนังสือแจ้ง',
          icon: Mail,
          severity: 'medium',
          action: 'dialog',
        },
        {
          id: 'payment_plan',
          title: 'จัดแผนผ่อนชำระ',
          icon: Calendar,
          severity: 'medium',
          action: 'dialog',
          requiresApproval: true,
        },
        {
          id: 'visit',
          title: 'เยี่ยมลูกค้า',
          icon: MapPin,
          severity: 'high',
          action: 'dialog',
          requiresApproval: true,
        },
      ];
    }

    if (variant === 'today') {
      return [
        ...baseActions,
        {
          id: 'email',
          title: 'ส่งหนังสือแจ้ง',
          icon: Mail,
          severity: 'medium',
          action: 'dialog',
        },
      ];
    }

    return baseActions;
  };

  const quickActions = getQuickActions();

  const handleQuickAction = (action: QuickAction) => {
    if (action.action === 'phone') {
      if (customer.customerPhone) {
        window.location.href = `tel:${customer.customerPhone}`;
      }
    } else {
      setIsDialogOpen(true);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-amber-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'overdue':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      case 'today':
      case 'soon':
        return 'bg-slate-900 hover:bg-slate-800 text-white';
      default:
        return 'bg-slate-900 hover:bg-slate-800 text-white';
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {/* Primary Action Button */}
        <Button
          size="lg"
          className={cn('flex-1', getVariantStyles())}
          onClick={() => handleQuickAction(quickActions[0])}
        >
          {(() => {
            const Icon = quickActions[0].icon;
            return <Icon className="h-4 w-4 mr-2" />;
          })()}
          {quickActions[0].title}
        </Button>

        {/* More Actions Dropdown */}
        {quickActions.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="lg"
                variant="outline"
                className="px-3"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {quickActions.slice(1).map((action, index) => {
                const Icon = action.icon;
                return (
                  <div key={action.id}>
                    {index > 0 && action.severity === 'critical' && (
                      <DropdownMenuSeparator />
                    )}
                    <DropdownMenuItem
                      onClick={() => handleQuickAction(action)}
                      className="cursor-pointer"
                    >
                      <Icon className={cn('h-4 w-4 mr-3', getSeverityColor(action.severity))} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span>{action.title}</span>
                          {action.requiresApproval && (
                            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                              ต้องอนุมัติ
                            </span>
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </div>
                );
              })}
              
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setIsHistoryOpen(true)}
                className="cursor-pointer"
              >
                <History className="h-4 w-4 mr-3 text-blue-600" />
                ดูประวัติการติดตาม
              </DropdownMenuItem>
              
              <DropdownMenuItem
                onClick={() => setIsDialogOpen(true)}
                className="cursor-pointer text-primary"
              >
                <MoreHorizontal className="h-4 w-4 mr-3" />
                ดูการดำเนินการทั้งหมด
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <CollectionActionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        customer={customer}
        variant={variant}
      />

      <CollectionHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        customer={customer}
      />
    </>
  );
}
