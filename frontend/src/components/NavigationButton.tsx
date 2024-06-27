import type { ReactNode } from "react";
import { Button } from "@mui/material";
import { Link } from "react-router-dom";

// custom props as react router does not provide them
interface NavigationProps {
  to: string;
  children: ReactNode;
}

// https://stackoverflow.com/a/70582460
export default function NavigationButton(props: NavigationProps): JSX.Element {
  const { to, children } = props;

  return (
    <Button component={Link} to={to} color="inherit">
      {children}
    </Button>
  );
}
