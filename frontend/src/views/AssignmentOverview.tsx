import React, { useState, useEffect, useCallback } from 'react'
import { makeStyles } from '@material-ui/core/styles';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CloudOffIcon from '@material-ui/icons/CloudOff';
import PlayCircleFilledWhiteIcon from '@material-ui/icons/PlayCircleFilledWhite';
import Button from "@material-ui/core/Button";
import { Checkbox, ListItemSecondaryAction, Tooltip, Typography } from '@material-ui/core';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert, { AlertProps } from '@material-ui/lab/Alert';
import APIRequest from '../api/Request'
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';

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

type SubmissionType = {
  assignmentName: string,
  lastChanged: Date
}

export default function AssignmentOverview(props: AssignmentOverviewProps) {
  const classes = useStyles();
  const [assignments, setAssignments] = useState([])
  const [submittedAssignments, setSubmittedAssignments] = useState([] as SubmissionType[])
  const [deployedUserAssignments, setDeployedUserAssignments] = useState([])
  const [deployedGroupAssignments, setDeployedGroupAssignments] = useState([])
  const [load, setLoad] = useState(true)
  const [deploymentNotification, setDeploymentNotification] = useState({ result: "", severity: undefined as Severity, open: false })
  const [confirmationUndeployDialogOpen, setConfirmationUndeployDialogOpen] = useState({ assignment: "", dialogOpen: false})
  const [confirmationResubmitDialogOpen, setConfirmationResubmitDialogOpen] = useState({ assignment: "", dialogOpen: false})
  const [resubmitAssignment, setResubmitAssignment] = useState("");

  const handleConfirmationUndeployDialogOpen = (selectedAssignment: string) => {
    setConfirmationUndeployDialogOpen({ assignment: selectedAssignment, dialogOpen: true });
  };

  const handleConfirmationUndeployDialogClose = () => {
    setConfirmationUndeployDialogOpen({ assignment: "", dialogOpen: false});
  };

  const handleConfirmationUndeployDialogConfirm = () => {
    deleteEnvironment(confirmationUndeployDialogOpen.assignment)
    setConfirmationUndeployDialogOpen({ assignment: "", dialogOpen: false});
  };

  const handleConfirmationResubmitDialogOpen = (selectedAssignment: string) => {
    setConfirmationResubmitDialogOpen({ assignment: selectedAssignment, dialogOpen: true });
  };

  const handleConfirmationResubmitDialogClose = () => {
    setConfirmationResubmitDialogOpen({ assignment: "", dialogOpen: false});
  };

  const handleConfirmationResubmitDialogConfirm = () => {
    setResubmitAssignment(confirmationResubmitDialogOpen.assignment);
    setConfirmationResubmitDialogOpen({ assignment: "", dialogOpen: false});
  };

  const isActiveDeployment = (assignment: string) => {
    return Array.from(deployedUserAssignments).some(element => element === assignment)
  };

  const showSubmissionStatus = (assignment: string) => {
    const submission = submittedAssignments.find(element => element.assignmentName === assignment)
    if (submission !== undefined) {
      return "Finished. Last successful submission: " + submission.lastChanged.toLocaleString('de-DE')
    } else {
      return ""
    }
  };

  useEffect(() => {
    setLoad(false)
    fetch(APIRequest("/api/user/assignments", { headers: { authorization: localStorage.getItem("token") || "" } }))
      .then(res => res.json())
      .then(setAssignments)
    fetch(APIRequest("/api/environment/deployed-user-environments", { headers: { authorization: localStorage.getItem("token") || "" } }))
      .then(res => res.json())
      .then(setDeployedUserAssignments)
    fetch(APIRequest("/api/environment/deployed-group-environments", { headers: { authorization: localStorage.getItem("token") || "" } }))
      .then(res => res.json())
      .then(setDeployedGroupAssignments)
    fetch(APIRequest("/api/environment/submissions", { headers: { authorization: localStorage.getItem("token") || "" } }))
      .then(res => res.json())
      .then(setSubmittedAssignments)
  }, [load])

  const createEnvironment = useCallback(async (assignment: string) => {
    setDeploymentNotification({ result: "Creating virtual environment... please wait...", severity: "info", open: true })
    try {
      const result = await fetch(APIRequest(`/api/environment/create?environment=${assignment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" }
      }))
      if (result.status === 200) {
        setDeploymentNotification({ result: "Deployment successful!", severity: "success", open: true })
        fetch(APIRequest("/api/environment/deployed-user-environments", { headers: { authorization: localStorage.getItem("token") || "" } }))
          .then(res => res.json())
          .then(setDeployedUserAssignments)
        fetch(APIRequest("/api/environment/deployed-group-environments", { headers: { authorization: localStorage.getItem("token") || "" } }))
          .then(res => res.json())
          .then(setDeployedGroupAssignments)
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
    setDeploymentNotification({ result: "Deleting virtual environment... please wait...", severity: "info", open: true })
    try {
      const result = await fetch(APIRequest(`/api/environment/delete?environment=${assignment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" }
      }))
      if (result.status === 200) {
        setDeploymentNotification({ result: "Deployment deletion successful!", severity: "success", open: true })
        fetch(APIRequest("/api/environment/deployed-user-environments", { headers: { authorization: localStorage.getItem("token") || "" } }))
          .then(res => res.json())
          .then(setDeployedUserAssignments)
        fetch(APIRequest("/api/environment/deployed-group-environments", { headers: { authorization: localStorage.getItem("token") || "" } }))
          .then(res => res.json())
          .then(setDeployedGroupAssignments)
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
    <>
      { (deployedUserAssignments.length === 0 && deployedGroupAssignments.length > 0) &&
        <Typography>Your group is working on {deployedGroupAssignments[0]}. You can join and open a connection by clicking deploy.</Typography>
      }
      <List component="nav" aria-label="assignment list" style={{ width: 800 }}>
        {assignments.map(assignment => (
            <ListItem key={assignment}>
            <ListItemText primary={assignment}/>
            {/*
            <ListItemText primary={assignment} secondary={showDescirption(assignment)}/>

            maybe wrap all together in an assignment interface containing all information from: 

              const [assignments, setAssignments] = useState([])
              const [submittedAssignments, setSubmittedAssignments] = useState([] as SubmissionType[])
              const [deployedUserAssignments, setDeployedUserAssignments] = useState([])
              const [deployedGroupAssignments, setDeployedGroupAssignments] = useState([])

            and therefore also reducing number of backend fetches in useEffect

            maybe also allow resubmission? (e.g., by unticking submission state checkbox?)
            */}
            <ListItemSecondaryAction>
              <Button variant="contained" color="primary" className={classes.button} startIcon={<CloudUploadIcon />} disabled={deployedUserAssignments.length > 0 || (deployedGroupAssignments.length > 0 && deployedGroupAssignments.indexOf(assignment) === -1) || (submittedAssignments.findIndex(element => element.assignmentName === assignment) !== -1 && resubmitAssignment !== assignment)} onClick={() => createEnvironment(assignment)}>
                Deploy
              </Button>
              <Button variant="contained" color="secondary" className={classes.button} startIcon={<PlayCircleFilledWhiteIcon />} disabled={!isActiveDeployment(assignment)} href={`/environment/${assignment}`}>
                Start Assignment
              </Button>
              <Button variant="contained" color="primary" className={classes.button} startIcon={<CloudOffIcon />} disabled={!isActiveDeployment(assignment)} onClick={() => handleConfirmationUndeployDialogOpen(assignment)}>
                Undeploy
              </Button>
              <Tooltip title={showSubmissionStatus(assignment)}>
                <Checkbox
                  edge="end"
                  checked={submittedAssignments.findIndex(element => element.assignmentName === assignment) !== -1}
                  disabled={submittedAssignments.findIndex(element => element.assignmentName === assignment) === -1}
                  color="primary"
                  onClick={() => handleConfirmationResubmitDialogOpen(assignment)}
                />
              </Tooltip>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        <Snackbar open={deploymentNotification.open} anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}>
          <Alert severity={deploymentNotification.severity as Severity}>
            {deploymentNotification.result}
          </Alert>
        </Snackbar>
        <Dialog
          open={confirmationUndeployDialogOpen.dialogOpen}
          onClose={handleConfirmationUndeployDialogClose}
          aria-describedby="alert-dialog-undeploy-confirmation-description"
        >
          <DialogContent>
            <DialogContentText id="alert-dialog-undeploy-confirmation-description">
              <p>Undeploy environment?</p>
              <p>All processes and unsubmitted changes will lost.</p>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirmationUndeployDialogClose} color="primary" autoFocus>
              No
            </Button>
            <Button onClick={handleConfirmationUndeployDialogConfirm} color="primary">
              Yes
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={confirmationResubmitDialogOpen.dialogOpen}
          onClose={handleConfirmationResubmitDialogClose}
          aria-describedby="alert-dialog-undeploy-confirmation-description"
        >
          <DialogContent>
            <DialogContentText id="alert-dialog-undeploy-confirmation-description">
              <p>You or your group already submitted a result for this assignment.</p>
              <p>Do you really want to deploy this assignment again?</p>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirmationResubmitDialogClose} color="primary" autoFocus>
              No
            </Button>
            <Button onClick={handleConfirmationResubmitDialogConfirm} color="primary">
              Yes
            </Button>
          </DialogActions>
        </Dialog>
      </List>
    </>
  );
}