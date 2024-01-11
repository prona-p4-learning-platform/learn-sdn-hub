import {
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import { useEffect, useState } from "react";
import APIRequest from "../api/Request";

interface Course {
  _id: string;
  name: string;
}

interface UserAssignmentProps {
  onAuthorization: (authorized: boolean, message?: string) => void;
}

const UserAssignment = ({ onAuthorization }: UserAssignmentProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [currentCourse, setCurrentCourse] = useState("");

  useEffect(() => {
    fetch(
      APIRequest("/api/courses", {
        headers: { authorization: localStorage.getItem("token") || "" },
      })
    )
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        if (data && data.message) {
          onAuthorization(false, data.message);
          return;
        }
        onAuthorization(true);
        setCourses(data);
      })
      .catch((error) => console.error("Error fetching courses:", error));
  }, [onAuthorization]);

  const handleCourseChange = (event: SelectChangeEvent) => {
    setCurrentCourse(event.target.value as string);
  };

  return (
    <Grid container spacing={1} alignItems="center" justifyContent="center">
      <Grid item xs={8}>
        <FormControl sx={{ m: 1, minWidth: 120 }}>
          <InputLabel id="course-select-label">Course</InputLabel>
          <Select
            labelId="course-select-label"
            id="course-select"
            value={currentCourse}
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
    </Grid>
  );
};

export default UserAssignment;
