import { listen, MessageConnection } from 'vscode-ws-jsonrpc';
import {
    MonacoLanguageClient, CloseAction, ErrorAction,
    MonacoServices, createConnection
} from 'monaco-languageclient';
import ReconnectingWebSocket  from 'reconnecting-websocket'
import * as monaco from 'monaco-editor'
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
    aliases: ['P4','p4']
})

// create Monaco editor
const value = `{
    "$schema": "http://json.schemastore.org/coffeelint",
    "line_endings": "unix"
}`;
const editor = monaco.editor.create(document.getElementById("editortest")!, {
    model: monaco.editor.createModel(value, 'typescript', monaco.Uri.parse('file://model.json')),
    glyphMargin: true,
    theme: "vs-dark",
    lightbulb: {
        enabled: true
    }
});

// install Monaco language client services
//@ts-ignore
MonacoServices.install(editor, {rootUri: "file:///home/patrick/Desktop/github/monaco-languageclient/example/"});

// create the web socket
const url = createUrl('ws://localhost:3002/ts')
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
    return new MonacoLanguageClient({
        name: "Sample Language Client",
        clientOptions: {
            // use a language id as a document selector
            documentSelector: ['typescript'],
            // disable the default error handler
            errorHandler: {
                error: () => ErrorAction.Shutdown,
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
        debug: true
    };
    return new ReconnectingWebSocket(url, [], socketOptions) as WebSocket;
}
