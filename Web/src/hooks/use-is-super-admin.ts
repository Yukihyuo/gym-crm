import { useEffect } from "react"

import { API_ENDPOINTS } from "@/config/api"
import apiClient from "@/lib/axios"
import { useAuthStore } from "@/store/authStore"
import { useRoleStore } from "@/store/roleStore"

const SUPER_ADMIN_ROLE = "Super Admin"

/**
 * Indica si el usuario actual tiene el rol "Super Admin" (fuente de verdad: el
 * servidor, a través de sus asignaciones de rol). Se cachea para no repetir la
 * consulta en cada visita al home.
 */
export function useIsSuperAdmin() {
  const userId = useAuthStore((state) => state.user?.id ?? null)
  const isSuperAdmin = useRoleStore((state) => state.isSuperAdmin)
  const setIsSuperAdmin = useRoleStore((state) => state.setIsSuperAdmin)

  useEffect(() => {
    let mounted = true

    const check = async () => {
      if (!userId) {
        if (mounted) setIsSuperAdmin(false)
        return
      }

      try {
        const response = await apiClient.get(API_ENDPOINTS.STAFF.GET_BY_ID(userId))
        const assignments = response.data?.user?.assignments ?? []
        const isSuper = assignments.some(
          (assignment: { roleName?: string }) => assignment.roleName === SUPER_ADMIN_ROLE
        )
        if (mounted) setIsSuperAdmin(isSuper)
      } catch {
        if (mounted) setIsSuperAdmin(false)
      }
    }

    void check()

    return () => {
      mounted = false
    }
  }, [setIsSuperAdmin, userId])

  return isSuperAdmin
}
