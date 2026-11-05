import axios from "axios"
import { normalizeAccessResult, type AccessResultPayload } from "./accessResult"

const ACCESS_URL = `${import.meta.env.VITE_API_URL}v1/clients/login-qr`
const ACCESS_CONTACT_URL = `${import.meta.env.VITE_API_URL}v1/clients/login-qr-contact`

// El backend responde 403 con un payload de acceso cuando el cliente es rechazado;
// ese payload se conserva para poder resolver el rechazo en lugar de perderlo como error genérico.
const requestAccess = async (url: string, body: Record<string, string>): Promise<AccessResultPayload> => {
  try {
    const response = await axios.post<unknown>(url, body)
    return normalizeAccessResult(response.data)
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      return normalizeAccessResult({
        kind: "error",
        message: "Error al registrar acceso",
        ...(typeof error.response.data === "object" ? error.response.data : {}),
      })
    }

    return normalizeAccessResult({ kind: "error", message: "Error de red. Intenta nuevamente." })
  }
}

export const requestAccessByQr = (qrData: string) => requestAccess(ACCESS_URL, { qrData })

// El backend resuelve también el _id del cliente, útil para reintentar tras renovar.
export const requestAccessByClientId = (clientId: string) => requestAccessByQr(clientId)

export const requestAccessByContact = (value: string) =>
  requestAccess(ACCESS_CONTACT_URL, value.includes("@") ? { email: value } : { phone: value })
