import { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Link,
  Redirect,
} from "react-router-dom";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  AppBar,
  Box,
  Button,
  CssBaseline,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";

import HubIcon from "@mui/icons-material/Hub";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

import Home from "./views/Home";
import Environment from "./views/Environment";
import PrivateRoute from "./components/PrivateRoute";
import AssignmentOverview from "./views/AssignmentOverview";
import UserSettings from "./views/UserSettings";
import NavigationButton from "./components/NavigationButton";

export default function App(): JSX.Element {
  const [username, setUsername] = useState("");
  const [groupNumber, setGroupNumber] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("token") !== null) {
      setAuthenticated(true);
    }

    const username = localStorage.getItem("username");
    if (username !== null) {
      setUsername(username);
    }

    if (localStorage.getItem("group") !== null) {
      setGroupNumber(parseInt(localStorage.getItem("group") ?? "0"));
    }

    if (localStorage.getItem("darkMode") === "true") {
      setDarkMode(true);
    }
  }, []);

  function handleUserLogin(
    token: string,
    username: string,
    groupNumber: number,
  ): void {
    setUsername(username);
    setGroupNumber(groupNumber);
    setAuthenticated(true);

    localStorage.setItem("token", token);
    localStorage.setItem("username", username);
    localStorage.setItem("group", groupNumber.toString());
  }

  function handleUserLogout(): void {
    setUsername("");
    setGroupNumber(0);
    setAuthenticated(false);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("group");
  }

  function changeMode() {
    setDarkMode(!darkMode);
    localStorage.setItem("darkMode", (!darkMode).toString());
  }

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
    },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppBar position="static">
          <Toolbar>
            <HubIcon sx={{ mr: 3 }} />
            <Typography variant="h6">
              learn-sdn-hub
              {authenticated ? ` - ${username} (group: ${groupNumber})` : ""}
            </Typography>
            <Box sx={{ width: "10px" }} />
            <Link component={NavigationButton} to="/assignments">
              Assignments
            </Link>
            <Link component={NavigationButton} to="/settings">
              Settings
            </Link>
            <Button color="inherit" onClick={handleUserLogout}>
              Logout
            </Button>
            <Box sx={{ mx: "auto " }} />
            <Tooltip
              title={
                theme.palette.mode === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
            >
              <IconButton sx={{ ml: 1 }} onClick={changeMode} color="inherit">
                {theme.palette.mode === "dark" ? (
                  <Brightness7Icon />
                ) : (
                  <Brightness4Icon />
                )}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
        <Route exact path="/">
          {authenticated ? (
            <Redirect to="/assignments" />
          ) : (
            <Home onUserLogin={handleUserLogin} />
          )}
        </Route>
        <PrivateRoute isAuthenticated={authenticated} exact path="/assignments">
          <AssignmentOverview />
        </PrivateRoute>
        <PrivateRoute isAuthenticated={authenticated} exact path="/settings">
          <UserSettings />
        </PrivateRoute>
        <PrivateRoute
          isAuthenticated={authenticated}
          exact
          path="/environment/:environment"
        >
          <Environment />
        </PrivateRoute>
      </Router>
    </ThemeProvider>
  );
}
