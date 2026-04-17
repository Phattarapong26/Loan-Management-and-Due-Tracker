import { useState, useCallback } from 'react'
import { CustomAlert } from '@/shared/components/ui/alert-dialog'

interface AlertOptions {
  title: string
  description?: string
  type?: 'error' | 'warning' | 'success' | 'info'
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  children?: React.ReactNode
}

interface ConfirmOptions extends AlertOptions {
  showCancel: true
}

export const useAlert = () => {
  const [alertState, setAlertState] = useState<{
    open: boolean
    options: AlertOptions
    onConfirm?: () => void
    onCancel?: () => void
  }>({
    open: false,
    options: { title: '' }
  })

  const showAlert = useCallback((options: AlertOptions, onConfirm?: () => void) => {
    setAlertState({
      open: true,
      options: {
        showCancel: false,
        confirmText: 'ตกลง',
        ...options
      },
      onConfirm
    })
  }, [])

  const showConfirm = useCallback((
    options: ConfirmOptions, 
    onConfirm?: () => void, 
    onCancel?: () => void
  ) => {
    setAlertState({
      open: true,
      options: {
        confirmText: 'ยืนยัน',
        cancelText: 'ยกเลิก',
        ...options
      },
      onConfirm,
      onCancel
    })
  }, [])

  const showError = useCallback((title: string, description?: string, onConfirm?: () => void) => {
    showAlert({
      title,
      description,
      type: 'error',
      confirmText: 'เข้าใจแล้ว'
    }, onConfirm)
  }, [showAlert])

  const showWarning = useCallback((title: string, description?: string, onConfirm?: () => void) => {
    showAlert({
      title,
      description,
      type: 'warning',
      confirmText: 'เข้าใจแล้ว'
    }, onConfirm)
  }, [showAlert])

  const showSuccess = useCallback((title: string, description?: string, onConfirm?: () => void) => {
    showAlert({
      title,
      description,
      type: 'success',
      confirmText: 'เยี่ยม!'
    }, onConfirm)
  }, [showAlert])

  const showInfo = useCallback((title: string, description?: string, onConfirm?: () => void) => {
    showAlert({
      title,
      description,
      type: 'info',
      confirmText: 'ตกลง'
    }, onConfirm)
  }, [showAlert])

  const closeAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, open: false }))
  }, [])

  const handleConfirm = useCallback(() => {
    alertState.onConfirm?.()
    closeAlert()
  }, [alertState.onConfirm, closeAlert])

  const handleCancel = useCallback(() => {
    alertState.onCancel?.()
    closeAlert()
  }, [alertState.onCancel, closeAlert])

  const AlertComponent = (
    <CustomAlert
      open={alertState.open}
      onOpenChange={closeAlert}
      title={alertState.options.title}
      description={alertState.options.description}
      type={alertState.options.type}
      confirmText={alertState.options.confirmText}
      cancelText={alertState.options.cancelText}
      onConfirm={handleConfirm}
      onCancel={alertState.options.showCancel ? handleCancel : undefined}
    >
      {alertState.options.children}
    </CustomAlert>
  )

  return {
    showAlert,
    showConfirm,
    showError,
    showWarning,
    showSuccess,
    showInfo,
    closeAlert,
    AlertComponent
  }
}