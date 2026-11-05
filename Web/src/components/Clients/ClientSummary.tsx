import { AlertCircle, User } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  MEMBERSHIP_META,
  describeMembership,
  type ClientMembership,
} from "@/components/Clients/clientMembership"

type ClientIdentityProps = {
  names: string
  lastNames: string
  username: string
  email?: string
  phone?: string
  active: boolean
  /** Hay otro socio con el mismo nombre: se resalta para que no se confundan. */
  isNameRepeated?: boolean
}

const MissingData = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
    <AlertCircle className="h-3 w-3" />
    {children}
  </span>
)

export function ClientIdentity({
  names,
  lastNames,
  username,
  email,
  phone,
  active,
  isNameRepeated,
}: ClientIdentityProps) {
  const fullName = `${names} ${lastNames}`.trim()

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback>{names?.[0]?.toUpperCase() || <User className="h-4 w-4" />}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-base font-semibold">{fullName || username}</span>
          <span className="text-xs text-muted-foreground">@{username}</span>
          {isNameRepeated ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Nombre repetido
            </span>
          ) : null}
          {!active ? (
            <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
              Cuenta inactiva
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
          {phone ? <span>{phone}</span> : <MissingData>Sin teléfono</MissingData>}
          {email ? <span className="break-all">{email}</span> : <MissingData>Sin correo</MissingData>}
        </div>
      </div>
    </div>
  )
}

export function MembershipStatus({ membership }: { membership?: ClientMembership }) {
  const state = membership?.state ?? "none"
  const meta = MEMBERSHIP_META[state]

  return (
    <div className="space-y-1">
      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
        {meta.label}
      </span>
      <p className="text-sm text-muted-foreground">
        {membership ? describeMembership(membership) : "Sin información"}
      </p>
    </div>
  )
}
