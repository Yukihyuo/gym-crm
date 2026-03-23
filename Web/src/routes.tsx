import { createBrowserRouter, RouterProvider } from "react-router-dom";

//Paginas
import Dashboard from "./routes/dashboard/page";
import Inventory from "./routes/inventory/page";
import Pages from "./routes/pages/page";
import Roles from "./routes/roles/page";
import Sales from "./routes/sales/page";
import Schedule from "./routes/schedule/page";
import Access from "./routes/access/page";
import Layout from "./components/layout/Layout";
import Pruebas from "./routes/pruebas/page";
import ProtectedModule from "./components/global/ProtectedModule";
import Stores from "./routes/stores/page";
import Staff from "./routes/staff/page";
import Clients from "./routes/clients/page";
import Subscriptions from "@/routes/subscriptions/page";
import SubscriptionsAssignment from "@/routes/subscriptionsAssignment/page";
import { ThemeProvider } from "./components/global/theme-provider";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <ProtectedModule page="Dashboard" type="read" method="block"  >
          <Dashboard />
        </ProtectedModule>,
      },
      {
        path: "/roles",
        element: <ProtectedModule page="Roles" type="read" method="block" >
          <Roles />
        </ProtectedModule>,
      },
      {
        path: "/pages",
        element: <ProtectedModule page="Pages" type="read" method="block" >
          <Pages />
        </ProtectedModule>,
      },
      {
        path: "/stores",
        element: <ProtectedModule page="Stores" type="read" method="block" >
          <Stores />
        </ProtectedModule>,
      },
      {
        path: "/subscriptions",
        element: <ProtectedModule page="Subscriptions" type="read" method="block" >
          <Subscriptions />
        </ProtectedModule>,
      },
      {
        path: "/subscriptions-assignment",
        element: <ProtectedModule page="SubscriptionsAssignments" type="read" method="block" >
          <SubscriptionsAssignment />
        </ProtectedModule>,
      },
      {
        path: "/staff",
        element: <ProtectedModule page="Staff" type="read" method="block" >
          <Staff />
        </ProtectedModule>,
      }, {
        path: "/clients",
        element: <ProtectedModule page="Clients" type="read" method="block" >
          <Clients />
        </ProtectedModule>,
      },
      {
        path: "/inventory",
        element: <ProtectedModule page="Inventory" type="read" method="block" >
          <Inventory />
        </ProtectedModule>,
      },
      {
        path: "/sales",
        element: <ProtectedModule page="Sales" type="read" method="block" >
          <Sales />
        </ProtectedModule>,
      },
      {
        path: "/schedule",
        element: <ProtectedModule page="Schedule" type="read" method="block" >
          <Schedule />
        </ProtectedModule>,
      },
      {
        path: "/access",
        element: <Access />,
      },
      {
        path: "/pruebas",
        element: <Pruebas />,
      },
    ],
  },
]);



export default function Routes() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}