import { Button } from "@mui/material";

// custom props as react router does not provide them
interface NavigationProps {
  href: string;
  children: JSX.Element;
  navigate: (to: string) => void;
}

// https://stackoverflow.com/a/72537967
export default function NavigationButton(props: NavigationProps): JSX.Element {
  const { navigate, href, children } = props;

  return (
    <Button
      color="inherit"
      onClick={() => {
        navigate(href);
      }}
    >
      {children}
    </Button>
  );
}
