"use client"

import * as React from "react"
import { useMemo } from "react"
import {
  FileChartColumn,
  ShoppingCart,
  SquareTerminal,
  User,
  CalendarDays,
  Users,


} from "lucide-react"

import { NavMain } from "@/components/layout/nav-main"
import { NavProjects } from "@/components/layout/nav-projects"
import { NavUser } from "@/components/layout/nav-user"
import { TeamSwitcher } from "@/components/layout/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/store/authStore"
import { useModulesStore } from "@/store/modulesStore"

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

const routeAccessMap: Record<string, AccessRule> = {
  "/": { page: "Dashboard", type: "read" },
  "/roles": { page: "Roles", type: "read" },
  "/pages": { page: "Pages", type: "read" },
  "/stores": { page: "Stores", type: "read" },
  "/subscriptions": { page: "Subscriptions", type: "read" },
  "/subscriptions-assignment": { page: "SubscriptionsAssignments", type: "read" },
  "/staff": { page: "Staff", type: "read" },
  "/clients": { page: "Clients", type: "read" },
  "/inventory": { page: "Inventory", type: "read" },
  "/sales": { page: "Sales", type: "read" },
  "/schedule": { page: "Schedule", type: "read" },
}

// This is sample data.
const data = {
  navMain: [
    {
      title: "Administración",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "Inicio",
          url: "/",
        },
        {
          title: "Roles",
          url: "/roles",
        },
        {
          title: "Páginas",
          url: "/pages",
        },
        {
          title: "Suscripciones",
          url: "/subscriptions",
        },
        {
          title: "Asignación de suscripciones",
          url: "/subscriptions-assignment",
        },
        {
          title: "Tiendas",
          url: "/stores",
        }
      ],
    },
  ],
  projects: [
    {
      name: "Staff",
      url: "/staff",
      icon: User,
    }, {
      name: "Clientes",
      url: "/clients",
      icon: Users,
    },
    {
      name: "Inventario",
      url: "/inventory",
      icon: FileChartColumn,
    },
    {
      name: "Ventas y Facturación",
      url: "/sales",
      icon: ShoppingCart,
    },
    {
      name: "Horarios",
      url: "/schedule",
      icon: CalendarDays,
    }
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const userData = useAuthStore((state) => state.user?.profile ?? null)
  const userPermissions = useAuthStore((state) => state.access?.permissions ?? [])
  const modules = useModulesStore((state) => state.modules as AppModule[])

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

  const filteredNavMain = useMemo(() => {
    return data.navMain
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => !routeAccessMap[item.url] || allowedRoutes.has(item.url)),
      }))
      .filter((section) => section.items.length > 0)
  }, [allowedRoutes])

  const filteredProjects = useMemo(() => {
    return data.projects.filter((project) => !routeAccessMap[project.url] || allowedRoutes.has(project.url))
  }, [allowedRoutes])

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
        <NavProjects projects={filteredProjects} />
      </SidebarContent>
      <SidebarFooter>
        {userData && <NavUser user={userData} />}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
