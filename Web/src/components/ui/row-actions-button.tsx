import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface RowActionsButtonProps extends React.ComponentProps<typeof Button> {
  /** Etiqueta visible y de accesibilidad del menú de acciones. */
  label?: string
}

/**
 * Botón de acciones de fila con etiqueta visible y tooltip, para no depender
 * solo del icono en tablas de mostrador.
 */
export function RowActionsButton({ label = "Acciones", className, ...props }: RowActionsButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          aria-label={label}
          className={cn("h-9 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground", className)}
          {...props}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
