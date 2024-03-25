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
import LoadingButton from "@mui/lab/LoadingButton";
import SaveIcon from "@mui/icons-material/Save";
import { not } from "../utilities/ListCompareHelper";
import AssignmentList from "./ListAssignment";
import type { Assignment } from "../typings/assignment/AssignmentType";
import type { Course } from "../typings/course/CourseType";

interface AssignmentProps {
  assignments: Assignment[];
  courses: Course[];
  openAddCourseDialog: () => void;
}

type Severity = "error" | "success" | "info" | "warning" | undefined;

const CourseAssignment = ({
  assignments,
  courses,
  openAddCourseDialog,
}: AssignmentProps) => {
  const [currentCourseID, setCurrentCourseID] = useState("");
  const [checked, setChecked] = useState<readonly Assignment[]>([]);
  const [unassignedAssignments, setUnassignedAssignments] = useState<
    Assignment[]
  >([]);
  const [assignedAssignments, setAssignedAssignments] = useState<Assignment[]>(
    []
  );
  const [originalAssignedAssignments, setOriginalAssignedAssignments] =
    useState<Assignment[]>([]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [waitForResponse, setWaitForResponse] = useState<boolean>(false);
  const [fetchNotification, setFetchNotification] = useState({
    result: "",
    severity: undefined as Severity,
    open: false,
  });

  useEffect(() => {
    setUnassignedAssignments(assignments);
  }, [assignments]);

  const updateAssignments = () => {
    setWaitForResponse(true);
    fetch(
      APIRequest(
        "/api/admin/course/" + currentCourseID + "/assignments/update",
        {
          method: "POST",
          headers: {
            authorization: localStorage.getItem("token") || "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            assignedAssignments.map((assignment) => assignment._id)
          ),
        }
      )
    )
      .then((response) => {
        if (response.status === 200) {
          const courseName = courses.find(
            (course) => course._id === currentCourseID
          )?.name;
          setHasChanges(false);
          setOriginalAssignedAssignments(assignedAssignments);
          setFetchNotification({
            result: `Assignments(s) for course ${courseName} updated!`,
            severity: "success",
            open: true,
          });
        } else {
          response.json().then((data) => {
            setFetchNotification({
              result: `Error updating assignments: ${data.message}`,
              severity: "error",
              open: true,
            });
          });
        }
      })
      .finally(() => setWaitForResponse(false));
  };

  const filterAssignmentsInCourse = (courseID: string) => {
    const course = courses.find((course) => course._id === courseID);
    return assignments.filter((assignment) =>
      course?.assignments?.includes(assignment._id)
    );
  };

  const handleCourseChange = (event: SelectChangeEvent) => {
    const courseID = event.target.value as string;
    if (courseID === "new") {
      openAddCourseDialog();
      return;
    }
    setCurrentCourseID(courseID);
    const assignmentsInCourse = filterAssignmentsInCourse(courseID);
    setOriginalAssignedAssignments(assignmentsInCourse);
    setAssignedAssignments(assignmentsInCourse);
    setUnassignedAssignments(not(assignments, assignmentsInCourse));
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
        <AssignmentList<Assignment>
          unassignedItems={unassignedAssignments}
          assignedItems={assignedAssignments}
          displayProperty="name"
          leftListTitle="Available Assignments"
          rightListTitle="Assignments in Course"
          checked={checked}
          currentCourseID={currentCourseID}
          originalAssigned={originalAssignedAssignments}
          setUnassigned={setUnassignedAssignments}
          setAssigned={setAssignedAssignments}
          setChecked={setChecked}
          setHasChanges={setHasChanges}
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
              onClick={updateAssignments}
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

export default CourseAssignment;
