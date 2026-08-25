import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { toast } from "react-toastify"
import {
  Check,
  ChevronsUpDown,
  LayoutGrid,
  List,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  PackageSearch,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { API_ENDPOINTS, API_URL } from "@/config/api"
import { useAuthStore } from "@/store/authStore"
import { useBrandConfigStore } from "@/store/brandConfigStore"
import { useCashCutStore } from "@/store/cashCutStore"
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"

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
  imageUrl?: string | null
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
}

export function NewSaleModal({ onSuccess }: NewSaleModalProps) {
  type CatalogView = "grid" | "list"

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false)
  const [clientSearch, setClientSearch] = useState("")
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("")
  const [selectedClientLabel, setSelectedClientLabel] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [productImageErrors, setProductImageErrors] = useState<Record<string, boolean>>({})
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [saleItems, setSaleItems] = useState<SaleItem[]>([])
  const [productSearch, setProductSearch] = useState("")
  const [catalogView, setCatalogView] = useState<CatalogView>("grid")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash")
  const [amountPaid, setAmountPaid] = useState<string>("")
  const [discount, setDiscount] = useState<string>("0")
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount")
  const [tax, setTax] = useState<string>("0")

  const { user } = useAuthStore()
  const activeStoreId = useAuthStore((state) => state.getActiveStoreId())
  const brandId = useAuthStore((state) => state.getBrandId())
  const token = useAuthStore((state) => state.token)
  const requireCashClosing = useBrandConfigStore((state) => state.config?.requireCashClosing ?? false)
  const cashCutId = useCashCutStore((state) => state.cashCutId)
  const requireSaleUser = useBrandConfigStore((state) => state.config?.requireSaleUser ?? true)
  const defaultSaleUserId = useBrandConfigStore((state) => state.config?.userSaleDefault ?? null)
  const navigate = useNavigate()

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

  const resetForm = useCallback(() => {
    setSelectedClientId(requireSaleUser ? "" : defaultSaleUserId ?? "")
    setSelectedClientLabel(requireSaleUser ? "" : defaultSaleUserId ? "Cliente predeterminado" : "")
    setClientSearch("")
    setDebouncedClientSearch("")
    setClients([])
    setProductImageErrors({})
    setSaleItems([])
    setProductSearch("")
    setCatalogView("grid")
    setPaymentMethod("cash")
    setAmountPaid("")
    setDiscount("0")
    setDiscountType("amount")
    setTax("0")
  }, [defaultSaleUserId, requireSaleUser])

  useEffect(() => {
    fetchProducts()
    resetForm()
    setClientComboboxOpen(false)
  }, [fetchProducts, resetForm])

  useEffect(() => {
    if (!brandId) {
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
  }, [brandId, token, debouncedClientSearch])

  const handleSelectClient = (client: ClientOption) => {
    setSelectedClientId(client.value)
    setSelectedClientLabel(client.label)
    setClientComboboxOpen(false)
  }

  const addProductToSale = (productId: string, quantityToAdd = 1) => {
    const product = products.find((p) => p._id === productId)
    if (!product) return

    const existingItem = saleItems.find((item) => item.productId === productId)

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantityToAdd
      if (newQuantity > product.stock) {
        toast.error(`Stock insuficiente. Disponible: ${product.stock}`)
        return
      }

      setSaleItems(
        saleItems.map((item) =>
          item.productId === productId
            ? {
              ...item,
              quantity: newQuantity,
              subtotal: product.price * newQuantity,
            }
            : item
        )
      )
    } else {
      if (quantityToAdd > product.stock) {
        toast.error(`Stock insuficiente. Disponible: ${product.stock}`)
        return
      }

      const newItem: SaleItem = {
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: quantityToAdd,
        subtotal: product.price * quantityToAdd,
        availableStock: product.stock,
      }
      setSaleItems([...saleItems, newItem])
    }
  }

  const removeProductFromSale = (productId: string) => {
    setSaleItems(saleItems.filter((item) => item.productId !== productId))
  }

  const increaseItemQuantity = (productId: string) => {
    const item = saleItems.find((entry) => entry.productId === productId)
    if (!item) return
    updateItemQuantity(productId, item.quantity + 1)
  }

  const decreaseItemQuantity = (productId: string) => {
    const item = saleItems.find((entry) => entry.productId === productId)
    if (!item) return
    updateItemQuantity(productId, item.quantity - 1)
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
  const discountInput = parseFloat(discount) || 0
  const taxPercent = parseFloat(tax) || 0
  const discountAmount =
    discountType === "percent"
      ? Math.min(subtotal, subtotal * (discountInput / 100))
      : Math.min(subtotal, discountInput)
  const taxableBase = Math.max(subtotal - discountAmount, 0)
  const taxAmount = taxableBase * (taxPercent / 100)
  const total = taxableBase + taxAmount
  const paidAmount = parseFloat(amountPaid) || 0
  const change = paymentMethod === "cash" ? paidAmount - total : 0
  const totalItems = saleItems.reduce((sum, item) => sum + item.quantity, 0)
  const canSubmitSale =
    !isLoading &&
    Boolean(selectedClientId) &&
    saleItems.length > 0

  const filteredProducts = useMemo(() => {
    const normalizedSearch = productSearch.trim().toLowerCase()
    if (!normalizedSearch) {
      return products
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch)
    )
  }, [products, productSearch])

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")

  const getAvatarStyle = (seed: string) => {
    const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const hue = hash % 360
    return { backgroundColor: `hsl(${hue} 65% 85%)`, color: `hsl(${hue} 45% 25%)` }
  }

  const resolveProductImageUrl = (imageUrl?: string | null) => {
    if (!imageUrl) return null
    if (/^https?:\/\//i.test(imageUrl)) return imageUrl
    const normalizedBase = API_URL.endsWith("/") ? API_URL : `${API_URL}/`
    return `${normalizedBase}${imageUrl.replace(/^\//, "")}`
  }

  const markImageAsFailed = (productId: string) => {
    setProductImageErrors((current) => ({ ...current, [productId]: true }))
  }

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

    const resolvedSellerId = user.id

    if (!resolvedSellerId) {
      toast.error("No se pudo identificar al vendedor")
      return
    }

    if (!activeStoreId) {
      toast.error("No se pudo identificar la marca activa")
      return
    }

    if (requireCashClosing && !cashCutId) {
      toast.error("Debes abrir la caja antes de registrar una venta.")
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

    console.log("seller:", resolvedSellerId)
    try {
      const saleData = {
        storeId: activeStoreId,
        clientId: selectedClientId,
        userId: resolvedSellerId,
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

      const response = await axios.post(API_ENDPOINTS.SALES.CREATE, saleData, {
        headers: {
          Authorization: token,
          ...(cashCutId ? { "X-Cash-Cut-Id": cashCutId } : {}),
        },
      })

      toast.success(`Venta creada exitosamente. Recibo: ${response.data.sale.receiptNumber}`)
      onSuccess?.()
      navigate("/sales")
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
    <div className="h-[calc(100vh-4rem)] min-h-0 overflow-hidden bg-background">
      <div className="flex h-full flex-col">
        <header className="shrink-0 border-b px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Nueva Venta</h1>
              <p className="text-sm text-muted-foreground">Registra una nueva venta en el sistema</p>
            </div>
            <Button type="button" variant="outline" onClick={() => navigate("/sales")}>
              Cancelar
            </Button>
          </div>
          <div className="mt-3 hidden space-y-2 text-left lg:block">
            {requireSaleUser ? (
              <>
                <Label htmlFor="client">Cliente *</Label>
                <Popover modal={false} open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
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
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" sideOffset={6} avoidCollisions>
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar por nombre, teléfono, username o ID..."
                        value={clientSearch}
                        onValueChange={setClientSearch}
                      />
                      <CommandList className="max-h-64">
                        {!debouncedClientSearch ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">Escribe para buscar clientes</div>
                        ) : null}
                        {isLoadingClients ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">Buscando clientes...</div>
                        ) : null}
                        {!isLoadingClients && debouncedClientSearch && clients.length === 0 ? (
                          <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                        ) : null}
                        {!isLoadingClients && clients.length > 0 ? (
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem key={client.value} value={client.value} onSelect={() => handleSelectClient(client)}>
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
              </>
            ) : null}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full flex-col gap-4 p-4 lg:flex-row">
            <Card
              className="bg-card border-border flex min-h-0 flex-1 flex-col"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Catálogo de Productos</CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    placeholder="Buscar por nombre o categoría..."
                    className="min-w-52 flex-1"
                  />
                  <div className="inline-flex rounded-md bg-muted p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={catalogView === "grid" ? "default" : "ghost"}
                      onClick={() => setCatalogView("grid")}
                      className="h-8 px-2"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={catalogView === "list" ? "default" : "ghost"}
                      onClick={() => setCatalogView("list")}
                      className="h-8 px-2"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="overflow-y-auto max-h-105 p-1">
                  {filteredProducts.length === 0 ? (
                    <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                      <PackageSearch className="h-5 w-5" />
                      <span>No hay productos para mostrar</span>
                    </div>
                  ) : catalogView === "grid" ? (
                    <div className="grid grid-cols-2 gap-3">
                      {filteredProducts.map((product) => {
                        const imageSrc = resolveProductImageUrl(product.imageUrl)
                        const showImage = imageSrc && !productImageErrors[product._id]

                        return (
                          <Card key={product._id} className="overflow-hidden border-border bg-card">
                            <div className="h-24 w-full rounded-t-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                              {showImage ? (
                                <img
                                  src={imageSrc}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                  onError={() => markImageAsFailed(product._id)}
                                />
                              ) : (
                                <div
                                  className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold"
                                  style={getAvatarStyle(product.name)}
                                >
                                  {getInitials(product.name)}
                                </div>
                              )}
                            </div>

                            <CardContent className="space-y-2 p-2.5">
                              <div>
                                <p className="text-sm font-medium line-clamp-1">{product.name}</p>
                                <p className="text-xs text-muted-foreground">Stock: {product.stock}</p>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-base font-bold">${product.price.toFixed(2)}</span>
                                <Button
                                  type="button"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => addProductToSale(product._id, 1)}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Precio</TableHead>
                          <TableHead className="text-center">Stock</TableHead>
                          <TableHead className="w-20 text-right">Acción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => (
                          <TableRow key={product._id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">{product.category}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                            <TableCell className="text-center">{product.stock}</TableCell>
                            <TableCell className="text-right">
                              <Button type="button" size="icon" className="h-8 w-8" onClick={() => addProductToSale(product._id, 1)}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                <Button
                  type="button"
                  className="hidden"
                >
                  Ver Carrito ({totalItems} {totalItems === 1 ? "item" : "items"} - ${total.toFixed(2)})
                </Button>
              </CardContent>
            </Card>
            <div
              className="hidden h-full w-100 shrink-0 flex-col justify-between gap-3 overflow-hidden lg:flex"
            >
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Carrito</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {saleItems.length === 0 ? (
                    <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                      <ShoppingCart className="h-5 w-5" />
                      <span>Carrito vacío - Selecciona un producto para comenzar</span>
                    </div>
                  ) : (
                    saleItems.map((item) => (
                      <div
                        key={item.productId}
                        className="flex items-center justify-between rounded-lg bg-muted/40 p-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} c/u</p>
                        </div>

                        <div className="ml-2 flex items-center gap-1">
                          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => decreaseItemQuantity(item.productId)}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                          <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => increaseItemQuantity(item.productId)}>
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeProductFromSale(item.productId)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border min-h-0 flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Cobro</CardTitle>
                </CardHeader>
                <CardContent className="min-h-0 space-y-3 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="paymentMethod">Método de Pago</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(value: "cash" | "card" | "transfer") => setPaymentMethod(value)}
                      >
                        <SelectTrigger id="paymentMethod">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={6}>
                          <SelectItem value="cash">Efectivo</SelectItem>
                          <SelectItem value="card">Tarjeta</SelectItem>
                          <SelectItem value="transfer">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="amountPaid">Monto Pagado</Label>
                      <div className="relative">
                        <Input
                          id="amountPaid"
                          type="number"
                          min="0"
                          step="0.01"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                          placeholder="0.00"
                          className="pl-7"
                          disabled={paymentMethod !== "cash"}
                        />
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="discount">Descuento</Label>
                      <div className="grid grid-cols-[1fr_88px] gap-2">
                        <div className="relative">
                          <Input
                            id="discount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                            placeholder="0.00"
                            className="pr-8"
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {discountType === "amount" ? "$" : "%"}
                          </span>
                        </div>
                        <Select
                          value={discountType}
                          onValueChange={(value: "amount" | "percent") => setDiscountType(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper" sideOffset={6}>
                            <SelectItem value="amount">$</SelectItem>
                            <SelectItem value="percent">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="tax">IVA</Label>
                      <div className="relative">
                        <Input
                          id="tax"
                          type="number"
                          min="0"
                          step="0.01"
                          value={tax}
                          onChange={(e) => setTax(e.target.value)}
                          placeholder="0.00"
                          className="pr-8"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 text-white rounded-xl dark:bg-slate-800">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">Descuento</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">IVA ({taxPercent.toFixed(2)}%)</span>
                      <span>${taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-700 pt-2">
                      <span className="text-sm font-semibold">TOTAL</span>
                      <span className="text-xl font-bold text-emerald-400">${total.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="text-slate-300">
                        {paymentMethod === "cash" && change < 0 ? "Diferencia Pendiente" : "Cambio"}
                      </span>
                      <span>${Math.abs(change).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Button type="button" className="w-full shrink-0" onClick={handleSubmit} disabled={!canSubmitSale}>
                {isLoading ? "Procesando..." : "Completar Venta"}
              </Button>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 border-t bg-background p-3 lg:hidden">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{totalItems} {totalItems === 1 ? "item" : "items"}</p>
              <p className="text-lg font-bold">${total.toFixed(2)}</p>
            </div>
            <Button type="button" onClick={() => setDrawerOpen(true)}>
              Revisar y Cobrar
            </Button>
          </div>

          <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent className="lg:hidden">
              <DrawerHeader className="shrink-0 pr-12">
                <DrawerTitle>Revisar y Cobrar</DrawerTitle>
                <DrawerDescription>Confirma los productos y completa el pago.</DrawerDescription>
              </DrawerHeader>
              <div className="min-h-0 overflow-y-auto px-4">
                {requireSaleUser ? <div className="space-y-2">
                  <Label htmlFor="mobile-client">Cliente *</Label>
                  <Input
                    id="mobile-client"
                    placeholder={selectedClientLabel || "Busca por nombre, teléfono o ID..."}
                    value={clientSearch}
                    onChange={(event) => setClientSearch(event.target.value)}
                    disabled={isLoading}
                  />
                  {selectedClientLabel && !clientSearch ? (
                    <p className="text-xs text-muted-foreground">Cliente seleccionado: {selectedClientLabel}</p>
                  ) : null}
                  {clientSearch ? (
                    <div className="max-h-48 overflow-y-auto rounded-md border bg-popover p-1">
                      {!debouncedClientSearch ? (
                        <p className="px-3 py-4 text-center text-sm text-muted-foreground">Escribe para buscar clientes</p>
                      ) : null}
                      {isLoadingClients ? (
                        <p className="px-3 py-4 text-center text-sm text-muted-foreground">Buscando clientes...</p>
                      ) : null}
                      {!isLoadingClients && debouncedClientSearch && clients.length === 0 ? (
                        <p className="px-3 py-4 text-center text-sm text-muted-foreground">No se encontraron clientes.</p>
                      ) : null}
                      {!isLoadingClients && clients.length > 0 ? (
                        <div className="space-y-1">
                          {clients.map((client) => (
                            <button
                              key={client.value}
                              type="button"
                              className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                              onClick={() => {
                                handleSelectClient(client)
                                setClientSearch("")
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selectedClientId === client.value ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{client.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div> : null}

                <div className="mt-4 space-y-2">
                  <CardTitle className="text-base">Carrito</CardTitle>
                  {saleItems.length === 0 ? (
                    <div className="rounded-lg bg-muted/40 p-4 text-center text-sm text-muted-foreground">Carrito vacío</div>
                  ) : (
                    <div className="space-y-2">
                      {saleItems.map((item) => (
                        <div key={item.productId} className="flex items-center justify-between rounded-lg bg-muted/40 p-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} c/u</p>
                          </div>
                          <div className="ml-2 flex items-center gap-1">
                            <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => decreaseItemQuantity(item.productId)}><Minus className="h-3.5 w-3.5" /></Button>
                            <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                            <Button type="button" size="icon" variant="outline" className="h-8 w-8" onClick={() => increaseItemQuantity(item.productId)}><Plus className="h-3.5 w-3.5" /></Button>
                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeProductFromSale(item.productId)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  <CardTitle className="text-base">Cobro</CardTitle>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label htmlFor="mobile-payment">Método</Label><Select value={paymentMethod} onValueChange={(value: "cash" | "card" | "transfer") => setPaymentMethod(value)}><SelectTrigger id="mobile-payment"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Efectivo</SelectItem><SelectItem value="card">Tarjeta</SelectItem><SelectItem value="transfer">Transferencia</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1"><Label htmlFor="mobile-paid">Monto</Label><Input id="mobile-paid" type="number" min="0" step="0.01" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} disabled={paymentMethod !== "cash"} placeholder="0.00" /></div>
                    <div className="space-y-1"><Label htmlFor="mobile-discount">Descuento</Label><Input id="mobile-discount" type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(event.target.value)} /></div>
                    <div className="space-y-1"><Label htmlFor="mobile-tax">IVA</Label><Input id="mobile-tax" type="number" min="0" step="0.01" value={tax} onChange={(event) => setTax(event.target.value)} /></div>
                  </div>
                  <div className="rounded-xl bg-slate-900 p-3 text-white"><div className="flex justify-between text-sm"><span className="text-slate-300">Subtotal</span><span>${subtotal.toFixed(2)}</span></div><div className="flex justify-between text-sm"><span className="text-slate-300">Descuento</span><span>-${discountAmount.toFixed(2)}</span></div><div className="flex justify-between text-sm"><span className="text-slate-300">IVA</span><span>${taxAmount.toFixed(2)}</span></div><div className="mt-2 flex justify-between border-t border-slate-700 pt-2"><span className="font-semibold">TOTAL</span><span className="text-xl font-bold text-emerald-400">${total.toFixed(2)}</span></div></div>
                </div>
              </div>
              <DrawerFooter className="shrink-0 border-t">
                <Button type="button" onClick={handleSubmit} disabled={!canSubmitSale}>{isLoading ? "Procesando..." : "Completar Venta"}</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </div>
  )
}
