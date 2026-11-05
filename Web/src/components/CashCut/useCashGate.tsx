import { useCallback, useEffect, useRef, useState } from "react"

import { useBrandConfigStore } from "@/store/brandConfigStore"
import { useCashCutStore } from "@/store/cashCutStore"
import { OpenCashCutDialog } from "./OpenCashCutDialog"

/**
 * Exige caja abierta antes de iniciar un cobro. Si la caja está cerrada y la marca
 * la requiere, abre primero el modal de apertura y, al abrirla, ejecuta la acción
 * pendiente. Renderiza `cashGateDialog` en el componente que lo usa.
 */
export function useCashGate() {
  const requireCashClosing = useBrandConfigStore((state) => state.config?.requireCashClosing ?? false)
  const cashCutId = useCashCutStore((state) => state.cashCutId)
  const requiresCash = requireCashClosing && !cashCutId

  const [dialogOpen, setDialogOpen] = useState(false)
  const pendingAction = useRef<(() => void) | null>(null)

  const ensureCash = useCallback(
    (action: () => void) => {
      if (!requiresCash) {
        action()
        return
      }

      pendingAction.current = action
      setDialogOpen(true)
    },
    [requiresCash]
  )

  const handleOpened = useCallback(() => {
    const action = pendingAction.current
    pendingAction.current = null
    setDialogOpen(false)
    action?.()
  }, [])

  // La caja puede aparecer mientras el modal está abierto (abierta desde otro dispositivo): se continúa el flujo.
  useEffect(() => {
    if (!dialogOpen) return

    return useCashCutStore.subscribe((state) => {
      if (state.cashCutId) handleOpened()
    })
  }, [dialogOpen, handleOpened])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      pendingAction.current = null
    }
    setDialogOpen(nextOpen)
  }

  const cashGateDialog = (
    <OpenCashCutDialog
      open={dialogOpen}
      onOpenChange={handleOpenChange}
      onOpened={handleOpened}
    />
  )

  return { requiresCash, ensureCash, cashGateDialog }
}
