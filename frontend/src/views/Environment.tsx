//import React as React from "react";
import React from "react";
import Grid from "@material-ui/core/Grid";
import Terminal from "../components/Terminal";
import EditorTabs from "../components/EditorTabs";
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

type Severity = "error" | "success" | "info" | "warning" | undefined;

type PathParamsType = {
  environment: string;
};

type PropsType = RouteComponentProps<PathParamsType> & {};

interface State {
  environmentStatus: string;
  ttys: string[];
  files: string[];
  assignment: ""
  terminalResult: string
  terminalSeverity: Severity
  terminalNotificationOpen: boolean
  confirmationDialogOpen: boolean
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
      ttys: [],
      files: [],
      assignment: "",
      terminalResult: "",
      terminalSeverity: "info",
      terminalNotificationOpen: false,
      confirmationDialogOpen: false
    };
    this.restartEnvironment = this.restartEnvironment.bind(this)
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
          this.setState({ ttys: data.ttys, files: data.files });
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

  componentDidUpdate() {
    mermaid.init(document.querySelectorAll('code.language-mermaid'))
  }

  render(): ReactNode {
    const terminals = this.state.ttys.map((alias: string) => <Terminal key={alias} wsEndpoint={`/environment/${this.props.match.params.environment}/type/${alias}`}
    />)

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
      <Grid container spacing={3}>
        <Grid item xs={6}>
          <TabControl tabNames={["Assignment", "Terminals"]}>
            <ReactMarkdown
              source={this.state.assignment}
            />
            <Grid item xs={12}>
              <Grid container direction="row" justify="flex-start" alignItems="center" spacing={3}>
                <Grid item>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleConfirmationDialogOpen}
                  >
                    Restart terminal environment
                </Button>
                </Grid>
                <Grid>
                  <Typography>Status: {this.state.environmentStatus}</Typography>
                </Grid>
              </Grid>
              {this.state.environmentStatus === "running" && (
                <TabControl tabNames={this.state.ttys}>{terminals}</TabControl>
              )}
            </Grid>
          </TabControl>
          <Grid item xs={12}>
          </Grid>
        </Grid>
        <Grid item xs={6}>
          <Box>
            <EditorTabs
              endpoints={this.state.files.map(fileAlias =>
                `/api/environment/${this.props.match.params.environment}/file/${fileAlias}`,
              )}
            />
          </Box>
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
      </Grid>
    );
  }
}

export default withRouter(EnvironmentView);
