import { Alert, Grid, Snackbar } from "@mui/material";
import AdminTabs from "../components/AdminTabs";
import UserAssignment from "../components/UserAssignment";
import { useEffect, useState } from "react";
import APIRequest from "../api/Request";
import type { User } from "../typings/user/UserType";

const Administration = () => {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [authorized, setAuthorized] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch(
      APIRequest("/api/users", {
        headers: { authorization: localStorage.getItem("token") || "" },
      })
    )
      .then((response) => response.json())
      .then((data) => {
        if (data && !data.message) {
          setAuthorized(true);
          setUsers(data);
          return;
        }
        handleAuthorization(false, data.message);
      })
      .catch((error) => console.error("Error fetching users:", error));
  }, []);

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
    <Grid container spacing={0}>
      {authorized ? (
        <Grid item xs={12}>
          <AdminTabs tabNames={["Assign Users", "Course Assignments"]}>
            <UserAssignment key="assignUsers" users={users}></UserAssignment>
            <div key="courseAssignments">Course Assignments</div>
          </AdminTabs>
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
    </Grid>
  );
};

export default Administration;
