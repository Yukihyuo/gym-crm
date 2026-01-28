import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

//Paginas
import Dashboard from "./routes/dashboard/page";
import Inventory from "./routes/inventory/page";
import Pages from "./routes/pages/page";
import Roles from "./routes/roles/page";
import Sales from "./routes/sales/page";
import Schedule from "./routes/schedule/page";
import Users from "./routes/users/page";
import Layout from "./components/layout/Layout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Dashboard />,
  },
  {
    path: "/roles",
    element: <Roles />,
  },
  {
    path: "/pages",
    element: <Pages />,
  },
  {
    path: "/users",
    element: <Users />,
  },
  {
    path: "/inventory",
    element: <Inventory />,
  },
  {
    path: "/sales",
    element: <Sales />,
  },
  {
    path: "/schedule",
    element: <Schedule />,
  },
]);



export default function Routes() {
  return <Layout><RouterProvider router={router} /></Layout>;
}