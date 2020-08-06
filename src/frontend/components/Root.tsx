import * as React from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import IconButton from "@material-ui/core/IconButton";
import { BrowserRouter as Router, Route, Link } from "react-router-dom";
import Home from "../views/Home";
import Environment from "../views/Environment";

export default class Hello extends React.Component {
  render() {
    return (
      <>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
            ></IconButton>
          </Toolbar>
        </AppBar>
        <Router>
          <Route exact path="/">
            <Home />
          </Route>
          <Route
            exact
            path="/environment/:environment"
            component={Environment}
          />
        </Router>
      </>
    );
  }
}
