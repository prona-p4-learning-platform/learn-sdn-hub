import React from "react";
import Loginform from "../components/LoginForm";

interface HomeProps {
  onUserLogin: (token: string, username: string, groupNumber: number) => void;
}

export default class Home extends React.Component {
  declare props: HomeProps;

  handleSuccessfulAuthentication(
    token: string,
    username: string,
    groupNumber: number,
  ): void {
    this.props.onUserLogin(token, username, groupNumber);
  }

  render(): React.ReactElement {
    return (
      <>
        <Loginform
          onSuccessfulAuthentication={(
            token: string,
            username: string,
            groupNumber: number,
          ): void =>
            this.handleSuccessfulAuthentication(token, username, groupNumber)
          }
        ></Loginform>
      </>
    );
  }
}
