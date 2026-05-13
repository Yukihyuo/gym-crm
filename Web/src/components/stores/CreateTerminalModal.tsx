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
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { MonitorCog } from "lucide-react";
import { type AxiosError } from "axios";
import { toast } from "react-toastify";

import apiClient from "@/lib/axios";

interface CreateTerminalModalProps {
  storeName: string;
  onTerminalCreated?: () => void;
}

export default function CreateTerminalModal({
  storeName,
  onTerminalCreated,
}: CreateTerminalModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [terminalCreated, setTerminalCreated] = useState(false);

  const [name, setName] = useState("Punto de Acceso");
  const [generatedCode, setGeneratedCode] = useState("");

  const resetForm = () => {
    setName("Punto de Acceso");
    setGeneratedCode("");
    setTerminalCreated(false);
  };

  const handleCancel = () => {
    if (terminalCreated && onTerminalCreated) {
      onTerminalCreated();
    }
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("El nombre de la terminal es requerido");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
      };

      const response = await apiClient.post("v1/terminals/create", payload);
      const uniqueCode = response.data?.uniqueCode;

      toast.success(response.data.message || "Terminal creada exitosamente");
      if (uniqueCode) {
        setGeneratedCode(uniqueCode);
      }
      setTerminalCreated(true);
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      toast.error(axiosError.response?.data?.message || "Error al crear terminal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            setOpen(true);
          }}
        >
          <MonitorCog className="mr-2 h-4 w-4" />
          Nueva terminal
        </DropdownMenuItem>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear terminal</DialogTitle>
          <DialogDescription>
            Crea una nueva terminal para la tienda: {storeName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="terminal-name">Nombre *</Label>
              <Input
                id="terminal-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej: Recepción"
                disabled={loading || terminalCreated}
                required
              />
            </div>

            {generatedCode ? (
              <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3">
                <p className="text-sm font-medium text-emerald-900">Codigo de vinculacion generado</p>
                <p className="mt-1 text-2xl font-bold tracking-widest text-emerald-900">{generatedCode}</p>
                <p className="mt-1 text-xs text-emerald-800">Este codigo expira en 5 minutos.</p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              {generatedCode ? "Cerrar" : "Cancelar"}
            </Button>
            <Button type="submit" disabled={loading || !!generatedCode}>
              {loading ? "Creando..." : "Crear terminal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
