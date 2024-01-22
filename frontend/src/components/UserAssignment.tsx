import {
  Alert,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Snackbar,
} from "@mui/material";
import { useEffect, useState } from "react";
import APIRequest from "../api/Request";
import type { User } from "../typings/user/UserType";
import LoadingButton from "@mui/lab/LoadingButton";
import SaveIcon from "@mui/icons-material/Save";

interface Course {
  _id: string;
  name: string;
}

interface UserAssignmentProps {
  users: User[];
}

type CourseUserAction = {
  [key in "add" | "remove"]: {
    userID: string;
  }[];
};

type Severity = "error" | "success" | "info" | "warning" | undefined;

function not(a: readonly User[], b: readonly User[]) {
  return a.filter((value) => b.indexOf(value) === -1);
}

function intersection(a: readonly User[], b: readonly User[]) {
  return a.filter((value) => b.indexOf(value) !== -1);
}

function union(a: readonly User[], b: readonly User[]) {
  return [...a, ...not(b, a)];
}

function arraysAreEqual(
  array1: readonly User[],
  array2: readonly User[]
): boolean {
  if (array1.length !== array2.length) {
    return false;
  }

  for (let i = 0; i < array1.length; i++) {
    if (array1[i]._id !== array2[i]._id) {
      return false;
    }
  }

  return true;
}

const UserAssignment = ({ users }: UserAssignmentProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
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

  const unassignedChecked = intersection(checked, unassignedUsers);
  const assignedChecked = intersection(checked, assignedUsers);

  useEffect(() => {
    fetch(
      APIRequest("/api/courses", {
        headers: { authorization: localStorage.getItem("token") || "" },
      })
    )
      .then((response) => response.json())
      .then((data) => {
        if (data && data.message) {
          return;
        }
        setCourses(data);
      })
      .catch((error) => console.error("Error fetching courses:", error));

    setUnassignedUsers(users);
  }, [users]);

  const updateUsers = () => {
    setWaitForResponse(true);
    fetch(
      APIRequest("/api/users/course/" + currentCourseID + "/update", {
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
    setCurrentCourseID(courseID);
    const usersInCourse = filterUsersInCourse(courseID);
    setOriginalAssignedUsers(usersInCourse);
    setAssignedUsers(usersInCourse);
    setUnassignedUsers(not(users, usersInCourse));
  };

  const handleSnackbarClose = () => {
    setFetchNotification({ ...fetchNotification, open: false });
  };

  const handleToggle = (value: User) => () => {
    const currentIndex = checked.indexOf(value);
    const newChecked = [...checked];

    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };

  const numberOfChecked = (items: readonly User[]) =>
    intersection(checked, items).length;

  const handleToggleAll = (items: readonly User[]) => () => {
    if (numberOfChecked(items) === items.length) {
      setChecked(not(checked, items));
    } else {
      setChecked(union(checked, items));
    }
  };

  const handleCheckedAssigned = () => {
    const assigned = assignedUsers.concat(unassignedChecked);
    setAssignedUsers(assigned);
    setUnassignedUsers(not(unassignedUsers, unassignedChecked));
    setChecked(not(checked, unassignedChecked));
    if (currentCourseID !== "")
      setHasChanges(!arraysAreEqual(assigned, originalAssignedUsers));
  };

  const handleCheckedUnassigned = () => {
    const assigned = not(assignedUsers, assignedChecked);
    setUnassignedUsers(unassignedUsers.concat(assignedChecked));
    setAssignedUsers(assigned);
    setChecked(not(checked, assignedChecked));
    if (currentCourseID !== "")
      setHasChanges(!arraysAreEqual(assigned, originalAssignedUsers));
  };

  const customList = (title: React.ReactNode, items: readonly User[]) => (
    <Card>
      <CardHeader
        sx={{ px: 2, py: 1 }}
        avatar={
          <Checkbox
            onClick={handleToggleAll(items)}
            checked={
              numberOfChecked(items) === items.length && items.length !== 0
            }
            indeterminate={
              numberOfChecked(items) !== items.length &&
              numberOfChecked(items) !== 0
            }
            disabled={items.length === 0}
            inputProps={{
              "aria-label": "all items selected",
            }}
          />
        }
        title={title}
        subheader={`${numberOfChecked(items)}/${items.length} selected`}
      />
      <Divider />
      <List
        sx={{
          width: 200,
          height: 230,
          bgcolor: "background.paper",
          overflow: "auto",
        }}
        dense
        component="div"
        role="list"
      >
        {items.map((value: User) => {
          const labelId = `transfer-list-all-item-${value}-label`;

          return (
            <ListItemButton
              key={value._id}
              role="listitem"
              onClick={handleToggle(value)}
            >
              <ListItemIcon>
                <Checkbox
                  checked={checked.indexOf(value) !== -1}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{
                    "aria-labelledby": labelId,
                  }}
                />
              </ListItemIcon>
              <ListItemText id={labelId} primary={value.username} />
            </ListItemButton>
          );
        })}
      </List>
    </Card>
  );

  return (
    <Grid container spacing={2} justifyContent="center" alignItems="center">
      <Grid item ml={0}>
        <FormControl sx={{ m: 1, width: 500 }} size="small">
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
        <Grid item>{customList("Available User", unassignedUsers)}</Grid>
        <Grid item>
          <Grid container direction="column" alignItems="center">
            <Button
              sx={{ my: 0.5 }}
              variant="outlined"
              size="small"
              onClick={handleCheckedAssigned}
              disabled={unassignedChecked.length === 0}
              aria-label="add to course"
            >
              &gt;
            </Button>
            <Button
              sx={{ my: 0.5 }}
              variant="outlined"
              size="small"
              onClick={handleCheckedUnassigned}
              disabled={assignedChecked.length === 0}
              aria-label="remove from course"
            >
              &lt;
            </Button>
          </Grid>
        </Grid>
        <Grid item>{customList("User in Course", assignedUsers)}</Grid>
        <Grid container justifyContent="center" alignItems="flex-end">
          <Grid
            item
            sx={{ width: 512, mt: 1, display: "flex" }}
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
