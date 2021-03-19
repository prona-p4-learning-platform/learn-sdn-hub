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
import { Box, Typography } from "@material-ui/core";
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert, { AlertProps } from '@material-ui/lab/Alert';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import P4Editor from "../components/P4Editor";
import { Position } from "monaco-editor";

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

interface State {
  environmentStatus: string;
  ttyTabs: string[];
  ttys: string[][];
  files: string[];
  assignment: ""
  terminalResult: string
  terminalSeverity: Severity
  terminalNotificationOpen: boolean
  confirmationDialogOpen: boolean
  terminalState: TerminalStateType[]
  editorState: EditorStateType[]
}

function Alert(props: JSX.IntrinsicAttributes & AlertProps) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

export class EnvironmentView extends React.Component<PropsType> {
  public state: State;

  constructor(props: PropsType) {
    super(props);
    this.state = {
      environmentStatus: "running",
      ttyTabs: [],
      ttys: [],
      files: [],
      assignment: "",
      terminalState: [],
      editorState: [],
      terminalResult: "",
      terminalSeverity: "info",
      terminalNotificationOpen: false,
      confirmationDialogOpen: false
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
          environmentStatus: "error", error: message.message
        });
      }
    }
    catch (error) {
      this.setState({
        terminalResult: "Restart failed! (" + error + ")",
        terminalSeverity: "error",
        terminalNotificationOpen: true,
        environmentStatus: "error", error: error
      });
    }
  }

  loadEnvironmentConfig(): void {
    fetch(APIRequest(`/api/environment/${this.props.match.params.environment}/configuration`,
      { headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" } }))
      .then((response) => response.json())
      .then((data) => {
        if (data.error !== true) {
          this.setState({ ttyTabs: data.ttyTabs, ttys: data.ttys, files: data.files });
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
    let copyTerminalState = this.state.terminalState.slice();
    const newTerminalState: TerminalStateType = {
      endpoint: endpoint,
      state: state
    };
    let endpointIndex = copyTerminalState.findIndex(element => element.endpoint === endpoint);
    if ( endpointIndex === -1 ) {
      this.setState( { terminalState: copyTerminalState.concat([newTerminalState]) } );
    }
    else {
      copyTerminalState[endpointIndex] = newTerminalState;
      this.setState( { terminalState: copyTerminalState} );
    }
  }

  getTerminalState(endpoint: string): string | undefined {
    return this.state.terminalState.find(element => element.endpoint === endpoint)?.state;
  }

  storeEditorState(endpoint: string, code: string, fileChanged: boolean, filePath: string, position: Position) {
    // currently monaco does not support serialization, so only file content, change statue, file path and cursor/scroll position is preserved on changing file tabs, 
    // when reloading the entire page, changes will be lost however, this maybe also needs to be fixed for terminals, but it seams like a proper multi-session
    // and/or collaboration handling for terminals and editors will address this/would be more appropriate
    let copyEditorState = this.state.editorState.slice();
    const newEditorState: EditorStateType = {
      endpoint: endpoint,
      code: code,
      fileChanged: fileChanged,
      filePath: filePath,
      position: position
    };
    let endpointIndex = copyEditorState.findIndex(element => element.endpoint === endpoint);
    if ( endpointIndex === -1 ) {
      this.setState( { editorState: copyEditorState.concat([newEditorState]) } );
    }
    else {
      copyEditorState[endpointIndex] = newEditorState;
      this.setState( { editorState: copyEditorState} );
    }
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

    return (
      <>
        <Grid container spacing={0}>
          <Grid item xs={6}>
            <TabControl tabNames={["Assignment", "Terminals"]}>
              <ReactMarkdown
                source={this.state.assignment} className="myMarkdownContainer"
              />
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
                <Grid item>
                  <Box className="myScrollContainer">
                    {this.state.environmentStatus === "running" && (
                      <TerminalTabs tabNames={this.state.ttyTabs}>{terminals}</TerminalTabs>
                    )}
                  </Box>
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
