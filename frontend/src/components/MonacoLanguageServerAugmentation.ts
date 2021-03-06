import { listen } from '@codingame/monaco-jsonrpc';
import * as monaco from 'monaco-editor';
import {
    MonacoLanguageClient, CloseAction, ErrorAction,
    MonacoServices, createConnection, MessageConnection
} from 'monaco-languageclient';
import createWebSocket from '../api/WebSocket';
import selectLanguageForEndpoint from './MonacoLanguageSelector'

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

export default (editor: monaco.editor.IStandaloneCodeEditor, path: string) : monaco.editor.IStandaloneCodeEditor=> {
    // get lsp to be used for the language based on endpoint's fileExtension
    const environment = path.split("/").slice(-3,-2)
    const language = selectLanguageForEndpoint(path).lspLanguage

    // if no language was selected, do not install language client services use lsp connection
    if (language !== "") {
        // install Monaco language client services
        // @ts-ignore
        MonacoServices.install(monaco);

        console.log('Creating websocket to /environment/' + environment + '/languageserver/' + language)
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

                        console.log("Creating Language Client...")
                        const languageClient = createLanguageClient(connection);
                        const disposable = languageClient.start();
                        connection.onClose(() => {
                            console.log("Disposing languageClient")
                            disposable.dispose()
                        });
                    }
                }
            }
        });

        editor.onDidDispose(() => {
            console.log("Closing lsp websocket...")
            webSocket.close()
        })
    }

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
