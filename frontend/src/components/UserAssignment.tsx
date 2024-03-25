import {
  Alert,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Snackbar,
} from "@mui/material";
import { useEffect, useState } from "react";
import APIRequest from "../api/Request";
import type { User } from "../typings/user/UserType";
import type { Course } from "../typings/course/CourseType";
import LoadingButton from "@mui/lab/LoadingButton";
import SaveIcon from "@mui/icons-material/Save";
import { not } from "../utilities/ListCompareHelper";
import AssignmentList from "./ListAssignment";

interface UserAssignmentProps {
  users: User[];
  courses: Course[];
  openAddCourseDialog: () => void;
}

type CourseUserAction = {
  [key in "add" | "remove"]: {
    userID: string;
  }[];
};

type Severity = "error" | "success" | "info" | "warning" | undefined;

const UserAssignment = ({
  users,
  courses,
  openAddCourseDialog,
}: UserAssignmentProps) => {
  const [currentCourseID, setCurrentCourseID] = useState("");
  const [checked, setChecked] = useState<readonly User[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<User[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [originalAssignedUsers, setOriginalAssignedUsers] = useState<User[]>(
    []
  );
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [waitForResponse, setWaitForResponse] = useState<boolean>(false);
  const [fetchNotification, setFetchNotification] = useState({
    result: "",
    severity: undefined as Severity,
    open: false,
  });

  useEffect(() => {
    setUnassignedUsers(users);
  }, [users]);

  const updateUsers = () => {
    setWaitForResponse(true);
    fetch(
      APIRequest("/api/admin/course/" + currentCourseID + "/users/update", {
        method: "POST",
        headers: {
          authorization: localStorage.getItem("token") || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(prepareUsersDataForSend()),
      })
    )
      .then((response) => {
        if (response.status === 200) {
          const courseName = courses.find(
            (course) => course._id === currentCourseID
          )?.name;
          setHasChanges(false);
          setOriginalAssignedUsers(assignedUsers);
          setFetchNotification({
            result: `User(s) for course ${courseName} updated!`,
            severity: "success",
            open: true,
          });
        } else {
          response.json().then((data) => {
            setFetchNotification({
              result: `Error updating users: ${data.message}`,
              severity: "error",
              open: true,
            });
          });
        }
      })
      .finally(() => setWaitForResponse(false));
  };

  const prepareUsersDataForSend = (): CourseUserAction => {
    const addedUsers = not(assignedUsers, originalAssignedUsers);
    const removedUsers = not(originalAssignedUsers, assignedUsers);

    const usersData: CourseUserAction = {
      add: addedUsers.map((user) => ({
        userID: user._id,
      })),
      remove: removedUsers.map((user) => ({
        userID: user._id,
      })),
    };

    return usersData;
  };

  const filterUsersInCourse = (courseId: string) => {
    return users.filter((user) => user.courses?.includes(courseId));
  };

  const handleCourseChange = (event: SelectChangeEvent) => {
    const courseID = event.target.value as string;
    if (courseID === "new") {
      openAddCourseDialog();
      return;
    }
    setCurrentCourseID(courseID);
    const usersInCourse = filterUsersInCourse(courseID);
    setOriginalAssignedUsers(usersInCourse);
    setAssignedUsers(usersInCourse);
    setUnassignedUsers(not(users, usersInCourse));
  };

  const handleSnackbarClose = () => {
    setFetchNotification({ ...fetchNotification, open: false });
  };

  return (
    <Grid container spacing={2} justifyContent="center" alignItems="center">
      <Grid item ml={0}>
        <FormControl sx={{ m: 1, width: 600 }} size="small">
          <InputLabel id="course-select-label">Course</InputLabel>
          <Select
            labelId="course-select-label"
            id="course-select"
            value={currentCourseID}
            label="Course"
            onChange={handleCourseChange}
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            {courses.map((course) => (
              <MenuItem key={course._id} value={course._id}>
                {course.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid
        ml={0}
        container
        spacing={2}
        justifyContent="center"
        alignItems="center"
      >
        <AssignmentList<User>
          unassignedItems={unassignedUsers}
          assignedItems={assignedUsers}
          checked={checked}
          currentCourseID={currentCourseID}
          originalAssigned={originalAssignedUsers}
          setAssigned={setAssignedUsers}
          setChecked={setChecked}
          setHasChanges={setHasChanges}
          setUnassigned={setUnassignedUsers}
          displayProperty="username"
          leftListTitle="Available Users"
          rightListTitle="Users in Course"
        />
        <Grid container justifyContent="center" alignItems="flex-end">
          <Grid
            item
            sx={{ width: 612, mt: 1, display: "flex" }}
            justifyContent="flex-end"
            alignItems="flex-end"
          >
            <LoadingButton
              color="primary"
              onClick={updateUsers}
              loading={waitForResponse}
              disabled={!hasChanges}
              loadingPosition="start"
              startIcon={<SaveIcon />}
              variant="contained"
            >
              <span>Save Changes</span>
            </LoadingButton>
          </Grid>
        </Grid>
      </Grid>
      <Snackbar
        open={fetchNotification.open}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
      >
        <Alert severity={fetchNotification.severity as Severity}>
          {fetchNotification.result}
        </Alert>
      </Snackbar>
    </Grid>
  );
};

export default UserAssignment;
