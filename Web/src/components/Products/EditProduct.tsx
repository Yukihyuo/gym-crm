import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { API_ENDPOINTS } from "../../config/api";

// Zod schema para validación
const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
  stock: z.coerce.number().min(0, "El stock no puede ser negativo"),
  category: z.string().min(1, "La categoría es requerida"),
  status: z.enum(["available", "unavailable", "discontinued"]),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  status: "available" | "unavailable" | "discontinued";
}

interface EditProductProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onProductUpdated?: () => void;
}

export function EditProduct({
  open,
  onOpenChange,
  product,
  onProductUpdated,
}: EditProductProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
  });

  // Cargar datos del producto cuando cambia
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        category: product.category,
        status: product.status,
      });
    }
  }, [product, reset]);

  const onSubmit = async (data: ProductFormData) => {
    if (!product) return;

    setIsLoading(true);
    try {
      const response = await axios.put(
        API_ENDPOINTS.PRODUCTS.UPDATE(product._id),
        data
      );

      if (response.status === 200) {
        toast.success("Producto actualizado exitosamente");
        onOpenChange(false);
        if (onProductUpdated) {
          onProductUpdated();
        }
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al actualizar producto:", error);
      toast.error(
        error.response?.data?.message || "Error al actualizar el producto"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
          <DialogDescription>
            Modifica la información del producto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            {/* Nombre */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ej: Proteína Whey"
                {...register("name")}
              />
              {errors.name && (
                <span className="text-sm text-red-500">
                  {errors.name.message}
                </span>
              )}
            </div>

            {/* Descripción */}
            <div className="grid gap-2">
              <Label htmlFor="description">
                Descripción <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="description"
                placeholder="Descripción del producto"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("description")}
              />
              {errors.description && (
                <span className="text-sm text-red-500">
                  {errors.description.message}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Precio */}
              <div className="grid gap-2">
                <Label htmlFor="price">
                  Precio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...register("price")}
                />
                {errors.price && (
                  <span className="text-sm text-red-500">
                    {errors.price.message}
                  </span>
                )}
              </div>

              {/* Stock */}
              <div className="grid gap-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  {...register("stock")}
                />
                {errors.stock && (
                  <span className="text-sm text-red-500">
                    {errors.stock.message}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Categoría */}
              <div className="grid gap-2">
                <Label htmlFor="category">
                  Categoría <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="category"
                  placeholder="Ej: Suplementos"
                  {...register("category")}
                />
                {errors.category && (
                  <span className="text-sm text-red-500">
                    {errors.category.message}
                  </span>
                )}
              </div>

              {/* Estado */}
              <div className="grid gap-2">
                <Label htmlFor="status">Estado</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register("status")}
                >
                  <option value="available">Disponible</option>
                  <option value="unavailable">No disponible</option>
                  <option value="discontinued">Discontinuado</option>
                </select>
                {errors.status && (
                  <span className="text-sm text-red-500">
                    {errors.status.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
