import { useState, useCallback, forwardRef, FormEvent } from "react";
import TextField from "@mui/material/TextField";
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Snackbar from '@mui/material/Snackbar';
import { useHistory } from "react-router-dom";
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { createApiRequest } from '../lib/Request'

type Severity = "error" | "success" | "info" | "warning" | undefined;

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});


export interface LoginFormProps {
  onSuccessfulAuthentication: (token: string, username: string, groupNumber: number) => void
}


function LoginForm(props: LoginFormProps) {

  let history = useHistory();

  const { onSuccessfulAuthentication } = props

  const [ notificationOpen, setNotificationOpen ] = useState(false);
  const [ loginResult, setLoginResult ] = useState("")
  const [ loginSeverity, setLoginSeverity ] = useState("error")

  const loginRequest = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const credentials = {
      username: data.get('username')?.toString() ?? "",
      password: data.get('password')?.toString() ?? "",
    }

    // Api request
    const request = createApiRequest("/api/user/login", { method: 'POST', body: JSON.stringify(credentials), headers: { 'Content-Type': 'application/json' } })
    const result = await fetch(request)
    if (result.status === 200) {
      setLoginResult("Auth successful!")
      setLoginSeverity("success")
      setNotificationOpen(true)
      const message = await result.json()
      onSuccessfulAuthentication(message.token, message.username, message.groupNumber)
      history.push("/assignments")
      window.location.reload()
    } else if (result.status === 401) {
      setLoginResult("Auth failed!")
      setLoginSeverity("error")
      setNotificationOpen(true)
    }
  }, [ onSuccessfulAuthentication, history ]);

  const handleNotificationClose = () => {
    setNotificationOpen(false);
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'left',
        }}
      >
        <Box component="form" onSubmit={loginRequest} noValidate sx={{ mt: 1 }}>
          <TextField id="username" name="username" label="Username" margin="normal" fullWidth required autoFocus autoComplete="username" />
          <TextField id="password" name="password" label="Password" margin="normal" fullWidth required autoComplete="current-password" type="password" />
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
      <Snackbar open={notificationOpen} autoHideDuration={6000} onClose={handleNotificationClose}>
        <Alert onClose={handleNotificationClose} severity={loginSeverity as Severity}>
          {loginResult}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default LoginForm;
