import { useState, useCallback, FormEvent } from "react";
import { Alert, Snackbar, Container, Box, Button, TextField } from "@mui/material";
import APIRequest from '../api/Request'

type Severity = "error" | "success" | "info" | "warning" | undefined;

function ChangePassword() {
    const [changePasswordResult, setChangePasswordResult] = useState("")
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [changePasswordSeverity, setChangePasswordSeverity] = useState("error")

    const changePassword = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const credentials = {
            oldPassword: data.get('oldPassword')?.toString() ?? "",
            newPassword: data.get('newPassword')?.toString() ?? "",
            confirmNewPassword: data.get('confirmNewPassword')?.toString() ?? "",
        }

        // Api request
        const request = APIRequest("/api/user/changePassword", { method: 'POST', body: JSON.stringify(credentials), headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" } })
        const result = await fetch(request)

        if (result.status === 200) {
            setChangePasswordResult("Password change successful");
            setChangePasswordSeverity("success")
            setNotificationOpen(true)
        } else {
            const message = await result.json()
            setChangePasswordResult("Password change failed: " + message.message);
            setChangePasswordSeverity("error")
            setNotificationOpen(true)
        }
    }, []);

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
                <Box component="form" onSubmit={changePassword} noValidate sx={{ mt: 1 }}>
                    <TextField id="oldPassword" name="oldPassword" label="Old Password" margin="normal" fullWidth required autoComplete="current-password" type="password" />
                    <TextField id="newPassword" name="newPassword" label="New Password" margin="normal" fullWidth required autoComplete="current-password" type="password" />
                    <TextField id="confirmNewPassword" name="confirmNewPassword" label="Confirm new Password" margin="normal" fullWidth required autoComplete="current-password" type="password" />
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
            <Snackbar open={notificationOpen} autoHideDuration={6000} onClose={handleNotificationClose}>
                <Alert onClose={handleNotificationClose} severity={changePasswordSeverity as Severity}>
                    {changePasswordResult}
                </Alert>
            </Snackbar>
        </Container>
    );
}

export default ChangePassword;