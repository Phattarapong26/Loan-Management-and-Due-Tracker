import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X, RefreshCw, ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface CenterAlertProps {
  type: AlertType;
  title?: string;
  message: string;
  isOpen: boolean;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDuration?: number;
  onRetry?: () => void;
  onForgotPassword?: () => void;
  onHelpDesk?: () => void;
  showActions?: boolean;
}

const alertConfig = {
  success: {
    icon: CheckCircle2,
    iconBgColor: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    titleColor: 'text-slate-800',
    messageColor: 'text-slate-500',
    subMessageColor: 'text-slate-400',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
    buttonText: 'text-white',
  },
  error: {
    icon: XCircle,
    iconBgColor: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-slate-800',
    messageColor: 'text-slate-500',
    subMessageColor: 'text-slate-400',
    buttonBg: 'bg-slate-900 hover:bg-slate-800',
    buttonText: 'text-white',
  },
  warning: {
    icon: AlertCircle,
    iconBgColor: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-slate-800',
    messageColor: 'text-slate-500',
    subMessageColor: 'text-slate-400',
    buttonBg: 'bg-amber-600 hover:bg-amber-700',
    buttonText: 'text-white',
  },
  info: {
    icon: Info,
    iconBgColor: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-slate-800',
    messageColor: 'text-slate-500',
    subMessageColor: 'text-slate-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-700',
    buttonText: 'text-white',
  },
};

export function CenterAlert({
  type,
  title,
  message,
  isOpen,
  onClose,
  autoClose = true,
  autoCloseDuration = 5000,
  onRetry,
  onForgotPassword,
  onHelpDesk,
  showActions = true,
}: CenterAlertProps) {
  const [isVisible, setIsVisible] = useState(false);
  const config = alertConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDuration);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, autoClose, autoCloseDuration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleRetry = () => {
    handleClose();
    if (onRetry) {
      setTimeout(() => onRetry(), 300);
    }
  };

  const handleForgotPassword = () => {
    handleClose();
    if (onForgotPassword) {
      setTimeout(() => onForgotPassword(), 300);
    }
  };

  const handleHelpDesk = () => {
    handleClose();
    if (onHelpDesk) {
      setTimeout(() => onHelpDesk(), 300);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleClose}
      />

      {/* Alert Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            'pointer-events-auto w-full max-w-md transform transition-all duration-300',
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          )}
        >
          <div className="relative rounded-3xl bg-white shadow-2xl p-8">
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div
                className={cn(
                  'h-20 w-20 rounded-full flex items-center justify-center shadow-lg',
                  config.iconBgColor
                )}
              >
                <Icon className={cn('h-10 w-10', config.iconColor)} />
              </div>
            </div>

            {/* Content */}
            <div className="space-y-3 mb-10">
              <h3 className={cn('text-2xl font-black tracking-tight text-center', config.titleColor)}>
                {title || (type === 'error' ? 'เข้าสู่ระบบไม่สำเร็จ' : 'แจ้งเตือน')}
              </h3>
              <div className="space-y-1 text-center">
                <p className={cn('font-medium leading-relaxed', config.messageColor)}>
                  {message}
                </p>
                {type === 'error' && (
                  <p className={cn('text-sm', config.subMessageColor)}>
                    กรุณาตรวจสอบข้อมูลและลองใหม่อีกครั้ง หรือรีเซ็ตรหัสผ่านหากคุณจำไม่ได้
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons Area */}
            {showActions && (
              <div className="w-full space-y-3">
                {/* Primary Action Button */}
                <button
                  onClick={handleRetry}
                  className={cn(
                    'w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-slate-200',
                    config.buttonBg,
                    config.buttonText
                  )}
                >
                  <RefreshCw size={18} />
                  {type === 'error' ? 'ลองใหม่อีกครั้ง' : 'ตกลง'}
                </button>

                {/* Secondary Actions (for error type) */}
                {type === 'error' && (
                  <div className="flex flex-col gap-1 pt-2">
                    {onForgotPassword && (
                      <button
                        onClick={handleForgotPassword}
                        className="text-emerald-600 font-bold text-sm py-2 hover:text-emerald-700 transition-colors flex items-center justify-center gap-1 group"
                      >
                        ลืมรหัสผ่านใช่หรือไม่?
                        <ChevronRight
                          size={16}
                          className="group-hover:translate-x-0.5 transition-transform"
                        />
                      </button>
                    )}
                    {onHelpDesk && (
                      <button
                        onClick={handleHelpDesk}
                        className="text-slate-400 font-bold text-xs py-2 hover:text-slate-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <HelpCircle size={14} />
                        ติดต่อ IT Helpdesk
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Simple Close Button (for non-action alerts) */}
            {!showActions && (
              <div className="flex justify-center">
                <button
                  onClick={handleClose}
                  className={cn(
                    'px-8 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98]',
                    config.buttonBg,
                    config.buttonText
                  )}
                >
                  ตกลง
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
