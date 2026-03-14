import axios from 'axios'
import { useCallback, useEffect, useMemo, useState } from 'react'

type Props = {
  userId: string
}

interface MembershipUser {
  _id: string
  planId: Membership | string | null
  startDate: string
  endDate: string
  status: string
  createdAt: string
  updatedAt: string
}

interface Membership {
  _id: string
  name: string
  status: string
}

export default function MembershipUser({ userId }: Props) {
  const apiUrl = import.meta.env.VITE_API_URL
  const [membershipUser, setMembershipUser] = useState<MembershipUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const asyncLoad = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`${apiUrl}v1/subscriptions-assignments/client/${userId}`)
      const assignment =
        response.data?.assignments?.map((item: MembershipUser) => ({
          _id: item._id,
          planId: item.planId,
          startDate: item.startDate,
          endDate: item.endDate,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }))[0] || null

      setMembershipUser(assignment)
    } catch (error) {
      console.error("Error fetching membership user data:", error)
      setError('No se pudo cargar la membresía del usuario.')
    } finally {
      setLoading(false)
    }
  }, [apiUrl, userId])

  useEffect(() => {
    asyncLoad()
  }, [asyncLoad])

  const planName = useMemo(() => {
    if (!membershipUser || !membershipUser.planId || typeof membershipUser.planId === 'string') {
      return 'Sin plan asignado'
    }

    return membershipUser.planId.name
  }, [membershipUser])

  const isExpired = useMemo(() => {
    if (!membershipUser?.endDate) {
      return true
    }

    const endDate = new Date(membershipUser.endDate)
    if (Number.isNaN(endDate.getTime())) {
      return true
    }

    endDate.setHours(23, 59, 59, 999)
    return endDate.getTime() < Date.now()
  }, [membershipUser])

  const formatDate = (date: string) => {
    const parsedDate = new Date(date)
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Fecha inválida'
    }

    return parsedDate.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }


  return (
    <section className="mt-4  bg-card p-4 text-card-foreground shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Membresía</h2>
        {membershipUser ? (
          <span
            className={
              isExpired
                ? 'rounded-full bg-destructive/15 px-2 py-1 text-xs font-medium text-destructive'
                : 'rounded-full bg-green-500/15 px-2 py-1 text-xs font-medium text-primary'
            }
          >
            {isExpired ? 'Caducada' : 'Vigente'}
          </span>
        ) : null}
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando membresía...</p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : membershipUser ? (
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Plan:</span> {planName}
          </p>
          <p>
            <span className="font-medium">Inicio:</span> {formatDate(membershipUser.startDate)}
          </p>
          <p>
            <span className="font-medium">Fin:</span> {formatDate(membershipUser.endDate)}
          </p>
          <p>
            <span className="font-medium">Estado del registro:</span> {membershipUser.status}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No hay membresía asignada.</p>
      )}
    </section>
  )
}