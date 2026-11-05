import { useMemo } from "react"

import { useAuthStore } from "@/store/authStore"
import { useModulesStore } from "@/store/modulesStore"

export type ModuleAccessType = "read" | "create" | "delete" | "update"

interface Module {
  _id?: string
  id?: string
  pageId: string
  page: string
  type: ModuleAccessType
}

export function useModuleAccess(page: string, type?: ModuleAccessType) {
  const modules = useModulesStore((state) => state.modules as Module[])
  const userModules = useAuthStore((state) => state.access?.permissions ?? [])

  return useMemo(() => {
    if (!userModules.length || !modules.length) {
      return false
    }

    const pageModules = modules.filter((mod) => mod.page === page && (type ? mod.type === type : true))
    if (!pageModules.length) {
      return false
    }

    const ids = new Set(
      pageModules
        .map((mod) => mod._id ?? mod.id)
        .filter((value): value is string => Boolean(value))
    )

    return userModules.some((modId) => ids.has(modId))
  }, [modules, page, type, userModules])
}
