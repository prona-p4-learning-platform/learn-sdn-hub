import { useCallback, FormEvent } from "react";
import { Box, Button, Container, TextField } from "@mui/material";
import { useSnackbar } from "notistack";
import { z } from "zod";

import { useAuthStore } from "../stores/authStore";
import { APIRequest } from "../api/Request";

const loginValidator = z.object({
  token: z.string().min(1),
  username: z.string().min(1),
  groupNumber: z.number().nonnegative(),
  role: z.string().optional(),
});

export default function Login(): JSX.Element {
  const { enqueueSnackbar } = useSnackbar();
  const { setAuthentication } = useAuthStore();

  const loginRequest = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const credentials = {
        username: data.get("username") ?? "",
        password: data.get("password") ?? "",
      };

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
        } else throw request.error;
      } catch (error) {
        console.error(error);
        enqueueSnackbar("Authentication failed!", { variant: "error" });
      }
    },
    [enqueueSnackbar, setAuthentication],
  );

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
          onSubmit={(event) => void loginRequest(event)}
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
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            Login
          </Button>
        </Box>
      </Box>
    </Container>
  );
}
