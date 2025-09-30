import { useCallback, useEffect, useState } from "react";
import { Grid } from "@mui/material";
import { useSnackbar } from "notistack";
import { z } from "zod";

import type { User } from "../typings/user/UserType";
import type { Assignment, NewAssignment } from "../typings/assignment/AssignmentType";
import type { Course } from "../typings/course/CourseType";

import AdminTabs from "../components/AdminTabs";
import UserAssignment from "../components/UserAssignment";
import CourseAssignments from "../components/CourseAssignments";
import AddEntryDialog from "../components/AddEntryDialog";
import SubmissionOverview from "../components/SubmissionOverview";
import ActiveEnvironmentsOverview from "../components/ActiveEnvironmentsOverview.tsx";
import ConfigurationEditor from "../components/AssignmentEditor.tsx";

import { APIRequest } from "../api/Request";

// TODO: Most of these Validators are not in use right now, but can bes used to create assignments in the future

const ShellValidator = z.object({
  type: z.literal("Shell"),
  name: z.string(),
  executable: z.string(),
  cwd: z.string(),
  params: z.array(z.string()),
  provideTty: z.boolean(),
});

const WebAppValidator = z.object({
  type: z.literal("WebApp"),
  name: z.string(),
  url: z.string(),
});

const DesktopValidator = z.object({
  type: z.literal("Desktop"),
  name: z.string(),
  guacamoleServerURL: z.string(),
  remoteDesktopProtocol: z.enum(["vnc", "rdp"]),
  remoteDesktopPort: z.number(),
  remoteDesktopUsername: z.string().optional(),
  remoteDesktopPassword: z.string(),
  remoteDesktopHostname: z.string().optional(),
});

const TerminalTypeValidator = z.union([
  ShellValidator,
  WebAppValidator,
  DesktopValidator,
]);

const AliasedFileValidator = z.object({
  absFilePath: z.string(),
  alias: z.string(),
})

const AssignmentStepTestSSHCommandValidator = z.object({
  type: z.literal("SSHCommand"),
  command: z.string(),
  stdOutMatch: z.string(),
  successMessage: z.string(),
  errorHint: z.string(),
});

const AssignmentStepTestTerminalBufferSearchValidator = z.object({
  type: z.literal("TerminalBufferSearch"),
  terminal: z.string(),
  match: z.string(),
  successMessage: z.string(),
  errorHint: z.string(),
});

const AssignmentStepTestTypeValidator = z.union([
  AssignmentStepTestSSHCommandValidator,
  AssignmentStepTestTerminalBufferSearchValidator,
]);

export const AssignmentStepValidator = z.object({
  name: z.string(),
  label: z.string(),
  tests: z.array(AssignmentStepTestTypeValidator),
});

const assignmentValidator = z.object({
  _id: z.string(),
  name: z.string(),
  maxBonusPoints: z.number().optional(),
  assignmentLabSheet: z.string().optional(),
  labSheetName: z.string().optional(),
  sheetId: z.string().optional(),
  assignmentLabSheetLocation: z.enum(["backend", "instance", "database"]).optional(),
  description: z.string().optional(),
  providerImage: z.string().optional(),
  providerDockerCmd: z.string().optional(),
  providerKernelImage: z.string().optional(),
  submissionCleanupCommand: z.string().optional(),
  providerKernelBootARGs: z.string().optional(),
  submissionPrepareCommand: z.string().optional(),
  providerRootDrive: z.string().optional(),
  providerProxmoxTemplateTag: z.string().optional(),
  rootPath: z.string().optional(),
  useCollaboration: z.boolean().optional(),
  useLanguageClient: z.boolean().optional(),
  mountKubeconfig: z.boolean().optional(),
  terminals: z.array(z.array(TerminalTypeValidator)).optional(),
  editableFiles: z.array(AliasedFileValidator).optional(),
  stopCommands: z.array(TerminalTypeValidator).optional(),
  steps: z.array(AssignmentStepValidator).optional(),
  submissionSupplementalFiles: z.array(z.string()).optional(),
  providerDockerSupplementalPorts: z.array(z.string()).optional(),
  workspaceFolders: z.array(z.string()).optional(),
  markdownFiles: z.array(z.string()).optional(),
  sshTunnelingPorts: z.array(z.string()).optional(),
});

const assignmentsArrayValidator = z.array(assignmentValidator);

const environmentValidator = z.object({
  environment: z.string(),
  description: z.string().nullable().optional(),
  instance: z.string(),
  ipAddress: z.string().optional(),
  port: z.number().optional(),
})

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
  environments: z.array(environmentValidator).optional(),
});

const usersArrayValidator = z.array(userValidator);

const messageValidator = z.object({
  error: z.boolean(),
  message: z.string(),
  code: z.number().optional(),
  id: z.string().optional(),
});

const deleteValidator = z.object({
  success: z.boolean(),
});

const defaultValidator = z.object({});

function Administration(): JSX.Element {
  const { enqueueSnackbar } = useSnackbar();
  const [authorized, setAuthorized] = useState(false);
  const [load, setLoad] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [openDialog, setOpenDialog] = useState<boolean>(false);

  const showError = useCallback(
    (error: unknown) => {
      if (error instanceof Error) {
        enqueueSnackbar(error.message, { variant: "error" });
      } else {
        enqueueSnackbar("An unknown error occurred", { variant: "error" });
      }
      console.error("Error fetching data:", error);
    },
    [enqueueSnackbar],
  );

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
  }, [showError]);

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
  }, [addLocalAssignmentsToDB, authorized, showError]);

  // TODO: Create Assignment for future work
  const createAssignment = useCallback(async (assignment: Partial<NewAssignment>) => {
    try {
      const result = await APIRequest(
        "/admin/assignments/createNew",
        assignmentValidator,
        {
          method: "POST",
          body: JSON.stringify({
            name: assignment.name,
            maxBonusPoints: assignment.maxBonusPoints,
            assignmentLabSheet: assignment.assignmentLabSheet,
            labSheetName: assignment.labSheetName,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (result.success) {
        enqueueSnackbar("Assignment successfully created!", { variant: "success" });
        //setAssignment(result.data);
        await fetchAssignments();
        console.log("Assignments:", assignments);
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      showError(error);
    }
  }, [assignments, enqueueSnackbar, fetchAssignments, showError]);

  const updateAssignment = useCallback(async (update: Partial<NewAssignment>) => {
    try {
      const result = await APIRequest(
        `admin/assignment/${update._id}/update`,
        defaultValidator,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: update.name,
            maxBonusPoints: update.maxBonusPoints,
            assignmentLabSheet: update.assignmentLabSheet,
            _sheetId: update.sheetId,
            //description: update.description,
            labSheetName: update.labSheetName,
            labSheetContent: update.assignmentLabSheet,
          }),
        });
      if (result.success) {
        enqueueSnackbar("Assignment successfully updated!", { variant: "success" });
        await fetchAssignments();
        console.log("Assignments Updated:", assignments);
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      showError(error);
    }
  }, [enqueueSnackbar, fetchAssignments, assignments, showError]);

  // TODO: Can be extended in the future
  const deleteAssignment = useCallback(
    async (assignment: Partial<NewAssignment>) => {
      try {
        const result = await APIRequest(
          "admin/assignments/delete",
          deleteValidator,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              _id: assignment._id,
              _sheetId: assignment.sheetId ?? null,
            }),
          },
        );
        if (result.success) {
          enqueueSnackbar("Assignment successfully deleted!", { variant: "success" });
          await fetchAssignments();
        } else {
          throw new Error(result.error.message);
        }
      } catch (error) {
        showError(error);
      }
    },
    [enqueueSnackbar, fetchAssignments, showError]
  );

  const fetchActiveEnvironments = useCallback(async () => {
    if (!authorized) return;

    try {
      const result = await APIRequest("/admin/activeEnvironments", usersArrayValidator);

      if (result.success) {
        setActiveUsers(result.data);
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      showError(error);
    }
  }, [ authorized, showError]);

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
  }, [authorized, showError]);

  const handleAuthorization = useCallback(
    (authorized: boolean, message?: string) => {
      setAuthorized(authorized);
      if (!authorized && message) {
        enqueueSnackbar(message, { variant: "error" });
      }
    },
    [enqueueSnackbar],
  );

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

    fetchActiveEnvironments().catch((error) => {
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
  }, [
    load,
    fetchAssignments,
    fetchCourses,
    handleAuthorization,
    showError,
    enqueueSnackbar,
    fetchActiveEnvironments,
  ]);

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
        enqueueSnackbar(result.data.message, { variant: "success" });
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

  // const handleFetchNotification = (message: string, severity: Severity) => {
  //   setFetchNotification({
  //     result: message,
  //     severity: severity,
  //     open: true,
  //   });
  // };

  return (
    <Grid container spacing={0}>
      {authorized ? (
        <Grid item xs={12}>
          <AdminTabs
            tabNames={[
              "Assign Users",
              "Course Assignments",
              "Submission Overview",
              "Active Environments",
              "Assignment Editor"
            ]}
          >
            <UserAssignment
              key="assignUsers"
              users={users}
              courses={courses}
              openAddCourseDialog={openCreateNewCourseModal}
            ></UserAssignment>
            <CourseAssignments
              key="assignAssignments"
              assignments={assignments}
              courses={courses}
              openAddCourseDialog={openCreateNewCourseModal}
            ></CourseAssignments>
            <SubmissionOverview
              key="submissionOverview"
              assignments={assignments}
            ></SubmissionOverview>
            <ActiveEnvironmentsOverview
                key="assignmentCreation"
                activeUsers={activeUsers}
                reloadActiveUsers={fetchActiveEnvironments}
            ></ActiveEnvironmentsOverview>
            <ConfigurationEditor
              assignments={assignments}
              createAssignment={createAssignment}
              updateAssignment={updateAssignment}
              deleteAssignment={deleteAssignment}
              activeUsers={activeUsers}
              reloadActiveUsers={fetchActiveEnvironments}
            >
            </ConfigurationEditor>
          </AdminTabs>
        </Grid>
      ) : null}
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
}

export const Component = Administration;
export default Administration;
