import Loginform from "../components/LoginForm";

interface HomeProps {
  onUserLogin: (
    token: string,
    username: string,
    groupNumber: number,
    role?: string,
  ) => void;
}

export default function Home(props: HomeProps): JSX.Element {
  return <Loginform onSuccessfulAuthentication={props.onUserLogin} />;
}
