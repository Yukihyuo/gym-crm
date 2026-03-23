import { useCallback, useEffect, useId, useRef, useState } from "react"
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

export type QrLoginResponse = {
  success?: boolean
  message: string
  client?: string
  membership?: MembershipInfo | null
  daysPending?: number
}

type Mode = "qr" | "manual"

type UseClientAccessFlowOptions = {
  enabled: boolean
}

export function useClientAccessFlow({ enabled }: UseClientAccessFlowOptions) {
  const apiUrl = `${import.meta.env.VITE_API_URL}v1/clients/login-qr`
  const contactApiUrl = `${import.meta.env.VITE_API_URL}v1/clients/login-qr-contact`

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

  const stopScanner = useCallback(async (scannerInstance = scannerRef.current) => {
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
  }, [])

  const resetAccessFlow = useCallback(() => {
    setAccessGranted(false)
    setAccessData(null)
    setScanError("")
    setScanStatus("Inicializando cámara...")
    setMode("qr")
    setManualInput("")
    setManualError("")
    setManualLoading(false)
  }, [])

  const manageResponse = useCallback((data: QrLoginResponse) => {
    console.log("Request exitoso:", data)

    if (!data.success) {
      setScanError(data.message ?? "No se pudo registrar el acceso")
      setScanStatus("")
      return
    }

    setAccessGranted(true)
    setAccessData(data)
    setScanStatus(data.message)
    setScanError("")

    const scannerInstance = scannerRef.current
    if (scannerInstance) {
      void stopScanner(scannerInstance)
    }
  }, [stopScanner])

  const manualLogin = useCallback(async () => {
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
  }, [contactApiUrl, manualInput, manageResponse])

  useEffect(() => {
    if (!enabled || accessGranted || mode !== "qr") {
      return
    }

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
      try {
        const response = await axios.post<QrLoginResponse>(apiUrl, { qrData: decodedText })
        if (!mounted) {
          return
        }

        manageResponse(response.data)
      } catch (error: unknown) {
        console.error("Error en login con QR:", error)
        if (!mounted) {
          return
        }

        if (axios.isAxiosError(error) && error.response) {
          setScanError(error.response.data?.message ?? "Error al registrar acceso")
        } else {
          setScanError("Error de red. Intenta nuevamente.")
        }

        setScanStatus("")
      }
    }

    const startScanner = async () => {
      try {
        await waitForReaderElement()

        if (!mounted) {
          return
        }

        const scanner = new Html5Qrcode(scannerElementId)
        scannerRef.current = scanner

        const config = {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1,
        }

        const onDecodeSuccess = (decodedText: string) => {
          if (!mounted) {
            return
          }

          void loginWithQR(decodedText)
          setScanStatus("QR leído correctamente")
          setScanError("")
        }

        const onDecodeError = (errorMessage: string) => {
          const expectedNotFoundError =
            typeof errorMessage === "string" &&
            (errorMessage.includes("NotFoundException") || errorMessage.includes("QR code parse error"))

          if (expectedNotFoundError) {
            return
          }

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

        setScanStatus("Escaneando... acerca el QR al recuadro")
        setScanError("")
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
  }, [accessGranted, apiUrl, enabled, manageResponse, mode, scannerElementId, stopScanner])

  return {
    mode,
    setMode,
    manualInput,
    setManualInput,
    manualError,
    manualLoading,
    scanStatus,
    scanError,
    accessGranted,
    accessData,
    scannerElementId,
    resetAccessFlow,
    manualLogin,
    clearManualError: () => setManualError(""),
  }
}

export type ClientAccessFlowState = ReturnType<typeof useClientAccessFlow>
