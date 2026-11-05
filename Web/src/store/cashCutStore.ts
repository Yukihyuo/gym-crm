import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'
import apiClient from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'
import { useAuthStore } from '@/store/authStore'

type OpenCashCutPayload = {
	initialCash?: number
}

type CloseCashCutPayload = {
	cashInHand: number
	transferReceipts?: number
	cardSlips?: number
	notes?: string
}

type CashCutApiResponse = {
	message?: string
	cashCut?: {
		_id?: string
		id?: string
	}
}

interface CashCutState {
	cashCutId: string | null
	loading: boolean
	syncing: boolean
	error: string | null
	setCashCutId: (cashCutId: string | null) => void
	clearCashCut: () => void
	syncCashCut: () => Promise<string | null>
	openCashCut: (payload?: OpenCashCutPayload) => Promise<string>
	closeCashCut: (payload: CloseCashCutPayload) => Promise<void>
}

export const useCashCutStore = create<CashCutState>()(
	persist(
		(set, get) => ({
			cashCutId: null,
			loading: false,
			syncing: false,
			error: null,

			setCashCutId: (cashCutId) => set({ cashCutId, error: null }),

			clearCashCut: () => set({ cashCutId: null, loading: false, error: null }),

			// El servidor es la fuente de verdad: la caja es por usuario + sucursal activa.
			syncCashCut: async () => {
				const { getUserId, getActiveStoreId } = useAuthStore.getState()
				const userId = getUserId()
				const storeId = getActiveStoreId()

				if (!userId || !storeId) {
					set({ cashCutId: null, syncing: false })
					return null
				}

				set({ syncing: true })

				try {
					const response = await apiClient.get<CashCutApiResponse>(
						API_ENDPOINTS.CASH_CUTS.GET_OPEN_BY_USER(userId)
					)
					const serverCashCutId = response.data?.cashCut?._id ?? response.data?.cashCut?.id ?? null

					// Si la sucursal cambió mientras se consultaba, esta respuesta ya no aplica.
					if (useAuthStore.getState().getActiveStoreId() !== storeId) return get().cashCutId

					set({ cashCutId: serverCashCutId, syncing: false })
					return serverCashCutId
				} catch (error) {
					if (useAuthStore.getState().getActiveStoreId() !== storeId) return get().cashCutId

					if (axios.isAxiosError(error) && error.response?.status === 404) {
						set({ cashCutId: null, syncing: false })
						return null
					}

					// Sin conexión u otro error: se conserva el último estado conocido.
					set({ syncing: false })
					return get().cashCutId
				}
			},

			openCashCut: async (payload) => {
				const { getUserId, getBrandId, getActiveStoreId } = useAuthStore.getState()
				const staffId = getUserId()
				const brandId = getBrandId()
				const storeId = getActiveStoreId()

				if (!staffId) {
					throw new Error('No se encontró staffId en sesión')
				}

				if (!brandId) {
					throw new Error('No se encontró brandId en sesión')
				}

				if (!storeId) {
					throw new Error('No se encontró storeId activo en sesión')
				}

				try {
					set({ loading: true, error: null })

					const response = await apiClient.post<CashCutApiResponse>(API_ENDPOINTS.CASH_CUTS.OPEN, {
						staffId,
						brandId,
						storeId,
						initialCash: payload?.initialCash ?? 0,
					})

					const newCashCutId = response.data?.cashCut?._id ?? response.data?.cashCut?.id

					if (!newCashCutId) {
						throw new Error('La respuesta no contiene cashCut._id')
					}

					set({
						cashCutId: newCashCutId,
						loading: false,
						error: null,
					})

					return newCashCutId
				} catch (error) {
					// La caja ya existe en el servidor pero este navegador la perdió: se reutiliza en vez de bloquear al cajero.
					const existingId = axios.isAxiosError(error)
						? (error.response?.data as CashCutApiResponse | undefined)?.cashCut?._id
						: undefined

					if (existingId) {
						set({ cashCutId: existingId, loading: false, error: null })
						return existingId
					}

					const message = error instanceof Error ? error.message : 'Error al abrir caja'
          console.log(error)
					set({ loading: false, error: message })
					throw error
				}
			},

			closeCashCut: async (payload) => {
				const currentCashCutId = get().cashCutId

				if (!currentCashCutId) {
					throw new Error('No hay una caja abierta para cerrar')
				}

				try {
					set({ loading: true, error: null })

					await apiClient.post<CashCutApiResponse>(API_ENDPOINTS.CASH_CUTS.CLOSE(currentCashCutId), {
						reportedTotals: {
							cashInHand: payload.cashInHand,
							transferReceipts: payload.transferReceipts ?? 0,
							cardSlips: payload.cardSlips ?? 0,
						},
						notes: payload.notes ?? '',
					})

					set({
						cashCutId: null,
						loading: false,
						error: null,
					})
				} catch (error) {
					const message = error instanceof Error ? error.message : 'Error al cerrar caja'
					set({ loading: false, error: message })
					throw error
				}
			},
		}),
		{
			name: 'cash-cut-storage',
			partialize: (state) => ({ cashCutId: state.cashCutId }),
		}
	)
)
