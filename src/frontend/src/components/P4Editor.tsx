import * as React from "react";
import MonacoEditor, {
  EditorDidMount,
  ChangeHandler,
} from "react-monaco-editor";
import Button from "@material-ui/core/Button";
import * as monacoEditor from "monaco-editor/esm/vs/editor/editor.api";
//import augment from './MonacoLanguageServerAugmentation';
interface State {
  code: string;
}

interface P4EditorProps {
  endpoint: string;
}

export default class P4Editor extends React.Component<P4EditorProps> {
  public state: State;
  // @ts-ignore
  private monaco: typeof monacoEditor
  // @ts-ignore
  private editor: monacoEditor.editor.IStandaloneCodeEditor;
  private decorations: string[] = [];
  constructor(props: P4EditorProps) {
    super(props);
    this.state = {
      code: "// type your code...",
    };
    this.save = this.save.bind(this);
    this.compile = this.compile.bind(this);
  }

  editorDidMount: EditorDidMount = (editor, monaco) => {
    editor.focus();
    this.monaco = monaco;
    this.editor = editor;
    //augment(editor);
    fetch(this.props.endpoint, {headers: {'Content-Type': 'application/json', authorization: localStorage.getItem("token") || ""} })
      .then((response) => response.text())
      .then((data) => {
        this.setState({ code: data });
      })
      .catch((err) => console.error(err));
  };

  onChange: ChangeHandler = (newValue, e) => {
    console.log("onChange", newValue, e);
    this.setState({ code: newValue });
  };

  save(): void {
    fetch(this.props.endpoint, {
      method: "post", 
    body: this.state.code,headers: {'Content-Type': 'text/plain', 
    authorization: localStorage.getItem("token") || ""}  })
      .then((response) => response.text())
      .then((data) => {
        this.setState({ code: data });
      })
      .catch((error) => {
        console.error(error);
      });
  }

  compile(): void {
    fetch("/api/compile", { method: "post", body: this.state.code })
      .then((response) => response.json())
      .then((compilationResult) => {
        this.decorations = this.editor.deltaDecorations(
          this.decorations,
          compilationResult.result.errors.map((error: any) => ({
            range: new this.monaco.Range(error.line, 1, error.line, 1),
            options: {
              isWholeLine: true,
              className: "myContentClass",
              glyphMarginClassName: "myGlyphMarginClass",
            },
          }))
        );
      })
      .catch((error) => {
        console.error(error);
      });
  }

  render(): JSX.Element {
    const code = this.state.code;
    const options = {
      selectOnLineNumbers: true,
      roundedSelection: false,
      readOnly: false,
      automaticLayout: true,
      glyphMargin: true,
    };
    return (
      <div style={{ height: "700px" }}>
        <Button variant="contained" color="primary" onClick={this.compile}>
          Compile
        </Button>
        <Button variant="contained" color="primary" onClick={this.save}>
          Deploy
        </Button>
        <MonacoEditor
          height="100%"
          language="javascript"
          value={code}
          options={options}
          onChange={this.onChange}
          editorDidMount={this.editorDidMount}

        />
      </div>
    );
  }
}
