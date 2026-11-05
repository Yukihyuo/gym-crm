import dayjs from "dayjs"

export type MembershipState = "active" | "expiring" | "upcoming" | "expired" | "cancelled" | "none"

export interface ClientMembership {
  state: MembershipState
  planName: string | null
  startDate: string | null
  endDate: string | null
  daysLeft: number | null
}

export const MEMBERSHIP_META: Record<MembershipState, { label: string; className: string }> = {
  active: { label: "Vigente", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  expiring: { label: "Por vencer", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  upcoming: { label: "Por iniciar", className: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  expired: { label: "Vencida", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
  cancelled: { label: "Cancelada", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
  none: { label: "Sin membresía", className: "bg-muted text-muted-foreground" },
}

export type MembershipFilter = "all" | "valid" | "expiring" | "overdue" | "none"

export const MEMBERSHIP_FILTERS: { value: MembershipFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "valid", label: "Vigentes" },
  { value: "expiring", label: "Por vencer" },
  { value: "overdue", label: "Vencidos" },
  { value: "none", label: "Sin membresía" },
]

const FILTER_STATES: Record<Exclude<MembershipFilter, "all">, MembershipState[]> = {
  valid: ["active", "upcoming"],
  expiring: ["expiring"],
  overdue: ["expired", "cancelled"],
  none: ["none"],
}

export const matchesMembershipFilter = (membership: ClientMembership | undefined, filter: MembershipFilter) =>
  filter === "all" || FILTER_STATES[filter].includes(membership?.state ?? "none")

/** El socio no puede entrar hoy, o está a punto de no poder: la recepción debe ofrecer cobrar. */
export const needsRenewal = (membership?: ClientMembership) =>
  !membership || ["expiring", "expired", "cancelled", "none"].includes(membership.state)

const formatDate = (value: string | null) => (value ? dayjs(value).format("DD/MM/YYYY") : "")

export const describeMembership = (membership: ClientMembership): string => {
  const plan = membership.planName ? `${membership.planName} · ` : ""

  switch (membership.state) {
    case "active":
    case "expiring": {
      const days = membership.daysLeft ?? 0
      const remaining = days <= 0 ? "vence hoy" : days === 1 ? "vence mañana" : `${days} días restantes`
      return `${plan}${remaining} (${formatDate(membership.endDate)})`
    }
    case "upcoming":
      return `${plan}inicia el ${formatDate(membership.startDate)}`
    case "expired":
      return `${plan}venció el ${formatDate(membership.endDate)}`
    case "cancelled":
      return `${plan}cancelada`
    default:
      return "Nunca ha pagado una membresía"
  }
}

export const formatLastVisit = (value?: string | null): string => {
  if (!value) return "Sin visitas"

  const visit = dayjs(value)
  const days = dayjs().startOf("day").diff(visit.startOf("day"), "day")

  if (days <= 0) return `Hoy, ${visit.format("HH:mm")}`
  if (days === 1) return "Ayer"
  if (days < 30) return `Hace ${days} días`
  return visit.format("DD/MM/YYYY")
}

/** Normaliza para buscar sin importar mayúsculas ni acentos ("Ortíz" == "ortiz"). */
export const normalizeText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
