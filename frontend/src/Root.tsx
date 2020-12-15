import React from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import MenuIcon from '@material-ui/icons/Menu';
import Typography from '@material-ui/core/Typography';
import {
  BrowserRouter as Router,
  Route,
  Link
} from "react-router-dom";
import Home from "./views/Home";
import Environment from "./views/Environment";
import PrivateRoute from './components/PrivateRoute'
import AssignmentOverview from "./views/AssignmentOverview";
import { makeStyles } from '@material-ui/core/styles';
import 'fontsource-roboto';
import { Button } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  menuButton: {
    marginRight: theme.spacing(2),
  },
  title: {
    flexGrow: 1,
  },
}));

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
  }

  render(): JSX.Element {
    return (
      <div>
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
      </div>
    );
  }
}
