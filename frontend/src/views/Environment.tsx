import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Grid,
  Step,
  StepButton,
  Stepper,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import mermaid from "mermaid";
import ReactMarkdown from "react-markdown";
import { FetchError } from "ofetch";
import { z } from "zod";

import Terminal from "../components/Terminal";
import GuacamoleClient from "../components/GuacamoleClient";
import WebFrame from "../components/WebFrame";
import TabControl from "../components/TabControl";
import TerminalTabs from "../components/TerminalTabs";
import FileEditor from "../components/FileEditor";

import { useOptionsStore } from "../stores/optionsStore";
import { APIRequest, httpStatusValidator, getHttpError } from "../api/Request";

const environmentConfigurationValidator = z.object({
  files: z.array(z.string()),
  filePaths: z.array(z.string()),
  terminals: z.array(
    z.array(
      z.union([
        z.object({
          type: z.literal("Shell"),
          name: z.string(),
          executable: z.string(),
          cwd: z.string(),
          params: z.array(z.string()),
          provideTty: z.boolean(),
        }),
        z.object({
          type: z.literal("WebApp"),
          name: z.string(),
          url: z.string(),
        }),
        z.object({
          type: z.literal("Desktop"),
          name: z.string(), // TODO: backend sends far more elements but types in frontend do not match?
        }),
      ]),
    ),
  ),
  stepNames: z.array(z.string()),
  stepLabels: z.array(z.string()),
  rootPath: z.string().default(""), // TODO: setting defaults here as backend might send undefined
  workspaceFolders: z.array(z.string()).default([]),
  useCollaboration: z.boolean().default(false),
  useLanguageClient: z.boolean().default(false),
});

const environmentAssignmentValidator = z.object({
  content: z.string(),
});

export type TerminalStateType = {
  endpoint: string;
  state: string;
};

export interface Shell {
  type: "Shell";
  executable: string;
  cwd: string;
  params: string[];
  provideTty: boolean;
  name: string;
}

export interface WebApp {
  type: "WebApp";
  url: string;
  name: string;
}

export interface Desktop {
  type: "Desktop";
  name: string;
  //websocketUrl: string;
}

export type TerminalType = Shell | Desktop | WebApp;

type EnvironmentState = {
  terminals: TerminalType[][];
  files: string[];
  filePaths: string[];
  stepNames: string[];
  stepLabels: string[];
  rootPath: string;
  workspaceFolders: string[];
  useCollaboration: boolean;
  useLanguageClient: boolean;
};

function Environment(): JSX.Element {
  const { environmentName } = useParams();
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const { darkMode } = useOptionsStore();
  const [graphs, setGraphs] = useState<string[]>([]);
  const [assignment, setAssignment] = useState<string>("");
  const [instanceStatus, setInstanceStatus] = useState<string>("");
  const [environmentStatus, setEnvironmentStatus] = useState<string>("running");
  const [state, setState] = useState<EnvironmentState>({
    terminals: [],
    files: [],
    filePaths: [],
    stepNames: [],
    stepLabels: [],
    rootPath: "",
    workspaceFolders: [],
    useCollaboration: true,
    useLanguageClient: true,
  });
  const [terminalState, setTerminalState] = useState<TerminalStateType[]>([]);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [stepsCompleted, setStepsCompleted] = useState<boolean>(false);
  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const loadEnvironmentConfig = useCallback(() => {
    APIRequest(
      `/environment/${environmentName}/configuration`,
      environmentConfigurationValidator,
    )
      .then((payload) => {
        if (payload.success) {
          // check for completion
          if (payload.data.stepLabels.length < 1) {
            setStepsCompleted(true);
          }
          setState(payload.data);
        } else throw payload.error;
      })
      .catch((reason: unknown) => {
        console.log("DEBUG: loadEnvironmentConfig failed");
        console.log(reason);
      });
  }, [environmentName]);

  const loadAssignment = useCallback(() => {
    APIRequest(
      `/environment/${environmentName}/assignment`,
      environmentAssignmentValidator,
    )
      .then((payload) => {
        if (payload.success) {
          setAssignment(payload.data.content);
        } else throw payload.error;
      })
      .catch((reason: unknown) => {
        console.log("DEBUG: loadAssignment failed");
        console.log(reason);
      });
  }, [environmentName]);

  const loadProviderInstanceStatus = useCallback(() => {
    APIRequest(
      `/environment/${environmentName}/provider-instance-status`,
      httpStatusValidator,
    )
      .then((payload) => {
        if (payload.success) {
          setInstanceStatus(payload.data.message);
        }
      })
      .catch((reason: unknown) => {
        console.log("DEBUG: loadProviderInstanceStatus failed");
        console.log(reason);
      });
  }, [environmentName]);

  function handleRestartDialogOpen() {
    setShowRestartDialog(true);
  }

  function handleRestartDialogClose() {
    setShowRestartDialog(false);
  }

  function handleRestartDialogConfirm() {
    void restartEnvironment();
    setShowRestartDialog(false);
  }

  function handleSubmitDialogOpen() {
    setShowSubmitDialog(true);
  }

  function handleSubmitDialogClose() {
    setShowSubmitDialog(false);
  }

  function handleSubmitDialogConfirm() {
    void submitAssignment();
    setShowSubmitDialog(false);
  }

  async function checkStepTest() {
    // should send terminalState (maybe even editorState) if needed to backend and wait for result of test
    const testSnack = enqueueSnackbar("Testing step result...", {
      variant: "info",
      persist: true,
    });

    try {
      const payload = await APIRequest(
        `/environment/${environmentName}/test`,
        httpStatusValidator,
        {
          method: "POST",
          body: {
            activeStep: activeStep,
            terminalState: terminalState,
          },
        },
      );

      if (payload.success) {
        if (payload.data.status === "passed") {
          enqueueSnackbar("Test passed!", { variant: "success" });

          if (activeStep < state.stepLabels.length) {
            setActiveStep(activeStep + 1);
          }
          // if this was the last step, steps are completed and finish / submission of assignment can be enabled
          if (activeStep === state.stepLabels.length) {
            setStepsCompleted(true);
          }
        } else {
          enqueueSnackbar(payload.data.message, { variant: "error" });
        }
      } else throw payload.error;
    } catch (error) {
      let errorMessage = "Unknown error";

      if (error instanceof FetchError) {
        const httpError = await getHttpError(error);

        if (httpError.success) errorMessage = httpError.data.message;
        else errorMessage = httpError.error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      enqueueSnackbar(`Test failed! (${errorMessage})`, { variant: "error" });
    }

    closeSnackbar(testSnack);
  }

  async function restartEnvironment() {
    const restartSnack = enqueueSnackbar("Restarting environment...", {
      variant: "info",
      persist: true,
    });
    setEnvironmentStatus("restarting");

    try {
      await APIRequest(
        `/environment/${environmentName}/restart`,
        httpStatusValidator,
        {
          method: "POST",
        },
      );

      enqueueSnackbar("Restart successful!", { variant: "success" });
      setEnvironmentStatus("running");
    } catch (error) {
      let errorMessage = "Unknown error";

      if (error instanceof FetchError) {
        const httpError = await getHttpError(error);

        if (httpError.success) errorMessage = httpError.data.message;
        else errorMessage = httpError.error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      enqueueSnackbar(`Restart failed! (${errorMessage})`, {
        variant: "error",
      });
      setEnvironmentStatus("error");
    }

    closeSnackbar(restartSnack);
  }

  async function submitAssignment() {
    // send state of assignment to backend and store/persist result of assignment (for user) there
    const submitSnack = enqueueSnackbar("Submitting result...", {
      variant: "info",
      persist: true,
    });

    try {
      const payload = await APIRequest(
        `/environment/${environmentName}/submit`,
        httpStatusValidator,
        {
          method: "POST",
          body: {
            activeStep: activeStep,
            terminalState: terminalState,
          },
        },
      );

      if (payload.success) {
        enqueueSnackbar("Submission successful! " + payload.data.message, {
          variant: "success",
        });
      } else throw payload.error;
    } catch (error) {
      let errorMessage = "Unknown error";

      if (error instanceof FetchError) {
        const httpError = await getHttpError(error);

        if (httpError.success) errorMessage = httpError.data.message;
        else errorMessage = httpError.error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      enqueueSnackbar(`Submission failed! (${errorMessage})`, {
        variant: "error",
      });
    }

    closeSnackbar(submitSnack);
  }

  function storeTerminalState(endpoint: string, current: string) {
    const newTerminalState: TerminalStateType = {
      endpoint: endpoint,
      state: current,
    };
    const endpointIndex = terminalState.findIndex(
      (element) => element.endpoint === endpoint,
    );

    const states = [...terminalState];
    if (endpointIndex === -1) {
      states.push(newTerminalState);
    } else {
      states[endpointIndex] = newTerminalState;
    }

    setTerminalState(states);
  }

  function getTerminalState(endpoint: string) {
    return terminalState.find((element) => element.endpoint === endpoint)
      ?.state;
  }

  useEffect(() => {
    // TODO: offload into router loader
    loadEnvironmentConfig();
    loadAssignment();
    loadProviderInstanceStatus();
  }, [loadEnvironmentConfig, loadAssignment, loadProviderInstanceStatus]);

  useEffect(() => {
    // initialize mermaid with every color mode change
    mermaid.initialize({
      theme: darkMode ? "dark" : "default",
    });
  }, [darkMode]);

  useEffect(() => {
    // save mermaid graphs from markdown as code blocks are removed from the DOM...
    // -> we do this every time the assignment changes (best case scenario: only once)
    const elements = document.querySelectorAll("code.language-mermaid");
    const newGraphs: string[] = [];

    for (const element of elements) {
      newGraphs.push(element.innerHTML);
    }

    setGraphs(newGraphs);
  }, [assignment]);

  useEffect(() => {
    // render mermaid graphs in every render call
    const elements = document.querySelectorAll<HTMLElement>("code.language-mermaid");

    // remove processed data attribute and replace content with saved graph code
    for (let i = 0; i < elements.length; i++) {
      const currentElement = elements[i];
      const isTagged = currentElement.hasAttribute("data-processed");

      if (isTagged) {
        currentElement.removeAttribute("data-processed");
        currentElement.innerHTML = graphs[i];
      }
    }

    // after code blocks are restored, render mermaid graphs
    mermaid
      .run({ nodes: elements })
      .catch((reason: unknown) => {
        console.log("DEBUG: Initializing mermaid failed\n", reason);
      });
  });

  return (
    <>
      <Grid container spacing={0}>
        <Grid item xs={6}>
          <TabControl
            tabNames={["Assignment", "Terminals"]}
            handleRestart={handleRestartDialogOpen}
            environmentStatus={environmentStatus}
          >
            <Grid
              container
              direction="row"
              justifyContent="flex-start"
              alignItems="center"
              spacing={1}
            >
              <Grid item xs={12}>
                <ReactMarkdown className="myMarkdownContainer">
                  {assignment}
                </ReactMarkdown>
              </Grid>
              <Grid item xs={12}>
                <Grid
                  container
                  direction="row"
                  justifyContent="flex-start"
                  alignItems="center"
                  spacing={1}
                >
                  {state.stepLabels.length > 0 && (
                    <Grid item>
                      <Stepper activeStep={activeStep}>
                        {Array.isArray(state.stepLabels) &&
                          state.stepLabels.length > 0 &&
                          state.stepLabels.map((stepLabel, index) => (
                            <Step key={index}>
                              <StepButton
                                disabled={index !== activeStep}
                                key={index}
                                onClick={() => {
                                  void checkStepTest();
                                }}
                              >
                                {stepLabel}
                              </StepButton>
                            </Step>
                          ))}
                      </Stepper>
                    </Grid>
                  )}
                  <Grid item>
                    <Typography variant="body2">{instanceStatus}</Typography>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSubmitDialogOpen}
                      disabled={!stepsCompleted}
                    >
                      Finish & Submit
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid
              container
              direction="row"
              justifyContent="flex-start"
              alignItems="center"
              spacing={1}
            >
              <Grid item>
                {(() => {
                  if (environmentStatus === "running" && environmentName) {
                    const terminalTabNames = new Array<string>();
                    const terminals = state.terminals.map(
                      (subterminals: TerminalType[]) =>
                        subterminals.map((subterminal, index) => {
                          terminalTabNames.push(subterminal.name);

                          if (subterminal.type === "Shell") {
                            return (
                              <Terminal
                                key={subterminal.name}
                                wsEndpoint={`/environment/${environmentName}/type/${subterminal.name}`}
                                terminalState={getTerminalState(
                                  `/environment/${environmentName}/type/${subterminal.name}`,
                                )}
                                onTerminalUnmount={storeTerminalState}
                              />
                            );
                          }

                          if (subterminal.type === "Desktop") {
                            return (
                              <GuacamoleClient
                                key={subterminal.name}
                                alias={subterminal.name}
                                environment={environmentName}
                                wsEndpoint={`/environment/${environmentName}/desktop/${subterminal.name}`}
                              />
                            );
                          }

                          if (subterminal.type === "WebApp") {
                            return (
                              <WebFrame
                                key={subterminal.name}
                                url={subterminal.url}
                              />
                            );
                          } else {
                            return (
                              <Typography key={index}>
                                unknown terminal type
                              </Typography>
                            );
                          }
                        }),
                    );

                    return (
                      <TerminalTabs tabNames={terminalTabNames}>
                        {terminals}
                      </TerminalTabs>
                    );
                  } else return null;
                })()}
              </Grid>
            </Grid>
          </TabControl>
        </Grid>
        <Grid item xs={6}>
          {state.files.length > 0 && environmentName ? (
            <FileEditor
              files={state.files}
              filePaths={state.filePaths}
              environment={environmentName}
              rootPath={state.rootPath}
              workspaceFolders={state.workspaceFolders}
              useCollaboration={state.useCollaboration}
              useLanguageClient={state.useLanguageClient}
            />
          ) : (
            <Typography>Fetching files to initialize editor...</Typography>
          )}
        </Grid>
      </Grid>
      <Dialog
        open={showRestartDialog}
        onClose={handleRestartDialogClose}
        aria-describedby="alert-dialog-restart-confirmation-description"
      >
        <DialogContent>
          <DialogContentText id="alert-dialog-restart-confirmation-description">
            Restart environment? All processes in terminals will be killed.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRestartDialogClose} color="primary" autoFocus>
            No
          </Button>
          <Button onClick={handleRestartDialogConfirm} color="primary">
            Yes
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={showSubmitDialog}
        onClose={handleSubmitDialogClose}
        aria-describedby="alert-dialog-submit-confirmation-description"
      >
        <DialogContent>
          <DialogContentText id="alert-dialog-submit-confirmation-description">
            Finish and submit assignment result?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSubmitDialogClose} color="primary" autoFocus>
            No
          </Button>
          <Button onClick={handleSubmitDialogConfirm} color="primary">
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export const Component = Environment;
export default Environment;
