import { Alert, Grid, Snackbar } from "@mui/material";
import AdminTabs from "../components/AdminTabs";
import UserAssignment from "../components/UserAssignment";
import { useCallback, useEffect, useState } from "react";
import APIRequest from "../api/Request";
import type { User } from "../typings/user/UserType";
import type { Assignment } from "../typings/assignment/AssignmentType";
import CourseAssignments from "../components/CourseAssignments";

type Severity = "error" | "success" | "info" | "warning" | undefined;

const Administration = () => {
  const [authorized, setAuthorized] = useState(false);
  const [load, setLoad] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [fetchNotification, setFetchNotification] = useState({
    result: "",
    severity: undefined as Severity,
    open: false,
  });

  const fetchAssignments = useCallback(() => {
    if (authorized) {
      fetch(
        APIRequest("/api/admin/assignments", {
          headers: { authorization: localStorage.getItem("token") || "" },
        })
      )
        .then((response) => response.json())
        .then((data) => {
          console.log(data);
          if (Array.isArray(data) && data.length > 0) {
            if (typeof data[0] === "object" && data[0].hasOwnProperty("_id")) {
              setAssignments(data);
            } else {
              addAssignmentsToDB(data);
            }
          }
        })
        .catch((error) => {
          setFetchNotification({
            result: error.message,
            severity: "error",
            open: true,
          });
        });
    }
  }, [authorized]);

  useEffect(() => {
    setLoad(false);
    fetch(
      APIRequest("/api/admin/users", {
        headers: { authorization: localStorage.getItem("token") || "" },
      })
    )
      .then((response) => response.json())
      .then((data) => {
        if (data && !data.message) {
          setAuthorized(true);
          setUsers(data);
          fetchAssignments();
          return;
        }
        handleAuthorization(false, data.message);
      })
      .catch((error) => {
        setFetchNotification({
          result: error.message,
          severity: "error",
          open: true,
        });
      });
  }, [load, fetchAssignments]);

  const addAssignmentsToDB = (assignments: string[]) => {
    fetch(
      APIRequest("/api/admin/assignments/create", {
        method: "POST",
        headers: {
          authorization: localStorage.getItem("token") || "",
        },
      })
    ).then((response) => {
      if (response.status === 200) {
        response.json().then((data) => {
          setAssignments(data);
        });
      } else {
        response.json().then((data) => {
          setFetchNotification({
            result: data.message,
            severity: "error",
            open: true,
          });
        });
      }
      console.log(response);
    });
  };

  const handleSnackbarClose = () => {
    setFetchNotification({ ...fetchNotification, open: false });
  };

  const handleAuthorization = (authorized: boolean, message?: string) => {
    setAuthorized(authorized);
    if (!authorized && message) {
      setFetchNotification({
        result: message,
        severity: "error",
        open: true,
      });
    }
  };

  return (
    <Grid container spacing={0}>
      {authorized ? (
        <Grid item xs={12}>
          <AdminTabs tabNames={["Assign Users", "Course Assignments"]}>
            <UserAssignment key="assignUsers" users={users}></UserAssignment>
            <CourseAssignments
              key="assignAssignments"
              assignments={assignments}
            ></CourseAssignments>
          </AdminTabs>
        </Grid>
      ) : null}
      <Snackbar
        open={fetchNotification.open}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert severity={fetchNotification.severity as Severity}>
          {fetchNotification.result}
        </Alert>
      </Snackbar>
    </Grid>
  );
};

export default Administration;
