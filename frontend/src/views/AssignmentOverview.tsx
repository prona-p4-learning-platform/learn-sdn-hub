import React, { useState, useEffect, useCallback } from 'react'
import { makeStyles } from '@material-ui/core/styles';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CloudOffIcon from '@material-ui/icons/CloudOff';
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
  const [assignments, setAssignments] = useState([])
  const [deployedAssignments, setDeployedAssignments] = useState([])
  const [submittedAssignments, setSubmittedAssignments] = useState(new Map<string, string | Date>())
  const [load, setLoad] = useState(true)
  const [deploymentNotification, setDeploymentNotification] = useState({ result: "", severity: "info" as Severity, open: false })

  const handleDeploymentNotificationClose = () => {
    setDeploymentNotification({ result: "", severity: "info", open: false });
  };

  const isActiveDeployment = (assignment: string) => {
    return Array.from(deployedAssignments).some(element => element === assignment)
  }

  useEffect(() => {
    setLoad(false)
    fetch(APIRequest("/api/user/assignments", { headers: { authorization: localStorage.getItem("token") || "" } }))
      .then(res => res.json())
      .then(setAssignments)
    fetch(APIRequest("/api/environment/active", { headers: { authorization: localStorage.getItem("token") || "" } }))
      .then(res => res.json())
      .then(setDeployedAssignments)
    fetch(APIRequest("/api/environment/submissions", { headers: { authorization: localStorage.getItem("token") || "" } }))
      .then(res => res.json())
      .then(setSubmittedAssignments)
  }, [load])

  const createEnvironment = useCallback(async (assignment: string) => {
    setDeploymentNotification({ result: "Starting deployment...", severity: "info", open: true })
    try {
      const result = await fetch(APIRequest(`/api/environment/create?environment=${assignment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" }
      }))
      if (result.status === 200) {
        setDeploymentNotification({ result: "Deployment successful!", severity: "success", open: true })
        fetch(APIRequest("/api/environment/active", { headers: { authorization: localStorage.getItem("token") || "" } }))
          .then(res => res.json())
          .then(setDeployedAssignments)
      } else {
        const message = await result.json()
        setDeploymentNotification({ result: "Deployment failed! (" + message.message + ")", severity: "error", open: true })
      }
    }
    catch (error) {
      setDeploymentNotification({ result: "Deployment error while connecting to backend!", severity: "error", open: true })
    }
  }, []);

  const deleteEnvironment = useCallback(async (assignment: string) => {
    setDeploymentNotification({ result: "Deleting deployment...", severity: "info", open: true })
    try {
      const result = await fetch(APIRequest(`/api/environment/delete?environment=${assignment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" }
      }))
      if (result.status === 200) {
        setDeploymentNotification({ result: "Deployment deletion successful!", severity: "success", open: true })
        fetch(APIRequest("/api/environment/active", { headers: { authorization: localStorage.getItem("token") || "" } }))
          .then(res => res.json())
          .then(setDeployedAssignments)
      } else {
        const message = await result.json()
        setDeploymentNotification({ result: "Deployment deletion failed! (" + message.message + ")", severity: "error", open: true })
      }
    }
    catch (error) {
      setDeploymentNotification({ result: "Deployment deletion error while connecting to backend!", severity: "error", open: true })
    }
  }, []);


  return (
    <List component="nav" aria-label="assignment list" style={{ width: 800 }}>
      {assignments.map(assignment => (
        <ListItem key={assignment}>
          <ListItemText primary={assignment} />
          <ListItemSecondaryAction>
            {/* Maybe we need to add an option that allows only one active deployment, e.g., mininet on the same host can only run once anyway? Frontend solution would be to disable all Deploy buttons, 
                as soon as an environment was create:

                <Button variant="contained" color="primary" className={classes.button} startIcon={<CloudUploadIcon />} disabled={Array.from(deployedAssignments).length > 0} onClick={() => createEnvironment(assignment)}>
                  Deploy
                    </Button>
            */}
            {/*
            <ListItemText primary={submittedAssignments.get(assignment)} />
            */}
            <Button variant="contained" color="primary" className={classes.button} startIcon={<CloudUploadIcon />} disabled={isActiveDeployment(assignment)} onClick={() => createEnvironment(assignment)}>
              Deploy
            </Button>
            <Button variant="contained" color="secondary" className={classes.button} startIcon={<PlayCircleFilledWhiteIcon />} disabled={!isActiveDeployment(assignment)} href={`/environment/${assignment}`}>
              Start Assignment
            </Button>
            <Button variant="contained" color="primary" className={classes.button} startIcon={<CloudOffIcon />} disabled={!isActiveDeployment(assignment)} onClick={() => deleteEnvironment(assignment)}>
              Undeploy
            </Button>
          </ListItemSecondaryAction>
        </ListItem>
      ))}
      <Snackbar open={deploymentNotification.open} autoHideDuration={6000} onClose={handleDeploymentNotificationClose}>
        <Alert onClose={handleDeploymentNotificationClose} severity={deploymentNotification.severity as Severity}>
          {deploymentNotification.result}
        </Alert>
      </Snackbar>
    </List>
  );
}