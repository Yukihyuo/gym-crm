import { CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import type { AccessResultPayload } from "./accessResult"

type AccessResultDialogProps = {
  open: boolean
  data: AccessResultPayload | null
  onClose: () => void
}

export function AccessResultDialog({ open, data, onClose }: AccessResultDialogProps) {
  const variant = data?.kind === "error" ? "error" : "success"
  const palette =
    variant === "success"
      ? {
          frame: "border-green-300 bg-green-50",
          iconBg: "bg-green-100 text-green-700",
          title: "text-green-900",
          text: "text-green-800",
          label: "text-green-700",
          card: "border-green-200 bg-white/80",
        }
      : {
          frame: "border-red-300 bg-red-50",
          iconBg: "bg-red-100 text-red-700",
          title: "text-red-900",
          text: "text-red-800",
          label: "text-red-700",
          card: "border-red-200 bg-white/80",
        }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resultado del acceso</DialogTitle>
          <DialogDescription>
            Este mensaje se cierra automáticamente en 5 segundos.
          </DialogDescription>
        </DialogHeader>

        <div className={`mt-2 rounded-md border p-6 ${palette.frame}`}>
          <div className="flex flex-col items-center text-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${palette.iconBg}`}>
              <CheckCircle2 className="h-7 w-7" />
            </div>

            <div className="mt-4">
              <h3 className={`text-lg font-semibold ${palette.title}`}>
                {data?.title ?? "Resultado del acceso"}
              </h3>
              <p className={`mt-2 text-sm ${palette.text}`}>
                {data?.message ?? "Sin mensaje disponible"}
              </p>
            </div>
          </div>

          {data?.details?.length ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {data.details.map((detail) => (
                <div key={`${detail.label}-${detail.value}`} className={`rounded-md border p-3 ${palette.card}`}>
                  <p className={`text-xs font-medium uppercase tracking-wide ${palette.label}`}>
                    {detail.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {detail.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {data?.membership?.description ? (
            <>
              <Separator className="my-4 bg-green-200" />
              <div>
                <p className={`text-xs font-medium uppercase tracking-wide ${palette.label}`}>
                  Descripción del plan
                </p>
                <p className="mt-2 text-sm text-slate-700">
                  {data.membership.description}
                </p>
              </div>
            </>
          ) : null}

          {data?.kind === "error" && !data.details.length ? (
            <div className="mt-6 rounded-md border border-red-200 bg-white/80 p-3 text-sm text-red-900">
              No se encontraron más detalles para mostrar.
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar ahora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}