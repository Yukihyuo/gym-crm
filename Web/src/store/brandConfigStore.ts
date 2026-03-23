import { create } from 'zustand'
import apiClient from '@/lib/axios'
import { API_ENDPOINTS } from '@/config/api'

export interface BrandSettings {
  requireCashClosing: boolean
}

interface BrandConfigState {
  config: BrandSettings | null
  loading: boolean
  error: string | null
  loadedBrandId: string | null
  setConfig: (config: BrandSettings) => void
  clearConfig: () => void
  fetchConfig: (brandId?: string | null) => Promise<BrandSettings | null>
  updateConfig: (settings: Partial<BrandSettings>) => Promise<BrandSettings>
}

type BrandConfigResponse = {
  settings?: Partial<BrandSettings>
}

const normalizeConfig = (settings?: Partial<BrandSettings> | null): BrandSettings => ({
  requireCashClosing: settings?.requireCashClosing ?? false,
})

export const useBrandConfigStore = create<BrandConfigState>((set) => ({
  config: null,
  loading: false,
  error: null,
  loadedBrandId: null,

  setConfig: (config) =>
    set({
      config: normalizeConfig(config),
      error: null,
    }),

  clearConfig: () =>
    set({
      config: null,
      loading: false,
      error: null,
      loadedBrandId: null,
    }),

  fetchConfig: async (brandId) => {
    try {
      set({ loading: true, error: null })
      const response = await apiClient.get<BrandConfigResponse>(API_ENDPOINTS.BRANDS.GET_CONFIG)
      const config = normalizeConfig(response.data?.settings)
      set({
        config,
        loading: false,
        error: null,
        loadedBrandId: brandId ?? null,
      })

      return config
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al obtener la configuración de la marca'

      set({
        loading: false,
        error: message,
      })

      throw error
    }
  },

  updateConfig: async (settings) => {
    try {
      set({ loading: true, error: null })
      const response = await apiClient.put<BrandConfigResponse>(API_ENDPOINTS.BRANDS.UPDATE_CONFIG, settings)
      const config = normalizeConfig(response.data?.settings)

      set((state) => ({
        config,
        loading: false,
        error: null,
        loadedBrandId: state.loadedBrandId,
      }))

      return config
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al actualizar la configuración de la marca'

      set({
        loading: false,
        error: message,
      })

      throw error
    }
  },
}))
