import React, { useState } from "react";
import { Assignment } from "../typings/assignment/AssignmentType";
import {
  Grid,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Box, Button, Drawer, Divider, Typography, Dialog, DialogContent, DialogContentText, DialogActions, ListItem,
} from "@mui/material";
import { APIRequest } from "../api/Request.ts";
import { z } from "zod";
import { NewAssignment } from "../typings/assignment/AssignmentType";
import ResizeableSplitScreen from "./SplitEditor.tsx";
import { LoadingButton } from "@mui/lab";
import type { User } from "../typings/user/UserType";
import { EnvironmentUserMap } from "./ActiveEnvironmentsOverview.tsx";

interface AssignmentEditorProps {
  assignments: Assignment[];
  createAssignment: (assignment: Partial<NewAssignment>) => Promise<void>;
  updateAssignment: (assignment: Partial<NewAssignment>) => Promise<void>;
  deleteAssignment: (assignment: Partial<NewAssignment>) => Promise<void>;
  activeUsers: User[];
  reloadActiveUsers: () => Promise<void>;
}

const labSheetValidator = z.object({
  _id: z.string().optional(),
  labSheetName: z.string().nullable().optional(),
  labSheetContent: z.string().nullable().optional(),
})

const ActiveEnvironmentOverview = ({ assignments, createAssignment, updateAssignment, activeUsers, reloadActiveUsers }: AssignmentEditorProps): JSX.Element => {
  const [newAssignment, setNewAssignment] = useState<Partial<NewAssignment> | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [editorType, setEditorType] = useState<"Edit" | "Create">("Create");
  const [open, setOpen] = React.useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [activeGroupsForAssignment, setActiveGroupsForAssignment] = useState<Record<number, string[]>>({});

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    if (editorType === "Edit") {
      await handleOpenConfirmationDialog();
    } else if (editorType === "Create" && newAssignment) {
      await createAssignment(newAssignment);
      setNewAssignment(null);
    }
    setLoading(false);
  };

  /*
  const handleDeleteAssignment = () => {
    if (!newAssignment?._id) {
      return;
    }
    deleteAssignment({
      _id: newAssignment._id,
      sheetId: newAssignment.sheetId,
    })
      .then(() => {
        setNewAssignment(null);
        setEditorType("Create");
      })
      .catch((error) => {
      console.error("Error deleting assignment:", error);
    });
  };
   */

  const handleUpdateAssignment = () => {
    if (!newAssignment) {
      return;
    }
    updateAssignment(newAssignment).catch((error) => {
      console.error("Error updating assignment:", error);
    })
  };

  const handleOpenConfirmationDialog = async () => {
    await reloadActiveUsers();
    if (newAssignment?.name) {
      const grouped = groupUsersByEnvironment(activeUsers);
      const usersForThisAssignment = grouped[newAssignment.name] ?? [];
      const groups: Record<number, string[]> = {};
      for (const user of usersForThisAssignment) {
        if (user.groupNumber == null) continue;
        if (!groups[user.groupNumber]) {
          groups[user.groupNumber] = [];
        }
        groups[user.groupNumber].push(user.username);
      }
      setActiveGroupsForAssignment(groups);
    } else {
      setActiveGroupsForAssignment({});
    }
    setConfirmationDialogOpen(true);
  };

  const handleCloseConfirmationDialog = () => {
    setConfirmationDialogOpen(false);
  };

  const handleConfirmUpdate =  () => {
    handleUpdateAssignment();
    setConfirmationDialogOpen(false);
  };

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

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

  return (
    <>
    <Grid
      container
      spacing={2}
      justifyContent="center"
      alignItems="center"
      flexDirection="column"
    >
      <AssignmentDrawer
        assignments={assignments}
        toggleDrawer={(open) => () => { void toggleDrawer(open)(); }}
        setEditorType={setEditorType}
        open={open}
        setExistingAssignment={setNewAssignment}
      />
      <Grid item>
        <Box
          component="form"
          onSubmit={(e) => { void handleSubmit(e); }}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 600,
            width: "100%",
          }}
        >
          <h2>Update Assignment</h2>
          <Button onClick={toggleDrawer(true)} variant="contained">Choose Assignment</Button>
          <TextField
            value={newAssignment?.name || ""}
            id="assignmentName"
            name="assignmentName"
            label="Assignment Name"
            required={true}
            InputProps={{
              readOnly: true,
            }}
            onChange={(e) =>
              setNewAssignment((prev) =>
                prev ? { ...prev, name: e.target.value } : { name: e.target.value }
              )
            }
          />
          {/*
          <TextField
            value={newAssignment?.labSheetName || ""}
            id="SheetName"
            name="SheetName"
            label="Lab Sheet Name"
            required={true}
            onChange={(e) =>
              setNewAssignment((prev) =>
                prev ? { ...prev, labSheetName: e.target.value } : { labSheetName: e.target.value }
              )
            }
          />
          */}
          <ResizeableSplitScreen
            setNewAssignment={setNewAssignment}
            newAssignment={newAssignment}
          />
          {/*
          <TextField
            value={newAssignment?.maxBonusPoints ?? ""}
            type="number"
            id="MaxBonusPoints"
            name="MaxBonusPoints"
            label="Max Bonus Points"
            onChange={(e) =>
              setNewAssignment((prev) => ({
                ...prev,
                maxBonusPoints: e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
          />
          <LoadingButton
            type={"submit"}
            variant="contained"
            loading={loading}
          >
            {editorType === "Create" ? "Create Assignment" : "Update Assignment"}
          </LoadingButton>
          */}
          <LoadingButton
            type={"submit"}
            variant="contained"
            loading={loading}
            disabled={editorType === "Create"}
          >
            Update Assignment
          </LoadingButton>
          {/*
          {editorType === "Edit" && (
            <LoadingButton
              color="error"
              variant="contained"
              onClick={() => void handleDeleteAssignment()}
            >
              Delete Assignment
            </LoadingButton>
          )}
          */}
        </Box>
      </Grid>
      <Dialog
        open={confirmationDialogOpen}
        onClose={handleCloseConfirmationDialog}
        aria-describedby="alert-dialog-undeploy-confirmation-description"
      >
        <DialogContent>
          <DialogContentText id="alert-dialog-undeploy-confirmation-description">
            Save changes?
            <br />
            Existing data will be overwritten. Running environments will be updated.
            {Object.keys(activeGroupsForAssignment).length > 0 && (
              <>
                <br /><br />
                Active Groups working on <strong>{newAssignment?.name}</strong>:
                <br />
                <List>
                  {Object.entries(activeGroupsForAssignment).map(([group, users]) => (
                    <ListItem key={group}>
                      Group {group} ({users.join(", ")})
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmationDialog} color="primary" autoFocus>
            No
          </Button>
          <Button
            onClick={() => {
              void handleConfirmUpdate();
            }}
            color="primary">
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
    </>
  );
};

interface AssignmentDrawerProps {
  open: boolean;
  toggleDrawer: (open: boolean) => () => void;
  assignments: Assignment[];
  setEditorType: (type: "Edit" | "Create") => void;
  setExistingAssignment: React.Dispatch<React.SetStateAction<Partial<NewAssignment | null>>>;
}

const AssignmentDrawer = ({ open, toggleDrawer, assignments, setEditorType, setExistingAssignment }: AssignmentDrawerProps) => {
  const handleAssignmentSelection = async (assignmentId: string): Promise<void> => {
    const assignment = assignments.find(a => a._id === assignmentId) ?? null;
    setExistingAssignment(assignment);
    setEditorType("Edit");
    if (!assignment || !assignment.sheetId || assignment.assignmentLabSheetLocation !== "database") return; // TODO: Better differentiation. Currently, the link to the Lab Sheet is rendered in the editor if there is no Lab Sheet in the database.
    await APIRequest(
      `admin/assignment/labSheet/${assignment.sheetId}`,
      labSheetValidator,
    )
      .then((payload) => {
        if (payload.success && payload.data) {
          setExistingAssignment((prev) =>
            prev
              ? {
                ...prev,
                labSheetName: payload.data.labSheetName ?? undefined,
                assignmentLabSheet: payload.data.labSheetContent ?? "",
              }
              : {
                labSheetName: payload.data.labSheetName ?? undefined,
                assignmentLabSheet: payload.data.labSheetContent ?? "",
              }
          );
        }
      })
  };

  return (
    <Drawer anchor="right" open={open} onClose={toggleDrawer(false)}>
      <Box
        sx={{ width: 300 }}
        role="presentation"
        onKeyDown={toggleDrawer(false)}
      >
        <Typography variant="h6" sx={{ p: 2 }}>
          Assignments
        </Typography>
        <Divider />
        <List>
          {assignments.map((assignment) => (
            <ListItemButton
              key={assignment._id}
              onClick={() => {
                void handleAssignmentSelection(assignment._id);
              }}
            >
              <ListItemText primary={assignment.name} />
            </ListItemButton>
          ))}
        </List>
        {/*
        <Divider />
        <List>
          <ListItemButton
            onClick={() => {
              setEditorType("Create");
              setExistingAssignment(null);
            }}
          >
            <ListItemText primary="+ New Assignment" />
          </ListItemButton>
        </List>
        */}
      </Box>
    </Drawer>
  );
}

export default ActiveEnvironmentOverview;