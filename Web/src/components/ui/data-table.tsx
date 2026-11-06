import { flexRender, type Table } from "@tanstack/react-table"

import { TableScroll } from "@/components/ui/table-scroll"
import { cn } from "@/lib/utils"
import { stickyColumnAt } from "@/lib/table"

const ACTIONS_COLUMN_ID = "actions"

interface DataTableProps<TData> {
  table: Table<TData>
  loading?: boolean
  loadingText: string
  emptyText: string
  /** Hace clickeable la fila (y accesible con Enter). La columna `actions` no dispara el click. */
  onRowClick?: (row: TData) => void
}

/**
 * Tabla de datos con el scroll horizontal contenido en la propia tabla
 * y la primera y última columna (identidad y acciones) fijas.
 */
export function DataTable<TData>({ table, loading, loadingText, emptyText, onRowClick }: DataTableProps<TData>) {
  const columnCount = table.getVisibleLeafColumns().length
  const rows = table.getRowModel().rows

  const messageRow = (text: string) => (
    <tr>
      <td colSpan={columnCount} className="h-24 text-center">
        {text}
      </td>
    </tr>
  )

  return (
    <TableScroll className="rounded-md border" aria-busy={loading}>
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b bg-muted/50">
              {headerGroup.headers.map((header, index) => (
                <th
                  key={header.id}
                  className={cn(
                    "h-12 whitespace-nowrap px-4 text-left align-middle font-medium text-muted-foreground",
                    stickyColumnAt(index, headerGroup.headers.length, "header")
                  )}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading
            ? messageRow(loadingText)
            : rows.length
              ? rows.map((row) => {
                  const cells = row.getVisibleCells()

                  return (
                    <tr
                      key={row.id}
                      className={cn("border-b transition-colors hover:bg-muted/50", onRowClick && "cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none")}
                      tabIndex={onRowClick ? 0 : undefined}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      onKeyDown={
                        onRowClick
                          ? (event) => {
                              if (event.key === "Enter" && event.target === event.currentTarget) onRowClick(row.original)
                            }
                          : undefined
                      }
                    >
                      {cells.map((cell, index) => (
                        <td
                          key={cell.id}
                          className={cn("p-4 align-middle", stickyColumnAt(index, cells.length))}
                          onClick={cell.column.id === ACTIONS_COLUMN_ID ? (event) => event.stopPropagation() : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  )
                })
              : messageRow(emptyText)}
        </tbody>
      </table>
    </TableScroll>
  )
}
