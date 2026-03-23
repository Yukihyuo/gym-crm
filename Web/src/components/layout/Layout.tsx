import { AppSidebar } from "@/components/layout/app-sidebar"
import { useAuthStore } from "@/store/authStore"
import { useBrandConfigStore } from "@/store/brandConfigStore"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useEffect } from "react"
import { Outlet } from "react-router-dom"

export default function Layout({ children }: { children?: React.ReactNode }) {
  const brandId = useAuthStore((state) => state.getBrandId())
  const fetchConfig = useBrandConfigStore((state) => state.fetchConfig)
  const clearConfig = useBrandConfigStore((state) => state.clearConfig)
  const loadedBrandId = useBrandConfigStore((state) => state.loadedBrandId)
  const config = useBrandConfigStore((state) => state.config)

  useEffect(() => {
    if (!brandId) {
      clearConfig()
      return
    }

    if (loadedBrandId === brandId && config) {
      return
    }

    void fetchConfig(brandId)
  }, [brandId, clearConfig, config, fetchConfig, loadedBrandId])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Building Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="p-2" >{children ?? <Outlet />}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
