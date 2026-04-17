import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "alert-dialog-overlay fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay className="alert-dialog-overlay" />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "alert-dialog-content alert-kbank-style fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background/95 backdrop-blur-md p-6 shadow-2xl duration-200 sm:rounded-2xl",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn("", className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn("mt-2 sm:mt-0", className)}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

// Custom Alert Types
interface CustomAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  type?: 'error' | 'warning' | 'success' | 'info'
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
  children?: React.ReactNode
}

const CustomAlert = ({
  open,
  onOpenChange,
  title,
  description,
  type = 'info',
  confirmText = 'ตกลง',
  cancelText = 'ยกเลิก',
  onConfirm,
  onCancel,
  children
}: CustomAlertProps) => {
  const getIcon = () => {
    const iconClass = type === 'error' ? 'alert-error-shake alert-icon-bounce' : 'alert-icon-bounce';
    
    switch (type) {
      case 'error':
        return <XCircle className={`h-16 w-16 text-destructive mx-auto ${iconClass}`} />
      case 'warning':
        return <AlertTriangle className={`h-16 w-16 text-warning mx-auto ${iconClass}`} />
      case 'success':
        return <CheckCircle className={`h-16 w-16 text-success mx-auto ${iconClass}`} />
      default:
        return <Info className={`h-16 w-16 text-primary mx-auto ${iconClass}`} />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-destructive/5',
          border: 'border-destructive/20',
          text: 'text-destructive'
        }
      case 'warning':
        return {
          bg: 'bg-warning/5',
          border: 'border-warning/20',
          text: 'text-warning'
        }
      case 'success':
        return {
          bg: 'bg-success/5',
          border: 'border-success/20',
          text: 'text-success'
        }
      default:
        return {
          bg: 'bg-primary/5',
          border: 'border-primary/20',
          text: 'text-primary'
        }
    }
  }

  const colors = getColors()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <div className={cn("rounded-lg p-4 mb-4", )}>
          {getIcon()}
          <AlertDialogHeader className="mt-4">
            <AlertDialogTitle className={cn("text-center text-xl", colors.text)}>
              {title}
            </AlertDialogTitle>
            {description && (
              <AlertDialogDescription className="text-center text-base mt-2">
                {description}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          {children && (
            <div className="mt-4">
              {children}
            </div>
          )}
        </div>
        <AlertDialogFooter className="gap-3 pt-2">
          {onCancel && (
            <AlertDialogCancel asChild>
              <Button 
                variant="outline" 
                onClick={onCancel} 
                className="alert-kbank-button flex-1 h-12 text-base border-2"
              >
                {cancelText}
              </Button>
            </AlertDialogCancel>
          )}
          <AlertDialogAction asChild>
            <Button 
              onClick={onConfirm} 
              className={cn(
                "alert-kbank-button flex-1 h-12 text-base font-semibold",
                type === 'error' && "bg-destructive hover:bg-destructive/90 text-white",
                type === 'warning' && "bg-warning hover:bg-warning/90 text-white",
                type === 'success' && "bg-success hover:bg-success/90 text-white",
                !type || type === 'info' && "bg-primary hover:bg-primary/90 text-white"
              )}
            >
              {confirmText}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  CustomAlert,
}