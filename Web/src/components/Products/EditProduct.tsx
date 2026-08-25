import { useEffect, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { toast } from "react-toastify";
import { Camera, ImagePlus, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { API_ENDPOINTS } from "../../config/api";
import { useAuthStore } from "@/store/authStore";
import { compressProductImage } from "@/lib/imageCompression";

// Zod schema para validación
const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
  stock: z.coerce.number().min(0, "El stock no puede ser negativo"),
  category: z.string().min(1, "La categoría es requerida"),
  status: z.enum(["available", "unavailable", "discontinued"]),
});

type ProductFormData = z.infer<typeof productSchema>;

const resolveProductImageUrl = (imageUrl: string | null | undefined) => {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("blob:") || imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    return imageUrl;
  }

  const apiUrl = import.meta.env.VITE_API_URL || "";
  return `${apiUrl.replace(/\/$/, "")}/${imageUrl.replace(/^\//, "")}`;
};

interface Product {
  _id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string | null;
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
  const [statusValue, setStatusValue] = useState<"available" | "unavailable" | "discontinued">("available");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const activeStoreId = useAuthStore((state) => state.getActiveStoreId());

  const categoryOptions = ["Suplementos", "Accesorios", "Bebidas", "Ropa", "Snacks", "Otros"];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ProductFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
  });

  const categoryValue = watch("category");

  const clearImageSelection = () => {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }

    if (product?.imageUrl) {
      setImagePreview(product.imageUrl);
    } else {
      setImagePreview(null);
    }

    setImageFile(null);
  };

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const compressedFile = await compressProductImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.8,
        outputType: "image/webp",
      });

      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      const objectUrl = URL.createObjectURL(compressedFile);
      setImagePreview(objectUrl);
      setImageFile(compressedFile);
    } catch (error) {
      console.error("Error al comprimir imagen:", error);
      toast.error("No se pudo procesar la imagen seleccionada");
    } finally {
      event.target.value = "";
    }
  };

  // Cargar datos del producto cuando cambia
  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        price: product.price,
        stock: product.stock,
        category: product.category,
        status: product.status,
      });
      setStatusValue(product.status);
      setValue("status", product.status);
      setImagePreview(product.imageUrl || null);
      setImageFile(null);
    }
  }, [product, reset, setValue]);

  const onSubmit = async (data: ProductFormData) => {
    if (!product) return;
    if (!activeStoreId) {
      toast.error("No hay tienda activa seleccionada");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("price", String(data.price));
      formData.append("stock", String(data.stock));
      formData.append("category", data.category);
      formData.append("status", data.status);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const response = await axios.put(
        API_ENDPOINTS.PRODUCTS.UPDATE(activeStoreId, product._id),
        formData,
        {
          headers: {
            Authorization: useAuthStore.getState().token,
          },
        }
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
      <DialogContent className="sm:max-w-137.5 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
          <DialogDescription>
            Modifica la información del producto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" {...register("status")} />

          <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="space-y-2">
              <Label>Foto del producto (Opcional)</Label>

              {!imagePreview ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <label
                    htmlFor="edit-product-camera-input"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/40 px-4 py-5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Tomar foto</span>
                  </label>
                  <label
                    htmlFor="edit-product-gallery-input"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/40 px-4 py-5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <ImagePlus className="h-4 w-4" />
                    <span>Elegir de galería</span>
                  </label>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-md border border-input bg-muted/30 px-3 py-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveProductImageUrl(imagePreview)}
                      alt="Vista previa del producto"
                      className="h-12 w-12 rounded-md object-cover"
                    />
                    <span className="text-sm text-muted-foreground">
                      {imageFile ? "Nueva imagen seleccionada" : "Imagen actual"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <label
                      htmlFor="edit-product-camera-input"
                      className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md px-2 text-sm font-medium text-primary transition-colors hover:bg-muted"
                    >
                      <Camera className="h-4 w-4" />
                      Cambiar
                    </label>
                    <label
                      htmlFor="edit-product-gallery-input"
                      className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md px-2 text-sm font-medium text-primary transition-colors hover:bg-muted"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Galería
                    </label>
                    {imageFile ? (
                      <Button type="button" variant="ghost" size="icon" onClick={clearImageSelection}>
                        <X className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}

              <input
                id="edit-product-camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
                disabled={isLoading}
              />
              <input
                id="edit-product-gallery-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
                disabled={isLoading}
              />
            </div>

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

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="category">
                  Categoría <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="category"
                  list="edit-product-categories"
                  placeholder="Ej: Suplementos"
                  {...register("category")}
                />
                <datalist id="edit-product-categories">
                  {categoryOptions.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
                {categoryValue && !categoryOptions.includes(categoryValue) ? (
                  <span className="text-xs text-muted-foreground">Se conservará como categoría personalizada.</span>
                ) : null}
                {errors.category ? (
                  <span className="text-sm text-red-500">
                    {errors.category.message}
                  </span>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={statusValue}
                  onValueChange={(value: "available" | "unavailable" | "discontinued") => {
                    setStatusValue(value);
                    setValue("status", value, { shouldValidate: true });
                  }}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecciona estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="unavailable">No disponible</SelectItem>
                    <SelectItem value="discontinued">Discontinuado</SelectItem>
                  </SelectContent>
                </Select>
                {errors.status ? (
                  <span className="text-sm text-red-500">
                    {errors.status.message}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Precio */}
              <div className="grid gap-2">
                <Label htmlFor="price">
                  Precio <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="pl-7"
                    {...register("price")}
                  />
                </div>
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
                  inputMode="numeric"
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

          </div>

          <DialogFooter className="border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-11" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
