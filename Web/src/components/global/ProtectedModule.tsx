import React from 'react'
import { useModuleAccess, type ModuleAccessType } from '@/hooks/use-module-access'

type Props = {
  children: React.ReactNode;
  page: string;
  type?: ModuleAccessType;
  method: "hide" | "block";
}

export default function ProtectedModule({ children, page, type, method }: Props) {
  const hasAccess = useModuleAccess(page, type)

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