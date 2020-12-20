import * as React from "react";
import Button from "@material-ui/core/Button";
import P4LanguageServiceEditor from './P4LanguageServiceEditor'
import * as monaco from 'monaco-editor';

interface State {
  code: string
}

interface P4EditorProps {
  endpoint: string;
}

export default class P4Editor extends React.Component<P4EditorProps> {
  public state: State;
  private editor!: monaco.editor.IStandaloneCodeEditor;
  
  constructor(props: P4EditorProps) {
    super(props);
    this.state = {
      code: "",
    };
    this.save = this.save.bind(this);
  }

  editorDidMount(editor: monaco.editor.IStandaloneCodeEditor){
    editor.focus();
    this.editor = editor;
    fetch(`${this.props.endpoint}`, {headers: {'Content-Type': 'application/json', authorization: localStorage.getItem("token") || ""} })
      .then((response) => response.text())
      .then((data) => {
        this.setState({ code: data });
      })
      .catch((err) => console.error(err));
  };

  onChange(newValue: string){
    this.setState({code: newValue})
  };

  save(): void {
    fetch(this.props.endpoint, {
      method: "post", 
    body: this.editor.getModel()?.getValue(),headers: {'Content-Type': 'text/plain', 
    authorization: localStorage.getItem("token") || ""}  })
      .then((response) => response.text())
      .catch((error) => {
        console.error(error);
      });
  }

  render(): JSX.Element {
    return (
      <div style={{ height: "700px" }}>
        <Button variant="contained" color="primary" onClick={this.save}>
          Deploy
        </Button>
      <P4LanguageServiceEditor onMounted={(editor: monaco.editor.IStandaloneCodeEditor) => this.editorDidMount(editor)}
       value={this.state.code} 
       language="p4" 
       path={this.props.endpoint} 
       onChange={(value:string) => this.onChange(value)}/>
      </div>
    );
  }
}
