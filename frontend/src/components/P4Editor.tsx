import * as React from "react";
import Button from "@material-ui/core/Button";
import P4LanguageServiceEditor from './P4LanguageServiceEditor'
import * as monaco from 'monaco-editor';
import APIRequest from '../api/Request'
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert, { AlertProps } from '@material-ui/lab/Alert';
import { Box, ButtonGroup } from "@material-ui/core";
import CloudUploadIcon from '@material-ui/icons/CloudUpload';
import CloudDownloadIcon from '@material-ui/icons/CloudDownload';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import selectLanguageForEndpoint from "./MonacoLanguageSelector";

type Severity = "error" | "success" | "info" | "warning" | undefined;

interface State {
  code: string
  editorResult: string
  editorSeverity: Severity
  editorNotificationOpen: boolean
  fileChanged: boolean
  editorConfirmationDialogOpen: boolean
  language: string
}

interface P4EditorProps {
  endpoint: string;
}

function Alert(props: JSX.IntrinsicAttributes & AlertProps) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

export default class P4Editor extends React.Component<P4EditorProps> {
  public state: State;
  private editor!: monaco.editor.IStandaloneCodeEditor;

  constructor(props: P4EditorProps) {
    super(props);
    this.state = {
      code: "",
      editorResult: "",
      editorSeverity: "info",
      editorNotificationOpen: false,
      fileChanged: false,
      editorConfirmationDialogOpen: false,
      language: "p4"
    };
    this.save = this.save.bind(this);
    this.load = this.load.bind(this);
  }

  editorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
    editor.focus();
    this.editor = editor;
    fetch(APIRequest(`${this.props.endpoint}`, { headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" } }))
      .then((response) => response.text())
      .then((data) => {
        this.setState({ code: data });
      })
      .catch((err) => console.error(err));
  };

  onChange(newValue: string) {
    this.setState({
      code: newValue,
      fileChanged: true
    })
  };

  async save(): Promise<void> {
    this.setState({
      fileChanged: false,
      editorResult: "Saving file...",
      editorSeverity: "info",
      editorNotificationOpen: true
    })
    try {
      const result = await fetch(APIRequest(this.props.endpoint, {
        method: "post",
        body: this.editor.getModel()?.getValue(), headers: {
          'Content-Type': 'text/plain',
          authorization: localStorage.getItem("token") || ""
        }
      }))
      if (result.status === 200) {
        this.setState({
          fileChanged: false,
          editorResult: "Deploy successful!",
          editorSeverity: "success",
          editorNotificationOpen: true
        })
      }
      else {
        const message = await result.json()
        this.setState({
          fileChanged: true,
          editorResult: "Deploy failed! (" + message.message + ")",
          editorSeverity: "error",
          editorNotificationOpen: true
        })
      }
    }
    catch (error) {
      this.setState({
        fileChanged: true,
        editorResult: "Deploy failed! (" + error + ")",
        editorSeverity: "error",
        editorNotificationOpen: true
      })
    }
  }

  async load(): Promise<void> {
    this.setState({
      editorConfirmationDialogOpen: true,
      fileChanged: false,
      editorResult: "Loading file...",
      editorSeverity: "info",
      editorNotificationOpen: true
    })
    try {
      const result = await fetch(APIRequest(`${this.props.endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          authorization: localStorage.getItem("token") || ""
        }
      }))
      if (result.status === 200) {
        const content = await result.text()
        this.setState({
          code: content,
          editorResult: "Retrieve successful!",
          editorSeverity: "success",
          editorNotificationOpen: true,
          fileChanged: false
        })
      }
      else {
        const content = await result.json()
        this.setState({
          editorResult: "Retrieve failed! (" + content.message + ")",
          editorSeverity: "error",
          editorNotificationOpen: true,
          fileChanged: true
        })
      }
    }
    catch (error) {
      this.setState({
        editorResult: "Retrieve failed! (" + error + ")",
        editorSeverity: "error",
        editorNotificationOpen: true,
        fileChanged: true
      })
    }
  }

  render(): JSX.Element {
    const handleEditorNotificationClose = () => {
      this.setState({ editorNotificationOpen: false })
    };

    const handleEditorConfirmationDialogOpen = () => {
      this.setState({ editorConfirmationDialogOpen: true });
    };

    const handleEditorConfirmationDialogClose = () => {
      this.setState({ editorConfirmationDialogOpen: false });
    };

    const handleEditorConfirmationDialogConfirm = () => {
      this.load();
      this.setState({ editorConfirmationDialogOpen: false });
    };

    return (
      <Box className="myMonacoClass">
        <ButtonGroup variant="contained" color="primary" style={{ margin: "2px" }}>
          <Button variant="contained" color="primary" disabled={!this.state.fileChanged} startIcon={<CloudUploadIcon />} onClick={this.save}>
            Deploy
          </Button>
          <Button variant="contained" color="primary" disabled={!this.state.fileChanged} startIcon={<CloudDownloadIcon />} onClick={handleEditorConfirmationDialogOpen}>
            Retrieve
          </Button>
        </ButtonGroup>
        <Box id="monacoEditor"></Box>
        <P4LanguageServiceEditor onMounted={(editor: monaco.editor.IStandaloneCodeEditor) => this.editorDidMount(editor)}
          value={this.state.code}
          language={selectLanguageForEndpoint(this.props.endpoint).editorLanguage}
          path={this.props.endpoint}
          onChange={(value: string) => this.onChange(value)} />
        <Snackbar open={this.state.editorNotificationOpen} autoHideDuration={6000} onClose={handleEditorNotificationClose}>
          <Alert onClose={handleEditorNotificationClose} severity={this.state.editorSeverity as Severity}>
            {this.state.editorResult}
          </Alert>
        </Snackbar>
        <Dialog
          open={this.state.editorConfirmationDialogOpen}
          onClose={handleEditorConfirmationDialogClose}
          aria-describedby="alert-dialog-description"
        >
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Reload file contents?
              Unsaved changes will be lost.
          </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleEditorConfirmationDialogClose} color="primary" autoFocus>
              No
          </Button>
            <Button onClick={handleEditorConfirmationDialogConfirm} color="primary">
              Yes
          </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
}
