import { ThemeProvider } from "@emotion/react";
import { CssBaseline } from "@mui/material";
import { SnackbarProvider, MaterialDesignContent } from "notistack";
import { createTheme, styled } from "@mui/material/styles";

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
  const ColorSwitchingSnackbar = styled(MaterialDesignContent)(() => ({
    "&.notistack-MuiContent-success": {
      backgroundColor: darkMode
        ? theme.palette.success.dark
        : theme.palette.success.light,
    },
    "&.notistack-MuiContent-error": {
      backgroundColor: darkMode
        ? theme.palette.error.dark
        : theme.palette.error.light,
    },
    "&.notistack-MuiContent-info": {
      backgroundColor: darkMode
        ? theme.palette.info.dark
        : theme.palette.info.light,
    },
    "&.notistack-MuiContent-warning": {
      backgroundColor: darkMode
        ? theme.palette.warning.dark
        : theme.palette.warning.light,
    },
  }));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider
        anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        Components={{
          info: ColorSwitchingSnackbar,
          success: ColorSwitchingSnackbar,
          error: ColorSwitchingSnackbar,
          warning: ColorSwitchingSnackbar,
        }}
      >
        <Routings />
      </SnackbarProvider>
    </ThemeProvider>
  );
}
