import { useCallback, useEffect, useRef, useState } from "react";
import APIRequest from "../api/Request";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
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
} from "@mui/material";
import { Severity } from "../views/Administration";
import XTerm from "./XTerm";
import { FitAddon } from "xterm-addon-fit";

interface SubmissionProps {
  handleFetchNotification: (message: string, severity: Severity) => void;
}

const SubmissionOverview = ({ handleFetchNotification }: SubmissionProps) => {
  const [submissions, setSubmissions] = useState<
    SubmissionAdminOverviewEntry[]
  >([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionAdminOverviewEntry | null>(null);

  const terminalFitAddons = useRef<FitAddon[]>([]);
  const xTermRefs = useRef<Record<string, XTerm | null>>({});
  const xTermContents = useRef<Record<string, string>>({});

  const handleXTermRef = (
    submissionID: string,
    endpoint: string,
    index: number,
    instance: XTerm | null
  ) => {
    const key = `${submissionID}_${endpoint}`;
    if (xTermRefs.current[key]) {
      return;
    }
    xTermRefs.current[key] = instance;
    terminalFitAddons.current.push(new FitAddon());
    xTermRefs.current[key]?.terminal.loadAddon(
      terminalFitAddons.current[index]
    );
    resizeTerminals();
    handleXTermWrite(key);
    if (index !== 0) return;
    fetchTerminalsOfSubmission(submissionID);
  };

  const resizeTerminals = useCallback(() => {
    terminalFitAddons.current.forEach((fitAddon) => {
      fitAddon.fit();
    });
  }, []);

  useEffect(() => {
    fetchSubmissions();
    window.addEventListener("resize", resizeTerminals);
    return () => {
      window.removeEventListener("resize", resizeTerminals);
    };
  }, [resizeTerminals]);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch(
        APIRequest("/api/admin/submissions", {
          headers: { authorization: localStorage.getItem("token") || "" },
        })
      );
      const data = await response.json();
      setExpanded([]);
      setSubmissions(data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  };

  const fetchTerminalsOfSubmission = async (submissionID: string) => {
    try {
      const response = await fetch(
        APIRequest(
          `/api/admin/submission/${encodeURIComponent(submissionID)}/terminals`,
          {
            headers: { authorization: localStorage.getItem("token") || "" },
          }
        )
      );
      const data = await response.json();
      for (const terminal of data) {
        xTermContents.current[submissionID + "_" + terminal.endpoint] =
          terminal.state;
        handleXTermWrite(
          submissionID + "_" + terminal.endpoint,
          terminal.state
        );
      }
    } catch (error) {
      console.error("Error fetching terminals:", error);
    }
  };

  const groupSubmissionsByAssignmentAndGroup = (
    submissions: SubmissionAdminOverviewEntry[]
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

  const handleXTermWrite = (index: string, text: string | null = null) => {
    if (text) {
      xTermRefs.current[index]?.terminal.clear();
    } else {
      text = "Retrieving terminal input...\n";
    }
    if (xTermRefs.current[index]) {
      xTermRefs.current[index]?.terminal.write(text);
    }
  };

  const handleExpandAll = () => {
    const expandedArray = submissions.map(
      (submission) => submission.assignmentName
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
    submission: SubmissionAdminOverviewEntry
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedSubmission(submission);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSubmission(null);
  };

  const downloadFile = async (fileName: string, submissionID: string) => {
    fetch(
      APIRequest(
        `/api/admin/submission/${encodeURIComponent(
          submissionID
        )}/file/download/${encodeURIComponent(fileName)}`,
        {
          headers: { authorization: localStorage.getItem("token") || "" },
        }
      )
    )
      .then(async (response) => {
        if (!response.ok) {
          const messageObj = await response.json();
          throw new Error(messageObj.message);
        }
        return response.blob();
      })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
      })
      .catch((error) => {
        handleFetchNotification(error.message, "error");
      });
  };

  const downloadTerminalAsTextFile = async (
    index: string,
    fileName: string
  ) => {
    const element = document.createElement("a");
    const file = new Blob([xTermContents.current[index]], {
      type: "text/plain",
    });
    element.href = URL.createObjectURL(file);
    element.download = fileName + ".txt";
    document.body.appendChild(element);
    element.click();
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
              <Typography>{assignmentName}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {Object.entries(groupData).map(
                ([groupNumber, groupSubmissions]) => (
                  <Accordion
                    key={assignmentName + groupNumber}
                    expanded={expanded.includes(assignmentName + groupNumber)}
                    onChange={() =>
                      accordionClicked(assignmentName + groupNumber)
                    }
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls={`panel${assignmentName}-content-${groupNumber}`}
                      id={`panel${assignmentName}-header-${groupNumber}`}
                    >
                      <Typography>Group {groupNumber}</Typography>
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
                                <Typography>
                                  <strong>Username:</strong>
                                </Typography>
                                <Typography>
                                  <strong>Last Changed:</strong>
                                </Typography>
                              </Box>
                              <Box flex="1">
                                <Typography>{submission.username}</Typography>
                                <Typography>
                                  {new Date(
                                    submission.lastChanged
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
                            {submission.terminalEndpoints
                              .sort((a, b) => a.localeCompare(b))
                              .map(
                                (endpoint, index) =>
                                  (expanded.includes(
                                    assignmentName + groupNumber
                                  ) ||
                                    xTermRefs.current[
                                      `${submission.submissionID}_${endpoint}`
                                    ]) && (
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
                                          <Typography>
                                            <strong>{endpoint}</strong>
                                          </Typography>
                                        </Box>
                                        <Button
                                          variant="outlined"
                                          onClick={() =>
                                            downloadTerminalAsTextFile(
                                              `${submission.submissionID}_${endpoint}`,
                                              `${assignmentName}_${groupNumber}_${submission.username}_terminal_${index}`
                                            )
                                          }
                                        >
                                          Download as Text File
                                        </Button>
                                      </Box>
                                      <XTerm
                                        ref={(instance) =>
                                          handleXTermRef(
                                            submission.submissionID,
                                            endpoint,
                                            index,
                                            instance
                                          )
                                        }
                                        className="myXtermClass"
                                      />
                                    </Box>
                                  )
                              )}
                            {index < groupSubmissions.length - 1 && (
                              <Divider style={{ marginBottom: "8px" }} />
                            )}
                          </div>
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                )
              )}
            </AccordionDetails>
          </Accordion>
        )
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
                downloadFile(fileName, selectedSubmission.submissionID)
              }
            >
              {fileName}
            </MenuItem>
          ))}
      </Menu>
    </div>
  );
};

export default SubmissionOverview;
