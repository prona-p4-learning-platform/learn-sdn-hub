import * as React from "react";
import Button from "@mui/material/Button";
import LanguageServiceEditor from './LanguageServiceEditor'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import APIRequest from '../api/Request'
import Snackbar from '@mui/material/Snackbar';
import MuiAlert, { AlertProps } from '@mui/material/Alert';
import { Select, Box, ButtonGroup, Grid, MenuItem, SelectChangeEvent } from "@mui/material";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import selectLanguageForEndpoint from "./MonacoLanguageSelector";

type Severity = "error" | "success" | "info" | "warning" | undefined;

interface State {
  fileState: Map<string, Model>
  currentFile: string;
  currentFileChanged: boolean;
  editorResult: string
  editorSeverity: Severity
  editorNotificationOpen: boolean
  editorConfirmationDialogOpen: boolean
}

interface Model {
  fileChanged: boolean;
  model: monaco.editor.ITextModel
  state: monaco.editor.IViewState | undefined
}

interface EditorProps {
  files: string[];
  environment: string;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});


export default class Editor extends React.Component<EditorProps> {
  public state: State;
  private editor!: monaco.editor.IStandaloneCodeEditor;

  constructor(props: EditorProps) {
    super(props);
    this.state = {
      fileState: new Map<string, Model>(),
      currentFile: "",
      currentFileChanged: false,
      editorResult: "",
      editorSeverity: "info",
      editorNotificationOpen: false,
      editorConfirmationDialogOpen: false,
    };
    this.save = this.save.bind(this);
    this.load = this.load.bind(this);
  }

  async editorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
    //editor.setPosition({lineNumber: this.props.editorState?.position?.lineNumber as number ?? 0, column: this.props.editorState?.position?.column as number ?? 0});
    //editor.revealLine(this.props.editorState?.position?.lineNumber as number ?? 0);
    this.editor = editor;
    await Promise.all(this.props.files.map(async (fileName) => {
      await fetch(APIRequest(`/api/environment/${this.props.environment}/file/${fileName}`, { headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" } }))
      .then((response) => {
        const contentLocation = response.headers.get('Content-Location');
        this.setState({ filePath: contentLocation });
        return response.text();
      })
      .then((data) => {
        return this.state.fileState.set(fileName, {
          fileChanged: false,
          model: monaco.editor.createModel(
            data,
            selectLanguageForEndpoint(fileName).editorLanguage,
            monaco.Uri.file(fileName)
          ),
          state: undefined
        })
      })
      .catch((err) => {
        console.error(err);
      })
    })).finally(() => {
      const selectFirstFile = this.props.files[0];
      this.setState({currentFile: selectFirstFile});
      editor.setModel(this.state.fileState.get(selectFirstFile)?.model ?? null);
      editor.render();
      editor.focus();
    })
  };

  //componentWillUnmount() {
  //  this?.props.onEditorUnmount(this.props.endpoint, this.state.code, this.state.fileChanged, this.state.filePath, this.editor.getPosition());
  //}

  onChange(_value: string | undefined) {
    if (!this.state.currentFileChanged) {
      this.setState({
        currentFileChanged: true
      })
    }
  };

  async save(): Promise<void> {
    this.setState({
      currentFileChanged: false,
      editorResult: "Saving file...",
      editorSeverity: "info",
      editorNotificationOpen: true
    })
    try {
      const result = await fetch(APIRequest(`/api/environment/${this.props.environment}/file/${this.state.currentFile}`, {
        method: "post",
        body: this.editor.getModel()?.getValue(), headers: {
          'Content-Type': 'text/plain',
          authorization: localStorage.getItem("token") || ""
        }
      }))
      if (result.status === 200) {
        this.setState({
          currentFileChanged: false,
          editorResult: "Deploy successful!",
          editorSeverity: "success",
          editorNotificationOpen: true
        })
      }
      else {
        const message = await result.json()
        this.setState({
          currentFileChanged: true,
          editorResult: "Deploy failed! (" + message.message + ")",
          editorSeverity: "error",
          editorNotificationOpen: true
        })
      }
    }
    catch (error) {
      this.setState({
        currentFileChanged: true,
        editorResult: "Deploy failed! (" + error + ")",
        editorSeverity: "error",
        editorNotificationOpen: true
      })
    }
  }

  async load(): Promise<void> {
    this.setState({
      editorConfirmationDialogOpen: true,
      currentFileChanged: false,
      editorResult: "Loading file...",
      editorSeverity: "info",
      editorNotificationOpen: true
    })
    try {
      const result = await fetch(APIRequest(`/api/environment/${this.props.environment}/file/${this.state.currentFile}`, {
        headers: {
          'Content-Type': 'application/json',
          authorization: localStorage.getItem("token") || ""
        }
      }))
      if (result.status === 200) {
        const content = await result.text();
        this.state.fileState.get(this.state.currentFile)?.model.setValue(content);
        this.setState({
          editorResult: "Retrieve successful!",
          editorSeverity: "success",
          editorNotificationOpen: true,
          currentFileChanged: false,
        })
      }
      else {
        const content = await result.json()
        this.setState({
          editorResult: "Retrieve failed! (" + content.message + ")",
          editorSeverity: "error",
          editorNotificationOpen: true,
          currentFileChanged: true
        })
      }
    }
    catch (error) {
      this.setState({
        editorResult: "Retrieve failed! (" + error + ")",
        editorSeverity: "error",
        editorNotificationOpen: true,
        currentFileChanged: true
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

    const changeFile = (event: SelectChangeEvent) => {
      //this.state.fileState.get(this.state.currentFile).fileChanged = this.state.currentFileChanged;
      this.setState({currentFile: event.target.value});
      this.editor.setModel(this.state.fileState.get(event.target.value)?.model ?? null);
      this.editor.render();
    }

    return (
      <Box className="myMonacoClass">
        <Box>
          <Box sx={{ flexGrow: 1 }}>
            <Select onChange={changeFile} sx={{ width: '100%' }} value={this.state.currentFile}>
              {this.props.files.map((fileName) => (
                <MenuItem key={fileName} value={fileName}>{fileName}</MenuItem>
              ))}
            </Select>
          </Box>
          <Box>
            <ButtonGroup variant="contained" color="primary" style={{ margin: "2px" }}>
              <Button variant="contained" color="primary" disabled={!this.state.currentFileChanged ?? false} startIcon={<CloudUploadIcon />} onClick={this.save}>
                Deploy
              </Button>
              <Button variant="contained" color="primary" startIcon={<CloudDownloadIcon />} onClick={handleEditorConfirmationDialogOpen}>
                Retrieve
              </Button>
            </ButtonGroup>
          </Box>
        </Box>
        <LanguageServiceEditor onMounted={(editor: monaco.editor.IStandaloneCodeEditor) => this.editorDidMount(editor)}
          value=""
          language="c"
          path={this.state.currentFile}
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
