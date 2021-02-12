import React from 'react';
import * as monaco from 'monaco-editor';
import editorCreator from './MonacoLanguageServerAugmentation';
import MonacoEditor from 'react-monaco-editor';

interface P4LanguageServiceEditorProps extends monaco.editor.IStandaloneEditorConstructionOptions{
    path: string;
    value: string;
    language: string;
    onMounted: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    onChange: (value: string) => void;
}

export default class P4LanguageServiceEditor extends React.Component<P4LanguageServiceEditorProps> {
  //private _node: HTMLElement | undefined;
  private _editor!: monaco.editor.IStandaloneCodeEditor;

  constructor(props: P4LanguageServiceEditorProps ){
      super(props)
      //this._node = document.getElementById("monacoEditor") as HTMLElement
      //this._editor = monaco.editor.create(this._node)
      //this.editorWillMount = this.editorWillMount.bind(this)
      this.editorDidMount = this.editorDidMount.bind(this)
      this.onChange = this.onChange.bind(this)
  }

  onChange(content: string){
    this.props.onChange(content)
  }

//  editorWillMount(editor: monaco.editor.IStandaloneCodeEditor):void{
//    this._editor = editorCreator(editor, this.props.path)
//    this.props.onMounted(this._editor) 
//  }

  editorDidMount(editor: any, monaco: any) {
    editor = editorCreator(this._editor, this.props.path)
    //editor = new monaco.editor.IStandaloneCodeEditor()
    this.props.onMounted(editor)
  }

  componentWillUnmount() {
    console.log("Will unmount editor")
    this._editor && this._editor.dispose();
  }

  render() {
    return <MonacoEditor
        width="100%"
        height="100%"
        theme="vs-dark"
        language={this.props.language}
        value={this.props.value}
        onChange={this.onChange}
        editorDidMount={this.editorDidMount}
    />
  }
}