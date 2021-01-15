import React, { useState, useEffect, useCallback } from 'react'
import { makeStyles } from '@material-ui/core/styles';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import PlayCircleFilledWhiteIcon from '@material-ui/icons/PlayCircleFilledWhite';
import Button from "@material-ui/core/Button";
import { ListItemSecondaryAction } from '@material-ui/core';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert, { AlertProps } from '@material-ui/lab/Alert';
import APIRequest from '../api/Request'

type Severity = "error" | "success" | "info" | "warning" | undefined;

function Alert(props: JSX.IntrinsicAttributes & AlertProps) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const useStyles = makeStyles((theme) => ({
  button: {
    margin: theme.spacing(1),
  },
}));

interface AssignmentOverviewProps {
};

export default function AssignmentOverview(props: AssignmentOverviewProps) {
  const classes = useStyles();
  const [ assignments, setAssignments ] = useState([])
  const [ deployedAssignment, setDeployedAssignment ] = useState("")
  const [load, setLoad] = useState(true)  
  const [deploymentNotificationOpen, setDeploymentNotificationOpen] = React.useState(false);

  useEffect(() => {
    setLoad(false)
    fetch(APIRequest("/api/user/assignments", {   headers:{  authorization: localStorage.getItem("token") || ""}}))
      .then(res => res.json())
      .then(setAssignments)
  },[load])

  const createEnvironment = useCallback(async (assignment: string) => {
    const result = await fetch(APIRequest(`/api/environment/create?environment=${assignment}`, {
      method: 'POST', 
      headers: {'Content-Type': 'application/json', authorization: localStorage.getItem("token") || ""} 
    }))
    if (result.status === 200){
      setDeploymentResult("Deployment successful!")
      setDeploymentSeverity("success")
      setDeploymentNotificationOpen(true)
      setDeployedAssignment(assignment)
    } else {
      const a = await result.json()
      setDeploymentResult("Deployment failed! (" + a.message + ")")
      setDeploymentSeverity("error")
      setDeploymentNotificationOpen(true)
    }
  },[]);

  const [deploymentResult , setDeploymentResult] = useState("")
  const [deploymentSeverity , setDeploymentSeverity] = useState("error")

  const handleDeploymentNotificationClose = () => {
    setDeploymentNotificationOpen(false);
  };

    return (
        <List component="nav" aria-label="assignment list" style={{width: 800}}>
          {assignments.map(assignment => (
            <>
              <ListItem>
                <ListItemText primary={assignment} />
                <ListItemSecondaryAction>
                  <Button variant="contained" color="primary" className={classes.button} startIcon={<CloudUploadIcon />} onClick={() => createEnvironment(assignment)}>
                    Deploy
                  </Button>
                  <Button variant="contained" color="secondary" className={classes.button} startIcon={<PlayCircleFilledWhiteIcon />} disabled={assignment !== deployedAssignment} href={`/environment/${assignment}`}>
                    Start Assignment
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            </>
          ))}
          <Snackbar open={deploymentNotificationOpen} autoHideDuration={6000} onClose={handleDeploymentNotificationClose}>
          <Alert onClose={handleDeploymentNotificationClose} severity={deploymentSeverity as Severity}>
            {deploymentResult}
          </Alert>
          </Snackbar>
        </List>
);
  }