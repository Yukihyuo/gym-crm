import { useState, type ChangeEvent } from "react";
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
  DialogTrigger,
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

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
  stock: z.coerce.number().min(0, "El stock no puede ser negativo").default(0),
  category: z.string().min(1, "La categoría es requerida"),
  status: z.enum(["available", "unavailable", "discontinued"]).default("available"),
});

type ProductFormData = z.infer<typeof productSchema>;

interface NewProductProps {
  onProductCreated?: () => void;
}

const categoryOptions = ["Suplementos", "Accesorios", "Bebidas", "Ropa", "Snacks", "Otros"];

export function NewProduct({ onProductCreated }: NewProductProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusValue, setStatusValue] = useState<"available" | "unavailable" | "discontinued">("available");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ProductFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      stock: 0,
      category: "",
      status: "available",
    },
  });

  const categoryValue = watch("category");

  const clearImage = () => {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(null);
    setImageFile(null);
  };

  const resetFormState = () => {
    reset();
    setStatusValue("available");
    setValue("status", "available");
    clearImage();
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
      })

      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      const objectUrl = URL.createObjectURL(compressedFile);
      setImagePreview(objectUrl);
      setImageFile(compressedFile);
    } catch (error) {
      console.error("Error al comprimir imagen:", error)
      toast.error("No se pudo procesar la imagen seleccionada")
      clearImage()
    } finally {
      event.target.value = ""
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    try {
      const formData = new FormData()
      formData.append("storeId", useAuthStore.getState().getActiveStoreId() || "")
      formData.append("name", data.name)
      formData.append("description", data.description)
      formData.append("price", String(data.price))
      formData.append("stock", String(data.stock))
      formData.append("category", data.category)
      formData.append("status", data.status)

      if (imageFile) {
        formData.append("image", imageFile)
      }

      const response = await axios.post(
        API_ENDPOINTS.PRODUCTS.CREATE,
        formData,
        {
          headers: {
            Authorization: useAuthStore.getState().token,
          },
        }
      );

      if (response.status === 201) {
        toast.success("Producto creado exitosamente");
        resetFormState();
        setOpen(false);
        onProductCreated?.();
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al crear producto:", error);
      toast.error(error.response?.data?.message || "Error al crear el producto");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetFormState();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="default">Crear Producto</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-137.5 max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Producto</DialogTitle>
          <DialogDescription>
            Completa la información para registrar un nuevo producto en el inventario.
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
                    htmlFor="product-camera-input"
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-input bg-muted/40 px-4 py-5 text-sm text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <Camera className="h-4 w-4" />
                    <span>Tomar foto</span>
                  </label>
                  <label
                    htmlFor="product-gallery-input"
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
                      src={imagePreview}
                      alt="Vista previa del producto"
                      className="h-12 w-12 rounded-md object-cover"
                    />
                    <span className="text-sm text-muted-foreground">Imagen seleccionada</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <label
                      htmlFor="product-camera-input"
                      className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md px-2 text-sm font-medium text-primary transition-colors hover:bg-muted"
                    >
                      <Camera className="h-4 w-4" />
                      Cambiar
                    </label>
                    <label
                      htmlFor="product-gallery-input"
                      className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-md px-2 text-sm font-medium text-primary transition-colors hover:bg-muted"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Galería
                    </label>
                    <Button type="button" variant="ghost" size="icon" onClick={clearImage}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <input
                id="product-camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
                disabled={isLoading}
              />
              <input
                id="product-gallery-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input id="name" placeholder="Ej: Proteína Whey" {...register("name")} />
              {errors.name ? <span className="text-sm text-red-500">{errors.name.message}</span> : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="category">
                  Categoría <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="category"
                  list="product-categories"
                  placeholder="Ej: Suplementos"
                  {...register("category")}
                />
                <datalist id="product-categories">
                  {categoryOptions.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
                {categoryValue && !categoryOptions.includes(categoryValue) ? (
                  <span className="text-xs text-muted-foreground">Se creará una categoría nueva.</span>
                ) : null}
                {errors.category ? <span className="text-sm text-red-500">{errors.category.message}</span> : null}
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
                {errors.status ? <span className="text-sm text-red-500">{errors.status.message}</span> : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
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
                {errors.price ? <span className="text-sm text-red-500">{errors.price.message}</span> : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="stock">
                  Stock <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder="0"
                  {...register("stock")}
                />
                {errors.stock ? <span className="text-sm text-red-500">{errors.stock.message}</span> : null}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">
                Descripción <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="description"
                rows={2}
                placeholder="Descripción del producto"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("description")}
              />
              {errors.description ? (
                <span className="text-sm text-red-500">{errors.description.message}</span>
              ) : null}
            </div>
          </div>

          <DialogFooter className="border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetFormState();
                setOpen(false);
              }}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-11" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
