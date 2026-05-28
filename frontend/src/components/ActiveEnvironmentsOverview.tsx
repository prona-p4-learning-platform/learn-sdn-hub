import { useState, useEffect, useCallback } from "react";
import {
  Grid,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
  Button,
  Dialog,
  DialogContent, DialogContentText, DialogActions,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { User } from "../typings/user/UserType";
import CloudOffIcon from "@mui/icons-material/CloudOff";
import { APIRequest, getHttpError } from "../api/Request.ts";
import { FetchError } from "ofetch";
import { useSnackbar } from "notistack";
import { z } from "zod";

interface ActiveEnvironmentsOverviewProps {
  activeUsers: User[];
  reloadActiveUsers: () => Promise<void>;
}

export type EnvironmentUserMap = Record<string, {
  _id: string;
  username: string;
  groupNumber: number;
  port?: number;
}[]>;

function groupUsersByEnvironment(users: User[]): EnvironmentUserMap {
  const result: EnvironmentUserMap = {};

  for (const user of users) {
    if (!user.environments) continue;

    for (const env of user.environments) {
      const envName = env.environment;

      if (!result[envName]) {
        result[envName] = [];
      }

      result[envName].push({
        _id: user._id,
        username: user.username,
        groupNumber: user.groupNumber,
        port: env.port,
      });
    }
  }
  return result;
}

const ActiveEnvironmentsOverview = ({ activeUsers, reloadActiveUsers }: ActiveEnvironmentsOverviewProps): JSX.Element => {
  const [groupedUsers, setGroupedUsers] = useState<EnvironmentUserMap>({});
  const [confirmationUndeployDialogOpen, setConfirmationUndeployDialogOpen] =
    useState<{ assignment: string; groupNumber: number | null; dialogOpen: boolean }>({
      assignment: "",
      groupNumber: null,
      dialogOpen: false,
    });
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const defaultValidator = z.object({});
    const deployedUserEnvsValidator = z.array(z.string());
    const deployedGroupEnvsValidator = z.array(z.string());

  const updateDeployedEnvironments = useCallback(() => {
    APIRequest(
      "/environment/deployed-user-environments",
      deployedUserEnvsValidator,
    )
      .then((payload) => {
        if (payload.success) {
          console.log('Deletion successful.');
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
          console.log('Deletion successful');
        } else throw payload.error;
      })
      .catch(() => {
        console.log("Fetching deployed group environments failed...");
      });
  }, [deployedGroupEnvsValidator, deployedUserEnvsValidator]);

  const deleteEnvironment = useCallback(
    async (assignment: string, groupNumber: number) => {
      const deletingSnack = enqueueSnackbar("Deleting virtual environment...", {
        variant: "info",
        persist: true,
      });

      try {
        await APIRequest("/environment/delete", defaultValidator, {
          method: "POST",
          query: {
            environment: assignment,
            groupNumber: groupNumber,
          },
          timeout: 300000,
        });

        enqueueSnackbar("Deployment deletion successful!", {
          variant: "success",
        });
        updateDeployedEnvironments();
        await reloadActiveUsers();
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
    [enqueueSnackbar, closeSnackbar, defaultValidator, updateDeployedEnvironments],
  );

  const handleConfirmationUndeployDialogOpen = (selectedAssignment: string, selectedGroupNumber: number) => {
    setConfirmationUndeployDialogOpen({
      assignment: selectedAssignment,
      groupNumber: selectedGroupNumber,
      dialogOpen: true,
    });
  };

  const handleConfirmationUndeployDialogClose = () => {
    setConfirmationUndeployDialogOpen({ assignment: "", groupNumber: null, dialogOpen: false });
  };

  const handleConfirmationUndeployDialogConfirm = () => {
    if (confirmationUndeployDialogOpen.groupNumber != null) {
      void deleteEnvironment(confirmationUndeployDialogOpen.assignment, confirmationUndeployDialogOpen.groupNumber);
      setConfirmationUndeployDialogOpen({ assignment: "", groupNumber: null, dialogOpen: false });
    }
  };

  useEffect(() => {
    if (activeUsers.length > 0) {
      const grouped = groupUsersByEnvironment(activeUsers);
      setGroupedUsers(grouped);
    }
  }, [activeUsers]);

  return (
    <>
    <Grid
      item
      xs={4}
      sx={
      {
        margin: "auto",
        padding: 2,
        overflowY: "auto",
        minWidth: "600px",
      }
    }>
      <Typography variant="h6" gutterBottom>
        Active environments
      </Typography>
      <Button
        onClick={() => void reloadActiveUsers()}
      >
        Reload
      </Button>
      {Object.entries(groupedUsers).map(([envName, users]) => {
        const usersByGroup = users.reduce<Record<number, typeof users>>((acc, user) => {
          if (!acc[user.groupNumber]) {
            acc[user.groupNumber] = [];
          }
          acc[user.groupNumber].push(user);
          return acc;
        }, {});
        return (
          <Accordion key={envName}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>{envName}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <div style={{ paddingLeft: 16, margin: 0 }}>
                {Object.entries(usersByGroup).map(([groupNumber, groupUsers]) => {
                  const ports = Array.from(
                    new Set(
                      groupUsers
                        .map((u) => u.port)
                        .filter((p): p is number => p !== undefined)
                    )
                  );
                  return (
                    <div key={groupNumber} style={{ marginBottom: 12 }}>
                      <Typography variant="subtitle1">
                        Group {groupNumber} (
                        {groupUsers.map((user, index) => (
                          <span key={user._id}>
                            {user.username}
                            {index < groupUsers.length - 1 && ", "}
                          </span>
                        ))}
                        )
                        {ports.length > 0 && <> — Port: {ports.join(", ")}</>}
                      </Typography>
                      <Grid container spacing={1} flexDirection="row">
                        <Grid item>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<CloudOffIcon />}
                            onClick={() => {
                              handleConfirmationUndeployDialogOpen(envName, Number(groupNumber));
                            }}
                          >
                            Undeploy
                          </Button>
                        </Grid>
                        <Grid item>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => {
                              const params = new URLSearchParams({
                                groupNumber: String(groupNumber),
                              });
                              window.open(`/environment/${envName}?${params.toString()}`, "_blank");
                            }}
                          >
                            Join
                          </Button>
                        </Grid>
                      </Grid>
                    </div>
                  );
                })}
              </div>
            </AccordionDetails>
          </Accordion>
        );

      })}
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
            { "Other users still using the environment " +
              "will also be disconnected." }
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
    </Grid>
    </>
  )
}

export default ActiveEnvironmentsOverview;