import { Alert, Grid, Snackbar } from "@mui/material";
import AdminTabs from "../components/AdminTabs";
import UserAssignment from "../components/UserAssignment";
import { useCallback, useEffect, useState } from "react";
import APIRequest from "../api/Request";
import type { User } from "../typings/user/UserType";
import type { Assignment } from "../typings/assignment/AssignmentType";
import type { Course } from "../typings/course/CourseType";
import CourseAssignments from "../components/CourseAssignments";
import AddEntryDialog from "../components/AddEntryDialog";
import SubmissionOverview from "../components/SubmissionOverview";

export type Severity = "error" | "success" | "info" | "warning" | undefined;

const Administration = () => {
  const [authorized, setAuthorized] = useState(false);
  const [load, setLoad] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [fetchNotification, setFetchNotification] = useState({
    result: "",
    severity: undefined as Severity,
    open: false,
  });
  const [openDialog, setOpenDialog] = useState<boolean>(false);

  const fetchAssignments = useCallback(() => {
    if (!authorized) return;
    fetch(
      APIRequest("/api/admin/assignments", {
        headers: { authorization: localStorage.getItem("token") || "" },
      })
    )
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          if (typeof data[0] === "object" && data[0].hasOwnProperty("_id")) {
            setAssignments(data);
          } else {
            addLocalAssignmentsToDB();
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
  }, [authorized]);

  const fetchCourses = useCallback(() => {
    if (!authorized) return;
    fetch(
      APIRequest("/api/admin/courses", {
        headers: { authorization: localStorage.getItem("token") || "" },
      })
    )
      .then((response) => response.json())
      .then((data) => {
        if (data && data.message) {
          return;
        }
        setCourses([...data, { _id: "new", name: "Create New Course" }]);
      })
      .catch((error) => console.error("Error fetching courses:", error));
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
          fetchCourses();
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
  }, [load, fetchAssignments, fetchCourses]);

  const openCreateNewCourseModal = () => {
    setOpenDialog(true);
    console.log("create new course");
  };

  const addLocalAssignmentsToDB = () => {
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
    });
  };

  const addNewCourse = (courseName: string) => {
    fetch(
      APIRequest("/api/admin/course/create", {
        method: "POST",
        headers: {
          authorization: localStorage.getItem("token") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: courseName }),
      })
    ).then((response) => {
      if (response.status === 200) {
        response.json().then((data) => {
          setFetchNotification({
            result: data.message,
            severity: "success",
            open: true,
          });
          setCourses((prevCourses) => {
            const secondToLastIndex = prevCourses.length - 1;
            return [
              ...prevCourses.slice(0, secondToLastIndex),
              { _id: data.id, name: courseName },
              prevCourses[secondToLastIndex],
            ];
          });
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
    });
  };

  const handleSnackbarClose = () => {
    setFetchNotification({ ...fetchNotification, open: false });
  };

  const handleFetchNotification = (message: string, severity: Severity) => {
    setFetchNotification({
      result: message,
      severity: severity,
      open: true,
    });
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
          <AdminTabs
            tabNames={[
              "Assign Users",
              "Course Assignments",
              "Submission Overview",
            ]}
          >
            <UserAssignment
              key="assignUsers"
              users={users}
              courses={courses}
              openAddCourseDialog={openCreateNewCourseModal}
              handleFetchNotification={handleFetchNotification}
            ></UserAssignment>
            <CourseAssignments
              key="assignAssignments"
              assignments={assignments}
              courses={courses}
              openAddCourseDialog={openCreateNewCourseModal}
              handleFetchNotification={handleFetchNotification}
            ></CourseAssignments>
            <SubmissionOverview
              key="submissionOverview"
              assignments={assignments}
              handleFetchNotification={handleFetchNotification}
            ></SubmissionOverview>
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
      <AddEntryDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSubmit={function (data: Record<string, string>): void {
          addNewCourse(data.dialog_add_entry);
        }}
        title={"Add new course"}
        description={"Enter the name for the new course."}
        label={"Course Name"}
      ></AddEntryDialog>
    </Grid>
  );
};

export default Administration;
