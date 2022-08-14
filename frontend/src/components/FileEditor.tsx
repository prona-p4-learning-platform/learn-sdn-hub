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

import { EditorContentManager, RemoteCursorManager, RemoteSelectionManager } from "@convergencelabs/monaco-collab-ext";
import { connectAnonymously, ConvergenceDomain, IdbStorageAdapter, LocalIndexReference, LocalRangeReference, ModelReference, RealTimeString, RemoteReferenceCreatedEvent, StringInsertEvent, StringRemoveEvent } from "@convergence/convergence";
import { ColorAssigner } from "@convergence/color-assigner";

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
  // maybe better use a Type containing fileAlias and absFilePath?
  files: string[];
  filePaths: string[];
  environment: string;
  rootPath: string;
  workspaceFolders: string[];
  useCollaboration: boolean;
  useLanguageClient: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref,
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const CONVERGENCE_URL = process.env.CONVERGENCE_URL ?? "http://localhost:8000/api/realtime/convergence/default";

// maybe consider to move collaboration and languageclient to class augmentation again?
export default class FileEditor extends React.Component<FileEditorProps> {
  public state: State;

  private editor!: monaco.editor.IStandaloneCodeEditor;

  private environmentFiles = {} as FileState;

  private username: string;
  private group: string;

  private convergenceDomain!: ConvergenceDomain;

  private colorAssigner:  ColorAssigner;
  private contentManager!: EditorContentManager;
  private realTimeModelString!: RealTimeString;
  private remoteCursorManager!: RemoteCursorManager;
  private cursorReference!: LocalIndexReference;
  private remoteSelectionManager!: RemoteSelectionManager;
  private selectionReference!: LocalRangeReference;

  private languageClient!: MonacoLanguageClient;


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

    this.username = localStorage.getItem("username") ?? "default-user";
    this.group = localStorage.getItem("group") ?? "0";

    this.colorAssigner = new ColorAssigner();

    this.save = this.save.bind(this);
    this.load = this.load.bind(this);

    this.editorDidMount = this.editorDidMount.bind(this);
    this.editorWillMount = this.editorWillMount.bind(this);
    this.onChange = this.onChange.bind(this);

    this.setLocalCursor = this.setLocalCursor.bind(this);
    this.addRemoteCursor = this.addRemoteCursor.bind(this);
    this.setLocalSelection = this.setLocalSelection.bind(this);
    this.addRemoteSelection = this.addRemoteSelection.bind(this);

    this.startCollaborationServices = this.startCollaborationServices.bind(this);
    this.stopCollaborationServices = this.stopCollaborationServices.bind(this);

    this.startLanguageClient = this.startLanguageClient.bind(this);
    this.stopLanguageClient = this.stopLanguageClient.bind(this);

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
    // implement finding common Path of all filePaths in props?
    options.rootPath = this.props.rootPath ?? "/home/p4/";
    // implement insertion of workspaceFolders from props? Find common workspaceFolders?
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
        const fileContent = await data.text;

        if (fileName === this.props.files[0]) {
          // it's enough to store the currentFileValue in state to trigger initial filling of the editor, no need to use this.state.currentFileValue afterwards (e.g., as the value of <Editor/>)
          this.setState({
            currentFile: fileName,
            currentFilePath: data.location,
            currentFileLanguage: selectLanguageForEndpoint(fileName).editorLanguage,
            currentFileValue: fileContent,
          });

          this.startCollaborationServices(this.group, fileName, fileContent);
        }

        // remove hard-coded /home/p4
        this.environmentFiles[fileName] = {
          value: fileContent,
          language: selectLanguageForEndpoint(fileName).editorLanguage,
          // change to use filePath or a corresponding type
          name: "file:///home/p4/" + fileName,
          fileChanged: false,
          fileLocation: data.location ?? "",
        }
        
        // check number of models in editor? sometimes additional/superfluous inmemory model shows up
        // should only contain the files that are used in the env as entries in the model?
        console.log("finished loading...");
      })
      .catch((err) => {
        console.error(err);
      })
    }))
  }

  async editorDidMount(editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) {
    this.editor = editor;
    editor.focus();

    console.log("Editor language: " + editor.getModel()?.uri.fsPath);
    // remove \\1 filtering or maybe this initial inmemory model all at once?
    if (editor.getModel()?.uri.fsPath === "\\1") {
      const lspLanguage = selectLanguageForEndpoint(this.props.files[0]).lspLanguage
      this.startLanguageClient(editor, lspLanguage);
    } else {
      const lspLanguage = selectLanguageForEndpoint(editor.getModel()?.uri.fsPath ?? "").lspLanguage
      this.startLanguageClient(editor, lspLanguage);
    }
  };

  componentWillUnmount(): void {
    this.stopCollaborationServices();
    this.stopLanguageClient();
  }

  /****************************************
  **
  ** Convergence Collaboration Services
  **
  ****************************************/

  startCollaborationServices(group: string, fileName: string, initialFileContent: string) {
    if (!this.props.useCollaboration) {
      // collaboration disabled in config for this env do not start it and simply return
      return
    }

    const collaborationId = fileName + "-group" + group;
    console.log("Starting collaboration for user: " + this.username + " in group: " + group + " on: " + collaborationId);

    // offline editing support is still experimental accoring to docu, seams to fix issues with
    // "Uncaught Error: The source model is detached" if network connection to convergence is lost
    // though reported by monaco, this error seams to originate from convergence, see 
    // - https://forum.convergence.io/t/how-to-solve-the-source-model-is-detached-error/92
    // however, offline mode is beta and does not seam to work/help to fix this misleading error?
    const options = {
      offline: {
        storage: new IdbStorageAdapter()
      }
    };

    connectAnonymously(CONVERGENCE_URL, this.username, options)
    .then(async d => {
      const domain = d;
      this.convergenceDomain = d;
      // Open the model and automatically create it, if it does not exist, filling it with initial fileContent
      return domain.models().openAutoCreate({
        collection: "learn-sdn-hub",
        id: collaborationId,
        data: {
          "text": initialFileContent
        }
      })
      // need to consider when to delete a model, when last user in group undeploys the env? Keep it and only overwrite it when env is opened by first user in group?
    })
    .then((model) => {
      this.realTimeModelString = model.elementAt("text") as RealTimeString;

      // update the editor content with the latest content (version) of the model
      // ensures edits meanwhile being done by other users to show up
      const currentModelContent = this.realTimeModelString.value();
      //console.log("Using editor model " + this.editor.getModel()?.id + " " + this.editor.getModel()?.uri);
      // throws error in console, that model is detached when changing the file that is edited, 
      // however model content is updated perfectly - so works as intended... catch or fix error?
      // maybe setModel using monaco.editor.getModel(id).setValue() is agnostic to attach status of the model?
      // Otherwise maybe wait for model to be attached? ...use different approach to get current content of the
      // model and update the editor's value?
      this.editor.getModel()?.setValue(currentModelContent);

      //
      // EditorContentManager
      //
      this.contentManager = new EditorContentManager({
        editor: this.editor,
        // on local insert, do:
        onInsert: (index, text) => {
          this.realTimeModelString.insert(index, text);
        },
        // on local replace, do:
        onReplace: (index, length, text) => {
          this.realTimeModelString.model().startBatch();
          this.realTimeModelString.remove(index, length);
          this.realTimeModelString.insert(index, text);
          this.realTimeModelString.model().completeBatch();
        },
        // on local delete, do:
        onDelete: (index, length) => {
          this.realTimeModelString.remove(index, length);
        },
        // change to learn-sdn-hub id?
        remoteSourceId: "convergence"
      });

      // handle inserts from remote users
      this.realTimeModelString.on("insert", (e) => {
        const stringInsertEvent = e as StringInsertEvent;
        this.contentManager.insert(stringInsertEvent.index, stringInsertEvent.value);
      })

      // handle removes from remote users
      // no need to subscribe to remote "replace", these are reported as remove & insert
      this.realTimeModelString.on("remove", (e) => {
        const stringRemoveElement = e as StringRemoveEvent;
        this.contentManager.delete(stringRemoveElement.index, stringRemoveElement.value.length);
      })

      //
      // RemoteCursorManager
      //
      this.remoteCursorManager = new RemoteCursorManager({
        editor: this.editor,
        tooltips: true,
        tooltipDuration: 2
      });
      this.cursorReference = this.realTimeModelString.indexReference("cursor");

      // get all remote cursors and add them to show up in the editor
      const cursorReferences = this.realTimeModelString.references({key: "cursor"});
      cursorReferences.forEach((reference) => {
        if (!reference.isLocal()) {
          this.addRemoteCursor(reference);
        }
      });

      // set local cursor position and share it with remote users
      this.setLocalCursor();
      this.cursorReference.share();

      // if cursor is changed in monaco, update cursor position in the collaboration model
      this.editor.onDidChangeCursorPosition(e => {
        this.setLocalCursor();
      });


      // add additional cursor as soon as new remote user joins the collaboration session
      this.realTimeModelString.on("reference", (e) => {
        const remoteReferenceCreatedEvent = e as RemoteReferenceCreatedEvent;
        if (remoteReferenceCreatedEvent.reference.key() === "cursor") {
          this.addRemoteCursor(remoteReferenceCreatedEvent.reference);
        }
      });

      //
      // RemoteSelectionManager
      //
      this.remoteSelectionManager = new RemoteSelectionManager({editor: this.editor});

      // set and share local selection in editor
      this.selectionReference = this.realTimeModelString.rangeReference("selection");
      this.setLocalSelection();
      this.selectionReference.share();

      // if selection in editor is changed, update selection in the collaboation model
      this.editor.onDidChangeCursorSelection(e => {
        this.setLocalSelection();
      });

      // add selection from all remote editors
      const selectionReferences = this.realTimeModelString.references({key: "selection"});
      selectionReferences.forEach((reference) => {
        if (!reference.isLocal()) {
          this.addRemoteSelection(reference);
        }
      });

      // add additional selection as soon as new remote user joins the collaboration session
      this.realTimeModelString.on("reference", (e) => {
        const remoteReferenceCreatedEvent = e as RemoteReferenceCreatedEvent;
        if (remoteReferenceCreatedEvent.reference.key() === "selection") {
          this.addRemoteSelection(remoteReferenceCreatedEvent.reference);
        }
      });

    })
    .catch(error => {
      console.error("Could not open collaboration model ", error);
    });
  }

  // move all collab funcs into start collab function to avoid use of class references and
  // binding of "this"?
  setLocalCursor() {
    const position = this.editor.getPosition() as monaco.IPosition;
    const offset = this.editor.getModel()?.getOffsetAt(position);
    if (offset !== undefined) {
      this.cursorReference.set(offset);
    }
  }

  addRemoteCursor(reference: ModelReference<any>) {
    const color = this.colorAssigner.getColorAsHex(reference.sessionId());
    const remoteCursor = this.remoteCursorManager.addCursor(reference.sessionId(), color, reference.user().displayName);

    reference.on("cleared", () => remoteCursor.hide());
    reference.on("disposed", () => remoteCursor.dispose());
    reference.on("set", () => {
      const cursorIndex = reference.value();
      remoteCursor.setOffset(cursorIndex);
    });
  }

  setLocalSelection() {
    const selection = this.editor.getSelection();
    if (!selection?.isEmpty()) {
      const start = this.editor.getModel()?.getOffsetAt(selection?.getStartPosition() as monaco.IPosition);
      const end = this.editor.getModel()?.getOffsetAt(selection?.getEndPosition() as monaco.IPosition);
      if (start !== undefined && end !== undefined) {
        this.selectionReference.set({start, end});
      }
    } else if (this.selectionReference.isSet()) {
      this.selectionReference.clear();
    }
  }

  addRemoteSelection(reference: ModelReference<any>) {
    const color = this.colorAssigner.getColorAsHex(reference.sessionId())
    const remoteSelection = this.remoteSelectionManager.addSelection(reference.sessionId(), color);

    if (reference.isSet()) {
      const selection = reference.value();
      remoteSelection.setOffsets(selection.start, selection.end);
    }

    reference.on("cleared", () => remoteSelection.hide());
    reference.on("disposed", () => remoteSelection.dispose());
    reference.on("set", () => {
      const selection = reference.value();
      remoteSelection.setOffsets(selection.start, selection.end);
    });
  }

  stopCollaborationServices() {
    if (!this.props.useCollaboration) {
      // collaboration disabled in config for this env do not start it and simply return
      return
    }

    // stop content synchronization
    this.contentManager?.dispose();

    // remove all remote selections
    const selectionReferences = this.realTimeModelString?.references({key: "selection"});
    selectionReferences?.forEach((reference) => {
      if (!reference.isLocal()) {
        this.remoteSelectionManager?.removeSelection(reference.sessionId());
      }
    });
    this.selectionReference?.dispose();

    // remove all remote cursors
    const cursorReferences = this.realTimeModelString?.references({key: "cursor"});
    cursorReferences?.forEach((reference) => {
      if (!reference.isLocal()) {
        this.remoteCursorManager?.removeCursor(reference.sessionId());
      }
    });
    this.cursorReference?.dispose();

    // maybe remove this line to fix "The source model is detached" problem? Keep the domain and
    // only open/create new models and disconnect only on componentWillUnmount etc.?
    // disconnect from convergence server
    this.convergenceDomain?.disconnect();
    this.convergenceDomain?.dispose();
  }

  /*******************************
  **
  ** Monaco Language Client
  **
  *******************************/

  startLanguageClient(editor: monaco.editor.IStandaloneCodeEditor, lspLanguage: string) {
    if (!this.props.useLanguageClient) {
      // languageClient disabled in config for this env do not start it and simply return
      return
    }

    //const language = this.state.currentFileLanguage;
    //let language = "python";
    console.log("Starting language client for language: " + lspLanguage);
    if (lspLanguage !== "") {
      console.log("Starting language client");

      const webSocket = createWebSocket('/environment/' + this.props.environment + '/languageserver/' + lspLanguage);

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
                  this.languageClient = createLanguageClient({
                      reader,
                      writer
                  });
                  this.languageClient.start();
                  //languageClient.registerConfigurationFeatures();
                  //languageClient.info("blub");
                  reader.onClose(() => this.languageClient.stop());
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
                  // maybe use restart of language client? e.g., to recover from conn loss?
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
  }

  stopLanguageClient() {
    if (!this.props.useLanguageClient) {
      // languageClient disabled in config for this env do not start it and simply return
      return
    }

    this.languageClient.stop();
  }

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
      this.stopCollaborationServices();
      this.stopLanguageClient();
      this.setState({currentFile: event.target.value});
      this.startCollaborationServices(this.group, event.target.value, this.environmentFiles[event.target.value].value)
      this.startLanguageClient(this.editor, selectLanguageForEndpoint(event.target.value).lspLanguage);
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