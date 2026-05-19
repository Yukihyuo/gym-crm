import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Fingerprint, LoaderCircle } from "lucide-react"
import { toast } from "react-toastify"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useSocketStore } from "@/store/socketStore"
import { useTerminalStore } from "@/store/terminalStore"

interface RegisterFingerprintModalProps {
  clientId: string
  onRegistered?: () => void
}

type EnrollmentStatus = "idle" | "waiting" | "success" | "error"

type EnrollmentProgress = {
  attempt: number
  total: number
}

type NormalizedSocketMessage = {
  code: string | null
  message: string | null
  attempt: number | null
  total: number | null
}

const normalizeSocketMessage = (payload: unknown): NormalizedSocketMessage => {
  console.log("llegó:",payload)
  const messages = {
    reader_disconnected: "El lector de huellas se ha desconectado. Verifica la conexión del dispositivo.",
    fmd_generation_failed: "Error en la lectura. Intenta nuevamente.",
    waiting: "Esperando captura de huella en el dispositivo...",
    success: "Huella registrada correctamente",
  }

  if (typeof payload === "string") {
    const trimmedMessage = payload.trim().toLowerCase()
    console.log(trimmedMessage)

    return {
      code: trimmedMessage,
      message: messages[trimmedMessage as keyof typeof messages] || payload.trim(),
      attempt: null,
      total: null,
    }
  }

  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>
    const rawMessage =
      typeof record.message === "string"
        ? record.message
        : typeof record.status === "string"
          ? record.status
          : null
    const trimmedMessage = rawMessage?.trim().toLowerCase() ?? null

    console.log(trimmedMessage)

    return {
      code: trimmedMessage,
      message: trimmedMessage ? messages[trimmedMessage as keyof typeof messages] || rawMessage?.trim() || null : null,
      attempt: typeof record.attempt === "number" ? record.attempt : null,
      total: typeof record.total === "number" ? record.total : null,
    }
  }

  return {
    code: null,
    message: null,
    attempt: null,
    total: null,
  }
}

export default function RegisterFingerprintModal({ clientId, onRegistered }: RegisterFingerprintModalProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<EnrollmentStatus>("idle")
  const [message, setMessage] = useState("Abre el proceso para comenzar el registro de huella")
  const [enrollmentProgress, setEnrollmentProgress] = useState<EnrollmentProgress | null>(null)

  const socket = useSocketStore((state) => state.socket)
  const isConnected = useSocketStore((state) => state.isConnected)
  const emitEvent = useSocketStore((state) => state.emitEvent)
  const onEventWithData = useSocketStore((state) => state.onEventWithData)
  const terminalId = useTerminalStore((state) => state.terminalId)

  const resetModalState = useCallback(() => {
    setStatus("idle")
    setMessage("Abre el proceso para comenzar el registro de huella")
    setEnrollmentProgress(null)
  }, [])

  const emitRegistrationRequest = useCallback(() => {
    if (!terminalId || !isConnected || !socket) {
      return
    }

    emitEvent("register_new_client", { _id: clientId })
  }, [clientId, emitEvent, isConnected, socket, terminalId])

  const retryEnrollment = useCallback(() => {
    setStatus("waiting")
    setMessage("Esperando captura de huella en el dispositivo...")
    setEnrollmentProgress(null)
    emitRegistrationRequest()
  }, [emitRegistrationRequest])

  const openModal = useCallback(() => {
    if (!terminalId) {
      setStatus("error")
      setMessage("Selecciona una terminal activa antes de registrar la huella")
      setEnrollmentProgress(null)
      setOpen(true)
      return
    }

    if (!isConnected || !socket) {
      setStatus("error")
      setMessage("El socket no está conectado. Verifica tu conexión e inténtalo de nuevo")
      setEnrollmentProgress(null)
      setOpen(true)
      return
    }

    setStatus("waiting")
    setMessage("Esperando captura de huella en el dispositivo...")
    setEnrollmentProgress(null)
    setOpen(true)
  }, [isConnected, socket, terminalId])

  const closeModal = useCallback(({ shouldCancel }: { shouldCancel: boolean }) => {
    if (shouldCancel && open && status !== "success") {
      emitEvent("cancel_registration")
    }

    resetModalState()
    setOpen(false)
  }, [emitEvent, open, resetModalState, status])

  useEffect(() => {
    if (!open || !terminalId || !isConnected || !socket) {
      return
    }

    emitRegistrationRequest()
  }, [emitRegistrationRequest, isConnected, open, socket, terminalId])

  useEffect(() => {
    if (!open || !isConnected || !socket) {
      return
    }

    const offFingerprintCommand = onEventWithData<unknown>("finger_print_command", (payload) => {
      const { message: commandMessage } = normalizeSocketMessage(payload)
      if (commandMessage) {
        setMessage(commandMessage)
      }
    })

    const offEnrollmentStatus = onEventWithData<unknown>("enrollment_status", (payload) => {
      const { attempt, total, message: statusMessage } = normalizeSocketMessage(payload)

      if (attempt === null || total === null || total <= 0) {
        return
      }

      setStatus("waiting")
      setEnrollmentProgress({ attempt, total })
      setMessage(statusMessage ?? `Intento ${attempt} de ${total}: coloca nuevamente el dedo en el lector.`)
    })

    const offEnrollmentError = onEventWithData<unknown>("enrollment_error", (payload) => {
      console.log("payyyyload")
      const { message: errorMessage } = normalizeSocketMessage(payload)
      const nextMessage = errorMessage ?? "Ocurrió un error durante el registro de huella"

      setStatus("error")
      setEnrollmentProgress(null)
      setMessage(nextMessage)
      toast.error(nextMessage)
    })

    const offFingerprintSaved = onEventWithData<unknown>("save_finger_print_response", (payload) => {
      const { code: payloadCode, message: payloadMessage } = normalizeSocketMessage(payload)
      const success = payloadCode === "success"

      if (success) {
        setStatus("success")
        setEnrollmentProgress(null)
        setMessage("Huella registrada correctamente")
        toast.success("Huella registrada correctamente")
        onRegistered?.()
        return
      }

      setStatus("error")
      setEnrollmentProgress(null)
      setMessage(payloadMessage ?? "No fue posible registrar la huella")
      toast.error(payloadMessage ?? "No fue posible registrar la huella")
    })

    return () => {
      offFingerprintCommand()
      offEnrollmentStatus()
      offEnrollmentError()
      offFingerprintSaved()
    }
  }, [isConnected, onEventWithData, onRegistered, open, socket])

  useEffect(() => {
    if (!open || status !== "success") {
      return
    }

    const timeoutId = window.setTimeout(() => {
      closeModal({ shouldCancel: false })
    }, 1200)

    return () => window.clearTimeout(timeoutId)
  }, [closeModal, open, status])

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      openModal()
      return
    }

    closeModal({ shouldCancel: true })
  }

  const statusClassName =
    status === "success"
      ? "border-green-300 bg-green-50 text-green-900"
      : status === "error"
        ? "border-red-300 bg-red-50 text-red-900"
        : "border-blue-300 bg-blue-50 text-blue-900"

  const progressPercent = enrollmentProgress
    ? Math.max(0, Math.min(100, Math.round((enrollmentProgress.attempt / enrollmentProgress.total) * 100)))
    : 0

  const statusIcon =
    status === "success" ? (
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
    ) : status === "error" ? (
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
    ) : (
      <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
    )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault()
            openModal()
          }}
        >
          <Fingerprint className="mr-2 h-4 w-4" />
          Registrar Huella
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar huella</DialogTitle>
        </DialogHeader>

        <div className={`rounded-md border p-4 text-sm ${statusClassName}`}>
          <div className="flex items-start gap-3">
            {statusIcon}
            <p>{message}</p>
          </div>

          {enrollmentProgress ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span>Progreso de captura</span>
                <span>{enrollmentProgress.attempt} / {enrollmentProgress.total}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/80">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>

        {!terminalId ? (
          <p className="text-sm text-red-600">
            No hay terminal seleccionada. Selecciona una terminal para iniciar el registro.
          </p>
        ) : null}

        <DialogFooter>
          {status === "error" && terminalId && isConnected && socket ? (
            <Button onClick={retryEnrollment}>
              Volver a intentar
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => closeModal({ shouldCancel: true })}>
            Cerrar y cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}