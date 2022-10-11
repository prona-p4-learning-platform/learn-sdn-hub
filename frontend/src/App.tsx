import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Typography from "@mui/material/Typography";
import {
  BrowserRouter as Router,
  Route
} from "react-router-dom";
import Home from "./views/Home";
import Environment from "./views/Environment";
import PrivateRoute from './components/PrivateRoute'
import AssignmentOverview from "./views/AssignmentOverview";
import UserSettings from "./views/UserSettings";
import AdminSettings from "./views/AdminSettings";
import 'fontsource-roboto';
import { Button } from "@mui/material";
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme();

interface AppState {
  username: string;
  groupNumber: number;
  authenticated: boolean;
}
export default class App extends React.Component {
  state: AppState;
  constructor(props: {}) {
    super(props);
    this.state = {
      username: "",
      groupNumber: 0,
      authenticated: false,
    };

    if (localStorage.getItem("token") !== null) {
      this.state.authenticated = true
    }
    if (localStorage.getItem("username") !== null) {
      this.state.username = localStorage.getItem("username") as string
    }    
    if (localStorage.getItem("group") !== null) {
      this.state.groupNumber = parseInt(localStorage.getItem("group") ?? "0")
    }
  }

  handleUserLogin(token: string, username: string, groupNumber: number): void {
    this.setState({ username, groupNumber, authenticated: true });
    localStorage.setItem("token", token);
    localStorage.setItem("username", username);
    localStorage.setItem("group", groupNumber.toString())
  }

  handleUserLogout(username: string | null): void {
    this.setState({ username, groupNumber: 0, authenticated: false });
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("group");
    window.location.reload();
  }

  render(): JSX.Element {
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
                {this.state.authenticated === false
                    ? "Not logged in"
                    : `Logged in as ${this.state.username} (group: ${this.state.groupNumber})`}
              </Typography>
              <Button color="inherit" href={`/assignments`}>
                Assignments
              </Button>
              <Button color="inherit" href={`/settings`}>
                Settings
              </Button>
              <Button color="inherit" href={`/admin`}>
                Admin
              </Button>
              <Button color="inherit" onClick={() => this.handleUserLogout(localStorage.getItem("username"))}>
                Logout
              </Button>
            </Toolbar>
          </AppBar>
          <Route exact path="/">
           <Home
              onUserLogin={(token, username, groupNumber) =>
                this.handleUserLogin(token, username, groupNumber)
              }
            />
          </Route>
          <PrivateRoute isAuthenticated={this.state.authenticated} exact path="/assignments">
            <AssignmentOverview/>
          </PrivateRoute>
          <PrivateRoute isAuthenticated={this.state.authenticated} exact path="/settings">
            <UserSettings/>
          </PrivateRoute>
          <PrivateRoute isAuthenticated={this.state.authenticated} exact path="/admin">
            <AdminSettings/>
          </PrivateRoute>
          <PrivateRoute isAuthenticated={this.state.authenticated} exact path="/environment/:environment">
            <Environment />
          </PrivateRoute>
        </Router>
      </React.Fragment>
      </ThemeProvider>
    );
  }
}