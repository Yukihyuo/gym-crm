import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Contenedor de tablas: el scroll horizontal queda dentro de la tabla (nunca en la página)
 * y expone `data-scroll-start/end` para mostrar la sombra de las columnas fijas.
 */
function TableScroll({ className, children, ...props }: React.ComponentProps<"div">) {
  const ref = React.useRef<HTMLDivElement>(null)

  const syncEdges = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    el.dataset.scrollStart = String(el.scrollLeft > 1)
    el.dataset.scrollEnd = String(el.scrollLeft < maxScroll - 1)
  }, [])

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(syncEdges)
    observer.observe(el)
    return () => observer.disconnect()
  }, [syncEdges])

  // El contenido cambia (carga, filtros, paginación) sin cambiar el tamaño del contenedor.
  React.useEffect(syncEdges)

  return (
    <div
      ref={ref}
      data-slot="table-container"
      data-scroll-start="false"
      data-scroll-end="false"
      onScroll={syncEdges}
      className={cn("group/scroll relative w-full max-w-full overflow-x-auto overscroll-x-contain", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { TableScroll }
