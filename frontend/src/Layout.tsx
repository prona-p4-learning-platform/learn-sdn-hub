import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import {
  AppBar,
  Box,
  Button,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  Hub as HubIcon,
} from "@mui/icons-material";

import NavigationButton from "./components/NavigationButton";

import { useAuthStore } from "./stores/authStore";
import { useOptionsStore } from "./stores/optionsStore";
import oidcClient from "./api/OidcClient.ts";

export default function Layout(): JSX.Element {
  const { username, groupNumber, clearStorage } = useAuthStore();
  const { darkMode, toggleDarkMode } = useOptionsStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // redirect to login if not authenticated
    if (!isAuthenticated && location.pathname !== "/") {
      void navigate("/", { replace: true });
    }

    // redirect to assignments if authenticated
    if (isAuthenticated && location.pathname === "/") {
      void navigate("/assignments", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  function handleUserLogout(): void {
    useAuthStore.persist.clearStorage(); // clear local storage
    clearStorage(); // reset store itself
    void oidcClient.getUser().then((user) => {
      if (user?.id_token) {
        return oidcClient.signoutRedirect({ id_token_hint: user.id_token });
      }
    })
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <HubIcon sx={{ mr: 3 }} />
          <Typography variant="h6">
            learn-sdn-hub
            {isAuthenticated ? ` - ${username} (group: ${groupNumber})` : ""}
          </Typography>
          <Box sx={{ width: "10px" }} />
          {isAuthenticated && (
            <>
              <NavigationButton to="/assignments">Assignments</NavigationButton>
              <NavigationButton to="/settings">Settings</NavigationButton>
              {isAdmin && (
                <NavigationButton to="/admin">Administration</NavigationButton>
              )}
              <Button color="inherit" onClick={handleUserLogout}>
                Logout
              </Button>
            </>
          )}
          <Box sx={{ mx: "auto " }} />
          <Tooltip
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            <IconButton
              sx={{ ml: 1 }}
              onClick={() => {
                toggleDarkMode();
              }}
              color="inherit"
            >
              {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Outlet />
    </>
  );
}
