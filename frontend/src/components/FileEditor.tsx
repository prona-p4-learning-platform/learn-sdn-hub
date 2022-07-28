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

import 'monaco-editor/esm/vs/editor/editor.all.js';

import 'monaco-editor/esm/vs/editor/standalone/browser/accessibilityHelp/accessibilityHelp.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneHelpQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoSymbolQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/quickInput/standaloneQuickInputService.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/referenceSearch/standaloneReferenceSearch.js';
import 'monaco-editor/esm/vs/editor/standalone/browser/toggleHighContrast/toggleHighContrast.js';

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

import { buildWorkerDefinition } from 'monaco-editor-workers';

import Editor, { Monaco } from "@monaco-editor/react";
import { loader } from "@monaco-editor/react";

import { StandaloneServices } from 'vscode/services';
import getMessageServiceOverride from 'vscode/service-override/messages';

import { MonacoLanguageClient, CloseAction, ErrorAction, MonacoServices, MessageTransports } from 'monaco-languageclient';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';

import createWebSocket from '../api/WebSocket';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
//import { WebrtcProvider } from 'y-webrtc'
import { MonacoBinding } from 'y-monaco'
import DoUsername from 'do_username'

loader.config({ monaco });

StandaloneServices.initialize({
  ...getMessageServiceOverride(document.body)
});
buildWorkerDefinition('dist', new URL('../../', window.location.href).href, false);

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
  
  private rootDoc;
  private folder;
  private monacoBinding: MonacoBinding | undefined;

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

    this.rootDoc = new Y.Doc();
    this.folder = this.rootDoc.getMap();

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

    // install Monaco language client services
    const options:MonacoServices.Options = {};
    options.rootPath = "/home/p4/";
    options.workspaceFolders = [{
      uri: "file:///home/p4/"
    }];
    console.log(options.rootPath);
    MonacoServices.install(options);
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
          // it's enough to store the currentFileValue in state to trigger initial filling of the editor, no need to use this.state.currentFileValue afterwards (e.g., as the value of <Editor/>)
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
          name: "file:///home/p4/" + fileName,
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
    //const monacoBinding = new MonacoBinding(type, editor.getModel(), new Set([editor]), provider.awareness)
    editor.focus();

    let docCollabPath = this.props.files[0].replaceAll("/", "_");
    let subDoc : Y.Doc;
    if ( this.folder.get(docCollabPath) == null ) {
      subDoc = new Y.Doc();
      this.folder.set(docCollabPath, subDoc);
    }
    else
    {
      subDoc = this.folder.get(docCollabPath) as Y.Doc;
    }
    const subDocText = subDoc.getText(docCollabPath);

    console.log("docCollabPath: " + docCollabPath);
    console.log("subDoc length: " + subDoc.getText().length);

    // currently y-websocket standalone server needs to be started. See y-websocket repo or start-yjs-websocket-server.ps1 example start script
    const provider = new WebsocketProvider(`${window.location.protocol === 'http:' ? 'ws:' : 'wss:'}//localhost:1234`, docCollabPath, subDoc)

    // needs to be moved to ../api and '../api/Config' needs to be removed?
    //if (pathAndQuery.startsWith("/") === false){
    //  pathAndQuery = "/"+ pathAndQuery
    //}
    //const provider = new WebsocketProvider(`${config.wsBackendHost}${pathAndQuery}`, docCollabPath, subDoc);
    //const provider = new WebsocketProvider(`${config.wsBackendHost}/api/environment/Example1-Repeater/collaboration`, docCollabPath, subDoc);
    //
    // e.g.:
    //
    //const provider = new WebsocketProvider(`${window.location.protocol === 'http:' ? 'ws:' : 'wss:'}//localhost:3001/api/environment/Example1-Repeater/collaboration`, docCollabPath, subDoc)
    //provider.on('connection', () => {
    //  provider.ws?.send(`auth ${localStorage.getItem("token")}`);
    //});

    // y-webrtc has problems with cursor/edit offset, leading to inconsistant cursor placement and edits, see y-webrtc issues in github repo
    //const provider = new WebrtcProvider('your-room-name', subDoc);

    const awareness = provider.awareness;
    const username = DoUsername.generate(16);
    const color = "#" + ((1<<24)*Math.random() | 0).toString(16);
    awareness.setLocalStateField('user', {
      name: username,
      color: color
    })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const monacoBinding = new MonacoBinding(subDocText, editor.getModel(), new Set([editor]), awareness)

    console.log("username: " + username + " color: " + color);

    let language = "python";
    console.log("Starting language client for language: " + language);
    if (language !== "") {
      console.log("Starting language client");

      const webSocket = createWebSocket('/environment/' + this.props.environment + '/languageserver/' + language);

      webSocket.onopen = () => {
          // create and start the language client

          // sending auth token to backend
          webSocket.send(`auth ${localStorage.getItem("token")}`)

          // backend needs some time to process auth token and initiate
          // ws conn from backend to lsp, hence, wait for backend
          // response, otherwise language client initialization msg will
          // be sent to early and ignored

          // save onmessage fn
          const defaultOnMessage = webSocket.onmessage
          webSocket.onmessage = (e) => {
              if (e.data === "backend websocket ready") {
                  // restore onmessage fn
                  webSocket.onmessage = defaultOnMessage;

                  // const languageClient = createLanguageClient(connection);
                  // const disposable = languageClient.start();
                  // connection.onClose(() => {
                  //   disposable.dispose()
                  // });
                  // // when changing tabs, warning "Language Client services have been overridden" can occur,
                  // // websocket is closed too late
                  // webSocket.onclose = (e) => {
                  //   disposable.dispose();
                  // }

                  const socket = toSocket(webSocket);
                  const reader = new WebSocketMessageReader(socket);
                  const writer = new WebSocketMessageWriter(socket);
                  const languageClient = createLanguageClient({
                      reader,
                      writer
                  });
                  languageClient.start();
                  languageClient.registerConfigurationFeatures();
                  languageClient.info("blub");
                  reader.onClose(() => languageClient.stop());
              }
          }
      };

      editor.onDidDispose(() => {
          webSocket.close()
      })

    }

    function createLanguageClient(transports: MessageTransports): MonacoLanguageClient {
      const model = editor.getModel()
      const language = model?.getLanguageId() || ''
      return new MonacoLanguageClient({
          name: "Language Client",
          clientOptions: {
              // use a language id as a document selector
              documentSelector: [language],
              workspaceFolder: {
                uri: "file:///home/p4/"
              },
              // disable the default error handler
              errorHandler: {
                  error: () => ({ action: ErrorAction.Continue }),
                  closed: () => ({ action: CloseAction.DoNotRestart })
              }
          },
          // create a language client connection from the JSON RPC connection on demand
          connectionProvider: {
              get: () => {
                  console.log("Getting transports " + transports);
                  return Promise.resolve(transports);
              }
          }
      });
    }
    
  };

  componentWillUnmount() {
    //cursor.dispose();
    this.rootDoc.destroy();
    this.monacoBinding?.destroy();
  }  

  onChange(_value: string | undefined) {
    this.environmentFiles[this.state.currentFile].fileChanged = true;
    this.setState({currentFileChanged: true});
    console.log("changed: " + this.editor.getModel()?.uri.toString());
    console.log("rooPath: " + MonacoServices.get().workspace.workspaceFolders?.forEach((value) => {console.log(value)}))
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
