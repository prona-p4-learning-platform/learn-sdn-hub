import React, { useMemo } from "react";
import { useState } from "react";
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
import "fontsource-roboto";
import { Box, Button } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";

function App() {
  const [username, setUsername] = useState("");
  const [groupNumber, setGroupNumber] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);

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
  }, []);

  const theme = createTheme();

  function handleUserLogin(
    token: string,
    username: string,
    groupNumber: number
  ): void {
    setUsername(username);
    setGroupNumber(groupNumber);
    setAuthenticated(true);

    localStorage.setItem("token", token);
    localStorage.setItem("username", username);
    localStorage.setItem("group", groupNumber.toString());
  }

  function handleUserLogout(username: string | null): void {
    setUsername("");
    setGroupNumber(0);
    setAuthenticated(false);
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("group");
    window.location.reload();
  }

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
              <Button
                color="inherit"
                onClick={() =>
                  handleUserLogout(localStorage.getItem("username"))
                }
              >
                Logout
              </Button>
            </Toolbar>
          </AppBar>
          <Route exact path="/">
            <Home
              onUserLogin={(token, username, groupNumber) =>
                handleUserLogin(token, username, groupNumber)
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
        </Router>
      </React.Fragment>
    </ThemeProvider>
  );
}

export default App;
