import * as React from "react";
import Loginform from "../components/LoginForm";

interface HomeProps {
  onUserLogin: (token: string, username: string) => void;
}
export default class Home extends React.Component {
  props!: HomeProps;
  constructor(props: HomeProps){
    super(props)
  }
  handleSuccessfulAuthentication(token: string, username: string): void {
    console.log("Successful auth!");
    this.props.onUserLogin(token, username)
  }

  render(): React.ReactElement {
    return (
      <>
        <Loginform
          onSuccessfulAuthentication={(token: string, username: string): void =>
            this.handleSuccessfulAuthentication(token, username)
          }
        ></Loginform>
      </>
    );
  }
}
