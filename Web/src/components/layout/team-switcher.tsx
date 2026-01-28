"use client"


import {
  SidebarMenu,
  // SidebarMenuButton,
  SidebarMenuItem,
  // useSidebar,
} from "@/components/ui/sidebar"

import {Home} from "lucide-react"

export function TeamSwitcher() {
  // const { isMobile } = useSidebar()


  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex flex-row items-center gap-3">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Home className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{"Gimnasio"}</span>
            <span className="truncate text-xs">{"admin"}</span>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
