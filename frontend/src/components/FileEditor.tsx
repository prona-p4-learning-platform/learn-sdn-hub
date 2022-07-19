import * as React from "react";
import APIRequest from '../api/Request'

import { styled } from '@mui/material/styles';
import { Select, Box, ButtonGroup, MenuItem, SelectChangeEvent } from "@mui/material";
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import Button from "@mui/material/Button";
import Snackbar from '@mui/material/Snackbar';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

import MuiAlert, { AlertProps } from '@mui/material/Alert';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';

import selectLanguageForEndpoint from "./MonacoLanguageSelector";

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import Editor, { Monaco } from "@monaco-editor/react";

type Severity = "error" | "success" | "info" | "warning" | undefined;

interface State {
  fileState: FileState;
  currentFile: string;
  currentFileChanged: boolean;
  currentFileValue: string;
  currentFileLanguage: string;
  currentFilePath: string;
  editorResult: string
  editorSeverity: Severity
  editorNotificationOpen: boolean
  editorConfirmationDialogOpen: boolean
}

interface FileState {
  [key: string]: FileStateModel;
}

interface FileStateModel {
  name: string;
  language: string;
  value: string;
  fileChanged: boolean;
  fileLocation: string;
}

interface FileEditorProps {
  files: string[];
  environment: string;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});


export default class FileEditor extends React.Component<FileEditorProps> {
  public state: State;
  private editor!: monaco.editor.IStandaloneCodeEditor;
  private environmentFiles = {} as FileState;

  constructor(props: FileEditorProps) {
    super(props);
    this.state = {
      fileState: {} as FileState,
      currentFile: props.files[0],
      currentFileChanged: false,
      currentFileValue: "",
      currentFileLanguage: "",
      currentFilePath: "",
      editorResult: "",
      editorSeverity: "info",
      editorNotificationOpen: false,
      editorConfirmationDialogOpen: false,
    };

    this.save = this.save.bind(this);
    this.load = this.load.bind(this);
    this.editorDidMount = this.editorDidMount.bind(this);
    this.editorWillMount = this.editorWillMount.bind(this);
    this.onChange = this.onChange.bind(this);

    // register Monaco languages
    monaco.languages.register({
      id: 'c',
      extensions: ['.c', '.h'],
      aliases: ['C', 'c']
    });

    monaco.languages.register({
      id: 'p4',
      extensions: ['.p4'],
      aliases: ['p4', 'P4']
    });
  
    monaco.languages.register({
      id: 'python',
      extensions: ['.py'],
      aliases: ['Python', 'py', 'PY', 'python']
    });

    monaco.languages.register({
      id: 'json',
      extensions: ['.json', '.bowerrc', '.jshintrc', '.jscsrc', '.eslintrc', '.babelrc'],
      aliases: ['JSON', 'json'],
      mimetypes: ['application/json'],
    });
  
  }

  async editorWillMount(_monaco: Monaco) {
    await Promise.all(this.props.files.map(async (fileName) => {
      await fetch(APIRequest(`/api/environment/${this.props.environment}/file/${fileName}`, { headers: { 'Content-Type': 'application/json', authorization: localStorage.getItem("token") || "" } }))
      .then((response) => {
        const contentLocation = response.headers.get('Content-Location');
        return { text: response.text(), location: contentLocation };
      })
      .then(async (data) => {
        if (fileName === this.props.files[0]) {
          this.setState({
            currentFile: fileName,
            currentFilePath: data.location,
            currentFileLanguage: selectLanguageForEndpoint(fileName).editorLanguage,
            currentFileValue: await data.text,
          });
        }
        this.environmentFiles[fileName] = {
          value: await data.text,
          language: selectLanguageForEndpoint(fileName).editorLanguage,
          name: fileName,
          fileChanged: false,
          fileLocation: data.location ?? "",
        }
      })
      .catch((err) => {
        console.error(err);
      })
    }))
  }

  async editorDidMount(editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) {
    this.editor = editor;
    editor.focus();
  };

  onChange(_value: string | undefined) {
    this.environmentFiles[this.state.currentFile].fileChanged = true;
    this.setState({currentFileChanged: true});
  };

  async save(): Promise<void> {
    this.setState({
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
        this.environmentFiles[this.state.currentFile].fileChanged = false;
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
          editorResult: "Deploy failed! (" + message.message + ")",
          editorSeverity: "error",
          editorNotificationOpen: true
        })
      }
    }
    catch (error) {
      this.setState({
        editorResult: "Deploy failed! (" + error + ")",
        editorSeverity: "error",
        editorNotificationOpen: true
      })
    }
    this.editor.focus();
  }

  async load(): Promise<void> {
    this.setState({
      editorConfirmationDialogOpen: true,
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
        this.environmentFiles[this.state.currentFile].value = content;
        this.environmentFiles[this.state.currentFile].fileChanged = false;
        this.editor.setValue(content);
        this.setState({
          currentFileChanged: false,
          editorResult: "Retrieve successful!",
          editorSeverity: "success",
          editorNotificationOpen: true,
        })
      }
      else {
        const content = await result.json()
        this.setState({
          editorResult: "Retrieve failed! (" + content.message + ")",
          editorSeverity: "error",
          editorNotificationOpen: true,
        })
      }
    }
    catch (error) {
      this.setState({
        editorResult: "Retrieve failed! (" + error + ")",
        editorSeverity: "error",
        editorNotificationOpen: true,
      })
    }
    this.editor.focus();
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
      this.setState({currentFile: event.target.value});
    }

    const closeSelect = (event: React.SyntheticEvent) => {
      this.editor?.focus();
    }

    const monacoOptions = {
      automaticLayout: true,
      glyphMargin: true, 
      lightbulb: { 
        enabled: true 
      }       
    };

    const CustomWidthTooltip = styled(({ className, ...props }: TooltipProps) => (
      <Tooltip {...props} classes={{ popper: className }} />
    ))({
      [`& .${tooltipClasses.tooltip}`]: {
        maxWidth: '100%',
      },
    });

    return (
      <Box className="myMonacoClass">
        <Box sx={{ display: 'flex'}}>
          <ButtonGroup variant="contained" color="primary" style={{ flexShrink: 0, margin: "2px" }}>
            <Button variant="contained" color="primary" disabled={!this.state.currentFileChanged} startIcon={<CloudUploadIcon />} onClick={this.save}>
              Deploy
            </Button>
            <Button variant="contained" color="primary" startIcon={<CloudDownloadIcon />} onClick={handleEditorConfirmationDialogOpen}>
              Retrieve
            </Button>
          </ButtonGroup>
          <CustomWidthTooltip title={"Path: " + this.state.currentFilePath + ", Language: " + this.state.currentFileLanguage} placement="top-start">
            {/* onAnimationEnd to focus editor after changing selection and onTransitionEnd to focus editor after selecting the same entry */}
            <Select onChange={changeFile} onAnimationEnd={closeSelect} onTransitionEnd={closeSelect} sx={{ width: '100%' }} value={this.state.currentFile}>
              {this.props.files.map((fileName) => (
                <MenuItem key={fileName} value={fileName}>{fileName}</MenuItem>
              ))}
            </Select>
          </CustomWidthTooltip>
        </Box>
        <Editor
          width="100%"
          height="100%"
          theme="vs-dark"
          options={monacoOptions}
          defaultValue={(this.environmentFiles[this.state.currentFile]?.value)}
          defaultLanguage={this.environmentFiles[this.state.currentFile]?.language}
          path={this.environmentFiles[this.state.currentFile]?.name}
          onChange={this.onChange}
          beforeMount={this.editorWillMount}
          onMount={this.editorDidMount}
        />
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
