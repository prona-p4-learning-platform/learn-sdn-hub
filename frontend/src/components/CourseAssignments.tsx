import {
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { useEffect, useState } from "react";
import { APIRequest } from "../api/Request";
import LoadingButton from "@mui/lab/LoadingButton";
import SaveIcon from "@mui/icons-material/Save";
import { not } from "../utilities/ListCompareHelper";
import AssignmentList from "./ListAssignment";
import type { Assignment } from "../typings/assignment/AssignmentType";
import type { Course } from "../typings/course/CourseType";
import { Severity } from "../views/Administration";
import { z } from "zod";

interface AssignmentProps {
  assignments: Assignment[];
  courses: Course[];
  openAddCourseDialog: () => void;
  handleFetchNotification: (message: string, severity: Severity) => void;
}

const defaultValidator = z.object({});

const CourseAssignment = ({
  assignments,
  courses,
  openAddCourseDialog,
  handleFetchNotification,
}: AssignmentProps): JSX.Element => {
  const [currentCourseID, setCurrentCourseID] = useState("");
  const [checked, setChecked] = useState<readonly Assignment[]>([]);
  const [unassignedAssignments, setUnassignedAssignments] = useState<
    Assignment[]
  >([]);
  const [assignedAssignments, setAssignedAssignments] = useState<Assignment[]>(
    [],
  );
  const [originalAssignedAssignments, setOriginalAssignedAssignments] =
    useState<Assignment[]>([]);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [waitForResponse, setWaitForResponse] = useState<boolean>(false);

  useEffect(() => {
    setUnassignedAssignments(assignments);
  }, [assignments]);

  const updateAssignments = async () => {
    setWaitForResponse(true);
    const assignmentIDs = assignedAssignments.map(
      (assignment) => assignment._id,
    );
    try {
      const result = await APIRequest(
        `/admin/course/${currentCourseID}/assignments/update`,
        defaultValidator,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(assignmentIDs),
        },
      );

      if (result.success) {
        const courseName = courses.find(
          (course) => course._id === currentCourseID,
        )?.name;
        setHasChanges(false);
        setOriginalAssignedAssignments(assignedAssignments);
        handleFetchNotification(
          `Assignments(s) for course ${courseName} updated!`,
          "success",
        );
        refreshAssignmentsArray(currentCourseID, assignmentIDs);
      } else {
        handleFetchNotification(
          `Error updating assignments: ${result.error.message}`,
          "error",
        );
      }
    } catch (error) {
      if (error instanceof Error)
        handleFetchNotification(
          `Error updating assignments: ${error.message}`,
          "error",
        );
    } finally {
      setWaitForResponse(false);
    }

    // fetch(
    //   APIRequest(
    //     "/api/admin/course/" + currentCourseID + "/assignments/update",
    //     {
    //       method: "POST",
    //       headers: {
    //         authorization: localStorage.getItem("token") || "",
    //         "Content-Type": "application/json",
    //       },
    //       body: JSON.stringify(
    //         assignedAssignments.map((assignment) => assignment._id),
    //       ),
    //     },
    //   ),
    // )
    //   .then((response) => {
    //     if (response.status === 200) {
    //       const courseName = courses.find(
    //         (course) => course._id === currentCourseID,
    //       )?.name;
    //       setHasChanges(false);
    //       setOriginalAssignedAssignments(assignedAssignments);
    //       handleFetchNotification(
    //         `Assignments(s) for course ${courseName} updated!`,
    //         "success",
    //       );
    //     } else {
    //       response.json().then((data) => {
    //         handleFetchNotification(
    //           `Error updating assignments: ${data.message}`,
    //           "error",
    //         );
    //       });
    //     }
    //   })
    //   .finally(() => setWaitForResponse(false));
  };

  const refreshAssignmentsArray = (
    courseID: string,
    assignmentIDs: string[],
  ) => {
    const course = courses.find((course) => course._id === courseID);
    if (course) course.assignments = assignmentIDs;
  };

  const filterAssignmentsInCourse = (courseID: string) => {
    const course = courses.find((course) => course._id === courseID);
    return assignments.filter((assignment) =>
      course?.assignments?.includes(assignment._id),
    );
  };

  const handleCourseChange = (event: SelectChangeEvent) => {
    const courseID = event.target.value;
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

  const handleUpdateAssignments = () => {
    updateAssignments().catch((error) => {
      console.error("Error updating assignments:", error);
    });
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
              onClick={handleUpdateAssignments}
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
    </Grid>
  );
};

export default CourseAssignment;
