import { useEffect, useState } from "react"

import apiClient from "@/lib/axios"
import { useAuthStore } from "@/store/authStore"
import { useSocketStore } from "@/store/socketStore"
import { useTerminalStore } from "@/store/terminalStore"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TerminalOption {
  _id: string
  name: string
  isLinked: boolean
}

export function ActiveTerminalSelector() {
  const activeStoreId = useAuthStore((state) => state.getActiveStoreId())
  const selectedTerminalId = useTerminalStore((state) => state.terminalId)
  const setTerminal = useTerminalStore((state) => state.setTerminal)
  const clearTerminal = useTerminalStore((state) => state.clearTerminal)
  const socket = useSocketStore((state) => state.socket)
  const isConnected = useSocketStore((state) => state.isConnected)
  const joinTerminal = useSocketStore((state) => state.joinTerminal)
  const leaveTerminal = useSocketStore((state) => state.leaveTerminal)

  const [terminals, setTerminals] = useState<TerminalOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadTerminals = async () => {
      clearTerminal()

      if (!activeStoreId) {
        setTerminals([])
        return
      }

      setLoading(true)
      try {
        const response = await apiClient.get("v1/terminals/getAll", {
          params: { storeId: activeStoreId },
        })

        if (!isMounted) {
          return
        }

        setTerminals(response.data?.terminals ?? [])
      } catch (error) {
        if (!isMounted) {
          return
        }

        console.error("Error al cargar terminales de la tienda activa:", error)
        setTerminals([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadTerminals()

    return () => {
      isMounted = false
    }
  }, [activeStoreId, clearTerminal])

  useEffect(() => {
    if (!selectedTerminalId || !socket || !isConnected) {
      return
    }

    const logIncomingEvent = (eventName: string, ...args: unknown[]) => {
      console.log(`[Terminal ${selectedTerminalId}] ${eventName}`, ...args)
    }

    joinTerminal(selectedTerminalId)
    socket.onAny(logIncomingEvent)

    return () => {
      socket.offAny(logIncomingEvent)
      leaveTerminal(selectedTerminalId)
    }
  }, [isConnected, joinTerminal, leaveTerminal, selectedTerminalId, socket])

  return (
    <div className="min-w-64 px-4">
      <Select
        value={selectedTerminalId ?? ""}
        onValueChange={(value) => setTerminal(value)}
        disabled={loading || !terminals.length}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={loading ? "Cargando terminales..." : "Selecciona una terminal"}
          />
        </SelectTrigger>
        <SelectContent>
          {terminals.map((terminal) => (
            <SelectItem key={terminal._id} value={terminal._id}>
              {terminal.name}{terminal.isLinked ? "" : " (pendiente)"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}