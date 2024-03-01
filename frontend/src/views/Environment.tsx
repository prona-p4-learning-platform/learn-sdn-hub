import { Component } from "react";
import { withRouter } from "react-router-dom";
import { RouteComponentProps } from "react-router";
import ReactMarkdown from "react-markdown";
import mermaid from "mermaid";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Grid,
  Snackbar,
  Step,
  StepButton,
  Stepper,
  Typography,
} from "@mui/material";
import type { AlertColor } from "@mui/material";
import { FetchError } from "ofetch";
import { z } from "zod";

import { APIRequest, getHttpError, httpStatusValidator } from "../api/Request";
import Alert from "../components/Alert";
import FileEditor from "../components/FileEditor";
import GuacamoleClient from "../components/GuacamoleClient";
import TabControl from "../components/TabControl";
import Terminal from "../components/Terminal";
import TerminalTabs from "../components/TerminalTabs";
import WebFrame from "../components/WebFrame";

type Severity = AlertColor | undefined;

type PathParamsType = {
  environment: string;
};

type PropsType = RouteComponentProps<PathParamsType>;

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

type StateType = {
  environmentStatus: string;
  errorMessage: string;
  terminals: TerminalType[][];
  files: string[];
  filePaths: string[];
  assignment: string;
  environmentNotificationResult: string;
  environmentNotificationSeverity: Severity;
  environmentNotificationOpen: boolean;
  environmentNotificationAutoHideDuration: number | null;
  confirmationRestartDialogOpen: boolean;
  confirmationSubmitDialogOpen: boolean;
  stepNames: string[];
  stepLabels: string[];
  activeStep: number;
  stepsCompleted: boolean;
  terminalState: TerminalStateType[];
  providerInstanceStatus: string;
  rootPath: string;
  workspaceFolders: string[];
  useCollaboration: boolean;
  useLanguageClient: boolean;
};

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

class EnvironmentView extends Component<PropsType, StateType> {
  public state: StateType;

  constructor(props: PropsType) {
    super(props);
    this.state = {
      environmentStatus: "running",
      errorMessage: "",
      terminals: [],
      files: [],
      filePaths: [],
      assignment: "",
      terminalState: [],
      environmentNotificationResult: "",
      environmentNotificationSeverity: "info",
      environmentNotificationOpen: false,
      environmentNotificationAutoHideDuration: 6000,
      confirmationRestartDialogOpen: false,
      confirmationSubmitDialogOpen: false,
      stepNames: [],
      stepLabels: [],
      activeStep: 0,
      stepsCompleted: false,
      providerInstanceStatus: "",
      rootPath: "",
      workspaceFolders: [],
      useCollaboration: true,
      useLanguageClient: true,
    };
    this.restartEnvironment = this.restartEnvironment.bind(this);
    this.storeTerminalState = this.storeTerminalState.bind(this);
  }

  componentDidMount(): void {
    this.loadEnvironmentConfig();
    this.loadAssignment();
    this.loadProviderInstanceStatus();
  }

  async restartEnvironment(): Promise<void> {
    this.setState({
      environmentNotificationResult: "Restarting environment...",
      environmentNotificationSeverity: "info",
      environmentNotificationOpen: true,
      environmentNotificationAutoHideDuration: 6000,
      environmentStatus: "restarting",
    });

    try {
      await APIRequest(
        `/environment/${this.props.match.params.environment}/restart`,
        httpStatusValidator,
        {
          method: "POST",
        },
      );

      this.setState({
        environmentNotificationResult: "Restart successful...",
        environmentNotificationSeverity: "success",
        environmentNotificationOpen: true,
        environmentNotificationAutoHideDuration: 6000,
        environmentStatus: "running",
      });
    } catch (error) {
      let errorMessage = "Unknown error";

      if (error instanceof FetchError) {
        const httpError = await getHttpError(error);

        if (httpError.success) errorMessage = httpError.data.message;
        else errorMessage = httpError.error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      this.setState({
        environmentNotificationResult: `Restart failed! (${errorMessage})`,
        environmentNotificationSeverity: "error",
        environmentNotificationOpen: true,
        environmentNotificationAutoHideDuration: 6000,
        environmentStatus: "error",
        errorMessage: errorMessage,
      });
    }
  }

  async checkStepTest(): Promise<void> {
    // should send terminalState (maybe even editorState) if needed to backend and wait for result of test
    this.setState({
      environmentNotificationResult: "Testing step result...",
      environmentNotificationSeverity: "info",
      environmentNotificationAutoHideDuration: 6000,
      environmentNotificationOpen: true,
    });

    try {
      const payload = await APIRequest(
        `/environment/${this.props.match.params.environment}/test`,
        httpStatusValidator,
        {
          method: "POST",
        },
      );

      if (payload.success) {
        this.setState({
          environmentNotificationResult: payload.data.message,
          environmentNotificationSeverity: "success",
          environmentNotificationAutoHideDuration: 60000,
          environmentNotificationOpen: true,
        });

        if (this.state.activeStep < this.state.stepLabels.length) {
          this.setState({
            activeStep: this.state.activeStep + 1,
          });
        }
        // if this was the last step, steps are completed and finish / submission of assignment can be enabled
        if (this.state.activeStep === this.state.stepLabels.length) {
          this.setState({
            stepsCompleted: true,
          });
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

      this.setState({
        environmentNotificationResult: `Test failed! (${errorMessage})`,
        environmentNotificationSeverity: "error",
        environmentNotificationOpen: true,
        environmentNotificationAutoHideDuration: 60000,
        errorMessage: errorMessage,
      });
    }
  }

  async submitAssignment(): Promise<void> {
    // send state of assignment to backend and store/persist result of assignment (for user) there
    this.setState({
      environmentNotificationResult: "Submitting result...",
      environmentNotificationSeverity: "info",
      environmentNotificationAutoHideDuration: 6000,
      environmentNotificationOpen: true,
    });

    try {
      const payload = await APIRequest(
        `/environment/${this.props.match.params.environment}/submit`,
        httpStatusValidator,
        {
          method: "POST",
          body: {
            activeStep: this.state.activeStep,
            terminalState: this.state.terminalState,
          },
        },
      );

      if (payload.success) {
        this.setState({
          environmentNotificationResult:
            "Submission successful! " + payload.data.message,
          environmentNotificationSeverity: "success",
          environmentNotificationAutoHideDuration: 60000,
          environmentNotificationOpen: true,
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

      this.setState({
        environmentNotificationResult: `Submission failed! (${errorMessage})`,
        environmentNotificationSeverity: "error",
        environmentNotificationOpen: true,
        environmentNotificationAutoHideDuration: 60000,
        errorMessage,
      });
    }
  }

  loadEnvironmentConfig(): void {
    APIRequest(
      `/environment/${this.props.match.params.environment}/configuration`,
      environmentConfigurationValidator,
    )
      .then((payload) => {
        if (payload.success) {
          this.setState(payload.data);

          if (this.state.stepLabels.length < 1) {
            this.setState({ stepsCompleted: true });
          }
        } else throw payload.error;
      })
      .catch((reason: unknown) => {
        console.log("DEBUG: loadEnvironmentConfig failed");
        console.log(reason);
      });
  }

  loadAssignment() {
    APIRequest(
      `/environment/${this.props.match.params.environment}/assignment`,
      environmentAssignmentValidator,
    )
      .then((payload) => {
        if (payload.success) {
          this.setState({ assignment: payload.data.content });
        } else throw payload.error;
      })
      .catch((reason: unknown) => {
        console.log("DEBUG: loadAssignment failed");
        console.log(reason);
      });
  }

  loadProviderInstanceStatus() {
    APIRequest(
      `/environment/${this.props.match.params.environment}/provider-instance-status`,
      httpStatusValidator,
    )
      .then((payload) => {
        if (payload.success) {
          this.setState({ providerInstanceStatus: payload.data.message });
        }
      })
      .catch((reason: unknown) => {
        console.log("DEBUG: loadProviderInstanceStatus failed");
        console.log(reason);
      });
  }

  storeTerminalState(endpoint: string, state: string) {
    this.setState((prevState) => {
      const newTerminalState: TerminalStateType = {
        endpoint: endpoint,
        state: state,
      };
      const endpointIndex = prevState.terminalState.findIndex(
        (element) => element.endpoint === endpoint,
      );
      if (endpointIndex === -1) {
        const addedTerminalState = [
          ...prevState.terminalState,
          newTerminalState,
        ];
        return {
          terminalState: addedTerminalState,
        };
      } else {
        const changedTerminalState = [...prevState.terminalState];
        changedTerminalState[endpointIndex] = newTerminalState;
        return {
          terminalState: changedTerminalState,
        };
      }
    });
  }

  getTerminalState(endpoint: string): string | undefined {
    return this.state.terminalState.find(
      (element) => element.endpoint === endpoint,
    )?.state;
  }

  componentDidUpdate() {
    mermaid
      .init({}, document.querySelectorAll("code.language-mermaid"))
      .catch((reason: unknown) => {
        console.log("DEBUG: Initializing mermaid failed");
        console.log(reason);
      });
  }

  render() {
    const terminalTabNames = new Array<string>();
    const terminals = this.state.terminals.map((subterminals: TerminalType[]) =>
      subterminals.map((subterminal, index) => {
        terminalTabNames.push(subterminal.name);

        if (subterminal.type === "Shell") {
          return (
            <Terminal
              key={subterminal.name}
              wsEndpoint={`/environment/${this.props.match.params.environment}/type/${subterminal.name}`}
              terminalState={this.getTerminalState(
                `/environment/${this.props.match.params.environment}/type/${subterminal.name}`,
              )}
              onTerminalUnmount={this.storeTerminalState.bind(this)}
            />
          );
        }

        if (subterminal.type === "Desktop") {
          return (
            <GuacamoleClient
              key={subterminal.name}
              alias={subterminal.name}
              environment={this.props.match.params.environment}
              wsEndpoint={`/environment/${this.props.match.params.environment}/desktop/${subterminal.name}`}
            />
          );
        }

        // if new types of terminals are added this condition is necessary
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (subterminal.type === "WebApp") {
          return <WebFrame key={subterminal.name} url={subterminal.url} />;
        } else {
          return <Typography key={index}>unknown terminal type</Typography>;
        }
      }),
    );

    const handleEnvironmentNotificationClose = () => {
      this.setState({ environmentNotificationOpen: false });
    };

    const handleConfirmationRestartDialogOpen = () => {
      this.setState({ confirmationRestartDialogOpen: true });
    };

    const handleConfirmationRestartDialogClose = () => {
      this.setState({ confirmationRestartDialogOpen: false });
    };

    const handleConfirmationRestartDialogConfirm = () => {
      void this.restartEnvironment();
      this.setState({ confirmationRestartDialogOpen: false });
    };

    const handleConfirmationSubmitDialogOpen = () => {
      this.setState({ confirmationSubmitDialogOpen: true });
    };

    const handleConfirmationSubmitDialogClose = () => {
      this.setState({ confirmationSubmitDialogOpen: false });
    };

    const handleConfirmationSubmitDialogConfirm = () => {
      void this.submitAssignment();
      this.setState({ confirmationSubmitDialogOpen: false });
    };

    const handleStepClick = () => {
      void this.checkStepTest();
    };

    return (
      <>
        <Grid container spacing={0}>
          <Grid item xs={6}>
            <TabControl
              tabNames={["Assignment", "Terminals"]}
              handleRestart={handleConfirmationRestartDialogOpen}
              environmentStatus={this.state.environmentStatus}
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
                    {this.state.assignment}
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
                    {this.state.stepLabels.length > 0 && (
                      <Grid item>
                        <Stepper activeStep={this.state.activeStep}>
                          {Array.isArray(this.state.stepLabels) &&
                            this.state.stepLabels.length > 0 &&
                            this.state.stepLabels.map((stepLabel, index) => (
                              <Step key={index}>
                                <StepButton
                                  disabled={index !== this.state.activeStep}
                                  key={index}
                                  onClick={handleStepClick}
                                >
                                  {stepLabel}
                                </StepButton>
                              </Step>
                            ))}
                        </Stepper>
                      </Grid>
                    )}
                    <Grid item>
                      <Typography variant="body2">
                        {this.state.providerInstanceStatus}
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleConfirmationSubmitDialogOpen}
                        disabled={!this.state.stepsCompleted}
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
                  {this.state.environmentStatus === "running" && (
                    <TerminalTabs tabNames={terminalTabNames}>
                      {terminals}
                    </TerminalTabs>
                  )}
                </Grid>
              </Grid>
            </TabControl>
          </Grid>
          <Grid item xs={6}>
            {this.state.files.length > 0 ? (
              <FileEditor
                files={this.state.files}
                filePaths={this.state.filePaths}
                environment={this.props.match.params.environment}
                rootPath={this.state.rootPath}
                workspaceFolders={this.state.workspaceFolders}
                useCollaboration={this.state.useCollaboration}
                useLanguageClient={this.state.useLanguageClient}
              />
            ) : (
              <Typography>Fetching files to initialize editor...</Typography>
            )}
          </Grid>
        </Grid>
        {/* TODO evaluate, e.g., notistack (https://github.com/iamhosseindhv/notistack) to show stacked version of multiple lines with PASSED/FAILED tests */}
        <Snackbar
          open={this.state.environmentNotificationOpen}
          autoHideDuration={this.state.environmentNotificationAutoHideDuration}
          onClose={handleEnvironmentNotificationClose}
        >
          <Alert
            onClose={handleEnvironmentNotificationClose}
            severity={this.state.environmentNotificationSeverity}
          >
            {this.state.environmentNotificationResult}
          </Alert>
        </Snackbar>
        <Dialog
          open={this.state.confirmationRestartDialogOpen}
          onClose={handleConfirmationRestartDialogClose}
          aria-describedby="alert-dialog-restart-confirmation-description"
        >
          <DialogContent>
            <DialogContentText id="alert-dialog-restart-confirmation-description">
              Restart environment? All processes in terminals will be killed.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleConfirmationRestartDialogClose}
              color="primary"
              autoFocus
            >
              No
            </Button>
            <Button
              onClick={handleConfirmationRestartDialogConfirm}
              color="primary"
            >
              Yes
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={this.state.confirmationSubmitDialogOpen}
          onClose={handleConfirmationSubmitDialogClose}
          aria-describedby="alert-dialog-submit-confirmation-description"
        >
          <DialogContent>
            <DialogContentText id="alert-dialog-submit-confirmation-description">
              Finish and submit assignment result?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleConfirmationSubmitDialogClose}
              color="primary"
              autoFocus
            >
              No
            </Button>
            <Button
              onClick={handleConfirmationSubmitDialogConfirm}
              color="primary"
            >
              Yes
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
}

const Environment = withRouter(EnvironmentView);

export default Environment;
