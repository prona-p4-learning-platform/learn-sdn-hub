import { useEffect, useRef, useState } from "react";
import type { SubmissionAdminOverviewEntry } from "../typings/submission/SubmissionType";
import {
  Menu,
  MenuItem,
  Box,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Divider,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import { z } from "zod";
import { Terminal } from "xterm";
import Editor from "@monaco-editor/react";

import { Assignment } from "../typings/assignment/AssignmentType";

import SubmissionTerminal from "./SubmissionTerminal";

import TerminalObserver from "../utilities/TerminalObserver";
import { APIRequest, APIRequestNV } from "../api/Request";

interface SubmissionProps {
  assignments: Assignment[];
}

interface PointsError {
  [submission: string]: boolean;
}

const submissionAdminOverviewEntrySchema = z.object({
  submissionID: z.string(),
  assignmentName: z.string(),
  lastChanged: z.string().transform((value) => {
    return new Date(value);
  }),
  username: z.string(),
  groupNumber: z.number().nonnegative(),
  fileNames: z.array(z.string()),
  terminalEndpoints: z.array(z.string()),
  points: z.number().optional(),
  assignmentRef: z.string().optional(),
  userRef: z.string().optional(),
  dialogAnswers: z
    .array(
      z.object({
        stepIndex: z.union([z.string(), z.number()]).transform((val) => String(val)),
        question: z.string(),
        answer: z.string(),
      }),
    )
    .optional(),
});
const submissionAdminOverviewEntryValidator = z.array(
  submissionAdminOverviewEntrySchema,
);

const terminalStateSchema = z.object({
  endpoint: z.string(),
  state: z.string(),
});
const terminalStateValidator = z.array(terminalStateSchema);

const defaultValidator = z.object({});

const SubmissionOverview = ({ assignments }: SubmissionProps): JSX.Element => {
  const { enqueueSnackbar } = useSnackbar();
  const [submissions, setSubmissions] = useState<
    SubmissionAdminOverviewEntry[]
  >([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionAdminOverviewEntry | null>(null);
  const [pointsErrors, setPointsErrors] = useState<PointsError>({});
  const [submissionIDDialog, setSubmissionIDDialog] = useState<string>("");
  const [assignmentNameDialog, setAssignmentNameDialog] = useState<string>("");
  const [pointsDialog, setPointsDialog] = useState<number>(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [expandedFiles, setExpandedFiles] = useState<string[]>([]);

  const xTermContents = useRef<Record<string, string>>({});

  useEffect(() => {
    const fetchInitialSubmissions = () => {
      fetchSubmissions().catch((error) => {
        console.error("Error fetching submissions:", error);
      });
    };

    fetchInitialSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const result = await APIRequest(
        "/admin/submissions",
        submissionAdminOverviewEntryValidator,
      );

      if (result.success) {
        setExpanded([]);
        setSubmissions(result.data);
      } else {
        console.error("Validation error fetching submissions:", result.error);
      }
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const fetchTerminalsOfSubmission = async (submissionID: string) => {
    try {
      if (
        Object.keys(xTermContents.current).some((key) =>
          key.startsWith(submissionID),
        )
      ) {
        return;
      }

      const result = await APIRequest(
        `/admin/submission/${encodeURIComponent(submissionID)}/terminals`,
        terminalStateValidator,
      );

      if (result.success) {
        for (const terminal of result.data) {
          const key = submissionID + "_" + terminal.endpoint;
          xTermContents.current[key] = terminal.state;
          TerminalObserver.notify(key, terminal.state);
        }
      } else {
        console.error("Validation error fetching terminals:", result.error);
      }
    } catch (error) {
      console.error("Error fetching terminals:", error);
    }
  };

  const handleFetchTerminalsOfSubmission = (
    groupSubmissions: SubmissionAdminOverviewEntry[],
  ) => {
    groupSubmissions.forEach((submission) => {
      fetchTerminalsOfSubmission(submission.submissionID).catch((error) => {
        console.error("Error updating users:", error);
      });
    });
  };

  const assignPoints = async () => {
    try {
      const result = await APIRequest(
        `/admin/submission/${submissionIDDialog}/points`,
        defaultValidator,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            points: pointsDialog,
          }),
        },
      );

      if (result.success) {
        enqueueSnackbar(
          `Successfully awarded ${pointsDialog} bonus points to ${getUserOfSubmission(submissionIDDialog)} for ${assignmentNameDialog}`,
          { variant: "success" },
        );
        setSubmissions((prevSubmissions) =>
          prevSubmissions.map((submission) =>
            submission.submissionID === submissionIDDialog
              ? { ...submission, points: pointsDialog }
              : submission,
          ),
        );
      } else {
        console.error("Validation error assigning points:", result.error);
        enqueueSnackbar(result.error.message, { variant: "error" });
      }
    } catch (error) {
      console.error("Error assigning points:", error);
      if (error instanceof Error)
        enqueueSnackbar(error.message, { variant: "error" });
      else console.error(error);
    }
  };

  const groupSubmissionsByAssignmentAndGroup = (
    submissions: SubmissionAdminOverviewEntry[],
  ) => {
    const groupedSubmissions: {
      [assignmentName: string]: {
        [groupNumber: number]: SubmissionAdminOverviewEntry[];
      };
    } = {};

    submissions.forEach((submission) => {
      const { assignmentName, groupNumber } = submission;
      if (!groupedSubmissions[assignmentName]) {
        groupedSubmissions[assignmentName] = {};
      }
      if (!groupedSubmissions[assignmentName][groupNumber]) {
        groupedSubmissions[assignmentName][groupNumber] = [];
      }
      groupedSubmissions[assignmentName][groupNumber].push(submission);
    });

    return groupedSubmissions;
  };

  const accordionClicked = (index: string) => {
    if (expanded.includes(index)) {
      setExpanded(expanded.filter((indexParam) => indexParam !== index));
    } else {
      setExpanded([...expanded, index]);
    }
  };

  // Assignment has maxBonusPoints but not all submissions have been awarded points
  const hasAssignmentOpenPoints = (assignmentName: string) => {
    const assignment = getAssignmentByName(assignmentName);
    if (assignment?.maxBonusPoints == null) {
      return false;
    }
    const submissionsOfAssignment = submissions.filter(
      (submission) => submission.assignmentName === assignmentName,
    );
    return submissionsOfAssignment.some(
      (submission) => submission.points == null,
    );
  };

  // Group has open points if at least one submission has no points awarded
  const hasGroupOpenPoints = (
    assignmentName: string,
    groupSubmissions: SubmissionAdminOverviewEntry[],
  ) => {
    const assignment = getAssignmentByName(assignmentName);
    if (assignment?.maxBonusPoints == null) {
      return false;
    }
    return groupSubmissions.some((submission) => submission.points == null);
  };

  const getUserOfSubmission = (submissionID: string) => {
    const submission = submissions.find(
      (submission) => submission.submissionID === submissionID,
    );
    return submission?.username || "";
  };

  const submissionAlreadyAwardedPoints = (submissionID: string) => {
    return submissions.some(
      (submission) =>
        submission.submissionID === submissionID && submission.points != null,
    );
  };

  const getPointsOfSubmission = (submissionID: string) => {
    const submission = submissions.find(
      (submission) => submission.submissionID === submissionID,
    );
    return submission?.points || 0;
  };

  const getMaxPointsOfAssignment = (assignmentName: string) => {
    const assignment = getAssignmentByName(assignmentName);
    return assignment?.maxBonusPoints || undefined;
  };

  const getAssignmentByName = (assignmentName: string) => {
    return assignments.find((assignment) => assignment.name === assignmentName);
  };

  const handlePointsChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    assignmentName: string,
  ) => {
    const value = event.target.value;
    const submissionID = event.target.id.split("_")[2];
    const curAssignment = getAssignmentByName(assignmentName);
    let curValue = false;
    if (
      value === "" ||
      isNaN(Number(value)) ||
      Number(value) < 0 ||
      (curAssignment?.maxBonusPoints !== undefined &&
        Number(value) > curAssignment.maxBonusPoints)
    ) {
      curValue = true;
    }
    setPointsErrors((prevErrors) => ({
      ...prevErrors,
      [submissionID]: curValue,
    }));
  };

  const handlePointsSubmit = (
    event: React.FormEvent<HTMLFormElement>,
    submissionID: string,
    assignmentName: string,
    points: string,
  ) => {
    event.preventDefault();
    const maxPoints = getMaxPointsOfAssignment(assignmentName);
    if (maxPoints === undefined) {
      enqueueSnackbar(
        "Error awarding bonus points: Assignment has no max points set",
        { variant: "error" },
      );
      return;
    } else if (
      isNaN(Number(points)) ||
      Number(points) > maxPoints ||
      Number(points) < 0
    ) {
      enqueueSnackbar(
        `Error awarding bonus points: Points must be between 0 and ${maxPoints}`,
        { variant: "error" },
      );
      return;
    } else if (
      Number(points) ===
      submissions.find((s) => s.submissionID === submissionID)?.points
    ) {
      enqueueSnackbar(
        `Error awarding bonus points: Points are the same as before`,
        { variant: "error" },
      );
      return;
    }

    setSubmissionIDDialog(submissionID);
    setAssignmentNameDialog(assignmentName);
    setPointsDialog(Number(points));
    setOpenDialog(true);
  };

  const handleExpandAll = () => {
    const expandedArray = submissions.map(
      (submission) => submission.assignmentName,
    );
    submissions.forEach((submission) => {
      expandedArray.push(submission.assignmentName + submission.groupNumber);
    });
    setExpanded(expandedArray);
  };

  const handleCollapseAll = () => {
    setExpanded([]);
  };

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLButtonElement>,
    submission: SubmissionAdminOverviewEntry,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedSubmission(submission);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSubmission(null);
  };

  const handleDialogConfirm = () => {
    assignPoints().catch((error) => {
      console.error("Error assigning points:", error);
    });
    handleDialogClose();
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSubmissionIDDialog("");
    setAssignmentNameDialog("");
    setPointsDialog(0);
  };

  const handleDownloadFile = (fileName: string, submissionID: string) => {
    downloadFile(fileName, submissionID).catch((error) => {
      console.error("Error downloading file:", error);
    });
  };

  const downloadFile = async (fileName: string, submissionID: string) => {
    try {
      const result = await APIRequestNV(
        `/api/admin/submission/${encodeURIComponent(
          submissionID,
        )}/file/download/${encodeURIComponent(fileName)}`,
        {
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(result);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      if (error instanceof Error)
        enqueueSnackbar(error.message, { variant: "error" });
    }
  };

  const downloadTerminalAsTextFile = (index: string, fileName: string) => {
    const element = document.createElement("a");
    const file = new Blob([xTermContents.current[index]], {
      type: "text/plain",
    });
    element.href = URL.createObjectURL(file);
    element.download = fileName + ".txt";
    document.body.appendChild(element);
    element.click();
  };

  const handleFileAccordionChange = (
    fileName: string,
    submissionID: string,
  ) => {
    const key = `${submissionID}_${fileName}`;
    if (expandedFiles.includes(key)) {
      setExpandedFiles(expandedFiles.filter((f) => f !== key));
    } else {
      setExpandedFiles([...expandedFiles, key]);
      if (!fileContents[key]) {
        fetchFileContent(fileName, submissionID, key);
      }
    }
  };

  const fetchFileContent = async (
    fileName: string,
    submissionID: string,
    key: string,
  ) => {
    try {
      const result = await APIRequestNV(
        `/api/admin/submission/${encodeURIComponent(
          submissionID,
        )}/file/download/${encodeURIComponent(fileName)}`,
        {
          responseType: "text",
        },
      );
      setFileContents((prev) => ({ ...prev, [key]: result }));
    } catch (error) {
      if (error instanceof Error) {
        enqueueSnackbar(`Error loading file ${fileName}: ${error.message}`, {
          variant: "error",
        });
      }
    }
  };

  const getLanguageFromFileName = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      py: "python",
      js: "javascript",
      ts: "typescript",
      tsx: "typescript",
      jsx: "javascript",
      json: "json",
      yaml: "yaml",
      yml: "yaml",
      xml: "xml",
      html: "html",
      css: "css",
      java: "java",
      cpp: "cpp",
      c: "c",
      cs: "csharp",
      rb: "ruby",
      go: "go",
      rs: "rust",
      sh: "shell",
      bash: "shell",
      sql: "sql",
      md: "markdown",
      txt: "plaintext",
      p4: "plaintext",
    };
    return languageMap[ext || ""] || "plaintext";
  };

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <Button
          variant="contained"
          onClick={() => handleExpandAll()}
          style={{ marginRight: "10px" }}
        >
          Expand All
        </Button>
        <Button variant="contained" onClick={() => handleCollapseAll()}>
          Collapse All
        </Button>
      </div>
      {Object.entries(groupSubmissionsByAssignmentAndGroup(submissions)).map(
        ([assignmentName, groupData]) => (
          <Accordion
            key={assignmentName}
            expanded={expanded.includes(assignmentName)}
            onChange={() => accordionClicked(assignmentName)}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`panel${assignmentName}-content`}
              id={`panel${assignmentName}-header`}
            >
              <Typography variant="body1">
                {assignmentName}{" "}
                {hasAssignmentOpenPoints(assignmentName)
                  ? "(Some bonus points are still open)"
                  : ""}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {Object.entries(groupData).map(
                ([groupNumber, groupSubmissions]) => (
                  <Accordion
                    key={assignmentName + groupNumber}
                    expanded={expanded.includes(assignmentName + groupNumber)}
                    onChange={() => {
                      accordionClicked(assignmentName + groupNumber);

                      const firstTimeOpen = !expanded.includes(
                        assignmentName + groupNumber,
                      );
                      if (firstTimeOpen) {
                        handleFetchTerminalsOfSubmission(groupSubmissions);
                      }
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls={`panel${assignmentName}-content-${groupNumber}`}
                      id={`panel${assignmentName}-header-${groupNumber}`}
                    >
                      <Typography variant="body1">
                        Group {groupNumber}{" "}
                        {hasGroupOpenPoints(assignmentName, groupSubmissions)
                          ? "(Some bonus points are still open)"
                          : ""}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box width="100%">
                        {groupSubmissions.map((submission, index) => (
                          <div key={submission.submissionID}>
                            <Box
                              mb={1}
                              display="flex"
                              justifyContent="space-between"
                              alignItems="flex-start"
                              width="100%"
                            >
                              <Box flex="0 0 120px">
                                <Typography variant="body1">
                                  <strong>Username:</strong>
                                </Typography>
                                {/* Debug info */}
                                <Typography variant="body1">
                                  <strong>Dialogs:</strong>
                                </Typography>
                                <Typography variant="body1">
                                  <strong>Last Changed:</strong>
                                </Typography>
                              </Box>
                              <Box flex="1">
                                <Typography variant="body1">
                                  {submission.username}
                                </Typography>
                                <Typography variant="body1">
                                  {submission.dialogAnswers?.length ?? 0}
                                </Typography>
                                <Typography variant="body1">
                                  {new Date(
                                    submission.lastChanged,
                                  ).toLocaleString(undefined, {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </Typography>
                              </Box>
                              <Button
                                variant="outlined"
                                onClick={(event) =>
                                  handleMenuOpen(event, submission)
                                }
                                endIcon={<KeyboardArrowDownIcon />}
                                style={{ marginTop: "8px" }}
                              >
                                Download Files
                              </Button>
                            </Box>
                            {submission.dialogAnswers &&
                              submission.dialogAnswers.length > 0 && (
                                <Box mb={2}>
                                  {submission.dialogAnswers.map(
                                    (dialog, index) => {
                                      const dialogKey = `${submission.submissionID}_dialog_${index}`;
                                      const isExpanded =
                                        expandedFiles.includes(dialogKey);

                                      return (
                                        <Accordion
                                          key={dialogKey}
                                          expanded={isExpanded}
                                          onChange={() => {
                                            setExpandedFiles((prev) =>
                                              prev.includes(dialogKey)
                                                ? prev.filter(
                                                    (k) => k !== dialogKey,
                                                  )
                                                : [...prev, dialogKey],
                                            );
                                          }}
                                        >
                                          <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls={`dialog-${dialogKey}-content`}
                                            id={`dialog-${dialogKey}-header`}
                                          >
                                            <Typography variant="body2">
                                              {dialog.question} (Dialog Step{" "}
                                              {dialog.stepIndex})
                                            </Typography>
                                          </AccordionSummary>
                                          <AccordionDetails>
                                            <Box width="100%" height="200px">
                                              <Editor
                                                height="100%"
                                                value={dialog.answer}
                                                language="plaintext"
                                                theme="vs-dark"
                                                options={{
                                                  readOnly: true,
                                                  minimap: { enabled: false },
                                                }}
                                              />
                                            </Box>
                                          </AccordionDetails>
                                        </Accordion>
                                      );
                                    },
                                  )}
                                </Box>
                              )}
                            {submission.fileNames.length > 0 && (
                              <Box mb={2}>
                                {submission.fileNames.map((fileName) => {
                                  const fileKey = `${submission.submissionID}_${fileName}`;
                                  const isExpanded = expandedFiles.includes(fileKey);
                                  return (
                                    <Accordion
                                      key={fileKey}
                                      expanded={isExpanded}
                                      onChange={() =>
                                        handleFileAccordionChange(
                                          fileName,
                                          submission.submissionID,
                                        )
                                      }
                                    >
                                      <AccordionSummary
                                        expandIcon={<ExpandMoreIcon />}
                                        aria-controls={`file-${fileKey}-content`}
                                        id={`file-${fileKey}-header`}
                                      >
                                        <Box display="flex" width="100%" justifyContent="space-between" alignItems="center">
                                          <Typography variant="body2">
                                            {fileName}
                                          </Typography>
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDownloadFile(fileName, submission.submissionID);
                                            }}
                                            sx={{ ml: 1 }}
                                          >
                                            Download
                                          </Button>
                                        </Box>
                                      </AccordionSummary>
                                      <AccordionDetails>
                                        <Box width="100%" height="400px">
                                          {fileContents[fileKey] !== undefined ? (
                                            <Editor
                                              height="100%"
                                              value={fileContents[fileKey]}
                                              language={getLanguageFromFileName(
                                                fileName,
                                              )}
                                              theme="vs-dark"
                                              options={{
                                                readOnly: true,
                                                minimap: { enabled: false },
                                              }}
                                            />
                                          ) : (
                                            <Typography>
                                              Loading file...
                                            </Typography>
                                          )}
                                        </Box>
                                      </AccordionDetails>
                                    </Accordion>
                                  );
                                })}
                              </Box>
                            )}
                            {submission.terminalEndpoints
                              .sort((a, b) => a.localeCompare(b))
                              .map(
                                (endpoint, index) =>
                                  expanded.includes(
                                    assignmentName + groupNumber,
                                  ) && (
                                    <Box
                                      mb={1}
                                      key={`${submission.submissionID}_${index}`}
                                    >
                                      <Box
                                        mb={1}
                                        display="flex"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        width="100%"
                                      >
                                        <Box flex="1">
                                          <Typography variant="body1">
                                            <strong>{endpoint}</strong>
                                          </Typography>
                                        </Box>
                                        <Button
                                          variant="outlined"
                                          onClick={() =>
                                            downloadTerminalAsTextFile(
                                              `${submission.submissionID}_${endpoint}`,
                                              `${assignmentName}_${groupNumber}_${submission.username}_terminal_${index}`,
                                            )
                                          }
                                        >
                                          Download as Text File
                                        </Button>
                                      </Box>
                                      <SubmissionTerminal
                                        key={`${submission.submissionID}_${endpoint}`}
                                        onTerminalReady={(
                                          terminal: Terminal,
                                        ) => {
                                          if (
                                            xTermContents.current[
                                              `${submission.submissionID}_${endpoint}`
                                            ]
                                          ) {
                                            terminal.write(
                                              xTermContents.current[
                                                `${submission.submissionID}_${endpoint}`
                                              ],
                                            );
                                          }
                                        }}
                                        terminalKey={`${submission.submissionID}_${endpoint}`}
                                      />
                                    </Box>
                                  ),
                              )}
                            {getMaxPointsOfAssignment(assignmentName) !==
                              undefined && (
                              <Box
                                flex="1"
                                component="form"
                                onSubmit={(event) =>
                                  handlePointsSubmit(
                                    event,
                                    submission.submissionID,
                                    assignmentName,
                                    (
                                      document.getElementById(
                                        `bonusPoints_input_${submission.submissionID}`,
                                      ) as HTMLInputElement
                                    )?.value,
                                  )
                                }
                              >
                                <Typography variant="body1">
                                  Award bonus points for submission:
                                </Typography>
                                <Box
                                  mb={1}
                                  display="flex"
                                  justifyContent="flex-start"
                                  alignItems="center"
                                  width="100%"
                                >
                                  <TextField
                                    required
                                    error={
                                      pointsErrors[submission.submissionID]
                                    }
                                    id={`bonusPoints_input_${submission.submissionID}`}
                                    label="Points"
                                    onChange={(
                                      event: React.ChangeEvent<HTMLInputElement>,
                                    ) =>
                                      handlePointsChange(event, assignmentName)
                                    }
                                    helperText={`Points must be between 0 and ${getMaxPointsOfAssignment(
                                      assignmentName,
                                    )}`}
                                    variant="standard"
                                    defaultValue={submission.points || ""}
                                  />
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    type="submit"
                                    sx={{ ml: 3 }}
                                  >
                                    Submit
                                  </Button>
                                </Box>
                              </Box>
                            )}
                            {index < groupSubmissions.length - 1 && (
                              <Divider
                                style={{
                                  marginBottom: "8px",
                                  marginTop: "8px",
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ),
              )}
            </AccordionDetails>
          </Accordion>
        ),
      )}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedSubmission &&
          selectedSubmission.fileNames.map((fileName, index) => (
            <MenuItem
              key={index}
              onClick={() =>
                handleDownloadFile(fileName, selectedSubmission.submissionID)
              }
            >
              {fileName}
            </MenuItem>
          ))}
      </Menu>
      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Confirm Bonus Points</DialogTitle>
        <DialogContent>
          {submissionAlreadyAwardedPoints(submissionIDDialog) && (
            <Typography variant="body1" sx={{ color: "red", mb: 1 }}>
              This submission has already been awarded{" "}
              <strong>{getPointsOfSubmission(submissionIDDialog) || 0}</strong>{" "}
              bonus points. Submitting this form will overwrite the existing
              points.
            </Typography>
          )}
          <Typography variant="body1">
            Are you sure you want to award{" "}
            <strong>
              {pointsDialog} out of{" "}
              {getMaxPointsOfAssignment(assignmentNameDialog)}
            </strong>{" "}
            bonus points to{" "}
            <strong>{getUserOfSubmission(submissionIDDialog)}</strong> for{" "}
            <strong>{assignmentNameDialog}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogConfirm} color="primary">
            Confirm
          </Button>
          <Button onClick={handleDialogClose} color="secondary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default SubmissionOverview;
