import { useState, useCallback, FormEvent } from "react";
import { useHistory } from "react-router-dom";
import {
  AlertColor,
  Box,
  Button,
  Container,
  Snackbar,
  TextField,
} from "@mui/material";
import { z } from "zod";

import Alert from "./Alert";
import { APIRequest } from "../api/Request";

type Severity = AlertColor | undefined;

export interface LoginFormProps {
  onSuccessfulAuthentication: (
    token: string,
    username: string,
    groupNumber: number,
  ) => void;
}

const loginValidator = z.object({
  token: z.string().min(1),
  username: z.string().min(1),
  groupNumber: z.number().nonnegative(),
});

export default function LoginForm(props: LoginFormProps): JSX.Element {
  const history = useHistory();

  const { onSuccessfulAuthentication } = props;

  const [notificationOpen, setNotificationOpen] = useState(false);
  const [loginResult, setLoginResult] = useState("");
  const [loginSeverity, setLoginSeverity] = useState<Severity>("error");

  const loginRequest = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const credentials = {
        username: data.get("username")?.toString() ?? "",
        password: data.get("password")?.toString() ?? "",
      };

      try {
        const request = await APIRequest("/user/login", loginValidator, {
          method: "POST",
          body: credentials,
        });

        if (request.success) {
          const data = request.data;

          setLoginResult("Auth successful!");
          setLoginSeverity("success");
          setNotificationOpen(true);
          onSuccessfulAuthentication(
            data.token,
            data.username,
            data.groupNumber,
          );

          history.push("/assignments");
        } else throw request.error;
      } catch {
        setLoginResult("Auth failed!");
        setLoginSeverity("error");
        setNotificationOpen(true);
      }
    },
    [onSuccessfulAuthentication, history],
  );

  const handleNotificationClose = () => {
    setNotificationOpen(false);
  };

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
      <Snackbar
        open={notificationOpen}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
      >
        <Alert onClose={handleNotificationClose} severity={loginSeverity}>
          {loginResult}
        </Alert>
      </Snackbar>
    </Container>
  );
}
