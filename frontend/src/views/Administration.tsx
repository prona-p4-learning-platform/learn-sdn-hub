import { Alert, Grid, Snackbar } from "@mui/material";
import AdminTabs from "../components/AdminTabs";
import UserAssignment from "../components/UserAssignment";
import { useCallback, useEffect, useState } from "react";
import { APIRequest } from "../api/Request";
import type { User } from "../typings/user/UserType";
import type { Assignment } from "../typings/assignment/AssignmentType";
import type { Course } from "../typings/course/CourseType";
import CourseAssignments from "../components/CourseAssignments";
import AddEntryDialog from "../components/AddEntryDialog";
import SubmissionOverview from "../components/SubmissionOverview";
import { z } from "zod";

export type Severity = "error" | "success" | "info" | "warning" | undefined;

const assignmentValidator = z.object({
  _id: z.string(),
  name: z.string(),
  maxBonusPoints: z.number().optional(),
});

const assignmentsArrayValidator = z.array(assignmentValidator);

const assignmentsUnionArrayValidator = z.union([
  z.array(assignmentValidator),
  z.array(z.string()),
]);

const courseValidator = z.object({
  _id: z.string(),
  name: z.string(),
  assignments: z.array(z.string()).optional(),
});

const coursesArrayValidator = z.array(courseValidator);

const userValidator = z.object({
  _id: z.string(),
  username: z.string(),
  groupNumber: z.number().nonnegative(),
  role: z.string().optional(),
  courses: z.array(z.string()).optional(),
});

const usersArrayValidator = z.array(userValidator);

const messageValidator = z.object({
  error: z.boolean(),
  message: z.string(),
  code: z.number().optional(),
  id: z.string().optional(),
});

const Administration = (): JSX.Element => {
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

  const addLocalAssignmentsToDB = useCallback(async () => {
    try {
      const result = await APIRequest(
        "/admin/assignments/create",
        assignmentsArrayValidator,
        {
          method: "POST",
        },
      );

      if (result.success) {
        setAssignments(result.data);
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      showError(error);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    if (!authorized) return;

    try {
      const result = await APIRequest(
        "/admin/assignments",
        assignmentsUnionArrayValidator,
      );

      if (result.success) {
        if (Array.isArray(result.data) && result.data.length > 0) {
          if (typeof result.data[0] === "object" && "_id" in result.data[0]) {
            setAssignments(result.data as Assignment[]);
          } else {
            addLocalAssignmentsToDB().catch((error) => {
              showError(error);
            });
          }
        }
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      showError(error);
    }
    // fetch(
    //   APIRequest("/api/admin/assignments", {
    //     headers: { authorization: localStorage.getItem("token") || "" },
    //   }),
    // )
    //   .then((response) => response.json())
    //   .then((data) => {
    //     if (Array.isArray(data) && data.length > 0) {
    //       if (typeof data[0] === "object" && data[0].hasOwnProperty("_id")) {
    //         setAssignments(data);
    //       } else {
    //         addLocalAssignmentsToDB();
    //       }
    //     }
    //   })
    //   .catch((error) => {
    //     setFetchNotification({
    //       result: error.message,
    //       severity: "error",
    //       open: true,
    //     });
    //   });
  }, [addLocalAssignmentsToDB, authorized]);

  const fetchCourses = useCallback(async () => {
    if (!authorized) return;

    try {
      const result = await APIRequest("/admin/courses", coursesArrayValidator);

      if (result.success) {
        setCourses([...result.data, { _id: "new", name: "Create New Course" }]);
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      showError(error);
    }
    // fetch(
    //   APIRequest("/admin/courses", {
    //     headers: { authorization: localStorage.getItem("token") || "" },
    //   }),
    // )
    //   .then((response) => response.json())
    //   .then((data) => {
    //     if (data && data.message) {
    //       return;
    //     }
    //     setCourses([...data, { _id: "new", name: "Create New Course" }]);
    //   })
    //   .catch((error) => console.error("Error fetching courses:", error));
  }, [authorized]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const result = await APIRequest("/admin/users", usersArrayValidator);

        if (result.success) {
          setAuthorized(true);
          setUsers(result.data);
          fetchAssignments().catch((error) => {
            showError(error);
          });
          fetchCourses().catch((error) => {
            showError(error);
          });
        } else {
          handleAuthorization(false, result.error.message);
        }
      } catch (error) {
        showError(error);
      } finally {
        setLoad(false);
      }
    };

    fetchUsers().catch((error) => {
      showError(error);
    });
    // setLoad(false);
    // fetch(
    //   APIRequest("/admin/users", {
    //     headers: { authorization: localStorage.getItem("token") || "" },
    //   }),
    // )
    //   .then((response) => response.json())
    //   .then((data) => {
    //     if (data && !data.message) {
    //       setAuthorized(true);
    //       setUsers(data);
    //       fetchAssignments();
    //       fetchCourses();
    //       return;
    //     }
    //     handleAuthorization(false, data.message);
    //   })
    //   .catch((error) => {
    //     setFetchNotification({
    //       result: error.message,
    //       severity: "error",
    //       open: true,
    //     });
    //   });
  }, [load, fetchAssignments, fetchCourses]);

  const showError = (error: unknown) => {
    if (error instanceof Error) {
      setFetchNotification({
        result: error.message,
        severity: "error",
        open: true,
      });
    } else {
      setFetchNotification({
        result: "An unknown error occurred",
        severity: "error",
        open: true,
      });
    }
    console.error("Error fetching data:", error);
  };

  const openCreateNewCourseModal = () => {
    setOpenDialog(true);
  };

  // const addLocalAssignmentsToDB = async () => {
  //   fetch(
  //     APIRequest("/api/admin/assignments/create", {
  //       method: "POST",
  //       headers: {
  //         authorization: localStorage.getItem("token") || "",
  //       },
  //     }),
  //   ).then((response) => {
  //     if (response.status === 200) {
  //       response.json().then((data) => {
  //         setAssignments(data);
  //       });
  //     } else {
  //       response.json().then((data) => {
  //         setFetchNotification({
  //           result: data.message,
  //           severity: "error",
  //           open: true,
  //         });
  //       });
  //     }
  //   });
  // };

  const addNewCourse = async (courseName: string) => {
    try {
      const result = await APIRequest(
        "/api/admin/course/create",
        messageValidator,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: courseName }),
        },
      );

      if (result.success) {
        setFetchNotification({
          result: result.data.message,
          severity: "success",
          open: true,
        });

        setCourses((prevCourses) => {
          const secondToLastIndex = prevCourses.length - 1;
          if (result.data.id === undefined) return prevCourses;
          return [
            ...prevCourses.slice(0, secondToLastIndex),
            { _id: result.data.id, name: courseName },
            prevCourses[secondToLastIndex],
          ];
        });
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      showError(error);
    }
    // fetch(
    //   APIRequest("/api/admin/course/create", {
    //     method: "POST",
    //     headers: {
    //       authorization: localStorage.getItem("token") || "",
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({ name: courseName }),
    //   }),
    // ).then((response) => {
    //   if (response.status === 200) {
    //     response.json().then((data) => {
    //       setFetchNotification({
    //         result: data.message,
    //         severity: "success",
    //         open: true,
    //       });
    //       setCourses((prevCourses) => {
    //         const secondToLastIndex = prevCourses.length - 1;
    //         return [
    //           ...prevCourses.slice(0, secondToLastIndex),
    //           { _id: data.id, name: courseName },
    //           prevCourses[secondToLastIndex],
    //         ];
    //       });
    //     });
    //   } else {
    //     response.json().then((data) => {
    //       setFetchNotification({
    //         result: data.message,
    //         severity: "error",
    //         open: true,
    //       });
    //     });
    //   }
    // });
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
        <Alert severity={fetchNotification.severity}>
          {fetchNotification.result}
        </Alert>
      </Snackbar>
      <AddEntryDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        onSubmit={function (data: Record<string, string>): void {
          addNewCourse(data.dialog_add_entry).catch((error) => {
            showError(error);
          });
        }}
        title={"Add new course"}
        description={"Enter the name for the new course."}
        label={"Course Name"}
      ></AddEntryDialog>
    </Grid>
  );
};

export default Administration;
