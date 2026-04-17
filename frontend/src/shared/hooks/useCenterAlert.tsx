import { useState, useCallback } from 'react';
import { CenterAlert, AlertType } from '@/shared/components/ui/center-alert';

interface AlertState {
  isOpen: boolean;
  type: AlertType;
  title?: string;
  message: string;
  autoClose?: boolean;
  autoCloseDuration?: number;
  onRetry?: () => void;
  onForgotPassword?: () => void;
  onHelpDesk?: () => void;
  showActions?: boolean;
}

export function useCenterAlert() {
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    type: 'info',
    message: '',
    autoClose: true,
    autoCloseDuration: 5000,
    showActions: true,
  });

  const showAlert = useCallback(
    (
      type: AlertType,
      message: string,
      options?: {
        title?: string;
        autoClose?: boolean;
        autoCloseDuration?: number;
        onRetry?: () => void;
        onForgotPassword?: () => void;
        onHelpDesk?: () => void;
        showActions?: boolean;
      }
    ) => {
      setAlertState({
        isOpen: true,
        type,
        message,
        title: options?.title,
        autoClose: options?.autoClose ?? true,
        autoCloseDuration: options?.autoCloseDuration ?? 5000,
        onRetry: options?.onRetry,
        onForgotPassword: options?.onForgotPassword,
        onHelpDesk: options?.onHelpDesk,
        showActions: options?.showActions ?? true,
      });
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, title?: string) => {
      showAlert('success', message, { title: title || 'สำเร็จ' });
    },
    [showAlert]
  );

  const showError = useCallback(
    (
      message: string,
      options?: {
        title?: string;
        onRetry?: () => void;
        onForgotPassword?: () => void;
        onHelpDesk?: () => void;
      }
    ) => {
      showAlert('error', message, {
        title: options?.title || 'เกิดข้อผิดพลาด',
        autoClose: false,
        onRetry: options?.onRetry,
        onForgotPassword: options?.onForgotPassword,
        onHelpDesk: options?.onHelpDesk,
      });
    },
    [showAlert]
  );

  const showWarning = useCallback(
    (message: string, title?: string) => {
      showAlert('warning', message, { title: title || 'คำเตือน' });
    },
    [showAlert]
  );

  const showInfo = useCallback(
    (message: string, title?: string) => {
      showAlert('info', message, { title: title || 'ข้อมูล' });
    },
    [showAlert]
  );

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const AlertComponent = (
    <CenterAlert
      type={alertState.type}
      title={alertState.title}
      message={alertState.message}
      isOpen={alertState.isOpen}
      onClose={closeAlert}
      autoClose={alertState.autoClose}
      autoCloseDuration={alertState.autoCloseDuration}
      onRetry={alertState.onRetry}
      onForgotPassword={alertState.onForgotPassword}
      onHelpDesk={alertState.onHelpDesk}
      showActions={alertState.showActions}
    />
  );

  return {
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    closeAlert,
    AlertComponent,
  };
}
