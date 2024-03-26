'use client';
import React, { useEffect, useMemo, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Typography from "@mui/material/Typography";
import { Box, Button } from "@mui/material";
import { createTheme } from "@mui/material/styles";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import Tooltip from "@mui/material/Tooltip";
import { signOut, useSession } from "next-auth/react";

const NavbarComponent = () => {

  const [ username, setUsername ] = useState("");
  const [ groupNumber, setGroupNumber ] = useState(0);
  const [ darkMode, setDarkMode ] = useState(false);

  const session = useSession();

  useEffect(() => {
    if (session.status === "authenticated") {
      setUsername(session.data.user.name ?? "");
      setGroupNumber(session.data.user.groupNumber ?? 0);
    }
  }, [ session ])

  /* useMemo(() => {
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
  }, []); */

  /* function handleUserLogin(
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
  } */

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
    <div>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">
            learn-sdn-hub
            {session.status === 'unauthenticated'
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
          {session.status === "unauthenticated" ? (
            <Button color="inherit" href={`/login`}>
              Login
            </Button>
          ) : (
            <Button
              color="inherit"
              onClick={() =>
                signOut()
              }
            >
              Logout
            </Button>
          )}

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
      {/* <Route exact path="/">
        <Home />
      </Route>
      <PrivateRoute isAuthenticated={authenticated} exact path="/assignments">
        <AssignmentOverview />
      </PrivateRoute>
      <PrivateRoute isAuthenticated={authenticated} exact path="/settings">
        <UserSettings />
      </PrivateRoute>
      <PrivateRoute isAuthenticated={authenticated} exact path="/environment/:environment">
        <Environment />
      </PrivateRoute> */}
    </div>
  )
}

export default NavbarComponent