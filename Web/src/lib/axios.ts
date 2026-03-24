import axios from 'axios'
import { API_URL } from '@/config/api'
import { useAuthStore } from '@/store/authStore'

const apiClient = axios.create({
  baseURL: API_URL,
})

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    const brandId = useAuthStore.getState().getBrandId()
    const activeStoreId = useAuthStore.getState().getActiveStoreId()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (brandId) {
      config.headers['X-Brand-Id'] = brandId
    }
    if (activeStoreId) {
      config.headers['X-Store-Id'] = activeStoreId
    }
    return config
  },
  (error) => Promise.reject(error)
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
    }
    console.log(error.response)
    return Promise.reject(error)
  }
)

export default apiClient
