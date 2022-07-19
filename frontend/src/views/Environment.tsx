import React from "react";
import Grid from "@mui/material/Grid";
import Terminal from "../components/Terminal";
import TerminalTabs from "../components/TerminalTabs";
import { withRouter } from "react-router-dom";
import { RouteComponentProps } from "react-router";
import Button from "@mui/material/Button";
import { ReactNode } from "react";
import ReactMarkdown from 'react-markdown'
import mermaid from 'mermaid'
import TabControl from '../components/TabControl'
import APIRequest from '../api/Request'
import { Typography } from "@mui/material";
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import FileEditor from "../components/FileEditor";
import { Position } from "monaco-editor";
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';

type Severity = "error" | "success" | "info" | "warning" | undefined;

type PathParamsType = {
  environment: string;
};

type PropsType = RouteComponentProps<PathParamsType> & {};

export type TerminalStateType = {
  endpoint: string;
  state: string;
}

type EditorStateType = {
  endpoint: string;
  code: string;
  fileChanged: boolean;
  filePath: string;
  position: Position;
}

type StateType = {
  environmentStatus: string;
  errorMessage: string;
  ttyTabs: string[];
  ttys: string[][];
  files: string[];
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
  editorState: EditorStateType[];
  providerInstanceStatus: string;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

export class EnvironmentView extends React.Component<PropsType,StateType> {
  public state: StateType;

  constructor(props: PropsType) {
    super(props);
    this.state = {
      environmentStatus: "running",
      errorMessage: "",
      ttyTabs: [],
      ttys: [],
      files: [],
      assignment: "",
      terminalState: [],
      editorState: [],
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
      providerInstanceStatus: ""
    };
    this.restartEnvironment = this.restartEnvironment.bind(this)
    this.storeTerminalState = this.storeTerminalState.bind(this)
    this.storeEditorState = this.storeEditorState.bind(this)
  }

  componentDidMount(): void {
    this.loadEnvironmentConfig()
    this.loadAssignment()
    this.loadProviderInstanceStatus()
  }

  async restartEnvironment(): Promise<void> {
    this.setState({
      environmentNotificationResult: "Restarting environment...",
      environmentNotificationSeverity: "info",
      environmentNotificationOpen: true,
      environmentNotificationAutoHideDuration: 6000,
      environmentStatus: "restarting"
    });
    try {
      const result = await fetch(APIRequest(`/api/environment/${this.props.match.params.environment}/restart`, {
        method: "post",
        headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" }
      }))
      if (result.status === 200) {
        this.setState({
          environmentNotificationResult: "Restart successful...",
          environmentNotificationSeverity: "success",
          environmentNotificationOpen: true,
          environmentNotificationAutoHideDuration: 6000,
          environmentStatus: "running"
        });
      }
      else {
        const message = await result.json()
        this.setState({
          environmentNotificationResult: "Restart failed! (" + message.message + ")",
          environmentNotificationSeverity: "error",
          environmentNotificationOpen: true,
          environmentNotificationAutoHideDuration: 6000,
          environmentStatus: "error", 
          errorMessage: message.message
        });
      }
    }
    catch (error) {
      this.setState({
        environmentNotificationResult: "Restart failed! (" + error + ")",
        environmentNotificationSeverity: "error",
        environmentNotificationOpen: true,
        environmentNotificationAutoHideDuration: 6000,
        environmentStatus: "error", 
        errorMessage: String(error)
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
      const result = await fetch(APIRequest(`/api/environment/${this.props.match.params.environment}/test`, {
        method: "post",
        headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" },
        body: JSON.stringify({activeStep: this.state.activeStep, terminalState: this.state.terminalState})
      }))
      if (result.status === 200) {
        const message = await result.json()
        this.setState({
          environmentNotificationResult: message.message,
          environmentNotificationSeverity: "success",
          environmentNotificationAutoHideDuration: 60000,
          environmentNotificationOpen: true,
        });

        if (this.state.activeStep < this.state.stepLabels.length) {
          this.setState({
            activeStep: this.state.activeStep + 1
          });
        }
        // if this was the last step, steps are completed and finish / submission of assignment can be enabled
        if (this.state.activeStep === this.state.stepLabels.length) {
          this.setState({
            stepsCompleted: true
          });
        }
      }
      else {
        const message = await result.json()
        this.setState({
          environmentNotificationResult: "Test failed! (" + message.message + ")",
          environmentNotificationSeverity: "error",
          environmentNotificationOpen: true,
          environmentNotificationAutoHideDuration: 60000,
          errorMessage: message.message
        });
      }
    }
    catch (error) {
      this.setState({
        environmentNotificationResult: "Test failed! (" + error + ")",
        environmentNotificationSeverity: "error",
        environmentNotificationOpen: true,
        environmentNotificationAutoHideDuration: 60000,
        errorMessage: String(error)
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
        const result = await fetch(APIRequest(`/api/environment/${this.props.match.params.environment}/submit`, {
          method: "post",
          headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" },
          body: JSON.stringify({activeStep: this.state.activeStep, terminalState: this.state.terminalState})
        }))
        if (result.status === 200) {
          const message = await result.json()
          this.setState({
            environmentNotificationResult: "Submission successful! " + message.message,
            environmentNotificationSeverity: "success",
            environmentNotificationAutoHideDuration: 60000,
            environmentNotificationOpen: true,
          });
        }
        else {
          const message = await result.json()
          this.setState({
            environmentNotificationResult: "Submission failed! (" + message.message + ")",
            environmentNotificationSeverity: "error",
            environmentNotificationOpen: true,
            environmentNotificationAutoHideDuration: 60000,
            errorMessage: message.message
          });
        }
      }
      catch (error) {
        this.setState({
          environmentNotificationResult: "Submission failed! (" + error + ")",
          environmentNotificationSeverity: "error",
          environmentNotificationOpen: true,
          environmentNotificationAutoHideDuration: 60000,
          errorMessage: String(error)
        });
      }
  }

  loadEnvironmentConfig(): void {
    fetch(APIRequest(`/api/environment/${this.props.match.params.environment}/configuration`,
      { headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" } }))
      .then((response) => response.json())
      .then((data) => {
        if (data.error !== true) {
          this.setState({ ttyTabs: data.ttyTabs, ttys: data.ttys, files: data.files, stepNames: data.stepNames, stepLabels: data.stepLabels });
        }
        if (this.state.stepLabels.length < 1) {
          this.setState({ stepsCompleted: true })
        }
      });
  }

  loadAssignment() {
    fetch(APIRequest(`/api/environment/${this.props.match.params.environment}/assignment`,
      { headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" } }))
      .then((response) => response.text())
      .then((data) => {
        this.setState({ assignment: data });
      });
  }

  loadProviderInstanceStatus() {
    fetch(APIRequest(`/api/environment/${this.props.match.params.environment}/provider-instance-status`,
      { headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" } }))
      .then((response) => response.json())
      .then((data) => {
        this.setState({ providerInstanceStatus: data.status });
      });
  }

  storeTerminalState(endpoint: string, state: string) {
    this.setState((prevState) => {
      const newTerminalState: TerminalStateType = {
        endpoint: endpoint,
        state: state
      };
      const endpointIndex = prevState.terminalState.findIndex(element => element.endpoint === endpoint);
      if ( endpointIndex === -1 ) {
        const addedTerminalState = [...prevState.terminalState, newTerminalState];
        return {
          terminalState: addedTerminalState
        }
      } else {
        let changedTerminalState = [...prevState.terminalState]
        changedTerminalState[endpointIndex] = newTerminalState;
        return {
          terminalState: changedTerminalState
        }
      }
    })
  }

  getTerminalState(endpoint: string): string | undefined {
    return this.state.terminalState.find(element => element.endpoint === endpoint)?.state;
  }

  storeEditorState(endpoint: string, code: string, fileChanged: boolean, filePath: string, position: Position) {
    // currently monaco does not support serialization, so only file content, change status, file path and cursor/scroll position is preserved on changing file tabs, 
    // when reloading the entire page, changes will be lost however, this maybe also needs to be fixed for terminals, but it seams like a proper multi-session
    // and/or collaboration handling for terminals and editors will address this/would be more appropriate
    this.setState((prevState) => {
      const newEditorState: EditorStateType = {
        endpoint: endpoint,
        code: code,
        fileChanged: fileChanged,
        filePath: filePath,
        position: position
      };
      const endpointIndex = prevState.editorState.findIndex(element => element.endpoint === endpoint);
      if ( endpointIndex === -1 ) {
        const addedEditorState = [...prevState.editorState, newEditorState];
        return {
          editorState: addedEditorState
        }
      } else {
        let changedEditorState = [...prevState.editorState]
        changedEditorState[endpointIndex] = newEditorState;
        return {
          editorState: changedEditorState
        }
      }
    })
  }

  getEditorState(endpoint: string): EditorStateType | undefined {
    return this.state.editorState.find(element => element.endpoint === endpoint);
  }

  componentDidUpdate() {
    mermaid.init(document.querySelectorAll('code.language-mermaid'))
  }

  render(): ReactNode {
    const terminals = this.state.ttys.map((tasks: string[], index: number) => 
      tasks.map((alias: string) =>
          <Terminal key={alias} wsEndpoint={`/environment/${this.props.match.params.environment}/type/${alias}`}
            terminalState={this.getTerminalState(`/environment/${this.props.match.params.environment}/type/${alias}`)} onTerminalUnmount={this.storeTerminalState} />
      )
    );

    //const editors = this.state.files.map((fileAlias: string) =>
    //  <P4Editor key={fileAlias} endpoint={`/api/environment/${this.props.match.params.environment}/file/${fileAlias}`} 
    //    editorState={this.getEditorState(`/api/environment/${this.props.match.params.environment}/file/${fileAlias}`)} onEditorUnmount={this.storeEditorState} />
    //);

    const handleEnvironmentNotificationClose = () => {
      this.setState({ environmentNotificationOpen: false })
    };

    const handleConfirmationRestartDialogOpen = () => {
      this.setState({ confirmationRestartDialogOpen: true });
    };

    const handleConfirmationRestartDialogClose = () => {
      this.setState({ confirmationRestartDialogOpen: false });
    };

    const handleConfirmationRestartDialogConfirm = () => {
      this.restartEnvironment();
      this.setState({ confirmationRestartDialogOpen: false });
    };

    const handleConfirmationSubmitDialogOpen = () => {
      this.setState({ confirmationSubmitDialogOpen: true });
    };

    const handleConfirmationSubmitDialogClose = () => {
      this.setState({ confirmationSubmitDialogOpen: false });
    };

    const handleConfirmationSubmitDialogConfirm = () => {
      this.submitAssignment();
      this.setState({ confirmationSubmitDialogOpen: false });
    };

    const handleStepClick = () => {
      this.checkStepTest();
    }

    return (
      <>
        <Grid container spacing={0}>
          <Grid item xs={6}>
            <TabControl tabNames={["Assignment", "Terminals"]}>
              <Grid container direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
                <Grid item xs={12}>
                  <ReactMarkdown
                    children={this.state.assignment} className="myMarkdownContainer"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Grid container direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
                    {this.state.stepLabels.length > 0 && (
                      <Grid item>
                        <Stepper activeStep={this.state.activeStep}>
                        {Array.isArray(this.state.stepLabels) && this.state.stepLabels.length > 0 && this.state.stepLabels.map((stepLabel, index) =>
                          <Step key={index}>
                            <StepButton disabled={index !== this.state.activeStep} key={index} onClick={handleStepClick}>{stepLabel}</StepButton>
                          </Step>
                        )}
                        </Stepper>
                      </Grid>
                    )}
                    <Grid item>
                      <Typography variant="body2">{this.state.providerInstanceStatus}</Typography>
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
              <Grid container direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
                <Grid container direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
                  <Grid item>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleConfirmationRestartDialogOpen}
                      sx={{ mt: 1.5, ml: 1 }}
                    >
                      Restart terminal environment
                  </Button>
                  </Grid>
                  <Grid item>
                    <Typography align="center" variant="body2">Status: {this.state.environmentStatus}</Typography>
                  </Grid>
                </Grid>
                <Grid item>
                  {this.state.environmentStatus === "running" && (
                    <TerminalTabs tabNames={this.state.ttyTabs}>{terminals}</TerminalTabs>
                  )}
                </Grid>
              </Grid>
            </TabControl>
          </Grid>
          <Grid item xs={6}>
            { this.state.files.length > 0
            ?
              <FileEditor files={this.state.files} environment={this.props.match.params.environment}/>
            :
              <Typography>Fetching files to initialize editor...</Typography>
            }
          </Grid>
        </Grid>
        { /* TODO evaluate, e.g., notistack (https://github.com/iamhosseindhv/notistack) to show stacked version of multiple lines with PASSED/FAILED tests */ }
        <Snackbar open={this.state.environmentNotificationOpen} autoHideDuration={this.state.environmentNotificationAutoHideDuration} onClose={handleEnvironmentNotificationClose}>
          <Alert onClose={handleEnvironmentNotificationClose} severity={this.state.environmentNotificationSeverity as Severity}>
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
              Restart environment?
              All processes in terminals will be killed.
          </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirmationRestartDialogClose} color="primary" autoFocus>
              No
          </Button>
            <Button onClick={handleConfirmationRestartDialogConfirm} color="primary">
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
            <Button onClick={handleConfirmationSubmitDialogClose} color="primary" autoFocus>
              No
          </Button>
            <Button onClick={handleConfirmationSubmitDialogConfirm} color="primary">
              Yes
          </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
}

export default withRouter(EnvironmentView);
