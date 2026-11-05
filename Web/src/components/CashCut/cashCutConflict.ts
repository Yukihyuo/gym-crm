import axios from "axios"

import { useCashCutStore } from "@/store/cashCutStore"

export const isCashCutConflict = (error: unknown) =>
  axios.isAxiosError(error) &&
  error.response?.status === 409 &&
  String(error.response.data?.code ?? "").startsWith("CASH_CUT_")

/**
 * Si el servidor rechazó el movimiento por la caja (expirada, de otra sucursal o inexistente),
 * resincroniza la caja local con el servidor. Devuelve true cuando fue ese caso.
 */
export async function resolveCashCutConflict(error: unknown) {
  if (!isCashCutConflict(error)) return false

  await useCashCutStore.getState().syncCashCut()
  return true
}
