import { useEffect, useMemo, useState } from 'react'
import dayjs from "dayjs"
import axios from "axios"

type Props = {
  userId: string
}

interface Visit {
  _id: string
  clientId: string
  storeId: string
  accessMethod: string
  isTrial: boolean
  createdAt: Date
}

export default function AssistanceComponent({ userId }: Props) {
  const apiUrl = import.meta.env.VITE_API_URL

  const formatMonthName = (monthIndex: number) => {
    return new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(2000, monthIndex, 1))
  }

  const formatMonthYear = (year: number, monthIndex: number) => {
    return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(year, monthIndex, 1))
  }

  const [visits, setVisits] = useState<Visit[]>([])
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month())
  const [selectedYear, setSelectedYear] = useState(dayjs().year())

  const monthStart = useMemo(() => {
    return dayjs().year(selectedYear).month(selectedMonth).startOf('month')
  }, [selectedMonth, selectedYear])

  const monthEnd = useMemo(() => {
    return dayjs().year(selectedYear).month(selectedMonth).endOf('month')
  }, [selectedMonth, selectedYear])

  const monthDays = useMemo(() => {
    return monthEnd.date()
  }, [monthEnd])

  const weekOffset = useMemo(() => {
    return (monthStart.day() + 6) % 7
  }, [monthStart])

  const visitDays = useMemo(() => {
    const daysSet = new Set<number>()

    visits.forEach((visit) => {
      const visitDate = dayjs(visit.createdAt)
      if (
        visitDate.year() === selectedYear &&
        visitDate.month() === selectedMonth
      ) {
        daysSet.add(visitDate.date())
      }
    })

    return daysSet
  }, [visits, selectedMonth, selectedYear])

  const calendarCells = useMemo(() => {
    const blankCells = Array.from({ length: weekOffset }).map((_, index) => ({
      key: `blank-${index}`,
      day: null as number | null,
    }))

    const dayCells = Array.from({ length: monthDays }).map((_, index) => {
      const dayNumber = index + 1
      return {
        key: `day-${dayNumber}`,
        day: dayNumber,
      }
    })

    return [...blankCells, ...dayCells]
  }, [monthDays, weekOffset])

  const years = useMemo(() => {
    const currentYear = dayjs().year()
    return Array.from({ length: 7 }).map((_, index) => currentYear - 3 + index)
  }, [])

  const goToPreviousMonth = () => {
    const previousDate = dayjs().year(selectedYear).month(selectedMonth).subtract(1, 'month')
    setSelectedMonth(previousDate.month())
    setSelectedYear(previousDate.year())
  }

  const goToNextMonth = () => {
    const nextDate = dayjs().year(selectedYear).month(selectedMonth).add(1, 'month')
    setSelectedMonth(nextDate.month())
    setSelectedYear(nextDate.year())
  }

  useEffect(() => {
    let isMounted = true

    const loadVisits = async () => {
      try {
        const response = await axios.get(`${apiUrl}v1/clients/assistance/${userId}`)
        if (isMounted) {
          setVisits(response.data.visits || [])
        }
      } catch (error) {
        console.error("Error fetching assistance data:", error)
        if (isMounted) {
          setVisits([])
        }
      }
    }

    void loadVisits()

    return () => {
      isMounted = false
    }
  }, [apiUrl, userId])


  return (
    <div>
      <h2 className='text-lg font-semibold my-4' >Asistencias</h2>

      <div className='space-y-4'>
        <div className='flex items-center justify-between gap-2'>
          <button
            type='button'
            onClick={goToPreviousMonth}
            className='rounded-md border border-input px-3 py-2 text-sm hover:bg-muted'
          >
            Mes anterior
          </button>

          <p className='text-sm font-medium capitalize'>
            {formatMonthYear(selectedYear, selectedMonth)}
          </p>

          <button
            type='button'
            onClick={goToNextMonth}
            className='rounded-md border border-input px-3 py-2 text-sm hover:bg-muted'
          >
            Mes siguiente
          </button>
        </div>

        <div className='flex gap-2'>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(Number(event.target.value))}
            className='flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm'
          >
            {Array.from({ length: 12 }).map((_, monthIndex) => (
              <option key={monthIndex} value={monthIndex}>
                {formatMonthName(monthIndex)}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(Number(event.target.value))}
            className='flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm'
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className='rounded-md'>
          <div className='mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground'>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((weekday) => (
              <div key={weekday}>{weekday}</div>
            ))}
          </div>

          <div className='grid grid-cols-7 gap-1'>
            {calendarCells.map((cell) => {
              if (!cell.day) {
                return <div key={cell.key} className='h-10 rounded-md' />
              }

              const hasVisit = visitDays.has(cell.day)

              return (
                <div
                  key={cell.key}
                  className={`flex h-10 items-center justify-center rounded-md text-sm ${hasVisit
                    ? 'bg-green-100 text-green-700 border-green-200'
                    : 'bg-background text-foreground border-border'
                    }`}
                >
                  {cell.day}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}