import { listen } from '@codingame/monaco-jsonrpc';
import * as monaco from 'monaco-editor';
import {
    MonacoLanguageClient, CloseAction, ErrorAction,
    MonacoServices, createConnection, MessageConnection
} from 'monaco-languageclient';
import selectLanguageForEndpoint from './MonacoLanguageSelector'
//import ReconnectingWebSocket from 'reconnectingwebsocket'

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

// create Monaco editor
/* const value = `{
    "$schema": "http://json.schemastore.org/coffeelint",
    "line_endings": "unix"
}`;
monaco.editor.create(document.getElementById("container")!, {
    model: monaco.editor.createModel(value, 'json', monaco.Uri.parse('inmemory://model.json')),
    glyphMargin: true,
    lightbulb: {
        enabled: true
    }
});
 */

//export default (editor: monaco.editor.IStandaloneCodeEditor, path: string) : monaco.editor.IStandaloneCodeEditor=> editor

//export const LSAugmentation =  (editor: monaco.editor.IStandaloneCodeEditor, path: string) : monaco.editor.IStandaloneCodeEditor=> {
export default (editor: monaco.editor.IStandaloneCodeEditor, path: string) : monaco.editor.IStandaloneCodeEditor=> {
    // get lsp to be used for the language based on endpoint's fileExtension
    const environment = path.split("/").slice(-3,-2)
    const language = selectLanguageForEndpoint(path).lspLanguage

    // if no language was selected, do not install language client services use lsp connection
    if (language !== "") {
        // install Monaco language client services
        // @ts-ignore
        //MonacoServices.install(editor,{rootUri: "file://tmp"});
        MonacoServices.install(monaco);

        console.log('Creating websocket to /environment/' + environment + '/languageserver/' + language)
        const webSocket = new WebSocket("ws://192.168.56.105:3005/p4")
        //let backendWebSocketReady = false
        //const webSocket = createWebSocket('/environment/' + environment + '/languageserver/' + language);
        //webSocket.onopen = () => {
        //    console.log("Sending auth...")
        //    webSocket.send(`auth ${localStorage.getItem("token")}`)
        //}

        // Waiting for backend to setup ws connection to language server...
        //webSocket.onmessage = event => {
        //    const message = event.data
        //    console.log(message)
        //    if (message === "backend websocket ready") {
        //        console.log(message)
        //        backendWebSocketReady = true
        //    }
        //}

        //const logger = new ConsoleLogger()

        // listen when the web socket is opened
        listen({
            webSocket,
            onConnection: connection => {
                // Waiting for backend to setup ws connection to language server...
                // let timeout = 10000;
                // while (timeout > 0 && !backendWebSocketReady) {
                //     sleep(200).then(() => {
                //     })
                //     timeout-=1
                //     console.log(timeout)
                // }
                // if (!backendWebSocketReady) {
                //     throw new Error("Timeout while waiting for backend ws connection to language server to get ready")
                // }
                // create and start the language client
                console.log("Creating Language Client...")
                const languageClient = createLanguageClient(connection);
                const disposable = languageClient.start();
                //console.log(languageClient.trace)
                //languageClient.info("bla","blub",true);
                //console.log(languageClient.initializeResult)
                //console.log(languageClient.needsStart())
                //connection.onClose(() => {
                //    console.log("Disposing languageClient")
                //    disposable.dispose()
                //});
            }
        });

        //editor.onDidDispose(() => {
        //    console.log("Closing lsp websocket...")
        //    webSocket.close()
        //})
    }

    //function sleep(ms: number) {
    //    return new Promise(resolve => setTimeout(resolve, ms));
    //}

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

