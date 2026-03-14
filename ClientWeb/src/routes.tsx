import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from './components/Layout';
import Home from './views/home';
import Trainings from "./views/trainings";
import Diets from "./views/diets";

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Home />
      },
      {
        path: "/trainings",
        element: <Trainings />
      },
      {
        path: "/diets",
        element: <Diets />
      }
     
    ],
  },
]);

export default function Routes() {
  return <RouterProvider router={router} />;
}
