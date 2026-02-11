import { useState, useCallback, ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  List,
  Typography
} from "@mui/material";
import { useSnackbar } from "notistack";
import { FetchError } from "ofetch";
import { z } from "zod";

import { APIRequest, getHttpError } from "../api/Request";
import K8sAssignments from "../components/assignments/K8sAssignments";
import VClusterAssignments from "../components/assignments/VClusterAssignments";
import NormalAssignment from "../components/assignments/NormalAssignment";
import { useAssignmentsData, useEnvironmentStatus } from "../hooks";

export interface SubmissionType {
  assignmentName: string;
  lastChanged: Date;
  points?: number;
}

const EnvironmentSchema = z.enum(["normal", "k8s", "k8s-vcluster"]);
export type AssignmentsResponse = z.infer<typeof assignmentsValidator>;

const assignmentsValidator = z.array(
  z.object({
    name: z.string(),
    type: EnvironmentSchema
  })
);

const defaultValidator = z.object({});

function Assignments(): JSX.Element {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const status = useEnvironmentStatus()
  const {assignments, points} = useAssignmentsData()

  const [undeployDialog, setUndeployDialog] = useState<{ open: boolean; assignment: string }>({ open: false, assignment: "" })
  const [resubmitDialog, setResubmitDialog] = useState<{ open: boolean; assignment: string }>({ open: false, assignment: "" })


  const createEnvironment = useCallback(
    async (assignment: string) => {
      const creatingSnack = enqueueSnackbar("Creating virtual environment...", {
        variant: "info",
        persist: true,
      });

      try {
        await APIRequest("/environment/create", defaultValidator, {
          method: "POST",
          query: {
            environment: assignment,
          },
          timeout: 300000, // 5 minutes timeout, e.g., proxmox and OpenStack take some time for cloning and startup
        });

        enqueueSnackbar("Deployment successful!", { variant: "success" });
        //updateDeployedEnvironments();
      } catch (error) {
        if (error instanceof FetchError) {
          const httpError = await getHttpError(error);
          const message = httpError.success
            ? httpError.data.message
            : httpError.error.message;

          enqueueSnackbar("Deployment failed! (" + message + ")", {
            variant: "error",
          });
        } else {
          enqueueSnackbar("Deployment error while connecting to backend!", {
            variant: "error",
          });
        }
      }

      closeSnackbar(creatingSnack);
    },
    [enqueueSnackbar, closeSnackbar],
  );

  const deleteEnvironment = useCallback(
    async (assignment: string) => {
      const deletingSnack = enqueueSnackbar("Deleting virtual environment...", {
        variant: "info",
        persist: true,
      });

      try {
        await APIRequest("/environment/delete", defaultValidator, {
          method: "POST",
          query: {
            environment: assignment,
          },
          timeout: 300000, // 5 minutes seconds timeout, e.g., proxmox and OpenStack take some time to delete instances
        });

        enqueueSnackbar("Deployment deletion successful!", {
          variant: "success",
        });
        //updateDeployedEnvironments();
      } catch (error) {
        if (error instanceof FetchError) {
          const httpError = await getHttpError(error);
          const message = httpError.success
            ? httpError.data.message
            : httpError.error.message;

          enqueueSnackbar("Deployment deletion failed! (" + message + ")", {
            variant: "error",
          });
        } else {
          enqueueSnackbar(
            "Deployment deletion error while connecting to backend!",
            {
              variant: "error",
            },
          );
        }
      }

      closeSnackbar(deletingSnack);
    },
    [enqueueSnackbar, closeSnackbar],
  );

  const contextData = {
    deployedUser: status.deployedUser,
    deployedGroup: status.deployedGroup,
    submissions: status.submissions,
    pointLimits: points
  }

  const defaultActions = {
    deploy: createEnvironment,
    undeploy: (name: string) => setUndeployDialog({open: true, assignment: name}),
    resubmit: (name: string) => setResubmitDialog({open: true, assignment: name})
  }

  function renderAssignments():ReactNode {
    return (
      <>
        <NormalAssignment
          assignments={assignments.filter(item => item.type === "normal")}
          contextData={contextData}
          actions={defaultActions}  
        />
        <K8sAssignments
          assignments={assignments.filter(item => item.type === "k8s")}
          contextData={contextData}
          actions={defaultActions} 
        />
        <VClusterAssignments
          assignments={assignments.filter(item => item.type === "k8s-vcluster")}
          contextData={contextData}
          actions={defaultActions} 
        />
      </>
    )
  }

  function handleConfirmationUndeployDialogClose() {
    setUndeployDialog({...undeployDialog, open: false})
  }

  function handleConfirmationUndeployDialogConfirm() {
    deleteEnvironment(undeployDialog.assignment)
    setUndeployDialog({assignment: "", open: false})
  }

  function handleConfirmationResubmitDialogClose() {
    setResubmitDialog({...resubmitDialog, open: false})
  }

  function handleConfirmationResubmitDialogConfirm() {
    setResubmitDialog({assignment: "", open: false})
  }

  return (
    <div>
      {status.deployedUser.length === 0 && status.deployedGroup.length > 0 && (
        <Typography>
          You or your group members are working on{" "}
          {status.deployedGroup[0]}. You can join and open a connection by
          clicking deploy.
        </Typography>
      )}
      <List component="nav" aria-label="assignment list" style={{ width: 940 }}>
        {renderAssignments()}
        <Dialog
          open={undeployDialog.open}
          onClose={handleConfirmationUndeployDialogClose}
          aria-describedby="alert-dialog-undeploy-confirmation-description"
        >
          <DialogContent>
            <DialogContentText id="alert-dialog-undeploy-confirmation-description">
              Undeploy environment?
              <br />
              All processes and unsubmitted changes will be lost.
              <br />
              {status.deployedGroup.length > 0
                ? "Other users still using the environment " +
                  "will also be disconnected."
                : ""}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleConfirmationUndeployDialogClose}
              color="primary"
              autoFocus
            >
              No
            </Button>
            <Button
              onClick={handleConfirmationUndeployDialogConfirm}
              color="primary"
            >
              Yes
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={resubmitDialog.open}
          onClose={handleConfirmationResubmitDialogClose}
          aria-describedby="alert-dialog-resubmit-confirmation-description"
        >
          <DialogContent>
            <DialogContentText id="alert-dialog-resubmit-confirmation-description">
              You or your group already submitted a result for this assignment.
              <br />
              Do you really want to deploy this assignment again?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleConfirmationResubmitDialogClose}
              color="primary"
              autoFocus
            >
              No
            </Button>
            <Button
              onClick={handleConfirmationResubmitDialogConfirm}
              color="primary"
            >
              Yes
            </Button>
          </DialogActions>
        </Dialog>
      </List>
    </div>
  );
}

export const Component = Assignments;
export default Assignments;
