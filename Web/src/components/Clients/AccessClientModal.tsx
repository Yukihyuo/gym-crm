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
import { DropdownMenuItem } from "../ui/dropdown-menu"
import { useEffect, useId, useRef, useState } from "react"

import { QrCode, X } from "lucide-react"
import { Html5Qrcode } from "html5-qrcode"
import axios from "axios"

type QrLoginResponse = {
  success: boolean
}

export function AccessClientModal() {
  const apiUrl = `${import.meta.env.VITE_API_URL}v1/clients/login-qr`

  const [open, setOpen] = useState(false)
  const [scanStatus, setScanStatus] = useState<string>("Inicializando cámara...")
  const [scanError, setScanError] = useState<string>("")
  const [accessGranted, setAccessGranted] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isScanningRef = useRef(false)
  const readerId = useId().replace(/:/g, "")
  const scannerElementId = `reader-${readerId}`

  const manageResponse = (response: { data: QrLoginResponse }) => {
    console.log("Request exitoso:", response.data)

    if (response.data.success) {
      console.log("el usuario ha accedido correctamente")
      setAccessGranted(true)
      setScanStatus("Acceso concedido")
      setScanError("")

      const scannerInstance = scannerRef.current
      if (scannerInstance && isScanningRef.current) {
        scannerInstance
          .stop()
          .then(() => {
            try {
              scannerInstance.clear()
            } catch (error: unknown) {
              console.error("Error clearing scanner:", error)
            } finally {
              scannerRef.current = null
              isScanningRef.current = false
            }
          })
          .catch((error) => {
            console.error("Error stopping scanner:", error)
            try {
              scannerInstance.clear()
            } catch (clearError: unknown) {
              console.error("Error clearing scanner:", clearError)
            } finally {
              scannerRef.current = null
              isScanningRef.current = false
            }
          })
      }
    }
  }

  useEffect(() => {
    if (!open || accessGranted) return

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
          manageResponse(response)
        })
        .catch((error) => {
          console.error("Error en login con QR:", error)
          // Aquí puedes manejar errores, como mostrar un mensaje al usuario
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

        if (mounted) {
          isScanningRef.current = true
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

      if (scannerRef.current) {
        const scannerInstance = scannerRef.current
        const clearScanner = () => {
          try {
            scannerInstance.clear()
          } catch (error: unknown) {
            console.error("Error clearing scanner:", error)
          } finally {
            scannerRef.current = null
            isScanningRef.current = false
          }
        }

        if (isScanningRef.current) {
          scannerInstance
            .stop()
            .then(clearScanner)
            .catch((error) => {
              console.error("Error stopping scanner:", error)
              clearScanner()
            })
        } else {
          clearScanner()
        }
      }
    }
  }, [open, scannerElementId, accessGranted, apiUrl])


  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setAccessGranted(false)
          setScanError("")
          setScanStatus("Inicializando cámara...")
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
          <div className="relative rounded-md border border-green-300 bg-green-100 p-6">
            <button
              type="button"
              aria-label="Cerrar"
              className="absolute right-3 top-3 rounded-sm p-1 text-green-900 hover:bg-green-200"
              onClick={() => {
                setAccessGranted(false)
                setOpen(false)
              }}
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mt-4 text-center">
              <h3 className="text-lg font-semibold text-green-900">Acceso concedido</h3>
              <p className="mt-2 text-sm text-green-800">
                El usuario puede acceder correctamente.
              </p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Código QR de acceso</DialogTitle>
              <DialogDescription>
                Escanea este código QR para acceder rápidamente.
              </DialogDescription>
            </DialogHeader>

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
