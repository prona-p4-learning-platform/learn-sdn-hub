import createWebSocket from '../api/WebSocket';
import selectLanguageForEndpoint from './MonacoLanguageSelector'

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

// support all basic-languages
import 'monaco-editor/esm/vs/basic-languages/monaco.contribution';

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

//import { buildWorkerDefinition } from "monaco-editor-workers";
//buildWorkerDefinition('../../../../node_modules/monaco-editor-workers/dist/workers', import.meta.url, false);

// eslint-disable-next-line import/first
import { MonacoLanguageClient, MessageConnection, CloseAction, ErrorAction, MonacoServices, createConnection } from 'monaco-languageclient';
// eslint-disable-next-line import/first
import { listen } from '@codingame/monaco-jsonrpc';
//import normalizeUrl from 'normalize-url';

// register Monaco languages
monaco.languages.register({
    id: 'typescript',
    extensions: ['.ts'],
    aliases: ['TypeScript','ts','TS','Typescript','typescript']
})

monaco.languages.register({
    id: 'p4',
    extensions: ['.p4'],
    aliases: ['p4', 'P4']
})

monaco.languages.register({
    id: 'python',
    extensions: ['.py'],
    aliases: ['Python', 'py', 'PY', 'python']
})

// register Monaco languages
monaco.languages.register({
    id: 'json',
    extensions: ['.json', '.bowerrc', '.jshintrc', '.jscsrc', '.eslintrc', '.babelrc'],
    aliases: ['JSON', 'json'],
    mimetypes: ['application/json'],
});

const MonacoLanguageServerAugmentation = (editor: monaco.editor.IStandaloneCodeEditor, path: string) : monaco.editor.IStandaloneCodeEditor=> {
    // get lsp to be used for the language based on endpoint's fileExtension
    const environment = path.split("/").slice(-3,-2)
    const language = selectLanguageForEndpoint(path).lspLanguage

    // if no language was selected, do not install language client services use lsp connection
    if (language !== "") {
        // install Monaco language client services
        // @ts-ignore
        MonacoServices.install(monaco);

        const webSocket = createWebSocket('/environment/' + environment + '/languageserver/' + language);

        // listen when the web socket is opened
        listen({
            webSocket,
            onConnection: connection => {
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

                        const languageClient = createLanguageClient(connection);
                        const disposable = languageClient.start();
                        connection.onClose(() => {
                          disposable.dispose()
                        });
                        // when changing tabs, warning "Language Client services have been overridden" can occur,
                        // websocket is closed too late
                        webSocket.onclose = (e) => {
                          disposable.dispose();
                        }
                    }
                }
            }
        });

        editor.onDidDispose(() => {
            webSocket.close()
        })
    }

    function createLanguageClient(connection: MessageConnection): MonacoLanguageClient {
        const model = editor.getModel()
        const language = model?.getLanguageId() || ''
        return new MonacoLanguageClient({
            name: "Language Client",
            clientOptions: {
                // use a language id as a document selector
                documentSelector: [language],
                // disable the default error handler
                errorHandler: {
                    error: () => ErrorAction.Continue,
                    closed: () => CloseAction.DoNotRestart
                }
            },
            // create a language client connection from the JSON RPC connection on demand
            connectionProvider: {
                get: (errorHandler, closeHandler) => {
                    return Promise.resolve(createConnection(connection, errorHandler, closeHandler))
                }
            }
        });
    }

    return editor
}

export default MonacoLanguageServerAugmentation;