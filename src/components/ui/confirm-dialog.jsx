import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

/**
 * Modal de confirmación reutilizable (basado en shadcn Dialog).
 *
 * Props:
 *  - open, onOpenChange
 *  - icon: componente de lucide (opcional)
 *  - iconClassName / iconBg: clases tailwind para el ícono y su círculo
 *  - title, description
 *  - confirmText, cancelText
 *  - onConfirm
 *  - confirmVariant: variante del botón confirmar ("destructive" | "default" | ...)
 *  - loading: deshabilita botones y muestra "Procesando…"
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  icon: Icon,
  iconClassName = "text-destructive",
  iconBg = "bg-red-50",
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  confirmVariant = "destructive",
  loading = false,
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader className="items-center text-center">
          {Icon && (
            <div className="flex justify-center mb-2">
              <div className={`w-14 h-14 rounded-full ${iconBg} flex items-center justify-center`}>
                <Icon size={26} className={iconClassName} />
              </div>
            </div>
          )}
          <DialogTitle className="text-center">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-center">{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="flex gap-2 mt-2">
          <Button
            variant={confirmVariant}
            className="flex-1"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Procesando…" : confirmText}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
