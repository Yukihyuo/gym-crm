import { Loader2 } from "lucide-react"

import { useIsSuperAdmin } from "@/hooks/use-is-super-admin"
import Dashboard from "@/routes/dashboard/page"
import ReceptionHome from "@/routes/reception/page"

/**
 * Punto de entrada del home: el rol "Super Admin" ve el dashboard de gestión;
 * el resto del personal ve el home de recepción con las tareas de mostrador.
 */
export default function Home() {
  const isSuperAdmin = useIsSuperAdmin()

  if (isSuperAdmin === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando...
      </div>
    )
  }

  return isSuperAdmin ? <Dashboard /> : <ReceptionHome />
}
