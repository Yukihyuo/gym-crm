import { cn } from "@/lib/utils"

export type StickyPosition = "start" | "end"

// Las clases se escriben completas para que Tailwind las detecte.
const HEADER_SURFACE = "bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))]"
const BODY_SURFACE =
  "bg-background [tr:hover>&]:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))]"

/**
 * Clases para fijar una columna dentro de un `TableScroll`.
 * La sombra solo aparece cuando hay contenido oculto detrás de la columna.
 * `header` se usa en encabezados que ya llevan fondo `bg-muted/50`.
 */
export function stickyColumnClass(position: StickyPosition, variant: "body" | "header" = "body") {
  return cn(
    "sticky z-10",
    variant === "header" ? HEADER_SURFACE : BODY_SURFACE,
    position === "start"
      ? "left-0 group-data-[scroll-start=true]/scroll:shadow-[6px_0_8px_-6px_rgb(0_0_0/0.45)]"
      : "right-0 group-data-[scroll-end=true]/scroll:shadow-[-6px_0_8px_-6px_rgb(0_0_0/0.45)]"
  )
}

/** Fija la primera columna (identidad) y la última (acciones) de una tabla. */
export function stickyColumnAt(index: number, count: number, variant: "body" | "header" = "body") {
  if (index === 0) return stickyColumnClass("start", variant)
  if (index === count - 1) return stickyColumnClass("end", variant)
  return undefined
}
