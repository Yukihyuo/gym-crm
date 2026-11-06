import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useBrandConfigStore } from "@/store/brandConfigStore"
import { useCashCutStore } from "@/store/cashCutStore"
import { useTerminalStore } from "@/store/terminalStore"
import { useCashGate } from "./useCashGate"

/**
 * Indicador de estado de caja del encabezado: muestra si la caja está abierta y
 * qué falta para poder cobrar. Si está cerrada, al hacer clic se abre la caja.
 */
export function CashStatusIndicator() {
  const cashCutId = useCashCutStore((state) => state.cashCutId)
  const requireCashClosing = useBrandConfigStore((state) => state.config?.requireCashClosing ?? false)
  const hasTerminal = useTerminalStore((state) => Boolean(state.terminalId))
  const { ensureCash, cashGateDialog } = useCashGate()

  if (!requireCashClosing) {
    return null
  }

  const isOpen = Boolean(cashCutId)

  const message = isOpen
    ? hasTerminal
      ? "Caja abierta. Todo listo para cobrar."
      : "Caja abierta. Selecciona una terminal para cobrar."
    : `Para cobrar falta abrir la caja${hasTerminal ? "" : " y seleccionar una terminal"}.`

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 gap-1.5 px-2.5",
              isOpen ? "text-emerald-600 hover:text-emerald-700" : "text-amber-600 hover:text-amber-700"
            )}
            onClick={isOpen ? undefined : () => ensureCash(() => undefined)}
          >
            <span className={cn("size-2 rounded-full", isOpen ? "bg-emerald-500" : "bg-amber-500")} />
            <span className="hidden sm:inline">{isOpen ? "Caja abierta" : "Caja cerrada"}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{message}</TooltipContent>
      </Tooltip>
      {cashGateDialog}
    </>
  )
}
