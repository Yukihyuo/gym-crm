import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import axios from "axios"
import { toast } from "react-toastify"
import { Building2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { API_ENDPOINTS } from "@/config/api"

// ─── Schema ──────────────────────────────────────────────────────────────────

const createBrandSchema = z.object({
  // Brand
  brandName: z.string().min(1, "El nombre de la marca es requerido"),
  brandDescription: z.string().optional(),
  brandEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  brandPhone: z.string().optional(),
  brandWebsite: z.string().optional(),
  brandLogo: z.string().optional(),

  // Initial Store
  storeName: z.string().min(1, "El nombre de la tienda es requerido"),
  storeCode: z.string().optional(),
  storeDescription: z.string().optional(),
  storeEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  storePhone: z.string().optional(),

  // Super Admin
  adminUsername: z.string().min(3, "Mínimo 3 caracteres"),
  adminEmail: z.string().min(1, "El email es requerido").email("Email inválido"),
  adminPassword: z.string().min(6, "Mínimo 6 caracteres"),
  adminNames: z.string().min(1, "El nombre es requerido"),
  adminLastNames: z.string().min(1, "Los apellidos son requeridos"),
  adminPhone: z.string().optional(),
})

type FormValues = z.infer<typeof createBrandSchema>

// ─── Component ───────────────────────────────────────────────────────────────

export default function CreateBrand() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createBrandSchema) as any,
    defaultValues: {
      brandName: "",
      brandDescription: "",
      brandEmail: "",
      brandPhone: "",
      brandWebsite: "",
      brandLogo: "",
      storeName: "",
      storeCode: "",
      storeDescription: "",
      storeEmail: "",
      storePhone: "",
      adminUsername: "",
      adminEmail: "",
      adminPassword: "",
      adminNames: "",
      adminLastNames: "",
      adminPhone: "",
    },
  })

  const handleClose = () => {
    reset()
    setOpen(false)
  }

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true)
    try {
      await axios.post(API_ENDPOINTS.BRANDS.CREATE_FULL, {
        brand: {
          name: data.brandName,
          description: data.brandDescription || undefined,
          email: data.brandEmail || undefined,
          phone: data.brandPhone || undefined,
          website: data.brandWebsite || undefined,
          logo: data.brandLogo || undefined,
          isActive: true,
        },
        initialStore: {
          name: data.storeName,
          code: data.storeCode || undefined,
          description: data.storeDescription || undefined,
          email: data.storeEmail || undefined,
          phone: data.storePhone || undefined,
          isActive: true,
        },
        superAdmin: {
          username: data.adminUsername,
          email: data.adminEmail,
          password: data.adminPassword,
          profile: {
            names: data.adminNames,
            lastNames: data.adminLastNames,
            phone: data.adminPhone || "",
          },
          status: true,
        },
      })

      toast.success(`Marca "${data.brandName}" creada exitosamente`)
      handleClose()
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const msg =
          error.response?.data?.message ||
          "Error al crear la marca"
        toast.error(msg)
      } else {
        toast.error("Error inesperado")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* ── Trigger: DropdownMenuItem ─────────────────────────────────────── */}
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
      >
        <Building2 className="h-4 w-4" />
        Nueva Brand
      </DropdownMenuItem>

      {/* ── Dialog ───────────────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inicializar Nueva Brand</DialogTitle>
            <DialogDescription>
              Crea una marca con su tienda inicial, rol Super Admin y primer usuario administrador.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* ─── BRAND ─────────────────────────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">
                Marca
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="brandName">Nombre <span className="text-destructive">*</span></Label>
                  <Input id="brandName" placeholder="Ej: FitZone" {...register("brandName")} />
                  {errors.brandName && (
                    <p className="text-xs text-destructive">{errors.brandName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="brandEmail">Email</Label>
                  <Input id="brandEmail" type="email" placeholder="contacto@marca.com" {...register("brandEmail")} />
                  {errors.brandEmail && (
                    <p className="text-xs text-destructive">{errors.brandEmail.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="brandPhone">Teléfono</Label>
                  <Input id="brandPhone" placeholder="+57 300 000 0000" {...register("brandPhone")} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="brandWebsite">Sitio web</Label>
                  <Input id="brandWebsite" placeholder="https://marca.com" {...register("brandWebsite")} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="brandLogo">Logo (URL)</Label>
                  <Input id="brandLogo" placeholder="https://cdn.../logo.png" {...register("brandLogo")} />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label htmlFor="brandDescription">Descripción</Label>
                  <Input id="brandDescription" placeholder="Descripción breve de la marca" {...register("brandDescription")} />
                </div>
              </div>
            </section>

            {/* ─── STORE ─────────────────────────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">
                Tienda Inicial
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="storeName">Nombre <span className="text-destructive">*</span></Label>
                  <Input id="storeName" placeholder="Sede Principal" {...register("storeName")} />
                  {errors.storeName && (
                    <p className="text-xs text-destructive">{errors.storeName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="storeCode">Código</Label>
                  <Input id="storeCode" placeholder="MAIN-001" {...register("storeCode")} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="storeEmail">Email</Label>
                  <Input id="storeEmail" type="email" placeholder="sede@marca.com" {...register("storeEmail")} />
                  {errors.storeEmail && (
                    <p className="text-xs text-destructive">{errors.storeEmail.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="storePhone">Teléfono</Label>
                  <Input id="storePhone" placeholder="+57 300 000 0001" {...register("storePhone")} />
                </div>

                <div className="col-span-2 space-y-1">
                  <Label htmlFor="storeDescription">Descripción</Label>
                  <Input id="storeDescription" placeholder="Descripción de la tienda" {...register("storeDescription")} />
                </div>
              </div>
            </section>

            {/* ─── SUPER ADMIN ───────────────────────────────────────────── */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider border-b pb-1">
                Super Admin
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="adminNames">Nombres <span className="text-destructive">*</span></Label>
                  <Input id="adminNames" placeholder="Juan" {...register("adminNames")} />
                  {errors.adminNames && (
                    <p className="text-xs text-destructive">{errors.adminNames.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="adminLastNames">Apellidos <span className="text-destructive">*</span></Label>
                  <Input id="adminLastNames" placeholder="Pérez" {...register("adminLastNames")} />
                  {errors.adminLastNames && (
                    <p className="text-xs text-destructive">{errors.adminLastNames.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="adminUsername">Username <span className="text-destructive">*</span></Label>
                  <Input id="adminUsername" placeholder="admin_marca" {...register("adminUsername")} />
                  {errors.adminUsername && (
                    <p className="text-xs text-destructive">{errors.adminUsername.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="adminPhone">Teléfono</Label>
                  <Input id="adminPhone" placeholder="+57 300 000 0002" {...register("adminPhone")} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="adminEmail">Email <span className="text-destructive">*</span></Label>
                  <Input id="adminEmail" type="email" placeholder="admin@marca.com" {...register("adminEmail")} />
                  {errors.adminEmail && (
                    <p className="text-xs text-destructive">{errors.adminEmail.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="adminPassword">Contraseña <span className="text-destructive">*</span></Label>
                  <Input id="adminPassword" type="password" placeholder="Mínimo 6 caracteres" {...register("adminPassword")} />
                  {errors.adminPassword && (
                    <p className="text-xs text-destructive">{errors.adminPassword.message}</p>
                  )}
                </div>
              </div>
            </section>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creando..." : "Crear Brand"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
