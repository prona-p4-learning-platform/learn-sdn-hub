import * as React from 'react';
import * as monaco from 'monaco-editor';
interface MonacoEditorProps extends monaco.editor.IStandaloneEditorConstructionOptions{
    path: monaco.Uri;
    value: string;
    language: string;
}
export default class MonacoEditor extends React.Component<MonacoEditorProps> {
    //@ts-ignore
    private _node: HTMLElement | null;
    //@ts-ignore
    private _editor : monaco.editor.IStandaloneCodeEditor | null;

  componentDidMount() {
    const { path, value, language, ...options } = this.props;
    const model = monaco.editor.createModel(value, language, path);
    if (this._node){
        this._editor = monaco.editor.create(this._node, options);
        this._editor.setModel(model);
        
    }
  }

  componentWillUnmount() {
    this._editor && this._editor.dispose();
  }

  render() {
    return <div style={{width: "100%", height:"800px"}} ref={c => this._node = c} />
  }
}