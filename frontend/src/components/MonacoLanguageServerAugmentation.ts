import { listen, MessageConnection } from 'vscode-ws-jsonrpc';
import {
    MonacoLanguageClient, CloseAction, ErrorAction,
    MonacoServices, createConnection
} from 'monaco-languageclient';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import createWebSocket from '../api/WebSocket'

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
    const webSocket = createWebSocket('/environment/p4basic/languageserver/p4');
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
    return editor
}
