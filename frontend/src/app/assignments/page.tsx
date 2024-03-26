'use client';
import { useState, useEffect, useCallback, forwardRef } from 'react'
import { createTheme } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import PlayCircleFilledWhiteIcon from '@mui/icons-material/PlayCircleFilledWhite';
import Button from "@mui/material/Button";
import { Checkbox, ListItemSecondaryAction, Tooltip, Typography } from '@mui/material';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { createApiRequest } from '@lib/Request'
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import { useNotification } from '@lib/context/NotificationContext';

/* type Severity = "error" | "success" | "info" | "warning" | undefined;

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
}); 
*/
interface AssignmentOverviewProps {
};

type SubmissionType = {
  assignmentName: string,
  lastChanged: Date
}

const AssignmentsPage = (_props: AssignmentOverviewProps) => {

  const { showNotification } = useNotification();

  const [ assignments, setAssignments ] = useState([])
  const [ submittedAssignments, setSubmittedAssignments ] = useState([] as SubmissionType[])
  const [ deployedUserAssignments, setDeployedUserAssignments ] = useState([])
  const [ deployedGroupAssignments, setDeployedGroupAssignments ] = useState([])
  const [ load, setLoad ] = useState(true)
  /* const [ deploymentNotification, setDeploymentNotification ] = useState({ result: "", severity: undefined as Severity, open: false }) */
  const [ confirmationUndeployDialogOpen, setConfirmationUndeployDialogOpen ] = useState({ assignment: "", dialogOpen: false })
  const [ confirmationResubmitDialogOpen, setConfirmationResubmitDialogOpen ] = useState({ assignment: "", dialogOpen: false })
  const [ resubmitAssignment, setResubmitAssignment ] = useState("");

  const handleConfirmationUndeployDialogOpen = (selectedAssignment: string) => {
    setConfirmationUndeployDialogOpen({ assignment: selectedAssignment, dialogOpen: true });
  };

  const handleConfirmationUndeployDialogClose = () => {
    setConfirmationUndeployDialogOpen({ assignment: "", dialogOpen: false });
  };

  const handleConfirmationUndeployDialogConfirm = () => {
    deleteEnvironment(confirmationUndeployDialogOpen.assignment)
    setConfirmationUndeployDialogOpen({ assignment: "", dialogOpen: false });
  };

  const handleConfirmationResubmitDialogOpen = (selectedAssignment: string) => {
    setConfirmationResubmitDialogOpen({ assignment: selectedAssignment, dialogOpen: true });
  };

  const handleConfirmationResubmitDialogClose = () => {
    setConfirmationResubmitDialogOpen({ assignment: "", dialogOpen: false });
  };

  const handleConfirmationResubmitDialogConfirm = () => {
    setResubmitAssignment(confirmationResubmitDialogOpen.assignment);
    setConfirmationResubmitDialogOpen({ assignment: "", dialogOpen: false });
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
    fetch(createApiRequest("/api/user/assignments", { headers: { authorization: localStorage.getItem("token") || "" } }))
      .then(res => res.json())
      .then(setAssignments)

    const update = () => {
      fetch(createApiRequest("/api/environment/deployed-user-environments", { headers: { authorization: localStorage.getItem("token") || "" } }))
        .then(res => res.json())
        .then(setDeployedUserAssignments)
      fetch(createApiRequest("/api/environment/deployed-group-environments", { headers: { authorization: localStorage.getItem("token") || "" } }))
        .then(res => res.json())
        .then(setDeployedGroupAssignments)
      fetch(createApiRequest("/api/environment/submissions", { headers: { authorization: localStorage.getItem("token") || "" } }))
        .then(res => res.json())
        .then(setSubmittedAssignments)
    };
    update();
    setInterval(update, 2000);
  }, [ load ])

  const createEnvironment = useCallback(async (assignment: string) => {
    showNotification("Creating virtual environment... please wait...", "info");
    //setDeploymentNotification({ result: "Creating virtual environment... please wait...", severity: "info", open: true })
    try {
      const result = await fetch(createApiRequest(`/api/environment/create?environment=${assignment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" }
      }))
      if (result.status === 200) {
        showNotification("Deployment successful!", "success");
        //setDeploymentNotification({ result: "Deployment successful!", severity: "success", open: true })
        fetch(createApiRequest("/api/environment/deployed-user-environments", { headers: { authorization: localStorage.getItem("token") || "" } }))
          .then(res => res.json())
          .then(setDeployedUserAssignments)
        fetch(createApiRequest("/api/environment/deployed-group-environments", { headers: { authorization: localStorage.getItem("token") || "" } }))
          .then(res => res.json())
          .then(setDeployedGroupAssignments)
      } else {
        const message = await result.json()
        showNotification(`Deployment failed! (${message.message})`, "error");
        //setDeploymentNotification({ result: "Deployment failed! (" + message.message + ")", severity: "error", open: true })
      }
    }
    catch (error) {
      showNotification("Deployment error while connecting to backend!", "error");
      //setDeploymentNotification({ result: "Deployment error while connecting to backend!", severity: "error", open: true })
    }
  }, []);

  const deleteEnvironment = useCallback(async (assignment: string) => {
    showNotification("Deleting virtual environment... please wait...", "info");
    //setDeploymentNotification({ result: "Deleting virtual environment... please wait...", severity: "info", open: true })
    try {
      const result = await fetch(createApiRequest(`/api/environment/delete?environment=${assignment}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" }
      }))
      if (result.status === 200) {
        showNotification("Deployment deletion successful!", "success");
        //setDeploymentNotification({ result: "Deployment deletion successful!", severity: "success", open: true })
        fetch(createApiRequest("/api/environment/deployed-user-environments", { headers: { authorization: localStorage.getItem("token") || "" } }))
          .then(res => res.json())
          .then(setDeployedUserAssignments)
        fetch(createApiRequest("/api/environment/deployed-group-environments", { headers: { authorization: localStorage.getItem("token") || "" } }))
          .then(res => res.json())
          .then(setDeployedGroupAssignments)
      } else {
        const message = await result.json()
        showNotification(`Deployment deletion failed! (${message.message})`, "error");
        //setDeploymentNotification({ result: "Deployment deletion failed! (" + message.message + ")", severity: "error", open: true })
      }
    } catch (error) {
      showNotification("Deployment deletion error while connecting to backend!", "error");
      //setDeploymentNotification({ result: "Deployment deletion error while connecting to backend!", severity: "error", open: true })
    }
  }, []);

  const theme = createTheme();

  return (
    <div>
      {(deployedUserAssignments.length === 0 && deployedGroupAssignments.length > 0) &&
        <Typography>Your group is working on {deployedGroupAssignments[ 0 ]}. You can join and open a connection by clicking deploy.</Typography>
      }
      <List component="nav" aria-label="assignment list" style={{ width: 800 }}>
        {assignments.map(assignment => (
          <ListItem key={assignment}>
            <ListItemText primary={assignment} />
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
              <Button variant="contained" color="primary" startIcon={<CloudUploadIcon />} disabled={deployedUserAssignments.length > 0 || (deployedGroupAssignments.length > 0 && deployedGroupAssignments.indexOf(assignment) === -1) || (submittedAssignments.findIndex(element => element.assignmentName === assignment) !== -1 && resubmitAssignment !== assignment)} onClick={() => createEnvironment(assignment)} sx={{ margin: theme.spacing(1) }}>
                Deploy
              </Button>
              <Button variant="contained" color="secondary" startIcon={<PlayCircleFilledWhiteIcon />} disabled={!isActiveDeployment(assignment)} href={`/environment/${assignment}`} sx={{ margin: theme.spacing(1) }}>
                Start Assignment
              </Button>
              <Button variant="contained" color="primary" startIcon={<CloudOffIcon />} disabled={!isActiveDeployment(assignment)} onClick={() => handleConfirmationUndeployDialogOpen(assignment)} sx={{ margin: theme.spacing(1) }}>
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
        {/* <Snackbar open={deploymentNotification.open} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
          <Alert severity={deploymentNotification.severity as Severity}>
            {deploymentNotification.result}
          </Alert>
        </Snackbar> */}
        <Dialog
          open={confirmationUndeployDialogOpen.dialogOpen}
          onClose={handleConfirmationUndeployDialogClose}
          aria-describedby="alert-dialog-undeploy-confirmation-description"
        >
          <DialogContent>
            <DialogContentText id="alert-dialog-undeploy-confirmation-description">
              Undeploy environment?<br />
              All processes and unsubmitted changes will be lost.<br />
              {deployedGroupAssignments.length > 0 ?
                'Other users still using the environment ' +
                'will also be disconnected.' : ''
              }
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
          aria-describedby="alert-dialog-resubmit-confirmation-description"
        >
          <DialogContent>
            <DialogContentText id="alert-dialog-resubmit-confirmation-description">
              You or your group already submitted a result for this assignment.<br />
              Do you really want to deploy this assignment again?
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
    </div>
  );
}

export default AssignmentsPage