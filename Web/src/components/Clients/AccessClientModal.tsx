import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { DropdownMenuItem } from "../ui/dropdown-menu"
import { useEffect, useId, useRef, useState } from "react"

import { CheckCircle2, QrCode } from "lucide-react"
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode"
import axios from "axios"

type MembershipInfo = {
  name?: string
  description?: string
  duration?: {
    value?: number
    unit?: "days" | "weeks" | "months" | "years" | string
  }
  price?: {
    amount?: number
    currency?: string
  }
}

type QrLoginResponse = {
  success?: boolean
  message: string
  client?: string
  membership?: MembershipInfo | null
  daysPending?: number
}

type Mode = "qr" | "manual"

export function AccessClientModal() {
  const apiUrl = `${import.meta.env.VITE_API_URL}v1/clients/login-qr`
  const contactApiUrl = `${import.meta.env.VITE_API_URL}v1/clients/login-qr-contact`

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>("qr")
  const [manualInput, setManualInput] = useState("")
  const [manualError, setManualError] = useState("")
  const [manualLoading, setManualLoading] = useState(false)
  const [scanStatus, setScanStatus] = useState<string>("Inicializando cámara...")
  const [scanError, setScanError] = useState<string>("")
  const [accessGranted, setAccessGranted] = useState(false)
  const [accessData, setAccessData] = useState<QrLoginResponse | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const readerId = useId().replace(/:/g, "")
  const scannerElementId = `reader-${readerId}`

  const stopScanner = async (scannerInstance = scannerRef.current) => {
    if (!scannerInstance) {
      return
    }

    const shouldResetRef = scannerRef.current === scannerInstance

    try {
      const scannerState = scannerInstance.getState()

      if (
        scannerState === Html5QrcodeScannerState.SCANNING ||
        scannerState === Html5QrcodeScannerState.PAUSED
      ) {
        await scannerInstance.stop()
      }
    } catch (error: unknown) {
      console.error("Error stopping scanner:", error)
    } finally {
      try {
        scannerInstance.clear()
      } catch (error: unknown) {
        console.error("Error clearing scanner:", error)
      } finally {
        if (shouldResetRef) {
          scannerRef.current = null
        }
      }
    }
  }

  const resetAccessFlow = () => {
    setAccessGranted(false)
    setAccessData(null)
    setScanError("")
    setScanStatus("Inicializando cámara...")
    setMode("qr")
    setManualInput("")
    setManualError("")
    setManualLoading(false)
  }

  const formatDuration = (membership?: MembershipInfo | null) => {
    const value = membership?.duration?.value
    const unit = membership?.duration?.unit

    if (!value || !unit) {
      return "No disponible"
    }

    const labels: Record<string, { singular: string, plural: string }> = {
      days: { singular: "día", plural: "días" },
      weeks: { singular: "semana", plural: "semanas" },
      months: { singular: "mes", plural: "meses" },
      years: { singular: "año", plural: "años" },
    }

    const unitLabel = labels[unit] ?? { singular: unit, plural: unit }
    return `${value} ${value === 1 ? unitLabel.singular : unitLabel.plural}`
  }



  const formatDaysPending = (daysPending?: number) => {
    if (typeof daysPending !== "number") {
      return "No disponible"
    }

    if (daysPending <= 0) {
      return "Vence hoy"
    }

    if (daysPending === 1) {
      return "1 día restante"
    }

    return `${daysPending} días restantes`
  }

  const manageResponse = (data: QrLoginResponse) => {
    console.log("Request exitoso:", data)

    if (!data.success) {
      setScanError(data.message ?? "No se pudo registrar el acceso")
      setScanStatus("")
      return
    }

    if (data.success) {
      console.log("el usuario ha accedido correctamente")
      setAccessGranted(true)
      setAccessData(data)
      setScanStatus(data.message)
      setScanError("")

      const scannerInstance = scannerRef.current
      if (scannerInstance) {
        void stopScanner(scannerInstance)
      }
    }
  }

  const manualLogin = async () => {
    const value = manualInput.trim()
    if (!value) {
      setManualError("Ingresa un email o número de teléfono")
      return
    }

    setManualLoading(true)
    setManualError("")

    const isEmail = value.includes("@")
    const body = isEmail ? { email: value } : { phone: value }

    try {
      const response = await axios.post<QrLoginResponse>(contactApiUrl, body)
      manageResponse(response.data)
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        setManualError(error.response.data?.message ?? "Error al registrar acceso")
      } else {
        setManualError("Error de red. Intenta nuevamente.")
      }
    } finally {
      setManualLoading(false)
    }
  }

  useEffect(() => {
    if (!open || accessGranted || mode !== "qr") return

    let mounted = true
    let frameId = 0

    const waitForReaderElement = async (maxAttempts = 60) => {
      let attempts = 0

      return new Promise<HTMLElement>((resolve, reject) => {
        const check = () => {
          const element = document.getElementById(scannerElementId)
          if (element) {
            resolve(element)
            return
          }

          attempts += 1
          if (attempts >= maxAttempts) {
            reject(new Error(`HTML Element with id=${scannerElementId} not found`))
            return
          }

          frameId = requestAnimationFrame(check)
        }

        check()
      })
    }

    const loginWithQR = async (decodedText: string) => {
      console.log(apiUrl)
      axios.post(apiUrl, { qrData: decodedText })
        .then((response) => {
          manageResponse(response.data)
        })
        .catch((error: unknown) => {
          console.error("Error en login con QR:", error)
          if (!mounted) return

          if (axios.isAxiosError(error) && error.response) {
            setScanError(error.response.data?.message ?? "Error al registrar acceso")
          } else {
            setScanError("Error de red. Intenta nuevamente.")
          }

          setScanStatus("")
        })
    }

    const startScanner = async () => {
      try {
        await waitForReaderElement()

        if (!mounted) return

        const scanner = new Html5Qrcode(scannerElementId)
        scannerRef.current = scanner

        const config = {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        }

        const onDecodeSuccess = (decodedText: string) => {
          if (!mounted) return


          loginWithQR(decodedText)
          setScanStatus("QR leído correctamente")
          setScanError("")
        }

        const onDecodeError = (errorMessage: string) => {
          const expectedNotFoundError =
            typeof errorMessage === "string" &&
            (errorMessage.includes("NotFoundException") || errorMessage.includes("QR code parse error"))

          if (expectedNotFoundError) return
          console.warn(`Code scan error = ${errorMessage}`)
        }

        try {
          await scanner.start(
            { facingMode: "environment" },
            config,
            onDecodeSuccess,
            onDecodeError
          )
        } catch {
          const cameras = await Html5Qrcode.getCameras()

          if (!cameras?.length) {
            throw new Error("No se encontraron cámaras disponibles")
          }

          await scanner.start(cameras[0].id, config, onDecodeSuccess, onDecodeError)
        }

        if (!mounted) {
          await stopScanner(scanner)
          return
        }

        if (mounted) {
          setScanStatus("Escaneando... acerca el QR al recuadro")
          setScanError("")
        }
      } catch (error) {
        console.error("Error inicializando scanner:", error)
        if (mounted) {
          setScanError("No se pudo inicializar la cámara. Verifica permisos y dispositivo.")
          setScanStatus("")
        }
      }
    }

    void startScanner()

    return () => {
      mounted = false
      cancelAnimationFrame(frameId)
      void stopScanner()
    }
  }, [open, scannerElementId, accessGranted, apiUrl, mode])


  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          resetAccessFlow()
        }
      }}
    >
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
          <QrCode />
          QR de usuario
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        {accessGranted ? (
          <div className="mt-4 rounded-md border border-green-300 bg-green-50 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                <CheckCircle2 className="h-7 w-7" />
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-semibold text-green-900">
                  {accessData?.message ?? "Acceso concedido"}
                </h3>
                <p className="mt-2 text-sm text-green-800">
                  Se registró el acceso correctamente para el cliente.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-green-200 bg-white/80 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-green-700">Cliente</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {accessData?.client ?? "No disponible"}
                </p>
              </div>

              <div className="rounded-md border border-green-200 bg-white/80 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-green-700">Plan</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {accessData?.membership?.name ?? "No disponible"}
                </p>
              </div>

              <div className="rounded-md border border-green-200 bg-white/80 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-green-700">Duración</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDuration(accessData?.membership)}
                </p>
              </div>

              <div className="rounded-md border border-green-200 bg-white/80 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-green-700">Vigencia</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDaysPending(accessData?.daysPending)}
                </p>
              </div>

              {/* <div className="rounded-md border border-green-200 bg-white/80 p-3 sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-green-700">Precio</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatPrice(accessData?.membership)}
                </p>
              </div> */}
            </div>

            {accessData?.membership?.description ? (
              <>
                <Separator className="my-4 bg-green-200" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-green-700">Descripción del plan</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {accessData.membership.description}
                  </p>
                </div>
              </>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={resetAccessFlow}>
                Registrar otro acceso
              </Button>
              <Button onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Acceso de cliente</DialogTitle>
              <DialogDescription>
                Escanea el QR del cliente o ingrésalo manualmente.
              </DialogDescription>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex rounded-md border overflow-hidden text-sm">
              <button
                type="button"
                className={`flex-1 py-2 font-medium transition-colors ${
                  mode === "qr"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                onClick={() => setMode("qr")}
              >
                Cámara QR
              </button>
              <button
                type="button"
                className={`flex-1 py-2 font-medium transition-colors ${
                  mode === "manual"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                onClick={() => { setMode("manual"); setManualError("") }}
              >
                Manual
              </button>
            </div>

            {mode === "qr" ? (
              <>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="mx-auto w-full max-w-70 overflow-hidden rounded-md border bg-black" id={scannerElementId} />
                </div>

                {scanStatus ? (
                  <p className="text-sm text-muted-foreground">{scanStatus}</p>
                ) : null}

                {scanError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {scanError}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Ingresa el email o número de teléfono del cliente.
                </p>
                <Input
                  placeholder="Email o teléfono"
                  value={manualInput}
                  onChange={(e) => { setManualInput(e.target.value); setManualError("") }}
                  onKeyDown={(e) => { if (e.key === "Enter") void manualLogin() }}
                  disabled={manualLoading}
                />
                {manualError ? (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {manualError}
                  </div>
                ) : null}
                <Button onClick={() => void manualLogin()} disabled={manualLoading}>
                  {manualLoading ? "Verificando..." : "Registrar acceso"}
                </Button>
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cerrar</Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
