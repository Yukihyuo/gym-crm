import { useState } from "react"
import { Wallet } from "lucide-react"

import { useModuleAccess } from "@/hooks/use-module-access"
import { Button } from "@/components/ui/button"
import { useCashGate } from "@/components/CashCut/useCashGate"
import { ChargeFlow } from "./ChargeFlow"

export function QuickChargeButton() {
  const [open, setOpen] = useState(false)
  const { ensureCash, cashGateDialog } = useCashGate()
  const canChargeMembership = useModuleAccess("SubscriptionsAssignments", "create")
  const canChargeProducts = useModuleAccess("Sales", "create")

  if (!canChargeMembership && !canChargeProducts) {
    return null
  }

  return (
    <>
      <Button size="lg" onClick={() => ensureCash(() => setOpen(true))}>
        <Wallet />
        Cobrar
      </Button>
      <ChargeFlow open={open} onOpenChange={setOpen} />
      {cashGateDialog}
    </>
  )
}
