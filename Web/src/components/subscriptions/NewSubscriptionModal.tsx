import { type FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { toast } from "react-toastify";
import { API_ENDPOINTS } from "@/config/api"
import { useAuthStore } from "@/store/authStore"

type SubmitHandler = (
  event: FormEvent<HTMLFormElement>
) => void | boolean | Promise<void | boolean>;

interface BaseDocumentProps {
  onSubmit?: SubmitHandler;
  onSubscriptionCreated?: () => void;
}

export default function NewSubscriptionModal({ onSubmit, onSubscriptionCreated }: BaseDocumentProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationValue, setDurationValue] = useState<number>(1);
  const [durationUnit, setDurationUnit] = useState<'days' | 'weeks' | 'months' | 'years'>('months');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState("MXN");
  const [status, setStatus] = useState<'active' | 'inactive' | 'archived'>('active');
  const [benefitsText, setBenefitsText] = useState("");

  const brandId = useAuthStore((state) => state.getBrandId())
  const token = useAuthStore((state) => state.token)

  const resetForm = () => {
    setName("")
    setDescription("")
    setDurationValue(1)
    setDurationUnit('months')
    setAmount(0)
    setCurrency("MXN")
    setStatus('active')
    setBenefitsText("")
  }

  const handleCancel = () => {
    resetForm();
    setOpen(false);
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!brandId) {
      toast.error("No se encontró brandId activo");
      return;
    }

    if (!name.trim()) {
      toast.error("El nombre de la membresía es requerido");
      return;
    }

    if (durationValue <= 0) {
      toast.error("La duración debe ser mayor a 0");
      return;
    }

    if (amount < 0) {
      toast.error("El precio no puede ser negativo");
      return;
    }

    const benefits = benefitsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({ name: item, included: true }));

    setLoading(true)
    try {
      const response = await axios.post(
        API_ENDPOINTS.SUBSCRIPTIONS.CREATE,
        {
          brandId,
          name: name.trim(),
          description: description.trim() || undefined,
          duration: {
            value: Number(durationValue),
            unit: durationUnit,
          },
          price: {
            amount: Number(amount),
            currency: currency.trim() || 'MXN',
          },
          benefits,
          status,
        },
        {
          headers: {
            Authorization: token,
          },
        }
      );

      toast.success(response.data?.message || "Membresía creada exitosamente");

      if (onSubscriptionCreated) {
        onSubscriptionCreated();
      }

      if (onSubmit) {
        const shouldClose = await onSubmit(event);
        if (shouldClose === false) {
          setLoading(false)
          return;
        }
      }

      resetForm();
      setOpen(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error al crear membresía:", error);
      toast.error(error.response?.data?.message || "Error al crear membresía");
    } finally {
      setLoading(false)
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Crear Membresía</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Membresía</DialogTitle>
          <DialogDescription>Completa la información para crear una membresía</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Plan Mensual"
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción de la membresía"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="durationValue">Duración *</Label>
                <Input
                  id="durationValue"
                  type="number"
                  min={1}
                  value={durationValue}
                  onChange={(e) => setDurationValue(Number(e.target.value))}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="durationUnit">Unidad</Label>
                <select
                  id="durationUnit"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as 'days' | 'weeks' | 'months' | 'years')}
                  disabled={loading}
                >
                  <option value="days">Días</option>
                  <option value="weeks">Semanas</option>
                  <option value="months">Meses</option>
                  <option value="years">Años</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Precio *</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  disabled={loading}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Moneda</Label>
                <Input
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="MXN"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="benefits">Beneficios (uno por línea)</Label>
              <textarea
                id="benefits"
                className="flex min-h-22.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={benefitsText}
                onChange={(e) => setBenefitsText(e.target.value)}
                placeholder={`Acceso completo\nClase de yoga\nEvaluación mensual`}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'archived')}
                disabled={loading}
              >
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
                <option value="archived">Archivada</option>
              </select>
            </div>


          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
