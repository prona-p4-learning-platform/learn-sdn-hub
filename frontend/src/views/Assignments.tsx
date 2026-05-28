import { useState, useCallback, ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  List,
<<<<<<< HEAD
  Typography
=======
  ListItem,
  ListItemText,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
  CircularProgress
>>>>>>> origin/develop
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

<<<<<<< HEAD
const EnvironmentSchema = z.enum(["normal", "k8s", "k8s-vcluster"]);
export type AssignmentsResponse = z.infer<typeof assignmentsValidator>;

const assignmentsValidator = z.array(
=======
interface DeployedEnvironment {
  assignmentName: string;
  instance: string;
  isReady: boolean;
  isReadyInUserSession: boolean;
  isReadyInGroup: boolean;
}

const assignmentsValidator = z.object({
  assignments: z.array(z.array(z.string())),
  types: z.record(z.boolean()),
});

const pointsValidator = z.record(z.number());
const deployedEnvsValidator = z.array(
  z.object({
    assignmentName: z.string().min(1),
    instance: z.string(),
    isReady: z.boolean(),
    isReadyInUserSession: z.boolean(),
    isReadyInGroup: z.boolean(),
  }),
);
const submissionsValidator = z.array(
>>>>>>> origin/develop
  z.object({
    name: z.string(),
    type: EnvironmentSchema
  })
);

const defaultValidator = z.object({});

function Assignments(): JSX.Element {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
<<<<<<< HEAD
  const status = useEnvironmentStatus()
  const {assignments, points} = useAssignmentsData()
=======
  const [assignments, setAssignments] = useState<string[][]>([]);
  const [assignmentTypes, setAssignmentTypes] = useState<Map<string, boolean>>(new Map());
  const [submittedAssignments, setSubmittedAssignments] = useState<
    SubmissionType[]
  >([]);
  const [deployedAssignments, setDeployedAssignments] = useState<
    DeployedEnvironment[]
  >([]);

  const [disableAllDeployButtons, setDisableAllDeployButtons] = useState(false);
  const [disableAllUndeployButtons, setDisableAllUndeployButtons] = useState(false);
  const [progressAssignment, setProgressAssignment] = useState<string>("");

  const [pointLimits, setPointLimits] = useState<PointLimits>({});

  const [confirmationUndeployDialogOpen, setConfirmationUndeployDialogOpen] =
    useState({ assignment: "", dialogOpen: false });
  const [confirmationResubmitDialogOpen, setConfirmationResubmitDialogOpen] =
    useState({ assignment: "", dialogOpen: false });

    const [resubmitAssignment, setResubmitAssignment] = useState("");

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
>>>>>>> origin/develop

  const [undeployDialog, setUndeployDialog] = useState<{ open: boolean; assignment: string }>({ open: false, assignment: "" })
  const [resubmitDialog, setResubmitDialog] = useState<{ open: boolean; assignment: string }>({ open: false, assignment: "" })

<<<<<<< HEAD
=======
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
    return Array.from(deployedAssignments).some(
      (element) => element.assignmentName === assignment && element.isReady && element.isReadyInUserSession,
    );
  };

  const getDeployedUserAssignments = () => {
    return deployedAssignments
      .filter((element) => element.isReadyInUserSession && element.isReady)
      .map((element) => element.assignmentName);
  }

  const getDeployedGroupAssignments = () => {
    return deployedAssignments
      .filter((element) => element.isReadyInGroup && element.isReady)
      .map((element) => element.assignmentName);
  }

  const hasDeployedGroupAssignments = (assignment: string) => {
    return getDeployedGroupAssignments().includes(assignment);
  }

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
          setAssignments(payload.data.assignments);
          setAssignmentTypes(new Map(Object.entries(payload.data.types)));
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
        "/environment/deployed-environments",
        deployedEnvsValidator,
      )
        .then((payload) => {
          if (payload.success) {
            setDeployedAssignments(payload.data);
            if (payload.data.some(element => !element.isReady)) {
              setDisableAllDeployButtons(true);
              setDisableAllUndeployButtons(true);
            } else {
              setDisableAllDeployButtons(false);
              setDisableAllUndeployButtons(false);
            }
          } else throw payload.error;
        })
        .catch(() => {
          console.log("Fetching deployed environments failed...");
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
      "/environment/deployed-environments",
      deployedEnvsValidator,
    )
      .then((payload) => {
        if (payload.success) {
          setDeployedAssignments(payload.data);
        } else throw payload.error;
      })
      .catch(() => {
        console.log("Fetching deployed environments failed...");
      });
  }, []);
>>>>>>> origin/develop

  const createEnvironment = useCallback(
    async (assignment: string) => {
      setDisableAllDeployButtons(true);
      setProgressAssignment(assignment);
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

        setProgressAssignment("");
        setDisableAllDeployButtons(false);
        enqueueSnackbar("Deployment successful!", { variant: "success" });
        //updateDeployedEnvironments();
      } catch (error) {
        if (error instanceof FetchError) {
          const httpError = await getHttpError(error);
          const message = httpError.success
            ? httpError.data.message
            : httpError.error.message;

          setProgressAssignment("");
          setDisableAllDeployButtons(false);
          enqueueSnackbar("Deployment failed! (" + message + ")", {
            variant: "error",
          });
        } else {
          setProgressAssignment("");
          setDisableAllDeployButtons(false);
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
      setProgressAssignment(assignment);
      setDisableAllUndeployButtons(true);
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

        setProgressAssignment("");
        setDisableAllUndeployButtons(false);
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

          setProgressAssignment("");
          setDisableAllUndeployButtons(false);
          enqueueSnackbar("Deployment deletion failed! (" + message + ")", {
            variant: "error",
          });
        } else {
          setProgressAssignment("");
          setDisableAllUndeployButtons(false);
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
<<<<<<< HEAD
      {status.deployedUser.length === 0 && status.deployedGroup.length > 0 && (
        <Typography>
          You or your group members are working on{" "}
          {status.deployedGroup[0]}. You can join and open a connection by
          clicking deploy.
        </Typography>
      )}
      <List component="nav" aria-label="assignment list" style={{ width: 940 }}>
        {renderAssignments()}
=======
      <List component="nav" aria-label="assignment list" style={{ width: 940 }}>
        {assignments.map((assignmentGroup, assignmentGroupIndex) => (
          <div key={`group-${assignmentGroupIndex}`}>
            {assignmentGroupIndex === 0 || !hasKubernetesAssignments() ? null : (
              <div style={{padding: '8px'}}>
                <Typography variant="h6" style={{marginTop: '3rem', marginBottom: '0', paddingBottom: '0'}} gutterBottom>
                {assignmentGroupIndex === 1 ? "Kubernetes Assignments" : `Assignment Group ${assignmentGroupIndex + 1}`}
                </Typography>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                  <p>
                    The following exercises require a Kubernetes environment. To deploy the environment, the 'Setup' button must be used once. Don't forget to press the 'Undeploy' button after completing the exercises.
                  </p>

                  <Box sx={{ display: 'flex', mt: '1.3rem', mb: 0 }}>
                    <Button variant="contained" color="inherit" onClick={handleK8sClick}>
                      Kubernetes
                    </Button>
                    <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleK8sClose}>
                      <MenuItem onClick={() => { void setupK8S(); }}>
                        Setup
                      </MenuItem>
                      <MenuItem onClick={() => { void undeployK8S(); }}>
                        Undeploy
                      </MenuItem>
                      <MenuItem onClick={() => { void downloadKubeconfig(); }}>
                        Download <code>.kubeconfig</code>
                      </MenuItem>
                    </Menu>
                  </Box>
                </div>
              </div>
            )}
            {assignmentGroup.map((assignment) => (
              <ListItem key={assignment}
                secondaryAction={
                  <Box>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CloudUploadIcon />}
                      disabled={
                        disableAllDeployButtons ||
                        getDeployedUserAssignments().length > 0 ||
                        (getDeployedGroupAssignments().length > 0 &&
                          !hasDeployedGroupAssignments(assignment)) ||
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
                      {(getDeployedUserAssignments().length === 0 && getDeployedGroupAssignments().length > 0) ? (
                        "Join"
                      ) : (
                        "Deploy"
                      )}
                    </Button>
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<PlayCircleFilledWhiteIcon />}
                      disabled={disableAllUndeployButtons || !isActiveDeployment(assignment)}
                      onClick={() => {
                        void navigate(`/environment/${assignment}`);
                      }}
                      sx={{ margin: theme.spacing(1), width: "15em", justifyContent: "space-between", whiteSpace: "nowrap" }}
                    >
                      <div style={{ width: "100%" }}></div>
                      {assignmentTypes.get(assignment) === true ? "Start Exam" : "Start Assignment"}
                      <div style={{ width: "100%" }}></div>
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CloudOffIcon />}
                      disabled={disableAllUndeployButtons || !isActiveDeployment(assignment)}
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
                  </Box>
                }>
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
                {(progressAssignment === assignment) ? <Box sx={{ display: "inline-flex", alignItems: "center", ml: 2 }}><CircularProgress size={16}/></Box> : null}
              </ListItem>
            ))}
          </div>
        ))}
>>>>>>> origin/develop
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
<<<<<<< HEAD
              {status.deployedGroup.length > 0
=======
              {getDeployedGroupAssignments.length > 0
>>>>>>> origin/develop
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

      {getDeployedUserAssignments().length === 0 &&
        getDeployedGroupAssignments().length > 0 && (
          <Typography style={{ marginLeft: '1rem', marginTop: '1rem' }} color="info.main">
            You or your group members are working on{" "}
            {getDeployedGroupAssignments()[0]}. You can join and open a connection by
            clicking JOIN .
          </Typography>
        )}

      {(disableAllDeployButtons || disableAllUndeployButtons) && (
          <Typography style={{ marginLeft: '1rem', marginTop: '1rem' }} color="warning.main">
            Deployment actions are temporarily disabled while an environment is being prepared for you or one of your group members.
          </Typography>
        )}

    </div>
  );
}

export const Component = Assignments;
export default Assignments;
