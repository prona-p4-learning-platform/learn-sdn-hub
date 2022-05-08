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
import 'fontsource-roboto';
import { Button } from "@mui/material";
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme();

interface AppState {
  username: string;
  authenticated: boolean;
}
export default class App extends React.Component {
  state: AppState;
  constructor(props: {}) {
    super(props);
    this.state = {
      username: "",
      authenticated: false,
    };

    if (localStorage.getItem("token") !== null) {
      this.state.authenticated = true
    }
    if (localStorage.getItem("username") !== null) {
      this.state.username = localStorage.getItem("username") as string
    }    
  }

  handleUserLogin(token: string, username: string): void {
    this.setState({ username, authenticated: true });
    localStorage.setItem("token", token);
    localStorage.setItem("username", username);
  }

  handleUserLogout(username: string | null): void {
    this.setState({ username, authenticated: false });
    localStorage.removeItem("token");
    localStorage.removeItem("username");
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
                    : `Logged in as ${this.state.username}`}
              </Typography>
              <Button color="inherit" href={`/assignments`}>
                Assignments
              </Button>
              <Button color="inherit" onClick={() => this.handleUserLogout(localStorage.getItem("username"))}>
                Logout
              </Button>
            </Toolbar>
          </AppBar>
          <Route exact path="/">
           <Home
              onUserLogin={(token, username) =>
                this.handleUserLogin(token, username)
              }
            />
          </Route>
          <PrivateRoute isAuthenticated={this.state.authenticated} exact path="/assignments">
            <AssignmentOverview/>
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
