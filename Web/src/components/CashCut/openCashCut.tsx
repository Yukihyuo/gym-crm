import { useState } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCashCutStore } from "@/store/cashCutStore"

interface OpenCashCutProps {
	onSuccess?: () => void
}

export function OpenCashCut({ onSuccess }: OpenCashCutProps) {
	const [initialCash, setInitialCash] = useState<string>("0")
	const [submitting, setSubmitting] = useState(false)
	const openCashCut = useCashCutStore((state) => state.openCashCut)

	const handleOpen = async () => {
		const parsedInitialCash = Number(initialCash)

		if (Number.isNaN(parsedInitialCash) || parsedInitialCash < 0) {
			toast.error("El monto inicial debe ser un número mayor o igual a 0")
			return
		}

		try {
			setSubmitting(true)
			await openCashCut({ initialCash: parsedInitialCash })
			toast.success("Caja abierta exitosamente")
			onSuccess?.()
		} catch (error) {
			if (axios.isAxiosError(error)) {
				toast.error(error.response?.data?.message ?? "Error al abrir caja")
			} else {
				toast.error("Error al abrir caja")
			}
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="initialCash">Monto inicial</Label>
				<Input
					id="initialCash"
					type="number"
					min={0}
					step="0.01"
					value={initialCash}
					onChange={(event) => setInitialCash(event.target.value)}
					disabled={submitting}
					placeholder="0"
				/>
			</div>

			<div className="flex justify-end gap-2">
				<Button onClick={handleOpen} disabled={submitting}>
					{submitting ? "Abriendo..." : "Abrir caja"}
				</Button>
			</div>
		</div>
	)
}
