import { FormEvent, useCallback, useEffect, useRef } from "react";
import { Box, Button, Container, TextField } from "@mui/material";
import { useSnackbar } from "notistack";
import { z } from "zod";

import { useAuthStore } from "../stores/authStore";
import oidcClient from "../api/OidcClient.ts";
import { useLocation, useNavigate } from "react-router";
import { APIRequest } from "../api/Request.ts";

const loginValidator = z.object({
  token: z.string().min(1),
  username: z.string().min(1),
  groupNumber: z.number().nonnegative(),
  role: z.string().optional(),
});

export default function Login(): JSX.Element {
  const { enqueueSnackbar } = useSnackbar();
  const { setAuthentication } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const initialized = useRef(false);

  const login = useCallback(
    async (
      credentials:
        | { type: "jwt"; token: string }
        | {
            type: "basic";
            username: string;
            password: string;
          },
    ): Promise<void> => {
      let error;
      try {
        const request = await APIRequest("/user/login", loginValidator, {
          method: "POST",
          body: credentials,
        });

        if (request.success) {
          const data = request.data;

          enqueueSnackbar("Authentication successful!", { variant: "success" });
          setAuthentication(
            data.username,
            data.groupNumber,
            data.token,
            data.role,
          );
          return;
        }

        error = request.error;
      } catch (err) {
        error = err;
      }
      console.error(error);
      enqueueSnackbar("Authentication failed!", { variant: "error" });
    },
    [enqueueSnackbar, setAuthentication],
  );

  // Used to detect page load.
  useEffect(() => {
    // Workaround because of the configured strict mode that invokes the function twice
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    const searchParams = new URLSearchParams(location.search);

    if (
      searchParams.has("state") &&
      searchParams.has("session_state") &&
      searchParams.has("code")
    ) {
      oidcClient
        .signinCallback(window.location.href)
        .then(async (user) => {
          if (!user) {
            throw new Error("Oidc authentication failed!");
          }
          await login({
            type: "jwt",
            token: user.access_token,
          });
        })
        .catch((err) => {
          enqueueSnackbar("Authentication failed!", { variant: "error" });
          console.error(err);
        });
    }
  }, [enqueueSnackbar, location, login, navigate, setAuthentication]);

  const loginBasicRequest = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      await login({
        type: "basic",
        username: (data.get("username") ?? "") as string,
        password: (data.get("password") ?? "") as string,
      });
    },
    [login],
  );

  const oidcLoginRequest = useCallback(() => {
    oidcClient
      .signinRedirect()
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "left",
        }}
      >
        <Box
          component="form"
          onSubmit={(event) => void loginBasicRequest(event)}
          noValidate
          sx={{ mt: 1 }}
        >
          <TextField
            id="username"
            name="username"
            label="Username"
            margin="normal"
            fullWidth
            required
            autoFocus
            autoComplete="username"
          />
          <TextField
            id="password"
            name="password"
            label="Password"
            margin="normal"
            fullWidth
            required
            autoComplete="current-password"
            type="password"
          />
          <Button
            onClick={() => void oidcLoginRequest()}
            fullWidth
            variant="outlined"
            sx={{ mt: 3 }}
          >
            Login with OIDC
          </Button>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 1, mb: 2 }}
          >
            Login
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
