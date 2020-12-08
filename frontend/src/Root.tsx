import React from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import {
  BrowserRouter as Router,
  Route,
  Link
} from "react-router-dom";
import Home from "./views/Home";
import Environment from "./views/Environment";
import PrivateRoute from './components/PrivateRoute'
import AssignmentOverview from "./views/AssignmentOverview";

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

  render(): JSX.Element {
    return (
      <>
        <Router>
          <AppBar position="static">
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                aria-label="open drawer"
              ></IconButton>
              <h1>
                {this.state.authenticated === false
                  ? "Not logged in"
                  : `Logged in as ${this.state.username}`}
              </h1>
              <Link to="/assignments">Assignments</Link>
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
      </>
    );
  }
}
