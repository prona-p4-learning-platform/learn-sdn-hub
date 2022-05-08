import * as React from "react";
import Button from "@mui/material/Button";
import P4LanguageServiceEditor from './P4LanguageServiceEditor'
import * as monaco from 'monaco-editor';
import APIRequest from '../api/Request'
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { Box, ButtonGroup, Grid, Typography } from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import selectLanguageForEndpoint from "./MonacoLanguageSelector";

type Severity = "error" | "success" | "info" | "warning" | undefined;

type EditorStateType = {
  endpoint: string;
  code: string;
  fileChanged: boolean;
  filePath: string;
  position: monaco.Position;
}

interface State {
  code: string
  editorResult: string
  editorSeverity: Severity
  editorNotificationOpen: boolean
  fileChanged: boolean
  editorConfirmationDialogOpen: boolean
  language: string
  filePath: string
}

interface P4EditorProps {
  endpoint: string;
  editorState: EditorStateType | undefined;
  onEditorUnmount: Function;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});


export default class P4Editor extends React.Component<P4EditorProps> {
  public state: State;
  private editor!: monaco.editor.IStandaloneCodeEditor;

  constructor(props: P4EditorProps) {
    super(props);
    this.state = {
      code: props?.editorState?.code ?? "",
      fileChanged: props?.editorState?.fileChanged ?? false,
      filePath: props?.editorState?.filePath ?? "",
      editorResult: "",
      editorSeverity: "info",
      editorNotificationOpen: false,
      editorConfirmationDialogOpen: false,
      language: "p4",
    };
    this.save = this.save.bind(this);
    this.load = this.load.bind(this);
  }

  editorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
    editor.focus();
    editor.setPosition({lineNumber: this.props.editorState?.position?.lineNumber as number ?? 0, column: this.props.editorState?.position?.column as number ?? 0});
    editor.revealLine(this.props.editorState?.position?.lineNumber as number ?? 0);
    this.editor = editor;
    if ( this.state.code === "" ) {
      fetch(APIRequest(`${this.props.endpoint}`, { headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" } }))
      .then((response) => {
        const contentLocation = response.headers.get('Content-Location');
        this.setState({ filePath: contentLocation });
        return response.text();
      })
      .then((data) => {
        this.setState({ code: data });
      })
      .catch((err) => console.error(err));
    }
  };

  componentWillUnmount() {
    this?.props.onEditorUnmount(this.props.endpoint, this.state.code, this.state.fileChanged, this.state.filePath, this.editor.getPosition());
  }

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
        <Grid container direction="row" justifyContent="flex-start" alignItems="center" spacing={1}>
          <Grid item>
            <ButtonGroup variant="contained" color="primary" style={{ margin: "2px" }}>
              <Button variant="contained" color="primary" disabled={!this.state.fileChanged} startIcon={<CloudUploadIcon />} onClick={this.save}>
                Deploy
              </Button>
              <Button variant="contained" color="primary" startIcon={<CloudDownloadIcon />} onClick={handleEditorConfirmationDialogOpen}>
                Retrieve
              </Button>
            </ButtonGroup>
          </Grid>
          <Grid item>
            <Typography variant="caption">{this.state.filePath}</Typography>
          </Grid>
        </Grid>
        <P4LanguageServiceEditor onMounted={(editor: monaco.editor.IStandaloneCodeEditor) => this.editorDidMount(editor)}
          value={this.state.code}
          language={selectLanguageForEndpoint(this.props.endpoint).editorLanguage}
          path={this.props.endpoint}
          onChange={(value: string | undefined) => this.onChange(value ?? "")} />
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
              Retrieve file content from host?<br/>
              Undeployed changes will be lost.
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
