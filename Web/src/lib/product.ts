// Dominio de Productos: tipos centralizados, constantes y helpers.
// Edita aquí los tipos/etiquetas del módulo de inventario y se reflejarán
// en todas las vistas (NewProduct, EditProduct, ViewProduct, Inventario, Ventas).

export type ProductStatus = "available" | "unavailable" | "discontinued"

export interface Product {
  _id: string
  name: string
  price: number
  stock: number
  category: string
  status: ProductStatus
  sku?: string | null
  imageUrl?: string | null
  createdAt?: string
  updatedAt?: string
}

// Valores del formulario de producto (crear/editar). Coincide con el schema Zod
// definido en los componentes; centralizado para facilitar futuros cambios.
export interface ProductFormValues {
  name: string
  price: number
  stock: number
  category: string
  status: ProductStatus
  sku?: string
}

export const PRODUCT_CATEGORY_OPTIONS = [
  "Suplementos",
  "Accesorios",
  "Bebidas",
  "Ropa",
  "Snacks",
  "Otros",
]

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  available: "Disponible",
  unavailable: "No disponible",
  discontinued: "Discontinuado",
}

export const PRODUCT_STATUS_BADGE: Record<ProductStatus, string> = {
  available: "bg-green-100 text-green-700 border-green-200",
  unavailable: "bg-orange-100 text-orange-700 border-orange-200",
  discontinued: "bg-red-100 text-red-700 border-red-200",
}

export const getProductStatusLabel = (status: string): string =>
  PRODUCT_STATUS_LABELS[status as ProductStatus] ?? status

export const getProductStatusBadge = (status: string): string =>
  PRODUCT_STATUS_BADGE[status as ProductStatus] ?? "bg-gray-100 text-gray-700 border-gray-200"

export const resolveProductImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return ""
  if (
    imageUrl.startsWith("blob:") ||
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://")
  ) {
    return imageUrl
  }

  const apiUrl = import.meta.env.VITE_API_URL || ""
  return `${apiUrl.replace(/\/$/, "")}/${imageUrl.replace(/^\//, "")}`
}
