import { useCallback, FormEvent } from "react";
import { Box, Button, Container, TextField } from "@mui/material";
import { useSnackbar } from "notistack";

import { APIRequest, httpStatusValidator } from "../api/Request";

function Settings(): JSX.Element {
  const { enqueueSnackbar } = useSnackbar();

  const changePassword = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const credentials = {
        oldPassword: data.get("oldPassword") ?? "",
        newPassword: data.get("newPassword") ?? "",
        confirmNewPassword: data.get("confirmNewPassword") ?? "",
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
          enqueueSnackbar("Password changed successfully!", {
            variant: "success",
          });
        } else throw payload.error;
      } catch (_) {
        enqueueSnackbar("Changing password failed!", { variant: "error" });
      }
    },
    [enqueueSnackbar],
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
          onSubmit={() => {
            void changePassword;
          }}
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
    </Container>
  );
}

export const Component = Settings;
export default Settings;
