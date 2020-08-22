import * as React from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import { BrowserRouter as Router, Route, Link, Redirect } from "react-router-dom";
import Home from "../views/Home";
import Environment from "../views/Environment";
interface AppState {
  username: string;
  authenticated: boolean;
}
export default class App extends React.Component {
  state: AppState;
  constructor(props){
    super(props)
    this.state = {
      username: null,
      authenticated: false
    }

    if (localStorage.getItem("token")){

    }

  }

  handleUserLogin(token: string, username: string):void{
    this.setState({username, authenticated: true})
    localStorage.setItem("token", token)
  }

  render(): JSX.Element {
    const that = this
    function PrivateRoute({ children, ...rest }) {
      return (
        <Route
          {...rest}
          render={({ location }) =>
            that.state.authenticated ? (
              children
            ) : (
              <Redirect
                to={{
                  pathname: "/",
                  state: { from: location }
                }}
              />
            )
          }
        />
      );
    }    
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
            <Home onUserLogin={(token, username) => this.handleUserLogin(token, username)}/>
          </Route>
          <PrivateRoute exact path="/assignments">
            <h1>Assignments!</h1>
          </PrivateRoute>
          <PrivateRoute
            exact
            path="/environment/:environment"
            >
              <Environment/>
            </PrivateRoute>
          
        </Router>
      </>
    );
  }
}
