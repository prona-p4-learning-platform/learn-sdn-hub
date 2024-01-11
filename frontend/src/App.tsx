import React, { useMemo, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Typography from "@mui/material/Typography";
import { BrowserRouter as Router, Route } from "react-router-dom";
import Home from "./views/Home";
import Environment from "./views/Environment";
import PrivateRoute from "./components/PrivateRoute";
import AssignmentOverview from "./views/AssignmentOverview";
import UserSettings from "./views/UserSettings";
import Administration from "./views/Administration";
import "fontsource-roboto";
import { Box, Button } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import Tooltip from "@mui/material/Tooltip";

function App() {
  const [username, setUsername] = useState("");
  const [groupNumber, setGroupNumber] = useState(0);
  const [role, setRole] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useMemo(() => {
    if (localStorage.getItem("token") !== null) {
      setAuthenticated(true);
    }
    if (localStorage.getItem("username") !== null) {
      setUsername(localStorage.getItem("username") as string);
    }
    if (localStorage.getItem("group") !== null) {
      setGroupNumber(parseInt(localStorage.getItem("group") ?? "0"));
    }
    if (localStorage.getItem("darkMode") === "true") {
      setDarkMode(true);
    }
    if (localStorage.getItem("role")) {
      setRole(localStorage.getItem("role") as string);
    }
  }, []);

  function handleUserLogin(
    token: string,
    username: string,
    groupNumber: number,
    role?: string
  ): void {
    setUsername(username);
    setGroupNumber(groupNumber);
    setAuthenticated(true);
    setRole(role ?? "");

    localStorage.setItem("token", token);
    localStorage.setItem("username", username);
    localStorage.setItem("group", groupNumber.toString());
    if (role) localStorage.setItem("role", role ?? "");
  }

  function handleUserLogout(username: string | null): void {
    setUsername("");
    setGroupNumber(0);
    setAuthenticated(false);
    setRole("");
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("group");
    localStorage.removeItem("role");
    window.location.reload();
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
      <React.Fragment>
        <CssBaseline />
        <Router>
          <AppBar position="static">
            <Toolbar>
              <IconButton edge="start" color="inherit" aria-label="menu">
                <MenuIcon />
              </IconButton>
              <Typography variant="h6">
                learn-sdn-hub
                {authenticated === false
                  ? ""
                  : ` - ${username} (group: ${groupNumber})`}
              </Typography>
              <Box sx={{ width: "10px" }} />
              <Button color="inherit" href={`/assignments`}>
                Assignments
              </Button>
              <Button color="inherit" href={`/settings`}>
                Settings
              </Button>
              {role && role === "admin" && (
                <Button color="inherit" href={`/admin`}>
                  Administration
                </Button>
              )}
              <Button
                color="inherit"
                onClick={() =>
                  handleUserLogout(localStorage.getItem("username"))
                }
              >
                Logout
              </Button>
              <Tooltip
                title={
                  theme.palette.mode === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                <IconButton
                  sx={{ ml: 1 }}
                  onClick={() => changeMode()}
                  color="inherit"
                >
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
            <Home
              onUserLogin={(token, username, groupNumber, role) =>
                handleUserLogin(token, username, groupNumber, role)
              }
            />
          </Route>
          <PrivateRoute
            isAuthenticated={authenticated}
            exact
            path="/assignments"
          >
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
          <PrivateRoute isAuthenticated={authenticated} exact path="/admin">
            <Administration />
          </PrivateRoute>
        </Router>
      </React.Fragment>
    </ThemeProvider>
  );
}

export default App;
