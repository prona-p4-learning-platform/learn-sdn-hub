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

import { MonacoLanguageClient, MonacoServices, MessageTransports, WorkspaceFolder } from 'monaco-languageclient';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';

import createWebSocket from '../api/WebSocket';

import { EditorContentManager, RemoteCursorManager, RemoteSelectionManager } from "@convergencelabs/monaco-collab-ext";
import { connectAnonymously, ConvergenceDomain, LocalIndexReference, LocalRangeReference, ModelReference, RealTimeString, RemoteReferenceCreatedEvent, StringInsertEvent, StringRemoveEvent } from "@convergence/convergence";
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
  // maybe better use a type containing editorLanguage and lspLanguage together?
  currentFileEditorLanguage: string;
  currentFileLSPLanguage: string;
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
  editorLanguage: string;
  lspLanguage: string;
  value: string;
  fileChanged: boolean;
  fileLocation: string;
}

interface FileEditorProps {
  // maybe better use a Type containing fileAlias and absFilePath instead of using separate vars for them?
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

const CONVERGENCE_URL = process.env.REACT_APP_CONVERGENCE_URL ?? "http://localhost:8000/api/realtime/convergence/default";

class KeepAliveAwareWebSocketMessageReader extends WebSocketMessageReader {
  protected readMessage(message: any): void {
    if (message === "pong") {
      // ignore pong keep-alive message from backend
      //console.log("received pong from backend");
    } else {
      //console.log("received message from backend: " + message);
      super.readMessage(message);
    }
  }
}

// maybe consider to move collaboration and languageclient to class augmentation again?
export default class FileEditor extends React.Component<FileEditorProps> {
  public state: State;

  private editor!: monaco.editor.IStandaloneCodeEditor;

  private environmentFiles = {} as FileState;

  private username: string;
  private group: string;

  private convergenceDomain!: ConvergenceDomain;

  private colorAssigner: ColorAssigner;
  private contentManager!: EditorContentManager;
  private realTimeModelString!: RealTimeString;
  private remoteCursorManager!: RemoteCursorManager;
  private cursorReference!: LocalIndexReference;
  private remoteSelectionManager!: RemoteSelectionManager;
  private selectionReference!: LocalRangeReference;

  private languageClient!: MonacoLanguageClient;
  private languageClientWSTimerId!: NodeJS.Timer;
  private languageClientWSTimeout: number = 10000;

  private suppressChangeDetection: boolean;
  private languageClientWebSocket!: WebSocket;


  constructor(props: FileEditorProps) {
    super(props);
    this.state = {
      fileState: {} as FileState,
      currentFile: props.files[0],
      currentFileChanged: false,
      currentFileValue: "",
      currentFileEditorLanguage: "",
      currentFileLSPLanguage: "",
      currentFilePath: "",
      editorResult: "",
      editorSeverity: "info",
      editorNotificationOpen: false,
      editorConfirmationDialogOpen: false,
    };

    this.username = localStorage.getItem("username") ?? "default-user";
    this.group = localStorage.getItem("group") ?? "0";

    this.colorAssigner = new ColorAssigner();

    this.suppressChangeDetection = false;

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
    // additional file types? make them configurable?

    // install Monaco language client services
    const options:MonacoServices.Options = {};
    // maybe remove ?? part and also findCommonPathPrefix and only allow rootPath and workspaceFolders
    options.rootPath = this.props.rootPath ?? this.findCommonPathPrefix(this.props.filePaths);
    let workspaceFolders = [] as WorkspaceFolder[];
    if (this.props.workspaceFolders?.length > 0) {
      this.props.workspaceFolders.forEach((workspaceDir => {
        // also support \ in paths?
        workspaceFolders.push({
          name: workspaceDir,
          uri: "file://" + workspaceDir
        });
      }))
      options.workspaceFolders = workspaceFolders;
    } else {
      // maybe remove this part and also findCommonPathPrefix and only allow rootPath and workspaceFolders
      // to be specified in configuration?
      // test if essential languageClient features also work when rootPath and workspaceFolders are empty
      this.props.filePaths.forEach((filePath => {
        // also support \ in paths?
        const fileDir = filePath.substring(0,filePath.lastIndexOf("/"));
        workspaceFolders.push({
          name: fileDir,
          uri: fileDir
        });
      }))
    }
    options.workspaceFolders = workspaceFolders;
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

        this.environmentFiles[fileName] = {
          value: fileContent,
          editorLanguage: selectLanguageForEndpoint(fileName).editorLanguage,
          lspLanguage: selectLanguageForEndpoint(fileName).lspLanguage,
          // change to use filePath or a corresponding type directly?
          name: fileName,
          fileChanged: false,
          fileLocation: data.location ?? "",
        }

        // check number of models in editor? sometimes additional/superfluous inmemory model shows up
        // should only contain the files that are used in the env as entries in the model?
        console.log("finished loading editor files...");
      })
      .catch((err) => {
        console.error(err);
      })
    }))

    const initialFile = this.props.files[0];
    const file = this.environmentFiles[initialFile];
    // it's enough to store the currentFileValue in state to trigger initial filling of the editor, no need to use this.state.currentFileValue afterwards (e.g., as the value of <Editor/>)
    // maybe consolidate editor value state/class vars/remove them?
    this.setState({
      currentFile: file.name,
      currentFilePath: file.fileLocation,
      currentFileEditorLanguage: file.editorLanguage,
      currentFileLSPLanguage: file.lspLanguage,
      currentFileValue: file.value,
    });

    this.startCollaborationServices(this.group, file.name, file.value);
    console.log("Loading editor file: " + file.name + " with editorLanguage: " + file.editorLanguage + " and lspLanguage: " + file.lspLanguage);
    this.startLanguageClient(this.editor, file.lspLanguage);
  }

  async editorDidMount(editor: monaco.editor.IStandaloneCodeEditor, monaco: Monaco) {
    this.editor = editor;
    //editor.focus();

    // remove \\1 filtering or maybe this initial inmemory model all at once?
    //console.log("Editor file path: " + editor.getModel()?.uri.fsPath);
    //if (editor.getModel()?.uri.fsPath === "\\1") {
    //  const lspLanguage = selectLanguageForEndpoint(this.props.files[0]).lspLanguage
    //  this.startLanguageClient(editor, lspLanguage);
    //} else {
    //  const lspLanguage = selectLanguageForEndpoint(editor.getModel()?.uri.fsPath ?? "").lspLanguage
    //  this.startLanguageClient(editor, lspLanguage);
    //}
  };

  componentWillUnmount(): void {
    this.stopCollaborationServices();
    this.stopLanguageClient();
  }

  /****************************************
  **
  ** Collaboration Services
  **
  ** Maybe reevaluate yjs in the future,
  ** currently convergence.io seams to be
  ** the better option
  **
  ****************************************/

  startCollaborationServices(group: string, fileName: string, initialFileContent: string) {
    if (!this.props.useCollaboration) {
      // collaboration disabled in config for this env do not start it and simply return
      return
    }

    const collaborationId = fileName + "-group" + group;
    console.log("Starting collaboration for user: " + this.username + " in group: " + group + " on: " + collaborationId);

    // offline editing support is still experimental according to docu. Seams to fix issues
    // if network connection to convergence is lost, see
    // - https://forum.convergence.io/t/how-to-solve-the-source-model-is-detached-error/92
    //const options = {
    //  offline: {
    //    storage: new IdbStorageAdapter()
    //  }
    //};

    // currently uses anonymous connection, maybe use user or session token based auth,
    // however, if using exam/assignment, most likely collaboration will be disabled
    // anyway
    //connectAnonymously(CONVERGENCE_URL, this.username, options)
    connectAnonymously(CONVERGENCE_URL, this.username)
    .then(async d => {
      const domain = d;
      this.convergenceDomain = d;
      // Open the model and automatically create it, if it does not exist, filling it with initial fileContent
      return domain.models().openAutoCreate({
        collection: "learn-sdn-hub-" + group,
        id: collaborationId,
        data: {
          "text": initialFileContent
        }
      })
    })
    .then((model) => {
      // remember group to be able to remove created models when environment is undeployed
      localStorage.setItem("collaboration-collection-created-for-group", group);

      this.realTimeModelString = model.elementAt("text") as RealTimeString;

      // update the editor content with the latest content (version) of the model
      // ensures edits meanwhile being done by other users will show up
      const currentModelContent = this.realTimeModelString.value();
      this.suppressChangeDetection = true;
      const editorViewState = this.editor.saveViewState();
      this.editor.getModel()?.setValue(currentModelContent);
      if (editorViewState !== null) {
        this.editor.restoreViewState(editorViewState);
      }

      //Show all models:
      //monaco.editor.getModels().forEach((model) => {
      //  console.log("id:" + model.id + ", uri:" + model.uri + " language:" + model.getLanguageId() + " isAttached:" + model.isAttachedToEditor() + " isDisposed:" + model.isDisposed());
      //})

      this.suppressChangeDetection = false;

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
        tooltipDuration: 5,
        showTooltipOnHover: true
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
    // suppress setting of local cursor when file is selected
    if (!this.suppressChangeDetection) {
      const position = this.editor.getPosition() as monaco.IPosition;
      const offset = this.editor.getModel()?.getOffsetAt(position);
      if (offset !== undefined) {
        try {
          this.cursorReference.set(offset);
        }
        catch(e: any) {
          // when file selection is changed, and cursor was previously set, "The source model is detached"
          // will be thrown, though value of editor is correclty updated, ignore it for now and accept that
          // cursor position can not be restored 
          if (e.message === "The source model is detached") {
            console.log("The source model is detached. Cursor was moved and cannot be set. Ignoring.");
          }
        }
      }  
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
    // suppress setting of local selection when file is selected
    if (!this.suppressChangeDetection) {
      const selection = this.editor.getSelection();
      if (!selection?.isEmpty()) {
        const start = this.editor.getModel()?.getOffsetAt(selection?.getStartPosition() as monaco.IPosition);
        const end = this.editor.getModel()?.getOffsetAt(selection?.getEndPosition() as monaco.IPosition);
        if (start !== undefined && end !== undefined) {
          try {
            this.selectionReference.set({start, end});
          }
          catch(e: any) {
            // when file selection is changed, and selection was previously set, "The source model is detached"
            // will be thrown, though value of editor is correclty updated, ignore it for now and accept that
            // selection position can not be restored 
            if (e.message === "The source model is detached") {
              console.log("The source model is detached. Previous selection in file cannot be set. Ignoring.");
            }
          }
        }
      } else if (this.selectionReference.isSet()) {
        this.selectionReference.clear();
      }
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

    if (lspLanguage !== "") {
      console.log("Starting language client for language: " + lspLanguage);

      this.languageClientWebSocket = createWebSocket('/environment/' + this.props.environment + '/languageserver/' + lspLanguage);

      this.languageClientWebSocket.onopen = () => {
          // create and start the language client

          // sending auth token to backend
          this.languageClientWebSocket.send(`auth ${localStorage.getItem("token")}`)

          // backend needs some time to process auth token and initiate
          // ws conn from backend to lsp, hence, wait for backend
          // response, otherwise language client initialization msg will
          // be sent to early and ignored

          // save onmessage fn
          //const defaultOnMessage = this.languageClientWebSocket.onmessage
          this.languageClientWebSocket.onmessage = (e) => {
              if (e.data === "backend websocket ready") {
                  // restore onmessage fn
                  console.log("backend websocket ready, starting language client");
                  //this.languageClientWebSocket.onmessage = (e) => {
                    //console.log("received message from backend: " + e.data);
                    //if (e.data === "pong") {
                      // ignore pong keep-alive message from backend
                    //}
                    //defaultOnMessage?.call(this.languageClientWebSocket, e);
                  //}

                  // keep connection alive
                  this.languageClientWSTimerId = setInterval(() => {
                    this.languageClientWebSocket.send("ping");
                  }, this.languageClientWSTimeout);

                  const socket = toSocket(this.languageClientWebSocket);
                  // need to implement own reader to ensure "pong" message is filtered...
                  const reader = new KeepAliveAwareWebSocketMessageReader(socket);
                  const writer = new WebSocketMessageWriter(socket);
                  this.languageClient = createLanguageClient({
                      reader,
                      writer
                  });
                  this.languageClient.start();
              }
          }
      };

    }

    function createLanguageClient(transports: MessageTransports): MonacoLanguageClient {
      const model = editor.getModel()
      const language = model?.getLanguageId() || ''
      return new MonacoLanguageClient({
          name: "Language Client",
          clientOptions: {
              // use a language id as a document selector
              documentSelector: [language],

              // workspaceFolder already set globally, no need to set it again, would only
              // be necessary if workspaceFolders should be different for each selected file
              //workspaceFolder: {
              //  uri: "file:///home/p4/"
              //},

              // disable the default error handler
              //errorHandler: {
                  //error: () => ({ action: ErrorAction.Continue }),
                  // maybe use restart of language client? e.g., to recover from conn loss? 
                  //closed: () => ({ action: CloseAction.Restart })
              //}
          },
          // create a language client connection from the JSON RPC connection on demand
          connectionProvider: {
              get: () => {
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

    // if languageClient connection was closed, this.languageClient will be undefined
    this.languageClient?.dispose();
    clearInterval(this.languageClientWSTimerId);
    //this.languageClientWebSocket.close()
  }

  findCommonPathPrefix(strings: string[]): string {
    let commonPrefix = "";
    const stringA = strings[0];
    // cycle thgouh remaining strings after the first and check for common prefix
    strings.forEach((stringB) => {
      let tempCommonPrefix = "";
      const shortestLength = Math.min(stringA.length, stringB.length)
      for (let length = 1; length < shortestLength; length++) {
        const prefix = stringB.substring(0,length);
        if (stringA.includes(prefix)) {
          tempCommonPrefix = prefix;
        }
      }
      // if commonPrefix was not already set
      if (commonPrefix.length === 0) {
        if (tempCommonPrefix.length > 0) {
          commonPrefix = tempCommonPrefix;
        } else {
          // no common prefix
          return "";
        }
      } else {
        // if new tempCommonPrefix is now shorter -> update commonPrefix
        if (tempCommonPrefix.length < commonPrefix.length) {
          commonPrefix = tempCommonPrefix;
        }
      }
    })
    // remove training / or \ from commonPath
    // \\ currently not used?
    while(commonPrefix.endsWith("/") || commonPrefix.endsWith("\\")) {
      commonPrefix = commonPrefix.slice(0,-1);
    }
    return commonPrefix;
  }

  onChange(_value: string | undefined) {
    if (!this.suppressChangeDetection) {
      this.environmentFiles[this.state.currentFile].fileChanged = true;
      this.setState({currentFileChanged: true});  
    }
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
      this.setState({
        currentFile: event.target.value,
        currentFilePath: this.environmentFiles[event.target.value].fileLocation,
        currentFileEditorLanguage: this.environmentFiles[event.target.value].editorLanguage,
        currentFileLSPLanguage: this.environmentFiles[event.target.value].lspLanguage,
        currentFileChanged: this.environmentFiles[event.target.value].fileChanged,
        currentFileValue: this.environmentFiles[event.target.value].value,
    });
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
          <CustomWidthTooltip title={"Path: " + this.state.currentFilePath + ", Language: " + this.state.currentFileLSPLanguage} placement="top-start">
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
          defaultLanguage={this.environmentFiles[this.state.currentFile]?.editorLanguage}
          path={this.environmentFiles[this.state.currentFile]?.fileLocation}
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
