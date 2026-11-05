export type AccessResultKind = "success" | "error"

export type AccessResultDetail = {
  label: string
  value: string
}

export type AccessResultMembership = {
  name?: string
  description?: string
  duration?: {
    value?: number
    unit?: "days" | "weeks" | "months" | "years" | string
  }
  price?: {
    amount?: number
    currency?: string
  }
}

export type AccessResultLastMembership = {
  planId?: string | null
  name?: string | null
  endDate?: string | null
}

export type AccessResultPayload = {
  kind: AccessResultKind
  title: string
  message: string
  details: AccessResultDetail[]
  code?: string | null
  clientId?: string | null
  client?: string | null
  membership?: AccessResultMembership | null
  lastMembership?: AccessResultLastMembership | null
  daysPending?: number | null
  raw?: unknown
}

export const ACCESS_DENIED_NO_SUBSCRIPTION = "NO_ACTIVE_SUBSCRIPTION"

// Un rechazo es "renovable" cuando sabemos quién es el cliente y el motivo es la membresía.
export const isRenewableDenial = (
  payload: AccessResultPayload | null | undefined
): payload is AccessResultPayload & { clientId: string } =>
  payload?.kind === "error" &&
  payload.code === ACCESS_DENIED_NO_SUBSCRIPTION &&
  Boolean(payload.clientId)

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null
}

const toText = (value: unknown, fallback = "No disponible") => {
  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return fallback
}

const normalizeDetails = (details: unknown, payload: Record<string, unknown>) => {
  if (Array.isArray(details)) {
    const mapped = details
      .filter(isRecord)
      .map((item) => ({
        label: toText(item.label, "Detalle"),
        value: toText(item.value),
      }))

    if (mapped.length) {
      return mapped
    }
  }

  const fallbackDetails: AccessResultDetail[] = []

  if (payload.client !== undefined) {
    fallbackDetails.push({ label: "Cliente", value: toText(payload.client) })
  }

  const membership = isRecord(payload.membership) ? payload.membership : null
  if (membership?.name !== undefined) {
    fallbackDetails.push({ label: "Plan", value: toText(membership.name) })
  }

  if (payload.daysPending !== undefined) {
    fallbackDetails.push({ label: "Vigencia", value: toText(payload.daysPending) })
  }

  if (membership?.description !== undefined) {
    fallbackDetails.push({ label: "Descripción", value: toText(membership.description) })
  }

  return fallbackDetails
}

export const normalizeAccessResult = (input: unknown): AccessResultPayload => {
  const payload = isRecord(input) ? input : {}
  const hasExplicitKind = payload.kind === "success" || payload.kind === "error"
  const kind: AccessResultKind = hasExplicitKind
    ? payload.kind
    : payload.success === false
      ? "error"
      : "success"

  const title = toText(payload.title, kind === "success" ? "Acceso concedido" : "Acceso denegado")
  const message = toText(
    payload.message,
    kind === "success"
      ? "Se registró el acceso correctamente para el cliente."
      : "No fue posible registrar el acceso."
  )

  const lastMembership = isRecord(payload.lastMembership)
    ? {
        planId: typeof payload.lastMembership.planId === "string" ? payload.lastMembership.planId : null,
        name: typeof payload.lastMembership.name === "string" ? payload.lastMembership.name : null,
        endDate: typeof payload.lastMembership.endDate === "string" ? payload.lastMembership.endDate : null,
      }
    : null

  return {
    kind,
    title,
    message,
    code: typeof payload.code === "string" ? payload.code : null,
    clientId: typeof payload.clientId === "string" ? payload.clientId : null,
    client: typeof payload.client === "string" ? payload.client : null,
    membership: isRecord(payload.membership) ? (payload.membership as AccessResultMembership) : null,
    lastMembership,
    daysPending: typeof payload.daysPending === "number" ? payload.daysPending : null,
    details: normalizeDetails(payload.details, payload),
    raw: input,
  }
}