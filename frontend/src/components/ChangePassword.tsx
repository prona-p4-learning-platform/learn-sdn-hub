import { useState, useCallback, FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Snackbar,
  TextField,
} from "@mui/material";
import type { AlertColor } from "@mui/material";

import { APIRequest, httpStatusValidator } from "../api/Request";

type Severity = AlertColor | undefined;

export default function ChangePassword(): JSX.Element {
  const [changePasswordResult, setChangePasswordResult] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [changePasswordSeverity, setChangePasswordSeverity] =
    useState<Severity>("error");

  const changePassword = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const credentials = {
        oldPassword: data.get("oldPassword")?.toString() ?? "",
        newPassword: data.get("newPassword")?.toString() ?? "",
        confirmNewPassword: data.get("confirmNewPassword")?.toString() ?? "",
      };

      try {
        const payload = await APIRequest(
          "/user/changePassword",
          httpStatusValidator,
          {
            method: "POST",
            body: credentials,
          },
        );

        if (payload.success) {
          setChangePasswordResult("Password change successful");
          setChangePasswordSeverity("success");
          setNotificationOpen(true);
        } else throw payload.error;
      } catch (error) {
        setChangePasswordResult("Password change failed");
        setChangePasswordSeverity("error");
        setNotificationOpen(true);
      }
    },
    [],
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
          onSubmit={void changePassword}
          noValidate
          sx={{ mt: 1 }}
        >
          <TextField
            id="oldPassword"
            name="oldPassword"
            label="Old Password"
            margin="normal"
            fullWidth
            required
            autoComplete="current-password"
            type="password"
          />
          <TextField
            id="newPassword"
            name="newPassword"
            label="New Password"
            margin="normal"
            fullWidth
            required
            autoComplete="current-password"
            type="password"
          />
          <TextField
            id="confirmNewPassword"
            name="confirmNewPassword"
            label="Confirm new Password"
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
            Change Password
          </Button>
        </Box>
      </Box>
      <Snackbar
        open={notificationOpen}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={changePasswordSeverity}
        >
          {changePasswordResult}
        </Alert>
      </Snackbar>
    </Container>
  );
}
