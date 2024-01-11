import { Alert, Container, Grid, Snackbar } from "@mui/material";
import AdminTabs from "../components/AdminTabs";
import UserAssignment from "../components/UserAssignment";
import { useState } from "react";

const Administration = () => {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [authorized, setAuthorized] = useState(true);

  const handleNotificationClose = () => {
    setNotificationOpen(false);
  };

  const handleAuthorization = (authorized: boolean, message?: string) => {
    setAuthorized(authorized);
    if (!authorized && message) {
      setErrorMessage(message);
      setNotificationOpen(true);
    }
  };

  return (
    <Container>
      {authorized ? (
        <Grid container spacing={0}>
          <Grid item xs={12}>
            <AdminTabs tabNames={["Assign Users", "Course Assignments"]}>
              <UserAssignment
                key="assignUsers"
                onAuthorization={handleAuthorization}
              ></UserAssignment>
              <div key="courseAssignments">Course Assignments</div>
            </AdminTabs>
          </Grid>
        </Grid>
      ) : null}
      <Snackbar
        open={notificationOpen}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
      >
        <Alert onClose={handleNotificationClose} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Administration;
