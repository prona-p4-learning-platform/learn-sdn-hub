import { Component } from "react";
import Loginform from "../components/LoginForm";

interface HomeProps {
  onUserLogin: (token: string, username: string, groupNumber: number) => void;
}

export default class Home extends Component<HomeProps> {
  handleSuccessfulAuthentication(
    token: string,
    username: string,
    groupNumber: number,
  ): void {
    this.props.onUserLogin(token, username, groupNumber);
  }

  render(): JSX.Element {
    return (
      <>
        <Loginform
          onSuccessfulAuthentication={(
            token: string,
            username: string,
            groupNumber: number,
          ): void => {
            this.handleSuccessfulAuthentication(token, username, groupNumber);
          }}
        ></Loginform>
      </>
    );
  }
}
