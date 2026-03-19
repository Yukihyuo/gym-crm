import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import { Check, ChevronsUpDown, Plus, Trash2, ShoppingCart } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { API_ENDPOINTS } from "@/config/api"
import { useAuthStore } from "@/store/authStore"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface ClientOption {
  value: string
  label: string
  subtitle?: string
}

interface Product {
  _id: string
  name: string
  price: number
  stock: number
  category: string
  status: string
}

interface SaleItem {
  productId: string
  name: string
  price: number
  quantity: number
  subtotal: number
  availableStock: number
}

interface NewSaleModalProps {
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function NewSaleModal({ onSuccess, trigger }: NewSaleModalProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState("")
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("")
  const [selectedClientLabel, setSelectedClientLabel] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [productQuantity, setProductQuantity] = useState<number>(1)
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash")
  const [amountPaid, setAmountPaid] = useState<string>("")
  const [discount, setDiscount] = useState<string>("0")
  const [tax, setTax] = useState<string>("0")

  const { user } = useAuthStore()
  // const brandActive = useAuthStore((state) => state.access?.brandId ?? null)
  const activeStoreId = useAuthStore((state) => state.getActiveStoreId())
  const brandId = useAuthStore((state) => state.getBrandId())
  const token = useAuthStore((state) => state.token)

  const fetchProducts = useCallback(async () => {
    if (!activeStoreId) {
      setProducts([])
      return
    }

    try {
      const response = await axios.get(API_ENDPOINTS.PRODUCTS.GET_ALL(activeStoreId))
      // Filtrar solo productos disponibles con stock
      const availableProducts = (response.data.products || []).filter(
        (p: Product) => p.status === "available" && p.stock > 0
      )
      setProducts(availableProducts)
    } catch (error) {
      console.error("Error al cargar productos:", error)
      toast.error("Error al cargar los productos")
    }
  }, [activeStoreId])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedClientSearch(clientSearch.trim())
    }, 300)

    return () => clearTimeout(timeout)
  }, [clientSearch])

  useEffect(() => {
    if (open) {
      fetchProducts()
      resetForm()
    } else {
      setClientComboboxOpen(false)
    }
  }, [open, fetchProducts])

  useEffect(() => {
    if (!open || !brandId) {
      return
    }

    if (!debouncedClientSearch) {
      setClients([])
      setIsLoadingClients(false)
      return
    }

    let isCancelled = false

    const searchClients = async () => {
      try {
        setIsLoadingClients(true)
        const response = await axios.get(API_ENDPOINTS.CLIENTS.SEARCH_SELECT(debouncedClientSearch), {
          headers: {
            Authorization: token,
            brandid: brandId,
          },
        })

        if (!isCancelled) {
          setClients(response.data || [])
        }
      } catch (error) {
        if (!isCancelled) {
          setClients([])
          console.error("Error al buscar clientes:", error)
          toast.error("Error al buscar clientes")
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingClients(false)
        }
      }
    }

    searchClients()

    return () => {
      isCancelled = true
    }
  }, [open, brandId, token, debouncedClientSearch])

  const handleSelectClient = (client: ClientOption) => {
    setSelectedClientId(client.value)
    setSelectedClientLabel(client.label)
    setClientComboboxOpen(false)
  }

  const resetForm = () => {
    setSelectedClientId("")
    setSelectedClientLabel("")
    setClientSearch("")
    setDebouncedClientSearch("")
    setClients([])
    setSelectedProductId("")
    setProductQuantity(1)
    setSaleItems([])
    setPaymentMethod("cash")
    setAmountPaid("")
    setDiscount("0")
    setTax("0")
  }

  const addProductToSale = () => {
    if (!selectedProductId) {
      toast.warning("Selecciona un producto")
      return
    }

    const product = products.find((p) => p._id === selectedProductId)
    if (!product) return

    // Verificar si el producto ya está en la lista
    const existingItem = saleItems.find((item) => item.productId === selectedProductId)
    
    if (existingItem) {
      // Actualizar cantidad
      const newQuantity = existingItem.quantity + productQuantity
      if (newQuantity > product.stock) {
        toast.error(`Stock insuficiente. Disponible: ${product.stock}`)
        return
      }
      
      setSaleItems(
        saleItems.map((item) =>
          item.productId === selectedProductId
            ? {
                ...item,
                quantity: newQuantity,
                subtotal: product.price * newQuantity,
              }
            : item
        )
      )
    } else {
      // Agregar nuevo producto
      if (productQuantity > product.stock) {
        toast.error(`Stock insuficiente. Disponible: ${product.stock}`)
        return
      }

      const newItem: SaleItem = {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: productQuantity,
        subtotal: product.price * productQuantity,
        availableStock: product.stock,
      }
      setSaleItems([...saleItems, newItem])
    }

    // Reset selección
    setSelectedProductId("")
    setProductQuantity(1)
  }

  const removeProductFromSale = (productId: string) => {
    setSaleItems(saleItems.filter((item) => item.productId !== productId))
  }

  const updateItemQuantity = (productId: string, newQuantity: number) => {
    const item = saleItems.find((i) => i.productId === productId)
    if (!item) return

    if (newQuantity <= 0) {
      removeProductFromSale(productId)
      return
    }

    if (newQuantity > item.availableStock) {
      toast.error(`Stock insuficiente. Disponible: ${item.availableStock}`)
      return
    }

    setSaleItems(
      saleItems.map((i) =>
        i.productId === productId
          ? { ...i, quantity: newQuantity, subtotal: i.price * newQuantity }
          : i
      )
    )
  }

  // Cálculos
  const subtotal = saleItems.reduce((sum, item) => sum + item.subtotal, 0)
  const discountAmount = parseFloat(discount) || 0
  const taxAmount = parseFloat(tax) || 0
  const total = subtotal + taxAmount - discountAmount
  const change = paymentMethod === "cash" ? (parseFloat(amountPaid) || 0) - total : 0

  const handleSubmit = async () => {
    // Validaciones
    if (!selectedClientId) {
      toast.error("Selecciona un cliente")
      return
    }

    if (saleItems.length === 0) {
      toast.error("Agrega al menos un producto a la venta")
      return
    }

    if (!user?.id) {
      toast.error("No se pudo identificar al vendedor")
      return
    }

    if (!activeStoreId) {
      toast.error("No se pudo identificar la marca activa")
      return
    }

    if (paymentMethod === "cash") {
      const paid = parseFloat(amountPaid) || 0
      if (paid < total) {
        toast.error(`Monto insuficiente. Total: $${total.toFixed(2)}, Pagado: $${paid.toFixed(2)}`)
        return
      }
    }

    setIsLoading(true)

    try {
      const saleData = {
        storeId: activeStoreId,
        clientId: selectedClientId,
        userId: user.id,
        items: saleItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        payment: {
          method: paymentMethod,
          amountPaid: paymentMethod === "cash" ? parseFloat(amountPaid) : total,
          change: paymentMethod === "cash" ? change : 0,
        },
        totals: {
          subtotal,
          tax: taxAmount,
          discount: discountAmount,
          total,
        },
      }

      const response = await axios.post(API_ENDPOINTS.SALES.CREATE, saleData)

      toast.success(`Venta creada exitosamente. Recibo: ${response.data.sale.receiptNumber}`)
      setOpen(false)
      onSuccess?.()
    } catch (error) {
      console.error("Error al crear venta:", error)
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error("Error al crear la venta")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Nueva Venta
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Venta</DialogTitle>
          <DialogDescription>
            Registra una nueva venta en el sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Selección de Cliente */}
          <div className="space-y-2">
            <Label htmlFor="client">Cliente *</Label>
            <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="client"
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientComboboxOpen}
                  className="w-full justify-between"
                  disabled={isLoading}
                >
                  {selectedClientLabel || "Busca y selecciona un cliente"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Buscar por nombre, teléfono, username o ID..."
                    value={clientSearch}
                    onValueChange={setClientSearch}
                  />
                  <CommandList>
                    {!debouncedClientSearch ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Escribe para buscar clientes
                      </div>
                    ) : null}

                    {isLoadingClients ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Buscando clientes...
                      </div>
                    ) : null}

                    {!isLoadingClients && debouncedClientSearch && clients.length === 0 ? (
                      <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                    ) : null}

                    {!isLoadingClients && clients.length > 0 ? (
                      <CommandGroup>
                        {clients.map((client) => (
                          <CommandItem
                            key={client.value}
                            value={client.value}
                            onSelect={() => handleSelectClient(client)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedClientId === client.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate">{client.label}</span>
                              {client.subtitle ? (
                                <span className="truncate text-xs text-muted-foreground">{client.subtitle}</span>
                              ) : null}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : null}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Agregar Productos */}
          <div className="space-y-2">
            <Label>Agregar Productos</Label>
            <div className="flex gap-2">
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.name} - ${product.price.toFixed(2)} (Stock: {product.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="1"
                value={productQuantity}
                onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                className="w-24"
                placeholder="Cant."
              />
              <Button type="button" onClick={addProductToSale} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tabla de Productos */}
          {saleItems.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleItems.map((item) => (
                    <TableRow key={item.productId}>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="1"
                          max={item.availableStock}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemQuantity(item.productId, parseInt(e.target.value) || 1)
                          }
                          className="w-16 mx-auto text-center"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${item.subtotal.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProductFromSale(item.productId)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Totales y Descuentos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="discount">Descuento</Label>
              <Input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax">IVA</Label>
              <Input
                id="tax"
                type="number"
                min="0"
                step="0.01"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pago *</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value: "cash" | "card" | "transfer") => setPaymentMethod(value)}
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Monto Pagado (solo para efectivo) */}
          {paymentMethod === "cash" && (
            <div className="space-y-2">
              <Label htmlFor="amountPaid">Monto Pagado *</Label>
              <Input
                id="amountPaid"
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
              />
              {change > 0 && (
                <p className="text-sm text-muted-foreground">
                  Cambio: <span className="font-semibold">${change.toFixed(2)}</span>
                </p>
              )}
            </div>
          )}

          {/* Resumen */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span>IVA:</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento:</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || saleItems.length === 0}>
            {isLoading ? "Procesando..." : "Completar Venta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
