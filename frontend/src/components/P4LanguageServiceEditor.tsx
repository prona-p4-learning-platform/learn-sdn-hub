import * as React from 'react';
import * as monaco from 'monaco-editor';
import editorCreator from './MonacoLanguageServerAugmentation';
import MonacoReact, { EditorDidMount } from 'react-monaco-editor'
interface MonacoEditorProps extends monaco.editor.IStandaloneEditorConstructionOptions{
    path: string;
    value: string;
    language: string;
    onMounted: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    onChange: (value: string) => void;
}
export default class MonacoEditor extends React.Component<MonacoEditorProps> {
  private _node: HTMLElement | undefined;
  private _editor : monaco.editor.IStandaloneCodeEditor | undefined;

  constructor(props: MonacoEditorProps ){
      super(props)
      this.editorDidMount = this.editorDidMount.bind(this)
      this.onChange = this.onChange.bind(this)
  }

  onChange(content: string){
    this.props.onChange(content)
  }

  editorDidMount(editor: monaco.editor.IStandaloneCodeEditor):void{
    this._editor = editorCreator(editor)
    this.props.onMounted(this._editor) 
  }

  componentWillUnmount() {
    this._editor && this._editor.dispose();
  }

  render() {
    return <MonacoReact 
        language="c"
        value={this.props.value}
        onChange={this.onChange}
        editorDidMount={this.editorDidMount}
    />
  }
}