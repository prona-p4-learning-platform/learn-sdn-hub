import { listen, MessageConnection } from 'vscode-ws-jsonrpc';
import {
    MonacoLanguageClient, CloseAction, ErrorAction,
    MonacoServices, createConnection
} from 'monaco-languageclient';
import ReconnectingWebSocket  from 'reconnecting-websocket'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
const normalizeUrl = require('normalize-url');

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

export default (editor: monaco.editor.IStandaloneCodeEditor) : monaco.editor.IStandaloneCodeEditor=> editor

export const LSAugmentation =  (editor: monaco.editor.IStandaloneCodeEditor) : monaco.editor.IStandaloneCodeEditor=> {
    // install Monaco language client services
    // @ts-ignore
    MonacoServices.install(editor,{rootUri: "file://tmp"});
    const hostname = window && window.location && window.location.hostname;
    const port = window && window.location && window.location.port;
        const url = createUrl('ws://' + hostname + ':' + port + '/environment/p4basic/languageserver/p4')
    const webSocket = createWebSocket(url);
    // listen when the web socket is opened
    listen({
        webSocket,
        onConnection: connection => {
            // create and start the language client
            const languageClient = createLanguageClient(connection);
            const disposable = languageClient.start();
            connection.onClose(() => disposable.dispose());
        }
    });

    function createLanguageClient(connection: MessageConnection): MonacoLanguageClient {
        const model = editor.getModel()
        const language = model?.getModeId() || ''
        return new MonacoLanguageClient({
            name: "P4 Language Client",
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

    function createUrl(path: string): string {
        return normalizeUrl(path);
    }

    function createWebSocket(url: string): WebSocket {
        const socketOptions = {
            maxReconnectionDelay: 10000,
            minReconnectionDelay: 1000,
            reconnectionDelayGrowFactor: 1.3,
            connectionTimeout: 10000,
            maxRetries: Infinity,
            debug: false,
            automaticOpen: false
        };
        return new ReconnectingWebSocket(url, [], socketOptions) as WebSocket;
    }
    return editor
}
