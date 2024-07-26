import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Layout from "./Layout";
import Login from "./views/Login";

const routes = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Login />,
      },
      {
        path: "/assignments",
        lazy: () => import("./views/Assignments"),
      },
      {
        path: "/settings",
        lazy: () => import("./views/Settings"),
      },
      {
        path: "/admin",
        lazy: () => import("./views/Administration"),
      },
      {
        path: "/environment/:environmentName",
        lazy: () => import("./views/Environment"),
      },
    ],
  },
]);

export default function Routings(): JSX.Element {
  return <RouterProvider router={routes} />;
}
