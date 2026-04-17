import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface AlertDialogCustomProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: AlertType;
  title: string;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  children?: React.ReactNode;
}

const alertConfig = {
  success: {
    icon: CheckCircle,
    gradient: 'from-emerald-500 to-green-600',
    iconColor: 'text-emerald-600',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
    shadowColor: 'shadow-emerald-200',
    textColor: 'text-emerald-50',
  },
  error: {
    icon: XCircle,
    gradient: 'from-red-500 to-red-600',
    iconColor: 'text-red-600',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    shadowColor: 'shadow-red-200',
    textColor: 'text-red-50',
  },
  warning: {
    icon: AlertTriangle,
    gradient: 'from-amber-500 to-orange-600',
    iconColor: 'text-amber-600',
    buttonColor: 'bg-amber-600 hover:bg-amber-700',
    shadowColor: 'shadow-amber-200',
    textColor: 'text-amber-50',
  },
  info: {
    icon: Info,
    gradient: 'from-blue-500 to-blue-600',
    iconColor: 'text-blue-600',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    shadowColor: 'shadow-blue-200',
    textColor: 'text-blue-50',
  },
  loading: {
    icon: Loader2,
    gradient: 'from-slate-500 to-slate-600',
    iconColor: 'text-slate-600',
    buttonColor: 'bg-slate-600 hover:bg-slate-700',
    shadowColor: 'shadow-slate-200',
    textColor: 'text-slate-50',
  },
};

export function AlertDialogCustom({
  open,
  onOpenChange,
  type,
  title,
  description,
  confirmText = 'ตรง',
  cancelText = 'ยกเลิก',
  onConfirm,
  onCancel,
  showCancel = false,
  children,
}: AlertDialogCustomProps) {
  const config = alertConfig[type];
  const Icon = config.icon;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else {
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        
        {/* Animated Header */}
        <div className={cn(
          "relative px-8 py-12 bg-gradient-to-br overflow-hidden",
          config.gradient
        )}>
          {/* Animated circles background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-1/2 translate-y-1/2" />
          </div>
          
          {/* Icon */}
          <div className="relative flex flex-col items-center gap-4">
            <div className="relative">
              {/* Pulse animation for non-loading states */}
              {type !== 'loading' && (
                <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-75" />
              )}
              <div className="relative h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-2xl">
                <Icon className={cn(
                  "h-12 w-12",
                  config.iconColor,
                  type === 'loading' && "animate-spin"
                )} />
              </div>
            </div>
            
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">
                {title}
              </h2>
              {description && (
                <p className={cn("text-sm", config.textColor)}>
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Custom Content */}
        {children && (
          <div className="p-8 bg-gradient-to-b from-white to-slate-50">
            {children}
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-white border-t border-slate-100">
          <div className={cn(
            "flex gap-3",
            showCancel ? "justify-end" : "w-full"
          )}>
            {showCancel && (
              <Button
                variant="outline"
                onClick={handleCancel}
                className="px-8"
                disabled={type === 'loading'}
              >
                {cancelText}
              </Button>
            )}
            <Button
              onClick={handleConfirm}
              disabled={type === 'loading'}
              className={cn(
                "text-white shadow-lg h-12 text-base font-semibold",
                config.buttonColor,
                config.shadowColor,
                !showCancel && "w-full"
              )}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
