import React from "react";
import Grid from "@material-ui/core/Grid";
import Terminal from "../components/Terminal";
import EditorTabs from "../components/EditorTabs";
import TerminalTabs from "../components/TerminalTabs";
import { withRouter } from "react-router-dom";
import { RouteComponentProps } from "react-router";
import Button from "@material-ui/core/Button";
import { ReactNode } from "react";
import ReactMarkdown from 'react-markdown'
import mermaid from 'mermaid'
import TabControl from '../components/TabControl'
import APIRequest from '../api/Request'
import { Typography } from "@material-ui/core";
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert, { AlertProps } from '@material-ui/lab/Alert';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import P4Editor from "../components/P4Editor";
import { Position } from "monaco-editor";
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepButton from '@material-ui/core/StepButton';

type Severity = "error" | "success" | "info" | "warning" | undefined;

type PathParamsType = {
  environment: string;
};

type PropsType = RouteComponentProps<PathParamsType> & {};

type TerminalStateType = {
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
  terminalResult: string;
  terminalSeverity: Severity;
  terminalNotificationOpen: boolean;
  confirmationDialogOpen: boolean;
  stepNames: string[];
  stepLabels: string[];
  activeStep: number;
  stepsCompleted: boolean;
  terminalState: TerminalStateType[];
  editorState: EditorStateType[];
}

function Alert(props: JSX.IntrinsicAttributes & AlertProps) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

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
      terminalResult: "",
      terminalSeverity: "info",
      terminalNotificationOpen: false,
      confirmationDialogOpen: false,
      stepNames: [],
      stepLabels: [],
      activeStep: 0,
      stepsCompleted: false
    };
    this.restartEnvironment = this.restartEnvironment.bind(this)
    this.storeTerminalState = this.storeTerminalState.bind(this)
    this.storeEditorState = this.storeEditorState.bind(this)
  }

  componentDidMount(): void {
    this.loadEnvironmentConfig()
    this.loadAssignment()
  }

  async restartEnvironment(): Promise<void> {
    this.setState({
      terminalResult: "Restarting environment...",
      terminalSeverity: "info",
      terminalNotificationOpen: true,
      environmentStatus: "restarting"
    });
    try {
      const result = await fetch(APIRequest(`/api/environment/${this.props.match.params.environment}/restart`, {
        method: "post",
        headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" }
      }))
      if (result.status === 200) {
        this.setState({
          terminalResult: "Restart successful...",
          terminalSeverity: "success",
          terminalNotificationOpen: true,
          environmentStatus: "running"
        });
      }
      else {
        const message = await result.json()
        this.setState({
          terminalResult: "Restart failed! (" + message.message + ")",
          terminalSeverity: "error",
          terminalNotificationOpen: true,
          environmentStatus: "error", 
          errorMessage: message.message
        });
      }
    }
    catch (error) {
      this.setState({
        terminalResult: "Restart failed! (" + error + ")",
        terminalSeverity: "error",
        terminalNotificationOpen: true,
        environmentStatus: "error", 
        errorMessage: error
      });
    }
  }

  async checkStepTest(): Promise<void> {
    this.setState({
      terminalResult: "Testing step result...",
      terminalSeverity: "info",
      terminalNotificationOpen: true,
    });
    try {
      const result = await fetch(APIRequest(`/api/environment/${this.props.match.params.environment}/test`, {
        method: "post",
        headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" },
        body: JSON.stringify({activeStep: this.state.activeStep, terminalState: this.state.terminalState})
      }))
      if (result.status === 200) {
        // should send terminalState (maybe even editorState) if needed to backend and wait for result of test
        this.setState({
          // demo that steps through instead of running real tests
          // maybe refactor terminalResult to environment result etc.?
          terminalResult: "Test successful!",
          terminalSeverity: "success",
          terminalNotificationOpen: true,
        });

        if (this.state.activeStep < this.state.stepLabels.length) {
          this.setState({
            activeStep: this.state.activeStep + 1
          });
        }
        // if this was the last step, steps are completed and finish / submission of assignment can be enabled
        if (this.state.activeStep == this.state.stepLabels.length) {
          this.setState({
            stepsCompleted: true
          });
        }
      }
      else {
        const message = await result.json()
        this.setState({
          terminalResult: "Test failed! (" + message.message + ")",
          terminalSeverity: "error",
          terminalNotificationOpen: true,
          errorMessage: message.message
        });
      }
    }
    catch (error) {
      this.setState({
        terminalResult: "Test failed! (" + error + ")",
        terminalSeverity: "error",
        terminalNotificationOpen: true,
        errorMessage: error
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
    // currently monaco does not support serialization, so only file content, change statue, file path and cursor/scroll position is preserved on changing file tabs, 
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

    const editors = this.state.files.map((fileAlias: string) =>
      <P4Editor key={fileAlias} endpoint={`/api/environment/${this.props.match.params.environment}/file/${fileAlias}`} 
        editorState={this.getEditorState(`/api/environment/${this.props.match.params.environment}/file/${fileAlias}`)} onEditorUnmount={this.storeEditorState} />
    );

    const handleTerminalNotificationClose = () => {
      this.setState({ terminalNotificationOpen: false })
    };

    const handleConfirmationDialogOpen = () => {
      this.setState({ confirmationDialogOpen: true });
    };

    const handleConfirmationDialogClose = () => {
      this.setState({ confirmationDialogOpen: false });
    };

    const handleConfirmationDialogConfirm = () => {
      this.restartEnvironment();
      this.setState({ confirmationDialogOpen: false });
    };

    const handleStepClick = () => {
      this.checkStepTest();
    }

    const handleFinishAssignment = () => {
      // dummy

      // open confirmation to finish and submit assignment
      // send state of assignment to backend and store/persist result of assignment (for user) there
    }

    return (
      <>
        <Grid container spacing={0}>
          <Grid item xs={6}>
            <TabControl tabNames={["Assignment", "Terminals"]}>
              <Grid container direction="row" justify="flex-start" alignItems="center" spacing={1}>
                <Grid item xs={12}>
                  <ReactMarkdown
                    source={this.state.assignment} className="myMarkdownContainer"
                  />
                </Grid>
                <Grid item xs={12}>
                  <Grid container direction="row" justify="flex-start" alignItems="center" spacing={1}>
                    {this.state.stepLabels.length > 0 && (
                      <Grid item>
                        <Stepper activeStep={this.state.activeStep}>
                        {Array.isArray(this.state.stepLabels) && this.state.stepLabels.length > 0 && this.state.stepLabels.map((stepLabel, index) =>
                          <Step>
                            <StepButton disabled={index!=this.state.activeStep} key={index} onClick={handleStepClick}>{stepLabel}</StepButton>
                          </Step>
                        )}
                        </Stepper>
                      </Grid>
                    )}
                    <Grid item>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleFinishAssignment}
                        disabled={!this.state.stepsCompleted}
                      >
                        Finish & submit
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
              <Grid container direction="row" justify="flex-start" alignItems="center" spacing={1}>
                <Grid container direction="row" justify="flex-start" alignItems="center" spacing={1}>
                  <Grid item>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleConfirmationDialogOpen}
                    >
                      Restart terminal environment
                  </Button>
                  </Grid>
                  <Grid item>
                    <Typography>Status: {this.state.environmentStatus}</Typography>
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
            <EditorTabs tabNames={this.state.files}>{editors}</EditorTabs>
          </Grid>
        </Grid>
        <Snackbar open={this.state.terminalNotificationOpen} autoHideDuration={6000} onClose={handleTerminalNotificationClose}>
          <Alert onClose={handleTerminalNotificationClose} severity={this.state.terminalSeverity as Severity}>
            {this.state.terminalResult}
          </Alert>
        </Snackbar>
        <Dialog
          open={this.state.confirmationDialogOpen}
          onClose={handleConfirmationDialogClose}
          aria-describedby="alert-dialog-description"
        >
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Restart environment?
              All processes in terminals will be killed.
          </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleConfirmationDialogClose} color="primary" autoFocus>
              No
          </Button>
            <Button onClick={handleConfirmationDialogConfirm} color="primary">
              Yes
          </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }
}

export default withRouter(EnvironmentView);
