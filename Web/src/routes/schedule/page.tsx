import axios from 'axios'
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { es } from "date-fns/locale"
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks, addDays } from 'date-fns'
import { API_ENDPOINTS } from '@/config/api'

import { PageHeader } from '@/components/global/PageHeader'
import NewScheduleModal from '@/components/schedules/NewScheduleModal'

import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useAuthStore } from '@/store/authStore'

export default function Page() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [weekEnd, setWeekEnd] = useState<Date>(endOfWeek(new Date(), { weekStartsOn: 1 }))
  const [Users, setUsers] = useState([])
  const [Schedules, setSchedules] = useState([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const activeStoreId = useAuthStore((state) => state.getActiveStoreId())

  const updateWeekRange = (selectedDate: Date) => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 })
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 })
    setWeekStart(start)
    setWeekEnd(end)
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate)
      updateWeekRange(selectedDate)
    }
  }

  const goToPreviousWeek = () => {
    const newDate = subWeeks(date || new Date(), 1)
    setDate(newDate)
    updateWeekRange(newDate)
  }

  const goToNextWeek = () => {
    const newDate = addWeeks(date || new Date(), 1)
    setDate(newDate)
    updateWeekRange(newDate)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filteredSchedules = useMemo<any[]>(() => {
    if (!selectedUserId) {
      return []
    }

    const weekStartTime = weekStart.getTime()
    const weekEndTime = weekEnd.getTime()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = Schedules.filter((schedule: any) => {
      if (schedule.userId !== selectedUserId) return false

      const validFromTime = new Date(schedule.validFrom).getTime()
      if (validFromTime > weekEndTime) return false
      if (!schedule.validUntil) return true
      const validUntilTime = new Date(schedule.validUntil).getTime()

      if (validUntilTime < weekStartTime) return false

      return true
    })

    console.log('Horarios filtrados para la semana:', filtered)
    return filtered
  }, [selectedUserId, weekStart, weekEnd, Schedules])

  // Generar vista por día de la semana
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const weekDaysSchedule = useMemo<any[]>(() => {
    const days = []
    
    // Generar cada día de la semana (lunes a domingo)
    for (let i = 0; i < 7; i++) {
      const currentDay = addDays(weekStart, i)
      const dayOfWeek = currentDay.getDay() // 0 = domingo, 1 = lunes, etc.
      const currentDayTime = currentDay.getTime()
      
      // Encontrar el horario activo para este día específico
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const activeSchedule = filteredSchedules.find((schedule: any) => {
        const validFromTime = new Date(schedule.validFrom).getTime()
        const validUntilTime = schedule.validUntil ? new Date(schedule.validUntil).getTime() : Infinity
        
        // El horario debe estar activo en este día específico
        return currentDayTime >= validFromTime && currentDayTime <= validUntilTime
      })
      
      // Buscar configuración de este día de la semana
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dayConfig = activeSchedule?.days.find((d: any) => d.dayOfWeek === dayOfWeek)
      
      days.push({
        date: currentDay,
        dayOfWeek,
        dayName: format(currentDay, 'EEE', { locale: es }),
        dayNumber: format(currentDay, 'd'),
        schedule: activeSchedule,
        dayConfig
      })
    }
    
    return days
  }, [filteredSchedules, weekStart])

  const asyncLoad = useCallback(async () => {
    if (!activeStoreId) {
      setSchedules([])
      return
    }

    axios.get(API_ENDPOINTS.STAFF.GET_BY_STORE(activeStoreId || "")).then((response) => {
      console.log(response.data)
      setUsers(response.data.users)
    })
    axios.get(API_ENDPOINTS.SCHEDULES.GET_ALL(activeStoreId || "")).then((response) => {
      console.log(response.data)
      setSchedules(response.data.schedules)
    })
  }, [activeStoreId])


  useEffect(() => {
    asyncLoad()
  }, [asyncLoad])


  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Gestión de Horarios" }
        ]}
        title="Horarios"
        description={`Administra los horarios del sistema.`}
        icon={<Clock className="h-5 w-5" />}

      />
      <div className='grid w-full grid-cols-1 border-t border-gray-300 lg:grid-cols-[auto_minmax(0,1fr)] lg:divide-x lg:divide-gray-300'>
        <div className='overflow-x-auto'>

          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            className="rounded-lg"
            captionLayout="label"
            locale={es}
          />
        </div>

        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-1 px-2' >
            <div className='flex items-center gap-2 p-2' >

              <span className="font-medium text-sm">
                {format(weekStart, 'd', { locale: es })}-{format(weekEnd, 'd MMM', { locale: es })}
              </span>
              <ToggleGroup variant="outline" type="single" defaultValue="all">
                <ToggleGroupItem value="previous"
                  onClick={goToPreviousWeek}>

                  <ChevronLeft className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value='next' onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />

                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className='min-w-40 flex-1 p-2' >
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="border-none shadow-none bg-transparent focus:ring-0 px-0 text-lg ">
                  <SelectValue placeholder="Usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      Users.map((user: any) => (
                        <SelectItem key={user._id} value={user._id}>{user.profile.names} {user.profile.lastNames}</SelectItem>
                      ))
                    }
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className='p-2 sm:ml-auto' ><NewScheduleModal /></div>
          </div>

          {/* Mostrar horarios filtrados */}
          {selectedUserId && (
            <div className='p-4'>
              <h3 className='font-semibold mb-3'>
                Horario de la semana
              </h3>
              {filteredSchedules.length === 0 ? (
                <p className='text-gray-500 text-sm'>No hay horarios activos para esta semana</p>
              ) : (
                <div>
                  {/* Vista por día de la semana */}
                  <div className='-mx-1 mb-6 overflow-x-auto px-1'>
                  <div className='grid min-w-[36rem] grid-cols-7 gap-3'>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {weekDaysSchedule.map((day: any, idx: number) => (
                      <div key={idx} className='border rounded-lg p-2'>
                        <div className='text-center mb-2'>
                          <div className='font-semibold text-sm capitalize'>{day.dayName}</div>
                          <div className='text-xs text-gray-500'>{day.dayNumber}</div>
                        </div>
                        
                        {day.schedule ? (
                          <div className='space-y-1'>
                            {/* Indicador de qué horario aplica */}
                            <div className='text-xs text-gray-500 text-center border-b pb-1'>
                              {format(new Date(day.schedule.validFrom), 'dd/MM', { locale: es })}
                              {day.schedule.validUntil && ` - ${format(new Date(day.schedule.validUntil), 'dd/MM', { locale: es })}`}
                            </div>
                            
                            {day.dayConfig && day.dayConfig.active ? (
                              <div className='space-y-1'>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {day.dayConfig.slots.map((slot: any, slotIdx: number) => (
                                  <div key={slotIdx} className='text-center bg-blue-50 rounded px-2 py-1'>
                                    <div className='text-xs font-medium'>{slot.startTime}</div>
                                    <div className='text-xs font-medium'>{slot.endTime}</div>
                                    {slot.label && <div className='text-xs text-gray-600 mt-0.5'>{slot.label}</div>}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className='text-center text-gray-400 text-xs py-2'>Libre</div>
                            )}
                          </div>
                        ) : (
                          <div className='text-center text-gray-400 text-xs py-2'>Sin horario</div>
                        )}
                      </div>
                    ))}
                  </div>
                  </div>

                  {/* Resumen de horarios activos */}
                  <div className='border-t pt-4'>
                    <h4 className='font-semibold text-sm mb-2'>
                      Horarios aplicados ({filteredSchedules.length})
                    </h4>
                    <div className='space-y-2'>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {filteredSchedules.map((schedule: any) => (
                        <div key={schedule._id} className='text-xs bg-gray-50 rounded p-2 flex justify-between items-center'>
                          <span className='font-medium'>
                            Desde: {format(new Date(schedule.validFrom), 'dd/MM/yyyy', { locale: es })}
                          </span>
                          <span className='text-gray-600'>
                            {schedule.validUntil 
                              ? `Hasta: ${format(new Date(schedule.validUntil), 'dd/MM/yyyy', { locale: es })}`
                              : 'Activo indefinidamente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  )
}
