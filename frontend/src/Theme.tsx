import { ThemeProvider } from "@emotion/react";
import { CssBaseline } from "@mui/material";
import { SnackbarProvider } from "notistack";
import { createTheme } from "@mui/material/styles";

import { useOptionsStore } from "./stores/optionsStore";

import Routings from "./Routings";

import "./index.css";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

export default function Theme(): JSX.Element {
  const { darkMode } = useOptionsStore();
  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
    },
  });

  // TODO: handle dark mode for notistack
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
      >
        <Routings />
      </SnackbarProvider>
    </ThemeProvider>
  );
}
