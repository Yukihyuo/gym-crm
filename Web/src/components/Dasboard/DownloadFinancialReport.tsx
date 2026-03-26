import { useMemo, useState } from 'react'
import { CalendarIcon, Download } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DateRange } from 'react-day-picker'
import {
  endOfDay,
  endOfMonth,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'

import apiClient from '@/lib/axios'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

const toInputDate = (date: Date) => format(date, 'yyyy-MM-dd')

type PresetRange = {
  key: string
  label: string
  getRange: (baseDate: Date) => DateRange
}

const PRESET_RANGES: PresetRange[] = [
  {
    key: 'today',
    label: 'Hoy',
    getRange: (baseDate) => ({
      from: startOfDay(baseDate),
      to: endOfDay(baseDate),
    }),
  },
  {
    key: 'current-month',
    label: 'Mes en curso',
    getRange: (baseDate) => ({
      from: startOfMonth(baseDate),
      to: endOfDay(baseDate),
    }),
  },
  {
    key: 'last-7-days',
    label: 'Ultimos 7 dias',
    getRange: (baseDate) => ({
      from: startOfDay(subDays(baseDate, 6)),
      to: endOfDay(baseDate),
    }),
  },
  {
    key: 'last-4-weeks',
    label: 'Ultimas 4 semanas',
    getRange: (baseDate) => ({
      from: startOfDay(subDays(baseDate, 27)),
      to: endOfDay(baseDate),
    }),
  },
  {
    key: 'last-month',
    label: 'Mes anterior',
    getRange: (baseDate) => {
      const previousMonth = subMonths(baseDate, 1)
      return {
        from: startOfMonth(previousMonth),
        to: endOfMonth(previousMonth),
      }
    },
  },
  {
    key: 'all',
    label: 'Todas',
    getRange: (baseDate) => ({
      from: startOfMonth(subMonths(baseDate, 11)),
      to: endOfDay(baseDate),
    }),
  },
]

export default function DownloadFinancialReport() {
  const today = useMemo(() => new Date(), [])
  const [open, setOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPreset, setSelectedPreset] = useState<string>('today')
  const [range, setRange] = useState<DateRange | undefined>({
    from: today,
    to: today,
  })

  const presetWithFormattedRanges = useMemo(
    () =>
      PRESET_RANGES.map((preset) => {
        const presetRange = preset.getRange(today)
        const fromLabel = presetRange.from ? format(presetRange.from, 'd MMM', { locale: es }) : '-'
        const toLabel = presetRange.to ? format(presetRange.to, 'd MMM', { locale: es }) : '-'
        return {
          ...preset,
          range: presetRange,
          preview: `${fromLabel}-${toLabel}`,
        }
      }),
    [today]
  )

  const formattedRange = useMemo(() => {
    if (!range?.from) return 'Selecciona un rango'
    const from = format(range.from, 'dd MMM yyyy', { locale: es })
    if (!range.to) return from
    const to = format(range.to, 'dd MMM yyyy', { locale: es })
    return `${from} - ${to}`
  }, [range])

  const handleDownload = async () => {
    if (!range?.from || !range?.to) {
      setError('Debes seleccionar fecha de inicio y fin.')
      return
    }

    try {
      setError(null)
      setIsDownloading(true)

      const response = await apiClient.get('/v1/documents/financial-report/download', {
        params: {
          startDate: toInputDate(range.from),
          endDate: toInputDate(range.to),
        },
        responseType: 'blob',
      })

      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const contentDisposition = response.headers['content-disposition'] as string | undefined
      const fileNameMatch = contentDisposition?.match(/filename="?([^"]+)"?/)?.[1]
      link.href = url
      link.download = fileNameMatch || `reporte-financiero-${toInputDate(range.from)}-${toInputDate(range.to)}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setOpen(false)
    } catch (downloadError: unknown) {
      const fallbackMessage = 'No se pudo descargar el reporte financiero.'
      if (typeof downloadError === 'object' && downloadError !== null && 'response' in downloadError) {
        const errorWithResponse = downloadError as {
          response?: { data?: { message?: string } }
        }
        setError(errorWithResponse.response?.data?.message || fallbackMessage)
      } else {
        setError(fallbackMessage)
      }
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSelectPreset = (presetKey: string) => {
    const preset = PRESET_RANGES.find((item) => item.key === presetKey)
    if (!preset) return
    setSelectedPreset(presetKey)
    setRange(preset.getRange(today))
    setError(null)
  }

  const handleSelectCustomRange = (selected: DateRange | undefined) => {
    setSelectedPreset('custom')
    setRange(selected)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Descargar reporte financiero
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Intervalo de fechas</DialogTitle>
          <DialogDescription>
            Selecciona el rango de fechas de creación para generar el reporte financiero en PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border p-3">
            <p className="mb-2 text-sm font-medium">Intervalo de fechas</p>
            <div className="space-y-2">
              {presetWithFormattedRanges.map((preset) => (
                <label key={preset.key} className="flex cursor-pointer items-center justify-between gap-3 rounded-sm px-1 py-1 text-sm">
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="date-preset"
                      value={preset.key}
                      checked={selectedPreset === preset.key}
                      onChange={() => handleSelectPreset(preset.key)}
                      className="h-4 w-4"
                    />
                    {preset.label}
                  </span>
                  <span className="text-muted-foreground text-xs">{preset.preview}</span>
                </label>
              ))}

              <div className="rounded-sm px-1 py-1 text-sm">
                <label className="mb-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="date-preset"
                    value="custom"
                    checked={selectedPreset === 'custom'}
                    onChange={() => setSelectedPreset('custom')}
                    className="h-4 w-4"
                  />
                  Personalizado
                </label>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !range?.from && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formattedRange}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={range}
                      onSelect={handleSelectCustomRange}
                      numberOfMonths={1}
                      locale={es}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isDownloading}>
            Cancelar
          </Button>
          <Button onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? 'Descargando...' : 'Descargar PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}