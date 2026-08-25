"use client"

import * as React from "react"
import { useMemo } from "react"
import {
  Box,
  Building2,
  Calendar,
  ChevronsUpDown,
  CreditCard,
  DoorOpen,
  FileText,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  ShoppingCart,
  TrendingDown,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import { NavUser } from "@/components/layout/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthStore } from "@/store/authStore"
import { useModulesStore } from "@/store/modulesStore"
import { cn } from "@/lib/utils"

type ModuleAction = "read" | "create" | "delete" | "update"

interface AppModule {
  _id?: string
  id?: string
  page: string
  type: ModuleAction
}

type AccessRule = {
  page: string
  type?: ModuleAction
}

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const routeAccessMap: Record<string, AccessRule> = {
  "/": { page: "Dashboard", type: "read" },
  "/roles": { page: "Roles", type: "read" },
  "/pages": { page: "Pages", type: "read" },
  "/stores": { page: "Stores", type: "read" },
  "/subscriptions": { page: "Subscriptions", type: "read" },
  "/subscriptions-assignment": { page: "SubscriptionsAssignments", type: "read" },
  "/access": { page: "Clients", type: "read" },
  "/cash-cuts": { page: "CashCuts", type: "read" },
  "/expenses": { page: "Expenses", type: "read" },
  "/staff": { page: "Staff", type: "read" },
  "/clients": { page: "Clients", type: "read" },
  "/inventory": { page: "Inventory", type: "read" },
  "/sales": { page: "Sales", type: "read" },
  "/schedule": { page: "Schedule", type: "read" },
}

const navigationGroups: NavGroup[] = [
  {
    label: "PRINCIPAL",
    items: [{ title: "Inicio", url: "/", icon: LayoutDashboard }],
  },
  {
    label: "OPERACIÓN",
    items: [
      { title: "Clientes", url: "/clients", icon: Users },
      { title: "Suscripciones", url: "/subscriptions", icon: CreditCard },
      { title: "Acceso de Clientes", url: "/access", icon: DoorOpen },
      { title: "Horarios", url: "/schedule", icon: Calendar },
    ],
  },
  {
    label: "VENTAS Y FINANZAS",
    items: [
      { title: "Ventas y Facturación", url: "/sales", icon: ShoppingCart },
      { title: "Cortes de Caja", url: "/cash-cuts", icon: Wallet },
      { title: "Inventario", url: "/inventory", icon: Box },
      { title: "Gastos", url: "/expenses", icon: TrendingDown },
    ],
  },
  {
    label: "CONFIGURACIÓN Y SISTEMA",
    items: [
      { title: "Staff", url: "/staff", icon: UserCheck },
      { title: "Tiendas / Sedes", url: "/stores", icon: Building2 },
      { title: "Roles y Permisos", url: "/roles", icon: ShieldCheck },
      { title: "Páginas", url: "/pages", icon: FileText },
    ],
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const userData = useAuthStore((state) => state.user?.profile ?? null)
  const userPermissions = useAuthStore((state) => state.access?.permissions ?? [])
  const access = useAuthStore((state) => state.access)
  const activeStore = useAuthStore((state) => state.activeStore)
  const setActiveStore = useAuthStore((state) => state.setActiveStore)
  const modules = useModulesStore((state) => state.modules as AppModule[])
  const stores = access?.stores ?? []
  const selectedStore = activeStore ?? stores[0] ?? null
  const selectedStoreId = selectedStore?._id ?? selectedStore?.id ?? ""

  const allowedRoutes = useMemo(() => {
    const routes = new Set<string>()

    for (const [url, rule] of Object.entries(routeAccessMap)) {
      if (!userPermissions.length || !modules.length) {
        continue
      }

      const allowedModuleIds = new Set(
        modules
          .filter((module) => module.page === rule.page && (rule.type ? module.type === rule.type : true))
          .map((module) => module._id ?? module.id)
          .filter((moduleId): moduleId is string => Boolean(moduleId))
      )

      const hasAccess = userPermissions.some((permissionId) => allowedModuleIds.has(permissionId))
      if (hasAccess) {
        routes.add(url)
      }
    }

    return routes
  }, [modules, userPermissions])

  const filteredGroups = useMemo(() => {
    return navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !routeAccessMap[item.url] || allowedRoutes.has(item.url)),
      }))
      .filter((group) => group.items.length > 0)
  }, [allowedRoutes])

  const isItemActive = (url: string) => {
    if (url === "/") {
      return location.pathname === "/"
    }

    return location.pathname === url || location.pathname.startsWith(`${url}/`)
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="border border-sidebar-border/70 bg-sidebar-accent/40 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 items-center justify-center rounded-md">
                    <Building2 className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{selectedStore?.name ?? "Sin sede"}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {stores.length ? `${stores.length} sedes` : "Sin acceso"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 opacity-70" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="right"
                align="start"
                sideOffset={6}
              >
                <DropdownMenuLabel>Sedes</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={selectedStoreId} onValueChange={setActiveStore}>
                  {stores.map((store) => {
                    const storeId = store._id ?? store.id

                    if (!storeId) {
                      return null
                    }

                    return (
                      <DropdownMenuRadioItem key={storeId} value={storeId}>
                        {store.name}
                      </DropdownMenuRadioItem>
                    )
                  })}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {filteredGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] uppercase tracking-wide text-sidebar-foreground/60">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isItemActive(item.url)

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={cn(
                          "gap-2",
                          active &&
                            "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                        )}
                      >
                        <Link to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                          {item.url === "/access" ? <KeyRound className="ml-auto size-3.5 opacity-65" /> : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        {userData && <NavUser user={userData} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
