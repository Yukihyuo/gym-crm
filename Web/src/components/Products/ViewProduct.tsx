import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import {
  getProductStatusBadge,
  getProductStatusLabel,
  type Product,
} from "@/lib/product";

interface ViewProductProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}

export function ViewProduct({ open, onOpenChange, product }: ViewProductProps) {
  if (!product) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Detalles del Producto</DialogTitle>
          <DialogDescription>
            Información completa del producto seleccionado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Nombre */}
          <div className="grid gap-2">
            <Label className="text-muted-foreground text-sm">Nombre</Label>
            <p className="text-base font-medium">{product.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Precio */}
            <div className="grid gap-2">
              <Label className="text-muted-foreground text-sm">Precio</Label>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(product.price)}
              </p>
            </div>

            {/* Stock */}
            <div className="grid gap-2">
              <Label className="text-muted-foreground text-sm">Stock</Label>
              <p className="text-lg font-semibold">
                {product.stock}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  unidades
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Categoría */}
            <div className="grid gap-2">
              <Label className="text-muted-foreground text-sm">Categoría</Label>
              <p className="text-base font-medium">{product.category}</p>
            </div>

            {/* Estado */}
            <div className="grid gap-2">
              <Label className="text-muted-foreground text-sm">Estado</Label>
              <span
                className={`inline-flex w-fit items-center rounded-md border px-3 py-1 text-sm font-medium ${
                  getProductStatusBadge(product.status)
                }`}
              >
                {getProductStatusLabel(product.status)}
              </span>
            </div>
          </div>

          {/* Código (SKU) */}
          <div className="grid gap-2">
            <Label className="text-muted-foreground text-sm">Código (SKU)</Label>
            {product.sku ? (
              <code className="w-fit rounded bg-muted px-2 py-1 text-sm font-semibold">
                {product.sku}
              </code>
            ) : (
              <p className="text-base font-medium text-muted-foreground">Sin SKU</p>
            )}
          </div>

          {/* Divider */}
          <div className="border-t pt-4 mt-2">
            <div className="grid gap-3">
              {/* Fecha de creación */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Creado:</span>
                <span className="font-medium">{formatDate(product.createdAt)}</span>
              </div>

              {/* Fecha de actualización */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Última actualización:
                </span>
                <span className="font-medium">{formatDate(product.updatedAt)}</span>
              </div>

              {/* ID */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">ID:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {product._id}
                </code>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
