import React, { useState, useEffect, useCallback } from 'react'
import Button from "@material-ui/core/Button";
import { Link } from 'react-router-dom';

const hostname = process.env.REACT_APP_API_HOST || ''

interface AssignmentOverviewProps {
};

export default function AssignmentOverview(props: AssignmentOverviewProps) {
  const [ assignments, setAssignments ] = useState([])
  const [load, setLoad] = useState(true)

  useEffect(() => {
    setLoad(false)
    fetch(hostname+"/api/user/assignments", {   headers:{  authorization: localStorage.getItem("token") || ""}})
      .then(res => res.json())
      .then(setAssignments)
  },[load])

  const createEnvironment = useCallback(async (assignment: string) => {
    const result = await fetch(`${hostname}/api/environment/create?environment=${assignment}`, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json', authorization: localStorage.getItem("token") || ""} 
    })
    
  },[]);


    return (<>
        <ul>
          {assignments.map(assignment => 
          <li>
            {assignment}
            <Button variant="contained" color="primary" onClick={() => createEnvironment(assignment)}>
              Deploy
            </Button>
            <Link to={`/environment/${assignment}`}>Start Assignment</Link>
          </li>)}
        </ul>
    </>
    
    );
  }