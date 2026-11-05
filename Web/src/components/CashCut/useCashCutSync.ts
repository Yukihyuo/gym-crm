import { useEffect, useRef } from "react"

import { useAuthStore } from "@/store/authStore"
import { useCashCutStore } from "@/store/cashCutStore"

/**
 * Mantiene la caja local alineada con el servidor: al iniciar sesión, al cambiar de
 * sucursal (la caja de la sucursal anterior se descarta de inmediato) y al volver a la pestaña.
 */
export function useCashCutSync() {
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const storeId = useAuthStore((state) => state.getActiveStoreId())
  const syncCashCut = useCashCutStore((state) => state.syncCashCut)
  const clearCashCut = useCashCutStore((state) => state.clearCashCut)
  const previousStoreId = useRef(storeId)

  useEffect(() => {
    if (previousStoreId.current !== storeId) {
      previousStoreId.current = storeId
      clearCashCut()
    }

    if (userId) {
      void syncCashCut()
    }
  }, [userId, storeId, syncCashCut, clearCashCut])

  useEffect(() => {
    if (!userId) return

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void syncCashCut()
      }
    }

    window.addEventListener("focus", handleVisibility)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener("focus", handleVisibility)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [userId, syncCashCut])
}
