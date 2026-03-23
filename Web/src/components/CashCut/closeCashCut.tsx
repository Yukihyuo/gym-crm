import { useState } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCashCutStore } from "@/store/cashCutStore"

interface CloseCashCutProps {
	onSuccess?: () => void
}

export function CloseCashCut({ onSuccess }: CloseCashCutProps) {
	const [cashInHand, setCashInHand] = useState<string>("")
	const [transferReceipts, setTransferReceipts] = useState<string>("0")
	const [cardSlips, setCardSlips] = useState<string>("0")
	const [notes, setNotes] = useState<string>("")
	const [submitting, setSubmitting] = useState(false)

	const closeCashCut = useCashCutStore((state) => state.closeCashCut)

	const handleClose = async () => {
		const parsedCashInHand = Number(cashInHand)
		const parsedTransferReceipts = Number(transferReceipts)
		const parsedCardSlips = Number(cardSlips)

		if (cashInHand.trim() === "" || Number.isNaN(parsedCashInHand) || parsedCashInHand < 0) {
			toast.error("cashInHand es requerido y debe ser un número mayor o igual a 0")
			return
		}

		if (Number.isNaN(parsedTransferReceipts) || parsedTransferReceipts < 0) {
			toast.error("transferReceipts debe ser un número mayor o igual a 0")
			return
		}

		if (Number.isNaN(parsedCardSlips) || parsedCardSlips < 0) {
			toast.error("cardSlips debe ser un número mayor o igual a 0")
			return
		}

		try {
			setSubmitting(true)
			await closeCashCut({
				cashInHand: parsedCashInHand,
				transferReceipts: parsedTransferReceipts,
				cardSlips: parsedCardSlips,
				notes,
			})
			toast.success("Caja cerrada exitosamente")
			onSuccess?.()
		} catch (error) {
			if (axios.isAxiosError(error)) {
				toast.error(error.response?.data?.message ?? "Error al cerrar caja")
			} else {
				toast.error("Error al cerrar caja")
			}
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="cashInHand">Efectivo en caja</Label>
				<Input
					id="cashInHand"
					type="number"
					min={0}
					step="0.01"
					value={cashInHand}
					onChange={(event) => setCashInHand(event.target.value)}
					disabled={submitting}
					placeholder="0"
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="transferReceipts">Comprobantes de transferencia</Label>
				<Input
					id="transferReceipts"
					type="number"
					min={0}
					step="0.01"
					value={transferReceipts}
					onChange={(event) => setTransferReceipts(event.target.value)}
					disabled={submitting}
					placeholder="0"
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="cardSlips">Vouchers de tarjeta</Label>
				<Input
					id="cardSlips"
					type="number"
					min={0}
					step="0.01"
					value={cardSlips}
					onChange={(event) => setCardSlips(event.target.value)}
					disabled={submitting}
					placeholder="0"
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="cashCutNotes">Notas</Label>
				<Input
					id="cashCutNotes"
					type="text"
					value={notes}
					onChange={(event) => setNotes(event.target.value)}
					disabled={submitting}
					placeholder="Notas del cierre (opcional)"
				/>
			</div>

			<div className="flex justify-end gap-2">
				<Button onClick={handleClose} disabled={submitting}>
					{submitting ? "Cerrando..." : "Cerrar caja"}
				</Button>
			</div>
		</div>
	)
}
