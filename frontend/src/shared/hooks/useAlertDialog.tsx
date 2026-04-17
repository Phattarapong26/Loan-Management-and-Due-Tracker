import { useState, useCallback } from 'react';
import { AlertDialogCustom } from '@/shared/components/ui/alert-dialog-custom';

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface AlertOptions {
  title: string;
  description?: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  children?: React.ReactNode;
}

export function useAlertDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>('info');
  const [alertOptions, setAlertOptions] = useState<AlertOptions>({
    title: '',
  });

  const showAlert = useCallback((type: AlertType, options: AlertOptions) => {
    setAlertType(type);
    setAlertOptions(options);
    setIsOpen(true);
  }, []);

  const success = useCallback((options: AlertOptions) => {
    showAlert('success', options);
  }, [showAlert]);

  const error = useCallback((options: AlertOptions) => {
    showAlert('error', options);
  }, [showAlert]);

  const warning = useCallback((options: AlertOptions) => {
    showAlert('warning', options);
  }, [showAlert]);

  const info = useCallback((options: AlertOptions) => {
    showAlert('info', options);
  }, [showAlert]);

  const loading = useCallback((options: AlertOptions) => {
    showAlert('loading', options);
  }, [showAlert]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const AlertDialog = useCallback(() => (
    <AlertDialogCustom
      open={isOpen}
      onOpenChange={setIsOpen}
      type={alertType}
      {...alertOptions}
    />
  ), [isOpen, alertType, alertOptions]);

  return {
    success,
    error,
    warning,
    info,
    loading,
    close,
    AlertDialog,
  };
}
