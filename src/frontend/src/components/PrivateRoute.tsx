import React from 'react'
import {Route, Redirect, RouteProps} from 'react-router'

interface PrivateRouteProps {
 children: JSX.Element[] | JSX.Element;
 isAuthenticated: boolean;
};

export default function PrivateRoute(props: PrivateRouteProps & RouteProps) {
    const {children, isAuthenticated, ...rest} = props
    return (
      <Route
        {...rest}
        render={({ location }) =>
          isAuthenticated ? (
            children
          ) : (
            <Redirect
              to={{
                pathname: "/",
                state: { from: location },
              }}
            />
          )
        }
      />
    );
  }