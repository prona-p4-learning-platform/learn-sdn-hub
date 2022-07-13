import React from 'react';
import * as monaco from 'monaco-editor';
import editorCreator from './MonacoLanguageServerAugmentation';
import Editor, { loader } from "@monaco-editor/react";

//loader.config({ monaco });

interface LanguageServiceEditorProps extends monaco.editor.IStandaloneEditorConstructionOptions{
    path: string;
    value: string;
    language: string;
    onMounted: (editor: monaco.editor.IStandaloneCodeEditor) => void;
    onChange: (value: string | undefined) => void;
}

export default class LanguageServiceEditor extends React.Component<LanguageServiceEditorProps> {
  private _editor!: monaco.editor.IStandaloneCodeEditor;

  constructor(props: LanguageServiceEditorProps ){
      super(props)
      this.editorDidMount = this.editorDidMount.bind(this)
      this.onChange = this.onChange.bind(this)
  }

  onChange(value: string | undefined){
    this.props.onChange(value)
  }

  editorDidMount(editor: any, monaco: any) {
    this._editor = editorCreator(editor, this.props.path)
    this.props.onMounted(editor)
  }

  componentWillUnmount() {
    this._editor && this._editor.dispose();
  }

  render() {
    // also options like glyphMargin: true, lightbulb: true might be an option
    //
    //   glyphMargin: true, 
    //   lightbulb: { 
    //     enabled: true 
    //   }       
    const options = {
      automaticLayout: true,
      glyphMargin: true, 
      lightbulb: { 
        enabled: true 
      }       
    };
    
    console.log(this.props.language);
    return <Editor
        width="100%"
        height="100%"
        theme="vs-dark"
        language={this.props.language}
        value={this.props.value}
        onChange={this.onChange}
        options={options}
        //beforeMount={this.editorBeforeMount}
        onMount={this.editorDidMount}
    />
  }
}