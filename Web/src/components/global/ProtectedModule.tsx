import { useAuthStore } from '@/store/authStore';
import { useModulesStore } from '@/store/modulesStore';
import React, { useMemo } from 'react'

type Props = {
  children: React.ReactNode;
  page: string;
  type?: "read" | "create" | "delete" | "update";
  method: "hide" | "block";
}

interface Module {
  _id?: string
  id?: string
  pageId: string
  page: string
  type: "read" | "create" | "delete" | "update"
}

export default function ProtectedModule({ children, page, type, method }: Props) {
  const modules = useModulesStore((state) => state.modules as Module[])
  const userModules = useAuthStore((state) => state.access?.permissions ?? [])

  const hasAccess = useMemo(() => {
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

  if (!hasAccess && method === "hide") {
    return null
  }

  if (!hasAccess && method === "block") {
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded">
        <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
        <p>You do not have permission to view this module.</p>
      </div>
    )
  }

  return (
    <>{children}</>
  )
}