import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createTheme } from "@mui/material/styles";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Typography,
  Menu,
  MenuItem
} from "@mui/material";
import { useSnackbar } from "notistack";
import { FetchError } from "ofetch";
import { z } from "zod";

import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import PlayCircleFilledWhiteIcon from "@mui/icons-material/PlayCircleFilledWhite";

import { APIRequest, getHttpError } from "../api/Request";

interface PointLimits {
  [assignment: string]: number | undefined;
}

interface SubmissionType {
  assignmentName: string;
  lastChanged: Date;
  points?: number;
}

const assignmentsValidator = z.array(z.string());
const pointsValidator = z.record(z.number());
const deployedUserEnvsValidator = z.array(z.string());
const deployedGroupEnvsValidator = z.array(z.string());
const submissionsValidator = z.array(
  z.object({
    assignmentName: z.string().min(1),
    lastChanged: z.string().transform((value) => {
      return new Date(value);
    }),
    points: z.number().optional(),
  }),
);
const defaultValidator = z.object({});

function Assignments(): JSX.Element {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const [assignments, setAssignments] = useState<string[]>([]);
  const [submittedAssignments, setSubmittedAssignments] = useState<
    SubmissionType[]
  >([]);
  const [deployedUserAssignments, setDeployedUserAssignments] = useState<
    string[]
  >([]);
  const [deployedGroupAssignments, setDeployedGroupAssignments] = useState<
    string[]
  >([]);
  const [pointLimits, setPointLimits] = useState<PointLimits>({});
  const [confirmationUndeployDialogOpen, setConfirmationUndeployDialogOpen] =
    useState({ assignment: "", dialogOpen: false });
  const [confirmationResubmitDialogOpen, setConfirmationResubmitDialogOpen] =
    useState({ assignment: "", dialogOpen: false });
  const [resubmitAssignment, setResubmitAssignment] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleK8sClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleK8sClose = () => {
    setAnchorEl(null);
  };

  const handleConfirmationUndeployDialogOpen = (selectedAssignment: string) => {
    setConfirmationUndeployDialogOpen({
      assignment: selectedAssignment,
      dialogOpen: true,
    });
  };

  const handleConfirmationUndeployDialogClose = () => {
    setConfirmationUndeployDialogOpen({ assignment: "", dialogOpen: false });
  };

  const handleConfirmationUndeployDialogConfirm = () => {
    void deleteEnvironment(confirmationUndeployDialogOpen.assignment);
    setConfirmationUndeployDialogOpen({ assignment: "", dialogOpen: false });
  };

  const handleConfirmationResubmitDialogOpen = (selectedAssignment: string) => {
    setConfirmationResubmitDialogOpen({
      assignment: selectedAssignment,
      dialogOpen: true,
    });
  };

  const handleConfirmationResubmitDialogClose = () => {
    setConfirmationResubmitDialogOpen({ assignment: "", dialogOpen: false });
  };

  const handleConfirmationResubmitDialogConfirm = () => {
    setResubmitAssignment(confirmationResubmitDialogOpen.assignment);
    setConfirmationResubmitDialogOpen({ assignment: "", dialogOpen: false });
  };

  const isActiveDeployment = (assignment: string) => {
    return Array.from(deployedUserAssignments).some(
      (element) => element === assignment,
    );
  };

  const showSubmissionStatus = (assignment: string) => {
    const submission = submittedAssignments.find(
      (element) => element.assignmentName === assignment,
    );
    if (submission !== undefined) {
      return (
        "Finished. Last successful submission: " +
        submission.lastChanged.toLocaleString("de-DE")
      );
    } else {
      return "";
    }
  };

  const showPointsTooltip = (assignment: string) => {
    const submission = submittedAssignments.find(
      (element) => element.assignmentName === assignment,
    );
    if (submission !== undefined && submission.points) {
      return (
        "You have earned " +
        submission.points +
        " out of " +
        pointLimits[assignment] +
        " bonus points."
      );
    } else if (submission !== undefined && !submission.points) {
      return "The submission was not graded yet.";
    } else if (
      pointLimits[assignment] !== undefined &&
      pointLimits[assignment] !== 0
    ) {
      return "You can earn bonus points by submitting this assignment!";
    } else {
      return "No bonus points available for this assignment.";
    }
  };

  // regularly fetch assignments and environments as users might work
  // in groups - an environment could be started from a different user
  useEffect(() => {
    APIRequest("/user/assignments", assignmentsValidator)
      .then((payload) => {
        if (payload.success) {
          setAssignments(payload.data);
        } else throw payload.error;
      })
      .catch(() => {
        console.log("Fetching assignments failed...");
      });

    APIRequest("/user/point-limits", pointsValidator)
      .then((payload) => {
        if (payload.success) {
          setPointLimits(payload.data);
        } else throw payload.error;
      })
      .catch(() => {
        console.log("Fetching point limits failed...");
      });

    const update = () => {
      APIRequest(
        "/environment/deployed-user-environments",
        deployedUserEnvsValidator,
      )
        .then((payload) => {
          if (payload.success) {
            setDeployedUserAssignments(payload.data);
          } else throw payload.error;
        })
        .catch(() => {
          console.log("Fetching deployed user environments failed...");
        });

      APIRequest(
        "/environment/deployed-group-environments",
        deployedGroupEnvsValidator,
      )
        .then((payload) => {
          if (payload.success) {
            setDeployedGroupAssignments(payload.data);
          } else throw payload.error;
        })
        .catch(() => {
          console.log("Fetching deployed group environments failed...");
        });

      APIRequest("/environment/submissions", submissionsValidator)
        .then((payload) => {
          if (payload.success) {
            setSubmittedAssignments(payload.data);
          } else throw payload.error;
        })
        .catch(() => {
          console.log("Fetching submissions failed...");
        });
    };

    update();

    const polling = setInterval(update, 2000);

    return () => {
      clearInterval(polling);
    };
  }, []);

  const updateDeployedEnvironments = useCallback(() => {
    APIRequest(
      "/environment/deployed-user-environments",
      deployedUserEnvsValidator,
    )
      .then((payload) => {
        if (payload.success) {
          setDeployedUserAssignments(payload.data);
        } else throw payload.error;
      })
      .catch(() => {
        console.log("Fetching deployed user environments failed...");
      });

    APIRequest(
      "/environment/deployed-group-environments",
      deployedGroupEnvsValidator,
    )
      .then((payload) => {
        if (payload.success) {
          setDeployedGroupAssignments(payload.data);
        } else throw payload.error;
      })
      .catch(() => {
        console.log("Fetching deployed group environments failed...");
      });
  }, []);

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
        updateDeployedEnvironments();
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
    [updateDeployedEnvironments, enqueueSnackbar, closeSnackbar],
  );

  const setupK8S = useCallback(
    async () => {
      const creatingSnack = enqueueSnackbar("Setting up Kubernetes configuration...", {
        variant: "info",
        persist: true,
      });

      try {
        await APIRequest("/k8s/setup", defaultValidator, {
          method: "POST",
          timeout: 30000, // 30 seconds timeout
        });

        enqueueSnackbar("Kubernetes configuration setup successful!", { variant: "success" });
      } catch (error) {
        if (error instanceof FetchError) {
          const httpError = await getHttpError(error);
          const message = httpError.success
            ? httpError.data.message
            : httpError.error.message;

          enqueueSnackbar("Kubernetes configuration setup failed! (" + message + ")", {
            variant: "error",
          });
        } else {
          enqueueSnackbar("Kubernetes cluster setup error while connecting to backend!", {
            variant: "error",
          });
        }
      }

      closeSnackbar(creatingSnack);
    },
    [enqueueSnackbar, closeSnackbar]
  )

  const undeployK8S = useCallback(
    async () => {
      const creatingSnack = enqueueSnackbar("Undeploying Kubernetes configuration...", {
        variant: "info",
        persist: true,
      });

      try {
        await APIRequest("/k8s/undeploy", defaultValidator, {
          method: "DELETE",
          timeout: 30000, // 30 seconds timeout
        });

        enqueueSnackbar("Kubernetes configuration undeploy successful!", { variant: "success" });
      } catch (error) {
        if (error instanceof FetchError) {
          const httpError = await getHttpError(error);
          const message = httpError.success
            ? httpError.data.message
            : httpError.error.message;

          enqueueSnackbar("Kubernetes configuration undeploy failed! (" + message + ")", {
            variant: "error",
          });
        } else {
          enqueueSnackbar("Kubernetes cluster undeploy error while connecting to backend!", {
            variant: "error",
          });
        }
      }

      closeSnackbar(creatingSnack);
    },
    [enqueueSnackbar, closeSnackbar]
  )

  const downloadKubeconfig = useCallback(
    async () => {
      const creatingSnack = enqueueSnackbar("Downloading Kubernetes configuration...", {
        variant: "info",
        persist: true,
      });

      try {
        const response = await APIRequest("/k8s/download-kubeconfig", defaultValidator, {
          method: "GET",
          timeout: 30000, // 30 seconds timeout
        });

        // Download kubeconfig file
        const yamlContent = response.rawBody;
        const blob = new Blob([yamlContent], { type: "text/yaml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "kubeconfig.yaml";
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Store kubeconfig in local storage
        localStorage.setItem("kubeconfig", yamlContent);

        enqueueSnackbar("Kubernetes configuration download successful!", { variant: "success" });
      } catch (error) {
        if (error instanceof FetchError) {
          const httpError = await getHttpError(error);
          const message = httpError.success
            ? httpError.data.message
            : httpError.error.message;

          enqueueSnackbar("Kubernetes configuration download failed! (" + message + ")", {
            variant: "error",
          });
        } else {
          enqueueSnackbar("Kubernetes configuration download error while connecting to backend!", {
            variant: "error",
          });
        }
      }

      closeSnackbar(creatingSnack);
    },
    [enqueueSnackbar, closeSnackbar]
  )

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
        updateDeployedEnvironments();
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
    [updateDeployedEnvironments, enqueueSnackbar, closeSnackbar],
  );

  const theme = createTheme();
  const navigate = useNavigate();

  return (
    <div>
      {deployedUserAssignments.length === 0 &&
        deployedGroupAssignments.length > 0 && (
          <Typography>
            You or your group members are working on {deployedGroupAssignments[0]}. You can join
            and open a connection by clicking deploy.
          </Typography>
        )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', m: 2, mb: 0 }}>
        <Button variant="contained" color="inherit" onClick={handleK8sClick}>Kubernetes</Button>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleK8sClose}>
        <MenuItem onClick={() => {void setupK8S(); }}>
          Setup
        </MenuItem>
        <MenuItem onClick={() => {void undeployK8S(); }}>
          Undeploy
        </MenuItem>
        <MenuItem onClick={() => {void downloadKubeconfig(); }}>
          Download <code>.kubeconfig</code>
        </MenuItem>
        </Menu>
      </Box>

      <List component="nav" aria-label="assignment list" style={{ width: 940 }}>
        {assignments.map((assignment) => (
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
              <Button
                variant="contained"
                color="primary"
                startIcon={<CloudUploadIcon />}
                disabled={
                  deployedUserAssignments.length > 0 ||
                  (deployedGroupAssignments.length > 0 &&
                    !deployedGroupAssignments.includes(assignment)) ||
                  (submittedAssignments.findIndex(
                    (element) => element.assignmentName === assignment,
                  ) !== -1 &&
                    resubmitAssignment !== assignment)
                }
                onClick={() => {
                  void createEnvironment(assignment);
                }}
                sx={{ margin: theme.spacing(1) }}
              >
                Deploy
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<PlayCircleFilledWhiteIcon />}
                disabled={!isActiveDeployment(assignment)}
                onClick={() => {
                  navigate(`/environment/${assignment}`);
                }}
                sx={{ margin: theme.spacing(1) }}
              >
                Start Assignment
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<CloudOffIcon />}
                disabled={!isActiveDeployment(assignment)}
                onClick={() => {
                  handleConfirmationUndeployDialogOpen(assignment);
                }}
                sx={{ margin: theme.spacing(1) }}
              >
                Undeploy
              </Button>
              <Tooltip title={showSubmissionStatus(assignment)}>
                <Checkbox
                  edge="end"
                  checked={
                    submittedAssignments.findIndex(
                      (element) => element.assignmentName === assignment,
                    ) !== -1
                  }
                  disabled={
                    submittedAssignments.findIndex(
                      (element) => element.assignmentName === assignment,
                    ) === -1
                  }
                  color="primary"
                  onClick={() => {
                    handleConfirmationResubmitDialogOpen(assignment);
                  }}
                />
              </Tooltip>
              {pointLimits[assignment] ? (
                <Tooltip title={showPointsTooltip(assignment)}>
                  <Box
                    sx={{ display: "inline-flex", alignItems: "center", ml: 2 }}
                  >
                    {(() => {
                      const submission = submittedAssignments.find(
                        (submission) =>
                          submission.assignmentName === assignment,
                      );
                      const hasSubmission = !!submission;
                      const pointLimit = pointLimits[assignment];
                      let percentage = 0;

                      if (
                        hasSubmission &&
                        submission.points !== undefined &&
                        pointLimit !== undefined &&
                        pointLimit !== 0
                      ) {
                        percentage = (submission.points / pointLimit) * 100;
                      }

                      return (
                        <>
                          <Box sx={{ width: "100px" }}>
                            <LinearProgress
                              variant={
                                (hasSubmission && submission.points) ||
                                !hasSubmission
                                  ? "determinate"
                                  : undefined
                              }
                              value={
                                (hasSubmission && submission.points) ||
                                !hasSubmission
                                  ? percentage
                                  : undefined
                              }
                              color={hasSubmission ? "primary" : "warning"}
                            />
                          </Box>
                          <Box sx={{ width: "50px", ml: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {hasSubmission
                                ? `${submission?.points ? submission?.points : "?"} / ${pointLimit}`
                                : `0 / ${pointLimit}`}
                            </Typography>
                          </Box>
                        </>
                      );
                    })()}
                  </Box>
                </Tooltip>
              ) : (
                <Box
                  sx={{ display: "inline-flex", alignItems: "center", ml: 2 }}
                >
                  <Box sx={{ width: "158px" }}>
                    <Typography variant="body2" color="text.secondary">
                      No bonus points
                    </Typography>
                  </Box>
                </Box>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        <Dialog
          open={confirmationUndeployDialogOpen.dialogOpen}
          onClose={handleConfirmationUndeployDialogClose}
          aria-describedby="alert-dialog-undeploy-confirmation-description"
        >
          <DialogContent>
            <DialogContentText id="alert-dialog-undeploy-confirmation-description">
              Undeploy environment?
              <br />
              All processes and unsubmitted changes will be lost.
              <br />
              {deployedGroupAssignments.length > 0
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
          open={confirmationResubmitDialogOpen.dialogOpen}
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
